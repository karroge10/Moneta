import { NextResponse, NextRequest } from 'next/server';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { db } from '@/lib/db';
import { LatestExpense, ExpenseCategory, PerformanceDataPoint, TimePeriod } from '@/types/dashboard';
import { formatTransactionName } from '@/lib/transaction-utils';
import { convertTransactionsToTarget } from '@/lib/currency-conversion';

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

// Format month for grouping (e.g., "January 2025")
function formatMonth(date: Date): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Format month for performance data (e.g., "Jan 2025")
function formatMonthShort(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Format day for daily performance data (single month) - e.g. "Jan 1", "Dec 15"
function formatDayWithMonth(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

// Get icon based on category name
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
    'Housing': 'City',
    'Health': 'Gym',
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
      return {
        start: new Date(2000, 0, 1),
        end: new Date(year + 10, 11, 31, 23, 59, 59, 999),
      };
    
    default:
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0, 23, 59, 59, 999),
      };
  }
}

/**
 * Get the comparison date range for trend calculation
 */
function getComparisonDateRange(period: TimePeriod, now: Date): { start: Date; end: Date } | null {
  const year = now.getFullYear();
  const month = now.getMonth();
  
  switch (period) {
    case 'This Month':
      return {
        start: new Date(year, month - 1, 1),
        end: new Date(year, month, 0, 23, 59, 59, 999),
      };
    
    case 'Last Month':
      return {
        start: new Date(year, month - 2, 1),
        end: new Date(year, month - 1, 0, 23, 59, 59, 999),
      };
    
    case 'This Year': {
      // Compare YTD to same YTD last year (e.g. Jan 1–Jan 31 2025 vs Jan 1–Jan 31 2024)
      const lastYearSameMonthLastDay = new Date(year - 1, now.getMonth() + 1, 0).getDate();
      const day = Math.min(now.getDate(), lastYearSameMonthLastDay);
      return {
        start: new Date(year - 1, 0, 1),
        end: new Date(year - 1, now.getMonth(), day, 23, 59, 59, 999),
      };
    }

    case 'Last Year':
      return {
        start: new Date(year - 2, 0, 1),
        end: new Date(year - 2, 11, 31, 23, 59, 59, 999),
      };
    
    case 'All Time':
      return null;
    
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

// GET - Fetch expenses page data
export async function GET(request: NextRequest) {
  try {
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
    
    const { searchParams } = new URL(request.url);
    const timePeriod = (searchParams.get('timePeriod') || 'This Year') as TimePeriod;
    
    const selectedRange = getDateRangeForPeriod(timePeriod, now);
    const comparisonRange = getComparisonDateRange(timePeriod, now);
    
    // Fetch all expense transactions for the user
    const allExpenseTransactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        type: 'expense',
      },
      include: {
        category: true,
        currency: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    const transactionsWithConverted = await convertTransactionsToTarget(
      allExpenseTransactions,
      targetCurrencyId,
    );
    
    // Helper: normalize to calendar date (strip time) for consistent period bucketing across timezones
    const toDateOnly = (d: Date): Date =>
      new Date(new Date(d).getFullYear(), new Date(d).getMonth(), new Date(d).getDate());

    // Helper function to check if a date is within a range (calendar-date comparison, not timestamp)
    const isInRange = (date: Date, start: Date, end: Date): boolean => {
      const d = toDateOnly(date);
      const s = toDateOnly(start);
      const e = toDateOnly(end);
      return d >= s && d <= e;
    };
    
    // Calculate selected period expenses
    const selectedPeriodTransactions = transactionsWithConverted.filter((t) => 
      isInRange(t.date, selectedRange.start, selectedRange.end)
    );
    
    const selectedPeriodExpenses = selectedPeriodTransactions.reduce((sum: number, t) => sum + t.convertedAmount, 0);
    
    // Calculate comparison period expenses
    let comparisonExpenses = 0;
    if (comparisonRange) {
      const comparisonTransactions = transactionsWithConverted.filter((t) => 
        isInRange(t.date, comparisonRange.start, comparisonRange.end)
      );
      comparisonExpenses = comparisonTransactions.reduce((sum: number, t) => sum + t.convertedAmount, 0);
    }
    
    // Skip trend for "This Year" when only one month has passed (January) — not enough data for meaningful comparison
    const skipComparison = timePeriod === 'This Year' && now.getMonth() === 0;

    // For "All Time": growth since beginning (first month vs last month with data)
    let allTimeTrend = 0;
    let allTimeAverageTrend = 0;
    if (timePeriod === 'All Time' && selectedPeriodTransactions.length > 0) {
      const monthlyTotals = new Map<string, number>();
      selectedPeriodTransactions.forEach((t) => {
        const monthKey = formatMonthShort(t.date);
        monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) ?? 0) + t.convertedAmount);
      });
      const monthsSorted = Array.from(monthlyTotals.keys()).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      );
      if (monthsSorted.length >= 2) {
        const firstMonthKey = monthsSorted[0];
        const lastMonthKey = monthsSorted[monthsSorted.length - 1];
        const firstMonthTotal = monthlyTotals.get(firstMonthKey) ?? 0;
        const lastMonthTotal = monthlyTotals.get(lastMonthKey) ?? 0;
        allTimeTrend =
          firstMonthTotal > 0
            ? Math.round(((lastMonthTotal - firstMonthTotal) / firstMonthTotal) * 100)
            : lastMonthTotal > 0
              ? 100
              : 0;
        allTimeAverageTrend = allTimeTrend;
      }
    }

    // Calculate trend
    const expenseTrend =
      timePeriod === 'All Time'
        ? allTimeTrend
        : skipComparison
          ? 0
          : comparisonRange && comparisonExpenses > 0
            ? Math.round(((selectedPeriodExpenses - comparisonExpenses) / comparisonExpenses) * 100)
            : comparisonRange && selectedPeriodExpenses > 0
              ? 100
              : 0;
    
    // Calculate top expense categories
    const categoryTotals = new Map<string, { amount: number; categoryId: number; categoryName: string }>();
    
    selectedPeriodTransactions.forEach((t) => {
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
    
    const totalExpenses = selectedPeriodExpenses;
    
    // Format top categories with percentages and colors
    const topCategories: ExpenseCategory[] = topCategoriesArray.map((cat, index: number) => {
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
    
    // Get latest expense transactions grouped by month
    const latestExpenses: LatestExpense[] = selectedPeriodTransactions
      .slice(0, 20) // Limit to 20 most recent
      .map((t) => {
        const displayName = formatTransactionName(t.description, userLanguageAlias, false);
        const fullName = formatTransactionName(t.description, userLanguageAlias, true);
        
        return {
          id: t.id.toString(),
          name: displayName,
          fullName: fullName,
          originalDescription: t.description,
          date: formatDate(t.date),
          dateRaw: t.date.toISOString().split('T')[0],
          amount: -t.convertedAmount, // Expenses are negative
          originalAmount: -t.amount,
          originalCurrencySymbol: t.currency?.symbol,
          originalCurrencyAlias: t.currency?.alias,
          category: t.category?.name || null,
          icon: getIconForCategory(t.category?.name || null),
          month: formatMonth(t.date),
        };
      });
    
    // Calculate performance data
    // For "This Month" and "Last Month", use daily breakdown
    // For other periods, use monthly breakdown
    const isMonthlyPeriod = timePeriod === 'This Month' || timePeriod === 'Last Month';
    const performanceTotals = new Map<string, number>();
    
    if (isMonthlyPeriod) {
      // Daily breakdown for monthly periods
      selectedPeriodTransactions.forEach((t) => {
        const dayKey = formatDayWithMonth(t.date);
        if (!performanceTotals.has(dayKey)) {
          performanceTotals.set(dayKey, 0);
        }
        performanceTotals.set(dayKey, performanceTotals.get(dayKey)! + t.convertedAmount);
      });
    } else {
      // Monthly breakdown for longer periods
      selectedPeriodTransactions.forEach((t) => {
        const monthKey = formatMonthShort(t.date);
        if (!performanceTotals.has(monthKey)) {
          performanceTotals.set(monthKey, 0);
        }
        performanceTotals.set(monthKey, performanceTotals.get(monthKey)! + t.convertedAmount);
      });
    }
    
    // Sort chronologically
    const performanceData: PerformanceDataPoint[] = Array.from(performanceTotals.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => {
        // Parse date string to compare
        if (isMonthlyPeriod) {
          // For daily-with-month: "Jan 1", "Dec 15" - extract day from "Mon D" or "Mon DD"
          const dayA = parseInt(a.date.split(' ')[1] || '1') || 1;
          const dayB = parseInt(b.date.split(' ')[1] || '1') || 1;
          return dayA - dayB;
        } else {
          // For monthly: "Jan 2025" -> parse to date object
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
      });
    
    // Average card: always compare current year vs previous year (average monthly across all months)
    const currentYear = now.getFullYear();
    const currentYearStart = new Date(currentYear, 0, 1);
    const currentYearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);
    const lastYearStart = new Date(currentYear - 1, 0, 1);
    const lastYearEnd = new Date(currentYear - 1, 11, 31, 23, 59, 59, 999);
    const totalCurrentYear = transactionsWithConverted
      .filter((t) => isInRange(t.date, currentYearStart, currentYearEnd))
      .reduce((sum, t) => sum + t.convertedAmount, 0);
    const totalLastYear = transactionsWithConverted
      .filter((t) => isInRange(t.date, lastYearStart, lastYearEnd))
      .reduce((sum, t) => sum + t.convertedAmount, 0);
    // Use months elapsed this year (1–12) so YTD isn't penalized (e.g. Jan only → divide by 1, not 12)
    const monthsElapsedThisYear = Math.max(1, now.getMonth() + 1);
    const avgMonthlyCurrentYear = totalCurrentYear / monthsElapsedThisYear;
    const avgMonthlyLastYear = totalLastYear / 12;
    const averageTrend =
      avgMonthlyLastYear > 0
        ? Math.round(((avgMonthlyCurrentYear - avgMonthlyLastYear) / avgMonthlyLastYear) * 100)
        : avgMonthlyCurrentYear > 0
          ? 100
          : 0;


    // Calculate average monthly expenses (or average daily for single month periods)
    let averageMonthlyExpenses = 0;
    let averageDailyExpenses = 0;
    
    if (isMonthlyPeriod) {
      const daysInPeriod = Math.ceil((selectedRange.end.getTime() - selectedRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      averageDailyExpenses = totalExpenses / daysInPeriod;
      averageMonthlyExpenses = totalExpenses;
    } else {
      const numberOfMonths = performanceData.length || 1;
      averageMonthlyExpenses = totalExpenses / numberOfMonths;
    }
    
    const comparisonLabel = getComparisonLabel(timePeriod);
    
    // Generate trend text for performance
    // For expenses: negative trend is good (spending less), positive is bad (spending more)
    // No comparison when skipped; All Time uses growth since beginning
    const noComparison = skipComparison || (timePeriod !== 'All Time' && !comparisonRange);
    const periodSuffix = timePeriod === 'All Time' ? 'since beginning' : 'over selected time period';
    const trendText = noComparison
      ? 'Not enough data to compare yet'
      : expenseTrend > 0
        ? `Your expenses grew +${expenseTrend}% ${periodSuffix}`
        : expenseTrend < 0
          ? `Your expenses decreased ${Math.abs(expenseTrend)}% ${periodSuffix}`
          : `Your expenses remained stable ${periodSuffix}`;
    
    // Calculate next month prediction (only for "This Month")
    let nextMonthPrediction = 0;
    if (timePeriod === 'This Month') {
      const currentDay = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysElapsed = currentDay;
      
      if (daysElapsed > 0 && selectedPeriodExpenses > 0) {
        // Calculate average daily spending so far
        const averageDailySpending = selectedPeriodExpenses / daysElapsed;
        // Project for full month
        nextMonthPrediction = averageDailySpending * daysInMonth;
      } else {
        // If no data yet, use last month's average if available
        if (comparisonRange) {
          const comparisonTransactions = transactionsWithConverted.filter((t) => 
            isInRange(t.date, comparisonRange.start, comparisonRange.end)
          );
          const comparisonTotal = comparisonTransactions.reduce((sum: number, t) => sum + t.convertedAmount, 0);
          nextMonthPrediction = comparisonTotal; // Use last month's total as prediction
        }
      }
    }
    
    return NextResponse.json({
      total: {
        amount: Math.round(selectedPeriodExpenses),
        trend: expenseTrend,
      },
      topCategories,
      latestExpenses,
      performance: {
        trend: expenseTrend,
        trendText,
        data: performanceData,
      },
      averageMonthly: {
        amount: Math.round(averageMonthlyExpenses),
        trend: averageTrend,
      },
      averageDaily: isMonthlyPeriod ? {
        amount: Math.round(averageDailyExpenses),
        trend: averageTrend,
      } : null,
      nextMonthPrediction: timePeriod === 'This Month' ? Math.round(nextMonthPrediction) : null,
    });
  } catch (error) {
    console.error('Error fetching expenses data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses data' },
      { status: 500 }
    );
  }
}

