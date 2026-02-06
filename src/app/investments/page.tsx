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
import { Xmark } from 'iconoir-react';
import InvestmentForm from '@/components/investments/InvestmentForm';
import { CurrencyOption } from '@/components/transactions/import/CurrencySelector';

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isFloatingPanelOpen, setIsFloatingPanelOpen] = useState(false);

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

    fetch('/api/currencies')
      .then(res => res.json())
      .then(data => setCurrencies(data.currencies || []))
      .catch(err => console.error('Failed to fetch currencies', err));

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
        setShowEditModal(false);
        setSelectedInvestment(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [fetchInvestments]);

  const handleSaveInvestment = useCallback(async (formData: any, saveMode: 'add' | 'edit') => {
    try {
      setSaving(true);
      setError(null);
      const isEdit = saveMode === 'edit';
      const url = isEdit ? `/api/investments/${selectedInvestment?.id}` : '/api/investments';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to ${isEdit ? 'update' : 'add'} investment`);
      }

      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedInvestment(null);
      fetchInvestments();
    } catch (err) {
      console.error('Operation failed', err);
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSaving(false);
    }
  }, [fetchInvestments, selectedInvestment]);

  const handleDeleteInvestment = useCallback(async () => {
    if (!selectedInvestment || !confirm('Are you sure you want to delete this investment?')) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/investments/${selectedInvestment.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete investment');
      setShowEditModal(false);
      setSelectedInvestment(null);
      fetchInvestments();
    } catch (err) {
      console.error('Delete failed', err);
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  }, [fetchInvestments, selectedInvestment]);

  const handleRefreshPrices = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/cron/update-investment-prices');
      if (!res.ok) throw new Error('Refresh failed');
      fetchInvestments();
    } catch (err) {
      console.error('Refresh failed', err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchInvestments]);

  const handleSelectAsset = (
    asset: { id: string; name: string; symbol: string; type: string; icon: string; price?: number; ticker?: string },
  ) => {
    // This is now handled inside InvestmentForm
  };

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
            className="px-4 py-2 rounded-full bg-[#E7E4E4] text-[#282828] text-body font-medium hover:opacity-90 transition-opacity"
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
          secondaryButton={{
            label: refreshing ? 'Refreshing...' : 'Refresh Prices',
            onClick: handleRefreshPrices,
            disabled: refreshing,
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
            <PortfolioCard
              investments={data.portfolio}
              onEdit={(inv) => {
                setSelectedInvestment(inv);
                setShowEditModal(true);
              }}
            />
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

      {/* Edit Investment Modal */}
      {showEditModal && selectedInvestment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
          <div
            className="fixed inset-0 bg-black/60 animate-in fade-in duration-200"
            onClick={() => { setShowEditModal(false); setSelectedInvestment(null); }}
          />
          <div className={`relative bg-[#282828] rounded-3xl w-full max-w-2xl max-h-[94vh] border border-[#3a3a3a] shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 ${isFloatingPanelOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#3a3a3a]">
              <h3 className="text-card-header">Edit Investment</h3>
              <button
                onClick={() => { setShowEditModal(false); setSelectedInvestment(null); }}
                className="p-2 rounded-full hover:text-[#E7E4E4] hover:bg-[#3a3a3a] transition-colors cursor-pointer"
              >
                <Xmark width={22} height={22} strokeWidth={1.5} />
              </button>
            </div>
            <InvestmentForm
              mode="edit"
              investment={selectedInvestment}
              onSave={(formData) => handleSaveInvestment(formData, 'edit')}
              onCancel={() => { setShowEditModal(false); setSelectedInvestment(null); }}
              currencyOptions={currencies}
              isSaving={saving}
              onFloatingPanelToggle={setIsFloatingPanelOpen}
            />
          </div>
        </div>
      )}

      {/* Add Investment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
          <div
            className="fixed inset-0 bg-black/60 animate-in fade-in duration-200"
            onClick={() => setShowAddModal(false)}
          />
          <div className={`relative bg-[#282828] rounded-3xl w-full max-w-2xl max-h-[94vh] border border-[#3a3a3a] shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 ${isFloatingPanelOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#3a3a3a]">
              <h3 className="text-card-header">Add Investment</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-full hover:text-[#E7E4E4] hover:bg-[#3a3a3a] transition-colors cursor-pointer"
                aria-label="Close add investment modal"
              >
                <Xmark width={22} height={22} strokeWidth={1.5} />
              </button>
            </div>
            <InvestmentForm
              mode="add"
              onSave={(formData) => handleSaveInvestment(formData, 'add')}
              onCancel={() => setShowAddModal(false)}
              currencyOptions={currencies}
              isSaving={saving}
              onFloatingPanelToggle={setIsFloatingPanelOpen}
            />
          </div>
        </div>
      )}
    </main>
  );
}

