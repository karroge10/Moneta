import { Prisma } from '@prisma/client';
import { db } from './db';

type RateCacheKey = string;

const rateCache = new Map<RateCacheKey, number>();

const pendingFetches = new Map<string, Promise<number | null>>();

export function buildCacheKey(baseId: number, quoteId: number, date: Date) {
  const dayKey = date.toISOString().split('T')[0];
  return `${baseId}:${quoteId}:${dayKey}`;
}


function rateAtDate(
  rates: { rateDate: Date; rate: unknown }[],
  date: Date,
): number | null {
  for (const r of rates) {
    if (r.rateDate <= date) return Number(r.rate);
  }
  return rates.length > 0 ? Number(rates[rates.length - 1].rate) : null;
}


async function getCurrencyAlias(id: number): Promise<string | null> {
  const c = await db.currency.findUnique({ where: { id } });
  return c?.alias || null;
}


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

  
  
  try {
    const cbrData = await fetchCbrRateRecursive(date);
    if (!cbrData || !cbrData.Valute) return null;

    
    
    const getRubValue = (curr: string) => {
      if (curr === 'RUB') return 1;
      const valute = cbrData.Valute[curr];
      if (!valute) return null;
      return valute.Value / valute.Nominal;
    };

    const baseValueRub = getRubValue(base); 
    const quoteValueRub = getRubValue(quote); 

    if (baseValueRub && quoteValueRub) {
      
      
      
      
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

  
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  if (rateRecord) {
    const diff = date.getTime() - rateRecord.rateDate.getTime();
    
    if (diff < 6 * ONE_DAY_MS) {
      
      return Number(rateRecord.rate);
    }
  }

  
  
  if (date < new Date()) {
    const baseAlias = await getCurrencyAlias(baseCurrencyId);
    const quoteAlias = await getCurrencyAlias(quoteCurrencyId);

    if (baseAlias && quoteAlias) {
      
      const fetchKey = `${baseAlias}->${quoteAlias}:${date.toISOString().split('T')[0]}`;

      
      
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
              
              
              console.warn(`[currency] Failed to save rate to DB (continuing with fetched rate):`, err instanceof Error ? err.message : err);
            }
            return fetchedRate;
          } else {
            console.log(`[currency] API fetch failed or returned no data.`);
            return null;
          }
        } finally {
          
          pendingFetches.delete(fetchKey);
        }
      })();

      
      pendingFetches.set(fetchKey, fetchPromise);

      return await fetchPromise;
    }
  }

  
  
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


export async function preloadRatesMap(
  transactions: { currencyId: number; date: Date }[],
  targetCurrencyId: number,
): Promise<Map<string, number>> {
  const uniqueKeys = new Map<string, { currencyId: number; date: Date }>();
  const map = new Map<string, number>();
  
  for (const t of transactions) {
    const key = buildCacheKey(t.currencyId, targetCurrencyId, t.date);
    if (t.currencyId === targetCurrencyId) {
      map.set(key, 1);
      continue;
    }
    
    if (rateCache.has(key)) {
      map.set(key, rateCache.get(key)!);
      continue;
    }

    if (!uniqueKeys.has(key)) uniqueKeys.set(key, { currencyId: t.currencyId, date: t.date });
  }

  if (uniqueKeys.size === 0) {
    return map;
  }

  const currencyIds = [...new Set([...uniqueKeys.values()].map((x) => x.currencyId))];


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

  return map;
}


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


export async function convertTransactionsToTargetSimple<T extends { amount: number; currencyId: number }>(
  transactions: T[],
  targetCurrencyId: number,
): Promise<(T & { convertedAmount: number })[]> {
  
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
          today, 
        );
        return { ...t, convertedAmount };
      }),
    );
    results.push(...converted);
  }
  return results;
}




