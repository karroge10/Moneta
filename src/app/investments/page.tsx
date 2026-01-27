'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import UpdateCard from '@/components/dashboard/UpdateCard';
import BalanceCard from '@/components/dashboard/BalanceCard';
import PortfolioCard from '@/components/dashboard/PortfolioCard';
import PerformanceCardNoPadding from '@/components/dashboard/PerformanceCardNoPadding';
import RecentActivitiesCard from '@/components/dashboard/RecentActivitiesCard';
import CardSkeleton from '@/components/dashboard/CardSkeleton';
import { InvestmentActivity, PerformanceDataPoint, TimePeriod, Investment } from '@/types/dashboard';
import { Xmark, Search } from 'iconoir-react';

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
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('All Time');
  const [data, setData] = useState<InvestmentsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formState, setFormState] = useState({
    name: '',
    subtitle: '',
    ticker: '',
    assetType: 'custom',
    sourceId: '',
    quantity: '1',
    purchasePrice: '',
    purchaseDate: '',
    currentPrice: '',
    icon: 'Cash',
  });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; name: string; symbol: string; type: string; icon: string; price?: number; ticker?: string }>
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);

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

  const handleSaveInvestment = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formState.name,
          subtitle: formState.subtitle,
          ticker: formState.ticker || null,
          assetType: formState.assetType,
          sourceId: formState.sourceId || null,
          quantity: Number(formState.quantity || 1),
          purchasePrice: Number(formState.purchasePrice || 0),
          purchaseDate: formState.purchaseDate || null,
          currentPrice: Number(formState.currentPrice || 0),
          icon: formState.icon || 'Cash',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add investment');
      }
      setShowAddModal(false);
      setFormState({
        name: '',
        subtitle: '',
        ticker: '',
        assetType: 'custom',
        sourceId: '',
        quantity: '1',
        purchasePrice: '',
        purchaseDate: '',
        currentPrice: '',
        icon: 'Cash',
      });
      fetchInvestments();
    } catch (err) {
      console.error('Add investment failed', err);
      setError(err instanceof Error ? err.message : 'Failed to add investment');
    } finally {
      setSaving(false);
    }
  }, [fetchInvestments, formState]);

  const runSearch = useCallback(async () => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchLoading(true);
      const res = await fetch(`/api/investments/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.assets || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const t = setTimeout(() => runSearch(), 250);
    return () => clearTimeout(t);
  }, [searchQuery, runSearch]);

  const handleSelectAsset = (
    asset: { id: string; name: string; symbol: string; type: string; icon: string; price?: number; ticker?: string },
  ) => {
    setFormState((s) => ({
      ...s,
      name: asset.name,
      ticker: asset.ticker || asset.symbol,
      assetType: asset.type,
      sourceId: asset.id,
      subtitle: `${s.quantity || '1'} ${asset.ticker || asset.symbol}`,
      currentPrice: asset.price ? String(asset.price) : s.currentPrice,
      icon: asset.icon,
    }));
    setSearchResults([]);
  };

  const profitPreview = (() => {
    const qty = Number(formState.quantity || 0);
    const purchase = Number(formState.purchasePrice || 0) * qty;
    const current = Number(formState.currentPrice || 0) * qty;
    if (!qty || (!purchase && !current)) return null;
    const profit = current - purchase;
    const percent = purchase > 0 ? (profit / purchase) * 100 : 0;
    return { profit, percent, current, purchase };
  })();

  const renderSkeletonLayout = () => (
    <>
      <div className="flex flex-col gap-4 px-4 pb-4 md:hidden">
        <div className="grid grid-cols-2 gap-4">
          <CardSkeleton title="Update" variant="update" />
          <CardSkeleton title="Balance" variant="value" />
        </div>
        <CardSkeleton title="Portfolio" variant="list" />
        <CardSkeleton title="Performance" variant="chart" />
        <CardSkeleton title="Recent Activities" variant="list" />
      </div>
      <div className="hidden md:grid 2xl:hidden md:grid-cols-2 md:gap-4 md:px-6 md:pb-6">
        <div className="grid grid-cols-2 gap-4 col-span-2">
          <CardSkeleton title="Update" variant="update" />
          <CardSkeleton title="Balance" variant="value" />
        </div>
        <CardSkeleton title="Portfolio" variant="list" />
        <CardSkeleton title="Performance" variant="chart" />
        <div className="col-span-2">
          <CardSkeleton title="Recent Activities" variant="list" />
        </div>
      </div>
      <div className="hidden 2xl:grid 2xl:grid-cols-2 2xl:gap-4 2xl:px-6 2xl:pb-6">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <CardSkeleton title="Update" variant="update" />
            <CardSkeleton title="Balance" variant="value" />
          </div>
          <CardSkeleton title="Portfolio" variant="list" />
        </div>
        <div className="flex flex-col gap-4">
          <CardSkeleton title="Performance" variant="chart" />
          <CardSkeleton title="Recent Activities" variant="list" />
        </div>
      </div>
    </>
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#202020]">
        <div className="hidden md:block">
          <DashboardHeader pageName="Investments" />
        </div>
        <div className="md:hidden">
          <MobileNavbar pageName="Investments" timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} activeSection="investments" />
        </div>
        {renderSkeletonLayout()}
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#202020]">
        <div className="hidden md:block">
          <DashboardHeader pageName="Investments" />
        </div>
        <div className="md:hidden">
          <MobileNavbar pageName="Investments" timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} activeSection="investments" />
        </div>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
          <div className="text-body opacity-70 text-center">{error || 'Unable to load investments.'}</div>
          <button
            onClick={fetchInvestments}
            className="px-4 py-2 rounded-full bg-[#AC66DA] text-[#E7E4E4] text-body font-medium hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#202020]">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader 
          pageName="Investments"
          actionButton={{
            label: 'Add Investment',
            onClick: () => setShowAddModal(true),
          }}
        />
      </div>

      {/* Mobile Navbar */}
      <div className="md:hidden">
        <MobileNavbar 
          pageName="Investments" 
          timePeriod={timePeriod} 
          onTimePeriodChange={setTimePeriod}
          activeSection="investments"
        />
      </div>

      {/* Mobile: Custom Layout (< 768px) */}
      <div className="flex flex-col gap-4 px-4 pb-4 md:hidden">
        {/* Update and Balance side by side */}
        <div className="grid grid-cols-2 gap-4">
          <UpdateCard
            date={data.update.date}
            message={data.update.message}
            highlight={data.update.highlight}
            link={data.update.link}
            linkHref="/statistics"
          />
          <BalanceCard amount={data.balance.amount} trend={data.balance.trend} />
        </div>
        <PortfolioCard investments={data.portfolio} />
        <PerformanceCardNoPadding 
          trend={data.performance.trend}
          trendText={data.performance.trendText}
          data={data.performance.data}
        />
        <RecentActivitiesCard activities={data.recentActivities} />
      </div>

      {/* Two-column layout: 768px - 1535px */}
      <div className="hidden md:grid 2xl:hidden md:grid-cols-2 md:gap-4 md:px-6 md:pb-6">
        {/* Update and Balance side by side */}
        <div className="grid grid-cols-2 gap-4 col-span-2">
          <UpdateCard
            date={data.update.date}
            message={data.update.message}
            highlight={data.update.highlight}
            link={data.update.link}
            linkHref="/statistics"
          />
          <BalanceCard amount={data.balance.amount} trend={data.balance.trend} />
        </div>
        <PortfolioCard investments={data.portfolio} />
        <PerformanceCardNoPadding 
          trend={data.performance.trend}
          trendText={data.performance.trendText}
          data={data.performance.data}
        />
        <div className="col-span-2">
          <RecentActivitiesCard activities={data.recentActivities} />
        </div>
      </div>

      {/* Desktop: 2-column layout with 50/50 split (>= 1536px) */}
      <div className="hidden 2xl:grid 2xl:grid-cols-2 2xl:gap-4 2xl:px-6 2xl:pb-6">
        {/* Left column (50%) */}
        <div className="flex flex-col gap-4">
          {/* Row 1: Update and Balance side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <UpdateCard
                date={data.update.date}
                message={data.update.message}
                highlight={data.update.highlight}
                link={data.update.link}
                linkHref="/statistics"
              />
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <BalanceCard amount={data.balance.amount} trend={data.balance.trend} />
            </div>
          </div>
          <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <PortfolioCard investments={data.portfolio} />
          </div>
        </div>

        {/* Right column (50%) */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <PerformanceCardNoPadding 
              trend={data.performance.trend}
              trendText={data.performance.trendText}
              data={data.performance.data}
            />
          </div>
          <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <RecentActivitiesCard activities={data.recentActivities} />
          </div>
        </div>
      </div>

      {/* Add Investment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#282828] rounded-3xl w-full max-w-3xl max-h-[94vh] border border-[#3a3a3a] shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#3a3a3a]">
              <h3 className="text-card-header">Add Investment</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-full hover-text-purple transition-colors"
                aria-label="Close add investment modal"
              >
                <Xmark width={22} height={22} strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              <div className="space-y-2">
                <label className="text-helper block">Search assets (crypto or stock ticker)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-helper" width={18} height={18} />
                  <input
                    className="w-full rounded-2xl bg-[#202020] border border-[#3a3a3a] pl-10 pr-3 py-2 text-body"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search BTC, ETH, AAPL..."
                  />
                </div>
                {searchLoading && <div className="text-helper text-sm">Searching...</div>}
                {searchResults.length > 0 && (
                  <div className="rounded-2xl border border-[#3a3a3a] bg-[#202020] divide-y divide-[#3a3a3a]">
                    {searchResults.map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => handleSelectAsset(asset)}
                        className="w-full text-left px-4 py-3 hover-text-purple transition-colors flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-body font-semibold">{asset.name}</div>
                          <div className="text-helper text-sm">
                            {asset.symbol} • {asset.type}
                          </div>
                        </div>
                        {asset.price && <div className="text-body font-medium">${asset.price.toFixed(2)}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-helper block mb-1">Name</label>
                  <input
                    className="w-full rounded-xl bg-[#202020] border border-[#3a3a3a] px-3 py-2 text-body"
                    value={formState.name}
                    onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                    placeholder="e.g., Bitcoin or NYC Apartment"
                  />
                </div>
                <div>
                  <label className="text-helper block mb-1">Ticker / Symbol (optional)</label>
                  <input
                    className="w-full rounded-xl bg-[#202020] border border-[#3a3a3a] px-3 py-2 text-body"
                    value={formState.ticker}
                    onChange={(e) => setFormState((s) => ({ ...s, ticker: e.target.value }))}
                    placeholder="e.g., BTC or AAPL"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-helper block mb-1">Quantity</label>
                  <input
                    type="number"
                    className="w-full rounded-xl bg-[#202020] border border-[#3a3a3a] px-3 py-2 text-body"
                    value={formState.quantity}
                    onChange={(e) => setFormState((s) => ({ ...s, quantity: e.target.value }))}
                    placeholder="e.g., 1"
                  />
                </div>
                <div>
                  <label className="text-helper block mb-1">Purchase Price (per unit)</label>
                  <input
                    type="number"
                    className="w-full rounded-xl bg-[#202020] border border-[#3a3a3a] px-3 py-2 text-body"
                    value={formState.purchasePrice}
                    onChange={(e) => setFormState((s) => ({ ...s, purchasePrice: e.target.value }))}
                    placeholder="e.g., 25000"
                  />
                </div>
                <div>
                  <label className="text-helper block mb-1">Purchase Date</label>
                  <input
                    type="date"
                    className="w-full rounded-xl bg-[#202020] border border-[#3a3a3a] px-3 py-2 text-body"
                    value={formState.purchaseDate}
                    onChange={(e) => setFormState((s) => ({ ...s, purchaseDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-helper block mb-1">Current Price (per unit)</label>
                  <input
                    type="number"
                    className="w-full rounded-xl bg-[#202020] border border-[#3a3a3a] px-3 py-2 text-body"
                    value={formState.currentPrice}
                    onChange={(e) => setFormState((s) => ({ ...s, currentPrice: e.target.value }))}
                    placeholder="Auto for live assets; enter for custom"
                  />
                </div>
                <div>
                  <label className="text-helper block mb-1">Subtitle / Notes</label>
                  <input
                    className="w-full rounded-xl bg-[#202020] border border-[#3a3a3a] px-3 py-2 text-body"
                    value={formState.subtitle}
                    onChange={(e) => setFormState((s) => ({ ...s, subtitle: e.target.value }))}
                    placeholder="e.g., Held on Ledger, Midtown property"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-helper block mb-1">Asset Type & Icon</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'crypto', label: 'Crypto', icon: 'BitcoinCircle' },
                    { id: 'stock', label: 'Stock/ETF', icon: 'Cash' },
                    { id: 'property', label: 'Property', icon: 'Neighbourhood' },
                    { id: 'custom', label: 'Custom', icon: 'Cash' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormState((s) => ({ ...s, assetType: opt.id, icon: opt.icon, sourceId: opt.id === 'custom' ? '' : s.sourceId }))}
                      className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                        formState.assetType === opt.id ? 'border-[#AC66DA] bg-[#312033]' : 'border-[#3a3a3a] bg-[#202020]'
                      }`}
                    >
                      <div className="text-body font-semibold">{opt.label}</div>
                      <div className="text-helper text-sm">Icon: {opt.icon}</div>
                    </button>
                  ))}
                </div>
              </div>

              {profitPreview && (
                <div className="rounded-2xl border border-[#3a3a3a] bg-[#202020] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-body">Current value: ${profitPreview.current.toFixed(2)}</div>
                  <div className="text-body">
                    Profit: {profitPreview.profit >= 0 ? '+' : ''}${profitPreview.profit.toFixed(2)} ({profitPreview.percent.toFixed(2)}%)
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#3a3a3a]">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-full bg-[#3a3a3a] text-[#E7E4E4] text-body hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
              <button
                disabled={saving || !formState.name}
                onClick={handleSaveInvestment}
                className="px-4 py-2 rounded-full bg-[#AC66DA] text-[#E7E4E4] text-body font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

