import { toDateKey } from './dates';

// Yahoo Finance chart endpoint: public, no API key. Stooq's JSON quote API, used before, was retired.
const CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const REVALIDATE_SECONDS = 60;

export type StockQuote = { ticker: string; name: string; price: number; currency: string };

/** Latest quote for one US ticker, or null when the symbol is unknown or the API fails. */
export async function fetchStockQuote(ticker: string): Promise<StockQuote | null> {
  const symbol = normalizeTicker(ticker);
  if (!symbol) return null;

  const chart = await fetchChart(symbol, '1d');
  const meta = chart?.meta;
  const price = meta?.regularMarketPrice;
  if (!meta || typeof price !== 'number' || !Number.isFinite(price)) return null;

  return {
    ticker: symbol,
    name: meta.longName || meta.shortName || symbol,
    price,
    currency: meta.currency ?? 'USD',
  };
}

/** Latest USD prices keyed by the ticker as passed in. Tickers without a price are left out. */
export async function fetchStockPrices(tickers: string[]): Promise<Record<string, number>> {
  const unique = Array.from(new Set(tickers));
  const quotes = await Promise.all(unique.map((ticker) => fetchStockQuote(ticker)));

  const prices: Record<string, number> = {};
  unique.forEach((ticker, index) => {
    const quote = quotes[index];
    if (quote) prices[ticker] = quote.price;
  });
  return prices;
}

/** Daily closes for roughly the last `days` days, oldest first. Empty when unavailable. */
export async function fetchStockHistory(ticker: string, days: number): Promise<{ date: string; value: number }[]> {
  const symbol = normalizeTicker(ticker);
  if (!symbol) return [];

  const range = rangeForDays(days);
  const chart = await fetchChart(symbol, range);
  const timestamps = chart?.timestamp ?? [];
  const closes = chart?.indicators?.quote?.[0]?.close ?? [];

  const points: { date: string; value: number }[] = [];
  timestamps.forEach((seconds, index) => {
    const close = closes[index];
    if (typeof close !== 'number' || !Number.isFinite(close)) return;
    const day = new Date(seconds * 1000);
    points.push({ date: toDateKey(day), value: close });
  });
  return points.slice(-days);
}

type ChartResult = {
  meta?: { regularMarketPrice?: number; currency?: string; longName?: string; shortName?: string };
  timestamp?: number[];
  indicators?: { quote?: { close?: (number | null)[] }[] };
};

async function fetchChart(symbol: string, range: string): Promise<ChartResult | null> {
  const url = `${CHART_URL}/${encodeURIComponent(symbol)}?range=${range}&interval=1d`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Moneta)' },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { chart?: { result?: ChartResult[] | null } };
    return data.chart?.result?.[0] ?? null;
  } catch (error) {
    console.error(`[stock-prices] Failed to fetch ${symbol}`, error);
    return null;
  }
}

/** Accepts "aapl", "AAPL" or the old Stooq form "aapl.us". */
function normalizeTicker(ticker: string): string {
  return ticker.trim().replace(/\.us$/i, '').toUpperCase();
}

function rangeForDays(days: number): string {
  if (days <= 5) return '5d';
  if (days <= 31) return '1mo';
  if (days <= 92) return '3mo';
  if (days <= 183) return '6mo';
  if (days <= 366) return '1y';
  return '5y';
}
