import { Prisma } from '@prisma/client';

/**
 * Money is stored as NUMERIC(19,4) and read by Prisma as Prisma.Decimal (exact).
 *
 * Rules used across the API:
 *   - Writes: parse input with parseMoney, which rejects non-finite values and rounds to 4 dp.
 *   - Server maths on stored money (sums, differences, progress): use Decimal.
 *   - Responses: convert once with moneyToNumber. Returning a Decimal from NextResponse.json
 *     would serialise it as a string ("12.5"), which silently breaks client maths.
 */

export type MoneyValue = Prisma.Decimal | number | string;

/** Matches @db.Decimal(19, 4) in prisma/schema.prisma. */
export const MONEY_SCALE = 4;

export function parseMoney(value: unknown): Prisma.Decimal | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  try {
    const decimal = new Prisma.Decimal(value);
    if (!decimal.isFinite()) return null;
    return decimal.toDecimalPlaces(MONEY_SCALE);
  } catch {
    return null;
  }
}

export function moneyToNumber(value: MoneyValue): number {
  return typeof value === 'number' ? value : Number(value.toString());
}

export function sumMoney(values: MoneyValue[]): Prisma.Decimal {
  let total = new Prisma.Decimal(0);
  for (const value of values) total = total.plus(value);
  return total;
}
