'use client';

import { useEffect, useRef } from 'react';
import { Xmark } from 'iconoir-react';
import { getHealthColor, getTrendColor } from '@/lib/utils';
import type { FinancialHealthDetails, TimePeriod } from '@/types/dashboard';

const PILLARS: { key: keyof FinancialHealthDetails['details']; label: string; description: string }[] = [
  { key: 'saving', label: 'Saving', description: 'Based on your savings rate: (income − expenses) / income.' },
  { key: 'spendingControl', label: 'Spending control', description: 'Whether your expenses stay within your income for the period.' },
  { key: 'goals', label: 'Goals', description: 'Share of your goals that are on track or completed.' },
  { key: 'engagement', label: 'Engagement', description: 'Recent activity, profile completeness, and categorized transactions.' },
];

interface FinancialHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  timePeriod?: TimePeriod;
  /** Data loaded on page load by parent; modal never fetches */
  initialData?: FinancialHealthDetails | null;
}

export default function FinancialHealthModal({
  isOpen,
  onClose,
  initialData,
}: FinancialHealthModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pointerDownOnOverlay = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const loading = initialData == null;
  const data = initialData ?? null;
  const score = data?.score ?? 0;
  const trend = data?.trend ?? 0;
  const details = data?.details;
  const showTrend = trend !== 0;
  const isEmpty = score === 0 && !loading;

  return (
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
        onMouseDown={() => { pointerDownOnOverlay.current = true; }}
        onMouseUp={() => {
          if (pointerDownOnOverlay.current) onClose();
          pointerDownOnOverlay.current = false;
        }}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-2xl max-h-[94vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto animate-in zoom-in-95 duration-200"
          style={{ backgroundColor: 'var(--bg-surface)' }}
          onMouseDown={() => { pointerDownOnOverlay.current = false; }}
        >
          <div className="flex items-center justify-between p-6 border-b border-[#3a3a3a] shrink-0">
            <h2 className="text-card-header">Financial Health Score</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text-primary)' }}
              aria-label="Close"
            >
              <Xmark width={24} height={24} strokeWidth={1.5} />
            </button>
          </div>
          <div className="overflow-y-auto p-6 pb-8">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-12 w-12 rounded-full animate-pulse mb-4" style={{ backgroundColor: '#3a3a3a' }} />
                <div className="h-8 w-48 rounded animate-pulse mb-2" style={{ backgroundColor: '#3a3a3a' }} />
                <div className="h-4 w-32 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }} />
              </div>
            )}
            {!loading && data && (
              <>
                <div className="flex flex-col items-center mb-6">
                  <span className="text-fin-health-key" style={{ color: getHealthColor(score) }}>
                    {score}
                  </span>
                  {showTrend && (
                    <span className="text-helper mt-2" style={{ color: getTrendColor(trend) }}>
                      {trend > 0 ? '+' : ''}{trend} vs last period
                    </span>
                  )}
                </div>
                <h3 className="text-card-header mb-2">How we calculate your score</h3>
                <p className="text-body opacity-70 mb-4">
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
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
