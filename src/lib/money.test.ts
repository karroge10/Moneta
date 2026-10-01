import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { moneyToNumber, parseMoney, sumMoney } from './money';

describe('parseMoney', () => {
  it('parses numbers and numeric strings, rounding to 4 dp', () => {
    expect(parseMoney(12.5)?.toString()).toBe('12.5');
    expect(parseMoney('1.234567')?.toString()).toBe('1.2346');
  });

  it('rejects empty, non-numeric and non-finite input', () => {
    expect(parseMoney(null)).toBeNull();
    expect(parseMoney(undefined)).toBeNull();
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney(Infinity)).toBeNull();
    expect(parseMoney({})).toBeNull();
  });
});

describe('sumMoney', () => {
  it('sums exactly where floats drift', () => {
    const values = [0.1, 0.2, '0.3'];
    const total = sumMoney(values);
    expect(total.toString()).toBe('0.6');
    expect(0.1 + 0.2 + 0.3).not.toBe(0.6);
  });

  it('returns zero for an empty list', () => {
    expect(sumMoney([]).isZero()).toBe(true);
  });
});

describe('moneyToNumber', () => {
  it('converts Decimal, string and number', () => {
    const decimal = new Prisma.Decimal('19.9999');
    expect(moneyToNumber(decimal)).toBe(19.9999);
    expect(moneyToNumber('3.25')).toBe(3.25);
    expect(moneyToNumber(7)).toBe(7);
  });
});
