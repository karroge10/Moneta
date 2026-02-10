import { NextResponse, NextRequest } from 'next/server';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculateGoalProgress } from '@/lib/goalUtils';
import { getFinancialHealthScore } from '@/lib/financial-health';
import { getInvestmentsPortfolio } from '@/lib/investments';
import { TimePeriod, MonthlySummaryRow, StatisticsSummaryItem, DemographicComparison } from '@/types/dashboard';
import { preloadRatesMap, convertTransactionsWithRatesMap } from '@/lib/currency-conversion';

const VALID_AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54', '55+'] as const;
const DEMOGRAPHIC_DIMENSIONS = ['age', 'country', 'profession'] as const;
const MIN_COHORT_SIZE = 1;

/**
 * Derive age group from date of birth (as of today).
 */
function getAgeGroup(dateOfBirth: Date | null): string | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  if (age >= 55) return '55+';
  if (age >= 45) return '45-54';
  if (age >= 35) return '35-44';
  if (age >= 25) return '25-34';
  if (age >= 18) return '18-24';
  return null;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get icon based on category name or default
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
    'Uncategorized': 'HelpCircle',
  };
  
  return iconMap[categoryName] || 'HelpCircle';
}

/**
 * Calculate date range for a given time period
 */
function getDateRangeForPeriod(period: TimePeriod, now: Date): { start: Date; end: Date } {
  const year = now.getFullYear();
  const month = now.getMonth();
  
  switch (period) {
    case 'This Month':
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0, 23, 59, 59, 999),
      };
    
    case 'Last Month':
      return {
        start: new Date(year, month - 1, 1),
        end: new Date(year, month, 0, 23, 59, 59, 999),
      };
    
    case 'This Year':
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
      };
    
    case 'Last Year':
      return {
        start: new Date(year - 1, 0, 1),
        end: new Date(year - 1, 11, 31, 23, 59, 59, 999),
      };
    
    case 'All Time':
      return {
        start: new Date(2000, 0, 1),
        end: new Date(year + 10, 11, 31, 23, 59, 59, 999),
      };
    
    default:
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0, 23, 59, 59, 999),
      };
  }
}

/**
 * Helper function to check if a date is within a range
 */
function isInRange(date: Date, start: Date, end: Date): boolean {
  const d = new Date(date);
  return d >= start && d <= end;
}

/**
 * Format month label (e.g., "Jan 2025")
 */
function formatMonthLabel(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// GET - Fetch statistics data
export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUserWithLanguage();
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
    
    // Get time period and demographic dimension from query params. Cohort is always "same as me" (current user's age/country/profession).
    const { searchParams } = new URL(request.url);
    const demographicOnly = searchParams.get('demographicOnly') === '1';
    const timePeriod = (searchParams.get('timePeriod') || 'All Time') as TimePeriod;
    const dimensionParam = searchParams.get('demographicDimension');
    const demographicDimension = dimensionParam && DEMOGRAPHIC_DIMENSIONS.includes(dimensionParam as (typeof DEMOGRAPHIC_DIMENSIONS)[number])
      ? (dimensionParam as (typeof DEMOGRAPHIC_DIMENSIONS)[number])
      : 'age';

    const cohortValueFromUser =
      demographicDimension === 'age'
        ? getAgeGroup(user.dateOfBirth)
        : demographicDimension === 'country'
          ? (user.country ?? '').trim()
          : (user.profession ?? '').trim();

    // Calculate date range for selected period
    const selectedRange = getDateRangeForPeriod(timePeriod, now);

    if (demographicOnly) {
      const periodTx = await db.transaction.findMany({
        where: { userId: user.id, date: { gte: selectedRange.start, lte: selectedRange.end }, investmentAssetId: null },
        select: { amount: true, currencyId: true, date: true, type: true },
      });
      let cohortUsers: { id: number; dateOfBirth: Date | null; country: string | null; profession: string | null }[] = [];
      let cohortTxByUserId = new Map<number, { amount: number; currencyId: number; date: Date; type: string }[]>();
      let allTransactionsForRates: { currencyId: number; date: Date }[] = periodTx.map((t) => ({ currencyId: t.currencyId, date: t.date }));
      if (user.dataSharingEnabled === true) {
        cohortUsers = await db.user.findMany({
          where: { dataSharingEnabled: true, id: { not: user.id } },
          select: { id: true, dateOfBirth: true, country: true, profession: true },
        });
        const filteredCohort = cohortValueFromUser
          ? cohortUsers.filter((u) => {
              if (demographicDimension === 'age') return getAgeGroup(u.dateOfBirth) === cohortValueFromUser;
              if (demographicDimension === 'country') return (u.country ?? '').trim() === cohortValueFromUser;
              if (demographicDimension === 'profession') return (u.profession ?? '').trim() === cohortValueFromUser;
              return true;
            })
          : [];
        if (filteredCohort.length >= MIN_COHORT_SIZE) {
          const cohortTx = await db.transaction.findMany({
            where: { userId: { in: filteredCohort.map((u) => u.id) }, date: { gte: selectedRange.start, lte: selectedRange.end }, investmentAssetId: null },
            select: { userId: true, amount: true, currencyId: true, date: true, type: true },
          });
          for (const t of cohortTx) {
            if (!cohortTxByUserId.has(t.userId)) cohortTxByUserId.set(t.userId, []);
            cohortTxByUserId.get(t.userId)!.push({ amount: t.amount, currencyId: t.currencyId, date: t.date, type: t.type });
          }
          allTransactionsForRates = [...allTransactionsForRates, ...cohortTx.map((t) => ({ currencyId: t.currencyId, date: t.date }))];
        }
      }
      const ratesMap = await preloadRatesMap(allTransactionsForRates, targetCurrencyId);
      const userWithConverted = convertTransactionsWithRatesMap(
        periodTx.map((t) => ({ ...t, date: t.date })),
        targetCurrencyId,
        ratesMap,
      );
      const totalIncome = userWithConverted.filter((t) => t.type === 'income').reduce((s, t) => s + t.convertedAmount, 0);
      const totalExpenses = userWithConverted.filter((t) => t.type === 'expense').reduce((s, t) => s + t.convertedAmount, 0);
      const [goals, portfolioSummary] = await Promise.all([
        db.goal.findMany({ where: { userId: user.id } }),
        getInvestmentsPortfolio(user.id, userCurrencyRecord),
      ]);
      const totalGoals = goals.length;
      const completedGoals = goals.filter((g) => calculateGoalProgress(g.currentAmount, g.targetAmount) >= 100).length;
      const goalsSuccessRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100 * 10) / 10 : 0;
      const portfolioBalance = portfolioSummary.totalValue;
      let demographicComparisons: DemographicComparison[] = [];
      const demographicComparisonsDisabled = user.dataSharingEnabled !== true;
      const cohortFilters = user.dataSharingEnabled === true
        ? {
            countries: [...new Set(cohortUsers.map((u) => u.country).filter((c): c is string => c != null && c !== ''))].sort(),
            professions: [...new Set(cohortUsers.map((u) => u.profession).filter((p): p is string => p != null && p !== ''))].sort(),
          }
        : { countries: [] as string[], professions: [] as string[] };
      if (user.dataSharingEnabled === true) {
        const filteredCohort = cohortValueFromUser
          ? cohortUsers.filter((u) => {
              if (demographicDimension === 'age') return getAgeGroup(u.dateOfBirth) === cohortValueFromUser;
              if (demographicDimension === 'country') return (u.country ?? '').trim() === cohortValueFromUser;
              if (demographicDimension === 'profession') return (u.profession ?? '').trim() === cohortValueFromUser;
              return true;
            })
          : [];
        if (filteredCohort.length >= MIN_COHORT_SIZE) {
          const cohortMetrics = await Promise.all(
            filteredCohort.map(async (cohortUser) => {
              const cohortTx = cohortTxByUserId.get(cohortUser.id) ?? [];
              const withConverted = convertTransactionsWithRatesMap(
                cohortTx.map((t) => ({ ...t, date: t.date })),
                targetCurrencyId,
                ratesMap,
              );
              const cohortIncome = withConverted.filter((t) => t.type === 'income').reduce((s, t) => s + t.convertedAmount, 0);
              const cohortExpenses = withConverted.filter((t) => t.type === 'expense').reduce((s, t) => s + t.convertedAmount, 0);
              const [cohortGoals, cohortPortfolio] = await Promise.all([
                db.goal.findMany({ where: { userId: cohortUser.id } }),
                getInvestmentsPortfolio(cohortUser.id, userCurrencyRecord),
              ]);
              const cg = cohortGoals.length;
              const cgDone = cohortGoals.filter((g) => calculateGoalProgress(g.currentAmount, g.targetAmount) >= 100).length;
              const goalsSuccessRateC = cg > 0 ? (cgDone / cg) * 100 : 0;
              const portfolioBal = cohortPortfolio.totalValue;
              return { income: cohortIncome, expenses: cohortExpenses, goalsSuccessRate: goalsSuccessRateC, portfolioBalance: portfolioBal };
            }),
          );
          const n = cohortMetrics.length;
          const avgIncome = cohortMetrics.reduce((s, m) => s + m.income, 0) / n;
          const avgExpenses = cohortMetrics.reduce((s, m) => s + m.expenses, 0) / n;
          const avgGoalsRate = cohortMetrics.reduce((s, m) => s + m.goalsSuccessRate, 0) / n;
          const avgPortfolio = cohortMetrics.reduce((s, m) => s + m.portfolioBalance, 0) / n;
          const formatPct = (userVal: number, cohortAvg: number): string => {
            if (cohortAvg === 0) return 'Same as others';
            const pct = Math.round(((userVal - cohortAvg) / cohortAvg) * 100);
            if (pct > 0) return `${pct}% higher than others`;
            if (pct < 0) return `${Math.abs(pct)}% lower than others`;
            return 'Same as others';
          };
          demographicComparisons = [
            { id: '1', label: 'Average Income', comparison: formatPct(totalIncome, avgIncome), icon: 'Wallet', iconColor: '#74C648' },
            { id: '2', label: 'Average Expenses', comparison: formatPct(totalExpenses, avgExpenses), icon: 'ShoppingBag', iconColor: '#D93F3F' },
            { id: '3', label: 'Goal Success Rate', comparison: formatPct(goalsSuccessRate, avgGoalsRate), icon: 'Trophy', iconColor: '#FFA500' },
            { id: '4', label: 'Portfolio Balance', comparison: formatPct(portfolioBalance, avgPortfolio), icon: 'BitcoinCircle', iconColor: '#FF8C00' },
            { id: '5', label: 'Financial Health', comparison: '4 points higher than others', icon: 'Heart', iconColor: '#AC66DA' },
          ];
        }
      }
      return NextResponse.json({
        demographicComparisons,
        demographicComparisonsDisabled,
        cohortFilters,
        demographicCohortValueMissing: cohortValueFromUser == null,
      });
    }
    
    // Full response path: fetch all transactions for the user
    const allTransactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        investmentAssetId: null,
      },
      include: {
        category: true,
        currency: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Preload exchange rates for all transactions we'll need (user + cohort) in 1–2 queries
    let allTransactionsForRates: { currencyId: number; date: Date }[] = allTransactions.map((t) => ({
      currencyId: t.currencyId,
      date: t.date,
    }));

    // If we'll need cohort data, fetch cohort users and their transactions up front so we can batch rates
    let cohortUsers: { id: number; dateOfBirth: Date | null; country: string | null; profession: string | null }[] = [];
    let cohortTxByUserId = new Map<number, { amount: number; currencyId: number; date: Date; type: string }[]>();
    if (user.dataSharingEnabled === true) {
      cohortUsers = await db.user.findMany({
        where: {
          dataSharingEnabled: true,
          id: { not: user.id },
        },
        select: { id: true, dateOfBirth: true, country: true, profession: true },
      });
      const filteredCohort = cohortValueFromUser
        ? cohortUsers.filter((u) => {
            if (demographicDimension === 'age') return getAgeGroup(u.dateOfBirth) === cohortValueFromUser;
            if (demographicDimension === 'country') return (u.country ?? '').trim() === cohortValueFromUser;
            if (demographicDimension === 'profession') return (u.profession ?? '').trim() === cohortValueFromUser;
            return true;
          })
        : [];
      if (filteredCohort.length >= MIN_COHORT_SIZE) {
        const cohortIds = filteredCohort.map((u) => u.id);
        const cohortTx = await db.transaction.findMany({
          where: {
            userId: { in: cohortIds },
            date: { gte: selectedRange.start, lte: selectedRange.end },
            investmentAssetId: null,
          },
          select: { userId: true, amount: true, currencyId: true, date: true, type: true },
        });
        for (const t of cohortTx) {
          if (!cohortTxByUserId.has(t.userId)) cohortTxByUserId.set(t.userId, []);
          cohortTxByUserId.get(t.userId)!.push({ amount: t.amount, currencyId: t.currencyId, date: t.date, type: t.type });
        }
        allTransactionsForRates = [...allTransactionsForRates, ...cohortTx.map((t) => ({ currencyId: t.currencyId, date: t.date }))];
      }
    }

    const ratesMap = await preloadRatesMap(allTransactionsForRates, targetCurrencyId);
    const transactionsWithConverted = convertTransactionsWithRatesMap(
      allTransactions,
      targetCurrencyId,
      ratesMap,
    );

    // Filter transactions by selected period
    const periodTransactions = transactionsWithConverted.filter((t) => 
      isInRange(t.date, selectedRange.start, selectedRange.end)
    );

    // Calculate total income and expenses
    const totalIncome = periodTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum: number, t) => sum + t.convertedAmount, 0);
    
    const totalExpenses = periodTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum: number, t) => sum + t.convertedAmount, 0);
    
    const incomeSaved = totalIncome - totalExpenses;

    // Calculate monthly summaries (last 12 months)
    const monthlySummaries: MonthlySummaryRow[] = [];
    const monthMap = new Map<string, {
      income: number;
      expenses: number;
      categoryTotals: Map<string, number>;
    }>();

    // Process transactions for monthly summaries
    transactionsWithConverted.forEach((transaction) => {
      const monthKey = formatMonthLabel(transaction.date);
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          income: 0,
          expenses: 0,
          categoryTotals: new Map(),
        });
      }

      const monthData = monthMap.get(monthKey)!;
      
      if (transaction.type === 'income') {
        monthData.income += transaction.convertedAmount;
      } else if (transaction.type === 'expense') {
        monthData.expenses += transaction.convertedAmount;
        
        const categoryName = transaction.category?.name || 'Uncategorized';
        const currentTotal = monthData.categoryTotals.get(categoryName) || 0;
        monthData.categoryTotals.set(categoryName, currentTotal + transaction.convertedAmount);
      }
    });

    // Convert to array and format
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sortedMonths = Array.from(monthMap.entries())
      .sort((a, b) => {
        // Parse month labels to sort chronologically
        const [monthNameA, yearStrA] = a[0].split(' ');
        const [monthNameB, yearStrB] = b[0].split(' ');
        const monthIndexA = monthNames.indexOf(monthNameA);
        const monthIndexB = monthNames.indexOf(monthNameB);
        const dateA = new Date(parseInt(yearStrA, 10), monthIndexA);
        const dateB = new Date(parseInt(yearStrB, 10), monthIndexB);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 12); // Last 12 months

    sortedMonths.forEach(([month, data]) => {
      const savings = data.income - data.expenses;
      
      // Find top category
      let topCategory = { name: 'N/A', percentage: 0 };
      if (data.categoryTotals.size > 0) {
        const sortedCategories = Array.from(data.categoryTotals.entries())
          .sort((a, b) => b[1] - a[1]);
        
        const [topCategoryName, topCategoryAmount] = sortedCategories[0];
        const percentage = data.expenses > 0 
          ? Math.round((topCategoryAmount / data.expenses) * 100)
          : 0;
        
        topCategory = {
          name: topCategoryName,
          percentage,
        };
      }

      monthlySummaries.push({
        month,
        income: Math.round(data.income),
        expenses: Math.round(data.expenses),
        savings: Math.round(savings),
        topCategory,
      });
    });

    // Calculate average expenses by category
    const categoryTotals = new Map<string, { total: number; count: number }>();
    
    periodTransactions
      .filter((t) => t.type === 'expense')
      .forEach((transaction) => {
        const categoryName = transaction.category?.name || 'Uncategorized';
        const existing = categoryTotals.get(categoryName) || { total: 0, count: 0 };
        existing.total += transaction.convertedAmount;
        existing.count += 1;
        categoryTotals.set(categoryName, existing);
      });

    // Calculate total expenses for percentage calculation
    const totalExpensesForAverage = totalExpenses;

    // 24 distinct hues — one per color family (no duplicate greens, blues, purples)
    const categoryColors = [
      '#74C648', '#AC66DA', '#D93F3F', '#4A90E2', '#FF8C00', '#00B4D8', '#8E44AD', '#1ABC9C',
      '#E74C3C', '#F1C40F', '#E91E8C', '#FFBF00', '#00CED1', '#FF6B6B', '#6A5ACD', '#E67E22',
      '#16A085', '#C0392B', '#5E35B1', '#FB8C00', '#00897B', '#D81B60', '#795548', '#607D8B',
    ];
    const colorCount = categoryColors.length;
    const entries = Array.from(categoryTotals.entries());
    // Spread indices across palette to avoid similar colors; when few categories, each gets unique
    const getColorIndex = (i: number, total: number) =>
      total <= colorCount ? i : Math.floor((i * (colorCount - 1)) / Math.max(1, total - 1)) % colorCount;
    // amount = total spend in category (matches percentage); sort by total descending
    const averageExpenses = entries
      .map(([name, data], index) => {
        const categoryTotal = data.total;
        const percentage = totalExpensesForAverage > 0
          ? Math.round((categoryTotal / totalExpensesForAverage) * 100)
          : 0;

        return {
          id: name,
          name,
          amount: categoryTotal,
          percentage,
          icon: getIconForCategory(name),
          color: categoryColors[getColorIndex(index, entries.length)],
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // Fetch goals to calculate success rate
    const goals = await db.goal.findMany({
      where: {
        userId: user.id,
      },
    });

    const totalGoals = goals.length;
    const completedGoals = goals.filter((g) => calculateGoalProgress(g.currentAmount, g.targetAmount) >= 100).length;
    const goalsSuccessRate = totalGoals > 0 
      ? Math.round((completedGoals / totalGoals) * 100 * 10) / 10 // Round to 1 decimal
      : 0;

    // Fetch investments to calculate portfolio balance
    const portfolioSummary = await getInvestmentsPortfolio(user.id, userCurrencyRecord);
    const portfolioBalance = portfolioSummary.totalValue;

    // Demographic comparisons: only when current user has data sharing enabled
    let demographicComparisons: DemographicComparison[] = [];
    let demographicComparisonsDisabled = false;
    let cohortFilters: { countries: string[]; professions: string[] } = { countries: [], professions: [] };

    if (user.dataSharingEnabled !== true) {
      demographicComparisonsDisabled = true;
    } else {
      // cohortUsers and cohortTxByUserId already fetched in the preload block above
      const countries = [...new Set(cohortUsers.map((u) => u.country).filter((c): c is string => c != null && c !== ''))].sort();
      const professions = [...new Set(cohortUsers.map((u) => u.profession).filter((p): p is string => p != null && p !== ''))].sort();
      cohortFilters = { countries, professions };

      const filteredCohort = cohortValueFromUser
        ? cohortUsers.filter((u) => {
            if (demographicDimension === 'age') return getAgeGroup(u.dateOfBirth) === cohortValueFromUser;
            if (demographicDimension === 'country') return (u.country ?? '').trim() === cohortValueFromUser;
            if (demographicDimension === 'profession') return (u.profession ?? '').trim() === cohortValueFromUser;
            return true;
          })
        : [];

      if (filteredCohort.length >= MIN_COHORT_SIZE) {
        const cohortMetrics = await Promise.all(
          filteredCohort.map(async (cohortUser) => {
            const cohortTx = cohortTxByUserId.get(cohortUser.id) ?? [];
            const withConverted = convertTransactionsWithRatesMap(
              cohortTx.map((t) => ({ ...t, date: t.date })),
              targetCurrencyId,
              ratesMap,
            );
            const cohortIncome = withConverted
              .filter((t) => t.type === 'income')
              .reduce((sum, t) => sum + t.convertedAmount, 0);
            const cohortExpenses = withConverted
              .filter((t) => t.type === 'expense')
              .reduce((sum, t) => sum + t.convertedAmount, 0);
            const [cohortGoals, cohortPortfolio] = await Promise.all([
              db.goal.findMany({ where: { userId: cohortUser.id } }),
              getInvestmentsPortfolio(cohortUser.id, userCurrencyRecord),
            ]);
            const totalGoals = cohortGoals.length;
            const completedGoals = cohortGoals.filter((g) => calculateGoalProgress(g.currentAmount, g.targetAmount) >= 100).length;
            const goalsSuccessRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
            const portfolioBal = cohortPortfolio.totalValue;
            return {
              income: cohortIncome,
              expenses: cohortExpenses,
              goalsSuccessRate,
              portfolioBalance: portfolioBal,
            };
          }),
        );

        const n = cohortMetrics.length;
        const avgIncome = cohortMetrics.reduce((s, m) => s + m.income, 0) / n;
        const avgExpenses = cohortMetrics.reduce((s, m) => s + m.expenses, 0) / n;
        const avgGoalsRate = cohortMetrics.reduce((s, m) => s + m.goalsSuccessRate, 0) / n;
        const avgPortfolio = cohortMetrics.reduce((s, m) => s + m.portfolioBalance, 0) / n;

        const formatPct = (userVal: number, cohortAvg: number): string => {
          if (cohortAvg === 0) return 'Same as others';
          const pct = Math.round(((userVal - cohortAvg) / cohortAvg) * 100);
          if (pct > 0) return `${pct}% higher than others`;
          if (pct < 0) return `${Math.abs(pct)}% lower than others`;
          return 'Same as others';
        };

        demographicComparisons = [
          {
            id: '1',
            label: 'Average Income',
            comparison: formatPct(totalIncome, avgIncome),
            icon: 'Wallet',
            iconColor: '#74C648',
          },
          {
            id: '2',
            label: 'Average Expenses',
            comparison: formatPct(totalExpenses, avgExpenses),
            icon: 'ShoppingBag',
            iconColor: '#D93F3F',
          },
          {
            id: '3',
            label: 'Goal Success Rate',
            comparison: formatPct(goalsSuccessRate, avgGoalsRate),
            icon: 'Trophy',
            iconColor: '#FFA500',
          },
          {
            id: '4',
            label: 'Portfolio Balance',
            comparison: formatPct(portfolioBalance, avgPortfolio),
            icon: 'BitcoinCircle',
            iconColor: '#FF8C00',
          },
          {
            id: '5',
            label: 'Financial Health',
            comparison: '4 points higher than others',
            icon: 'Heart',
            iconColor: '#AC66DA',
          },
        ];
      }
    }

    // Calculate trend from beginning (compare first period to last period)
    let incomeTrend = 0;
    let expensesTrend = 0;
    
    if (monthlySummaries.length >= 2) {
      const firstMonth = monthlySummaries[monthlySummaries.length - 1];
      const lastMonth = monthlySummaries[0];
      
      if (firstMonth.income > 0) {
        incomeTrend = Math.round(((lastMonth.income - firstMonth.income) / firstMonth.income) * 100);
      }
      
      if (firstMonth.expenses > 0) {
        expensesTrend = Math.round(((lastMonth.expenses - firstMonth.expenses) / firstMonth.expenses) * 100);
      }
    }

    const financialHealth = await getFinancialHealthScore(user.id, timePeriod, targetCurrencyId);

    // Build summary items
    const summaryItems: StatisticsSummaryItem[] = [
      {
        id: '1',
        label: 'Income',
        value: Math.round(totalIncome),
        change: incomeTrend !== 0 ? `${incomeTrend > 0 ? '+' : ''}${incomeTrend}% from beginning` : '',
        icon: 'Wallet',
        iconColor: '#74C648',
      },
      {
        id: '2',
        label: 'Expenses',
        value: Math.round(totalExpenses),
        change: expensesTrend !== 0 ? `${expensesTrend > 0 ? '+' : ''}${expensesTrend}% from beginning` : '',
        icon: 'ShoppingBag',
        iconColor: '#D93F3F',
      },
      {
        id: '3',
        label: 'Income Saved',
        value: Math.round(incomeSaved),
        change: '',
        icon: 'LotOfCash',
        iconColor: '#4A90E2',
      },
      {
        id: '4',
        label: 'Goals Success Rate',
        value: totalGoals > 0 ? `${goalsSuccessRate}%` : '0%',
        change: '',
        icon: 'Trophy',
        iconColor: '#FFA500',
      },
      {
        id: '5',
        label: 'Portfolio Balance',
        value: Math.round(portfolioBalance),
        change: '',
        icon: 'BitcoinCircle',
        iconColor: '#FF8C00',
      },
      {
        id: '6',
        label: 'Financial Health Score',
        value: `${financialHealth.score}/100`,
        change: financialHealth.trend !== 0 ? `${financialHealth.trend > 0 ? '+' : ''}${financialHealth.trend} vs last period` : '',
        icon: 'Heart',
        iconColor: '#AC66DA',
        isLarge: true,
        link: 'Learn how we calculate the financial health score >',
      },
    ];

    return NextResponse.json({
      monthlySummary: monthlySummaries,
      averageExpenses,
      summary: {
        items: summaryItems,
      },
      totalIncome: Math.round(totalIncome),
      totalExpenses: Math.round(totalExpenses),
      incomeSaved: Math.round(incomeSaved),
      goalsSuccessRate,
      portfolioBalance: Math.round(portfolioBalance),
      demographicComparisons,
      demographicComparisonsDisabled,
      cohortFilters,
      demographicCohortValueMissing: cohortValueFromUser == null,
      financialHealth: {
        score: financialHealth.score,
        trend: financialHealth.trend,
        details: financialHealth.details,
      },
    });
  } catch (error) {
    console.error('Error fetching statistics data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics data' },
      { status: 500 }
    );
  }
}

