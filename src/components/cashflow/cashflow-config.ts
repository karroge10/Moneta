import type { CashflowType } from '@/hooks/useCashflowData';

/** Everything that differs between the expenses and income pages. */
export interface CashflowConfig {
  type: CashflowType;
  pageName: string;
  activeSection: 'expenses' | 'income';
  addLabel: string;
  /** Sign of the draft amount, which tells the transaction modal the type. */
  draftAmount: number;
  update: { message: string; highlight: string };
  upcoming: { title: string; emptyTitle: string; emptyDescription: string };
  latest: { title: string; emptyTitle: string; emptyDescription: string };
  breakdown: { title: string; emptyTitle: string; emptyDescription: string };
  /** Title used by the skeleton for the monthly average card. */
  averageTitle: string;
}

export const CASHFLOW_CONFIG: Record<CashflowType, CashflowConfig> = {
  expense: {
    type: 'expense',
    pageName: 'Expenses',
    activeSection: 'expenses',
    addLabel: 'Add Expense',
    draftAmount: -0.01,
    update: {
      message: 'See how your spending splits by category and month in Statistics.',
      highlight: 'by category and month',
    },
    upcoming: {
      title: 'Upcoming Bills',
      emptyTitle: 'No upcoming bills yet',
      emptyDescription: 'Create a recurring bill to see it here',
    },
    latest: {
      title: 'Latest Expenses',
      emptyTitle: 'Add transactions to see your expenses',
      emptyDescription: 'Your latest expenses will appear here',
    },
    breakdown: {
      title: 'Top Categories',
      emptyTitle: 'Add transactions to see your spending',
      emptyDescription: 'Your top expense categories will appear here',
    },
    averageTitle: 'Average Monthly',
  },
  income: {
    type: 'income',
    pageName: 'Income',
    activeSection: 'income',
    addLabel: 'Add Income',
    draftAmount: 0.01,
    update: {
      message: 'See how your income changes month to month in Statistics.',
      highlight: 'month to month',
    },
    upcoming: {
      title: 'Upcoming Incomes',
      emptyTitle: 'No upcoming incomes yet',
      emptyDescription: 'Create a recurring income to see it here',
    },
    latest: {
      title: 'Latest Incomes',
      emptyTitle: 'Add transactions to see your income',
      emptyDescription: 'Your latest income will appear here',
    },
    breakdown: {
      title: 'Top Sources',
      emptyTitle: 'Add income to see your sources',
      emptyDescription: 'Your top income sources will appear here',
    },
    averageTitle: 'Average',
  },
};
