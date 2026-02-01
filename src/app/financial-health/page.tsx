'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import { getHealthColor, getTrendColor } from '@/lib/utils';
import type { FinancialHealthDetails, TimePeriod } from '@/types/dashboard';

const PILLARS: { key: keyof FinancialHealthDetails['details']; label: string; description: string }[] = [
  { key: 'saving', label: 'Saving', description: 'Based on your savings rate: (income − expenses) / income.' },
  { key: 'spendingControl', label: 'Spending control', description: 'Whether your expenses stay within your income for the period.' },
  { key: 'goals', label: 'Goals', description: 'Share of your goals that are on track or completed.' },
  { key: 'engagement', label: 'Engagement', description: 'Recent activity, profile completeness, and categorized transactions.' },
];

export default function FinancialHealthPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('This Month');
  const [data, setData] = useState<FinancialHealthDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ timePeriod });
      const res = await fetch(`/api/financial-health?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch financial health');
      const json = await res.json();
      setData({
        score: json.score ?? 0,
        trend: json.trend ?? 0,
        details: json.details ?? { saving: 0, spendingControl: 0, goals: 0, engagement: 0 },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load financial health');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [timePeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const score = data?.score ?? 0;
  const trend = data?.trend ?? 0;
  const details = data?.details;
  const showTrend = trend !== 0;
  const isEmpty = score === 0 && !loading && !error;

  return (
    <main className="min-h-screen bg-[#202020]">
      <div className="hidden md:block">
        <DashboardHeader pageName="Financial Health" />
      </div>
      <div className="md:hidden">
        <MobileNavbar pageName="Financial Health" activeSection="dashboard" />
      </div>

      <div className="md:px-6 px-4 pb-6 pt-4 flex flex-col gap-6 max-w-4xl mx-auto">
        {loading && (
          <div className="card-surface rounded-[30px] p-8 flex flex-col items-center justify-center min-h-[280px]">
            <div className="h-12 w-12 rounded-full animate-pulse mb-4" style={{ backgroundColor: '#3a3a3a' }} />
            <div className="h-8 w-48 rounded animate-pulse mb-2" style={{ backgroundColor: '#3a3a3a' }} />
            <div className="h-4 w-32 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }} />
          </div>
        )}

        {error && !loading && (
          <div className="card-surface rounded-[30px] p-6">
            <p className="text-body opacity-70">{error}</p>
            <button
              type="button"
              onClick={fetchData}
              className="mt-4 px-4 py-2 rounded-full font-semibold text-[#E7E4E4] hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#AC66DA' }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="card-surface rounded-[30px] p-8 flex flex-col items-center">
              <h1 className="text-card-header mb-2">Financial Health Score</h1>
              <span
                className="text-fin-health-key"
                style={{ color: getHealthColor(score) }}
              >
                {score}
              </span>
              {showTrend && (
                <span className="text-helper mt-2" style={{ color: getTrendColor(trend) }}>
                  {trend > 0 ? '+' : ''}{trend} vs last period
                </span>
              )}
            </div>

            <div className="card-surface rounded-[30px] p-6">
              <h2 className="text-card-header mb-3">How we calculate your score</h2>
              <p className="text-body opacity-70 mb-6">
                Your Financial Health Score is based on four areas: Saving, Spending control, Goals, and Engagement.
              </p>
              {isEmpty ? (
                <p className="text-helper">Add transactions to see your score and breakdown.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {PILLARS.map(({ key, label, description }) => {
                    const value = details?.[key] ?? 0;
                    return (
                      <div
                        key={key}
                        className="rounded-2xl border border-[#3a3a3a] p-4"
                        style={{ backgroundColor: '#202020' }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-card-header">{label}</span>
                          <span className="text-body font-semibold" style={{ color: getHealthColor(value) }}>
                            {value}/100
                          </span>
                        </div>
                        <p className="text-helper text-sm">{description}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
