import { NextResponse, NextRequest } from 'next/server';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { db } from '@/lib/db';
import { Transaction as TransactionType, ExpenseCategory, TimePeriod } from '@/types/dashboard';
import { formatTransactionName } from '@/lib/transaction-utils';
import { preloadRatesMap, convertTransactionsWithRatesMap } from '@/lib/currency-conversion';
import { getFinancialHealthScore, FINANCIAL_HEALTH_TIME_PERIOD } from '@/lib/financial-health';
import { getInvestmentsPortfolio } from '@/lib/investments';
import { computeRoundupInsight } from '@/lib/roundup-insight';
import { calculateGoalProgress } from '@/lib/goalUtils';
import {
  processDueRecurringItems,
  getExpenseRecurringItemsSerialized,
} from '@/lib/recurring-core';

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
function buildServerTimingHeader(durationsMs: Record<string, number>): string {
  return Object.entries(durationsMs)
    .map(([name, dur]) => `${encodeURIComponent(name.replace(/\s+/g, '-'))};dur=${Math.max(0, Math.round(dur))}`)
    .join(', ');
}

export async function GET(request: NextRequest) {
  const tReq = performance.now();
  const dur: Record<string, number> = {};
  const mark = (label: string, start: number) => {
    dur[label] = performance.now() - start;
    return performance.now();
  };

  const { searchParams } = new URL(request.url);
  const emitTiming =
    searchParams.get('timing') === '1' || process.env.DASHBOARD_TIMING === '1';

  try {
    let t = performance.now();
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

    const timePeriod = (searchParams.get('timePeriod') || 'This Month') as TimePeriod;

    const selectedRange = getDateRangeForPeriod(timePeriod, now);
    const comparisonRange = getComparisonDateRange(timePeriod, now);

    t = mark('auth-and-currency', t);

    t = mark('auth-and-currency', t);

    // Portfolio + financial health + recurring processing + main batch items. Run in parallel.
    const [_, batch, financialHealth, investmentsPortfolio] = await Promise.all([
      processDueRecurringItems(user.id, now),

      (async () => {
        const [selectedTransactions, comparisonTransactions, latestTransactionsRaw, goalsRaw, recurringItems] =
          await Promise.all([
            db.transaction.findMany({
              where: {
                userId: user.id,
                date: {
                  gte: selectedRange.start,
                  lte: selectedRange.end,
                },
                investmentAssetId: null,
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
                    investmentAssetId: null,
                  },
                  include: {
                    currency: true,
                  },
                  orderBy: { date: 'desc' },
                })
              : Promise.resolve([]),
            db.transaction.findMany({
              where: { userId: user.id, investmentAssetId: null },
              include: {
                category: true,
                currency: true,
              },
              orderBy: { date: 'desc' },
              take: 6,
            }),
            db.goal.findMany({
              where: { userId: user.id },
              orderBy: { createdAt: 'desc' },
            }),
            getExpenseRecurringItemsSerialized(user.id, targetCurrencyId),
          ]);

        const allTxsForPreload = [...selectedTransactions, ...(comparisonTransactions || []), ...latestTransactionsRaw];
        const ratesMap = await preloadRatesMap(
          allTxsForPreload.map(t => ({ currencyId: t.currencyId, date: t.date })),
          targetCurrencyId
        );

        const selectedWithConverted = convertTransactionsWithRatesMap(selectedTransactions, targetCurrencyId, ratesMap);
        const comparisonWithConverted = convertTransactionsWithRatesMap(comparisonTransactions || [], targetCurrencyId, ratesMap);
        const latestWithConverted = convertTransactionsWithRatesMap(latestTransactionsRaw, targetCurrencyId, ratesMap);

        return {
          goalsRaw,
          recurringItems,
          selectedWithConverted,
          comparisonWithConverted,
          latestWithConverted,
        };
      })(),
      getFinancialHealthScore(user.id, FINANCIAL_HEALTH_TIME_PERIOD, targetCurrencyId),
      getInvestmentsPortfolio(user.id, userCurrencyRecord),
    ]);

    const tAfterParallel = performance.now();
    dur['parallel-batch-health-investments'] = tAfterParallel - t;
    t = tAfterParallel;

    const {
      goalsRaw,
      recurringItems,
      selectedWithConverted,
      comparisonWithConverted,
      latestWithConverted,
    } = batch;

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
        color: t.category?.color || '#AC66DA',
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

    const comparisonLabel = getComparisonLabel(timePeriod);

    dur['map-trends-top-latest'] = performance.now() - t;

    const tRoundup = performance.now();
    const roundupInsight = await computeRoundupInsight(selectedPeriodExpenses, investmentsPortfolio.assets);
    dur['roundup-insight'] = performance.now() - tRoundup;

    const goalsPayload = goalsRaw.map((goal) => ({
      id: goal.id.toString(),
      name: goal.name,
      targetDate: formatDate(goal.targetDate),
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      progress: calculateGoalProgress(goal.currentAmount, goal.targetAmount),
      currencyId: goal.currencyId ?? undefined,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    }));

    const body = {
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
      investments: investmentsPortfolio.assets.map((a) => ({
        id: a.assetId.toString(),
        name: a.name,
        subtitle: a.ticker,
        ticker: a.ticker,
        assetType: a.type,
        sourceType: a.pricingMode,
        quantity: a.quantity,
        currentValue: a.currentValue,
        currentPrice: a.currentPrice,
        gainLoss: a.pnl,
        changePercent: a.unrealizedPnlPercent,
        icon: a.icon || (a.type === 'crypto' ? 'BitcoinCircle' : 'Reports'),
        priceHistory: [],
      })),
      portfolioBalance: investmentsPortfolio.totalValue,
      financialHealth: {
        score: financialHealth.score,
        trend: financialHealth.trend,
        details: financialHealth.details,
      },
      roundupInsight,
      goals: goalsPayload,
      recurringItems,
    };

    dur['total'] = performance.now() - tReq;

    if (emitTiming) {
      console.info('[api/dashboard] timing (ms)', dur);
    }

    const res = NextResponse.json(body);
    if (emitTiming) {
      res.headers.set('Server-Timing', buildServerTimingHeader(dur));
    }
    return res;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

