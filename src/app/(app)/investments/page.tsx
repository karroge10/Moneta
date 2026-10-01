'use client';

import { useState } from 'react';
import { Plus, WarningTriangle } from 'iconoir-react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import CardSkeleton from '@/components/dashboard/CardSkeleton';
import UpdateCard from '@/components/dashboard/UpdateCard';
import AddInvestmentDialog from '@/components/investments/AddInvestmentDialog';
import AssetModal from '@/components/investments/AssetModal';
import InvestmentTransactionModal from '@/components/investments/InvestmentTransactionModal';
import PortfolioTrendCard from '@/components/investments/PortfolioTrendCard';
import TotalInvestedCard from '@/components/investments/TotalInvestedCard';
import AssetAllocationCard from '@/components/investments/AssetAllocationCard';
import PortfolioPerformanceChart from '@/components/investments/PortfolioPerformanceChart';
import PortfolioList from '@/components/investments/PortfolioList';
import RecentActivities from '@/components/investments/RecentActivities';
import { useCurrency } from '@/hooks/useCurrency';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';
import {
  DEFAULT_PERFORMANCE_RANGE,
  useInvestmentsSummary,
  usePortfolioPerformance,
} from '@/hooks/investments/useInvestmentQueries';
import {
  useCreateInvestment,
  useDeleteInvestmentTransaction,
  useUpdateInvestmentTransaction,
} from '@/hooks/investments/useInvestmentMutations';
import { isValuationMissing, type InvestmentsSummary } from '@/hooks/investments/types';
import { useToast } from '@/contexts/ToastContext';
import type {
  InvestmentCreatePayload,
  InvestmentForAddTransaction,
  InvestmentRecentActivity,
  InvestmentTransactionEditState,
} from '@/types/investments';

export default function InvestmentsPage() {
  const { currency } = useCurrency();
  const { currencyOptions } = useCurrencyOptions();
  const { addToast } = useToast();
  const summary = useInvestmentsSummary();
  const [range, setRange] = useState(DEFAULT_PERFORMANCE_RANGE);
  const performance = usePortfolioPerformance(range);
  const createInvestment = useCreateInvestment();
  const updateTransaction = useUpdateInvestmentTransaction();
  const deleteTransaction = useDeleteInvestmentTransaction();

  const [isAddOpen, setAddOpen] = useState(false);
  const [initialAssetForAdd, setInitialAssetForAdd] = useState<InvestmentForAddTransaction | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<InvestmentTransactionEditState | null>(null);

  const data = summary.data;
  const portfolio = data?.portfolio ?? [];
  const isDefaultRange = range === DEFAULT_PERFORMANCE_RANGE;
  const performanceData = isDefaultRange ? (data?.performance.data ?? []) : (performance.data ?? []);

  const openAddTransaction = (asset?: InvestmentForAddTransaction) => {
    setInitialAssetForAdd(asset ?? null);
    setAddOpen(true);
  };

  const handleSaveInvestment = async (payload: InvestmentCreatePayload) => {
    try {
      await createInvestment.mutateAsync(payload);
      setAddOpen(false);
      setInitialAssetForAdd(null);
      addToast('Investment transaction saved');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'An error occurred', 'error');
    }
  };

  const handleSaveTransaction = async (transaction: InvestmentTransactionEditState) => {
    try {
      await updateTransaction.mutateAsync(transaction);
      setEditingTransaction(null);
      addToast('Transaction updated');
    } catch {
      addToast('Failed to update transaction', 'error');
    }
  };

  const handleDeleteTransaction = async () => {
    if (!editingTransaction) return;
    try {
      await deleteTransaction.mutateAsync(editingTransaction.id);
      setEditingTransaction(null);
      addToast('Transaction deleted');
    } catch {
      addToast('Failed to delete transaction', 'error');
    }
  };

  const handleActivityClick = (activity: InvestmentRecentActivity) => {
    setEditingTransaction(toEditState(activity));
  };

  const assetsEmpty = (
    <EmptyState
      title="No investments tracked yet."
      action={
        <Button variant="ghost" onClick={() => openAddTransaction()}>
          Start your portfolio
        </Button>
      }
      className="h-full"
    />
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="hidden md:block">
        <DashboardHeader
          pageName="Investments"
          actionButton={{
            label: 'Add Investment',
            onClick: () => openAddTransaction(),
            icon: <Plus width={18} height={18} strokeWidth={2.5} />,
          }}
        />
      </div>
      <div className="md:hidden">
        <MobileNavbar pageName="Investments" activeSection="investments" />
      </div>

      {summary.isPending ? (
        <InvestmentsSkeleton />
      ) : summary.isError ? (
        <div className="px-4 pb-4 md:px-6 md:pb-6">
          <div className="card-surface">
            <ErrorState message={summary.error.message} onRetry={() => summary.refetch()} retrying={summary.isFetching} />
          </div>
        </div>
      ) : (
        <div className={GRID}>
          <ValuationNote summary={data} />
          <div className={CELL_CLASS.update}>{data?.update && <UpdateCard {...data.update} linkHref="/notifications" />}</div>
          <div className={CELL_CLASS.value}>
            {data?.balance && <PortfolioTrendCard balance={data.balance} currency={currency} />}
          </div>
          <div className={CELL_CLASS.invested}>
            {data && (
              <TotalInvestedCard
                totalCost={data.totalCost}
                trend={data.totalCostTrend}
                comparisonLabel={data.totalCostComparisonLabel}
                currency={currency}
              />
            )}
          </div>
          <div className={CELL_CLASS.performance}>
            <PortfolioPerformanceChart
              data={performanceData}
              currencySymbol={currency.symbol}
              range={range}
              onRangeChange={setRange}
              isLoading={!isDefaultRange && performance.isFetching}
              isError={!isDefaultRange && performance.isError}
            />
          </div>
          <div className={CELL_CLASS.allocation}>
            <AssetAllocationCard portfolio={portfolio} />
          </div>
          <div className={CELL_CLASS.assets}>
            <Card title="Assets" className="h-full">
              {portfolio.length > 0 ? (
                <PortfolioList portfolio={portfolio} currency={currency} onAssetClick={(holding) => setSelectedAssetId(holding.id)} />
              ) : (
                assetsEmpty
              )}
            </Card>
          </div>
          <div className={CELL_CLASS.recent}>
            <RecentActivities activities={data?.recentActivities ?? []} onSelect={handleActivityClick} />
          </div>
        </div>
      )}

      {editingTransaction && (
        <InvestmentTransactionModal
          key={editingTransaction.id}
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSave={handleSaveTransaction}
          onDelete={handleDeleteTransaction}
          isSaving={updateTransaction.isPending}
          isDeleting={deleteTransaction.isPending}
          currencySymbol={currency.symbol}
          portfolio={portfolio}
        />
      )}

      <AddInvestmentDialog
        open={isAddOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleSaveInvestment}
        initialAsset={initialAssetForAdd}
        currencyOptions={currencyOptions}
        portfolio={portfolio}
        isSaving={createInvestment.isPending}
      />

      {selectedAssetId && (
        <AssetModal
          isOpen
          onClose={() => setSelectedAssetId(null)}
          assetId={selectedAssetId}
          onAddTransaction={openAddTransaction}
        />
      )}
    </main>
  );
}

/**
 * One responsive grid for every breakpoint. Below 2xl it is two columns and Performance, Assets and
 * Recent move after Allocation via `order`; at 2xl it is a 12-column grid in source order.
 */
const GRID = 'grid grid-cols-2 gap-4 px-4 pb-4 md:px-6 md:pb-6 2xl:grid-cols-12';

type Cell = 'update' | 'value' | 'invested' | 'performance' | 'allocation' | 'assets' | 'recent';

const STRETCH = 'flex min-h-0 flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col';

const CELL_CLASS: Record<Cell, string> = {
  update: `col-span-2 md:col-span-1 2xl:col-span-4 ${STRETCH}`,
  value: `col-span-2 sm:col-span-1 2xl:col-span-4 ${STRETCH}`,
  invested: `col-span-2 sm:col-span-1 2xl:col-span-4 ${STRETCH}`,
  performance: `order-1 col-span-2 h-[400px] md:h-[500px] 2xl:order-none 2xl:col-span-6 ${STRETCH}`,
  allocation: `col-span-2 md:col-span-1 2xl:col-span-3 2xl:h-[500px] ${STRETCH}`,
  assets: `order-1 col-span-2 md:h-[500px] 2xl:order-none 2xl:col-span-3 ${STRETCH}`,
  recent: `order-1 col-span-2 2xl:order-none 2xl:col-span-12 ${STRETCH}`,
};

/** Says how many holdings were left out of totals because their price or FX rate is missing. */
function ValuationNote({ summary }: { summary: InvestmentsSummary | undefined }) {
  if (!summary) return null;
  const flaggedHoldings = summary.portfolio.filter(isValuationMissing).length;
  const missingValuations = summary.missingValuations ?? flaggedHoldings;
  const missingRates = summary.missingRates ?? 0;
  if (missingValuations === 0 && missingRates === 0) return null;

  const parts: string[] = [];
  if (missingValuations > 0) {
    const noun = missingValuations === 1 ? 'holding has' : 'holdings have';
    parts.push(`${missingValuations} ${noun} no current price or exchange rate and ${missingValuations === 1 ? 'is' : 'are'} left out of the totals.`);
  }
  if (missingRates > 0) {
    parts.push(`${missingRates} recent ${missingRates === 1 ? 'activity' : 'activities'} could not be converted to your currency.`);
  }

  return (
    <p role="status" className="col-span-2 flex items-start gap-2 rounded-control border border-warning/30 bg-warning/10 px-4 py-3 text-ui text-fg 2xl:col-span-12">
      <WarningTriangle width={18} height={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
      <span>{parts.join(' ')}</span>
    </p>
  );
}

function InvestmentsSkeleton() {
  return (
    <div className={GRID} aria-busy="true">
      <div className={CELL_CLASS.update}>
        <CardSkeleton title="Update" variant="update" />
      </div>
      <div className={CELL_CLASS.value}>
        <CardSkeleton title="Total Value" variant="value" />
      </div>
      <div className={CELL_CLASS.invested}>
        <CardSkeleton title="Total Invested" variant="value" />
      </div>
      <div className={CELL_CLASS.performance}>
        <CardSkeleton title="Performance" variant="chart" />
      </div>
      <div className={CELL_CLASS.allocation}>
        <CardSkeleton title="Allocation" variant="donut" />
      </div>
      <div className={CELL_CLASS.assets}>
        <CardSkeleton title="Assets" variant="list" />
      </div>
      <div className={CELL_CLASS.recent}>
        <CardSkeleton title="Recent Activities" variant="table" />
      </div>
    </div>
  );
}

function toEditState(activity: InvestmentRecentActivity): InvestmentTransactionEditState {
  return {
    id: activity.id,
    date: activity.date,
    investmentType: activity.investmentType,
    quantity: activity.quantity,
    pricePerUnit: activity.pricePerUnit,
    assetName: activity.name,
    assetTicker: activity.ticker,
    icon: activity.icon,
    assetType: activity.assetType,
  };
}
