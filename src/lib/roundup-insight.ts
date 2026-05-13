import { unstable_cache } from 'next/cache';

import type { PortfolioAsset } from '@/lib/investments';

export const ROUNDUP_RATE = 0.01;

/** How long we reuse the same 1-year return numbers (per asset) across all users. */
const RETURN_CACHE_REVALIDATE_SEC = 86_400;

const CRYPTO_BENCHMARKS: { coingeckoId: string; label: string; ticker: string }[] = [
  { coingeckoId: 'bitcoin', label: 'Bitcoin', ticker: 'BTC' },
  { coingeckoId: 'ethereum', label: 'Ethereum', ticker: 'ETH' },
  { coingeckoId: 'solana', label: 'Solana', ticker: 'SOL' },
  { coingeckoId: 'cardano', label: 'Cardano', ticker: 'ADA' },
  { coingeckoId: 'dogecoin', label: 'Dogecoin', ticker: 'DOGE' },
  { coingeckoId: 'ripple', label: 'XRP', ticker: 'XRP' },
];

const STOCK_BENCHMARKS: { yahooSymbol: string; label: string; ticker: string }[] = [
  { yahooSymbol: 'AAPL', label: 'Apple', ticker: 'AAPL' },
  { yahooSymbol: 'MSFT', label: 'Microsoft', ticker: 'MSFT' },
  { yahooSymbol: 'GOOGL', label: 'Alphabet', ticker: 'GOOGL' },
  { yahooSymbol: 'AMZN', label: 'Amazon', ticker: 'AMZN' },
  { yahooSymbol: 'NVDA', label: 'NVIDIA', ticker: 'NVDA' },
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

export interface YearAgoBestDto {
  label: string;
  ticker: string;
  /** Total USD return over ~past year (e.g. 0.25 = +25%). */
  returnPercent: number;
  /** Profit if `roundupTotal` were invested at start of window and sold at end (simple). */
  hypotheticalProfit: number;
}

export interface RoundupInsightDto {
  roundupTotal: number;
  periodExpenses: number;
  yearAgoBest: YearAgoBestDto | null;
  disclaimer: string;
}

export function emptyRoundupInsight(): RoundupInsightDto {
  return {
    roundupTotal: 0,
    periodExpenses: 0,
    yearAgoBest: null,
    disclaimer:
      'Illustrative only: 1% of expenses in the selected period vs. trailing ~1-year price change of the shown asset. Past performance does not predict future results.',
  };
}

async function fetchCoingecko365Return(coingeckoId: string): Promise<number | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=usd&days=365`;
    const res = await fetch(url);
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

async function fetchYahooOneYearReturn(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'application/json,text/plain,*/*',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      chart?: { result?: Array<{ indicators?: { quote?: Array<{ close?: (number | null)[] }> } }> };
    };
    const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    if (!Array.isArray(closes) || closes.length < 2) return null;
    let first: number | null = null;
    let last: number | null = null;
    for (const c of closes) {
      if (typeof c === 'number' && Number.isFinite(c) && c > 0) {
        if (first === null) first = c;
        last = c;
      }
    }
    if (first === null || last === null || first <= 0) return null;
    return last / first - 1;
  } catch {
    return null;
  }
}

const getCachedCrypto365Return = unstable_cache(
  async (coingeckoId: string) => fetchCoingecko365Return(coingeckoId),
  ['roundup-insight', 'cg365'],
  { revalidate: RETURN_CACHE_REVALIDATE_SEC },
);

const getCachedYahoo1yReturn = unstable_cache(
  async (yahooSymbol: string) => fetchYahooOneYearReturn(yahooSymbol),
  ['roundup-insight', 'yahoo1y'],
  { revalidate: RETURN_CACHE_REVALIDATE_SEC },
);

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

export function portfolioStockBenchmarks(assets: PortfolioAsset[]): { yahooSymbol: string; label: string; ticker: string }[] {
  const out: { yahooSymbol: string; label: string; ticker: string }[] = [];
  const seen = new Set<string>();
  for (const a of assets) {
    if (a.type !== 'stock' || !a.ticker) continue;
    const base = a.ticker.split('.')[0].toUpperCase();
    if (!base || seen.has(base)) continue;
    seen.add(base);
    out.push({
      yahooSymbol: base,
      label: a.name || base,
      ticker: base,
    });
  }
  return out;
}

type ReturnRow = { label: string; ticker: string; r: number };

export async function computeRoundupInsight(
  periodExpenseTotal: number,
  portfolioAssets: PortfolioAsset[],
): Promise<RoundupInsightDto> {
  const expense = Math.max(0, periodExpenseTotal);
  const roundupTotal = Math.round(expense * ROUNDUP_RATE * 100) / 100;

  const disclaimer =
    'Illustrative only: 1% of expenses in the selected period vs. trailing ~1-year total return of the shown asset (best among a fixed watchlist plus your portfolio tickers). Past performance does not predict future results.';

  if (roundupTotal <= 0) {
    return {
      roundupTotal: 0,
      periodExpenses: Math.round(expense),
      yearAgoBest: null,
      disclaimer,
    };
  }

  const cryptoCandidates: { coingeckoId: string; label: string; ticker: string }[] = [];
  const cgSeen = new Set<string>();
  for (const c of [...CRYPTO_BENCHMARKS, ...portfolioCryptoBenchmarks(portfolioAssets)]) {
    if (cgSeen.has(c.coingeckoId)) continue;
    cgSeen.add(c.coingeckoId);
    cryptoCandidates.push(c);
  }

  const stockCandidates: { yahooSymbol: string; label: string; ticker: string }[] = [];
  const stSeen = new Set<string>();
  for (const s of [...STOCK_BENCHMARKS, ...portfolioStockBenchmarks(portfolioAssets)]) {
    if (stSeen.has(s.yahooSymbol)) continue;
    stSeen.add(s.yahooSymbol);
    stockCandidates.push(s);
  }

  const [cryptoRows, stockRows] = await Promise.all([
    Promise.all(
      cryptoCandidates.map(async (c) => {
        const r = await getCachedCrypto365Return(c.coingeckoId);
        if (r === null || !Number.isFinite(r)) return null;
        return { label: c.label, ticker: c.ticker, r } satisfies ReturnRow;
      }),
    ),
    Promise.all(
      stockCandidates.map(async (s) => {
        const r = await getCachedYahoo1yReturn(s.yahooSymbol);
        if (r === null || !Number.isFinite(r)) return null;
        return { label: s.label, ticker: s.ticker, r } satisfies ReturnRow;
      }),
    ),
  ]);

  const rows: ReturnRow[] = [...cryptoRows, ...stockRows].filter((x): x is ReturnRow => x !== null);

  if (rows.length === 0) {
    return {
      roundupTotal,
      periodExpenses: Math.round(expense),
      yearAgoBest: null,
      disclaimer,
    };
  }

  let best = rows[0]!;
  for (const row of rows) {
    if (row.r > best.r) best = row;
  }

  const hypotheticalProfit = Math.round(roundupTotal * best.r * 100) / 100;

  return {
    roundupTotal,
    periodExpenses: Math.round(expense),
    yearAgoBest: {
      label: best.label,
      ticker: best.ticker,
      returnPercent: Math.round(best.r * 1000) / 10,
      hypotheticalProfit,
    },
    disclaimer,
  };
}
