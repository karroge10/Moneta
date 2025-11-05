'use client';

import { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
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
    <main className="min-h-screen bg-[#202020]">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} />
      </div>

      {/* Mobile Navbar */}
      <div className="md:hidden">
        <MobileNavbar 
          pageName="Dashboard" 
          timePeriod={timePeriod} 
          onTimePeriodChange={setTimePeriod}
          activeSection="dashboard"
        />
      </div>

      {/* Mobile: Custom Layout (< 768px) */}
      <div className="flex flex-col gap-4 px-4 pb-4 md:hidden">
        {/* Income | Expenses 50/50 */}
        <div className="grid grid-cols-2 gap-4">
          <IncomeCard amount={mockIncome.amount} trend={mockIncome.trend} />
          <ExpenseCard amount={mockExpenses.amount} trend={mockExpenses.trend} />
        </div>

        {/* Goals full width */}
        <GoalsCard goals={mockGoals} />

        {/* Financial Health short row */}
        <FinancialHealthCard score={mockFinancialHealth} mobile />

        {/* Upcoming Bills full width */}
        <UpcomingBillsCard bills={mockBills} />

        {/* Transactions full width */}
        <TransactionsCard transactions={mockTransactions} />

        {/* Update Card */}
        <UpdateCard
          date={mockUpdate.date}
          message={mockUpdate.message}
          highlight={mockUpdate.highlight}
          link={mockUpdate.link}
        />

        {/* Insight short row */}
        <InsightCard
          title={mockInsight.title}
          amount={mockInsight.amount}
          message={mockInsight.message}
          investmentAmount={mockInsight.investmentAmount}
          trend={mockInsight.trend}
          shortRow
        />

        {/* Investments */}
        <InvestmentsCard investments={mockInvestments} />

        {/* Top Expenses */}
        <TopExpensesCard expenses={mockTopExpenses} />
      </div>

      {/* Two-column layout: 768px - 1536px */}
      <div className="hidden md:grid 2xl:hidden md:grid-cols-2 md:gap-4 md:px-6 md:pb-6">
        <IncomeCard amount={mockIncome.amount} trend={mockIncome.trend} />
        <ExpenseCard amount={mockExpenses.amount} trend={mockExpenses.trend} />
        <InsightCard
          title={mockInsight.title}
          amount={mockInsight.amount}
          message={mockInsight.message}
          investmentAmount={mockInsight.investmentAmount}
          trend={mockInsight.trend}
          minimal
        />
        <FinancialHealthCard score={mockFinancialHealth} minimal />
        <GoalsCard goals={mockGoals} />
        <UpcomingBillsCard bills={mockBills} />
        <TransactionsCard transactions={mockTransactions} />
        <TopExpensesCard expenses={mockTopExpenses} />
        <div className="col-span-2">
          <InvestmentsCard investments={mockInvestments} />
        </div>
      </div>

      {/* Desktop: Pure Tailwind Bento Grid */}
      <div className="hidden 2xl:grid 2xl:grid-cols-4 2xl:gap-4 2xl:px-6 2xl:pb-6">
        {/* Grid 1: Left side (3 columns) */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* Row 1: Update, Income, Expense - equal width */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <UpdateCard
                date={mockUpdate.date}
                message={mockUpdate.message}
                highlight={mockUpdate.highlight}
                link={mockUpdate.link}
              />
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <IncomeCard amount={mockIncome.amount} trend={mockIncome.trend} />
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <ExpenseCard amount={mockExpenses.amount} trend={mockExpenses.trend} />
            </div>
          </div>

          {/* Row 2: Sub-bento grid */}
          <div className="grid grid-cols-5 gap-4">
            {/* Left column (2 cols): Transactions + Insight stacked */}
            <div className="col-span-2 flex flex-col gap-4">
              <div className="flex-[7] min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <TransactionsCard transactions={mockTransactions} />
              </div>
              <div className="min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <InsightCard
                  title={mockInsight.title}
                  amount={mockInsight.amount}
                  message={mockInsight.message}
                  investmentAmount={mockInsight.investmentAmount}
                  trend={mockInsight.trend}
                />
              </div>
            </div>

            {/* Right column (3 cols): Goals + Financial Health + Investments */}
            <div className="col-span-3 flex flex-col gap-4">
              {/* Top row: Goals + Financial Health side-by-side */}
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-3 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                  <GoalsCard goals={mockGoals} />
                </div>
                <div className="col-span-2 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                  <FinancialHealthCard score={mockFinancialHealth} />
                </div>
              </div>
              
              {/* Bottom row: Investments fills remaining space */}
              <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <InvestmentsCard investments={mockInvestments} />
              </div>
            </div>
          </div>
        </div>

        {/* Grid 2: Right side (1 column) - Upcoming Bills + Top Expenses */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <UpcomingBillsCard bills={mockBills} />
          </div>
          <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <TopExpensesCard expenses={mockTopExpenses} />
          </div>
        </div>
      </div>
    </main>
  );
}
