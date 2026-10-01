import { NextResponse, NextRequest } from 'next/server';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { db } from '@/lib/db';
import { moneyToNumber } from '@/lib/money';
import { getFinancialHealthScore, FINANCIAL_HEALTH_TIME_PERIOD } from '@/lib/financial-health';
import { getInvestmentsPortfolio } from '@/lib/investments';
import { TimePeriod } from '@/types/dashboard';
import {
  preloadRates,
  convertTransactionsWithRatesMap,
  countMissingRates,
} from '@/lib/currency-conversion';
import { getUtcPeriodRange } from '@/lib/dates';
import {
  buildDemographicSection,
  cohortRateInputs,
  loadCohortTransactions,
  type CohortTx,
} from '@/lib/statistics/demographic';
import {
  MIN_COHORT_SIZE,
  filterCohort,
  getCohortValue,
  parseDemographicDimension,
} from '@/lib/statistics/cohort';
import { sumByType, sumByTypeAsNumber } from '@/lib/statistics/money-sums';
import { getGoalsSuccessRate } from '@/lib/statistics/goals';
import { buildMonthlySummaries, computeTrends } from '@/lib/statistics/monthly-summary';
import { buildAverageExpenses } from '@/lib/statistics/category-breakdown';
import { buildSummaryItems } from '@/lib/statistics/summary-items';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COHORT_USER_SELECT = { id: true, dateOfBirth: true, country: true, profession: true } as const;

export async function GET(request: NextRequest) {
  const startTotal = Date.now();
  try {
    const user = await requireCurrentUserWithLanguage();
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
    console.log(`[stat-prof] Auth & Currency: ${Date.now() - startTotal}ms`);

    const { searchParams } = new URL(request.url);
    const demographicOnly = searchParams.get('demographicOnly') === '1';
    const timePeriod = (searchParams.get('timePeriod') || 'All Time') as TimePeriod;
    const demographicDimension = parseDemographicDimension(searchParams.get('demographicDimension'));
    const cohortValueFromUser = getCohortValue(user, demographicDimension, now);
    const selectedRange = getUtcPeriodRange(timePeriod, now);
    const dataSharingEnabled = user.dataSharingEnabled === true;

    if (demographicOnly) {
      const [periodTx, cohortUsers, userHealthForDemographic, goals, portfolioSummary] = await Promise.all([
        db.transaction.findMany({
          where: { userId: user.id, date: { gte: selectedRange.start, lte: selectedRange.end }, investmentAssetId: null },
          select: { amount: true, currencyId: true, date: true, type: true },
        }),
        dataSharingEnabled
          ? db.user.findMany({
              where: { dataSharingEnabled: true, id: { not: user.id } },
              select: COHORT_USER_SELECT,
            })
          : Promise.resolve([]),
        dataSharingEnabled
          ? getFinancialHealthScore(user.id, FINANCIAL_HEALTH_TIME_PERIOD, targetCurrencyId)
          : Promise.resolve({ score: 0, trend: 0, details: {} }),
        db.goal.findMany({ where: { userId: user.id } }),
        getInvestmentsPortfolio(user.id, userCurrencyRecord),
      ]);

      const filteredCohort = dataSharingEnabled
        ? filterCohort(cohortUsers, demographicDimension, cohortValueFromUser, now)
        : [];
      const cohortTxByUserId = await loadCohortTxIfLargeEnough(filteredCohort, selectedRange);
      const userRateInputs = periodTx.map((t) => ({ currencyId: t.currencyId, date: t.date }));
      const cohortRates = cohortRateInputs(cohortTxByUserId);
      const ratesMap = await preloadRates([...userRateInputs, ...cohortRates], targetCurrencyId);
      const userWithConverted = convertTransactionsWithRatesMap(periodTx, targetCurrencyId, ratesMap);

      const income = sumByTypeAsNumber(userWithConverted, 'income');
      const expenses = sumByTypeAsNumber(userWithConverted, 'expense');
      const goalsSuccessRate = getGoalsSuccessRate(goals);
      const userMetrics = {
        income,
        expenses,
        goalsSuccessRate,
        portfolioBalance: portfolioSummary.totalValue,
        healthScore: userHealthForDemographic.score,
      };
      const section = await buildDemographicSection({
        userId: user.id,
        dataSharingEnabled,
        cohortUsers,
        filteredCohort,
        cohortValue: cohortValueFromUser,
        dimension: demographicDimension,
        periodStart: selectedRange.start,
        cohortTxByUserId,
        ratesMap,
        targetCurrencyId,
        userMetrics,
      });

      return NextResponse.json({
        demographicComparisons: section.demographicComparisons,
        demographicComparisonsDisabled: section.demographicComparisonsDisabled,
        cohortFilters: section.cohortFilters,
        demographicCohortValueMissing: cohortValueFromUser == null,
        demographicCohortSize: section.demographicCohortSize,
        syntheticDemographicCohort: section.syntheticDemographicCohort,
        missingRates: countMissingRates(userWithConverted),
      });
    }

    const [allTransactions, goals, cohortUsers, portfolioSummary, financialHealth] = await Promise.all([
      db.transaction.findMany({
        where: { userId: user.id, investmentAssetId: null },
        include: { category: true, currency: true },
        orderBy: { date: 'desc' },
      }),
      db.goal.findMany({ where: { userId: user.id } }),
      db.user.findMany({
        where: { dataSharingEnabled: true, id: { not: user.id } },
        select: COHORT_USER_SELECT,
      }),
      getInvestmentsPortfolio(user.id, userCurrencyRecord),
      getFinancialHealthScore(user.id, FINANCIAL_HEALTH_TIME_PERIOD, targetCurrencyId),
    ]);

    const filteredCohort = dataSharingEnabled
      ? filterCohort(cohortUsers, demographicDimension, cohortValueFromUser, now)
      : [];
    const cohortTxByUserId = await loadCohortTxIfLargeEnough(filteredCohort, selectedRange);
    const userRateInputs = allTransactions.map((t) => ({ currencyId: t.currencyId, date: t.date }));
    const cohortRates = cohortRateInputs(cohortTxByUserId);
    const ratesMap = await preloadRates([...userRateInputs, ...cohortRates], targetCurrencyId);
    const transactionsWithConverted = convertTransactionsWithRatesMap(allTransactions, targetCurrencyId, ratesMap);

    const periodTransactions = transactionsWithConverted.filter(
      (t) => t.date >= selectedRange.start && t.date <= selectedRange.end,
    );

    const totalIncomeMoney = sumByType(periodTransactions, 'income');
    const totalExpensesMoney = sumByType(periodTransactions, 'expense');
    const incomeSavedMoney = totalIncomeMoney.minus(totalExpensesMoney);
    const totalIncome = moneyToNumber(totalIncomeMoney);
    const totalExpenses = moneyToNumber(totalExpensesMoney);
    const incomeSaved = moneyToNumber(incomeSavedMoney);
    const missingRates = countMissingRates(periodTransactions);

    const monthlySummaries = buildMonthlySummaries(transactionsWithConverted);
    const averageExpenses = buildAverageExpenses(periodTransactions, totalExpenses);
    const goalsSuccessRate = getGoalsSuccessRate(goals);
    const portfolioBalance = portfolioSummary.totalValue;

    const section = await buildDemographicSection({
      userId: user.id,
      dataSharingEnabled,
      cohortUsers,
      filteredCohort,
      cohortValue: cohortValueFromUser,
      dimension: demographicDimension,
      periodStart: selectedRange.start,
      cohortTxByUserId,
      ratesMap,
      targetCurrencyId,
      userMetrics: {
        income: totalIncome,
        expenses: totalExpenses,
        goalsSuccessRate,
        portfolioBalance,
        healthScore: financialHealth.score,
      },
    });

    const { incomeTrend, expensesTrend } = computeTrends(monthlySummaries);
    const summaryItems = buildSummaryItems({
      totalIncome,
      totalExpenses,
      incomeSaved,
      incomeTrend,
      expensesTrend,
      totalGoals: goals.length,
      goalsSuccessRate,
      portfolioBalance,
      healthScore: financialHealth.score,
      healthTrend: financialHealth.trend,
    });

    return NextResponse.json({
      monthlySummary: monthlySummaries,
      averageExpenses,
      summary: {
        items: summaryItems,
      },
      totalIncome: Math.round(totalIncome),
      totalExpenses: Math.round(totalExpenses),
      incomeSaved: Math.round(incomeSaved),
      goalsSuccessRate,
      portfolioBalance: Math.round(portfolioBalance),
      demographicComparisons: section.demographicComparisons,
      demographicComparisonsDisabled: section.demographicComparisonsDisabled,
      cohortFilters: section.cohortFilters,
      demographicCohortValueMissing: cohortValueFromUser == null,
      demographicCohortSize: section.demographicCohortSize,
      syntheticDemographicCohort: section.syntheticDemographicCohort,
      missingRates,
      financialHealth: {
        score: financialHealth.score,
        trend: financialHealth.trend,
        details: financialHealth.details,
      },
    });
  } catch (error) {
    console.error('Error fetching statistics data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics data' },
      { status: 500 }
    );
  }
}

async function loadCohortTxIfLargeEnough(
  filteredCohort: { id: number }[],
  range: { start: Date; end: Date },
): Promise<Map<number, CohortTx[]>> {
  if (filteredCohort.length < MIN_COHORT_SIZE) return new Map();
  const cohortIds = filteredCohort.map((u) => u.id);
  return loadCohortTransactions(cohortIds, range);
}
