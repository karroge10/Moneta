import { Prisma } from '@prisma/client';
import type { PerformanceDataPoint, TimePeriod } from '@/types/dashboard';
import {
  addUtcMonths,
  DAY_MS,
  endOfUtcDay,
  getUtcComparisonRange,
  getUtcPeriodRange,
  toDateKey,
  type DateRange,
} from './dates';
import { moneyToNumber, sumMoney } from './money';

/**
 * Period maths shared by the expenses and income endpoints: totals, trends, the performance
 * series, averages and the month-end prediction. All boundaries are UTC and all sums are exact;
 * items whose FX rate is missing are left out of every total and counted in missingRates.
 */

export type ConvertedItem = { date: Date; convertedMoney: Prisma.Decimal | null; rateMissing: boolean };

export type FlowSummary<T extends ConvertedItem> = {
  isMonthlyPeriod: boolean;
  selectedRange: DateRange;
  /** Items in the selected period, in input order. */
  selected: T[];
  total: number;
  trend: number;
  trendSkipped: boolean;
  performance: PerformanceDataPoint[];
  performanceTrend: number;
  averageMonthly: number;
  averageDaily: number;
  averageTrend: number;
  averageTrendSkipped: boolean;
  nextMonthPrediction: number;
  missingRates: number;
};

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** `transactions` must cover at least the selected period, the comparison period and last year. */
export function summarizeFlow<T extends ConvertedItem>(transactions: T[], period: TimePeriod, now: Date): FlowSummary<T> {
  const isMonthlyPeriod = period === 'This Month' || period === 'Last Month';
  const selectedRange = getUtcPeriodRange(period, now);
  const comparisonRange = getFlowComparisonRange(period, now);

  const selected = transactions.filter((t) => isInRange(t.date, selectedRange));
  const comparison = comparisonRange ? transactions.filter((t) => isInRange(t.date, comparisonRange)) : [];
  const total = totalOf(selected);
  const comparisonTotal = totalOf(comparison);

  const skipComparison = period === 'This Year' && now.getUTCMonth() === 0;
  const allTime = period === 'All Time';
  let trend = 0;
  if (allTime) {
    trend = firstToLastMonthChange(selected);
  } else if (!skipComparison && comparisonRange && comparisonTotal > 0) {
    trend = percentChange(total, comparisonTotal);
  }
  const trendSkipped = skipComparison || (!allTime && (!comparisonRange || comparisonTotal === 0));

  const performance = buildPerformanceSeries(selected, isMonthlyPeriod ? 'day' : 'month');
  const performanceTrend = seriesTrend(performance);

  const thisYearRange = getUtcPeriodRange('This Year', now);
  const lastYearRange = getUtcPeriodRange('Last Year', now);
  const thisYear = transactions.filter((t) => isInRange(t.date, thisYearRange));
  const lastYear = transactions.filter((t) => isInRange(t.date, lastYearRange));
  const monthsElapsedThisYear = now.getUTCMonth() + 1;
  const avgMonthlyThisYear = totalOf(thisYear) / monthsElapsedThisYear;
  const avgMonthlyLastYear = totalOf(lastYear) / 12;
  const averageTrend = avgMonthlyLastYear > 0 ? percentChange(avgMonthlyThisYear, avgMonthlyLastYear) : 0;

  let averageMonthly: number;
  let averageDaily = 0;
  if (isMonthlyPeriod) {
    const periodMs = selectedRange.end.getTime() - selectedRange.start.getTime();
    // range.end is the last millisecond of the period, so ceil gives the exact day count
    const daysInPeriod = Math.ceil(periodMs / DAY_MS);
    averageDaily = total / daysInPeriod;
    averageMonthly = total;
  } else {
    averageMonthly = total / (performance.length || 1);
  }

  let nextMonthPrediction = 0;
  if (period === 'This Month') {
    const daysElapsed = now.getUTCDate();
    nextMonthPrediction = total > 0 ? (total / daysElapsed) * daysInUtcMonth(now) : comparisonTotal;
  }

  return {
    isMonthlyPeriod,
    selectedRange,
    selected,
    total,
    trend,
    trendSkipped,
    performance,
    performanceTrend,
    averageMonthly,
    averageDaily,
    averageTrend,
    averageTrendSkipped: avgMonthlyLastYear === 0,
    nextMonthPrediction,
    missingRates: selected.filter((t) => t.rateMissing).length,
  };
}

/**
 * Range compared against the selected period. "This Year" is compared year to date: last year
 * from Jan 1 up to the same calendar day, so a partial year is not set against a full one.
 */
export function getFlowComparisonRange(period: TimePeriod, now: Date): DateRange | null {
  if (period !== 'This Year') return getUtcComparisonRange(period, now);
  const sameDayLastYear = addUtcMonths(now, -12);
  const start = new Date(Date.UTC(sameDayLastYear.getUTCFullYear(), 0, 1));
  return { start, end: endOfUtcDay(sameDayLastYear) };
}

/** Exact per-key totals, in first-seen key order. Items without a converted amount are skipped. */
export function sumByKey<T extends { convertedMoney: Prisma.Decimal | null }>(
  items: T[],
  keyOf: (item: T) => string,
): Map<string, Prisma.Decimal> {
  const totals = new Map<string, Prisma.Decimal>();
  for (const item of items) {
    if (!item.convertedMoney) continue;
    const key = keyOf(item);
    const current = totals.get(key) ?? new Prisma.Decimal(0);
    totals.set(key, current.plus(item.convertedMoney));
  }
  return totals;
}

/** Daily ("Jan 5") or monthly ("Jan 2026") totals in chronological order. */
export function buildPerformanceSeries(items: ConvertedItem[], granularity: 'day' | 'month'): PerformanceDataPoint[] {
  const keyOf = granularity === 'day' ? (t: ConvertedItem) => toDateKey(t.date) : (t: ConvertedItem) => monthKey(t.date);
  const totals = sumByKey(items, keyOf);
  const keys = [...totals.keys()].sort();
  return keys.map((key) => {
    const bucketStart = new Date(granularity === 'day' ? key : `${key}-01`);
    const label = granularity === 'day' ? formatDayWithMonth(bucketStart) : formatMonthShort(bucketStart);
    const total = totals.get(key)!;
    return { date: label, value: moneyToNumber(total) };
  });
}

/** Whole-percent change from `previous` to `current`; 100 when starting from zero, 0 when both are 0. */
export function percentChange(current: number, previous: number): number {
  if (previous > 0) return Math.round(((current - previous) / previous) * 100);
  return current > 0 ? 100 : 0;
}

/** "January 2026" */
export function formatMonthLong(date: Date): string {
  return `${MONTHS_LONG[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function isInRange(date: Date, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

/** Exact total; items with a missing rate are excluded. Kept DB-free so it stays unit-testable. */
function totalOf(items: ConvertedItem[]): number {
  const known: Prisma.Decimal[] = [];
  for (const item of items) {
    if (item.convertedMoney) known.push(item.convertedMoney);
  }
  const total = sumMoney(known);
  return moneyToNumber(total);
}

function firstToLastMonthChange(items: ConvertedItem[]): number {
  const monthly = buildPerformanceSeries(items, 'month');
  if (monthly.length < 2) return 0;
  const first = monthly[0].value;
  const last = monthly[monthly.length - 1].value;
  return percentChange(last, first);
}

function seriesTrend(series: PerformanceDataPoint[]): number {
  if (series.length === 0) return 0;
  const first = series[0].value;
  const last = series[series.length - 1].value;
  return percentChange(last, first);
}

function monthKey(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}`;
}

function daysInUtcMonth(date: Date): number {
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return lastDay.getUTCDate();
}

function formatMonthShort(date: Date): string {
  return `${MONTHS_SHORT[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function formatDayWithMonth(date: Date): string {
  return `${MONTHS_SHORT[date.getUTCMonth()]} ${date.getUTCDate()}`;
}
