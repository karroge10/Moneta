'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { mutate } from 'swr';
import { Investment, PerformanceDataPoint } from '@/types/dashboard';
import { Plus, Xmark } from 'iconoir-react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import Card from '@/components/ui/Card';
import CardSkeleton from '@/components/dashboard/CardSkeleton';
import UpdateCard from '@/components/dashboard/UpdateCard';
import InvestmentForm from '@/components/investments/InvestmentForm';
import AssetModal from '@/components/investments/AssetModal';
import InvestmentTransactionModal from '@/components/investments/InvestmentTransactionModal';
import PortfolioTrendCard from '@/components/investments/PortfolioTrendCard';
import TotalInvestedCard from '@/components/investments/TotalInvestedCard';
import AssetAllocationCard from '@/components/investments/AssetAllocationCard';
import PortfolioPerformanceChart from '@/components/investments/PortfolioPerformanceChart';
import { useCurrency } from '@/hooks/useCurrency';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';
import { formatDateForDisplay } from '@/lib/dateFormatting';
import AssetLogo from '@/components/investments/AssetLogo';
import { CompactListDesign } from '@/components/investments/PortfolioDesignOptions';
import { getAssetColor } from '@/lib/asset-utils';
import { formatSmartNumber } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';

interface InvestmentsApiResponse {
  update: {
    date: string;
    message: string;
    highlight: string;
    link: string;
    isUnread?: boolean;
  };
  balance: {
    amount: number;
    trend: number;
    trendText?: string;
  };
  totalCost: number;
  totalCostTrend?: number;
  totalCostComparisonLabel?: string;
  portfolio: Investment[];
  performance: {
    trend: number;
    trendText: string;
    data: PerformanceDataPoint[];
  };
  recentActivities: any[];
}

export default function InvestmentsPage() {
  const authReady = useAuthReadyForApi();
  const { currency } = useCurrency();
  const { currencyOptions } = useCurrencyOptions();
  const { addToast } = useToast();
  const [data, setData] = useState<InvestmentsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [initialAssetForAdd, setInitialAssetForAdd] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [isSavingTx, setIsSavingTx] = useState(false);
  const [isDeletingTx, setIsDeletingTx] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([]);
  const [isPerformanceLoading, setIsPerformanceLoading] = useState(false);

  const investmentsFetchSeq = useRef(0);

  useEffect(() => {
    if (data?.performance?.data) {
      setPerformanceData(data.performance.data);
    }
  }, [data]);

  const handleRangeChange = async (range: string) => {
    setIsPerformanceLoading(true);
    try {
      const res = await fetch(`/api/investments/performance?range=${range}`);
      if (!res.ok) throw new Error('Failed to fetch performance data');
      const newData = await res.json();
      setPerformanceData(newData);
    } catch (error) {
      console.error(error);
      addToast('Failed to update chart', 'error');
    } finally {
      setIsPerformanceLoading(false);
    }
  };

  const fetchInvestments = useCallback(async (isRefresh = false, signal?: AbortSignal) => {
    const seq = ++investmentsFetchSeq.current;
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const res = await fetch('/api/investments', { signal });
      if (!res.ok) {
        throw new Error('Failed to load investments');
      }
      const payload: InvestmentsApiResponse = await res.json();
      if (seq !== investmentsFetchSeq.current) return;
      setData(payload);
    } catch (err) {
      const aborted =
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && err.name === 'AbortError');
      if (aborted) return;
      if (seq !== investmentsFetchSeq.current) return;
      console.error('Error loading investments', err);
      setError(err instanceof Error ? err.message : 'Failed to load investments');
      setData(null);
    } finally {
      if (seq !== investmentsFetchSeq.current) return;
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const ac = new AbortController();
    void fetchInvestments(false, ac.signal);
    return () => {
      ac.abort();
      investmentsFetchSeq.current += 1;
    };
  }, [authReady, fetchInvestments]);

  useEffect(() => {
    if (!isAddModalOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        setAddModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isAddModalOpen, isSaving]);

  const handleSaveInvestment = async (formData: any) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save investment');
      }

      setAddModalOpen(false);
      setInitialAssetForAdd(null);
      await fetchInvestments(true);
      addToast('Investment transaction saved');
      if (selectedAssetId) {
        mutate(`/api/investments/${selectedAssetId}`);
      }
    } catch (err) {
      console.error(err);
      addToast(err instanceof Error ? err.message : 'An error occurred', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTransaction = async (txData: any) => {
    try {
      setIsSavingTx(true);
      const res = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txData)
      });
      if (!res.ok) throw new Error('Failed to update');

      setEditingTransaction(null);
      await fetchInvestments(true);
      addToast('Transaction updated');
      if (selectedAssetId) {
        mutate(`/api/investments/${selectedAssetId}`);
      }
    } catch (e) {
      console.error(e);
      addToast('Failed to update transaction', 'error');
    } finally {
      setIsSavingTx(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!editingTransaction) return;
    setIsDeletingTx(true);
    try {
      await fetch(`/api/transactions?id=${editingTransaction.id}`, { method: 'DELETE' });
      setEditingTransaction(null);
      await fetchInvestments(true);
      addToast('Transaction deleted');
      if (selectedAssetId) {
        mutate(`/api/investments/${selectedAssetId}`);
      }
    } catch (e) {
      console.error(e);
      addToast('Failed to delete transaction', 'error');
    } finally {
      setIsDeletingTx(false);
    }
  };

  const openAssetDetails = (investment: Investment) => {
    setSelectedAssetId(investment.id);
  };

  const openAddTransaction = (asset?: any) => {
    if (asset) {
      setInitialAssetForAdd(asset);
    } else {
      setInitialAssetForAdd(null);
    }
    setAddModalOpen(true);
  };

  const handleTransactionClick = (activity: any) => {
    setEditingTransaction({
      id: activity.id,
      date: activity.date,
      investmentType: activity.investmentType,
      quantity: activity.quantity,
      pricePerUnit: activity.pricePerUnit,
      assetName: activity.name,
      assetTicker: activity.ticker,
      icon: activity.icon,
      assetType: activity.assetType,
    });
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader
          pageName="Investments"
          actionButton={{
            label: "Add Investment",
            onClick: () => openAddTransaction(),
            icon: <Plus width={18} height={18} strokeWidth={2.5} />
          }}
        />
      </div>

      {/* Mobile Navbar */}
      <div className="md:hidden">
        <MobileNavbar
          pageName="Investments"
          activeSection="investments"
        />
      </div>

      {/* Layout: Desktop Bento Grid (Balanced) */}
      {/* Mobile: Stack everything */}
      <div className="flex flex-col gap-4 px-4 pb-4 md:hidden">
        {loading ? (
          <>
            <CardSkeleton title="Update" variant="update" />
            <div className="grid grid-cols-2 gap-4">
              <CardSkeleton title="Total Value" variant="value" />
              <CardSkeleton title="Total Invested" variant="value" />
            </div>
            <CardSkeleton title="Allocation" variant="donut" />
            <div className="h-[400px] flex flex-col [&>.card-surface]:h-full">
              <CardSkeleton title="Performance" variant="chart" />
            </div>
            <div className="h-[400px] flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <CardSkeleton title="Assets" variant="list" />
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <CardSkeleton title="Recent Activities" variant="table" />
            </div>
          </>
        ) : error ? (
          <div className="w-full p-8 bg-[#282828] rounded-3xl border border-[#3a3a3a] text-center">
            <p className="text-body text-[#D93F3F] mb-4">{error}</p>
            <button type="button" onClick={() => fetchInvestments()} className="px-4 py-2 bg-[#AC66DA] rounded-full text-primary text-body font-semibold hover:opacity-90">Retry</button>
          </div>
        ) : (
          <>
            {data?.update && <UpdateCard {...data.update} linkHref="/notifications" />}
            <div className="grid grid-cols-2 gap-4">
              {data?.balance && <PortfolioTrendCard balance={data.balance} currency={currency} />}
              {data?.totalCost !== undefined && (
                <TotalInvestedCard
                  totalCost={data.totalCost}
                  trend={data.totalCostTrend}
                  comparisonLabel={data.totalCostComparisonLabel}
                  currency={currency}
                />
              )}
            </div>
            {data?.portfolio && <AssetAllocationCard portfolio={data.portfolio} />}
            <div className="h-[400px]">
              <PortfolioPerformanceChart
                data={performanceData}
                currencySymbol={currency.symbol}
                onRangeChange={handleRangeChange}
                isLoading={isPerformanceLoading}
              />
            </div>
            <Card title="Assets" className="h-[400px]">
              {data?.portfolio && data.portfolio.length > 0 ? (
                <CompactListDesign portfolio={data.portfolio} currency={currency} onAssetClick={openAssetDetails} />
              ) : (
                <div className="p-16 text-center text-secondary h-full flex flex-col items-center justify-center">
                  <p className="mb-4">No investments tracked yet.</p>
                  <button type="button" onClick={() => openAddTransaction()} className="text-body font-semibold text-[#AC66DA] hover:underline">Start your portfolio</button>
                </div>
              )}
            </Card>
            <Card title="Recent Activities">
              <div className="flex-1 flex flex-col min-h-0 w-full min-w-0 rounded-3xl border border-[#3a3a3a] overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
                {data?.recentActivities && data.recentActivities.length > 0 ? (
                  <div className="flex-1 overflow-auto max-h-[400px] p-4 flex flex-col gap-4">
                    {data.recentActivities.map((activity: any) => (
                      <div
                        key={activity.id}
                        className="p-4 rounded-2xl border border-[#3a3a3a] bg-background-secondary cursor-pointer active:scale-[0.98] transition-transform"
                        onClick={() => handleTransactionClick(activity)}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 icon-circle shrink-0"
                              style={{ backgroundColor: `${getAssetColor(activity.assetType)}1a` }}
                            >
                              <AssetLogo
                                src={activity.icon}
                                size={20}
                                className="text-current"
                                style={{ color: getAssetColor(activity.assetType) }}
                                fallback={
                                  activity.assetType === 'crypto' ? 'BitcoinCircle' :
                                    activity.assetType === 'stock' ? 'Cash' :
                                      activity.assetType === 'property' ? 'Neighbourhood' :
                                        'Reports'
                                }
                              />
                            </div>
                            <div>
                              <div className="text-body font-bold">{activity.name}</div>
                              <div className="text-helper uppercase tracking-wider text-secondary">{activity.ticker}</div>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tight ${activity.type === 'Buy' ? 'bg-[#74C648]/10 text-[#74C648]' : 'bg-[#D93F3F]/10 text-[#D93F3F]'}`}>
                            {activity.type}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                            <span className="text-sm text-secondary">Date</span>
                            <span className="text-sm font-medium">{formatDateForDisplay(activity.date)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-secondary">Quantity</span>
                            <span className="text-sm font-bold tabular-nums">
                              {formatSmartNumber(activity.quantity)} {activity.ticker}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 w-full py-2.5 rounded-xl bg-white/5 text-center text-sm font-semibold text-purple-accent border border-white/5 active:bg-white/10 transition-colors">
                          View Details
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-16 text-center text-secondary">No recent investment activity.</div>
                )}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Tablet: 2-column layout (768px - 1536px) */}
      <div className="hidden md:grid 2xl:hidden md:grid-cols-2 md:gap-4 md:px-6 md:pb-6">
        {loading ? (
          <>
            <CardSkeleton title="Update" variant="update" />
            <CardSkeleton title="Total Value" variant="value" />
            <CardSkeleton title="Total Invested" variant="value" />
            <CardSkeleton title="Allocation" variant="donut" />
            <div className="col-span-2 h-[500px] flex flex-col [&>.card-surface]:h-full">
              <CardSkeleton title="Performance" variant="chart" />
            </div>
            <div className="col-span-2 h-[500px] flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <CardSkeleton title="Assets" variant="list" />
            </div>
            <div className="col-span-2 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <CardSkeleton title="Recent Activities" variant="table" />
            </div>
          </>
        ) : error ? (
          <div className="col-span-2 w-full p-8 bg-[#282828] rounded-3xl border border-[#3a3a3a] text-center">
            <p className="text-body text-[#D93F3F] mb-4">{error}</p>
            <button type="button" onClick={() => fetchInvestments()} className="px-4 py-2 bg-[#AC66DA] rounded-full text-primary text-body font-semibold hover:opacity-90">Retry</button>
          </div>
        ) : (
          <>
            {data?.update && <UpdateCard {...data.update} linkHref="/notifications" />}
            {data?.balance && <PortfolioTrendCard balance={data.balance} currency={currency} />}
            {data?.totalCost !== undefined && (
              <TotalInvestedCard
                totalCost={data.totalCost}
                trend={data.totalCostTrend}
                comparisonLabel={data.totalCostComparisonLabel}
                currency={currency}
              />
            )}
            {data?.portfolio && <AssetAllocationCard portfolio={data.portfolio} />}
            <div className="col-span-2 h-[500px]">
              <PortfolioPerformanceChart
                data={performanceData}
                currencySymbol={currency.symbol}
                onRangeChange={handleRangeChange}
                isLoading={isPerformanceLoading}
              />
            </div>
            <div className="col-span-2 h-[500px]">
               <Card title="Assets">
                {data?.portfolio && data.portfolio.length > 0 ? (
                  <div className='flex flex-col h-full'>
                      <CompactListDesign portfolio={data.portfolio} currency={currency} onAssetClick={openAssetDetails} />
                  </div>
                ) : (
                  <div className="p-16 text-center text-secondary h-full flex flex-col items-center justify-center">
                    <p className="mb-4">No investments tracked yet.</p>
                    <button type="button" onClick={() => openAddTransaction()} className="text-body font-semibold text-[#AC66DA] hover:underline">Start your portfolio</button>
                  </div>
                )}
              </Card>
            </div>
            <div className="col-span-2">
              <Card title="Recent Activities">
                <div className="flex-1 flex flex-col min-h-0 w-full min-w-0 rounded-3xl border border-[#3a3a3a] overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
                  {data?.recentActivities && data.recentActivities.length > 0 ? (
                    <div className="flex-1 overflow-auto max-h-[500px]">
                      {/* Desktop/Tablet Table View */}
                      <div className="hidden lg:block overflow-auto">
                        <table className="min-w-full">
                          <thead className="sticky top-0 bg-background z-10">
                            <tr className="text-left text-xs uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
                              <th className="px-5 py-3 align-top">Asset</th>
                              <th className="px-5 py-3 align-top">Date</th>
                              <th className="px-5 py-3 align-top">Type</th>
                              <th className="px-5 py-3 align-top">Quantity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.recentActivities.map((activity: any) => (
                              <tr
                                key={activity.id}
                                className="border-t border-[#2A2A2A] cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => handleTransactionClick(activity)}
                              >
                                <td className="px-5 py-4 align-top">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-10 h-10 icon-circle shrink-0"
                                      style={{ backgroundColor: `${getAssetColor(activity.assetType)}1a` }}
                                    >
                                      <AssetLogo
                                        src={activity.icon}
                                        size={20}
                                        className="text-current"
                                        style={{ color: getAssetColor(activity.assetType) }}
                                        fallback={
                                          activity.assetType === 'crypto' ? 'BitcoinCircle' :
                                            activity.assetType === 'stock' ? 'Cash' :
                                              activity.assetType === 'property' ? 'Neighbourhood' :
                                                'Reports'
                                        }
                                      />
                                    </div>
                                    <div>
                                      <div className="text-body font-semibold">{activity.name}</div>
                                      <div className="text-helper uppercase tracking-wider">{activity.ticker}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-4 align-top">
                                  <span className="text-body">{formatDateForDisplay(activity.date)}</span>
                                </td>
                                <td className="px-5 py-4 align-top">
                                  <span className={`text-body font-semibold ${activity.type === 'Buy' ? 'text-[#74C648]' : 'text-[#D93F3F]'}`}>
                                    {activity.type}
                                  </span>
                                </td>
                                <td className="px-5 py-4 align-top">
                                  <span className="text-body font-semibold tabular-nums">
                                    {formatSmartNumber(activity.quantity)} {activity.ticker}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Mobile/Small Tablet Card View */}
                      <div className="lg:hidden p-4 flex flex-col gap-4 overflow-auto">
                        {data.recentActivities.map((activity: any) => (
                          <div
                            key={activity.id}
                            className="p-4 rounded-2xl border border-[#3a3a3a] bg-background-secondary cursor-pointer active:scale-[0.98] transition-transform"
                            onClick={() => handleTransactionClick(activity)}
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 icon-circle shrink-0"
                                  style={{ backgroundColor: `${getAssetColor(activity.assetType)}1a` }}
                                >
                                  <AssetLogo
                                    src={activity.icon}
                                    size={20}
                                    className="text-current"
                                    style={{ color: getAssetColor(activity.assetType) }}
                                    fallback={
                                      activity.assetType === 'crypto' ? 'BitcoinCircle' :
                                        activity.assetType === 'stock' ? 'Cash' :
                                          activity.assetType === 'property' ? 'Neighbourhood' :
                                            'Reports'
                                    }
                                  />
                                </div>
                                <div>
                                  <div className="text-body font-bold">{activity.name}</div>
                                  <div className="text-helper uppercase tracking-wider text-secondary">{activity.ticker}</div>
                                </div>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tight ${activity.type === 'Buy' ? 'bg-[#74C648]/10 text-[#74C648]' : 'bg-[#D93F3F]/10 text-[#D93F3F]'}`}>
                                {activity.type}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                                <span className="text-sm text-secondary">Date</span>
                                <span className="text-sm font-medium">{formatDateForDisplay(activity.date)}</span>
                              </div>
                              <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-secondary">Quantity</span>
                                <span className="text-sm font-bold tabular-nums">
                                  {formatSmartNumber(activity.quantity)} {activity.ticker}
                                </span>
                              </div>
                            </div>
                            <div className="mt-4 w-full py-2.5 rounded-xl bg-white/5 text-center text-sm font-semibold text-purple-accent border border-white/5 active:bg-white/10 transition-colors">
                              View Details
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-16 text-center text-secondary">No recent investment activity.</div>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Desktop: Bento Grid Layout (Modified Layout 1) (≥1536px) */}
      <div className="hidden 2xl:grid 2xl:grid-cols-4 2xl:gap-4 2xl:px-6 2xl:pb-6">
        {loading ? (
          <>
            <div className="col-span-4 grid grid-cols-3 gap-4">
              <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <CardSkeleton title="Update" variant="update" />
              </div>
              <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <CardSkeleton title="Total Value" variant="value" />
              </div>
              <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <CardSkeleton title="Total Invested" variant="value" />
              </div>
            </div>
            <div className="col-span-2 h-[500px] flex flex-col [&>.card-surface]:h-full">
              <CardSkeleton title="Performance" variant="chart" />
            </div>
            <div className="col-span-1 h-[500px] flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <CardSkeleton title="Allocation" variant="donut" />
            </div>
            <div className="col-span-1 h-[500px] flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <CardSkeleton title="Assets" variant="list" />
            </div>
            <div className="col-span-4 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <CardSkeleton title="Recent Activities" variant="table" />
            </div>
          </>
        ) : error ? (
          <div className="col-span-4 w-full p-8 bg-[#282828] rounded-3xl border border-[#3a3a3a] text-center">
            <p className="text-body text-[#D93F3F] mb-4">{error}</p>
            <button type="button" onClick={() => fetchInvestments()} className="px-4 py-2 bg-[#AC66DA] rounded-full text-primary text-body font-semibold hover:opacity-90">Retry</button>
          </div>
        ) : (
          <>
            {/* Row 1: Top 3 Cards Spanning Full Width (using 3-col subgrid) */}
            <div className="col-span-4 grid grid-cols-3 gap-4">
              <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                {data?.update && <UpdateCard {...data.update} linkHref="/notifications" />}
              </div>
              <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                {data?.balance && <PortfolioTrendCard balance={data.balance} currency={currency} />}
              </div>
              <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                {data?.totalCost !== undefined && (
                  <TotalInvestedCard
                    totalCost={data.totalCost}
                    trend={data.totalCostTrend}
                    comparisonLabel={data.totalCostComparisonLabel}
                    currency={currency}
                  />
                )}
              </div>
            </div>

            {/* Row 2: Performance (2/4), Allocation (1/4), Assets (1/4) */}
            {/* Performance Chart */}
            <div className="col-span-2 h-[500px] flex flex-col [&>.card-surface]:h-full">
              <PortfolioPerformanceChart
                data={performanceData}
                currencySymbol={currency.symbol}
                onRangeChange={handleRangeChange}
                isLoading={isPerformanceLoading}
              />
            </div>

            {/* Allocation */}
            <div className="col-span-1 h-[500px] flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              {data?.portfolio && <AssetAllocationCard portfolio={data.portfolio} />}
            </div>

            {/* Assets */}
            <div className="col-span-1 h-[500px] flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <Card title="Assets">
                {data?.portfolio && data.portfolio.length > 0 ? (
                   <CompactListDesign portfolio={data.portfolio} currency={currency} onAssetClick={openAssetDetails} />
                ) : (
                  <div className="p-16 text-center text-secondary h-full flex flex-col items-center justify-center">
                    <p className="mb-4">No investments tracked yet.</p>
                    <button type="button" onClick={() => openAddTransaction()} className="text-body font-semibold text-[#AC66DA] hover:underline">Start your portfolio</button>
                  </div>
                )}
              </Card>
            </div>

            {/* Row 3: Recent Activities (Full Width) */}
            <div className="col-span-4">
              <Card title="Recent Activities">
                <div className="flex-1 flex flex-col min-h-0 w-full min-w-0 rounded-3xl border border-[#3a3a3a] overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
                  {data?.recentActivities && data.recentActivities.length > 0 ? (
                    <div className="flex-1 overflow-auto max-h-[400px]">
                      <table className="min-w-[600px]">
                        <thead className="sticky top-0 bg-background z-10">
                          <tr className="text-left text-xs uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
                            <th className="px-5 py-3 align-top">Asset</th>
                            <th className="px-5 py-3 align-top">Date</th>
                            <th className="px-5 py-3 align-top">Type</th>
                            <th className="px-5 py-3 align-top">Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.recentActivities.map((activity: any) => (
                            <tr
                              key={activity.id}
                              className="border-t border-[#2A2A2A] cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => handleTransactionClick(activity)}
                            >
                              <td className="px-5 py-4 align-top">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-10 h-10 icon-circle shrink-0"
                                    style={{ backgroundColor: `${getAssetColor(activity.assetType)}1a` }}
                                  >
                                    <AssetLogo
                                      src={activity.icon}
                                      size={20}
                                      className="text-current"
                                      style={{ color: getAssetColor(activity.assetType) }}
                                      fallback={
                                        activity.assetType === 'crypto' ? 'BitcoinCircle' :
                                          activity.assetType === 'stock' ? 'Cash' :
                                            activity.assetType === 'property' ? 'Neighbourhood' :
                                              'Reports'
                                      }
                                    />
                                  </div>
                                  <div>
                                    <div className="text-body font-semibold">{activity.name}</div>
                                    <div className="text-helper uppercase tracking-wider">{activity.ticker}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 align-top">
                                <span className="text-body">{formatDateForDisplay(activity.date)}</span>
                              </td>
                              <td className="px-5 py-4 align-top">
                                <span className={`text-body font-semibold ${activity.type === 'Buy' ? 'text-[#74C648]' : 'text-[#D93F3F]'}`}>
                                  {activity.type}
                                </span>
                              </td>
                              <td className="px-5 py-4 align-top">
                                <span className="text-body font-semibold tabular-nums">
                                  {formatSmartNumber(activity.quantity)} {activity.ticker}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-16 text-center text-secondary">No recent investment activity.</div>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <InvestmentTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSave={handleSaveTransaction}
          onDelete={handleDeleteTransaction}
          isSaving={isSavingTx}
          isDeleting={isDeletingTx}
          currencySymbol={currency.symbol}
        />
      )}

      {/* Add Investment Modal */}
      {isAddModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !isSaving && setAddModalOpen(false)}
          />
          <div
            className="relative w-full max-w-2xl max-h-[94vh] rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            <div className="flex items-center justify-between p-6 border-b border-[#3a3a3a]">
              <h2 className="text-card-header">Add Investment Transaction</h2>
              <button
                onClick={() => setAddModalOpen(false)}
                disabled={isSaving}
                className="p-2 rounded-full hover-text-purple transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Close"
              >
                <Xmark width={24} height={24} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <InvestmentForm
                mode="add"
                initialAsset={initialAssetForAdd}
                onSave={handleSaveInvestment}
                onCancel={() => setAddModalOpen(false)}
                currencyOptions={currencyOptions}
                isSaving={isSaving}
                onFloatingPanelToggle={() => { }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Asset Details Modal */}
      {selectedAssetId && (
        <AssetModal
          isOpen={!!selectedAssetId}
          onClose={() => setSelectedAssetId(null)}
          assetId={selectedAssetId}
          onAddTransaction={(asset) => {
            openAddTransaction(asset);
          }}
          onSuccess={() => fetchInvestments(true)}
        />
      )}
    </main>
  );
}
