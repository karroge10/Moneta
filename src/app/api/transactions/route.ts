import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser, requireCurrentUserWithLanguage } from '@/lib/auth';
import { db } from '@/lib/db';
import { Transaction as TransactionType } from '@/types/dashboard';
import { formatTransactionName } from '@/lib/transaction-utils';
import { convertAmount, convertTransactionsWithRatesMap, preloadRatesMap } from '@/lib/currency-conversion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  
  const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
    day === 2 || day === 22 ? 'nd' :
      day === 3 || day === 23 ? 'rd' : 'th';

  return `${month} ${day}${suffix} ${year}`;
}


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
      dateFilter.gte = new Date(year, monthNum - 1, 1);
      dateFilter.lte = new Date(year, monthNum, 0, 23, 59, 59);
    } else if (timePeriod === 'This Month') {
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timePeriod === 'This Year') {
      dateFilter.gte = new Date(now.getFullYear(), 0, 1);
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

    
    const ratesMap = await preloadRatesMap(
      filteredTransactions.map(t => ({ currencyId: t.currencyId, date: t.date })),
      targetCurrencyId
    );
    
    const transactionsWithConverted = convertTransactionsWithRatesMap(filteredTransactions, targetCurrencyId, ratesMap);


    
    const transactions: TransactionType[] = transactionsWithConverted.map((t) => {
      
      const fullName = formatTransactionName(t.description, userLanguageAlias, true);
      const originalSignedAmount = t.type === 'expense' ? -t.amount : t.amount;
      const convertedSignedAmount = t.type === 'expense' ? -t.convertedAmount : t.convertedAmount;

      return {
        id: t.id.toString(),
        name: fullName, 
        fullName: fullName, 
        originalDescription: t.description, 
        date: formatDate(t.date),
        dateRaw: t.date.toISOString().split('T')[0], 
        amount: convertedSignedAmount,
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
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

async function createRecurringFromPayload(params: {
  userId: number;
  body: any;
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

  const startDate = startDateStr ? new Date(startDateStr) : transactionDate;
  const nextDueDate = startDate;
  const endDate = endDateStr ? new Date(endDateStr) : undefined;

  await db.recurringTransaction.create({
    data: {
      userId,
      type,
      name: body.name,
      amount: Math.abs(body.amount),
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
    const body = await request.json();

    const { name, date, amount, category, currencyId: requestCurrencyId } = body;

    if (!name || !date || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, date, amount' },
        { status: 400 }
      );
    }

    
    let currencyId = requestCurrencyId;
    if (!currencyId) {
      currencyId = user.currencyId;
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

    
    const type = amount >= 0 ? 'income' : 'expense';
    const absoluteAmount = Math.abs(amount);

    
    let transactionDate: Date;
    if (date.includes('st') || date.includes('nd') || date.includes('rd') || date.includes('th')) {
      
      const months: Record<string, number> = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
      };
      const parts = date.split(' ');
      const month = months[parts[0]];
      const day = parseInt(parts[1].replace(/\D/g, ''));
      const year = parseInt(parts[2]);
      transactionDate = new Date(year, month, day);
    } else {
      transactionDate = new Date(date);
    }

    
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
      recurringStartDate = startDateStr ? new Date(startDateStr) : transactionDate;

      
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDateOnly = new Date(recurringStartDate);
      startDateOnly.setHours(0, 0, 0, 0);

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
      
      const signedAmount = newTransaction.type === 'expense' ? -newTransaction.amount : newTransaction.amount;

      const transaction: TransactionType = {
        id: newTransaction.id.toString(),
        name: formatTransactionName(newTransaction.description, userLanguageAlias, false),
        fullName: formatTransactionName(newTransaction.description, userLanguageAlias, true),
        originalDescription: newTransaction.description, 
        date: formatDate(newTransaction.date),
        dateRaw: newTransaction.date.toISOString().split('T')[0],
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
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}


export async function PUT(request: NextRequest) {
  try {
    
    const user = await requireCurrentUserWithLanguage();
    const body = await request.json();

    const { id, name, date, amount, category, currencyId, investmentType, quantity, pricePerUnit } = body;

    if (!id || !name || !date || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, date, amount' },
        { status: 400 }
      );
    }

    
    const existingTransaction = await db.transaction.findFirst({
      where: {
        id: parseInt(id),
        userId: user.id,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    
    const type = amount >= 0 ? 'income' : 'expense';
    const absoluteAmount = Math.abs(amount);

    
    let transactionDate: Date;
    if (date.includes('st') || date.includes('nd') || date.includes('rd') || date.includes('th')) {
      const months: Record<string, number> = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
      };
      const parts = date.split(' ');
      const month = months[parts[0]];
      const day = parseInt(parts[1].replace(/\D/g, ''));
      const year = parseInt(parts[2]);
      transactionDate = new Date(year, month, day);
    } else {
      transactionDate = new Date(date);
    }

    
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
        where: { id: Number(currencyId) },
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

    
    if (existingTransaction.investmentAssetId && (investmentType || quantity)) {
      const { getAssetHolding } = await import('@/lib/investments');
      const currentHolding = await getAssetHolding(user.id, existingTransaction.investmentAssetId);
      
      
      const oldQty = Number(existingTransaction.quantity || 0);
      const oldType = existingTransaction.investmentType;
      const newQty = quantity !== undefined ? Number(quantity) : oldQty;
      const newType = investmentType || oldType;

      
      let adjustedHolding = currentHolding;
      if (oldType === 'buy') adjustedHolding -= oldQty;
      else if (oldType === 'sell') adjustedHolding += oldQty;

      
      if (newType === 'buy') adjustedHolding += newQty;
      else if (newType === 'sell') adjustedHolding -= newQty;

      const epsilon = 0.00000001;
      if (adjustedHolding + epsilon < 0) {
        return NextResponse.json({ 
          error: `Invalid transaction update. This would result in a negative holding (${adjustedHolding.toLocaleString(undefined, { maximumFractionDigits: 8 })}).` 
        }, { status: 400 });
      }
    }

    
    const updatedTransaction = await db.transaction.update({
      where: { id: parseInt(id) },
      data: {
        type,
        amount: absoluteAmount,
        description: name, 
        date: transactionDate,
        categoryId,
        currencyId: transactionCurrencyId,
        investmentType: investmentType as any,
        quantity: quantity !== undefined ? Number(quantity) : undefined,
        pricePerUnit: pricePerUnit !== undefined ? Number(pricePerUnit) : undefined,
      },
      include: {
        category: true,
        currency: true,
      },
    });

    
    
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

    
    const signedUpdatedAmount = updatedTransaction.type === 'expense' ? -updatedTransaction.amount : updatedTransaction.amount;

    
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
    const convertedAmount = await convertAmount(
      updatedTransaction.amount,
      updatedTransaction.currencyId,
      targetCurrencyId,
      updatedTransaction.date,
    );
    const convertedSignedAmount = updatedTransaction.type === 'expense' ? -convertedAmount : convertedAmount;

    const transaction: TransactionType = {
      id: updatedTransaction.id.toString(),
      name: formatTransactionName(updatedTransaction.description, userLanguageAlias, false),
      fullName: formatTransactionName(updatedTransaction.description, userLanguageAlias, true),
      originalDescription: updatedTransaction.description, 
      date: formatDate(updatedTransaction.date),
      dateRaw: updatedTransaction.date.toISOString().split('T')[0],
      amount: convertedSignedAmount,
      category: updatedTransaction.category?.name || null,
      icon: getIconForCategory(updatedTransaction.category?.name || null),
      originalAmount: signedUpdatedAmount,
      originalCurrencySymbol: updatedTransaction.currency?.symbol,
      originalCurrencyAlias: updatedTransaction.currency?.alias,
      currencyId: updatedTransaction.currencyId,
    };

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
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
        id: parseInt(id),
        userId: user.id,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    
    if (existingTransaction.investmentAssetId) {
      const { getAssetHolding } = await import('@/lib/investments');
      const currentHolding = await getAssetHolding(user.id, existingTransaction.investmentAssetId);
      
      const qty = Number(existingTransaction.quantity || 0);
      const type = existingTransaction.investmentType;

      
      let predictedTotal = currentHolding;
      if (type === 'buy') predictedTotal -= qty;
      else if (type === 'sell') predictedTotal += qty;

      const epsilon = 0.00000001;
      if (predictedTotal + epsilon < 0) {
        return NextResponse.json({ 
          error: `Cannot delete this transaction. It would result in a negative holding (${predictedTotal.toLocaleString(undefined, { maximumFractionDigits: 8 })}).` 
        }, { status: 400 });
      }
    }

    
    await db.transaction.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}

