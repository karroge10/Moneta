

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function isFakeDemographicCohortEnabled(): boolean {
  if (process.env.FAKE_DEMOGRAPHIC_COHORT !== 'true') return false;
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_FAKE_DEMOGRAPHIC_COHORT_IN_PRODUCTION !== 'true') {
    return false;
  }
  return true;
}

export function getFakeDemographicCohortSize(): number {
  const n = Number.parseInt(process.env.FAKE_DEMOGRAPHIC_COHORT_SIZE ?? '24', 10);
  return Number.isFinite(n) && n >= 3 ? Math.min(n, 500) : 24;
}

export type SyntheticPeerMetrics = {
  peerIncomes: number[];
  peerExpenses: number[];
  peerGoalsRates: number[];
  peerPortfolios: number[];
  peerHealth: number[];
};


export function buildSyntheticPeerMetrics(
  seed: number,
  count: number,
  anchors: {
    income: number;
    expenses: number;
    goalsSuccessRate: number;
    portfolio: number;
    healthScore: number;
  },
): SyntheticPeerMetrics {
  const rand = mulberry32(seed);
  const incomeAnchor = anchors.income > 0 ? anchors.income : 4500 + rand() * 4000;
  const expenseAnchor = anchors.expenses > 0 ? anchors.expenses : 2800 + rand() * 2500;
  const goalsAnchor =
    anchors.goalsSuccessRate > 0 ? anchors.goalsSuccessRate : 35 + rand() * 40;
  const portfolioAnchor = anchors.portfolio > 0 ? anchors.portfolio : 8000 + rand() * 12000;
  const healthAnchor =
    anchors.healthScore > 0 ? anchors.healthScore : 55 + rand() * 25;

  const peerIncomes: number[] = [];
  const peerExpenses: number[] = [];
  const peerGoalsRates: number[] = [];
  const peerPortfolios: number[] = [];
  const peerHealth: number[] = [];

  for (let i = 0; i < count; i++) {
    const j = () => 0.72 + rand() * 0.56;
    peerIncomes.push(Math.max(0, Math.round(incomeAnchor * j())));
    peerExpenses.push(Math.max(0, Math.round(expenseAnchor * j())));
    peerGoalsRates.push(
      Math.min(100, Math.max(0, Math.round(goalsAnchor + (rand() - 0.5) * 28))),
    );
    peerPortfolios.push(Math.max(0, Math.round(portfolioAnchor * j())));
    peerHealth.push(
      Math.min(100, Math.max(1, Math.round(healthAnchor + (rand() - 0.5) * 22))),
    );
  }

  return { peerIncomes, peerExpenses, peerGoalsRates, peerPortfolios, peerHealth };
}

export function demographicComparisonSeed(
  userId: number,
  periodStartMs: number,
  dimension: string,
): number {
  let h = userId * 31 + periodStartMs;
  for (let i = 0; i < dimension.length; i++) {
    h = Math.imul(h, 31) + dimension.charCodeAt(i);
  }
  return h >>> 0;
}
