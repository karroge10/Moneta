import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser, requireCurrentUserWithLanguage } from '@/lib/auth';
import { db } from '@/lib/db';
import { Transaction as TransactionType } from '@/types/dashboard';
import { formatTransactionName } from '@/lib/transaction-utils';
import { convertAmount } from '@/lib/currency-conversion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Format date to match frontend format (e.g., "Dec 2nd 2024")
function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  // Add ordinal suffix
  const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                 day === 2 || day === 22 ? 'nd' :
                 day === 3 || day === 23 ? 'rd' : 'th';
  
  return `${month} ${day}${suffix} ${year}`;
}

// Get icon based on category name or default
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

// GET - Fetch transactions with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    // Get user with language included to avoid extra query
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
    
    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    
    // Filters
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const type = searchParams.get('type'); // 'expense' | 'income' | null
    const month = searchParams.get('month'); // Format: 'YYYY-MM'
    const timePeriod = searchParams.get('timePeriod') || 'All Time';
    
    // Sorting
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Build where clause
    const where: Record<string, unknown> = {
      userId: user.id,
    };
    
    // Date filter based on time period or month
    const dateFilter: { gte?: Date; lte?: Date } = {};
    const now = new Date();
    
    // Month filter takes precedence over time period if specified
    if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      dateFilter.gte = new Date(year, monthNum - 1, 1);
      dateFilter.lte = new Date(year, monthNum, 0, 23, 59, 59);
    } else if (timePeriod === 'This Month') {
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timePeriod === 'This Quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      dateFilter.gte = new Date(now.getFullYear(), quarter * 3, 1);
    } else if (timePeriod === 'This Year') {
      dateFilter.gte = new Date(now.getFullYear(), 0, 1);
    }
    
    if (Object.keys(dateFilter).length > 0) {
      where.date = dateFilter;
    }
    
    // Type filter
    if (type === 'expense' || type === 'income') {
      where.type = type;
    }
    
    // Category filter
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
        // Category not found, return empty results
        return NextResponse.json({
          transactions: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        });
      }
    }
    
    // Search filter
    if (search) {
      where.description = {
        contains: search,
        mode: 'insensitive',
      };
    }
    
    // Get total count - all transactions are included (no filtering)
    const total = await db.transaction.count({ where });
    const totalPages = Math.ceil(total / pageSize);
    
    // Build orderBy clause based on sort parameters
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
    
    // Fetch paginated transactions - all transactions are included (no filtering)
    const filteredTransactions = await db.transaction.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: true,
        currency: true,
      },
      orderBy,
    });

    const transactionsWithConverted = await Promise.all(
      filteredTransactions.map(async (transaction) => {
        const convertedAmount = await convertAmount(
          transaction.amount,
          transaction.currencyId,
          targetCurrencyId,
          transaction.date,
        );

        return {
          ...transaction,
          convertedAmount,
        };
      }),
    );
    
    // Transform to frontend format
    const transactions: TransactionType[] = transactionsWithConverted.map((t) => {
      // For transaction history page, show full name (translated if needed, but not cleaned)
      const fullName = formatTransactionName(t.description, userLanguageAlias, true);
      const originalSignedAmount = t.type === 'expense' ? -t.amount : t.amount;
      const convertedSignedAmount = t.type === 'expense' ? -t.convertedAmount : t.convertedAmount;
      
      return {
        id: t.id.toString(),
        name: fullName, // Full description for transaction history
        fullName: fullName, // Full description for transaction modal (same as name)
        originalDescription: t.description, // Original description from database
        date: formatDate(t.date),
        dateRaw: t.date.toISOString().split('T')[0], // Raw date for filtering
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

// POST - Create a new transaction
export async function POST(request: NextRequest) {
  try {
    // Get user with language included to avoid extra query
    const user = await requireCurrentUserWithLanguage();
    const body = await request.json();
    
    const { name, date, amount, category, currencyId: requestCurrencyId } = body;
    
    if (!name || !date || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, date, amount' },
        { status: 400 }
      );
    }
    
    // Use currencyId from request if provided, otherwise use user's default currency
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
    
    // Determine type and absolute amount
    const type = amount >= 0 ? 'income' : 'expense';
    const absoluteAmount = Math.abs(amount);
    
    // Parse date (format: "Dec 2nd 2024" or ISO string)
    let transactionDate: Date;
    if (date.includes('st') || date.includes('nd') || date.includes('rd') || date.includes('th')) {
      // Parse custom format
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
    
    // Find category if provided
    let categoryId: number | null = null;
    if (category) {
      const categoryRecord = await db.category.findUnique({
        where: { name: category },
      });
      if (categoryRecord) {
        categoryId = categoryRecord.id;
      }
    }
    
    // Get language alias from user (already fetched with language relation)
    const userLanguageAlias = user.language?.alias?.toLowerCase() || null;

    // Create recurring schedule if requested
    await createRecurringFromPayload({
      userId: user.id,
      body,
      type,
      currencyId,
      categoryId,
      transactionDate,
    });
    
    // Create transaction (save full description to database)
    const newTransaction = await db.transaction.create({
      data: {
        userId: user.id,
        type,
        amount: absoluteAmount,
        description: name, // Save full description
        date: transactionDate,
        categoryId,
        currencyId,
      },
      include: {
        category: true,
      },
    });
    
    // Transform to frontend format (format name for display)
    const signedAmount = newTransaction.type === 'expense' ? -newTransaction.amount : newTransaction.amount;

    const transaction: TransactionType = {
      id: newTransaction.id.toString(),
      name: formatTransactionName(newTransaction.description, userLanguageAlias, false),
      fullName: formatTransactionName(newTransaction.description, userLanguageAlias, true),
      originalDescription: newTransaction.description, // Original description from database
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
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing transaction
export async function PUT(request: NextRequest) {
  try {
    // Get user with language included to avoid extra query
    const user = await requireCurrentUserWithLanguage();
    const body = await request.json();
    
    const { id, name, date, amount, category, currencyId } = body;
    
    if (!id || !name || !date || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, date, amount' },
        { status: 400 }
      );
    }
    
    // Verify transaction belongs to user
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
    
    // Determine type and absolute amount
    const type = amount >= 0 ? 'income' : 'expense';
    const absoluteAmount = Math.abs(amount);
    
    // Parse date
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
    
    // Find category if provided
    let categoryId: number | null = null;
    if (category) {
      const categoryRecord = await db.category.findUnique({
        where: { name: category },
      });
      if (categoryRecord) {
        categoryId = categoryRecord.id;
      }
    }
    
    // Validate and get currency ID
    let transactionCurrencyId: number;
    if (currencyId !== undefined && currencyId !== null) {
      // Validate currency exists
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
      // Fall back to user's default currency or existing transaction currency
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
    
    // Get language alias from user (already fetched with language relation)
    const userLanguageAlias = user.language?.alias?.toLowerCase() || null;
    
    // Update transaction (save full description to database)
    const updatedTransaction = await db.transaction.update({
      where: { id: parseInt(id) },
      data: {
        type,
        amount: absoluteAmount,
        description: name, // Save full description
        date: transactionDate,
        categoryId,
        currencyId: transactionCurrencyId,
      },
      include: {
        category: true,
        currency: true,
      },
    });
    
    // Learn merchant mapping if category was changed
    // Only learn if category was actually set (not null) and different from before
    if (categoryId && categoryId !== existingTransaction.categoryId) {
      try {
        const { normalizeMerchantName, extractMerchantFromDescription } = await import('@/lib/merchant');
        const merchantName = extractMerchantFromDescription(name);
        const normalizedMerchant = normalizeMerchantName(merchantName);
        
        if (normalizedMerchant) {
          // Fire-and-forget: learn merchant mapping in background
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
        // Silently fail - learning is optional, don't break transaction update
        console.debug('[merchant/learn] failed during transaction update', error);
      }
    }
    
    // Transform to frontend format (format name for display)
    const signedUpdatedAmount = updatedTransaction.type === 'expense' ? -updatedTransaction.amount : updatedTransaction.amount;
    
    // Get user's currency for conversion
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
      originalDescription: updatedTransaction.description, // Original description from database
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

// DELETE - Delete a transaction
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
    
    // Verify transaction belongs to user
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
    
    // Delete transaction
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

