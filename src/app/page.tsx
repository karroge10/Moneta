'use client';

import { useState, useRef, useEffect } from 'react';
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
import LevelUpCard from '@/components/dashboard/LevelUpCard';
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
  const updateCardRef = useRef<HTMLDivElement>(null);
  const [updateHeight, setUpdateHeight] = useState<number | null>(null);
  const goalsCardRef = useRef<HTMLDivElement>(null);
  const [goalsHeight, setGoalsHeight] = useState<number | null>(null);
  const transactionsInsightGroupRef = useRef<HTMLDivElement>(null);
  const [transactionsInsightHeight, setTransactionsInsightHeight] = useState<number | null>(null);
  const insightCardRef = useRef<HTMLDivElement>(null);
  const levelUpWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateHeightFromRef = () => {
      if (updateCardRef.current) {
        setUpdateHeight(updateCardRef.current.offsetHeight);
      }
    };

    updateHeightFromRef();
    window.addEventListener('resize', updateHeightFromRef);
    
    // Use ResizeObserver for more accurate measurement
    const resizeObserver = new ResizeObserver(() => {
      updateHeightFromRef();
    });
    
    if (updateCardRef.current) {
      resizeObserver.observe(updateCardRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateHeightFromRef);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const updateGoalsHeight = () => {
      if (goalsCardRef.current) {
        setGoalsHeight(goalsCardRef.current.offsetHeight);
      }
    };

    updateGoalsHeight();
    window.addEventListener('resize', updateGoalsHeight);
    
    // Use ResizeObserver for more accurate measurement
    const resizeObserver = new ResizeObserver(() => {
      updateGoalsHeight();
    });
    
    if (goalsCardRef.current) {
      resizeObserver.observe(goalsCardRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateGoalsHeight);
      resizeObserver.disconnect();
    };
  }, []);

  // Height calculations for desktop layout - runs immediately
  useEffect(() => {
    const updateTransactionsInsightHeight = () => {
      // Only calculate if we're on desktop (check via media query or window width)
      if (window.innerWidth < 1280) {
        setTransactionsInsightHeight(null);
        return;
      }

      if (transactionsInsightGroupRef.current) {
        const height = transactionsInsightGroupRef.current.offsetHeight;
        setTransactionsInsightHeight(height);
      }
    };

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      updateTransactionsInsightHeight();
    });

    window.addEventListener('resize', updateTransactionsInsightHeight);
    
    // Use ResizeObserver for more accurate measurement
    const resizeObserver = new ResizeObserver(() => {
      updateTransactionsInsightHeight();
    });
    
    if (transactionsInsightGroupRef.current) {
      resizeObserver.observe(transactionsInsightGroupRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateTransactionsInsightHeight);
      resizeObserver.disconnect();
    };
  }, []);

  // Level Up card height calculation - separate effect
  useEffect(() => {
    if (!levelUpWrapperRef.current || !insightCardRef.current) return;

    const updateLevelUpHeight = () => {
      // Only on desktop
      if (window.innerWidth < 1280) return;

      const rect = levelUpWrapperRef.current!.getBoundingClientRect();
      if (rect.width === 0) return; // Element is hidden

      const insightBottom = insightCardRef.current!.getBoundingClientRect().bottom;
      const levelUpTop = levelUpWrapperRef.current!.getBoundingClientRect().top;
      const neededHeight = insightBottom - levelUpTop;
      
      if (neededHeight > 0 && neededHeight < 10000) {
        levelUpWrapperRef.current!.style.height = `${neededHeight}px`;
      }
    };

    // Initial calculation
    requestAnimationFrame(() => {
      updateLevelUpHeight();
    });

    // Set up observers for dynamic updates
    const resizeObserver = new ResizeObserver(() => {
      if (window.innerWidth >= 1280) {
        updateLevelUpHeight();
      }
    });

    resizeObserver.observe(insightCardRef.current);
    resizeObserver.observe(levelUpWrapperRef.current!);

    window.addEventListener('resize', updateLevelUpHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateLevelUpHeight);
    };
  }, []);



  return (
    <main>
      <DashboardHeader timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} />
      
      {/* Mobile/Tablet: Single column layout */}
      <div className="dashboard-mobile px-4 sm:px-6 pb-6 md:hidden">
        <div className="flex flex-col gap-4">
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
          <LevelUpCard />
        </div>
      </div>

      {/* Tablet: 2-column layout (768px - 1279px) */}
      <div className="dashboard-tablet px-6 pb-6 hidden md:flex lg:hidden">
        <div className="flex flex-col gap-4 w-full">
          {/* Row 1: Income, Expense, Update */}
          <div className="flex gap-4">
            <div className="flex-1">
              <IncomeCard amount={mockIncome.amount} trend={mockIncome.trend} />
            </div>
            <div className="flex-1">
              <ExpenseCard amount={mockExpenses.amount} trend={mockExpenses.trend} />
            </div>
            <div className="flex-1">
              <UpdateCard
                date={mockUpdate.date}
                message={mockUpdate.message}
                highlight={mockUpdate.highlight}
                link={mockUpdate.link}
              />
            </div>
          </div>
          {/* Row 2: Goals, Financial Health */}
          <div className="flex gap-4">
            <div className="flex-1">
              <GoalsCard goals={mockGoals} />
            </div>
            <div className="flex-1">
              <FinancialHealthCard score={mockFinancialHealth} />
            </div>
          </div>
          {/* Row 3: Transactions, Insight */}
          <div className="flex gap-4">
            <div className="flex-1">
              <TransactionsCard transactions={mockTransactions} />
            </div>
            <div className="flex-1">
              <InsightCard
                title={mockInsight.title}
                amount={mockInsight.amount}
                message={mockInsight.message}
                investmentAmount={mockInsight.investmentAmount}
                trend={mockInsight.trend}
              />
            </div>
          </div>
          {/* Row 4: Investments, Upcoming Bills */}
          <div className="flex gap-4">
            <div className="flex-1">
              <InvestmentsCard investments={mockInvestments} />
            </div>
            <div className="flex-1">
              <UpcomingBillsCard bills={mockBills} />
            </div>
          </div>
          {/* Row 5: Top Expenses, Level Up */}
          <div className="flex gap-4">
            <div className="flex-1">
              <TopExpensesCard expenses={mockTopExpenses} />
            </div>
            <div className="flex-1">
              <LevelUpCard />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: Full complex layout (≥1280px) - CSS handles visibility */}
      <div className="dashboard-desktop px-6 pb-6 hidden lg:flex flex-wrap" style={{ gap: '16px', alignItems: 'flex-start' }}>
        {/* Left Column: Contains both rows of left-side cards */}
        <div style={{ flex: '0 0 calc(75% - 8px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Row 1: Update, Income, Expenses (matched to Update height) */}
          <div className="bento-height-match" style={{ alignItems: 'flex-start', display: 'flex', gap: '16px' }}>
            <div ref={updateCardRef} style={{ flex: '0 0 calc(33.333% - 10.667px)', display: 'flex', flexDirection: 'column' }}>
              <UpdateCard
                date={mockUpdate.date}
                message={mockUpdate.message}
                highlight={mockUpdate.highlight}
                link={mockUpdate.link}
              />
            </div>
            <div style={{ flex: '0 0 calc(33.333% - 10.667px)', height: updateHeight ? `${updateHeight}px` : 'auto', display: 'flex', flexDirection: 'column' }}>
              <IncomeCard amount={mockIncome.amount} trend={mockIncome.trend} />
            </div>
            <div style={{ flex: '0 0 calc(33.333% - 10.667px)', height: updateHeight ? `${updateHeight}px` : 'auto', display: 'flex', flexDirection: 'column' }}>
              <ExpenseCard amount={mockExpenses.amount} trend={mockExpenses.trend} />
            </div>
          </div>

           {/* Row 2: Transactions + Insight (stacked) | Goals + Financial Health (side-by-side) + Investments (below) */}
           <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
             {/* Left: Transactions with Insight below */}
             <div 
               ref={(el) => {
                 transactionsInsightGroupRef.current = el;
               }}
               style={{ flex: '0 0 calc(46% - 14.72px)', display: 'flex', flexDirection: 'column', gap: '16px' }}
             >
               <TransactionsCard transactions={mockTransactions} />
               <div ref={insightCardRef}>
                 <InsightCard
                   title={mockInsight.title}
                   amount={mockInsight.amount}
                   message={mockInsight.message}
                   investmentAmount={mockInsight.investmentAmount}
                   trend={mockInsight.trend}
                 />
               </div>
             </div>
             
             {/* Right: Goals + Financial Health (side-by-side) with Investments below */}
             <div 
               style={{ flex: '0 0 calc(54% - 1.28px)', display: 'flex', flexDirection: 'column', gap: '16px', height: transactionsInsightHeight ? `${transactionsInsightHeight}px` : 'auto' }}
             >
               {/* Goals and Financial Health side-by-side */}
               <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                 <div ref={goalsCardRef} style={{ flex: '0 0 calc(55.555% - 8.889px)', display: 'flex', flexDirection: 'column' }}>
                   <GoalsCard goals={mockGoals} />
                 </div>
                 <div style={{ flex: '0 0 calc(44.444% - 7.111px)', height: goalsHeight ? `${goalsHeight}px` : 'auto', display: 'flex', flexDirection: 'column' }} className="height-constrained">
                   <FinancialHealthCard score={mockFinancialHealth} />
                 </div>
               </div>
               {/* Investments below Goals and Financial Health, spanning their combined width - stretches to fill remaining height */}
               <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} className="height-constrained">
                 <InvestmentsCard investments={mockInvestments} />
               </div>
             </div>
           </div>
        </div>

        {/* Right Column: Upcoming Bills, Top Expenses, and Upgrade Banner */}
        <div style={{ flex: '0 0 calc(25% - 8px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <UpcomingBillsCard bills={mockBills} />
          </div>
          {/* Top Expenses and Level Up: Match Insight's bottom position exactly */}
          <div 
            style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}
          >
            <div style={{ flexShrink: 0 }}>
              <TopExpensesCard expenses={mockTopExpenses} />
            </div>
            {/* Level Up card - height calculated to match Insight bottom exactly */}
            <div 
              ref={levelUpWrapperRef}
              style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }} 
              className="height-constrained"
            >
              <LevelUpCard />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
