import type { TimePeriod } from '@/types/dashboard';

/**
 * UTC date helpers. Every server-side boundary (period ranges, rate dates, cache keys) is computed
 * in UTC so results do not depend on the timezone of the machine running the server.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

export type DateRange = { start: Date; end: Date };

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Last millisecond of the UTC day that contains `date`. */
export function endOfUtcDay(date: Date): Date {
  const nextDay = addUtcDays(startOfUtcDay(date), 1);
  return new Date(nextDay.getTime() - 1);
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Adds calendar months in UTC, clamping the day (Jan 31 + 1 month = Feb 28/29). */
export function addUtcMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDayOfTarget = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(date.getUTCDate(), lastDayOfTarget);
  return new Date(
    Date.UTC(
      year,
      month,
      day,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

/** YYYY-MM-DD of the UTC day. */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** UTC range for a dashboard period. Ends are inclusive (last millisecond). */
export function getUtcPeriodRange(period: TimePeriod, now: Date): DateRange {
  const thisMonth = startOfUtcMonth(now);
  const thisYear = startOfUtcYear(now);

  switch (period) {
    case 'Last Month': {
      const lastMonth = addUtcMonths(thisMonth, -1);
      return monthsRange(lastMonth, 1);
    }
    case 'This Year':
      return monthsRange(thisYear, 12);
    case 'Last Year': {
      const lastYear = addUtcMonths(thisYear, -12);
      return monthsRange(lastYear, 12);
    }
    case 'All Time': {
      const start = new Date(Date.UTC(2000, 0, 1));
      const farFuture = addUtcMonths(thisYear, 11 * 12);
      return { start, end: endBefore(farFuture) };
    }
    case 'This Month':
    default:
      return monthsRange(thisMonth, 1);
  }
}

/** UTC range of the period that the given period is compared against, or null for All Time. */
export function getUtcComparisonRange(period: TimePeriod, now: Date): DateRange | null {
  const thisMonth = startOfUtcMonth(now);
  const thisYear = startOfUtcYear(now);

  switch (period) {
    case 'This Month': {
      const lastMonth = addUtcMonths(thisMonth, -1);
      return monthsRange(lastMonth, 1);
    }
    case 'Last Month': {
      const twoMonthsAgo = addUtcMonths(thisMonth, -2);
      return monthsRange(twoMonthsAgo, 1);
    }
    case 'This Year': {
      const lastYear = addUtcMonths(thisYear, -12);
      return monthsRange(lastYear, 12);
    }
    case 'Last Year': {
      const twoYearsAgo = addUtcMonths(thisYear, -24);
      return monthsRange(twoYearsAgo, 12);
    }
    default:
      return null;
  }
}

function startOfUtcYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

function monthsRange(start: Date, months: number): DateRange {
  const next = addUtcMonths(start, months);
  return { start, end: endBefore(next) };
}

function endBefore(date: Date): Date {
  return new Date(date.getTime() - 1);
}
