import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { preloadRates, convertTransactionsWithRatesMap, sumConverted } from '@/lib/currency-conversion';
import { addUtcDays, getUtcComparisonRange, getUtcPeriodRange } from '@/lib/dates';
import { moneyToNumber } from '@/lib/money';
import { TtlCache } from '@/lib/ttl-cache';
import { calculateGoalProgress } from '@/lib/goalUtils';
import type { FinancialHealthDetails, TimePeriod } from '@/types/dashboard';


export const FINANCIAL_HEALTH_TIME_PERIOD: TimePeriod = 'All Time';

const WEIGHTS = {
  saving: 0.35,
  spendingControl: 0.25,
  goals: 0.25,
  engagement: 0.15,
} as const;


const CACHE_TTL_MS = 60 * 1000;
const CACHE_MAX_ENTRIES = 1000;
const cache = new TtlCache<FinancialHealthDetails>(CACHE_TTL_MS, CACHE_MAX_ENTRIES);
const RECENT_ACTIVITY_DAYS = 30;

export async function getFinancialHealthScore(
  userId: number,
  timePeriod: TimePeriod,
  targetCurrencyId: number
): Promise<FinancialHealthDetails> {
  const key = cacheKey(userId, timePeriod, targetCurrencyId);
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const now = new Date();
  const selectedRange = getUtcPeriodRange(timePeriod, now);
  const comparisonRange = getUtcComparisonRange(timePeriod, now);
  const recentSince = addUtcDays(now, -RECENT_ACTIVITY_DAYS);

  const [selectedTx, comparisonTx, goals, user, recentTx] = await Promise.all([
    db.transaction.findMany({
      where: {
        userId,
        date: { gte: selectedRange.start, lte: selectedRange.end },
        investmentAssetId: null,
      },
      include: { category: true, currency: true },
      orderBy: { date: 'desc' },
    }),
    comparisonRange
      ? db.transaction.findMany({
        where: {
          userId,
          date: { gte: comparisonRange.start, lte: comparisonRange.end },
          investmentAssetId: null,
        },
        include: { category: true, currency: true },
      })
      : Promise.resolve([]),
    db.goal.findMany({
      where: { userId },
      select: { targetDate: true, targetAmount: true, currentAmount: true, createdAt: true },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { currencyId: true },
    }),
    db.transaction.findMany({
      where: {
        userId,
        date: { gte: recentSince },
        investmentAssetId: null,
      },
      select: { id: true, categoryId: true },
    }),
  ]);

  const ratesMap = await preloadRates(
    [
      ...selectedTx.map(t => ({ currencyId: t.currencyId, date: t.date })),
      ...(comparisonTx || []).map(t => ({ currencyId: t.currencyId, date: t.date })),
    ],
    targetCurrencyId
  );

  const selectedConverted = convertTransactionsWithRatesMap(selectedTx, targetCurrencyId, ratesMap);
  const comparisonConverted = comparisonRange
    ? convertTransactionsWithRatesMap(comparisonTx, targetCurrencyId, ratesMap)
    : [];

  const selectedIncome = sumByType(selectedConverted, 'income');
  const selectedExpenses = sumByType(selectedConverted, 'expense');

  const totalTxInPeriod = selectedConverted.length;
  const categorizedInPeriod =
    totalTxInPeriod > 0
      ? selectedConverted.filter((t) => t.category?.name && t.category.name !== 'Uncategorized').length /
      totalTxInPeriod
      : 0;

  const details = {
    saving: pillarSaving(selectedIncome, selectedExpenses),
    spendingControl: pillarSpendingControl(selectedIncome, selectedExpenses),
    goals: pillarGoals(goals),
    engagement: pillarEngagement(
      recentTx.length > 0,
      user?.currencyId != null,
      goals.length > 0,
      categorizedInPeriod
    ),
  };

  const score = totalTxInPeriod === 0 && selectedIncome === 0 && selectedExpenses === 0 ? 0 : computeScore(details);

  let trend = 0;
  if (comparisonRange && comparisonConverted.length > 0) {
    const compIncome = sumByType(comparisonConverted, 'income');
    const compExpenses = sumByType(comparisonConverted, 'expense');
    const compCategorized =
      comparisonConverted.length > 0
        ? comparisonConverted.filter(
          (t) => t.category?.name && t.category.name !== 'Uncategorized'
        ).length / comparisonConverted.length
        : 0;
    const compDetails = {
      saving: pillarSaving(compIncome, compExpenses),
      spendingControl: pillarSpendingControl(compIncome, compExpenses),
      goals: details.goals,
      engagement: pillarEngagement(
        recentTx.length > 0,
        user?.currencyId != null,
        goals.length > 0,
        compCategorized
      ),
    };
    const compScore = computeScore(compDetails);
    trend = score - compScore;
  }

  const result: FinancialHealthDetails = { score, trend, details };
  cache.set(key, result);
  return result;
}

function pillarSaving(income: number, expenses: number): number {
  if (income <= 0) return 0;
  const savingsRate = (income - expenses) / income;
  if (savingsRate >= 0.2) return 100;
  if (savingsRate <= 0) return 0;
  return Math.round((savingsRate / 0.2) * 100);
}

function pillarSpendingControl(income: number, expenses: number): number {
  if (income <= 0) return expenses <= 0 ? 100 : 0;
  if (expenses <= income) return 100;
  const ratio = expenses / income;
  if (ratio >= 1.5) return 0;
  return Math.round(100 - ((ratio - 1) / 0.5) * 100);
}

type GoalRow = { targetDate: Date; targetAmount: Prisma.Decimal; currentAmount: Prisma.Decimal; createdAt: Date };

function pillarGoals(goals: GoalRow[]): number {
  if (goals.length === 0) return 50;
  const now = new Date();
  let onTrack = 0;
  for (const g of goals) {
    const progress = calculateGoalProgress(g.currentAmount, g.targetAmount);
    if (progress >= 100) {
      onTrack += 1;
      continue;
    }
    const created = new Date(g.createdAt).getTime();
    const target = new Date(g.targetDate).getTime();
    const elapsed = now.getTime() - created;
    const total = target - created;
    if (total <= 0) continue;
    const expectedByTime = (elapsed / total) * 100;
    if (progress >= expectedByTime) onTrack += 1;
  }
  return Math.round((onTrack / goals.length) * 100);
}

function pillarEngagement(
  hasRecentTx: boolean,
  hasCurrency: boolean,
  hasGoals: boolean,
  categorizedShare: number
): number {
  const components = [
    hasRecentTx ? 100 : 0,
    hasCurrency ? 100 : 0,
    hasGoals ? 100 : 0,
    Math.round(categorizedShare * 100),
  ];
  return Math.round(components.reduce((a, b) => a + b, 0) / components.length);
}

function computeScore(details: FinancialHealthDetails['details']): number {
  const raw =
    details.saving * WEIGHTS.saving +
    details.spendingControl * WEIGHTS.spendingControl +
    details.goals * WEIGHTS.goals +
    details.engagement * WEIGHTS.engagement;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

function cacheKey(userId: number, timePeriod: TimePeriod, targetCurrencyId: number): string {
  return `${userId}:${timePeriod}:${targetCurrencyId}`;
}

/** Exact sum per type, converted to a number once for the score maths. Missing rates are excluded. */
function sumByType(
  items: { type: string; convertedMoney: Prisma.Decimal | null }[],
  type: 'income' | 'expense',
): number {
  const ofType = items.filter((t) => t.type === type);
  const total = sumConverted(ofType);
  return moneyToNumber(total);
}
