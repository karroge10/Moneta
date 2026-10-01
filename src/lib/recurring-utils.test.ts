import { describe, expect, it } from 'vitest';
import { computeNextDueDate } from './recurring-utils';

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe('computeNextDueDate', () => {
  it('adds days and weeks', () => {
    expect(computeNextDueDate(utc(2026, 1, 30), 'day', 3)).toEqual(utc(2026, 2, 2));
    expect(computeNextDueDate(utc(2026, 1, 1), 'week', 2)).toEqual(utc(2026, 1, 15));
  });

  it('adds months, clamping to the end of a shorter month', () => {
    expect(computeNextDueDate(utc(2026, 1, 15), 'month', 1)).toEqual(utc(2026, 2, 15));
    expect(computeNextDueDate(utc(2026, 1, 31), 'month', 1)).toEqual(utc(2026, 2, 28));
    expect(computeNextDueDate(utc(2028, 1, 31), 'month', 1)).toEqual(utc(2028, 2, 29));
    expect(computeNextDueDate(utc(2026, 11, 30), 'month', 3)).toEqual(utc(2027, 2, 28));
  });

  it('adds years, clamping Feb 29', () => {
    expect(computeNextDueDate(utc(2028, 2, 29), 'year', 1)).toEqual(utc(2029, 2, 28));
    expect(computeNextDueDate(utc(2026, 6, 1), 'year', 2)).toEqual(utc(2028, 6, 1));
  });

  it('keeps the time of day', () => {
    const from = new Date(Date.UTC(2026, 0, 10, 9, 30));
    expect(computeNextDueDate(from, 'month', 1)).toEqual(new Date(Date.UTC(2026, 1, 10, 9, 30)));
  });
});
