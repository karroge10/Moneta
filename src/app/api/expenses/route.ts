import { NextResponse, NextRequest } from 'next/server';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { db } from '@/lib/db';
import { LatestExpense, ExpenseCategory, PerformanceDataPoint, TimePeriod } from '@/types/dashboard';
import { formatTransactionName } from '@/lib/transaction-utils';
import { preloadRatesMap, convertTransactionsWithRatesMap } from '@/lib/currency-conversion';
import { getInvestmentsPortfolio } from '@/lib/investments';
import { computeRoundupInsight } from '@/lib/roundup-insight';

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


function formatMonth(date: Date): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}


function formatMonthShort(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}


function formatDayWithMonth(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
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
    'Housing': 'City',
    'Health': 'Gym',
  };

  return iconMap[categoryName] || 'HelpCircle';
}


const categoryColors = ['#AC66DA', '#74C648', '#D93F3F'];


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

    
    const minRequiredDate = new Date(now.getFullYear() - 1, 0, 1); 
    
    const [allExpenseTransactions, userCurrency, portfolioSummary] = await Promise.all([
      db.transaction.findMany({
        where: {
          userId: user.id,
          type: 'expense',
          investmentAssetId: null,
          date: { gte: minRequiredDate }
        },
        include: { category: true, currency: true },
        orderBy: { date: 'desc' },
      }),
      user.currencyId
        ? db.currency.findUnique({ where: { id: user.currencyId } })
        : db.currency.findFirst(),
      getInvestmentsPortfolio(user.id, userCurrencyRecord),
    ]);

    if (!userCurrency) {
      return NextResponse.json({ error: 'No currency configured.' }, { status: 500 });
    }

    const ratesMap = await preloadRatesMap(
      allExpenseTransactions.map(t => ({ currencyId: t.currencyId, date: t.date })),
      targetCurrencyId
    );


    const transactionsWithConverted = convertTransactionsWithRatesMap(
      allExpenseTransactions,
      targetCurrencyId,
      ratesMap
    );

    
    const toDateOnly = (d: Date): Date =>
      new Date(new Date(d).getFullYear(), new Date(d).getMonth(), new Date(d).getDate());

    
    const isInRange = (date: Date, start: Date, end: Date): boolean => {
      const d = toDateOnly(date);
      const s = toDateOnly(start);
      const e = toDateOnly(end);
      return d >= s && d <= e;
    };

    
    const selectedPeriodTransactions = transactionsWithConverted.filter((t) =>
      isInRange(t.date, selectedRange.start, selectedRange.end)
    );

    const selectedPeriodExpenses = selectedPeriodTransactions.reduce((sum: number, t) => sum + t.convertedAmount, 0);

    
    let comparisonExpenses = 0;
    if (comparisonRange) {
      const comparisonTransactions = transactionsWithConverted.filter((t) =>
        isInRange(t.date, comparisonRange.start, comparisonRange.end)
      );
      comparisonExpenses = comparisonTransactions.reduce((sum: number, t) => sum + t.convertedAmount, 0);
    }

    
    const skipComparison = timePeriod === 'This Year' && now.getMonth() === 0;

    
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

    
    const expenseTrend =
      timePeriod === 'All Time'
        ? allTimeTrend
        : skipComparison
          ? 0
          : comparisonRange && comparisonExpenses > 0
            ? Math.round(((selectedPeriodExpenses - comparisonExpenses) / comparisonExpenses) * 100)
            : 0;

    const trendSkipped = skipComparison || (timePeriod !== 'All Time' && (!comparisonRange || comparisonExpenses === 0));

    
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

    
    const topCategoriesArray = Array.from(categoryTotals.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3); 

    const totalExpenses = selectedPeriodExpenses;

    
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

    
    const latestExpenses: LatestExpense[] = selectedPeriodTransactions
      .slice(0, 20) 
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
          amount: -t.convertedAmount, 
          originalAmount: -t.amount,
          originalCurrencySymbol: t.currency?.symbol,
          originalCurrencyAlias: t.currency?.alias,
          category: t.category?.name || null,
          icon: getIconForCategory(t.category?.name || null),
          month: formatMonth(t.date),
        };
      });

    
    
    
    const isMonthlyPeriod = timePeriod === 'This Month' || timePeriod === 'Last Month';
    const performanceTotals = new Map<string, number>();

    if (isMonthlyPeriod) {
      
      selectedPeriodTransactions.forEach((t) => {
        const dayKey = formatDayWithMonth(t.date);
        if (!performanceTotals.has(dayKey)) {
          performanceTotals.set(dayKey, 0);
        }
        performanceTotals.set(dayKey, performanceTotals.get(dayKey)! + t.convertedAmount);
      });
    } else {
      
      selectedPeriodTransactions.forEach((t) => {
        const monthKey = formatMonthShort(t.date);
        if (!performanceTotals.has(monthKey)) {
          performanceTotals.set(monthKey, 0);
        }
        performanceTotals.set(monthKey, performanceTotals.get(monthKey)! + t.convertedAmount);
      });
    }

    
    const performanceData: PerformanceDataPoint[] = Array.from(performanceTotals.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => {
        
        if (isMonthlyPeriod) {
          
          const dayA = parseInt(a.date.split(' ')[1] || '1') || 1;
          const dayB = parseInt(b.date.split(' ')[1] || '1') || 1;
          return dayA - dayB;
        } else {
          
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
      });

    
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
    
    const monthsElapsedThisYear = Math.max(1, now.getMonth() + 1);
    const avgMonthlyCurrentYear = totalCurrentYear / monthsElapsedThisYear;
    const avgMonthlyLastYear = totalLastYear / 12;
    const averageTrend =
      avgMonthlyLastYear > 0
        ? Math.round(((avgMonthlyCurrentYear - avgMonthlyLastYear) / avgMonthlyLastYear) * 100)
        : 0;

    const averageTrendSkipped = avgMonthlyLastYear === 0;


    
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

    const roundupInsight = await computeRoundupInsight(selectedPeriodExpenses, portfolioSummary.assets);

    
    const firstPerfValue = performanceData.length > 0 ? performanceData[0].value : 0;
    const lastPerfValue = performanceData.length > 0 ? performanceData[performanceData.length - 1].value : 0;
    const internalTrend = firstPerfValue > 0 
      ? Math.round(((lastPerfValue - firstPerfValue) / firstPerfValue) * 100) 
      : (lastPerfValue > 0 ? 100 : 0);

    
    const performanceTrendText = performanceData.length < 2
      ? 'Not enough data to show trends'
      : internalTrend > 0
        ? `Your expenses grew +${internalTrend}% ${timePeriod.toLowerCase()}`
        : internalTrend < 0
          ? `Your expenses decreased ${Math.abs(internalTrend)}% ${timePeriod.toLowerCase()}`
          : `Your expenses remained stable ${timePeriod.toLowerCase()}`;

    
    let demographicPercentage = 0;
    let demographicMessage = '';
    const demographicComparisonsDisabled = user.dataSharingEnabled !== true;

    if (demographicComparisonsDisabled) {
      demographicMessage = 'Enable data sharing in Settings to see how you compare to others.';
      demographicPercentage = 0;
    } else {
      const REGIONAL_AVERAGE_EXPENSES = 3500;
      if (averageMonthlyExpenses > 0) {
        if (averageMonthlyExpenses < REGIONAL_AVERAGE_EXPENSES) {
          demographicPercentage = Math.round(((REGIONAL_AVERAGE_EXPENSES - averageMonthlyExpenses) / REGIONAL_AVERAGE_EXPENSES) * 100);
          demographicMessage = `Your average expenses are ${demographicPercentage}% lower than of users in your region. Great job!`;
        } else {
          demographicPercentage = Math.round(((averageMonthlyExpenses - REGIONAL_AVERAGE_EXPENSES) / REGIONAL_AVERAGE_EXPENSES) * 100);
          demographicMessage = `Your average expenses are ${demographicPercentage}% higher than of users in your region.`;
        }
      } else {
        demographicMessage = `Add more transactions to see how you compare to others.`;
        demographicPercentage = 0;
      }
    }

    
    let nextMonthPrediction = 0;
    if (timePeriod === 'This Month') {
      const currentDay = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysElapsed = currentDay;

      if (daysElapsed > 0 && selectedPeriodExpenses > 0) {
        
        const averageDailySpending = selectedPeriodExpenses / daysElapsed;
        
        nextMonthPrediction = averageDailySpending * daysInMonth;
      } else {
        
        if (comparisonRange) {
          const comparisonTransactions = transactionsWithConverted.filter((t) =>
            isInRange(t.date, comparisonRange.start, comparisonRange.end)
          );
          const comparisonTotal = comparisonTransactions.reduce((sum: number, t) => sum + t.convertedAmount, 0);
          nextMonthPrediction = comparisonTotal; 
        }
      }
    }

    return NextResponse.json({
      total: {
        amount: Math.round(selectedPeriodExpenses),
        trend: expenseTrend,
        trendSkipped: trendSkipped,
      },
      topCategories,
      latestExpenses,
      performance: {
        trend: internalTrend,
        trendText: performanceTrendText,
        data: performanceData,
      },
      averageMonthly: {
        amount: Math.round(averageMonthlyExpenses),
        trend: averageTrend,
        trendSkipped: averageTrendSkipped,
      },
      averageDaily: isMonthlyPeriod ? {
        amount: Math.round(averageDailyExpenses),
        trend: averageTrend,
      } : null,
      nextMonthPrediction: timePeriod === 'This Month' ? Math.round(nextMonthPrediction) : null,
      roundupInsight,
      demographicComparison: {
        message: demographicMessage,
        percentage: demographicPercentage,
        percentageLabel: demographicPercentage > 0 ? `${demographicPercentage}%` : '',
        link: demographicComparisonsDisabled ? 'Settings' : 'Statistics',
      },
      demographicComparisonsDisabled,
    });
  } catch (error) {
    console.error('Error fetching expenses data:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch expenses data';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

