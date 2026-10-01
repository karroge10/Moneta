'use client';

import { useMemo, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import UpdateCard from '@/components/dashboard/UpdateCard';
import UpcomingRecurringCard from '@/components/dashboard/UpcomingRecurringCard';
import LatestTransactionsCard from '@/components/dashboard/LatestTransactionsCard';
import PerformanceCard from '@/components/dashboard/PerformanceCard';
import BreakdownCard from '@/components/dashboard/BreakdownCard';
import DemographicComparisonCard from '@/components/dashboard/DemographicComparisonCard';
import InsightCard from '@/components/dashboard/InsightCard';
import EstimatedTaxCard from '@/components/dashboard/EstimatedTaxCard';
import type { LayoutBreakpoint } from '@/components/dashboard/DashboardLayout';
import TransactionModal from '@/components/transactions/TransactionModal';
import ErrorState from '@/components/ui/ErrorState';
import CashflowLayout, { type CashflowSlots } from '@/components/cashflow/CashflowLayout';
import CashflowSkeleton from '@/components/cashflow/CashflowSkeleton';
import CashflowAverageCard from '@/components/cashflow/CashflowAverageCard';
import CashflowTotalCard from '@/components/cashflow/CashflowTotalCard';
import { CASHFLOW_CONFIG } from '@/components/cashflow/cashflow-config';
import { toUpcomingItems } from '@/components/cashflow/upcoming-items';
import type { TimePeriod } from '@/types/dashboard';
import { formatDate } from '@/lib/format';
import { useCurrency } from '@/hooks/useCurrency';
import { useCategories } from '@/hooks/useCategories';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';
import { useCashflowSummary, useRecurringItems, type CashflowType, type CashflowSummary } from '@/hooks/useCashflowData';
import { useCashflowEditor } from '@/hooks/useCashflowEditor';

/** The expenses and income pages: same layout and data flow, differences live in CASHFLOW_CONFIG. */
export default function CashflowPage({ type }: { type: CashflowType }) {
  const config = CASHFLOW_CONFIG[type];
  const isExpense = type === 'expense';
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('This Year');
  const { incomeTaxRate } = useCurrency();
  const { categories } = useCategories();
  const { currencyOptions, loading: currencyOptionsLoading } = useCurrencyOptions();
  const summaryQuery = useCashflowSummary(type, timePeriod);
  const recurringQuery = useRecurringItems(type);

  const recurringItems = useMemo(() => recurringQuery.data ?? [], [recurringQuery.data]);
  const upcomingItems = useMemo(() => toUpcomingItems(recurringItems, categories), [recurringItems, categories]);
  const editor = useCashflowEditor({ kind: type, draftAmount: config.draftAmount, recurringItems, categories });

  const isDailyPeriod = timePeriod === 'This Month' || timePeriod === 'Last Month';
  const trendLabel = COMPARISON_LABELS[timePeriod];
  const summary = summaryQuery.data;

  const buildSlots = (data: CashflowSummary, breakpoint: LayoutBreakpoint): CashflowSlots => {
    const average = (
      <CashflowAverageCard summary={data} isExpense={isExpense} isDailyPeriod={isDailyPeriod} trendLabel={trendLabel} />
    );
    const roundup = <InsightCard insight={data.roundupInsight} timePeriod={timePeriod} shortRow={breakpoint === 'mobile'} />;
    return {
      update: (
        <UpdateCard
          date={formatDate(new Date(), 'medium')}
          message={config.update.message}
          highlight={config.update.highlight}
          link="View Statistics"
          linkHref="/statistics"
        />
      ),
      total: <CashflowTotalCard total={data.total} isExpense={isExpense} trendLabel={trendLabel} missingRates={data.missingRates} />,
      side: isExpense ? average : <EstimatedTaxCard taxRate={incomeTaxRate} totalIncome={data.total.amount} />,
      upcoming: <UpcomingRecurringCard {...config.upcoming} items={upcomingItems} onItemClick={editor.openUpcoming} />,
      latest: <LatestTransactionsCard {...config.latest} transactions={data.latest} onItemClick={editor.openExisting} />,
      performance: <PerformanceCard {...data.performance} isExpense={isExpense} />,
      breakdown: <BreakdownCard {...config.breakdown} items={data.breakdown} />,
      demographic: <DemographicComparisonCard type={type} disabled={data.demographicComparisonsDisabled} />,
      extra: isExpense ? roundup : average,
    };
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="hidden md:block">
        <DashboardHeader
          pageName={config.pageName}
          actionButton={{ label: config.addLabel, onClick: editor.openNew }}
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
        />
      </div>
      <div className="md:hidden">
        <MobileNavbar
          pageName={config.pageName}
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          activeSection={config.activeSection}
        />
      </div>

      {summary ? (
        <CashflowLayout slots={(breakpoint) => buildSlots(summary, breakpoint)} pairTotalOnMobile={isExpense} />
      ) : summaryQuery.isError ? (
        <ErrorState
          className="min-h-[60vh]"
          message={summaryQuery.error.message}
          onRetry={() => summaryQuery.refetch()}
          retrying={summaryQuery.isFetching}
        />
      ) : (
        <CashflowSkeleton config={config} isDailyPeriod={isDailyPeriod} />
      )}

      {editor.selected && (
        <TransactionModal
          transaction={editor.selected}
          mode={editor.mode}
          onClose={editor.close}
          onSave={editor.handleSave}
          onDelete={editor.handleDelete}
          onPauseResume={editor.selected.recurringId !== undefined ? editor.handlePauseResume : undefined}
          isSaving={editor.isSaving}
          isDeleting={editor.isDeleting}
          categories={categories}
          currencyOptions={currencyOptions}
          currencyOptionsLoading={currencyOptionsLoading}
        />
      )}
    </main>
  );
}

const COMPARISON_LABELS: Record<TimePeriod, string> = {
  'This Month': 'from last month',
  'Last Month': 'from 2 months ago',
  'This Year': 'from last year',
  'Last Year': 'from 2 years ago',
  'All Time': 'since beginning',
};
