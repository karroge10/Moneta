import { Prisma } from '@prisma/client';
import { db } from './db';
import { addUtcDays, endOfUtcDay, startOfUtcDay, toDateKey } from './dates';
import { moneyToNumber, sumMoney, type MoneyValue } from './money';
import {
  isStale,
  pairKey,
  resolveRateFromPairs,
  type RatesByPair,
  type SelectedRate,
} from './rate-selection';
import { TtlCache } from './ttl-cache';

/**
 * Currency conversion. All paths (single rate, batch preload) go through resolveRates, which applies
 * the rule documented in rate-selection.ts and fills gaps from the public rate APIs.
 *
 * A missing rate is reported as missing (null / absent from the map), never guessed as 1.
 */

/** Batch map: buildCacheKey(currencyId, targetId, date) -> rate. Missing rates are absent. */
export type RatesMap = Map<string, Prisma.Decimal>;

export type ConvertedFields = {
  /** Exact converted amount, or null when no rate could be found. */
  convertedMoney: Prisma.Decimal | null;
  /** Number form for per-item display; 0 when the rate is missing. Never sum it, use sumConverted. */
  convertedAmount: number;
  rateMissing: boolean;
};

const RATE_CACHE_TTL_MS = 60 * 60 * 1000;
const RATE_CACHE_MAX_ENTRIES = 5000;
const FAILED_FETCH_TTL_MS = 15 * 60 * 1000;
const CURRENCY_CACHE_TTL_MS = 60 * 60 * 1000;
/** Upper bound on API fetches per resolveRates call, so a large history cannot stall a request. */
const MAX_FETCHES_PER_CALL = 10;
const PIVOT_ALIAS = 'USD';
// Currencies the ECB (Frankfurter) does not publish; these go straight to the CBR feed.
const CIS_CURRENCIES = ['RUB', 'BYN', 'KZT', 'AMD', 'KGS', 'GEL', 'UAH'];

const rateCache = new TtlCache<Prisma.Decimal>(RATE_CACHE_TTL_MS, RATE_CACHE_MAX_ENTRIES);
const failedFetches = new TtlCache<true>(FAILED_FETCH_TTL_MS, RATE_CACHE_MAX_ENTRIES);
const pendingFetches = new Map<string, Promise<Prisma.Decimal | null>>();
let currencyAliasCache: { aliases: Map<number, string>; expiresAt: number } | null = null;

export function buildCacheKey(baseId: number, quoteId: number, date: Date) {
  const dayKey = toDateKey(date);
  return `${baseId}:${quoteId}:${dayKey}`;
}

/** Single rate lookup. Same rule and cache as the batch path. */
export async function getConversionRate(
  baseCurrencyId: number,
  quoteCurrencyId: number,
  date: Date = new Date(),
): Promise<Prisma.Decimal | null> {
  const request = [{ currencyId: baseCurrencyId, date }];
  const rates = await resolveRates(request, quoteCurrencyId);
  const key = buildCacheKey(baseCurrencyId, quoteCurrencyId, date);
  return rates.get(key) ?? null;
}

/** Exact conversion. Returns null when no rate is available. */
export async function convertMoney(
  amount: MoneyValue,
  baseCurrencyId: number,
  quoteCurrencyId: number,
  date: Date = new Date(),
): Promise<Prisma.Decimal | null> {
  const rate = await getConversionRate(baseCurrencyId, quoteCurrencyId, date);
  if (!rate) return null;
  const decimalAmount = new Prisma.Decimal(amount);
  return decimalAmount.mul(rate);
}

/** Batch preload with exact rates. Missing rates are absent from the map. */
export async function preloadRates(
  transactions: { currencyId: number; date: Date }[],
  targetCurrencyId: number,
): Promise<RatesMap> {
  return resolveRates(transactions, targetCurrencyId);
}

export function convertTransactionsWithRatesMap<T extends { amount: MoneyValue; currencyId: number; date: Date }>(
  transactions: T[],
  targetCurrencyId: number,
  ratesMap: Map<string, MoneyValue>,
): (T & ConvertedFields)[] {
  return transactions.map((t) => {
    const converted = convertWithRatesMap(t, targetCurrencyId, ratesMap);
    return {
      ...t,
      convertedMoney: converted,
      convertedAmount: converted ? moneyToNumber(converted) : 0,
      rateMissing: converted === null,
    };
  });
}

/** Exact sum of converted amounts; items with a missing rate are excluded. */
export function sumConverted(items: { convertedMoney: Prisma.Decimal | null }[]): Prisma.Decimal {
  const values: Prisma.Decimal[] = [];
  for (const item of items) {
    if (item.convertedMoney) values.push(item.convertedMoney);
  }
  return sumMoney(values);
}

export function countMissingRates(items: { rateMissing: boolean }[]): number {
  let count = 0;
  for (const item of items) {
    if (item.rateMissing) count += 1;
  }
  return count;
}

/**
 * The single rate resolver. For each unique (currency, UTC day) it picks a stored rate by the
 * rate-selection rule; when that is missing or stale it fetches from the API (stored at UTC
 * midnight), and if the fetch fails it keeps the best stored rate. Only real rates are cached.
 */
async function resolveRates(
  requests: { currencyId: number; date: Date }[],
  targetCurrencyId: number,
): Promise<RatesMap> {
  const result: RatesMap = new Map();
  const pending = new Map<string, { currencyId: number; date: Date }>();

  for (const r of requests) {
    const key = buildCacheKey(r.currencyId, targetCurrencyId, r.date);
    if (result.has(key) || pending.has(key)) continue;
    if (r.currencyId === targetCurrencyId) {
      result.set(key, new Prisma.Decimal(1));
      continue;
    }
    const cached = rateCache.get(key);
    if (cached) {
      result.set(key, cached);
      continue;
    }
    pending.set(key, r);
  }

  if (pending.size === 0) return result;

  const aliases = await getCurrencyAliases();
  const pivotId = findPivotId(aliases);
  const currencyIds = new Set<number>([targetCurrencyId]);
  for (const r of pending.values()) currencyIds.add(r.currencyId);
  if (pivotId !== null) currencyIds.add(pivotId);

  const byPair = await loadRatesByPair([...currencyIds]);
  const now = new Date();
  let fetchBudget = MAX_FETCHES_PER_CALL;

  for (const [key, { currencyId, date }] of pending) {
    const asOf = endOfUtcDay(date);
    let selected: SelectedRate | null = resolveRateFromPairs(byPair, currencyId, targetCurrencyId, asOf, pivotId);

    const canFetch = fetchBudget > 0 && asOf.getTime() <= addUtcDays(now, 1).getTime() && !failedFetches.get(key);
    if (isStale(selected, asOf) && canFetch) {
      fetchBudget -= 1;
      const fetched = await fetchAndStoreRate(currencyId, targetCurrencyId, date, aliases);
      if (fetched) {
        const day = startOfUtcDay(date);
        selected = { rate: fetched, rateDate: day, onOrBefore: true };
      } else {
        failedFetches.set(key, true);
      }
    }

    if (!selected) {
      console.warn(`[currency] Missing exchange rate ${currencyId} -> ${targetCurrencyId} on ${toDateKey(date)}.`);
      continue;
    }
    result.set(key, selected.rate);
    rateCache.set(key, selected.rate);
  }

  return result;
}

function convertWithRatesMap(
  t: { amount: MoneyValue; currencyId: number; date: Date },
  targetCurrencyId: number,
  ratesMap: Map<string, MoneyValue>,
): Prisma.Decimal | null {
  const amount = new Prisma.Decimal(t.amount);
  if (t.currencyId === targetCurrencyId) return amount;
  const key = buildCacheKey(t.currencyId, targetCurrencyId, t.date);
  const rate = ratesMap.get(key);
  if (rate === undefined) return null;
  return amount.mul(rate);
}

async function loadRatesByPair(currencyIds: number[]): Promise<RatesByPair> {
  const rows = await db.exchangeRate.findMany({
    where: {
      baseCurrencyId: { in: currencyIds },
      quoteCurrencyId: { in: currencyIds },
    },
    orderBy: { rateDate: 'desc' },
    select: { baseCurrencyId: true, quoteCurrencyId: true, rateDate: true, rate: true },
  });

  const byPair: RatesByPair = new Map();
  for (const r of rows) {
    const pair = pairKey(r.baseCurrencyId, r.quoteCurrencyId);
    const list = byPair.get(pair) ?? [];
    list.push({ rateDate: r.rateDate, rate: r.rate });
    byPair.set(pair, list);
  }
  return byPair;
}

async function getCurrencyAliases(): Promise<Map<number, string>> {
  const nowMs = Date.now();
  if (currencyAliasCache && nowMs < currencyAliasCache.expiresAt) return currencyAliasCache.aliases;
  const currencies = await db.currency.findMany({ select: { id: true, alias: true } });
  const aliases = new Map<number, string>();
  for (const c of currencies) aliases.set(c.id, c.alias.toUpperCase());
  currencyAliasCache = { aliases, expiresAt: nowMs + CURRENCY_CACHE_TTL_MS };
  return aliases;
}

function findPivotId(aliases: Map<number, string>): number | null {
  for (const [id, alias] of aliases) {
    if (alias === PIVOT_ALIAS) return id;
  }
  return null;
}

/** Fetches base->quote for the UTC day of `date` and stores it at UTC midnight. Deduplicated. */
async function fetchAndStoreRate(
  baseCurrencyId: number,
  quoteCurrencyId: number,
  date: Date,
  aliases: Map<number, string>,
): Promise<Prisma.Decimal | null> {
  const baseAlias = aliases.get(baseCurrencyId);
  const quoteAlias = aliases.get(quoteCurrencyId);
  if (!baseAlias || !quoteAlias) return null;

  const rateDate = startOfUtcDay(date);
  const dayKey = toDateKey(rateDate);
  const fetchKey = `${baseAlias}->${quoteAlias}:${dayKey}`;
  const existingFetch = pendingFetches.get(fetchKey);
  if (existingFetch) return existingFetch;

  const fetchPromise = (async () => {
    try {
      const fetchedRate = await fetchHistoricalRate(baseAlias, quoteAlias, rateDate);
      if (!fetchedRate) {
        console.log(`[currency] API returned no rate for ${fetchKey}; using best stored rate if any.`);
        return null;
      }
      try {
        await db.exchangeRate.upsert({
          where: {
            baseCurrencyId_quoteCurrencyId_rateDate: { baseCurrencyId, quoteCurrencyId, rateDate },
          },
          update: { rate: fetchedRate },
          create: { baseCurrencyId, quoteCurrencyId, rate: fetchedRate, rateDate },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : err;
        console.warn('[currency] Failed to save fetched rate (continuing with it):', message);
      }
      return fetchedRate;
    } finally {
      pendingFetches.delete(fetchKey);
    }
  })();

  pendingFetches.set(fetchKey, fetchPromise);
  return fetchPromise;
}

/**
 * Fetches base->quote for the day: Frankfurter (ECB) first, then the CBR feed, which also covers
 * currencies the ECB does not publish (GEL, AMD, KZT, UAH, RUB).
 */
export async function fetchHistoricalRate(base: string, quote: string, date: Date): Promise<Prisma.Decimal | null> {
  const useCbr = CIS_CURRENCIES.includes(base) || CIS_CURRENCIES.includes(quote);

  if (!useCbr) {
    try {
      const dateStr = toDateKey(date);
      const url = `https://api.frankfurter.app/${dateStr}?from=${base}&to=${quote}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const rate = data.rates?.[quote];
        if (rate) return new Prisma.Decimal(rate);
      }
    } catch {
      console.warn('[currency] Frankfurter fetch failed, trying fallback...');
    }
  }

  try {
    const cbrData = await fetchCbrRateRecursive(date);
    if (!cbrData || !cbrData.Valute) return null;
    const valutes = cbrData.Valute;
    const baseValueRub = rubValue(valutes, base);
    const quoteValueRub = rubValue(valutes, quote);
    if (baseValueRub && quoteValueRub && !quoteValueRub.isZero()) {
      return baseValueRub.div(quoteValueRub);
    }
  } catch (e) {
    console.error('[currency] CBR fallback failed:', e);
  }

  return null;
}

type CbrValutes = Record<string, { Value: number; Nominal: number }>;

function rubValue(valutes: CbrValutes, currency: string): Prisma.Decimal | null {
  if (currency === 'RUB') return new Prisma.Decimal(1);
  const valute = valutes[currency];
  if (!valute) return null;
  const value = new Prisma.Decimal(valute.Value);
  return value.div(valute.Nominal);
}

async function fetchCbrRateRecursive(date: Date, depth = 0): Promise<{ Valute?: CbrValutes } | null> {
  if (depth > 14) {
    console.warn(`[currency] CBR depth limit reached (${depth} days back).`);
    return null;
  }

  const dayKey = toDateKey(date);
  const path = dayKey.replace(/-/g, '/');
  const url = `https://www.cbr-xml-daily.ru/archive/${path}/daily_json.js`;

  try {
    const res = await fetch(url);
    if (res.ok) {
      return (await res.json()) as { Valute?: CbrValutes };
    }
    if (res.status === 404) {
      const prevDate = addUtcDays(date, -1);
      return fetchCbrRateRecursive(prevDate, depth + 1);
    }
    console.error(`[currency] CBR API returned ${res.status} for ${dayKey}`);
  } catch (e) {
    console.error(`[currency] CBR fetch error for ${dayKey}:`, e);
  }
  return null;
}
