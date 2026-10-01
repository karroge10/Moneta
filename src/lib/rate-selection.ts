import { Prisma } from '@prisma/client';
import { DAY_MS } from './dates';

/**
 * Pure exchange-rate selection rules, shared by the single and batch conversion paths.
 *
 * Rule for a pair on a date:
 *   1. Use the nearest stored rate on or before the date.
 *   2. Only if no rate exists on or before the date, use the nearest rate after it (onOrBefore = false).
 *   3. A pair can be resolved directly (A->B), inverted (1 / B->A), or chained through a pivot
 *      currency (A->USD * USD->B), since the daily job stores only USD->X rates.
 * A selection is considered stale, and worth an API fetch, when it is not on or before the date or is
 * STALE_AFTER_DAYS or more older than the date. A missing rate is null; it is never guessed as 1.
 */

const STALE_AFTER_DAYS = 6;

export type StoredRate = { rateDate: Date; rate: Prisma.Decimal };

export type SelectedRate = {
  rate: Prisma.Decimal;
  /** Date of the stored rate used; for a chain, the oldest leg. */
  rateDate: Date;
  /** False when the rate comes from after the requested date (fallback rule 2). */
  onOrBefore: boolean;
};

/** Rates grouped by `pairKey(base, quote)`, each list sorted by rateDate descending. */
export type RatesByPair = Map<string, StoredRate[]>;

export function pairKey(baseId: number, quoteId: number): string {
  return `${baseId},${quoteId}`;
}

/** Picks the rate for `date` from a list sorted by rateDate descending. */
export function selectRateForDate(ratesDesc: StoredRate[], date: Date): SelectedRate | null {
  if (ratesDesc.length === 0) return null;
  for (const r of ratesDesc) {
    if (r.rateDate.getTime() <= date.getTime()) {
      return { rate: r.rate, rateDate: r.rateDate, onOrBefore: true };
    }
  }
  const earliest = ratesDesc[ratesDesc.length - 1];
  return { rate: earliest.rate, rateDate: earliest.rateDate, onOrBefore: false };
}

function invertRate(selected: SelectedRate): SelectedRate | null {
  if (selected.rate.isZero()) return null;
  const one = new Prisma.Decimal(1);
  return { ...selected, rate: one.div(selected.rate) };
}

function chainRates(first: SelectedRate, second: SelectedRate): SelectedRate {
  const older = first.rateDate.getTime() <= second.rateDate.getTime() ? first.rateDate : second.rateDate;
  return {
    rate: first.rate.mul(second.rate),
    rateDate: older,
    onOrBefore: first.onOrBefore && second.onOrBefore,
  };
}

/** Resolves base->quote on `date`: direct, inverted, or through `pivotId`. */
export function resolveRateFromPairs(
  byPair: RatesByPair,
  baseId: number,
  quoteId: number,
  date: Date,
  pivotId: number | null,
): SelectedRate | null {
  if (baseId === quoteId) {
    return { rate: new Prisma.Decimal(1), rateDate: date, onOrBefore: true };
  }

  const direct = resolveLeg(byPair, baseId, quoteId, date);
  if (pivotId === null || pivotId === baseId || pivotId === quoteId) return direct;
  if (direct && !isStale(direct, date)) return direct;

  const toPivot = resolveLeg(byPair, baseId, pivotId, date);
  const fromPivot = resolveLeg(byPair, pivotId, quoteId, date);
  if (!toPivot || !fromPivot) return direct;

  const chained = chainRates(toPivot, fromPivot);
  return pickBetter(direct, chained);
}

/** True when the selection should be refreshed from the API for `date`. */
export function isStale(selected: SelectedRate | null, date: Date): boolean {
  if (!selected || !selected.onOrBefore) return true;
  const ageMs = date.getTime() - selected.rateDate.getTime();
  return ageMs >= STALE_AFTER_DAYS * DAY_MS;
}

/** Of two candidates: on-or-before beats after; then the one closest to the date wins. */
export function pickBetter(a: SelectedRate | null, b: SelectedRate | null): SelectedRate | null {
  if (!a) return b;
  if (!b) return a;
  if (a.onOrBefore !== b.onOrBefore) return a.onOrBefore ? a : b;
  const aTime = a.rateDate.getTime();
  const bTime = b.rateDate.getTime();
  if (a.onOrBefore) return bTime > aTime ? b : a;
  return bTime < aTime ? b : a;
}

function resolveLeg(byPair: RatesByPair, baseId: number, quoteId: number, date: Date): SelectedRate | null {
  const directKey = pairKey(baseId, quoteId);
  const reverseKey = pairKey(quoteId, baseId);
  const directRates = byPair.get(directKey) ?? [];
  const reverseRates = byPair.get(reverseKey) ?? [];
  const direct = selectRateForDate(directRates, date);
  const reverse = selectRateForDate(reverseRates, date);
  const inverted = reverse ? invertRate(reverse) : null;
  return pickBetter(direct, inverted);
}
