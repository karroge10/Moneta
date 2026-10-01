import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { buildPerformanceSeries, getFlowComparisonRange, percentChange, summarizeFlow } from './flow-periods';

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

function item(date: Date, amount: number | null) {
  const convertedMoney = amount === null ? null : new Prisma.Decimal(amount);
  return { date, convertedMoney, rateMissing: amount === null };
}

describe('getFlowComparisonRange', () => {
  it('compares This Year with last year up to the same day', () => {
    const range = getFlowComparisonRange('This Year', utc(2026, 3, 15));
    expect(range?.start).toEqual(utc(2025, 1, 1));
    expect(range?.end.toISOString()).toBe('2025-03-15T23:59:59.999Z');
  });

  it('compares This Month with the previous month', () => {
    const range = getFlowComparisonRange('This Month', utc(2026, 3, 15));
    expect(range?.start).toEqual(utc(2026, 2, 1));
    expect(range?.end.toISOString()).toBe('2026-02-28T23:59:59.999Z');
  });
});

describe('buildPerformanceSeries', () => {
  it('buckets by month in chronological order, skipping missing rates', () => {
    const series = buildPerformanceSeries(
      [item(utc(2026, 2, 3), 5), item(utc(2025, 12, 31), 1.1), item(utc(2026, 2, 20), 2.2), item(utc(2026, 1, 1), null)],
      'month',
    );
    expect(series).toEqual([
      { date: 'Dec 2025', value: 1.1 },
      { date: 'Feb 2026', value: 7.2 },
    ]);
  });

  it('buckets by day', () => {
    const series = buildPerformanceSeries([item(utc(2026, 3, 2), 1), item(utc(2026, 3, 1), 2)], 'day');
    expect(series.map((p) => p.date)).toEqual(['Mar 1', 'Mar 2']);
  });
});

describe('percentChange', () => {
  it('handles zero baselines', () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(10, 0)).toBe(100);
    expect(percentChange(0, 0)).toBe(0);
  });
});

describe('summarizeFlow', () => {
  const now = new Date(Date.UTC(2026, 2, 10, 12));
  const transactions = [
    item(utc(2026, 3, 5), 100),
    item(utc(2026, 3, 6), null),
    item(utc(2026, 2, 10), 50),
    item(utc(2025, 6, 1), 1200),
  ];

  it('sums the selected month exactly and counts missing rates', () => {
    const summary = summarizeFlow(transactions, 'This Month', now);
    expect(summary.total).toBe(100);
    expect(summary.missingRates).toBe(1);
    expect(summary.trend).toBe(100);
    expect(summary.trendSkipped).toBe(false);
    expect(summary.isMonthlyPeriod).toBe(true);
  });

  it('predicts the month end from the daily pace', () => {
    const summary = summarizeFlow(transactions, 'This Month', now);
    expect(summary.nextMonthPrediction).toBeCloseTo((100 / 10) * 31);
  });

  it('compares yearly averages', () => {
    const summary = summarizeFlow(transactions, 'This Year', now);
    // This year: 150 over 3 months = 50; last year: 1200 / 12 = 100.
    expect(summary.averageTrend).toBe(-50);
    expect(summary.averageTrendSkipped).toBe(false);
  });
});
