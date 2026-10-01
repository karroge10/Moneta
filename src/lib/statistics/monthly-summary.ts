import { Prisma } from '@prisma/client';
import { moneyToNumber } from '@/lib/money';
import { startOfUtcMonth } from '@/lib/dates';
import type { MonthlySummaryRow } from '@/types/dashboard';

export type SummaryTransaction = {
  date: Date;
  type: string;
  convertedMoney: Prisma.Decimal | null;
  category?: { name: string } | null;
};

type MonthNumbers = { income: number; expenses: number; savings: number; categoryTotals: Map<string, number> };

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MAX_MONTHS = 12;

/** Newest-first rows for the last 12 UTC months that have converted activity. */
export function buildMonthlySummaries(transactions: SummaryTransaction[]): MonthlySummaryRow[] {
  const byMonth = groupByUtcMonth(transactions);
  const sortedMonths = Array.from(byMonth.entries())
    .sort((a, b) => b[0] - a[0])
    .slice(0, MAX_MONTHS);

  return sortedMonths.map(([monthStartMs, data]) => {
    const monthStart = new Date(monthStartMs);
    return {
      month: formatMonthLabel(monthStart),
      income: Math.round(data.income),
      expenses: Math.round(data.expenses),
      savings: Math.round(data.savings),
      topCategory: getTopCategory(data),
    };
  });
}

/** Percent change between the oldest and newest summary rows (rows are newest first). */
export function computeTrends(monthlySummaries: MonthlySummaryRow[]): { incomeTrend: number; expensesTrend: number } {
  let incomeTrend = 0;
  let expensesTrend = 0;
  if (monthlySummaries.length < 2) return { incomeTrend, expensesTrend };

  const firstMonth = monthlySummaries[monthlySummaries.length - 1];
  const lastMonth = monthlySummaries[0];
  if (firstMonth.income > 0) {
    incomeTrend = Math.round(((lastMonth.income - firstMonth.income) / firstMonth.income) * 100);
  }
  if (firstMonth.expenses > 0) {
    expensesTrend = Math.round(((lastMonth.expenses - firstMonth.expenses) / firstMonth.expenses) * 100);
  }
  return { incomeTrend, expensesTrend };
}

export function formatMonthLabel(date: Date): string {
  return `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Sums money exactly per UTC month, then converts to numbers once per month. */
function groupByUtcMonth(transactions: SummaryTransaction[]): Map<number, MonthNumbers> {
  const monthMoney = new Map<number, {
    income: Prisma.Decimal;
    expenses: Prisma.Decimal;
    categoryTotals: Map<string, Prisma.Decimal>;
  }>();

  for (const transaction of transactions) {
    const converted = transaction.convertedMoney;
    if (!converted) continue;
    const monthStart = startOfUtcMonth(transaction.date);
    const monthKey = monthStart.getTime();

    let monthData = monthMoney.get(monthKey);
    if (!monthData) {
      monthData = { income: new Prisma.Decimal(0), expenses: new Prisma.Decimal(0), categoryTotals: new Map() };
      monthMoney.set(monthKey, monthData);
    }

    if (transaction.type === 'income') {
      monthData.income = monthData.income.plus(converted);
    } else if (transaction.type === 'expense') {
      monthData.expenses = monthData.expenses.plus(converted);
      const categoryName = transaction.category?.name || 'Uncategorized';
      const currentTotal = monthData.categoryTotals.get(categoryName) ?? new Prisma.Decimal(0);
      monthData.categoryTotals.set(categoryName, currentTotal.plus(converted));
    }
  }

  const result = new Map<number, MonthNumbers>();
  for (const [monthKey, data] of monthMoney) {
    const categoryTotals = new Map<string, number>();
    for (const [name, total] of data.categoryTotals) categoryTotals.set(name, moneyToNumber(total));
    const savingsMoney = data.income.minus(data.expenses);
    result.set(monthKey, {
      income: moneyToNumber(data.income),
      expenses: moneyToNumber(data.expenses),
      savings: moneyToNumber(savingsMoney),
      categoryTotals,
    });
  }
  return result;
}

function getTopCategory(data: MonthNumbers): { name: string; percentage: number } {
  if (data.categoryTotals.size === 0) return { name: 'N/A', percentage: 0 };
  const sortedCategories = Array.from(data.categoryTotals.entries()).sort((a, b) => b[1] - a[1]);
  const [name, amount] = sortedCategories[0];
  const percentage = data.expenses > 0 ? Math.round((amount / data.expenses) * 100) : 0;
  return { name, percentage };
}
