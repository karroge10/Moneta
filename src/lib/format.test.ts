import { describe, expect, it } from 'vitest';
import { formatDate, formatDecimal, formatMoney, formatPercent, formatQuantity, parseDate } from '@/lib/format';
import { formatCompactNumber, formatNumber, formatPercentage, formatSmartNumber } from '@/lib/utils';
import { formatDateForDisplay, formatDateToInput } from '@/lib/dateFormatting';

describe('formatMoney', () => {
  it('uses Intl currency style for ISO codes', () => {
    expect(formatMoney(1234.5, 'USD')).toBe('$1,234.50');
    expect(formatMoney(-1234.5, 'USD')).toBe('-$1,234.50');
  });

  it('prefixes a raw symbol and keeps the minus in front', () => {
    expect(formatMoney(1234.5, '₼')).toBe('₼1,234.50');
    expect(formatMoney(-5, '₼')).toBe('-₼5.00');
  });

  it('shows a plus sign when asked', () => {
    expect(formatMoney(10, 'USD', { sign: 'exceptZero' })).toBe('+$10.00');
    expect(formatMoney(10, '$', { sign: 'always' })).toBe('+$10.00');
    expect(formatMoney(0, '$', { sign: 'exceptZero' })).toBe('$0.00');
  });

  it('supports fixed decimals and compact notation', () => {
    expect(formatMoney(1234.5, 'USD', { decimals: 0 })).toBe('$1,235');
    expect(formatMoney(1_250_000, 'USD', { compact: true })).toBe('$1.3M');
  });

  it('respects the locale option', () => {
    const formatted = formatMoney(1234.5, 'EUR', { locale: 'de-DE' });
    expect(formatted.replace(/\s/g, ' ')).toBe('1.234,50 €');
  });
});

describe('formatPercent', () => {
  it('takes values in percent units', () => {
    expect(formatPercent(12.5)).toBe('12.50%');
    expect(formatPercent(-3.456, { decimals: 1 })).toBe('-3.5%');
  });

  it('adds a sign for gains when signed', () => {
    expect(formatPercent(4, { signed: true })).toBe('+4.00%');
    expect(formatPercent(-4, { signed: true })).toBe('-4.00%');
  });
});

describe('formatQuantity', () => {
  it('keeps precision for small holdings and drops trailing zeros', () => {
    expect(formatQuantity(0.00012345)).toBe('0.00012345');
    expect(formatQuantity(12)).toBe('12');
    expect(formatQuantity(1234.56789)).toBe('1,234.5679');
  });
});

describe('formatDate', () => {
  const date = new Date(2026, 2, 5, 12);

  it('formats presets', () => {
    expect(formatDate(date)).toBe('Mar 5, 2026');
    expect(formatDate(date, 'monthYear')).toBe('Mar 2026');
    expect(formatDate(date, 'dayMonth')).toBe('Mar 5');
    expect(formatDate(date, 'ordinal')).toBe('Mar 5th 2026');
  });

  it('returns empty string for invalid input', () => {
    expect(formatDate('not a date')).toBe('');
    expect(parseDate('')).toBeNull();
  });

  it('parses legacy ordinal strings', () => {
    expect(parseDate('Mar 11th 2026')?.getDate()).toBe(11);
  });
});

describe('legacy helpers delegate with unchanged output', () => {
  it('utils number helpers', () => {
    expect(formatNumber(1234.5)).toBe('1,234.50');
    expect(formatNumber(1234.5, false)).toBe('1,235');
    expect(formatSmartNumber(1.23456789)).toBe('1.23456789');
    expect(formatSmartNumber(1234.5)).toBe('1,234.50');
    expect(formatPercentage(5, true)).toBe('+5.00%');
    expect(formatPercentage(-5)).toBe('-5.00%');
    expect(formatCompactNumber(999.123)).toBe('999.12');
    expect(formatCompactNumber(2_500_000)).toBe('2.5M');
  });

  it('dateFormatting helpers', () => {
    const value = new Date(2026, 0, 22, 12).toISOString();
    expect(formatDateForDisplay(value)).toBe('Jan 22nd 2026');
    expect(formatDateForDisplay('garbage')).toBe('garbage');
    expect(formatDateToInput('2026-01-22')).toBe('2026-01-22');
  });

  it('formatDecimal is the shared core', () => {
    expect(formatDecimal(1000)).toBe('1,000');
  });
});

describe('formatDate timezone', () => {
  it('formats a UTC-midnight calendar date as the same day in every timezone', () => {
    const storedDate = '2026-03-05T00:00:00.000Z';
    expect(formatDate(storedDate, 'ordinal')).toBe('Mar 5th 2026');
    expect(formatDate(storedDate, 'medium')).toBe('Mar 5, 2026');
    expect(formatDate(storedDate, 'input')).toBe('2026-03-05');
  });

  it('keeps legacy "Mar 5th 2026" strings on the same calendar day', () => {
    expect(formatDate('Mar 5th 2026', 'input')).toBe('2026-03-05');
  });
});

describe('sign of values that round to zero', () => {
  it('never prints a negative or positive zero', () => {
    expect(formatPercent(-0.001)).toBe('0.00%');
    expect(formatPercent(0, { signed: true })).toBe('0.00%');
    expect(formatMoney(-0.001, '$')).toBe('$0.00');
    expect(formatMoney(-0.001, 'USD')).toBe('$0.00');
    expect(formatPercent(-12.5)).toBe('-12.50%');
  });
});
