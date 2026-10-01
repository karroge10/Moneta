import type { Prisma } from '@prisma/client';
import { moneyToNumber, sumMoney } from '@/lib/money';

export type CategoryTransaction = {
  type: string;
  convertedMoney: Prisma.Decimal | null;
  category?: { name: string } | null;
};

export type AverageExpenseRow = {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  icon: string;
  color: string;
};

const CATEGORY_COLORS = [
  '#74C648', '#AC66DA', '#D93F3F', '#4A90E2', '#FF8C00', '#00B4D8', '#8E44AD', '#1ABC9C',
  '#E74C3C', '#F1C40F', '#E91E8C', '#FFBF00', '#00CED1', '#FF6B6B', '#6A5ACD', '#E67E22',
  '#16A085', '#C0392B', '#5E35B1', '#FB8C00', '#00897B', '#D81B60', '#795548', '#607D8B',
];

const CATEGORY_ICONS: Record<string, string> = {
  'Rent': 'City',
  'Entertainment': 'Tv',
  'Restaurants': 'PizzaSlice',
  'Furniture': 'Sofa',
  'Groceries': 'Cart',
  'Gifts': 'Gift',
  'Fitness': 'Gym',
  'Water Bill': 'Droplet',
  'Technology': 'Tv',
  'Electricity Bill': 'Flash',
  'Clothes': 'Shirt',
  'Transportation': 'Tram',
  'Heating Bill': 'FireFlame',
  'Home Internet': 'Wifi',
  'Taxes': 'Cash',
  'Mobile Data': 'SmartphoneDevice',
  'Uncategorized': 'HelpCircle',
};

/** Expense totals per category for the period, largest first, with share of total expenses. */
export function buildAverageExpenses(transactions: CategoryTransaction[], totalExpenses: number): AverageExpenseRow[] {
  const categoryMoney = new Map<string, Prisma.Decimal[]>();
  for (const transaction of transactions) {
    if (transaction.type !== 'expense' || !transaction.convertedMoney) continue;
    const categoryName = transaction.category?.name || 'Uncategorized';
    const amounts = categoryMoney.get(categoryName) ?? [];
    amounts.push(transaction.convertedMoney);
    categoryMoney.set(categoryName, amounts);
  }

  const entries = Array.from(categoryMoney.entries());
  return entries
    .map(([name, amounts], index) => {
      const total = sumMoney(amounts);
      const amount = moneyToNumber(total);
      const percentage = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
      const colorIndex = getColorIndex(index, entries.length);
      return {
        id: name,
        name,
        amount,
        percentage,
        icon: getIconForCategory(name),
        color: CATEGORY_COLORS[colorIndex],
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

export function getIconForCategory(categoryName: string | null): string {
  if (!categoryName) return 'HelpCircle';
  return CATEGORY_ICONS[categoryName] || 'HelpCircle';
}

/** Spreads colors across the palette when there are more categories than colors. */
function getColorIndex(i: number, total: number): number {
  const colorCount = CATEGORY_COLORS.length;
  if (total <= colorCount) return i;
  return Math.floor((i * (colorCount - 1)) / Math.max(1, total - 1)) % colorCount;
}
