'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { mutate } from 'swr';
import { Investment, PerformanceDataPoint, InvestmentActivity } from '@/types/dashboard';
import { Plus, BitcoinCircle, Reports, Cash, Neighbourhood, ViewGrid, Xmark } from 'iconoir-react';
import { getIcon } from '@/lib/iconMapping';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import CardSkeleton from '@/components/dashboard/CardSkeleton';
import UpdateCard from '@/components/dashboard/UpdateCard';
import InvestmentForm from '@/components/investments/InvestmentForm';
import AssetModal from '@/components/investments/AssetModal';
import InvestmentTransactionModal from '@/components/investments/InvestmentTransactionModal';
import PortfolioTrendCard from '@/components/investments/PortfolioTrendCard';
import TotalInvestedCard from '@/components/investments/TotalInvestedCard';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useCurrency } from '@/hooks/useCurrency';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';
import { formatDateForDisplay } from '@/lib/dateFormatting';
import AssetLogo from '@/components/investments/AssetLogo';
import { CompactListDesign, CarouselDesign, TableDesign } from '@/components/investments/PortfolioDesignOptions';

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
  portfolio: Investment[];
  performance: {
    trend: number;
    trendText: string;
    data: PerformanceDataPoint[];
  };
  recentActivities: any[];
}

export default function InvestmentsNewPage() {
  const { currency } = useCurrency();
  const { currencyOptions } = useCurrencyOptions();
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch Data
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

  // Handle Add Transaction (Success)
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
      if (selectedAssetId) {
        mutate(`/api/investments/${selectedAssetId}`);
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'An error occurred');
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
      if (selectedAssetId) {
        mutate(`/api/investments/${selectedAssetId}`);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update transaction');
    } finally {
      setIsSavingTx(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!editingTransaction) return;
    try {
      setIsSavingTx(true);
      await fetch(`/api/transactions?id=${editingTransaction.id}`, { method: 'DELETE' });
      setEditingTransaction(null);
      await fetchInvestments(true);
      if (selectedAssetId) {
        mutate(`/api/investments/${selectedAssetId}`);
      }
      setShowDeleteConfirm(false);
    } catch (e) {
      console.error(e);
      alert('Failed to delete transaction');
    } finally {
      setIsSavingTx(false);
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

      <div className="px-4 md:px-6 pb-6 flex flex-col min-h-[calc(100vh-120px)] relative">
        {(loading || isRefreshing || isSaving || isSavingTx) ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <CardSkeleton title="Update" variant="update" />
              <CardSkeleton title="Total Portfolio Value" variant="value" />
              <CardSkeleton title="Total Invested" variant="value" />
            </div>
            <CardSkeleton title="Assets Portfolio" variant="list" />
            <CardSkeleton title="Recent Activities" variant="list" />
          </div>
        ) : error ? (
          <div className="w-full p-8 bg-[#282828] rounded-3xl border border-[#3a3a3a] text-center">
            <p className="text-[#D93F3F] mb-4">{error}</p>
            <button onClick={fetchInvestments} className="px-4 py-2 bg-[#AC66DA] rounded-lg text-white font-bold">Retry</button>
          </div>
        ) : (
          <>
            {/* Top Section: Update Card + Portfolio Trend + Total Invested (3-column Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              {/* Update Card */}
              {data?.update && (
                <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                  <UpdateCard
                    date={data.update.date}
                    message={data.update.message}
                    highlight={data.update.highlight}
                    link={data.update.link}
                    linkHref="/notifications"
                    isUnread={data.update.isUnread}
                  />
                </div>
              )}

              {/* Total Portfolio Value Card */}
              {data?.balance && (
                <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                  <PortfolioTrendCard
                    balance={data.balance}
                    currency={currency}
                  />
                </div>
              )}

              {/* Total Invested Card */}
              {data?.totalCost !== undefined && (
                <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                  <TotalInvestedCard
                    totalCost={data.totalCost}
                    currency={currency}
                  />
                </div>
              )}
            </div>

            {/* Assets Portfolio Card */}
            <Card
              title="Assets Portfolio"
              className="mb-6"
            >
              {data?.portfolio && data.portfolio.length > 0 ? (
                <CarouselDesign
                  portfolio={data.portfolio}
                  currency={currency}
                  onAssetClick={openAssetDetails}
                />
              ) : (
                <div className="p-16 text-center text-secondary">
                  <p className="mb-4">No investments tracked yet.</p>
                  <button onClick={() => openAddTransaction()} className="text-[#AC66DA] font-bold hover:underline">Start your portfolio</button>
                </div>
              )}
            </Card>

            {/* Recent Activities Card */}
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
                                <div className="w-8 h-8 rounded-full bg-[#282828] flex items-center justify-center text-[#AC66DA] border border-[#3a3a3a]">
                                  <AssetLogo src={activity.icon} size={18} />
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
                              <span className={`text-sm font-semibold ${activity.type === 'Buy' ? 'text-[#74C648]' : 'text-[#D93F3F]'}`}>
                                {activity.type === 'Buy' ? '+' : '-'}{activity.quantity.toLocaleString()} {activity.ticker}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-16 text-center text-secondary">
                    No recent investment activity.
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Edit Transaction Modal */}
      {
        editingTransaction && (
          <InvestmentTransactionModal
            transaction={editingTransaction}
            onClose={() => setEditingTransaction(null)}
            onSave={handleSaveTransaction}
            onDelete={() => setShowDeleteConfirm(true)}
            isSaving={isSavingTx}
            currencySymbol={currency.symbol}
          />
        )
      }

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteTransaction}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={isSavingTx}
        variant="danger"
      />

      {/* Add Investment Modal */}
      {
        isAddModalOpen && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => !isSaving && setAddModalOpen(false)}
            />
            <div className="relative w-full max-w-2xl bg-[#282828] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#3a3a3a]">
                <h2 className="text-xl font-bold">Add Investment Transaction</h2>
                <button
                  onClick={() => setAddModalOpen(false)}
                  className="text-helper hover:text-white transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <Xmark width={24} height={24} strokeWidth={2} />
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
        )
      }

      {/* Asset Details Modal */}
      {
        selectedAssetId && (
          <AssetModal
            isOpen={!!selectedAssetId}
            onClose={() => setSelectedAssetId(null)}
            assetId={selectedAssetId}
            onAddTransaction={(asset) => {
              openAddTransaction(asset);
            }}
            onSuccess={() => fetchInvestments(true)}
          />
        )
      }
    </main >
  );
}
