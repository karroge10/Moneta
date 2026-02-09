'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Investment, PerformanceDataPoint, InvestmentActivity } from '@/types/dashboard';
import {
  Plus,
  FilterList,
  Sort,
  NavArrowDown,
  RefreshDouble,
  Download,
  BitcoinCircle,
  Reports
} from 'iconoir-react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';

import Spinner from '@/components/ui/Spinner';
import PortfolioCard from '@/components/investments/PortfolioCard';
import InvestmentForm from '@/components/investments/InvestmentForm'; // Currently this handles Add Flow
import AssetModal from '@/components/investments/AssetModal';
import { useCurrency } from '@/hooks/useCurrency';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';

interface InvestmentsApiResponse {
  update: {
    date: string;
    message: string;
    highlight: string;
    link: string;
  };
  balance: {
    amount: number;
    trend: number;
  };
  portfolio: Investment[];
  performance: {
    trend: number;
    trendText: string;
    data: PerformanceDataPoint[];
  };
  recentActivities: InvestmentActivity[];
}

export default function InvestmentsPage() {

  const { currency } = useCurrency();
  const { currencyOptions } = useCurrencyOptions();
  const [data, setData] = useState<InvestmentsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [initialAssetForAdd, setInitialAssetForAdd] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFloatingPanelOpen, setIsFloatingPanelOpen] = useState(false);

  // Fetch Data
  const fetchInvestments = useCallback(async () => {
    try {
      setLoading(true);
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
      setLoading(false);
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
      fetchInvestments(); // Refresh portfolio

      // If we were in AssetModal (selectedAssetId set), we should also refresh it?
      // AssetModal uses useSWR, so we can mutate global cache or it auto-refreshes?
      // We'll trust global refresh or user interaction.
      // Actually, if AssetModal is open, we want it to reflect the new transaction.
      // AssetModal uses /api/investments/[id]. 
      // We can rely on its internal SWR revalidation if we trigger it.
      // For now, fetchInvestments refreshes the main page.
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
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
          secondaryButton={{
            label: "Refresh",
            onClick: fetchInvestments,
            icon: <RefreshDouble width={18} height={18} strokeWidth={1.5} />
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

      <div className="flex flex-col gap-8 px-4 pb-4 md:px-6 md:pb-6">
        {loading && !data ? (
          <div className="w-full h-80 flex items-center justify-center">
            <Spinner size={32} />
          </div>
        ) : error ? (
          <div className="w-full p-8 bg-[#282828] rounded-3xl border border-[#3a3a3a] text-center">
            <p className="text-[#D93F3F] mb-4">{error}</p>
            <button onClick={fetchInvestments} className="px-4 py-2 bg-[#AC66DA] rounded-lg text-white font-bold">Retry</button>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-8 bg-[#282828] rounded-[30px] border border-[#3a3a3a] relative overflow-hidden">
                <div className="relative z-10 flex flex-col justify-between h-full gap-6">
                  <div>
                    <h3 className="text-card-header text-[#9CA3AF] mb-1 uppercase tracking-wide text-xs font-bold">Total Portfolio Value</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-card-currency text-[#E7E4E4] font-medium">{currency.symbol}</span>
                      <span className="text-card-value text-white tracking-tight">
                        {data?.balance.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-sm font-bold flex items-center gap-1.5 ${(data?.balance.trend || 0) >= 0
                      ? 'bg-[#74C648]/10 text-[#74C648]'
                      : 'bg-[#D93F3F]/10 text-[#D93F3F]'
                      }`}>
                      {(data?.balance.trend || 0) >= 0 ? '+' : ''}{(data?.balance.trend || 0).toFixed(2)}%
                    </span>
                    <span className="text-sm text-helper">all time return</span>
                  </div>
                </div>

                {/* Decorative Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#AC66DA]/5 blur-[80px] rounded-full pointer-events-none" />
              </div>

              <div className="p-8 bg-[#282828] rounded-[30px] border border-[#3a3a3a] flex flex-col justify-center items-center text-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#AC66DA]/10 flex items-center justify-center text-[#AC66DA]">
                  <Sort width={24} height={24} />
                </div>
                <div>
                  <h4 className="text-primary font-bold">Portfolio Insights</h4>
                  <p className="text-xs text-secondary mt-1 max-w-[200px]">
                    Your holdings are split across {data?.portfolio.length || 0} unique assets.
                  </p>
                </div>
              </div>
            </section>

            {/* Holdings List */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Assets Portfolio</h2>
              </div>

              {data?.portfolio && data.portfolio.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {data.portfolio.map((item) => (
                    <PortfolioCard
                      key={item.id}
                      data={item}
                      onClick={() => openAssetDetails(item)}
                      onEdit={() => openAssetDetails(item)}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-16 text-center text-secondary bg-[#282828] rounded-[30px] border border-[#3a3a3a] border-dashed">
                  <p className="mb-4">No investments tracked yet.</p>
                  <button onClick={() => openAddTransaction()} className="text-[#AC66DA] font-bold hover:underline">Start your portfolio</button>
                </div>
              )}
            </section>

            {/* Recent Activities */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Recent Activities</h2>
              </div>
              <div className="bg-[#282828] border border-[#3a3a3a] rounded-[30px] overflow-hidden">
                {data?.recentActivities && data.recentActivities.length > 0 ? (
                  <div className="divide-y divide-[#3a3a3a]">
                    {data.recentActivities.map((activity: any) => (
                      <div key={activity.id} className="p-5 flex items-center justify-between hover:bg-[#323232] transition-colors cursor-default">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-[#202020] flex items-center justify-center text-[#AC66DA] border border-[#3a3a3a]">
                            {activity.icon === 'BitcoinCircle' ? (
                              <BitcoinCircle width={24} height={24} />
                            ) : (
                              <Reports width={24} height={24} />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-primary text-lg">{activity.name}</div>
                            <div className="text-sm text-helper uppercase tracking-wider">{activity.ticker} • {activity.date}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold text-lg ${activity.type === 'Buy' ? 'text-[#D93F3F]' : 'text-[#74C648]'}`}>
                            {activity.type === 'Buy' ? '-' : '+'}{activity.quantity.toLocaleString()} {activity.ticker}
                          </div>
                          <div className="text-sm text-helper">
                            {activity.type} Transaction
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-16 text-center text-secondary">
                    No recent investment activity.
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      {/* Modals ... */}

      {/* Add Investment Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isSaving && setAddModalOpen(false)}
          />
          <div
            className={`relative w-full max-w-2xl bg-[#282828] rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${isFloatingPanelOpen ? 'h-[700px]' : 'h-[600px] max-h-[90vh]'
              }`}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#3a3a3a]">
              <h2 className="text-xl font-bold">Add Investment Transaction</h2>
              <button onClick={() => setAddModalOpen(false)} className="text-helper hover:text-white transition-colors">
                <span className="sr-only">Close</span>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <InvestmentForm
                mode="add"
                initialAsset={initialAssetForAdd}
                onSave={handleSaveInvestment}
                onCancel={() => setAddModalOpen(false)}
                currencyOptions={currencyOptions}
                isSaving={isSaving}
                onFloatingPanelToggle={setIsFloatingPanelOpen}
              />
            </div>
          </div>
        </div>
      )}

      {/* Asset Details Modal */}
      {selectedAssetId && (
        <AssetModal
          isOpen={!!selectedAssetId}
          onClose={() => setSelectedAssetId(null)}
          assetId={selectedAssetId}
          onAddTransaction={(asset) => {
            // Close Asset details? Or keep open?
            // The AssetModal uses Portal, so opening another Modal on top works if z-index is higher.
            // We'll open Add Transaction form.
            openAddTransaction(asset);
          }}
        />
      )}
    </main>
  );
}
