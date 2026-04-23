import { useState, useEffect, useCallback, useRef } from 'react';
import { Transaction, ExpenseCategory, TimePeriod, Goal, Investment, RecurringItem, FinancialHealthDetails } from '@/types/dashboard';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';
import { emptyRoundupInsight, type RoundupInsightDto } from '@/lib/roundup-insight';
import { getGoalStatus } from '@/lib/goalUtils';

export function useDashboardData(timePeriod: TimePeriod) {
  const [income, setIncome] = useState({ amount: 0, trend: 0, comparisonLabel: '' });
  const [expenses, setExpenses] = useState({ amount: 0, trend: 0, comparisonLabel: '' });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topExpenses, setTopExpenses] = useState<ExpenseCategory[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [financialHealth, setFinancialHealth] = useState<FinancialHealthDetails | null>(null);
  const [roundupInsight, setRoundupInsight] = useState<RoundupInsightDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const authReady = useAuthReadyForApi();
  const dashboardFetchSeq = useRef(0);

  const fetchDashboardData = useCallback(
    async (signal?: AbortSignal) => {
      const seq = ++dashboardFetchSeq.current;
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({ timePeriod });
        const response = await fetch(`/api/dashboard?${params.toString()}`, { signal });

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const data = await response.json();
        if (seq !== dashboardFetchSeq.current) {
          return;
        }

        setIncome({
          amount: data.income?.amount || 0,
          trend: data.income?.trend || 0,
          comparisonLabel: data.income?.comparisonLabel || '',
        });
        setExpenses({
          amount: data.expenses?.amount || 0,
          trend: data.expenses?.trend || 0,
          comparisonLabel: data.expenses?.comparisonLabel || '',
        });
        setTransactions(data.transactions || []);
        setTopExpenses(data.topExpenses || []);
        setInvestments(data.investments || []);
        setFinancialHealth(
          data.financialHealth != null
            ? {
                score: data.financialHealth.score ?? 0,
                trend: data.financialHealth.trend ?? 0,
                details: data.financialHealth.details ?? { saving: 0, spendingControl: 0, goals: 0, engagement: 0 },
              }
            : null
        );
        setRoundupInsight(data.roundupInsight ?? emptyRoundupInsight());
        setRecurringItems(data.recurringItems ?? []);

        const rawGoals: Goal[] = data.goals || [];
        setGoals(rawGoals.filter((goal) => getGoalStatus(goal) !== 'completed'));
      } catch (err) {
        const aborted =
          (err instanceof DOMException && err.name === 'AbortError') ||
          (err instanceof Error && err.name === 'AbortError');
        if (aborted) return;
        
        if (seq !== dashboardFetchSeq.current) return;
        
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
        setIncome({ amount: 0, trend: 0, comparisonLabel: '' });
        setExpenses({ amount: 0, trend: 0, comparisonLabel: '' });
        setTransactions([]);
        setTopExpenses([]);
        setInvestments([]);
        setRecurringItems([]);
        setGoals([]);
        setFinancialHealth(null);
        setRoundupInsight(null);
      } finally {
        if (seq === dashboardFetchSeq.current) {
          setLoading(false);
        }
      }
    },
    [timePeriod]
  );

  const fetchGoals = useCallback(async () => {
    try {
      const response = await fetch('/api/goals');
      if (response.ok) {
        const data = await response.json();
        const activeGoals = (data.goals || []).filter((goal: Goal) => getGoalStatus(goal) !== 'completed');
        setGoals(activeGoals);
      }
    } catch (err) {
      console.error('Error fetching goals:', err);
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const ac = new AbortController();
    void fetchDashboardData(ac.signal);
    return () => {
      ac.abort();
      dashboardFetchSeq.current += 1;
    };
  }, [authReady, fetchDashboardData]);

  return {
    income,
    expenses,
    transactions,
    topExpenses,
    investments,
    recurringItems,
    goals,
    financialHealth,
    roundupInsight,
    loading,
    error,
    fetchDashboardData,
    fetchGoals,
  };
}
