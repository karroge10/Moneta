import { db } from '@/lib/db';
import { convertTransactionsToTargetSimple } from '@/lib/currency-conversion';
import { calculateGoalProgress } from '@/lib/goalUtils';
import type { FinancialHealthDetails, TimePeriod } from '@/types/dashboard';

const WEIGHTS = {
  saving: 0.35,
  spendingControl: 0.25,
  goals: 0.25,
  engagement: 0.15,
} as const;

/** In-memory cache so dashboard, statistics, and financial-health page share the same score within TTL. No persistence; IndexedDB can be added later for offline/cache. */
const CACHE_TTL_MS = 60 * 1000; // 1 minute
const cache = new Map<string, { result: FinancialHealthDetails; expiresAt: number }>();

function cacheKey(userId: number, timePeriod: TimePeriod, targetCurrencyId: number): string {
  return `${userId}:${timePeriod}:${targetCurrencyId}`;
}

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
    case 'This Year':
      return {
        start: new Date(year - 1, 0, 1),
        end: new Date(year - 1, 11, 31, 23, 59, 59, 999),
      };
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

type GoalRow = { targetDate: Date; targetAmount: number; currentAmount: number; createdAt: Date };

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

export async function getFinancialHealthScore(
  userId: number,
  timePeriod: TimePeriod,
  targetCurrencyId: number
): Promise<FinancialHealthDetails> {
  const key = cacheKey(userId, timePeriod, targetCurrencyId);
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.result;
  }

  const now = new Date();
  const selectedRange = getDateRangeForPeriod(timePeriod, now);
  const comparisonRange = getComparisonDateRange(timePeriod, now);

  const [selectedTx, comparisonTx, goals, user, recentTx] = await Promise.all([
    db.transaction.findMany({
      where: {
        userId,
        date: { gte: selectedRange.start, lte: selectedRange.end },
      },
      include: { category: true, currency: true },
      orderBy: { date: 'desc' },
    }),
    comparisonRange
      ? db.transaction.findMany({
        where: {
          userId,
          date: { gte: comparisonRange.start, lte: comparisonRange.end },
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
        date: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true, categoryId: true },
    }),
  ]);

  const selectedConverted = await convertTransactionsToTargetSimple(selectedTx, targetCurrencyId);
  const comparisonConverted = comparisonRange
    ? await convertTransactionsToTargetSimple(comparisonTx, targetCurrencyId)
    : [];

  const selectedIncome = selectedConverted
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.convertedAmount, 0);
  const selectedExpenses = selectedConverted
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.convertedAmount, 0);

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
    const compIncome = comparisonConverted
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.convertedAmount, 0);
    const compExpenses = comparisonConverted
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.convertedAmount, 0);
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
  cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
