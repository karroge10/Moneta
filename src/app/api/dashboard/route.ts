import { NextResponse, NextRequest } from 'next/server';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { db } from '@/lib/db';
import { Transaction as TransactionType, ExpenseCategory, TimePeriod } from '@/types/dashboard';
import { formatTransactionName } from '@/lib/transaction-utils';
import {
  preloadRates,
  convertTransactionsWithRatesMap,
  sumConverted,
  countMissingRates,
} from '@/lib/currency-conversion';
import { getUtcComparisonRange, getUtcPeriodRange, toDateKey } from '@/lib/dates';
import { getFinancialHealthScore, FINANCIAL_HEALTH_TIME_PERIOD } from '@/lib/financial-health';
import { getInvestmentsPortfolio } from '@/lib/investments';
import { computeRoundupInsight } from '@/lib/roundup-insight';
import { calculateGoalProgress } from '@/lib/goalUtils';
import { moneyToNumber, sumMoney } from '@/lib/money';
import type { Prisma } from '@prisma/client';
import {
  processDueRecurringItems,
  getExpenseRecurringItemsSerialized,
} from '@/lib/recurring-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const categoryColors = ['#AC66DA', '#74C648', '#D93F3F'];


export async function GET(request: NextRequest) {
  const tReq = performance.now();
  const dur: Record<string, number> = {};
  const mark = (label: string, start: number) => {
    dur[label] = performance.now() - start;
    return performance.now();
  };

  const { searchParams } = new URL(request.url);
  const emitTiming =
    searchParams.get('timing') === '1' || process.env.DASHBOARD_TIMING === '1';

  try {
    let t = performance.now();
    const user = await requireCurrentUserWithLanguage();
    const userLanguageAlias = user.language?.alias?.toLowerCase() || null;

    const now = new Date();

    const userCurrencyRecord = user.currencyId
      ? await db.currency.findUnique({ where: { id: user.currencyId } })
      : await db.currency.findFirst();

    if (!userCurrencyRecord) {
      return NextResponse.json(
        { error: 'No currency configured.' },
        { status: 500 },
      );
    }

    const targetCurrencyId = userCurrencyRecord.id;

    const timePeriod = (searchParams.get('timePeriod') || 'This Month') as TimePeriod;

    const selectedRange = getUtcPeriodRange(timePeriod, now);
    const comparisonRange = getUtcComparisonRange(timePeriod, now);

    t = mark('auth-and-currency', t);

    t = mark('auth-and-currency', t);

    
    const [, batch, financialHealth, investmentsPortfolio] = await Promise.all([
      processDueRecurringItems(user.id, now),

      (async () => {
        const [selectedTransactions, comparisonTransactions, latestTransactionsRaw, goalsRaw, recurringItems] =
          await Promise.all([
            db.transaction.findMany({
              where: {
                userId: user.id,
                date: {
                  gte: selectedRange.start,
                  lte: selectedRange.end,
                },
                investmentAssetId: null,
              },
              include: {
                category: true,
                currency: true,
              },
              orderBy: { date: 'desc' },
            }),
            comparisonRange
              ? db.transaction.findMany({
                  where: {
                    userId: user.id,
                    date: {
                      gte: comparisonRange.start,
                      lte: comparisonRange.end,
                    },
                    investmentAssetId: null,
                  },
                  include: {
                    currency: true,
                  },
                  orderBy: { date: 'desc' },
                })
              : Promise.resolve([]),
            db.transaction.findMany({
              where: { userId: user.id, investmentAssetId: null },
              include: {
                category: true,
                currency: true,
              },
              orderBy: { date: 'desc' },
              take: 6,
            }),
            db.goal.findMany({
              where: { userId: user.id },
              orderBy: { createdAt: 'desc' },
            }),
            getExpenseRecurringItemsSerialized(user.id, targetCurrencyId),
          ]);

        const allTxsForPreload = [...selectedTransactions, ...(comparisonTransactions || []), ...latestTransactionsRaw];
        const ratesMap = await preloadRates(
          allTxsForPreload.map(t => ({ currencyId: t.currencyId, date: t.date })),
          targetCurrencyId
        );

        const selectedWithConverted = convertTransactionsWithRatesMap(selectedTransactions, targetCurrencyId, ratesMap);
        const comparisonWithConverted = convertTransactionsWithRatesMap(comparisonTransactions || [], targetCurrencyId, ratesMap);
        const latestWithConverted = convertTransactionsWithRatesMap(latestTransactionsRaw, targetCurrencyId, ratesMap);

        return {
          goalsRaw,
          recurringItems,
          selectedWithConverted,
          comparisonWithConverted,
          latestWithConverted,
        };
      })(),
      getFinancialHealthScore(user.id, FINANCIAL_HEALTH_TIME_PERIOD, targetCurrencyId),
      getInvestmentsPortfolio(user.id, userCurrencyRecord),
    ]);

    const tAfterParallel = performance.now();
    dur['parallel-batch-health-investments'] = tAfterParallel - t;
    t = tAfterParallel;

    const {
      goalsRaw,
      recurringItems,
      selectedWithConverted,
      comparisonWithConverted,
      latestWithConverted,
    } = batch;

    
    const selectedIncomeMoney = sumByType(selectedWithConverted, 'income');
    const selectedExpensesMoney = sumByType(selectedWithConverted, 'expense');
    const selectedPeriodIncome = moneyToNumber(selectedIncomeMoney);
    const selectedPeriodExpenses = moneyToNumber(selectedExpensesMoney);

    
    let comparisonIncome = 0;
    let comparisonExpenses = 0;

    if (comparisonRange) {
      const comparisonIncomeMoney = sumByType(comparisonWithConverted, 'income');
      const comparisonExpensesMoney = sumByType(comparisonWithConverted, 'expense');
      comparisonIncome = moneyToNumber(comparisonIncomeMoney);
      comparisonExpenses = moneyToNumber(comparisonExpensesMoney);
    }

    const missingRates = countMissingRates(selectedWithConverted) + countMissingRates(comparisonWithConverted);

    
    
    
    
    
    const incomeTrend = comparisonRange && comparisonIncome > 0
      ? Math.round(((selectedPeriodIncome - comparisonIncome) / comparisonIncome) * 100)
      : comparisonRange && selectedPeriodIncome > 0
        ? 100  
        : 0;   

    const expenseTrend = comparisonRange && comparisonExpenses > 0
      ? Math.round(((selectedPeriodExpenses - comparisonExpenses) / comparisonExpenses) * 100)
      : comparisonRange && selectedPeriodExpenses > 0
        ? 100  
        : 0;   

    
    const latestTransactions: TransactionType[] = latestWithConverted.map((t) => {
      const originalAmount = moneyToNumber(t.amount);
      const originalSignedAmount = t.type === 'expense' ? -originalAmount : originalAmount;
      // Without a rate the row shows its original amount; originalCurrency* tells the client which currency.
      const displayAmount = t.convertedMoney ? moneyToNumber(t.convertedMoney) : originalAmount;
      const convertedSignedAmount = t.type === 'expense' ? -displayAmount : displayAmount;
      
      const displayName = formatTransactionName(t.description, userLanguageAlias, false);
      
      const fullName = formatTransactionName(t.description, userLanguageAlias, true);

      return {
        id: t.id.toString(),
        name: displayName,
        fullName: fullName, 
        originalDescription: t.description, 
        date: formatDate(t.date),
        dateRaw: toDateKey(t.date),
        amount: convertedSignedAmount,
        originalAmount: originalSignedAmount,
        originalCurrencySymbol: t.currency?.symbol,
        originalCurrencyAlias: t.currency?.alias,
        category: t.category?.name || null,
        color: t.category?.color || '#AC66DA',
        icon: getIconForCategory(t.category?.name || null),
      };
    });

    
    const expenseTransactions = selectedWithConverted.filter((t) => t.type === 'expense');
    const categoryMoney = new Map<string, { amounts: Prisma.Decimal[]; categoryId: number; categoryName: string }>();

    expenseTransactions.forEach((t) => {
      if (!t.convertedMoney) return;
      const categoryName = t.category?.name || 'Uncategorized';
      const categoryId = t.categoryId || 0;

      if (!categoryMoney.has(categoryName)) {
        categoryMoney.set(categoryName, {
          amounts: [],
          categoryId,
          categoryName,
        });
      }

      categoryMoney.get(categoryName)!.amounts.push(t.convertedMoney);
    });

    const categoryTotals = Array.from(categoryMoney.values()).map((c) => {
      const total = sumMoney(c.amounts);
      return { amount: moneyToNumber(total), categoryId: c.categoryId, categoryName: c.categoryName };
    });

    
    const topCategoriesArray = categoryTotals
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3); 

    
    const totalExpenses = selectedPeriodExpenses;

    
    const topExpenses: ExpenseCategory[] = topCategoriesArray.map((cat, index: number) => {
      const percentage = totalExpenses > 0
        ? Math.round((cat.amount / totalExpenses) * 100)
        : 0;

      return {
        id: cat.categoryId.toString() || `uncategorized-${index}`,
        name: cat.categoryName,
        amount: cat.amount,
        percentage,
        icon: getIconForCategory(cat.categoryName),
        color: categoryColors[index % categoryColors.length],
      };
    });

    const comparisonLabel = getComparisonLabel(timePeriod);

    dur['map-trends-top-latest'] = performance.now() - t;

    const tRoundup = performance.now();
    const roundupInsight = await computeRoundupInsight(selectedPeriodExpenses, investmentsPortfolio.assets);
    dur['roundup-insight'] = performance.now() - tRoundup;

    const goalsPayload = goalsRaw.map((goal) => {
      const targetAmount = moneyToNumber(goal.targetAmount);
      const currentAmount = moneyToNumber(goal.currentAmount);
      return {
        id: goal.id.toString(),
        name: goal.name,
        targetDate: formatDate(goal.targetDate),
        targetAmount,
        currentAmount,
        progress: calculateGoalProgress(currentAmount, targetAmount),
        currencyId: goal.currencyId ?? undefined,
        createdAt: goal.createdAt.toISOString(),
        updatedAt: goal.updatedAt.toISOString(),
      };
    });

    const body = {
      income: {
        amount: Math.round(selectedPeriodIncome),
        trend: incomeTrend,
        comparisonLabel,
      },
      expenses: {
        amount: Math.round(selectedPeriodExpenses),
        trend: expenseTrend,
        comparisonLabel,
      },
      transactions: latestTransactions,
      topExpenses,
      investments: investmentsPortfolio.assets.map((a) => ({
        id: a.assetId.toString(),
        name: a.name,
        subtitle: a.ticker,
        ticker: a.ticker,
        assetType: a.type,
        sourceType: a.pricingMode,
        quantity: a.quantity,
        currentValue: a.currentValue,
        currentPrice: a.currentPrice,
        gainLoss: a.pnl,
        changePercent: a.unrealizedPnlPercent,
        priceMissing: a.priceMissing,
        rateMissing: a.rateMissing,
        icon: a.icon || (a.type === 'crypto' ? 'BitcoinCircle' : 'Reports'),
        priceHistory: [],
      })),
      portfolioBalance: investmentsPortfolio.totalValue,
      portfolioMissingValuations: investmentsPortfolio.missingValuations,
      financialHealth: {
        score: financialHealth.score,
        trend: financialHealth.trend,
        details: financialHealth.details,
      },
      roundupInsight,
      goals: goalsPayload,
      recurringItems,
      missingRates,
    };

    dur['total'] = performance.now() - tReq;

    if (emitTiming) {
      console.info('[api/dashboard] timing (ms)', dur);
    }

    const res = NextResponse.json(body);
    if (emitTiming) {
      res.headers.set('Server-Timing', buildServerTimingHeader(dur));
    }
    return res;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}


function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getUTCDate();
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();

  
  const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
    day === 2 || day === 22 ? 'nd' :
      day === 3 || day === 23 ? 'rd' : 'th';

  return `${month} ${day}${suffix} ${year}`;
}


function getIconForCategory(categoryName: string | null): string {
  if (!categoryName) return 'HelpCircle';

  const iconMap: Record<string, string> = {
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
  };

  return iconMap[categoryName] || 'HelpCircle';
}




function getComparisonLabel(period: TimePeriod): string {
  switch (period) {
    case 'This Month':
      return 'from last month';
    case 'Last Month':
      return 'from 2 months ago';
    case 'This Year':
      return 'from last year';
    case 'Last Year':
      return 'from 2 years ago';
    case 'All Time':
      return '';
    default:
      return '';
  }
}








function buildServerTimingHeader(durationsMs: Record<string, number>): string {
  return Object.entries(durationsMs)
    .map(([name, dur]) => `${encodeURIComponent(name.replace(/\s+/g, '-'))};dur=${Math.max(0, Math.round(dur))}`)
    .join(', ');
}

/** Exact sum of converted amounts of one type; rows without a rate are excluded. */
function sumByType(
  items: { type: string; convertedMoney: Prisma.Decimal | null }[],
  type: 'income' | 'expense',
): Prisma.Decimal {
  const ofType = items.filter((t) => t.type === type);
  return sumConverted(ofType);
}
