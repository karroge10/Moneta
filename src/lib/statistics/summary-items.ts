import type { StatisticsSummaryItem } from '@/types/dashboard';

export type SummaryItemsInput = {
  totalIncome: number;
  totalExpenses: number;
  incomeSaved: number;
  incomeTrend: number;
  expensesTrend: number;
  totalGoals: number;
  goalsSuccessRate: number;
  portfolioBalance: number;
  healthScore: number;
  healthTrend: number;
};

/** The six summary cards on the statistics page. */
export function buildSummaryItems(input: SummaryItemsInput): StatisticsSummaryItem[] {
  return [
    {
      id: '1',
      label: 'Income',
      value: Math.round(input.totalIncome),
      change: formatTrend(input.incomeTrend, '% from beginning'),
      icon: 'Wallet',
      iconColor: '#74C648',
    },
    {
      id: '2',
      label: 'Expenses',
      value: Math.round(input.totalExpenses),
      change: formatTrend(input.expensesTrend, '% from beginning'),
      invertChangeColor: true,
      icon: 'ShoppingBag',
      iconColor: '#D93F3F',
    },
    {
      id: '3',
      label: 'Income Saved',
      value: Math.round(input.incomeSaved),
      change: '',
      icon: 'LotOfCash',
      iconColor: '#4A90E2',
    },
    {
      id: '4',
      label: 'Goals Success Rate',
      value: input.totalGoals > 0 ? `${input.goalsSuccessRate}%` : '0%',
      change: '',
      icon: 'Trophy',
      iconColor: '#FFA500',
    },
    {
      id: '5',
      label: 'Portfolio Balance',
      value: Math.round(input.portfolioBalance),
      change: '',
      icon: 'BitcoinCircle',
      iconColor: '#FF8C00',
    },
    {
      id: '6',
      label: 'Financial Health Score',
      value: `${input.healthScore}/100`,
      change: formatTrend(input.healthTrend, ' vs last period'),
      icon: 'Heart',
      iconColor: '#AC66DA',
      isLarge: true,
      link: 'Learn how we calculate the financial health score >',
    },
  ];
}

function formatTrend(trend: number, suffix: string): string {
  if (trend === 0) return '';
  const sign = trend > 0 ? '+' : '';
  return `${sign}${trend}${suffix}`;
}
