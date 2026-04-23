

import type { PortfolioAsset } from '@/lib/investments';


export const ROUNDUP_RATE = 0.01;

export const SAVINGS_APR = 0.07;

const MAX_SCENARIO_APR = 0.75;

const MAX_R30 = 0.45;

const BENCHMARKS: { coingeckoId: string; label: string; ticker: string }[] = [
  { coingeckoId: 'bitcoin', label: 'Bitcoin', ticker: 'BTC' },
  { coingeckoId: 'ethereum', label: 'Ethereum', ticker: 'ETH' },
  { coingeckoId: 'solana', label: 'Solana', ticker: 'SOL' },
  { coingeckoId: 'cardano', label: 'Cardano', ticker: 'ADA' },
];

const TICKER_TO_COINGECKO: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  XRP: 'ripple',
  LTC: 'litecoin',
};

export function emptyRoundupInsight(): RoundupInsightDto {
  return {
    roundupTotal: 0,
    periodExpenses: 0,
    savingsAprPercent: Math.round(SAVINGS_APR * 100),
    savingsExtraOneYear: 0,
    investScenario: null,
    disclaimer:
      'Illustrative only. Round-up is modeled as 1% of spending in this period. Savings uses a fixed 7% APY. The market line only appears when a tracked asset’s last 30 days, annualized, beat that rate—past performance is not indicative of future results.',
  };
}

export interface RoundupInsightDto {
  roundupTotal: number;
  periodExpenses: number;
  savingsAprPercent: number;
  savingsExtraOneYear: number;
  investScenario: {
    label: string;
    ticker: string;
    periodReturnPercent: number;
    annualizedPercent: number;
    extraOneYear: number;
  } | null;
  bitcoinScenario?: {
    label: string;
    ticker: string;
    periodReturnPercent: number;
    annualizedPercent: number;
    extraOneYear: number;
  } | null;
  disclaimer: string;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

async function fetch30dReturnDecimal(coingeckoId: string): Promise<number | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=usd&days=30`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { prices?: [number, number][] };
    const prices = data.prices;
    if (!Array.isArray(prices) || prices.length < 2) return null;
    const first = prices[0][1];
    const last = prices[prices.length - 1][1];
    if (typeof first !== 'number' || typeof last !== 'number' || first <= 0) return null;
    return last / first - 1;
  } catch {
    return null;
  }
}

function annualizedFrom30d(r30: number): number {
  const r = clamp(r30, -0.9, MAX_R30);
  return Math.pow(1 + r, 365 / 30) - 1;
}

export function portfolioCryptoBenchmarks(assets: PortfolioAsset[]): { coingeckoId: string; label: string; ticker: string }[] {
  const out: { coingeckoId: string; label: string; ticker: string }[] = [];
  const seen = new Set<string>();
  for (const a of assets) {
    if (a.type !== 'crypto' || !a.ticker) continue;
    const id = TICKER_TO_COINGECKO[a.ticker.toUpperCase()];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      coingeckoId: id,
      label: a.name || a.ticker,
      ticker: a.ticker.toUpperCase(),
    });
  }
  return out;
}


export async function computeRoundupInsight(
  periodExpenseTotal: number,
  portfolioAssets: PortfolioAsset[],
): Promise<RoundupInsightDto> {
  const expense = Math.max(0, periodExpenseTotal);
  const roundupTotal = Math.round(expense * ROUNDUP_RATE * 100) / 100;
  const savingsExtraOneYear = Math.round(roundupTotal * SAVINGS_APR * 100) / 100;

  const disclaimer =
    'Illustrative only. Round-up is modeled as 1% of spending in this period. Savings uses a fixed 7% APY. The market line only appears when a tracked asset’s last 30 days, annualized, beat that rate—past performance is not indicative of future results.';

  const candidates: { coingeckoId: string; label: string; ticker: string }[] = [];
  const seen = new Set<string>();
  for (const c of [...BENCHMARKS, ...portfolioCryptoBenchmarks(portfolioAssets)]) {
    if (seen.has(c.coingeckoId)) continue;
    seen.add(c.coingeckoId);
    candidates.push(c);
  }

  type Row = { label: string; ticker: string; r30: number; annual: number };
  const rows: Row[] = [];

  await Promise.all(
    candidates.map(async (c) => {
      const raw = await fetch30dReturnDecimal(c.coingeckoId);
      if (raw === null || raw <= 0) return;
      let annual = annualizedFrom30d(raw);
      annual = clamp(annual, 0, MAX_SCENARIO_APR);
      if (annual <= SAVINGS_APR) return;
      rows.push({
        label: c.label,
        ticker: c.ticker,
        r30: raw,
        annual,
      });
    }),
  );

  rows.sort((a, b) => b.annual - a.annual);
  const winner = rows[0];
  const btcRow = rows.find(r => r.ticker === 'BTC');

  let investScenario: RoundupInsightDto['investScenario'] = null;
  if (winner && roundupTotal > 0) {
    investScenario = {
      label: winner.label,
      ticker: winner.ticker,
      periodReturnPercent: Math.round(winner.r30 * 1000) / 10,
      annualizedPercent: Math.round(winner.annual * 1000) / 10,
      extraOneYear: Math.round(roundupTotal * winner.annual * 100) / 100,
    };
  }

  let bitcoinScenario: RoundupInsightDto['bitcoinScenario'] = null;
  if (btcRow && roundupTotal > 0) {
    bitcoinScenario = {
      label: btcRow.label,
      ticker: btcRow.ticker,
      periodReturnPercent: Math.round(btcRow.r30 * 1000) / 10,
      annualizedPercent: Math.round(btcRow.annual * 1000) / 10,
      extraOneYear: Math.round(roundupTotal * btcRow.annual * 100) / 100,
    };
  }

  return {
    roundupTotal,
    periodExpenses: Math.round(expense),
    savingsAprPercent: Math.round(SAVINGS_APR * 100),
    savingsExtraOneYear,
    investScenario,
    bitcoinScenario,
    disclaimer,
  };
}
