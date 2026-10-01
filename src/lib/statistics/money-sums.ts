import { Prisma } from '@prisma/client';
import { moneyToNumber } from '@/lib/money';
import { sumConverted } from '@/lib/currency-conversion';

type ConvertedTyped = { type: string; convertedMoney: Prisma.Decimal | null };

/** Exact sum of converted amounts of one type; rows without a rate are excluded. */
export function sumByType(items: ConvertedTyped[], type: 'income' | 'expense'): Prisma.Decimal {
  const ofType = items.filter((t) => t.type === type);
  return sumConverted(ofType);
}

export function sumByTypeAsNumber(items: ConvertedTyped[], type: 'income' | 'expense'): number {
  const total = sumByType(items, type);
  return moneyToNumber(total);
}
