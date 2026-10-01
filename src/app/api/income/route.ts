import { NextResponse, NextRequest } from 'next/server';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { errorResponse } from '@/lib/api-errors';
import { db } from '@/lib/db';
import { moneyToNumber } from '@/lib/money';
import { LatestIncome, IncomeSource, TimePeriod } from '@/types/dashboard';
import { formatDisplayDate, formatTransactionName } from '@/lib/transaction-utils';
import { preloadRates, convertTransactionsWithRatesMap } from '@/lib/currency-conversion';
import { toDateKey } from '@/lib/dates';
import { formatMonthLong, sumByKey, summarizeFlow } from '@/lib/flow-periods';
import { normalizeMerchantName } from '@/lib/merchant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const incomeSourceColors = ['#AC66DA', '#74C648', '#D93F3F'];

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

    const minRequiredDate = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));

    const allIncomeTransactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        type: 'income',
        investmentAssetId: null,
        date: { gte: minRequiredDate }
      },
      include: { category: true, currency: true },
      orderBy: { date: 'desc' },
    });

    const rateRequests = allIncomeTransactions.map((t) => ({ currencyId: t.currencyId, date: t.date }));
    const ratesMap = await preloadRates(rateRequests, targetCurrencyId);
    const transactionsWithConverted = convertTransactionsWithRatesMap(
      allIncomeTransactions,
      targetCurrencyId,
      ratesMap
    );

    const summary = summarizeFlow(transactionsWithConverted, timePeriod, now);
    const selectedPeriodTransactions = summary.selected;
    const totalIncome = summary.total;

    // A source is the category when there is one, otherwise the normalized merchant name.
    const sourceTotals = sumByKey(selectedPeriodTransactions, sourceKeyOf);
    const sourceCategories = new Map<string, string | null>();
    for (const t of selectedPeriodTransactions) {
      const key = sourceKeyOf(t);
      if (!sourceCategories.has(key)) sourceCategories.set(key, t.category?.name || null);
    }

    const topSourcesArray = Array.from(sourceTotals.entries())
      .sort(([, a], [, b]) => b.comparedTo(a))
      .slice(0, 3);

    const topSources: IncomeSource[] = topSourcesArray.map(([name, total], index: number) => {
      const amount = moneyToNumber(total);
      const percentage = totalIncome > 0
        ? Math.round((amount / totalIncome) * 100)
        : 0;
      const categoryName = sourceCategories.get(name) ?? null;

      return {
        id: categoryName || `source-${index}`,
        name,
        amount,
        percentage,
        icon: getIconForCategory(categoryName),
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
          date: formatDisplayDate(t.date),
          dateRaw: toDateKey(t.date),
          amount: t.convertedAmount,
          rateMissing: t.rateMissing,
          originalAmount: moneyToNumber(t.amount),
          originalCurrencySymbol: t.currency?.symbol,
          originalCurrencyAlias: t.currency?.alias,
          category: t.category?.name || null,
          icon: getIconForCategory(t.category?.name || null),
          month: formatMonthLong(t.date),
        };
      });

    const internalTrend = summary.performanceTrend;
    const performanceTrendText = summary.performance.length < 2
      ? 'Not enough data to show trends'
      : internalTrend > 0
        ? `Your income grew +${internalTrend}% ${timePeriod.toLowerCase()}`
        : internalTrend < 0
          ? `Your income decreased ${Math.abs(internalTrend)}% ${timePeriod.toLowerCase()}`
          : `Your income remained stable ${timePeriod.toLowerCase()}`;

    const demographicComparisonsDisabled = user.dataSharingEnabled !== true;

    return NextResponse.json({
      total: {
        amount: Math.round(totalIncome),
        trend: summary.trend,
        trendSkipped: summary.trendSkipped,
      },
      topSources,
      latestIncomes,
      performance: {
        trend: internalTrend,
        trendText: performanceTrendText,
        data: summary.performance,
      },
      average: {
        amount: Math.round(summary.averageMonthly),
        trend: summary.averageTrend,
        trendSkipped: summary.averageTrendSkipped,
        subtitle: 'Monthly average based on selected time period',
      },
      averageDaily: summary.isMonthlyPeriod ? {
        amount: Math.round(summary.averageDaily),
        trend: summary.averageTrend,
      } : null,
      nextMonthPrediction: timePeriod === 'This Month' ? Math.round(summary.nextMonthPrediction) : null,
      // Peer comparisons live on the Statistics page, which uses real anonymized cohorts.
      demographicComparison: {
        message: demographicComparisonsDisabled
          ? 'Enable data sharing in Settings to see how you compare to others.'
          : 'See how you compare to people like you on the Statistics page.',
        percentage: 0,
        percentageLabel: '',
        link: demographicComparisonsDisabled ? 'Settings' : 'Statistics',
      },
      demographicComparisonsDisabled,
      missingRates: summary.missingRates,
    });
  } catch (error) {
    return errorResponse(error, 'Error fetching income data', 'Failed to fetch income data');
  }
}

function sourceKeyOf(t: { description: string; category: { name: string } | null }): string {
  return t.category?.name || normalizeMerchantName(t.description);
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
    'Salary': 'Suitcase',
    'Freelance': 'Globe',
    'Investment': 'BitcoinCircle',
    'Gift': 'Gift',
  };

  return iconMap[categoryName] || 'HelpCircle';
}
