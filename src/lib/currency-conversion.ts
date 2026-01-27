import { Prisma } from '@prisma/client';
import { db } from './db';

type RateCacheKey = string;

const rateCache = new Map<RateCacheKey, number>();

function buildCacheKey(baseId: number, quoteId: number, date: Date) {
  const dayKey = date.toISOString().split('T')[0];
  return `${baseId}:${quoteId}:${dayKey}`;
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




