/**
 * Debug analyzer for income/expense calculations used by dashboard/expenses/income pages.
 * Mirrors the API logic (date ranges, currency conversion, grouping, trends) and prints
 * the intermediate numbers for quick verification.
 *
 * Usage:
 *   npx tsx scripts/analyze-financials.ts [userId|clerkUserId] [timePeriod]
 *
 * Time periods: 'This Month' | 'Last Month' | 'This Quarter' | 'Last Quarter' | 'This Year' | 'Last Year' | 'All Time'
 */

import { PrismaClient, Transaction, User } from '@prisma/client';
import { resolve } from 'path';
import { config } from 'dotenv';
import { convertAmount } from '../src/lib/currency-conversion';
import { normalizeMerchantName } from '../src/lib/merchant';

type TimePeriod =
  | 'This Month'
  | 'Last Month'
  | 'This Quarter'
  | 'Last Quarter'
  | 'This Year'
  | 'Last Year'
  | 'All Time';

// Load environment variables (prefer .env.local, then .env)
config({ path: resolve(process.cwd(), '.env.local') });
if (!process.env.DATABASE_URL) {
  config({ path: resolve(process.cwd(), '.env') });
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient();

function getDateRangeForPeriod(period: TimePeriod, now: Date): { start: Date; end: Date } {
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case 'This Month':
      return { start: new Date(year, month, 1), end: new Date(year, month + 1, 0, 23, 59, 59, 999) };
    case 'Last Month':
      return { start: new Date(year, month - 1, 1), end: new Date(year, month, 0, 23, 59, 59, 999) };
    case 'This Quarter': {
      const quarter = Math.floor(month / 3);
      return { start: new Date(year, quarter * 3, 1), end: new Date(year, (quarter + 1) * 3, 0, 23, 59, 59, 999) };
    }
    case 'Last Quarter': {
      const quarter = Math.floor(month / 3);
      const lastQuarter = quarter === 0 ? 3 : quarter - 1;
      const lastQuarterYear = quarter === 0 ? year - 1 : year;
      return {
        start: new Date(lastQuarterYear, lastQuarter * 3, 1),
        end: new Date(lastQuarterYear, (lastQuarter + 1) * 3, 0, 23, 59, 59, 999),
      };
    }
    case 'This Year':
      return { start: new Date(year, 0, 1), end: new Date(year, 11, 31, 23, 59, 59, 999) };
    case 'Last Year':
      return { start: new Date(year - 1, 0, 1), end: new Date(year - 1, 11, 31, 23, 59, 59, 999) };
    case 'All Time':
      return { start: new Date(2000, 0, 1), end: new Date(year + 10, 11, 31, 23, 59, 59, 999) };
    default:
      return { start: new Date(year, month, 1), end: new Date(year, month + 1, 0, 23, 59, 59, 999) };
  }
}

function getComparisonDateRange(period: TimePeriod, now: Date): { start: Date; end: Date } | null {
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case 'This Month':
      return { start: new Date(year, month - 1, 1), end: new Date(year, month, 0, 23, 59, 59, 999) };
    case 'Last Month':
      return { start: new Date(year, month - 2, 1), end: new Date(year, month - 1, 0, 23, 59, 59, 999) };
    case 'This Quarter': {
      const quarter = Math.floor(month / 3);
      const lastQuarter = quarter === 0 ? 3 : quarter - 1;
      const lastQuarterYear = quarter === 0 ? year - 1 : year;
      return {
        start: new Date(lastQuarterYear, lastQuarter * 3, 1),
        end: new Date(lastQuarterYear, (lastQuarter + 1) * 3, 0, 23, 59, 59, 999),
      };
    }
    case 'Last Quarter': {
      const quarter = Math.floor(month / 3);
      const twoQuartersAgo = quarter === 0 ? 2 : quarter === 1 ? 3 : quarter - 2;
      const twoQuartersAgoYear = quarter <= 1 ? year - 1 : year;
      return {
        start: new Date(twoQuartersAgoYear, twoQuartersAgo * 3, 1),
        end: new Date(twoQuartersAgoYear, (twoQuartersAgo + 1) * 3, 0, 23, 59, 59, 999),
      };
    }
    case 'This Year':
      return { start: new Date(year - 1, 0, 1), end: new Date(year - 1, 11, 31, 23, 59, 59, 999) };
    case 'Last Year':
      return { start: new Date(year - 2, 0, 1), end: new Date(year - 2, 11, 31, 23, 59, 59, 999) };
    case 'All Time':
      return null;
    default:
      return null;
  }
}

function percentChange(current: number, previous: number): number {
  if (previous > 0) return Math.round(((current - previous) / previous) * 100);
  if (previous === 0 && current > 0) return 100;
  return 0;
}

function fmt(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function convertTransactions<T extends Transaction>(txs: T[], targetCurrencyId: number) {
  return Promise.all(
    txs.map(async (t) => {
      const convertedAmount = await convertAmount(t.amount, t.currencyId, targetCurrencyId, t.date);
      return { ...t, convertedAmount };
    }),
  );
}

function sumByType(txs: Array<Transaction & { convertedAmount: number }>, type: 'income' | 'expense') {
  return txs.filter((t) => t.type === type).reduce((sum, t) => sum + t.convertedAmount, 0);
}

function topExpenseCategories(txs: Array<Transaction & { convertedAmount: number }>) {
  const totals = new Map<string, { amount: number; categoryId: number; categoryName: string }>();

  txs.forEach((t) => {
    if (t.type !== 'expense') return;
    const categoryName = t.category?.name || 'Uncategorized';
    const categoryId = t.categoryId || 0;
    const current = totals.get(categoryName) || { amount: 0, categoryId, categoryName };
    current.amount += t.convertedAmount;
    totals.set(categoryName, current);
  });

  return Array.from(totals.values()).sort((a, b) => b.amount - a.amount);
}

function topIncomeSources(txs: Array<Transaction & { convertedAmount: number }>) {
  const totals = new Map<string, { amount: number; categoryName: string | null; merchantName: string }>();

  txs.forEach((t) => {
    if (t.type !== 'income') return;
    const merchantName = normalizeMerchantName(t.description);
    const categoryName = t.category?.name || null;
    const key = categoryName || merchantName;
    const current = totals.get(key) || { amount: 0, categoryName, merchantName };
    current.amount += t.convertedAmount;
    totals.set(key, current);
  });

  return Array.from(totals.entries())
    .map(([name, data]) => ({ name: data.categoryName || data.merchantName, amount: data.amount, categoryName: data.categoryName }))
    .sort((a, b) => b.amount - a.amount);
}

async function pickUser(userArg?: string): Promise<User> {
  if (userArg) {
    const found = await prisma.user.findFirst({
      where: {
        OR: [
          { clerkUserId: userArg },
          { id: Number.isFinite(Number(userArg)) ? Number(userArg) : -1 },
        ],
      },
    });
    if (found) return found;
  }

  const fallback = await prisma.user.findFirst();
  if (!fallback) {
    throw new Error('No users found. Provide a userId or clerkUserId.');
  }
  return fallback;
}

async function main() {
  const userArg = process.argv[2];
  const periodArg = (process.argv[3] as TimePeriod) || 'This Month';
  const now = new Date();

  const user = await pickUser(userArg);

  const userCurrency =
    user.currencyId !== null
      ? await prisma.currency.findUnique({ where: { id: user.currencyId } })
      : await prisma.currency.findFirst();

  if (!userCurrency) {
    throw new Error('No currency configured for user or globally.');
  }

  const targetCurrencyId = userCurrency.id;
  const selectedRange = getDateRangeForPeriod(periodArg, now);
  const comparisonRange = getComparisonDateRange(periodArg, now);

  const [selectedTxs, comparisonTxs] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: selectedRange.start, lte: selectedRange.end } },
      include: { category: true, currency: true },
      orderBy: { date: 'desc' },
    }),
    comparisonRange
      ? prisma.transaction.findMany({
          where: { userId: user.id, date: { gte: comparisonRange.start, lte: comparisonRange.end } },
          include: { category: true, currency: true },
          orderBy: { date: 'desc' },
        })
      : Promise.resolve([] as Transaction[]),
  ]);

  const [selectedWithConverted, comparisonWithConverted] = await Promise.all([
    convertTransactions(selectedTxs, targetCurrencyId),
    convertTransactions(comparisonTxs, targetCurrencyId),
  ]);

  const incomeTotal = sumByType(selectedWithConverted, 'income');
  const expenseTotal = sumByType(selectedWithConverted, 'expense');
  const comparisonIncome = sumByType(comparisonWithConverted, 'income');
  const comparisonExpense = sumByType(comparisonWithConverted, 'expense');

  const incomeTrend = percentChange(incomeTotal, comparisonIncome);
  const expenseTrend = percentChange(expenseTotal, comparisonExpense);

  const expenseCategories = topExpenseCategories(selectedWithConverted);
  const incomeSources = topIncomeSources(selectedWithConverted);

  console.log('============================================================');
  console.log('Moneta finance debug');
  console.log(`User: ${user.id} (${user.clerkUserId || 'no clerk ID'})`);
  console.log(`Currency: ${userCurrency.name} (${userCurrency.symbol}) [id=${userCurrency.id}]`);
  console.log(`Period: ${periodArg}  |  Range: ${selectedRange.start.toISOString().slice(0, 10)} -> ${selectedRange.end.toISOString().slice(0, 10)}`);
  if (comparisonRange) {
    console.log(
      `Comparison: ${comparisonRange.start.toISOString().slice(0, 10)} -> ${comparisonRange.end.toISOString().slice(0, 10)}`,
    );
  } else {
    console.log('Comparison: n/a (All Time or no comparison)');
  }
  console.log('------------------------------------------------------------');
  console.log(`Income total:   ${fmt(incomeTotal)} (trend vs comparison: ${incomeTrend}%)`);
  console.log(`Expense total:  ${fmt(expenseTotal)} (trend vs comparison: ${expenseTrend}%)`);
  console.log(`Net (income-expense): ${fmt(incomeTotal - expenseTotal)}`);

  const incomeNegatives = selectedWithConverted.filter((t) => t.type === 'income' && t.amount < 0).length;
  const expenseNegatives = selectedWithConverted.filter((t) => t.type === 'expense' && t.amount < 0).length;
  if (incomeNegatives || expenseNegatives) {
    console.log(
      `⚠️ Sign check: income negatives=${incomeNegatives}, expense negatives=${expenseNegatives} (stored amounts might already be signed)`,
    );
  }

  console.log('------------------------------------------------------------');
  console.log('Top expenses (selected period):');
  expenseCategories.forEach((cat, idx) => {
    const pct = expenseTotal > 0 ? Math.round((cat.amount / expenseTotal) * 100) : 0;
    console.log(
      `${idx + 1}. ${cat.categoryName} - ${fmt(cat.amount)} (${pct}%) [categoryId=${cat.categoryId || 'n/a'}]`,
    );
  });
  if (expenseCategories.length === 0) {
    console.log('  (none)');
  }

  console.log('------------------------------------------------------------');
  console.log('Top income sources (selected period):');
  incomeSources.forEach((src, idx) => {
    const pct = incomeTotal > 0 ? Math.round((src.amount / incomeTotal) * 100) : 0;
    console.log(`${idx + 1}. ${src.name} - ${fmt(src.amount)} (${pct}%)`);
  });
  if (incomeSources.length === 0) {
    console.log('  (none)');
  }

  console.log('------------------------------------------------------------');
  console.log('Counts:');
  console.log(`  Selected tx:    ${selectedWithConverted.length}`);
  console.log(`    Income:       ${selectedWithConverted.filter((t) => t.type === 'income').length}`);
  console.log(`    Expense:      ${selectedWithConverted.filter((t) => t.type === 'expense').length}`);
  console.log(`  Comparison tx:  ${comparisonWithConverted.length}`);
  console.log(`    Income:       ${comparisonWithConverted.filter((t) => t.type === 'income').length}`);
  console.log(`    Expense:      ${comparisonWithConverted.filter((t) => t.type === 'expense').length}`);
  console.log('============================================================\n');
}

main()
  .catch((err) => {
    console.error('❌ Error running analyzer', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


