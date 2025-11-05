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

export default function TestDashPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('This Year');

  return (
    <main className="min-h-screen bg-[#202020]">
      <DashboardHeader timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} />

      {/* Mobile: Single column stack */}
      <div className="flex flex-col gap-2 px-4 pb-4 md:hidden">
        <IncomeCard amount={mockIncome.amount} trend={mockIncome.trend} />
        <ExpenseCard amount={mockExpenses.amount} trend={mockExpenses.trend} />
        <GoalsCard goals={mockGoals} />
        <FinancialHealthCard score={mockFinancialHealth} />
        <UpcomingBillsCard bills={mockBills} />
        <TransactionsCard transactions={mockTransactions} />
        <UpdateCard
          date={mockUpdate.date}
          message={mockUpdate.message}
          highlight={mockUpdate.highlight}
          link={mockUpdate.link}
        />
        <InsightCard
          title={mockInsight.title}
          amount={mockInsight.amount}
          message={mockInsight.message}
          investmentAmount={mockInsight.investmentAmount}
          trend={mockInsight.trend}
        />
        <InvestmentsCard investments={mockInvestments} />
        <TopExpensesCard expenses={mockTopExpenses} />
      </div>

      {/* Tablet: 2 columns */}
      <div className="testdash-grid-container hidden md:grid md:grid-cols-2 md:gap-3 md:px-6 md:pb-6 lg:hidden">
        <div className="col-span-2 grid grid-cols-3 gap-3">
          <UpdateCard
            date={mockUpdate.date}
            message={mockUpdate.message}
            highlight={mockUpdate.highlight}
            link={mockUpdate.link}
          />
          <IncomeCard amount={mockIncome.amount} trend={mockIncome.trend} />
          <ExpenseCard amount={mockExpenses.amount} trend={mockExpenses.trend} />
        </div>
        <TransactionsCard transactions={mockTransactions} />
        <InsightCard
          title={mockInsight.title}
          amount={mockInsight.amount}
          message={mockInsight.message}
          investmentAmount={mockInsight.investmentAmount}
          trend={mockInsight.trend}
        />
        <GoalsCard goals={mockGoals} />
        <FinancialHealthCard score={mockFinancialHealth} />
        <InvestmentsCard investments={mockInvestments} />
        <UpcomingBillsCard bills={mockBills} />
        <TopExpensesCard expenses={mockTopExpenses} />
      </div>

      {/* Desktop: Complex Grid Layout */}
      <div className="testdash-grid-container hidden lg:grid lg:grid-cols-4 lg:gap-4 lg:px-6 lg:pb-6">
        {/* Grid 1: Left side (3 columns) */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* Row 1: Update, Income, Expense */}
          <div className="grid grid-cols-3 gap-4">
            <UpdateCard
              date={mockUpdate.date}
              message={mockUpdate.message}
              highlight={mockUpdate.highlight}
              link={mockUpdate.link}
            />
            <IncomeCard amount={mockIncome.amount} trend={mockIncome.trend} />
            <ExpenseCard amount={mockExpenses.amount} trend={mockExpenses.trend} />
          </div>

          {/* Row 2: Sub-bento grid using CSS Grid */}
          <div className="grid grid-cols-5 gap-4">
            {/* Left: Transactions + Insight (2 columns) */}
            <div className="col-span-2 flex flex-col gap-4">
              <div className="flex-[7] min-h-0">
                <TransactionsCard transactions={mockTransactions} />
              </div>
              <div className="flex-[3] min-h-0">
                <InsightCard
                  title={mockInsight.title}
                  amount={mockInsight.amount}
                  message={mockInsight.message}
                  investmentAmount={mockInsight.investmentAmount}
                  trend={mockInsight.trend}
                />
              </div>
            </div>

            {/* Right: Goals + Financial Health + Investments (3 columns) */}
            <div className="col-span-3 flex flex-col gap-4">
              {/* Goals and Financial Health side-by-side */}
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-3">
                  <GoalsCard goals={mockGoals} />
                </div>
                <div className="col-span-2 flex flex-col">
                  <FinancialHealthCard score={mockFinancialHealth} />
                </div>
              </div>
              
              {/* Investments below - fills remaining space */}
              <div className="flex-1 min-h-0">
                <InvestmentsCard investments={mockInvestments} />
              </div>
            </div>
          </div>
        </div>

        {/* Grid 2: Right side (1 column) */}
        <div className="col-span-1 flex flex-col gap-4">
          <UpcomingBillsCard bills={mockBills} />
          <div className="flex-1 min-h-0">
            <TopExpensesCard expenses={mockTopExpenses} />
          </div>
        </div>
      </div>
    </main>
  );
}

