import { Prisma } from '@prisma/client';
import { db } from './db';

type RateCacheKey = string;

const rateCache = new Map<RateCacheKey, number>();
// Cache for in-flight API requests to prevent duplicate fetches
const pendingFetches = new Map<string, Promise<number | null>>();

export function buildCacheKey(baseId: number, quoteId: number, date: Date) {
  const dayKey = date.toISOString().split('T')[0];
  return `${baseId}:${quoteId}:${dayKey}`;
}

/** Find latest rate at or before date from a descending-sorted list of { rateDate, rate }. */
function rateAtDate(
  rates: { rateDate: Date; rate: unknown }[],
  date: Date,
): number | null {
  for (const r of rates) {
    if (r.rateDate <= date) return Number(r.rate);
  }
  return rates.length > 0 ? Number(rates[rates.length - 1].rate) : null;
}

// Helper to get currency alias
async function getCurrencyAlias(id: number): Promise<string | null> {
  const c = await db.currency.findUnique({ where: { id } });
  return c?.alias || null;
}

// Fetch rate from Central Bank of Russia Archive (Excellent for RUB history)
async function fetchCbrRateRecursive(date: Date, depth = 0): Promise<any | null> {
  if (depth > 14) {
    console.warn(`[currency] CBR depth limit reached (${depth} days back).`);
    return null;
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const url = `https://www.cbr-xml-daily.ru/archive/${yyyy}/${mm}/${dd}/daily_json.js`;

  try {
    const res = await fetch(url);
    if (res.ok) {
      console.log(`[currency] Fetched CBR data for ${yyyy}-${mm}-${dd} (depth: ${depth})`);
      return await res.json();
    } else if (res.status === 404) {
      // Likely weekend/holiday, try previous day
      const prevDate = new Date(date);
      prevDate.setDate(date.getDate() - 1);
      return fetchCbrRateRecursive(prevDate, depth + 1);
    } else {
      console.error(`[currency] CBR API returned ${res.status} for ${yyyy}-${mm}-${dd}`);
    }
  } catch (e) {
    console.error(`[currency] CBR fetch error for ${yyyy}-${mm}-${dd}:`, e);
  }
  return null;
}

async function fetchHistoricalRate(
  baseAlias: string,
  quoteAlias: string,
  date: Date
): Promise<number | null> {
  const base = baseAlias.toUpperCase();
  const quote = quoteAlias.toUpperCase();

  // 1. Try Frankfurter (Good for EUR, USD, GBP, etc. - fails for RUB since 2022)
  // Only use if NEITHER is RUB/BYN/KZT (CIS currencies best served by CBR)
  const cisCurrencies = ['RUB', 'BYN', 'KZT', 'AMD', 'KGS'];
  const useCbr = cisCurrencies.includes(base) || cisCurrencies.includes(quote);

  if (!useCbr) {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const url = `https://api.frankfurter.app/${dateStr}?from=${base}&to=${quote}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const rate = data.rates?.[quote];
        if (rate) return Number(rate);
      }
    } catch (e) {
      console.warn('[currency] Frankfurter fetch failed, trying fallback...');
    }
  }

  // 2. Fallback: Central Bank of Russia (CBR)
  // Always returns rates relative to RUB.
  try {
    const cbrData = await fetchCbrRateRecursive(date);
    if (!cbrData || !cbrData.Valute) return null;

    // Helper to get value in RUB
    // If currency is RUB, value is 1
    const getRubValue = (curr: string) => {
      if (curr === 'RUB') return 1;
      const valute = cbrData.Valute[curr];
      if (!valute) return null;
      return valute.Value / valute.Nominal;
    };

    const baseValueRub = getRubValue(base); // e.g. USD -> 90.5
    const quoteValueRub = getRubValue(quote); // e.g. EUR -> 98.2

    if (baseValueRub && quoteValueRub) {
      // Cross rate: (Base in RUB) / (Quote in RUB)
      // e.g. USD -> EUR = (90.5) / (98.2) = 0.92
      // e.g. USD -> RUB = (90.5) / (1) = 90.5
      // e.g. RUB -> USD = (1) / (90.5) = 0.011
      const rate = baseValueRub / quoteValueRub;
      console.log(`[currency] Calculated cross-rate via CBR: ${base}->${quote} = ${rate}`);
      return rate;
    }
  } catch (e) {
    console.error('[currency] CBR fallback failed:', e);
  }

  return null;
}

async function findRate(
  baseCurrencyId: number,
  quoteCurrencyId: number,
  date: Date,
): Promise<number | null> {
  // 1. Try finding an exact or close historical rate in DB
  const rateRecord = await db.exchangeRate.findFirst({
    where: {
      baseCurrencyId,
      quoteCurrencyId,
      rateDate: {
        lte: date,
      },
    },
    orderBy: {
      rateDate: 'desc',
    },
  });

  // Check if the found rate is "fresh enough" (e.g. within 2 days)
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  if (rateRecord) {
    const diff = date.getTime() - rateRecord.rateDate.getTime();
    // If within 5 days (relaxed for holidays), accept it.
    if (diff < 6 * ONE_DAY_MS) {
      // console.log(`[currency] Found valid rate in DB: ID ${rateRecord.id} for date ${rateRecord.rateDate.toISOString().split('T')[0]}`);
      return Number(rateRecord.rate);
    }
  }

  // 2. If not found or stale, try fetching from API (Historical)
  // Only if date is in the past (not future)
  if (date < new Date()) {
    const baseAlias = await getCurrencyAlias(baseCurrencyId);
    const quoteAlias = await getCurrencyAlias(quoteCurrencyId);

    if (baseAlias && quoteAlias) {
      // Create a unique key for this fetch to prevent duplicate API calls
      const fetchKey = `${baseAlias}->${quoteAlias}:${date.toISOString().split('T')[0]}`;

      // Check if there's already a pending fetch for this exact rate
      // Use .get() instead of .has() to make this atomic
      const existingFetch = pendingFetches.get(fetchKey);
      if (existingFetch) {
        console.log(`[currency] Waiting for pending fetch: ${fetchKey}`);
        return await existingFetch;
      }


      const fetchPromise = (async () => {
        console.log(`[currency] Attempting API fetch for ${baseAlias}->${quoteAlias} on ${date.toISOString().split('T')[0]}`);
        try {
          const fetchedRate = await fetchHistoricalRate(baseAlias, quoteAlias, date);
          if (fetchedRate) {
            // Store accurate historical rate using upsert to prevent race condition
            // Multiple concurrent requests may try to save the same rate, upsert handles this gracefully
            try {
              await db.exchangeRate.upsert({
                where: {
                  baseCurrencyId_quoteCurrencyId_rateDate: {
                    baseCurrencyId,
                    quoteCurrencyId,
                    rateDate: date,
                  },
                },
                update: {
                  rate: new Prisma.Decimal(fetchedRate),
                },
                create: {
                  baseCurrencyId,
                  quoteCurrencyId,
                  rate: new Prisma.Decimal(fetchedRate),
                  rateDate: date,
                },
              });
              console.log(`[currency] Fetched & Saved historical: ${baseAlias}->${quoteAlias} on ${date.toISOString().split('T')[0]} = ${fetchedRate}`);
            } catch (err) {
              // If upsert fails (e.g., due to race condition or DB issue), log but continue
              // The fetched rate is still valid and will be used for this conversion
              console.warn(`[currency] Failed to save rate to DB (continuing with fetched rate):`, err instanceof Error ? err.message : err);
            }
            return fetchedRate;
          } else {
            console.log(`[currency] API fetch failed or returned no data.`);
            return null;
          }
        } finally {
          // Clean up the pending fetch cache after completion
          pendingFetches.delete(fetchKey);
        }
      })();

      // Store the promise so concurrent requests can await it
      pendingFetches.set(fetchKey, fetchPromise);

      return await fetchPromise;
    }
  }

  // 3. Fallback: latest rate regardless of date (Existing logic, slightly risky but necessary as last resort)
  // Only use strict latest if we failed to fetch history.
  console.log(`[currency] Falling back to latest available rate.`);
  const latestRate = await db.exchangeRate.findFirst({
    where: {
      baseCurrencyId,
      quoteCurrencyId,
      rateDate: {
        lte: date,
      },
    },
    orderBy: {
      rateDate: 'desc',
    },
  });

  if (!latestRate) {
    // Absolute fallback to ANY rate
    const anyRate = await db.exchangeRate.findFirst({
      where: {
        baseCurrencyId,
        quoteCurrencyId,
      },
      orderBy: {
        rateDate: 'desc',
      },
    });
    return anyRate ? Number(anyRate.rate) : null;
  }

  return latestRate ? Number(latestRate.rate) : null;
}

export async function getConversionRate(
  baseCurrencyId: number,
  quoteCurrencyId: number,
  date: Date = new Date(),
): Promise<number> {
  if (baseCurrencyId === quoteCurrencyId) {
    return 1;
  }

  const cacheKey = buildCacheKey(baseCurrencyId, quoteCurrencyId, date);
  if (rateCache.has(cacheKey)) {
    return rateCache.get(cacheKey)!;
  }

  let rate = await findRate(baseCurrencyId, quoteCurrencyId, date);

  // Try reversed pair if direct rate missing
  if (rate === null) {
    const reverseRate = await findRate(quoteCurrencyId, baseCurrencyId, date);
    if (reverseRate) {
      rate = 1 / reverseRate;
    }
  }

  if (rate === null) {
    console.warn(
      `[currency] Missing exchange rate for ${baseCurrencyId} -> ${quoteCurrencyId} on ${date.toISOString()}. Falling back to 1.`,
    );
    rate = 1;
  }

  rateCache.set(cacheKey, rate);
  return rate;
}

/**
 * Preload all exchange rates needed for a set of transactions into a map (and the module cache).
 * Use with convertTransactionsWithRatesMap to convert without per-transaction DB hits.
 */
export async function preloadRatesMap(
  transactions: { currencyId: number; date: Date }[],
  targetCurrencyId: number,
): Promise<Map<string, number>> {
  const uniqueKeys = new Map<string, { currencyId: number; date: Date }>();
  for (const t of transactions) {
    if (t.currencyId === targetCurrencyId) continue;
    const key = buildCacheKey(t.currencyId, targetCurrencyId, t.date);
    if (!uniqueKeys.has(key)) uniqueKeys.set(key, { currencyId: t.currencyId, date: t.date });
  }
  const currencyIds = [...new Set([...uniqueKeys.values()].map((x) => x.currencyId))];
  if (currencyIds.length === 0) {
    const empty = new Map<string, number>();
    for (const t of transactions) {
      if (t.currencyId === targetCurrencyId) {
        empty.set(buildCacheKey(t.currencyId, targetCurrencyId, t.date), 1);
      }
    }
    return empty;
  }

  const orConditions: { baseCurrencyId: number; quoteCurrencyId: number }[] = [];
  for (const cid of currencyIds) {
    orConditions.push({ baseCurrencyId: cid, quoteCurrencyId: targetCurrencyId });
    if (cid !== targetCurrencyId) {
      orConditions.push({ baseCurrencyId: targetCurrencyId, quoteCurrencyId: cid });
    }
  }

  const allRates = await db.exchangeRate.findMany({
    where: { OR: orConditions },
    orderBy: { rateDate: 'desc' },
    select: { baseCurrencyId: true, quoteCurrencyId: true, rateDate: true, rate: true },
  });

  const byPair = new Map<string, { rateDate: Date; rate: unknown }[]>();
  for (const r of allRates) {
    const pair = `${r.baseCurrencyId},${r.quoteCurrencyId}`;
    if (!byPair.has(pair)) byPair.set(pair, []);
    byPair.get(pair)!.push({ rateDate: r.rateDate, rate: r.rate });
  }

  const map = new Map<string, number>();
  for (const [key, { currencyId, date }] of uniqueKeys) {
    const directPair = `${currencyId},${targetCurrencyId}`;
    const reversePair = `${targetCurrencyId},${currencyId}`;
    const directRates = byPair.get(directPair);
    let rate: number | null = directRates ? rateAtDate(directRates, date) : null;
    if (rate === null) {
      const revRates = byPair.get(reversePair);
      const rev = revRates ? rateAtDate(revRates, date) : null;
      rate = rev != null ? 1 / rev : 1;
    }
    map.set(key, rate);
    rateCache.set(key, rate);
  }
  for (const t of transactions) {
    if (t.currencyId === targetCurrencyId) {
      map.set(buildCacheKey(t.currencyId, targetCurrencyId, t.date), 1);
    }
  }
  return map;
}

/**
 * Convert transactions using a preloaded rates map (no DB calls). Use after preloadRatesMap.
 */
export function convertTransactionsWithRatesMap<T extends { amount: number; currencyId: number; date: Date }>(
  transactions: T[],
  targetCurrencyId: number,
  ratesMap: Map<string, number>,
): (T & { convertedAmount: number })[] {
  return transactions.map((t) => {
    const key = buildCacheKey(t.currencyId, targetCurrencyId, t.date);
    const rate = ratesMap.get(key) ?? (t.currencyId === targetCurrencyId ? 1 : 1);
    const converted = new Prisma.Decimal(t.amount).mul(new Prisma.Decimal(rate));
    return { ...t, convertedAmount: Number(converted.toString()) };
  });
}

export async function convertAmount(
  amount: number,
  baseCurrencyId: number,
  quoteCurrencyId: number,
  date: Date = new Date(),
): Promise<number> {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  const rate = await getConversionRate(baseCurrencyId, quoteCurrencyId, date);
  const converted = new Prisma.Decimal(amount).mul(new Prisma.Decimal(rate));
  return Number(converted.toString());
}

/**
 * Convert many transactions to a target currency with limited concurrency.
 * Prevents connection pool exhaustion when processing large batches.
 * Limit 3 ensures multiple parallel batches (e.g. dashboard) stay under pool size.
 */
const CONVERSION_CONCURRENCY_LIMIT = 3;

export async function convertTransactionsToTarget<T extends { amount: number; currencyId: number; date: Date }>(
  transactions: T[],
  targetCurrencyId: number,
): Promise<(T & { convertedAmount: number })[]> {
  const results: (T & { convertedAmount: number })[] = [];
  for (let i = 0; i < transactions.length; i += CONVERSION_CONCURRENCY_LIMIT) {
    const chunk = transactions.slice(i, i + CONVERSION_CONCURRENCY_LIMIT);
    const converted = await Promise.all(
      chunk.map(async (t) => {
        const convertedAmount = await convertAmount(
          t.amount,
          t.currencyId,
          targetCurrencyId,
          t.date,
        );
        return { ...t, convertedAmount };
      }),
    );
    results.push(...converted);
  }
  return results;
}

/**
 * Convert many transactions to a target currency using TODAY's exchange rate.
 * This is much faster than convertTransactionsToTarget because it doesn't fetch historical rates.
 * Use this for regular income/expense transactions where historical accuracy isn't critical.
 * For investments, use convertTransactionsToTarget to get accurate cost basis.
 */
export async function convertTransactionsToTargetSimple<T extends { amount: number; currencyId: number }>(
  transactions: T[],
  targetCurrencyId: number,
): Promise<(T & { convertedAmount: number })[]> {
  // Use today's date for all conversions
  const today = new Date();

  const results: (T & { convertedAmount: number })[] = [];
  for (let i = 0; i < transactions.length; i += CONVERSION_CONCURRENCY_LIMIT) {
    const chunk = transactions.slice(i, i + CONVERSION_CONCURRENCY_LIMIT);
    const converted = await Promise.all(
      chunk.map(async (t) => {
        const convertedAmount = await convertAmount(
          t.amount,
          t.currencyId,
          targetCurrencyId,
          today, // Always use today's rate
        );
        return { ...t, convertedAmount };
      }),
    );
    results.push(...converted);
  }
  return results;
}




