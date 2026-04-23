import { NextResponse, NextRequest } from 'next/server';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { db } from '@/lib/db';
import { LatestIncome, IncomeSource, PerformanceDataPoint, TimePeriod } from '@/types/dashboard';
import { formatTransactionName } from '@/lib/transaction-utils';
import { preloadRatesMap, convertTransactionsWithRatesMap } from '@/lib/currency-conversion';
import { normalizeMerchantName } from '@/lib/merchant';

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


function getIconForCategory(categoryName: string | null, merchantName?: string): string {
  if (categoryName) {
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
      'Salary': 'Suitcase',
      'Freelance': 'Globe',
      'Investment': 'BitcoinCircle',
      'Gift': 'Gift',
    };

    return iconMap[categoryName] || 'HelpCircle';
  }

  return 'HelpCircle';
}


const incomeSourceColors = ['#AC66DA', '#74C648', '#D93F3F'];


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
    
    const [allIncomeTransactions, userCurrency] = await Promise.all([
      db.transaction.findMany({
        where: {
          userId: user.id,
          type: 'income',
          investmentAssetId: null,
          date: { gte: minRequiredDate }
        },
        include: { category: true, currency: true },
        orderBy: { date: 'desc' },
      }),
      user.currencyId
        ? db.currency.findUnique({ where: { id: user.currencyId } })
        : db.currency.findFirst(),
    ]);

    if (!userCurrency) {
      return NextResponse.json({ error: 'No currency configured.' }, { status: 500 });
    }

    const ratesMap = await preloadRatesMap(
      allIncomeTransactions.map(t => ({ currencyId: t.currencyId, date: t.date })),
      targetCurrencyId
    );


    const transactionsWithConverted = convertTransactionsWithRatesMap(
      allIncomeTransactions,
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

    const selectedPeriodIncome = selectedPeriodTransactions.reduce((sum: number, t) => sum + t.convertedAmount, 0);

    
    let comparisonIncome = 0;
    if (comparisonRange) {
      const comparisonTransactions = transactionsWithConverted.filter((t) =>
        isInRange(t.date, comparisonRange.start, comparisonRange.end)
      );
      comparisonIncome = comparisonTransactions.reduce((sum: number, t) => sum + t.convertedAmount, 0);
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

    
    const incomeTrend =
      timePeriod === 'All Time'
        ? allTimeTrend
        : skipComparison
          ? 0
          : comparisonRange && comparisonIncome > 0
            ? Math.round(((selectedPeriodIncome - comparisonIncome) / comparisonIncome) * 100)
            : 0;

    const trendSkipped = skipComparison || (timePeriod !== 'All Time' && (!comparisonRange || comparisonIncome === 0));

    
    const sourceTotals = new Map<string, { amount: number; categoryName: string | null; merchantName: string }>();

    selectedPeriodTransactions.forEach((t) => {
      const merchantName = normalizeMerchantName(t.description);
      const categoryName = t.category?.name || null;
      const sourceKey = categoryName || merchantName;

      if (!sourceTotals.has(sourceKey)) {
        sourceTotals.set(sourceKey, {
          amount: 0,
          categoryName,
          merchantName,
        });
      }

      const existing = sourceTotals.get(sourceKey)!;
      existing.amount += t.convertedAmount;
    });

    
    const topSourcesArray = Array.from(sourceTotals.entries())
      .map(([name, data]) => ({
        name: data.categoryName || data.merchantName,
        amount: data.amount,
        categoryName: data.categoryName,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3); 

    const totalIncome = selectedPeriodIncome;

    
    const topSources: IncomeSource[] = topSourcesArray.map((source, index: number) => {
      const percentage = totalIncome > 0
        ? Math.round((source.amount / totalIncome) * 100)
        : 0;

      return {
        id: source.categoryName || `source-${index}`,
        name: source.name,
        amount: source.amount,
        percentage,
        icon: getIconForCategory(source.categoryName, source.name),
        color: incomeSourceColors[index % incomeSourceColors.length],
      };
    });

    
    const latestIncomes: LatestIncome[] = selectedPeriodTransactions
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
          amount: t.convertedAmount,
          originalAmount: t.amount,
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


    
    let averageMonthlyIncome = 0;
    let averageDailyIncome = 0;

    if (isMonthlyPeriod) {
      
      const daysInPeriod = Math.ceil((selectedRange.end.getTime() - selectedRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      averageDailyIncome = totalIncome / daysInPeriod;
      averageMonthlyIncome = totalIncome;
    } else {
      
      const numberOfMonths = performanceData.length || 1;
      averageMonthlyIncome = totalIncome / numberOfMonths;
    }

    const comparisonLabel = getComparisonLabel(timePeriod);

    
    const firstPerfValue = performanceData.length > 0 ? performanceData[0].value : 0;
    const lastPerfValue = performanceData.length > 0 ? performanceData[performanceData.length - 1].value : 0;
    const internalTrend = firstPerfValue > 0 
      ? Math.round(((lastPerfValue - firstPerfValue) / firstPerfValue) * 100) 
      : (lastPerfValue > 0 ? 100 : 0);

    
    const performanceTrendText = performanceData.length < 2
      ? 'Not enough data to show trends'
      : internalTrend > 0
        ? `Your income grew +${internalTrend}% ${timePeriod.toLowerCase()}`
        : internalTrend < 0
          ? `Your income decreased ${Math.abs(internalTrend)}% ${timePeriod.toLowerCase()}`
          : `Your income remained stable ${timePeriod.toLowerCase()}`;

    
    let demographicPercentage = 0;
    let demographicMessage = '';
    const demographicComparisonsDisabled = user.dataSharingEnabled !== true;

    if (demographicComparisonsDisabled) {
      demographicMessage = 'Enable data sharing in Settings to see how you compare to others.';
      demographicPercentage = 0;
    } else {
      const REGIONAL_AVERAGE_INCOME = 4500;
      if (averageMonthlyIncome > 0) {
        if (averageMonthlyIncome > REGIONAL_AVERAGE_INCOME) {
          demographicPercentage = Math.round(((averageMonthlyIncome - REGIONAL_AVERAGE_INCOME) / REGIONAL_AVERAGE_INCOME) * 100);
          demographicMessage = `Your average income is ${demographicPercentage}% higher than of users in your region. Great job!`;
        } else {
          demographicPercentage = Math.round(((REGIONAL_AVERAGE_INCOME - averageMonthlyIncome) / REGIONAL_AVERAGE_INCOME) * 100);
          demographicMessage = `Your average income is ${demographicPercentage}% lower than of users in your region.`;
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

      if (daysElapsed > 0 && selectedPeriodIncome > 0) {
        
        const averageDailyIncomeSoFar = selectedPeriodIncome / daysElapsed;
        
        nextMonthPrediction = averageDailyIncomeSoFar * daysInMonth;
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
        amount: Math.round(selectedPeriodIncome),
        trend: incomeTrend,
        trendSkipped: trendSkipped,
      },
      topSources,
      latestIncomes,
      performance: {
        trend: internalTrend,
        trendText: performanceTrendText,
        data: performanceData,
      },
      average: {
        amount: Math.round(averageMonthlyIncome),
        trend: averageTrend,
        trendSkipped: averageTrendSkipped,
        subtitle: 'Monthly average based on selected time period',
      },
      averageDaily: isMonthlyPeriod ? {
        amount: Math.round(averageDailyIncome),
        trend: averageTrend,
      } : null,
      nextMonthPrediction: timePeriod === 'This Month' ? Math.round(nextMonthPrediction) : null,
      demographicComparison: {
        message: demographicMessage,
        percentage: demographicPercentage,
        percentageLabel: demographicPercentage > 0 ? `${demographicPercentage}%` : '',
        link: demographicComparisonsDisabled ? 'Settings' : 'Statistics',
      },
      demographicComparisonsDisabled,
    });
  } catch (error) {
    console.error('Error fetching income data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch income data' },
      { status: 500 }
    );
  }
}

