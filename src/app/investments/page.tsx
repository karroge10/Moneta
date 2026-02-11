'use client';

import { useState, useCallback, useEffect } from 'react';
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

  const fetchInvestments = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const res = await fetch('/api/investments');
      if (!res.ok) {
        throw new Error('Failed to load investments');
      }
      const payload: InvestmentsApiResponse = await res.json();
      setData(payload);
    } catch (err) {
      console.error('Error loading investments', err);
      setError(err instanceof Error ? err.message : 'Failed to load investments');
      setData(null);
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

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
    <main className="min-h-screen bg-[#202020]">
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
            <CardSkeleton title="Allocation" variant="value" />
            <CardSkeleton title="Performance" variant="list" />
            <CardSkeleton title="Assets" variant="list" />
            <CardSkeleton title="Recent Activities" variant="list" />
          </>
        ) : error ? (
          <div className="w-full p-8 bg-[#282828] rounded-3xl border border-[#3a3a3a] text-center">
            <p className="text-[#D93F3F] mb-4">{error}</p>
            <button onClick={() => fetchInvestments()} className="px-4 py-2 bg-[#AC66DA] rounded-lg text-white font-bold">Retry</button>
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
                  <button onClick={() => openAddTransaction()} className="text-[#AC66DA] font-bold hover:underline">Start your portfolio</button>
                </div>
              )}
            </Card>
            <Card title="Recent Activities">
              <div className="flex-1 flex flex-col min-h-0 rounded-3xl border border-[#3a3a3a] overflow-hidden" style={{ backgroundColor: '#202020' }}>
                {data?.recentActivities && data.recentActivities.length > 0 ? (
                  <div className="flex-1 overflow-y-auto max-h-[400px]">
                    <table className="min-w-full">
                      <thead className="sticky top-0 bg-[#202020] z-10">
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
                                  <div className="font-semibold text-sm">{activity.name}</div>
                                  <div className="text-xs text-helper uppercase tracking-wider">{activity.ticker}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <span className="text-sm">{formatDateForDisplay(activity.date)}</span>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <span className={`text-sm font-semibold ${activity.type === 'Buy' ? 'text-[#74C648]' : 'text-[#D93F3F]'}`}>
                                {activity.type}
                              </span>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <span className="text-sm font-semibold">
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
            <CardSkeleton title="Allocation" variant="value" />
            <div className="col-span-2"><CardSkeleton title="Performance" variant="list" /></div>
            <div className="col-span-2"><CardSkeleton title="Assets" variant="list" /></div>
            <div className="col-span-2"><CardSkeleton title="Recent Activities" variant="list" /></div>
          </>
        ) : error ? (
          <div className="col-span-2 w-full p-8 bg-[#282828] rounded-3xl border border-[#3a3a3a] text-center">
            <p className="text-[#D93F3F] mb-4">{error}</p>
            <button onClick={() => fetchInvestments()} className="px-4 py-2 bg-[#AC66DA] rounded-lg text-white font-bold">Retry</button>
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
                    <button onClick={() => openAddTransaction()} className="text-[#AC66DA] font-bold hover:underline">Start your portfolio</button>
                  </div>
                )}
              </Card>
            </div>
            <div className="col-span-2">
                <Card title="Recent Activities">
              <div className="flex-1 flex flex-col min-h-0 rounded-3xl border border-[#3a3a3a] overflow-hidden" style={{ backgroundColor: '#202020' }}>
                {data?.recentActivities && data.recentActivities.length > 0 ? (
                  <div className="flex-1 overflow-y-auto max-h-[500px]">
                    <table className="min-w-full">
                      <thead className="sticky top-0 bg-[#202020] z-10">
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
                                  <div className="font-semibold text-sm">{activity.name}</div>
                                  <div className="text-xs text-helper uppercase tracking-wider">{activity.ticker}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <span className="text-sm">{formatDateForDisplay(activity.date)}</span>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <span className={`text-sm font-semibold ${activity.type === 'Buy' ? 'text-[#74C648]' : 'text-[#D93F3F]'}`}>
                                {activity.type}
                              </span>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <span className="text-sm font-semibold">
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

      {/* Desktop: Bento Grid Layout (Modified Layout 1) (≥1536px) */}
      <div className="hidden 2xl:grid 2xl:grid-cols-4 2xl:gap-4 2xl:px-6 2xl:pb-6">
        {loading ? (
          <>
            <div className="col-span-4 grid grid-cols-3 gap-4">
              <CardSkeleton title="Update" variant="update" />
              <CardSkeleton title="Total Value" variant="value" />
              <CardSkeleton title="Total Invested" variant="value" />
            </div>
            <div className="col-span-2"><CardSkeleton title="Performance" variant="list" /></div>
            <div className="col-span-1"><CardSkeleton title="Allocation" variant="value" /></div>
            <div className="col-span-1"><CardSkeleton title="Assets" variant="list" /></div>
            <div className="col-span-4"><CardSkeleton title="Recent Activities" variant="list" /></div>
          </>
        ) : error ? (
          <div className="col-span-4 w-full p-8 bg-[#282828] rounded-3xl border border-[#3a3a3a] text-center">
            <p className="text-[#D93F3F] mb-4">{error}</p>
            <button onClick={() => fetchInvestments()} className="px-4 py-2 bg-[#AC66DA] rounded-lg text-white font-bold">Retry</button>
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
            <div className="col-span-2 h-[450px] flex flex-col [&>.card-surface]:h-full">
              <PortfolioPerformanceChart
                data={performanceData}
                currencySymbol={currency.symbol}
                onRangeChange={handleRangeChange}
                isLoading={isPerformanceLoading}
              />
            </div>

            {/* Allocation */}
            <div className="col-span-1 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              {data?.portfolio && <AssetAllocationCard portfolio={data.portfolio} />}
            </div>

            {/* Assets */}
            <div className="col-span-1 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <Card title="Assets">
                {data?.portfolio && data.portfolio.length > 0 ? (
                   <CompactListDesign portfolio={data.portfolio} currency={currency} onAssetClick={openAssetDetails} />
                ) : (
                  <div className="p-16 text-center text-secondary h-full flex flex-col items-center justify-center">
                    <p className="mb-4">No investments tracked yet.</p>
                    <button onClick={() => openAddTransaction()} className="text-[#AC66DA] font-bold hover:underline">Start your portfolio</button>
                  </div>
                )}
              </Card>
            </div>

            {/* Row 3: Recent Activities (Full Width) */}
            <div className="col-span-4">
              <Card title="Recent Activities">
                <div className="flex-1 flex flex-col min-h-0 rounded-3xl border border-[#3a3a3a] overflow-hidden" style={{ backgroundColor: '#202020' }}>
                  {data?.recentActivities && data.recentActivities.length > 0 ? (
                    <div className="flex-1 overflow-y-auto max-h-[400px]">
                      <table className="min-w-full">
                        <thead className="sticky top-0 bg-[#202020] z-10">
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
                                    <div className="font-semibold text-sm">{activity.name}</div>
                                    <div className="text-xs text-helper uppercase tracking-wider">{activity.ticker}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 align-top">
                                <span className="text-sm">{formatDateForDisplay(activity.date)}</span>
                              </td>
                              <td className="px-5 py-4 align-top">
                                <span className={`text-sm font-semibold ${activity.type === 'Buy' ? 'text-[#74C648]' : 'text-[#D93F3F]'}`}>
                                  {activity.type}
                                </span>
                              </td>
                              <td className="px-5 py-4 align-top">
                                <span className="text-sm font-semibold">
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
