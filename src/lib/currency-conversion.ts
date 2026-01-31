import { Prisma } from '@prisma/client';
import { db } from './db';

type RateCacheKey = string;

const rateCache = new Map<RateCacheKey, number>();

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

async function findRate(
  baseCurrencyId: number,
  quoteCurrencyId: number,
  date: Date,
): Promise<number | null> {
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

  if (rateRecord) {
    return Number(rateRecord.rate);
  }

  // Fallback: latest rate regardless of date
  const latestRate = await db.exchangeRate.findFirst({
    where: {
      baseCurrencyId,
      quoteCurrencyId,
    },
    orderBy: {
      rateDate: 'desc',
    },
  });

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




