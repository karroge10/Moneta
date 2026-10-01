import { NextResponse, NextRequest } from 'next/server';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { errorResponse } from '@/lib/api-errors';
import { db } from '@/lib/db';
import { moneyToNumber } from '@/lib/money';
import { LatestExpense, ExpenseCategory, TimePeriod } from '@/types/dashboard';
import { formatDisplayDate, formatTransactionName } from '@/lib/transaction-utils';
import { preloadRates, convertTransactionsWithRatesMap } from '@/lib/currency-conversion';
import { toDateKey } from '@/lib/dates';
import { formatMonthLong, sumByKey, summarizeFlow } from '@/lib/flow-periods';
import { getInvestmentsPortfolio } from '@/lib/investments';
import { computeRoundupInsight } from '@/lib/roundup-insight';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const categoryColors = ['#AC66DA', '#74C648', '#D93F3F'];

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

    const [allExpenseTransactions, portfolioSummary] = await Promise.all([
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
      getInvestmentsPortfolio(user.id, userCurrencyRecord),
    ]);

    const rateRequests = allExpenseTransactions.map((t) => ({ currencyId: t.currencyId, date: t.date }));
    const ratesMap = await preloadRates(rateRequests, targetCurrencyId);
    const transactionsWithConverted = convertTransactionsWithRatesMap(
      allExpenseTransactions,
      targetCurrencyId,
      ratesMap
    );

    const summary = summarizeFlow(transactionsWithConverted, timePeriod, now);
    const selectedPeriodTransactions = summary.selected;
    const totalExpenses = summary.total;

    const categoryTotals = sumByKey(selectedPeriodTransactions, (t) => t.category?.name || 'Uncategorized');
    const categoryIds = new Map<string, number>();
    for (const t of selectedPeriodTransactions) {
      const categoryName = t.category?.name || 'Uncategorized';
      if (!categoryIds.has(categoryName)) categoryIds.set(categoryName, t.categoryId || 0);
    }

    const topCategoriesArray = Array.from(categoryTotals.entries())
      .sort(([, a], [, b]) => b.comparedTo(a))
      .slice(0, 3);

    const topCategories: ExpenseCategory[] = topCategoriesArray.map(([categoryName, total], index: number) => {
      const amount = moneyToNumber(total);
      const percentage = totalExpenses > 0
        ? Math.round((amount / totalExpenses) * 100)
        : 0;
      const categoryId = categoryIds.get(categoryName) ?? 0;

      return {
        id: categoryId.toString() || `uncategorized-${index}`,
        name: categoryName,
        amount,
        percentage,
        icon: getIconForCategory(categoryName),
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
          date: formatDisplayDate(t.date),
          dateRaw: toDateKey(t.date),
          amount: -t.convertedAmount,
          rateMissing: t.rateMissing,
          originalAmount: -moneyToNumber(t.amount),
          originalCurrencySymbol: t.currency?.symbol,
          originalCurrencyAlias: t.currency?.alias,
          category: t.category?.name || null,
          icon: getIconForCategory(t.category?.name || null),
          month: formatMonthLong(t.date),
        };
      });

    const roundupInsight = await computeRoundupInsight(totalExpenses, portfolioSummary.assets);

    const internalTrend = summary.performanceTrend;
    const performanceTrendText = summary.performance.length < 2
      ? 'Not enough data to show trends'
      : internalTrend > 0
        ? `Your expenses grew +${internalTrend}% ${timePeriod.toLowerCase()}`
        : internalTrend < 0
          ? `Your expenses decreased ${Math.abs(internalTrend)}% ${timePeriod.toLowerCase()}`
          : `Your expenses remained stable ${timePeriod.toLowerCase()}`;

    const demographicComparisonsDisabled = user.dataSharingEnabled !== true;

    return NextResponse.json({
      total: {
        amount: Math.round(totalExpenses),
        trend: summary.trend,
        trendSkipped: summary.trendSkipped,
      },
      topCategories,
      latestExpenses,
      performance: {
        trend: internalTrend,
        trendText: performanceTrendText,
        data: summary.performance,
      },
      averageMonthly: {
        amount: Math.round(summary.averageMonthly),
        trend: summary.averageTrend,
        trendSkipped: summary.averageTrendSkipped,
      },
      averageDaily: summary.isMonthlyPeriod ? {
        amount: Math.round(summary.averageDaily),
        trend: summary.averageTrend,
      } : null,
      nextMonthPrediction: timePeriod === 'This Month' ? Math.round(summary.nextMonthPrediction) : null,
      roundupInsight,
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
    return errorResponse(error, 'Error fetching expenses data:', 'Failed to fetch expenses data');
  }
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
