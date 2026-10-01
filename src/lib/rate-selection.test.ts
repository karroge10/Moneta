import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  isStale,
  pairKey,
  pickBetter,
  resolveRateFromPairs,
  selectRateForDate,
  type RatesByPair,
  type StoredRate,
} from './rate-selection';
import { TtlCache } from './ttl-cache';

const USD = 1;
const EUR = 2;
const RUB = 3;

function rate(day: string, value: string): StoredRate {
  return { rateDate: new Date(`${day}T00:00:00.000Z`), rate: new Prisma.Decimal(value) };
}

function at(day: string): Date {
  return new Date(`${day}T12:00:00.000Z`);
}

describe('selectRateForDate', () => {
  const ratesDesc = [rate('2026-03-10', '1.3'), rate('2026-03-05', '1.2'), rate('2026-03-01', '1.1')];

  it('picks the nearest rate on or before the date', () => {
    const selected = selectRateForDate(ratesDesc, at('2026-03-07'));
    expect(selected?.rate.toString()).toBe('1.2');
    expect(selected?.onOrBefore).toBe(true);
  });

  it('uses a rate on the same day', () => {
    expect(selectRateForDate(ratesDesc, at('2026-03-10'))?.rate.toString()).toBe('1.3');
  });

  it('falls back to the nearest later rate only when none is before', () => {
    const selected = selectRateForDate(ratesDesc, at('2026-02-01'));
    expect(selected?.rate.toString()).toBe('1.1');
    expect(selected?.onOrBefore).toBe(false);
  });

  it('returns null for no rates instead of guessing 1', () => {
    expect(selectRateForDate([], at('2026-03-07'))).toBeNull();
  });
});

describe('resolveRateFromPairs', () => {
  it('returns exactly 1 for the same currency', () => {
    const r = resolveRateFromPairs(new Map(), EUR, EUR, at('2026-03-07'), USD);
    expect(r?.rate.toString()).toBe('1');
  });

  it('inverts the reverse pair', () => {
    const byPair: RatesByPair = new Map([[pairKey(USD, EUR), [rate('2026-03-05', '0.8')]]]);
    const r = resolveRateFromPairs(byPair, EUR, USD, at('2026-03-07'), USD);
    expect(r?.rate.toString()).toBe('1.25');
  });

  it('chains through the pivot when no direct rate exists', () => {
    const byPair: RatesByPair = new Map([
      [pairKey(USD, EUR), [rate('2026-03-05', '0.8')]],
      [pairKey(USD, RUB), [rate('2026-03-06', '80')]],
    ]);
    const r = resolveRateFromPairs(byPair, EUR, RUB, at('2026-03-07'), USD);
    expect(r?.rate.toString()).toBe('100');
    expect(r?.rateDate.toISOString()).toBe('2026-03-05T00:00:00.000Z');
    expect(r?.onOrBefore).toBe(true);
  });

  it('prefers a fresh pivot chain over a stale direct rate', () => {
    const byPair: RatesByPair = new Map([
      [pairKey(EUR, RUB), [rate('2026-01-01', '90')]],
      [pairKey(USD, EUR), [rate('2026-03-06', '0.8')]],
      [pairKey(USD, RUB), [rate('2026-03-06', '80')]],
    ]);
    const r = resolveRateFromPairs(byPair, EUR, RUB, at('2026-03-07'), USD);
    expect(r?.rate.toString()).toBe('100');
  });

  it('returns null when nothing is known', () => {
    expect(resolveRateFromPairs(new Map(), EUR, RUB, at('2026-03-07'), USD)).toBeNull();
  });
});

describe('isStale and pickBetter', () => {
  it('treats missing, after-date, and 6+ day old rates as stale', () => {
    const date = at('2026-03-10');
    expect(isStale(null, date)).toBe(true);
    expect(isStale({ ...rate('2026-03-11', '1'), onOrBefore: false }, date)).toBe(true);
    expect(isStale({ ...rate('2026-03-04', '1'), onOrBefore: true }, date)).toBe(true);
    expect(isStale({ ...rate('2026-03-08', '1'), onOrBefore: true }, date)).toBe(false);
  });

  it('prefers on-or-before, then the closest date', () => {
    const before = { ...rate('2026-03-01', '1'), onOrBefore: true };
    const laterBefore = { ...rate('2026-03-05', '2'), onOrBefore: true };
    const after = { ...rate('2026-03-11', '3'), onOrBefore: false };
    expect(pickBetter(before, after)).toBe(before);
    expect(pickBetter(before, laterBefore)).toBe(laterBefore);
    expect(pickBetter(null, after)).toBe(after);
  });
});

describe('TtlCache', () => {
  it('expires entries and evicts the oldest when full', () => {
    const cache = new TtlCache<number>(1000, 2);
    cache.set('a', 1, 0);
    cache.set('b', 2, 0);
    cache.set('c', 3, 0);
    expect(cache.get('a', 0)).toBeUndefined();
    expect(cache.get('b', 0)).toBe(2);
    expect(cache.get('c', 999)).toBe(3);
    expect(cache.get('c', 1000)).toBeUndefined();
  });
});
