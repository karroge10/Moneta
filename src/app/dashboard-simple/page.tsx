'use client';

import { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
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

export default function DashboardSimple() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('This Year');

  return (
    <main>
      <DashboardHeader timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} />
      
      {/* Responsive Bento Grid - Pure Tailwind */}
      <div className="px-4 sm:px-6 pb-6">
        {/* Mobile: Single column stack */}
        <div className="flex flex-col gap-4 md:hidden">
          <IncomeCard amount={mockIncome.amount} trend={mockIncome.trend} />
          <ExpenseCard amount={mockExpenses.amount} trend={mockExpenses.trend} />
          <UpdateCard
            date={mockUpdate.date}
            message={mockUpdate.message}
            highlight={mockUpdate.highlight}
            link={mockUpdate.link}
          />
          <GoalsCard goals={mockGoals} />
          <FinancialHealthCard score={mockFinancialHealth} />
          <TransactionsCard transactions={mockTransactions} />
          <InsightCard
            title={mockInsight.title}
            amount={mockInsight.amount}
            message={mockInsight.message}
            investmentAmount={mockInsight.investmentAmount}
            trend={mockInsight.trend}
          />
          <InvestmentsCard investments={mockInvestments} />
          <UpcomingBillsCard bills={mockBills} />
          <TopExpensesCard expenses={mockTopExpenses} />
        </div>

        {/* Tablet: 2-column grid */}
        <div className="hidden md:grid lg:hidden grid-cols-2 gap-4">
          {/* Row 1: Income, Expense */}
          <IncomeCard amount={mockIncome.amount} trend={mockIncome.trend} />
          <ExpenseCard amount={mockExpenses.amount} trend={mockExpenses.trend} />
          
          {/* Row 2: Update full width */}
          <div className="col-span-2">
            <UpdateCard
              date={mockUpdate.date}
              message={mockUpdate.message}
              highlight={mockUpdate.highlight}
              link={mockUpdate.link}
            />
          </div>
          
          {/* Row 3: Goals, Financial Health */}
          <GoalsCard goals={mockGoals} />
          <FinancialHealthCard score={mockFinancialHealth} />
          
          {/* Row 4: Transactions, Insight */}
          <TransactionsCard transactions={mockTransactions} />
          <InsightCard
            title={mockInsight.title}
            amount={mockInsight.amount}
            message={mockInsight.message}
            investmentAmount={mockInsight.investmentAmount}
            trend={mockInsight.trend}
          />
          
          {/* Row 5: Investments, Upcoming Bills */}
          <InvestmentsCard investments={mockInvestments} />
          <UpcomingBillsCard bills={mockBills} />
          
          {/* Row 6: Top Expenses */}
          <TopExpensesCard expenses={mockTopExpenses} />
        </div>

        {/* Desktop: Complex bento grid */}
        <div className="hidden lg:flex lg:flex-col gap-4">
          {/* Row 1: Update (slightly wider), Income, Expense, Financial Health (thinner) */}
          <div className="grid gap-4" style={{ gridTemplateColumns: '1.4fr 1.2fr 1.2fr 0.9fr' }}>
            <div className="flex flex-col [&>.card-surface]:flex-1">
              <UpdateCard
                date={mockUpdate.date}
                message={mockUpdate.message}
                highlight={mockUpdate.highlight}
                link={mockUpdate.link}
              />
            </div>
            <div className="flex flex-col [&>.card-surface]:flex-1">
              <IncomeCard amount={mockIncome.amount} trend={mockIncome.trend} />
            </div>
            <div className="flex flex-col [&>.card-surface]:flex-1">
              <ExpenseCard amount={mockExpenses.amount} trend={mockExpenses.trend} />
            </div>
            <div className="flex flex-col [&>.card-surface]:flex-1">
              <FinancialHealthCard score={mockFinancialHealth} />
            </div>
          </div>

          {/* Row 2: Remaining cards in 12-column grid */}
          <div className="grid grid-cols-12 gap-4">

          {/* Row 2: Left column (span 4) - Transactions + Insight stacked */}
          <div className="col-span-4 flex flex-col gap-4 h-full">
            <TransactionsCard transactions={mockTransactions} />
            <div className="flex-1 min-h-0">
              <div className="h-full [&>.card-surface]:h-full">
                <InsightCard
                  title={mockInsight.title}
                  amount={mockInsight.amount}
                  message={mockInsight.message}
                  investmentAmount={mockInsight.investmentAmount}
                  trend={mockInsight.trend}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Middle column (span 4) - Goals (wider now), then Investments */}
          <div className="col-span-4 flex flex-col gap-4 h-full">
            {/* Goals - now full width since Financial Health moved */}
            <GoalsCard goals={mockGoals} />
            {/* Investments - stretches to match Insight and Top Expenses bottom */}
            <div className="flex-1 min-h-0">
              <div className="h-full [&>.card-surface]:h-full">
                <InvestmentsCard investments={mockInvestments} />
              </div>
            </div>
          </div>

          {/* Row 2: Right column (span 4) - Upcoming Bills, Top Expenses */}
          <div className="col-span-4 flex flex-col gap-4 h-full">
            <UpcomingBillsCard bills={mockBills} />
            <div className="flex-1 min-h-0">
              <div className="h-full [&>.card-surface]:h-full">
                <TopExpensesCard expenses={mockTopExpenses} />
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </main>
  );
}

