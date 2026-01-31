import { NextResponse, NextRequest } from 'next/server';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { db } from '@/lib/db';
import { Transaction as TransactionType, ExpenseCategory, TimePeriod } from '@/types/dashboard';
import { formatTransactionName } from '@/lib/transaction-utils';
import { convertAmount } from '@/lib/currency-conversion';
import { getInvestmentsPortfolio } from '@/lib/investments';

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

// Color palette for categories - limited to purple, green, and red only
const categoryColors = ['#AC66DA', '#74C648', '#D93F3F'];

/**
 * Calculate date range for a given time period
 */
function getDateRangeForPeriod(period: TimePeriod, now: Date): { start: Date; end: Date } {
  const year = now.getFullYear();
  const month = now.getMonth();
  
  switch (period) {
    case 'This Month':
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0, 23, 59, 59, 999),
      };
    
    case 'Last Month':
      return {
        start: new Date(year, month - 1, 1),
        end: new Date(year, month, 0, 23, 59, 59, 999),
      };
    
    case 'This Year':
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
      };
    
    case 'Last Year':
      return {
        start: new Date(year - 1, 0, 1),
        end: new Date(year - 1, 11, 31, 23, 59, 59, 999),
      };
    
    case 'All Time':
      // Return a very early date to include all transactions
      return {
        start: new Date(2000, 0, 1),
        end: new Date(year + 10, 11, 31, 23, 59, 59, 999),
      };
    
    default:
      // Default to This Month
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0, 23, 59, 59, 999),
      };
  }
}

/**
 * Get the comparison date range for trend calculation
 * For "This Month" -> compare to "Last Month"
 * For "Last Month" -> compare to "2 months ago" (the month before last month)
 * For "This Year" -> compare to "Last Year"
 * For "Last Year" -> compare to "2 years ago"
 * Returns null if no comparison should be made (e.g., All Time)
 */
function getComparisonDateRange(period: TimePeriod, now: Date): { start: Date; end: Date } | null {
  const year = now.getFullYear();
  const month = now.getMonth();
  
  switch (period) {
    case 'This Month':
      // Compare to Last Month
      return {
        start: new Date(year, month - 1, 1),
        end: new Date(year, month, 0, 23, 59, 59, 999),
      };
    
    case 'Last Month':
      // Compare to 2 months ago (the month before last month)
      return {
        start: new Date(year, month - 2, 1),
        end: new Date(year, month - 1, 0, 23, 59, 59, 999),
      };
    
    case 'This Year':
      // Compare to Last Year
      return {
        start: new Date(year - 1, 0, 1),
        end: new Date(year - 1, 11, 31, 23, 59, 59, 999),
      };
    
    case 'Last Year':
      // Compare to 2 years ago
      return {
        start: new Date(year - 2, 0, 1),
        end: new Date(year - 2, 11, 31, 23, 59, 59, 999),
      };
    
    case 'All Time':
      return null; // No comparison for All Time
    
    default:
      return null;
  }
}

/**
 * Get human-readable comparison label for trend display
 */
function getComparisonLabel(period: TimePeriod): string {
  switch (period) {
    case 'This Month':
      return 'from last month';
    case 'Last Month':
      return 'from 2 months ago';
    case 'This Year':
      return 'from last year';
    case 'Last Year':
      return 'from 2 years ago';
    case 'All Time':
      return '';
    default:
      return '';
  }
}

// GET - Fetch dashboard data
// This endpoint fetches real transaction data from the database:
// 1. Gets all transactions for the authenticated user from the Transaction table
// 2. Converts amounts to user's preferred currency using exchange rates
// 3. Filters transactions by date based on timePeriod parameter
// 4. Calculates income (type='income') and expenses (type='expense') totals
// 5. Calculates percentage trends comparing selected period to comparison period
export async function GET(request: NextRequest) {
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
    
    // Get time period from query params, default to 'This Month'
    const { searchParams } = new URL(request.url);
    const timePeriod = (searchParams.get('timePeriod') || 'This Month') as TimePeriod;
    
    // Calculate date ranges for selected period and comparison period
    const selectedRange = getDateRangeForPeriod(timePeriod, now);
    const comparisonRange = getComparisonDateRange(timePeriod, now);
    
    // Fetch only the needed slices to reduce payload and conversion work
    const [selectedTransactions, comparisonTransactions, latestTransactionsRaw] = await Promise.all([
      db.transaction.findMany({
        where: {
          userId: user.id,
          date: {
            gte: selectedRange.start,
            lte: selectedRange.end,
          },
        },
        include: {
          category: true,
          currency: true,
        },
        orderBy: { date: 'desc' },
      }),
      comparisonRange
        ? db.transaction.findMany({
            where: {
              userId: user.id,
              date: {
                gte: comparisonRange.start,
                lte: comparisonRange.end,
              },
            },
            include: {
              currency: true,
            },
            orderBy: { date: 'desc' },
          })
        : Promise.resolve([]),
      db.transaction.findMany({
        where: { userId: user.id },
        include: {
          category: true,
          currency: true,
        },
        orderBy: { date: 'desc' },
        take: 6,
      }),
    ]);

    const convertTransactions = async <T extends { amount: number; currencyId: number; date: Date }>(
      txs: (T & { convertedAmount?: number })[],
    ) => {
      return Promise.all(
        txs.map(async (t) => {
          const convertedAmount = await convertAmount(t.amount, t.currencyId, targetCurrencyId, t.date);
          return { ...t, convertedAmount };
        }),
      );
    };

    const [selectedWithConverted, comparisonWithConverted, latestWithConverted] = await Promise.all([
      convertTransactions(selectedTransactions),
      convertTransactions(comparisonTransactions),
      convertTransactions(latestTransactionsRaw),
    ]);

    // Calculate selected period income and expenses
    const selectedPeriodIncome = selectedWithConverted
      .filter((t) => t.type === 'income')
      .reduce((sum: number, t) => sum + t.convertedAmount, 0);
    const selectedPeriodExpenses = selectedWithConverted
      .filter((t) => t.type === 'expense')
      .reduce((sum: number, t) => sum + t.convertedAmount, 0);
    
    // Calculate comparison period income and expenses (if comparison exists)
    let comparisonIncome = 0;
    let comparisonExpenses = 0;
    
    if (comparisonRange) {
      comparisonIncome = comparisonWithConverted
        .filter((t) => t.type === 'income')
        .reduce((sum: number, t) => sum + t.convertedAmount, 0);
      comparisonExpenses = comparisonWithConverted
        .filter((t) => t.type === 'expense')
        .reduce((sum: number, t) => sum + t.convertedAmount, 0);
    }
    
    // Calculate trends (percentage change from comparison period)
    // If comparison period had no income/expenses but selected period does, show 100% increase
    // If both periods are 0, show 0% (no change)
    // Otherwise calculate percentage change
    // For "All Time", no trend calculation (trend = 0)
    const incomeTrend = comparisonRange && comparisonIncome > 0 
      ? Math.round(((selectedPeriodIncome - comparisonIncome) / comparisonIncome) * 100)
      : comparisonRange && selectedPeriodIncome > 0 
        ? 100  // New income in selected period (100% increase from 0)
        : 0;   // No comparison or no income in either period
    
    const expenseTrend = comparisonRange && comparisonExpenses > 0
      ? Math.round(((selectedPeriodExpenses - comparisonExpenses) / comparisonExpenses) * 100)
      : comparisonRange && selectedPeriodExpenses > 0 
        ? 100  // New expenses in selected period (100% increase from 0)
        : 0;   // No comparison or no expenses in either period
    
    // Get latest transactions (limit to 6) - already limited in query
    const latestTransactions: TransactionType[] = latestWithConverted.map((t) => {
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
    
    // Calculate top expense categories (selected period)
    const expenseTransactions = selectedWithConverted.filter((t) => t.type === 'expense');
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
    const totalExpenses = selectedPeriodExpenses;
    
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
    
    // Get comparison label for trend display
    const comparisonLabel = getComparisonLabel(timePeriod);

    // Investments (live)
    const investmentsPortfolio = await getInvestmentsPortfolio(user.id, userCurrencyRecord);
    
    return NextResponse.json({
      income: {
        amount: Math.round(selectedPeriodIncome),
        trend: incomeTrend,
        comparisonLabel,
      },
      expenses: {
        amount: Math.round(selectedPeriodExpenses),
        trend: expenseTrend,
        comparisonLabel,
      },
      transactions: latestTransactions,
      topExpenses,
      investments: investmentsPortfolio.portfolio,
      portfolioBalance: investmentsPortfolio.balance,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

