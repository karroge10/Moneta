'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { Xmark } from 'iconoir-react';
import { Category, Transaction } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

interface CategoryStatsModalProps {
  categories: Category[];
  timePeriod: string;
  onClose: () => void;
  transactions?: Transaction[]; // Optional: if provided, use these instead of fetching
}

export default function CategoryStatsModal({
  categories,
  timePeriod,
  onClose,
  transactions: providedTransactions,
}: CategoryStatsModalProps) {
  const { currency } = useCurrency();
  const modalRef = useRef<HTMLDivElement>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(!providedTransactions);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [onClose]);

  // Fetch all transactions for stats (with large page size) - only if not provided
  useEffect(() => {
    if (providedTransactions) {
      setAllTransactions(providedTransactions);
      setLoading(false);
      return;
    }

    const fetchAllTransactions = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: '1',
          pageSize: '1000', // Large page size to get all transactions
          timePeriod: timePeriod,
        });
        
        const response = await fetch(`/api/transactions?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setAllTransactions(data.transactions || []);
        }
      } catch (err) {
        console.error('Error fetching transactions for stats:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllTransactions();
  }, [timePeriod, providedTransactions]);

  // Calculate category statistics
  const categoryStats = useMemo(() => {
    const stats = new Map<string, { category: Category; total: number; count: number }>();
    
    allTransactions.forEach(transaction => {
      if (!transaction.category) return;
      
      const category = categories.find(c => c.name === transaction.category);
      if (!category) return;
      
      const existing = stats.get(category.id) || { category, total: 0, count: 0 };
      existing.total += Math.abs(transaction.amount);
      existing.count += 1;
      stats.set(category.id, existing);
    });
    
    return Array.from(stats.values())
      .sort((a, b) => b.total - a.total);
  }, [categories, allTransactions]);

  const totalAmount = useMemo(() => {
    return categoryStats.reduce((sum, stat) => sum + stat.total, 0);
  }, [categoryStats]);

  if (!categories.length) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200"
        onClick={event => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          className="w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden flex flex-col"
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          <div
            className="flex items-center justify-between p-6 border-b border-[#3a3a3a]"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            <h2 className="text-card-header">Category Statistics</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover-text-purple transition-colors cursor-pointer"
              aria-label="Close"
            >
              <Xmark width={24} height={24} strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="text-body opacity-70">Loading category statistics...</div>
              </div>
            ) : categoryStats.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-body opacity-70">No category data available</div>
              </div>
            ) : (
              <div className="space-y-4">
                {categoryStats.map(stat => {
                  const Icon = getIcon(stat.category.icon);
                  const percentage = totalAmount > 0 ? (stat.total / totalAmount) * 100 : 0;
                  
                  return (
                    <div
                      key={stat.category.id}
                      className="rounded-2xl p-4 border border-[#3a3a3a]"
                      style={{ backgroundColor: '#181818' }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: 'rgba(163, 102, 203, 0.1)' }}
                          >
                            <Icon width={20} height={20} strokeWidth={1.5} style={{ color: stat.category.color || '#E7E4E4' }} />
                          </div>
                          <div>
                            <div className="text-body font-semibold">{stat.category.name}</div>
                            <div className="text-helper text-xs">{stat.count} transactions</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-body font-semibold">{currency.symbol}{formatNumber(stat.total)}</div>
                          <div className="text-helper text-xs">{percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#2A2A2A' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            backgroundColor: stat.category.color || '#AC66DA',
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

