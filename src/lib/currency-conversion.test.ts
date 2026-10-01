import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

vi.mock('./db', () => ({ db: {} }));

import {
  buildCacheKey,
  convertTransactionsWithRatesMap,
  countMissingRates,
  sumConverted,
} from './currency-conversion';

const EUR = 2;
const USD = 1;
const day = new Date('2026-03-05T15:00:00.000Z');

describe('convertTransactionsWithRatesMap', () => {
  const key = buildCacheKey(EUR, USD, day);
  const ratesMap = new Map<string, Prisma.Decimal>([[key, new Prisma.Decimal('1.1')]]);
  const txs = [
    { amount: new Prisma.Decimal('10.10'), currencyId: EUR, date: day },
    { amount: new Prisma.Decimal('5'), currencyId: USD, date: day },
    { amount: new Prisma.Decimal('7'), currencyId: 99, date: day },
  ];
  const converted = convertTransactionsWithRatesMap(txs, USD, ratesMap);

  it('converts exactly and leaves same-currency amounts as is', () => {
    expect(converted[0].convertedMoney?.toString()).toBe('11.11');
    expect(converted[1].convertedMoney?.toString()).toBe('5');
  });

  it('marks a missing rate instead of using 1', () => {
    expect(converted[2].convertedMoney).toBeNull();
    expect(converted[2].rateMissing).toBe(true);
    expect(converted[2].convertedAmount).toBe(0);
  });

  it('sums only converted amounts and counts the missing ones', () => {
    expect(sumConverted(converted).toString()).toBe('16.11');
    expect(countMissingRates(converted)).toBe(1);
  });
});

describe('buildCacheKey', () => {
  it('keys by UTC day', () => {
    const late = new Date('2026-03-05T23:59:59.999Z');
    expect(buildCacheKey(EUR, USD, late)).toBe(buildCacheKey(EUR, USD, day));
  });
});
