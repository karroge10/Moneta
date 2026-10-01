import type { DemographicComparison } from '@/types/dashboard';
import {
  demographicChangeIncome,
  demographicChangeExpense,
  demographicChangeGoalRate,
  demographicChangePortfolio,
  demographicChangeHealth,
} from '@/lib/demographic-peer-copy';
import { getAgeGroup } from './age';

const DEMOGRAPHIC_DIMENSIONS = ['age', 'country', 'profession'] as const;
export type DemographicDimension = (typeof DEMOGRAPHIC_DIMENSIONS)[number];
// Peer averages over fewer people would reveal individual users' numbers.
export const MIN_COHORT_SIZE = 10;

export type CohortUser = {
  id: number;
  dateOfBirth: Date | null;
  country: string | null;
  profession: string | null;
};

export type PeerMetrics = {
  income: number;
  expenses: number;
  goalsSuccessRate: number;
  portfolioBalance: number;
  healthScore: number;
};

export function parseDemographicDimension(param: string | null): DemographicDimension {
  const isKnown = param != null && DEMOGRAPHIC_DIMENSIONS.includes(param as DemographicDimension);
  return isKnown ? (param as DemographicDimension) : 'age';
}

/** The value of the chosen dimension for one user, or null/empty when it is unknown. */
export function getCohortValue(user: CohortUser, dimension: DemographicDimension, now: Date): string | null {
  if (dimension === 'age') return getAgeGroup(user.dateOfBirth, now);
  if (dimension === 'country') return (user.country ?? '').trim();
  return (user.profession ?? '').trim();
}

/** Peers who share the user's cohort value. Empty when the user's own value is missing. */
export function filterCohort(
  users: CohortUser[],
  dimension: DemographicDimension,
  cohortValue: string | null,
  now: Date,
): CohortUser[] {
  if (!cohortValue) return [];
  return users.filter((u) => getCohortValue(u, dimension, now) === cohortValue);
}

export function buildCohortFilters(users: CohortUser[]): { countries: string[]; professions: string[] } {
  const countryValues = users.map((u) => u.country).filter((c): c is string => c != null && c !== '');
  const professionValues = users.map((u) => u.profession).filter((p): p is string => p != null && p !== '');
  return {
    countries: [...new Set(countryValues)].sort(),
    professions: [...new Set(professionValues)].sort(),
  };
}

/**
 * Approximate health score for a peer, mirroring the main score weights:
 * saving 35%, spending control 25%, goals 25%, engagement 15%.
 */
export function computePeerMetrics(input: {
  income: number;
  expenses: number;
  txCount: number;
  goalsTotal: number;
  goalsDone: number;
  portfolioBalance: number;
}): PeerMetrics {
  const { income, expenses, goalsTotal, goalsDone } = input;
  let savingScore = 0;
  let spendingControlScore = 0;
  if (income > 0) {
    const savingsRate = (income - expenses) / income;
    savingScore = savingsRate >= 0.2 ? 100 : savingsRate <= 0 ? 0 : Math.round((savingsRate / 0.2) * 100);
    const ratio = expenses / income;
    spendingControlScore = expenses <= income ? 100 : ratio >= 1.5 ? 0 : Math.round(100 - ((ratio - 1) / 0.5) * 100);
  } else {
    spendingControlScore = expenses <= 0 ? 100 : 0;
  }
  const goalScore = goalsTotal > 0 ? Math.round((goalsDone / goalsTotal) * 100) : 50;
  const engagement = Math.round(((input.txCount > 0 ? 100 : 0) + 100 + (goalsTotal > 0 ? 100 : 0)) / 3);
  const healthScoreRaw = savingScore * 0.35 + spendingControlScore * 0.25 + goalScore * 0.25 + engagement * 0.15;

  return {
    income,
    expenses,
    goalsSuccessRate: goalsTotal > 0 ? (goalsDone / goalsTotal) * 100 : 0,
    portfolioBalance: input.portfolioBalance,
    healthScore: Math.round(Math.max(0, Math.min(100, healthScoreRaw))),
  };
}

export function buildDemographicComparisons(user: PeerMetrics, peers: PeerMetrics[]): DemographicComparison[] {
  return buildDemographicComparisonsFromPeerArrays(user, {
    incomes: peers.map((m) => m.income),
    expenses: peers.map((m) => m.expenses),
    goalsRates: peers.map((m) => m.goalsSuccessRate),
    portfolios: peers.map((m) => m.portfolioBalance),
    health: peers.map((m) => m.healthScore),
  });
}

export function buildDemographicComparisonsFromPeerArrays(
  user: PeerMetrics,
  peers: { incomes: number[]; expenses: number[]; goalsRates: number[]; portfolios: number[]; health: number[] },
): DemographicComparison[] {
  return [
    {
      id: '1',
      label: 'Average Income',
      change: demographicChangeIncome(user.income, peers.incomes),
      icon: 'Wallet',
      iconColor: '#74C648',
    },
    {
      id: '2',
      label: 'Average Expenses',
      change: demographicChangeExpense(user.expenses, peers.expenses),
      invertChangeColor: true,
      icon: 'ShoppingBag',
      iconColor: '#D93F3F',
    },
    {
      id: '3',
      label: 'Goal Success Rate',
      change: demographicChangeGoalRate(user.goalsSuccessRate, peers.goalsRates),
      icon: 'Trophy',
      iconColor: '#FFA500',
    },
    {
      id: '4',
      label: 'Portfolio Balance',
      change: demographicChangePortfolio(user.portfolioBalance, peers.portfolios),
      icon: 'BitcoinCircle',
      iconColor: '#FF8C00',
    },
    {
      id: '5',
      label: 'Financial Health',
      change: demographicChangeHealth(user.healthScore, peers.health),
      icon: 'Heart',
      iconColor: '#AC66DA',
    },
  ];
}

