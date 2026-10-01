import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser, requireCurrentUserWithLanguage } from '@/lib/auth';
import { errorResponse } from '@/lib/api-errors';
import { db } from '@/lib/db';
import { Transaction as TransactionType } from '@/types/dashboard';
import { formatDisplayDate, formatTransactionName, parseDisplayDate } from '@/lib/transaction-utils';
import {
  convertMoney,
  convertTransactionsWithRatesMap,
  countMissingRates,
  preloadRates,
} from '@/lib/currency-conversion';
import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { addUtcMonths, startOfUtcDay, startOfUtcMonth, toDateKey } from '@/lib/dates';
import { moneyToNumber, parseMoney, parseQuantity, QUANTITY_SCALE } from '@/lib/money';
import { parseJsonBody, transactionCreateSchema, transactionUpdateSchema } from '@/lib/validation';

type TransactionCreateBody = z.infer<typeof transactionCreateSchema>;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


function getIconForCategory(categoryName: string | null): string {
  if (!categoryName) return 'HelpCircle';

  const iconMap: Record<string, string> = {
    'Rent': 'City',
    'Entertainment': 'Tv',
    'Restaurants': 'PizzaSlice',
    'Furniture': 'Sofa',
    'Groceries': 'Cart',
    'Gifts': 'Gift',
    'Fitness': 'Gym',
    'Water Bill': 'Droplet',
    'Technology': 'Tv',
    'Electricity Bill': 'Flash',
    'Clothes': 'Shirt',
    'Transportation': 'Tram',
    'Heating Bill': 'FireFlame',
    'Home Internet': 'Wifi',
    'Taxes': 'Cash',
    'Mobile Data': 'SmartphoneDevice',
  };

  return iconMap[categoryName] || 'HelpCircle';
}


export async function GET(request: NextRequest) {
  try {
    
    const user = await requireCurrentUserWithLanguage();
    const userLanguageAlias = user.language?.alias?.toLowerCase() || null;

    const userCurrencyRecord = user.currencyId
      ? await db.currency.findUnique({ where: { id: user.currencyId } })
      : await db.currency.findFirst();

    if (!userCurrencyRecord) {
      return NextResponse.json(
        { error: 'No currency configured.' },
        { status: 500 },
      );
    }

    const targetCurrencyId = userCurrencyRecord.id;

    const { searchParams } = new URL(request.url);

    
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));

    
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const type = searchParams.get('type'); 
    const month = searchParams.get('month'); 
    const timePeriod = searchParams.get('timePeriod') || 'All Time';

    
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    
    const where: Record<string, unknown> = {
      userId: user.id,
      investmentAssetId: null,
    };

    
    const dateFilter: { gte?: Date; lte?: Date } = {};
    const now = new Date();

    
    if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      const monthStart = new Date(Date.UTC(year, monthNum - 1, 1));
      const nextMonth = addUtcMonths(monthStart, 1);
      dateFilter.gte = monthStart;
      dateFilter.lte = new Date(nextMonth.getTime() - 1);
    } else if (timePeriod === 'This Month') {
      dateFilter.gte = startOfUtcMonth(now);
    } else if (timePeriod === 'This Year') {
      dateFilter.gte = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    }

    if (Object.keys(dateFilter).length > 0) {
      where.date = dateFilter;
    }

    
    if (type === 'expense' || type === 'income') {
      where.type = type;
    }

    
    if (category) {
      const categoryRecord = await db.category.findFirst({
        where: {
          name: {
            equals: category,
            mode: 'insensitive',
          },
        },
      });

      if (categoryRecord) {
        where.categoryId = categoryRecord.id;
      } else {
        
        return NextResponse.json({
          transactions: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
          missingRates: 0,
        });
      }
    }

    
    if (search) {
      where.description = {
        contains: search,
        mode: 'insensitive',
      };
    }

    
    type OrderDirection = 'asc' | 'desc';
    const direction: OrderDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    let orderBy: Record<string, unknown>;
    switch (sortBy) {
      case 'description':
        orderBy = { description: direction };
        break;
      case 'type':
        orderBy = { type: direction };
        break;
      case 'amount':
        orderBy = { amount: direction };
        break;
      case 'category':
        orderBy = { category: { name: direction } };
        break;
      case 'date':
      default:
        orderBy = { date: direction };
        break;
    }

    
    const [total, filteredTransactions] = await Promise.all([
      db.transaction.count({ where }),
      db.transaction.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: true,
          currency: true,
        },
        orderBy,
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    
    const rateRequests = filteredTransactions.map((t) => ({ currencyId: t.currencyId, date: t.date }));
    const ratesMap = await preloadRates(rateRequests, targetCurrencyId);
    
    const transactionsWithConverted = convertTransactionsWithRatesMap(filteredTransactions, targetCurrencyId, ratesMap);


    
    const transactions: TransactionType[] = transactionsWithConverted.map((t) => {
      
      const fullName = formatTransactionName(t.description, userLanguageAlias, true);
      const originalAmount = moneyToNumber(t.amount);
      const originalSignedAmount = t.type === 'expense' ? -originalAmount : originalAmount;
      const convertedSignedAmount = t.type === 'expense' ? -t.convertedAmount : t.convertedAmount;

      return {
        id: t.id.toString(),
        name: fullName, 
        fullName: fullName, 
        originalDescription: t.description, 
        date: formatDisplayDate(t.date),
        dateRaw: toDateKey(t.date),
        amount: convertedSignedAmount,
        rateMissing: t.rateMissing,
        originalAmount: originalSignedAmount,
        originalCurrencySymbol: t.currency?.symbol,
        originalCurrencyAlias: t.currency?.alias,
        currencyId: t.currencyId,
        category: t.category?.name || null,
        icon: getIconForCategory(t.category?.name || null),
      };
    });

    return NextResponse.json({
      transactions,
      total,
      page,
      pageSize,
      totalPages,
      missingRates: countMissingRates(transactionsWithConverted),
    });
  } catch (error) {
    return errorResponse(error, 'Error fetching transactions', 'Failed to fetch transactions');
  }
}

async function createRecurringFromPayload(params: {
  userId: number;
  body: TransactionCreateBody;
  type: 'income' | 'expense';
  currencyId: number;
  categoryId: number | null;
  transactionDate: Date;
}) {
  const { userId, body, type, currencyId, categoryId, transactionDate } = params;
  const recurring = body.recurring;
  if (!recurring?.isRecurring) return;

  const frequencyUnit = recurring.frequencyUnit || 'month';
  const frequencyInterval = recurring.frequencyInterval || 1;
  const startDateStr = recurring.startDate || body.dateRaw || body.date;
  const endDateStr = recurring.endDate;

  const startDate = startDateStr ? parseDisplayDate(startDateStr)! : transactionDate;
  const nextDueDate = startDate;
  const endDate = endDateStr ? parseDisplayDate(endDateStr)! : undefined;

  const recurringAmount = parseMoney(body.amount) ?? new Prisma.Decimal(0);

  await db.recurringTransaction.create({
    data: {
      userId,
      type,
      name: body.name,
      amount: recurringAmount.abs(),
      currencyId,
      categoryId,
      startDate,
      nextDueDate,
      frequencyUnit,
      frequencyInterval,
      endDate,
    },
  });
}


export async function POST(request: NextRequest) {
  try {
    
    const user = await requireCurrentUserWithLanguage();
    const parsed = await parseJsonBody(request, transactionCreateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const { name, date, category, currencyId: requestCurrencyId } = body;
    const amount = parseMoney(body.amount)!;

    
    let currencyId = requestCurrencyId;
    if (!currencyId) {
      currencyId = user.currencyId ?? undefined;
      if (!currencyId) {
        const defaultCurrency = await db.currency.findFirst();
        if (!defaultCurrency) {
          return NextResponse.json(
            { error: 'No currency configured' },
            { status: 500 }
          );
        }
        currencyId = defaultCurrency.id;
      }
    }

    const transactionCurrency = await db.currency.findUnique({
      where: { id: currencyId },
    });

    
    const type = amount.gte(0) ? 'income' : 'expense';
    const absoluteAmount = amount.abs();

    
    const transactionDate = parseDisplayDate(date)!;

    
    let categoryId: number | null = null;
    if (category) {
      const categoryRecord = await db.category.findUnique({
        where: { name: category },
      });
      if (categoryRecord) {
        categoryId = categoryRecord.id;
      }
    }

    
    const userLanguageAlias = user.language?.alias?.toLowerCase() || null;

    
    const isRecurring = body.recurring?.isRecurring === true;
    let shouldCreateTransaction = true;
    let recurringStartDate: Date | null = null;

    if (isRecurring) {
      
      const startDateStr = body.recurring?.startDate || body.dateRaw || body.date;
      recurringStartDate = startDateStr ? parseDisplayDate(startDateStr)! : transactionDate;

      const today = startOfUtcDay(new Date());
      const startDateOnly = startOfUtcDay(recurringStartDate);

      shouldCreateTransaction = startDateOnly <= today;
    }

    
    await createRecurringFromPayload({
      userId: user.id,
      body,
      type,
      currencyId,
      categoryId,
      transactionDate,
    });

    
    
    
    let newTransaction = null;
    if (shouldCreateTransaction) {
      newTransaction = await db.transaction.create({
        data: {
          userId: user.id,
          type,
          amount: absoluteAmount,
          description: name, 
          date: transactionDate,
          categoryId,
          currencyId,
        },
        include: {
          category: true,
        },
      });
    }

    
    if (newTransaction) {
      
      const newAmount = moneyToNumber(newTransaction.amount);
      const signedAmount = newTransaction.type === 'expense' ? -newAmount : newAmount;

      const transaction: TransactionType = {
        id: newTransaction.id.toString(),
        name: formatTransactionName(newTransaction.description, userLanguageAlias, false),
        fullName: formatTransactionName(newTransaction.description, userLanguageAlias, true),
        originalDescription: newTransaction.description, 
        date: formatDisplayDate(newTransaction.date),
        dateRaw: toDateKey(newTransaction.date),
        amount: signedAmount,
        category: newTransaction.category?.name || null,
        icon: getIconForCategory(newTransaction.category?.name || null),
        originalAmount: signedAmount,
        originalCurrencySymbol: transactionCurrency?.symbol,
        originalCurrencyAlias: transactionCurrency?.alias,
      };

      return NextResponse.json({ transaction }, { status: 201 });
    } else {
      
      
      return NextResponse.json({
        message: 'Recurring transaction created. Transaction will be created when start date arrives.',
        transaction: null
      }, { status: 201 });
    }
  } catch (error) {
    return errorResponse(error, 'Error creating transaction', 'Failed to create transaction');
  }
}


export async function PUT(request: NextRequest) {
  try {
    
    const user = await requireCurrentUserWithLanguage();
    const parsed = await parseJsonBody(request, transactionUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const { id, name, date, category, currencyId, investmentType, quantity, pricePerUnit } = body;
    const amount = parseMoney(body.amount)!;

    
    const existingTransaction = await db.transaction.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }


    const type = amount.gte(0) ? 'income' : 'expense';
    const absoluteAmount = amount.abs();

    
    const transactionDate = parseDisplayDate(date)!;

    
    let categoryId: number | null = null;
    if (category) {
      const categoryRecord = await db.category.findUnique({
        where: { name: category },
      });
      if (categoryRecord) {
        categoryId = categoryRecord.id;
      }
    }

    
    let transactionCurrencyId: number;
    if (currencyId !== undefined && currencyId !== null) {
      
      const currencyRecord = await db.currency.findUnique({
        where: { id: currencyId },
      });
      if (!currencyRecord) {
        return NextResponse.json(
          { error: 'Invalid currency ID' },
          { status: 400 }
        );
      }
      transactionCurrencyId = currencyRecord.id;
    } else {
      
      transactionCurrencyId = user.currencyId ?? existingTransaction.currencyId;
      if (!transactionCurrencyId) {
        const defaultCurrency = await db.currency.findFirst();
        if (!defaultCurrency) {
          return NextResponse.json(
            { error: 'No currency configured' },
            { status: 500 }
          );
        }
        transactionCurrencyId = defaultCurrency.id;
      }
    }

    
    const userLanguageAlias = user.language?.alias?.toLowerCase() || null;

    
    const parsedQuantity = quantity !== undefined ? parseQuantity(quantity)! : undefined;
    const parsedPrice = pricePerUnit !== undefined ? parseQuantity(pricePerUnit)! : undefined;

    // Holding check and write run in one serializable transaction so two concurrent edits
    // cannot both pass the check and leave a negative holding.
    const assetId = existingTransaction.investmentAssetId;
    const checksHolding = assetId !== null && Boolean(investmentType || quantity);
    const writeResult = await db.$transaction(async (tx) => {
      if (checksHolding && assetId !== null) {
        const currentHolding = await getHoldingQuantity(tx, user.id, assetId);
        const oldQty = existingTransaction.quantity ?? new Prisma.Decimal(0);
        const oldType = existingTransaction.investmentType;
        const newQty = parsedQuantity ?? oldQty;
        const newType = investmentType || oldType;

        let adjustedHolding = currentHolding;
        if (oldType === 'buy') adjustedHolding = adjustedHolding.minus(oldQty);
        else if (oldType === 'sell') adjustedHolding = adjustedHolding.plus(oldQty);

        if (newType === 'buy') adjustedHolding = adjustedHolding.plus(newQty);
        else if (newType === 'sell') adjustedHolding = adjustedHolding.minus(newQty);

        if (adjustedHolding.lt(0)) {
          return { negativeHolding: adjustedHolding };
        }
      }

      const updated = await tx.transaction.update({
        where: { id: existingTransaction.id, userId: user.id },
        data: {
          type,
          amount: absoluteAmount,
          description: name, 
          date: transactionDate,
          categoryId,
          currencyId: transactionCurrencyId,
          investmentType,
          quantity: parsedQuantity,
          pricePerUnit: parsedPrice,
        },
        include: {
          category: true,
          currency: true,
        },
      });
      return { updated };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (writeResult.negativeHolding) {
      const holdingText = formatHolding(writeResult.negativeHolding);
      return NextResponse.json({ 
        error: `Invalid transaction update. This would result in a negative holding (${holdingText}).` 
      }, { status: 400 });
    }

    const updatedTransaction = writeResult.updated;
    
    
    if (categoryId && categoryId !== existingTransaction.categoryId) {
      try {
        const { normalizeMerchantName, extractMerchantFromDescription } = await import('@/lib/merchant');
        const merchantName = extractMerchantFromDescription(name);
        const normalizedMerchant = normalizeMerchantName(merchantName);

        if (normalizedMerchant) {
          
          await db.merchant.upsert({
            where: {
              userId_namePattern: {
                userId: user.id,
                namePattern: normalizedMerchant,
              },
            },
            update: {
              categoryId,
              matchCount: { increment: 1 },
              updatedAt: new Date(),
            },
            create: {
              userId: user.id,
              namePattern: normalizedMerchant,
              categoryId,
              matchCount: 1,
            },
          });
        }
      } catch (error) {
        
        console.debug('[merchant/learn] failed during transaction update', error);
      }
    }

    
    const updatedAmount = moneyToNumber(updatedTransaction.amount);
    const signedUpdatedAmount = updatedTransaction.type === 'expense' ? -updatedAmount : updatedAmount;

    
    const userCurrencyRecord = user.currencyId
      ? await db.currency.findUnique({ where: { id: user.currencyId } })
      : await db.currency.findFirst();

    if (!userCurrencyRecord) {
      return NextResponse.json(
        { error: 'No currency configured.' },
        { status: 500 },
      );
    }

    const targetCurrencyId = userCurrencyRecord.id;
    const convertedMoney = await convertMoney(
      updatedTransaction.amount,
      updatedTransaction.currencyId,
      targetCurrencyId,
      updatedTransaction.date,
    );
    const convertedAmount = convertedMoney ? moneyToNumber(convertedMoney) : 0;
    const convertedSignedAmount = updatedTransaction.type === 'expense' ? -convertedAmount : convertedAmount;

    const transaction: TransactionType = {
      id: updatedTransaction.id.toString(),
      name: formatTransactionName(updatedTransaction.description, userLanguageAlias, false),
      fullName: formatTransactionName(updatedTransaction.description, userLanguageAlias, true),
      originalDescription: updatedTransaction.description, 
      date: formatDisplayDate(updatedTransaction.date),
      dateRaw: toDateKey(updatedTransaction.date),
      amount: convertedSignedAmount,
      rateMissing: convertedMoney === null,
      category: updatedTransaction.category?.name || null,
      icon: getIconForCategory(updatedTransaction.category?.name || null),
      originalAmount: signedUpdatedAmount,
      originalCurrencySymbol: updatedTransaction.currency?.symbol,
      originalCurrencyAlias: updatedTransaction.currency?.alias,
      currencyId: updatedTransaction.currencyId,
    };

    return NextResponse.json({ transaction });
  } catch (error) {
    return errorResponse(error, 'Error updating transaction', 'Failed to update transaction');
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing transaction id' },
        { status: 400 }
      );
    }

    
    const existingTransaction = await db.transaction.findFirst({
      where: {
        id: parseInt(String(id), 10),
        userId: user.id,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    
    // Holding check and delete run in one serializable transaction (see PUT).
    const assetId = existingTransaction.investmentAssetId;
    const deleteResult = await db.$transaction(async (tx) => {
      if (assetId !== null) {
        const currentHolding = await getHoldingQuantity(tx, user.id, assetId);
        const qty = existingTransaction.quantity ?? new Prisma.Decimal(0);
        const type = existingTransaction.investmentType;

        let predictedTotal = currentHolding;
        if (type === 'buy') predictedTotal = predictedTotal.minus(qty);
        else if (type === 'sell') predictedTotal = predictedTotal.plus(qty);

        if (predictedTotal.lt(0)) {
          return { negativeHolding: predictedTotal };
        }
      }

      await tx.transaction.delete({
        where: { id: existingTransaction.id, userId: user.id },
      });
      return { deleted: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (deleteResult.negativeHolding) {
      const holdingText = formatHolding(deleteResult.negativeHolding);
      return NextResponse.json({ 
        error: `Cannot delete this transaction. It would result in a negative holding (${holdingText}).` 
      }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, 'Error deleting transaction', 'Failed to delete transaction');
  }
}



/** Sum of buys minus sells for one asset, read inside the given transaction client. */
async function getHoldingQuantity(
  tx: Prisma.TransactionClient,
  userId: number,
  assetId: number,
): Promise<Prisma.Decimal> {
  const rows = await tx.transaction.findMany({
    where: { userId, investmentAssetId: assetId },
    select: { quantity: true, investmentType: true },
  });

  let total = new Prisma.Decimal(0);
  for (const row of rows) {
    const qty = row.quantity ?? new Prisma.Decimal(0);
    if (row.investmentType === 'buy') total = total.plus(qty);
    else if (row.investmentType === 'sell') total = total.minus(qty);
  }
  return total;
}

function formatHolding(value: Prisma.Decimal): string {
  const holdingNumber = value.toNumber();
  return holdingNumber.toLocaleString(undefined, { maximumFractionDigits: QUANTITY_SCALE });
}
