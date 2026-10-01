import { describe, expect, it } from 'vitest';
import { formatDisplayDate, parseDisplayDate } from './transaction-utils';
import { recurringCreateSchema, transactionUpdateSchema } from './validation';

describe('parseDisplayDate', () => {
  it('parses display dates as UTC midnight', () => {
    expect(parseDisplayDate('Jan 5th 2026')?.toISOString()).toBe('2026-01-05T00:00:00.000Z');
    expect(parseDisplayDate('August 21st 2025')?.toISOString()).toBe('2025-08-21T00:00:00.000Z');
  });

  it('parses ISO dates and rejects garbage', () => {
    expect(parseDisplayDate('2026-03-01')?.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(parseDisplayDate('not a date')).toBeNull();
  });

  it('round-trips with formatDisplayDate', () => {
    const date = new Date(Date.UTC(2026, 1, 22));
    const text = formatDisplayDate(date);
    expect(text).toBe('Feb 22nd 2026');
    expect(parseDisplayDate(text)).toEqual(date);
  });
});

describe('schemas', () => {
  it('rejects an unknown recurring type', () => {
    const result = recurringCreateSchema.safeParse({
      name: 'Rent',
      amount: 100,
      type: 'transfer',
      startDate: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('coerces a numeric string id and rejects a bad amount', () => {
    const ok = transactionUpdateSchema.safeParse({ id: '12', name: 'x', date: '2026-01-01', amount: '-5.5' });
    expect(ok.success && ok.data.id).toBe(12);
    const bad = transactionUpdateSchema.safeParse({ id: 12, name: 'x', date: '2026-01-01', amount: 'abc' });
    expect(bad.success).toBe(false);
  });
});
