import { Prisma } from '@prisma/client';
import type { Goal } from '@prisma/client';
import { db } from '@/lib/db';
import { moneyToNumber } from '@/lib/money';
import { convertTransactionsWithRatesMap, type RatesMap } from '@/lib/currency-conversion';
import type { DateRange } from '@/lib/dates';
import type { DemographicComparison } from '@/types/dashboard';
import {
  MIN_COHORT_SIZE,
  buildCohortFilters,
  buildDemographicComparisons,
  buildDemographicComparisonsFromPeerArrays,
  computePeerMetrics,
  type CohortUser,
  type DemographicDimension,
  type PeerMetrics,
} from './cohort';
import {
  isFakeDemographicCohortEnabled,
  getFakeDemographicCohortSize,
  buildSyntheticPeerMetrics,
  demographicComparisonSeed,
} from '@/lib/fake-demographic-cohort';
import { countCompletedGoals } from './goals';
import { sumByTypeAsNumber } from './money-sums';

export type DemographicSection = {
  demographicComparisons: DemographicComparison[];
  demographicComparisonsDisabled: boolean;
  cohortFilters: { countries: string[]; professions: string[] };
  demographicCohortSize: number;
  syntheticDemographicCohort: boolean;
};

export type CohortTx = { amount: Prisma.Decimal; currencyId: number; date: Date; type: string };

type CohortSqlAggRow = {
  userId: unknown;
  type: string;
  currencyId: unknown;
  month: Date;
  total: unknown;
};

/** Monthly per-type sums of cohort transactions within the range, grouped by user id. */
export async function loadCohortTransactions(cohortIds: number[], range: DateRange): Promise<Map<number, CohortTx[]>> {
  const cohortAggs = await db.$queryRaw<CohortSqlAggRow[]>`
    SELECT "userId", "type", "currencyId", DATE_TRUNC('month', "date") as "month", SUM("amount") as "total"
    FROM "Transaction"
    WHERE "userId" IN (${Prisma.join(cohortIds)})
      AND "date" >= ${range.start}
      AND "date" <= ${range.end}
      AND "investmentAssetId" IS NULL
    GROUP BY "userId", "type", "currencyId", "month"
  `;

  const byUserId = new Map<number, CohortTx[]>();
  for (const row of cohortAggs) {
    const uid = Number(row.userId);
    const list = byUserId.get(uid) ?? [];
    list.push({
      amount: new Prisma.Decimal(String(row.total)),
      currencyId: Number(row.currencyId),
      date: new Date(row.month),
      type: row.type,
    });
    byUserId.set(uid, list);
  }
  return byUserId;
}

export function cohortRateInputs(cohortTxByUserId: Map<number, CohortTx[]>): { currencyId: number; date: Date }[] {
  const inputs: { currencyId: number; date: Date }[] = [];
  for (const txs of cohortTxByUserId.values()) {
    for (const t of txs) inputs.push({ currencyId: t.currencyId, date: t.date });
  }
  return inputs;
}

/** Builds the demographic part of the statistics response from real or synthetic peers. */
export async function buildDemographicSection(params: {
  userId: number;
  dataSharingEnabled: boolean;
  cohortUsers: CohortUser[];
  filteredCohort: CohortUser[];
  cohortValue: string | null;
  dimension: DemographicDimension;
  periodStart: Date;
  cohortTxByUserId: Map<number, CohortTx[]>;
  ratesMap: RatesMap;
  targetCurrencyId: number;
  userMetrics: PeerMetrics;
}): Promise<DemographicSection> {
  const section: DemographicSection = {
    demographicComparisons: [],
    demographicComparisonsDisabled: !params.dataSharingEnabled,
    cohortFilters: { countries: [], professions: [] },
    demographicCohortSize: 0,
    syntheticDemographicCohort: false,
  };
  if (!params.dataSharingEnabled) return section;

  section.cohortFilters = buildCohortFilters(params.cohortUsers);
  section.demographicCohortSize = params.filteredCohort.length;

  if (params.filteredCohort.length >= MIN_COHORT_SIZE) {
    const peers = await loadPeerMetrics(params);
    section.demographicComparisons = buildDemographicComparisons(params.userMetrics, peers);
  } else if (isFakeDemographicCohortEnabled() && params.cohortValue) {
    const seed = demographicComparisonSeed(params.userId, params.periodStart.getTime(), params.dimension);
    const n = getFakeDemographicCohortSize();
    const syn = buildSyntheticPeerMetrics(seed, n, {
      income: params.userMetrics.income,
      expenses: params.userMetrics.expenses,
      goalsSuccessRate: params.userMetrics.goalsSuccessRate,
      portfolio: params.userMetrics.portfolioBalance,
      healthScore: params.userMetrics.healthScore,
    });
    section.demographicCohortSize = n;
    section.syntheticDemographicCohort = true;
    section.demographicComparisons = buildDemographicComparisonsFromPeerArrays(params.userMetrics, {
      incomes: syn.peerIncomes,
      expenses: syn.peerExpenses,
      goalsRates: syn.peerGoalsRates,
      portfolios: syn.peerPortfolios,
      health: syn.peerHealth,
    });
  }
  return section;
}

async function loadPeerMetrics(params: {
  filteredCohort: CohortUser[];
  cohortTxByUserId: Map<number, CohortTx[]>;
  ratesMap: RatesMap;
  targetCurrencyId: number;
}): Promise<PeerMetrics[]> {
  const cohortIds = params.filteredCohort.map((u) => u.id);
  const [cohortGoalsAll, recentSnapshots] = await Promise.all([
    db.goal.findMany({ where: { userId: { in: cohortIds } } }),
    db.portfolioSnapshot.findMany({
      where: { userId: { in: cohortIds } },
      orderBy: { timestamp: 'desc' },
      distinct: ['userId'],
    }),
  ]);

  const goalsByUserId = new Map<number, Goal[]>();
  for (const g of cohortGoalsAll) {
    const list = goalsByUserId.get(g.userId) ?? [];
    list.push(g);
    goalsByUserId.set(g.userId, list);
  }
  const snapshotByUserId = new Map(recentSnapshots.map((s) => [s.userId, moneyToNumber(s.totalValue)]));

  return params.filteredCohort.map((cohortUser) => {
    const cohortTx = params.cohortTxByUserId.get(cohortUser.id) ?? [];
    const converted = convertTransactionsWithRatesMap(cohortTx, params.targetCurrencyId, params.ratesMap);
    const goals = goalsByUserId.get(cohortUser.id) || [];
    const income = sumByTypeAsNumber(converted, 'income');
    const expenses = sumByTypeAsNumber(converted, 'expense');
    const goalsDone = countCompletedGoals(goals);
    const portfolioBalance = snapshotByUserId.get(cohortUser.id) || 0;
    return computePeerMetrics({
      income,
      expenses,
      txCount: cohortTx.length,
      goalsTotal: goals.length,
      goalsDone,
      portfolioBalance,
    });
  });
}
