'use client';

import { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import BentoGrid from '@/components/BentoGrid';
import UpdateCard from '@/components/dashboard/UpdateCard';
import IncomeCard from '@/components/dashboard/IncomeCard';
import ExpenseCard from '@/components/dashboard/ExpenseCard';
import UpcomingBillsCard from '@/components/dashboard/UpcomingBillsCard';
import TransactionsCard from '@/components/dashboard/TransactionsCard';
import GoalsCard from '@/components/dashboard/GoalsCard';
import FinancialHealthCard from '@/components/dashboard/FinancialHealthCard';
import InvestmentsCard from '@/components/dashboard/InvestmentsCard';
import InsightCard from '@/components/dashboard/InsightCard';
import TopExpensesCard from '@/components/dashboard/TopExpensesCard';
import {
  mockIncome,
  mockExpenses,
  mockUpdate,
  mockBills,
  mockTransactions,
  mockGoals,
  mockFinancialHealth,
  mockInvestments,
  mockInsight,
  mockTopExpenses,
} from '@/lib/mockData';
import { TimePeriod } from '@/types/dashboard';

export default function Home() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('This Year');

  return (
    <main>
      <DashboardHeader timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} />
      
      <BentoGrid>
        {/* Row 1 */}
        <div style={{ gridColumn: 'span 3' }}>
          <UpdateCard
            date={mockUpdate.date}
            message={mockUpdate.message}
            highlight={mockUpdate.highlight}
            link={mockUpdate.link}
          />
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <IncomeCard amount={mockIncome.amount} trend={mockIncome.trend} />
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <ExpenseCard amount={mockExpenses.amount} trend={mockExpenses.trend} />
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <UpcomingBillsCard bills={mockBills} />
        </div>

        {/* Row 2 */}
        <div style={{ gridColumn: 'span 3' }}>
          <TransactionsCard transactions={mockTransactions} />
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <GoalsCard goals={mockGoals} />
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <FinancialHealthCard score={mockFinancialHealth} />
        </div>

        {/* Row 3 */}
        <div style={{ gridColumn: 'span 6' }}>
          <InvestmentsCard investments={mockInvestments} />
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <InsightCard
            title={mockInsight.title}
            amount={mockInsight.amount}
            message={mockInsight.message}
            investmentAmount={mockInsight.investmentAmount}
            trend={mockInsight.trend}
          />
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <TopExpensesCard expenses={mockTopExpenses} />
        </div>

        {/* Row 4 - Upgrade Banner */}
        <div style={{ gridColumn: 'span 9', marginTop: '24px' }}>
          <div className="upgrade-banner">
            <span className="text-body font-semibold">Level Up Your Finance Game!</span>
            <button>Upgrade to Premium</button>
          </div>
        </div>
      </BentoGrid>
    </main>
  );
}
