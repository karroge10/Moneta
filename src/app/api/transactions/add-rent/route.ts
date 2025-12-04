import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/transactions/add-rent
 * Add rent transactions for each month starting from October 2024
 * Creates transactions on the 12th of each month for the current user
 */
export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await requireCurrentUser();
    
    // Find Rent category
    const rentCategory = await db.category.findUnique({
      where: { name: 'Rent' },
    });
    
    if (!rentCategory) {
      return NextResponse.json(
        { error: 'Rent category not found' },
        { status: 404 }
      );
    }
    
    // Get user's default currency
    let currencyId = user.currencyId;
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
    
    // Generate dates from October 2024 to current month
    const startDate = new Date(2024, 9, 12); // October 12, 2024 (month is 0-indexed)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const transactionsToCreate = [];
    
    // Generate transactions for each month
    let currentDate = new Date(startDate);
    while (
      currentDate.getFullYear() < currentYear ||
      (currentDate.getFullYear() === currentYear && currentDate.getMonth() <= currentMonth)
    ) {
      // Check if transaction already exists for this date
      const existingTransaction = await db.transaction.findFirst({
        where: {
          userId: user.id,
          categoryId: rentCategory.id,
          date: {
            gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 12),
            lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), 13),
          },
        },
      });
      
      if (!existingTransaction) {
        // Format description as "Month Year Rent Total" (e.g., "August 2024 Rent Total")
        const transactionDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 12);
        const monthName = transactionDate.toLocaleDateString('en-US', { month: 'long' });
        const year = transactionDate.getFullYear();
        const description = `${monthName} ${year} Rent Total`;
        
        transactionsToCreate.push({
          userId: user.id,
          type: 'expense',
          amount: 450,
          description,
          date: transactionDate,
          categoryId: rentCategory.id,
          currencyId,
          source: 'manual',
        });
      }
      
      // Move to next month
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 12);
    }
    
    if (transactionsToCreate.length === 0) {
      return NextResponse.json(
        { message: 'All rent transactions already exist', count: 0 },
        { status: 200 }
      );
    }
    
    // Create all transactions
    const result = await db.transaction.createMany({
      data: transactionsToCreate,
      skipDuplicates: true,
    });
    
    return NextResponse.json(
      {
        message: `Successfully created ${result.count} rent transaction(s)`,
        count: result.count,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding rent transactions:', error);
    return NextResponse.json(
      { error: 'Failed to add rent transactions' },
      { status: 500 }
    );
  }
}

