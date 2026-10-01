import { describe, expect, it } from 'vitest';
import {
  addUtcDays,
  addUtcMonths,
  endOfUtcDay,
  getUtcComparisonRange,
  getUtcPeriodRange,
  startOfUtcDay,
  startOfUtcMonth,
  toDateKey,
} from './dates';

const iso = (d: Date) => d.toISOString();

describe('UTC day helpers', () => {
  it('startOfUtcDay and endOfUtcDay bound the UTC day', () => {
    const d = new Date('2026-03-05T23:30:00.000Z');
    expect(iso(startOfUtcDay(d))).toBe('2026-03-05T00:00:00.000Z');
    expect(iso(endOfUtcDay(d))).toBe('2026-03-05T23:59:59.999Z');
  });

  it('addUtcDays moves whole days', () => {
    const d = new Date('2026-02-28T00:00:00.000Z');
    expect(iso(addUtcDays(d, 1))).toBe('2026-03-01T00:00:00.000Z');
    expect(iso(addUtcDays(d, -30))).toBe('2026-01-29T00:00:00.000Z');
  });

  it('toDateKey uses the UTC date', () => {
    expect(toDateKey(new Date('2026-12-31T23:59:59.999Z'))).toBe('2026-12-31');
  });
});

describe('UTC month helpers', () => {
  it('startOfUtcMonth', () => {
    expect(iso(startOfUtcMonth(new Date('2026-07-19T10:00:00Z')))).toBe('2026-07-01T00:00:00.000Z');
  });

  it('addUtcMonths crosses years and clamps the day', () => {
    expect(iso(addUtcMonths(new Date('2026-01-31T00:00:00Z'), 1))).toBe('2026-02-28T00:00:00.000Z');
    expect(iso(addUtcMonths(new Date('2026-01-15T00:00:00Z'), -1))).toBe('2025-12-15T00:00:00.000Z');
    expect(iso(addUtcMonths(new Date('2024-01-31T00:00:00Z'), 1))).toBe('2024-02-29T00:00:00.000Z');
  });
});

describe('period ranges', () => {
  const now = new Date('2026-03-01T00:30:00Z');

  it('This Month covers the UTC month inclusively', () => {
    const r = getUtcPeriodRange('This Month', now);
    expect(iso(r.start)).toBe('2026-03-01T00:00:00.000Z');
    expect(iso(r.end)).toBe('2026-03-31T23:59:59.999Z');
  });

  it('Last Month and its comparison', () => {
    const r = getUtcPeriodRange('Last Month', now);
    expect(iso(r.start)).toBe('2026-02-01T00:00:00.000Z');
    expect(iso(r.end)).toBe('2026-02-28T23:59:59.999Z');
    const c = getUtcComparisonRange('Last Month', now);
    expect(iso(c!.start)).toBe('2026-01-01T00:00:00.000Z');
    expect(iso(c!.end)).toBe('2026-01-31T23:59:59.999Z');
  });

  it('This Year and Last Year', () => {
    const thisYear = getUtcPeriodRange('This Year', now);
    expect(iso(thisYear.start)).toBe('2026-01-01T00:00:00.000Z');
    expect(iso(thisYear.end)).toBe('2026-12-31T23:59:59.999Z');
    const lastYear = getUtcComparisonRange('This Year', now);
    expect(iso(lastYear!.start)).toBe('2025-01-01T00:00:00.000Z');
    expect(iso(lastYear!.end)).toBe('2025-12-31T23:59:59.999Z');
  });

  it('All Time has no comparison', () => {
    expect(getUtcComparisonRange('All Time', now)).toBeNull();
    expect(iso(getUtcPeriodRange('All Time', now).start)).toBe('2000-01-01T00:00:00.000Z');
  });
});
