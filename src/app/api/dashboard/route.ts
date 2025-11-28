import { NextResponse } from 'next/server';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { db } from '@/lib/db';
import { Transaction as TransactionType, ExpenseCategory } from '@/types/dashboard';
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

// Color palette for categories
const categoryColors = ['#74C648', '#AC66DA', '#D93F3F', '#4A90E2', '#FFA500', '#FF8C00'];

// GET - Fetch dashboard data
export async function GET() {
  try {
    // Get user with language included to avoid extra query
    const user = await requireCurrentUserWithLanguage();
    const userLanguageAlias = user.language?.alias?.toLowerCase() || null;
    
    const now = new Date();

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
    
    // Calculate date ranges
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    // Fetch all transactions for the user - no filtering, all transactions are included
    const allTransactions = await db.transaction.findMany({
      where: {
        userId: user.id,
      },
      include: {
        category: true,
        currency: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    const transactionsWithConverted = await Promise.all(
      allTransactions.map(async (transaction) => {
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
    
    // Calculate current month income and expenses - all transactions included
    const currentMonthTransactions = transactionsWithConverted.filter((t) => t.date >= currentMonthStart);
    const currentMonthIncome = currentMonthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum: number, t) => sum + t.convertedAmount, 0);
    const currentMonthExpenses = currentMonthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum: number, t) => sum + t.convertedAmount, 0);
    
    // Calculate last month income and expenses - all transactions included
    const lastMonthTransactions = transactionsWithConverted.filter((t) => 
      t.date >= lastMonthStart && t.date <= lastMonthEnd
    );
    const lastMonthIncome = lastMonthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum: number, t) => sum + t.convertedAmount, 0);
    const lastMonthExpenses = lastMonthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum: number, t) => sum + t.convertedAmount, 0);
    
    // Calculate trends
    const incomeTrend = lastMonthIncome > 0 
      ? Math.round(((currentMonthIncome - lastMonthIncome) / lastMonthIncome) * 100)
      : currentMonthIncome > 0 ? 100 : 0;
    
    const expenseTrend = lastMonthExpenses > 0
      ? Math.round(((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100)
      : currentMonthExpenses > 0 ? 100 : 0;
    
    // Get latest transactions (limit to 6) - all transactions included
    const latestTransactions: TransactionType[] = transactionsWithConverted
      .slice(0, 6)
      .map((t) => {
        const originalSignedAmount = t.type === 'expense' ? -t.amount : t.amount;
        const convertedSignedAmount = t.type === 'expense' ? -t.convertedAmount : t.convertedAmount;
        // Format transaction name (cleaned and translated if needed)
        const displayName = formatTransactionName(t.description, userLanguageAlias, false);
        // Full name for modal (translated if needed, but not cleaned)
        const fullName = formatTransactionName(t.description, userLanguageAlias, true);
        
        return {
          id: t.id.toString(),
          name: displayName,
          fullName: fullName, // Full description for transaction modal
          originalDescription: t.description, // Original description from database
          date: formatDate(t.date),
          dateRaw: t.date.toISOString().split('T')[0],
          amount: convertedSignedAmount,
          originalAmount: originalSignedAmount,
          originalCurrencySymbol: t.currency?.symbol,
          originalCurrencyAlias: t.currency?.alias,
          category: t.category?.name || null,
          icon: getIconForCategory(t.category?.name || null),
        };
      });
    
    // Calculate top expense categories (current month)
    const expenseTransactions = currentMonthTransactions.filter((t) => t.type === 'expense');
    const categoryTotals = new Map<string, { amount: number; categoryId: number; categoryName: string }>();
    
    expenseTransactions.forEach((t) => {
      const categoryName = t.category?.name || 'Uncategorized';
      const categoryId = t.categoryId || 0;
      
      if (!categoryTotals.has(categoryName)) {
        categoryTotals.set(categoryName, {
          amount: 0,
          categoryId,
          categoryName,
        });
      }
      
      const existing = categoryTotals.get(categoryName)!;
      existing.amount += t.convertedAmount;
    });
    
    // Convert to array and sort by amount
    const topCategoriesArray = Array.from(categoryTotals.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3); // Top 3
    
    // Calculate total expenses for percentage calculation (all expenses, not just top 3)
    const totalExpenses = currentMonthExpenses;
    
    // Format top expenses with percentages and colors
    const topExpenses: ExpenseCategory[] = topCategoriesArray.map((cat, index: number) => {
      const percentage = totalExpenses > 0 
        ? Math.round((cat.amount / totalExpenses) * 100)
        : 0;
      
      return {
        id: cat.categoryId.toString() || `uncategorized-${index}`,
        name: cat.categoryName,
        amount: cat.amount,
        percentage,
        icon: getIconForCategory(cat.categoryName),
        color: categoryColors[index % categoryColors.length],
      };
    });
    
    return NextResponse.json({
      income: {
        amount: Math.round(currentMonthIncome),
        trend: incomeTrend,
      },
      expenses: {
        amount: Math.round(currentMonthExpenses),
        trend: expenseTrend,
      },
      transactions: latestTransactions,
      topExpenses,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

