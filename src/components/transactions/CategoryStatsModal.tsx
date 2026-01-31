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
  const overlayRef = useRef<HTMLDivElement>(null);
  const pointerDownOnOverlay = useRef(false);
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

  // Calculate category statistics separated by income and expense
  const { incomeStats, expenseStats, incomeTotal, expenseTotal } = useMemo(() => {
    const incomeMap = new Map<string, { category: Category; total: number; count: number }>();
    const expenseMap = new Map<string, { category: Category; total: number; count: number }>();
    
    allTransactions.forEach(transaction => {
      if (!transaction.category) return;
      
      const category = categories.find(c => c.name === transaction.category);
      if (!category) return;
      
      const isIncome = transaction.amount >= 0;
      const map = isIncome ? incomeMap : expenseMap;
      const existing = map.get(category.id) || { category, total: 0, count: 0 };
      existing.total += Math.abs(transaction.amount);
      existing.count += 1;
      map.set(category.id, existing);
    });
    
    const incomeStats = Array.from(incomeMap.values())
      .sort((a, b) => b.total - a.total);
    const expenseStats = Array.from(expenseMap.values())
      .sort((a, b) => b.total - a.total);
    
    const incomeTotal = incomeStats.reduce((sum, stat) => sum + stat.total, 0);
    const expenseTotal = expenseStats.reduce((sum, stat) => sum + stat.total, 0);
    
    return { incomeStats, expenseStats, incomeTotal, expenseTotal };
  }, [categories, allTransactions]);

  if (!categories.length) {
    return null;
  }

  return (
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
        onMouseDown={() => {
          pointerDownOnOverlay.current = true;
        }}
        onMouseUp={() => {
          if (pointerDownOnOverlay.current && overlayRef.current) {
            onClose();
          }
          pointerDownOnOverlay.current = false;
        }}
      />
      <div
        ref={modalRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200 pointer-events-none"
      >
        <div
          className="w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden flex flex-col pointer-events-auto"
          style={{ backgroundColor: 'var(--bg-surface)' }}
          onMouseDown={() => {
            pointerDownOnOverlay.current = false;
          }}
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
            ) : incomeStats.length === 0 && expenseStats.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-body opacity-70">No category data available</div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Incomes Section */}
                {incomeStats.length > 0 && (
                  <div>
                    <h3 className="text-card-header mb-4" style={{ color: '#74C648' }}>Incomes</h3>
                    <div className="space-y-4">
                      {incomeStats.map(stat => {
                        const Icon = getIcon(stat.category.icon);
                        const percentage = incomeTotal > 0 ? (stat.total / incomeTotal) * 100 : 0;
                        
                        return (
                          <div
                            key={`income-${stat.category.id}`}
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
                                <div className="text-body font-semibold" style={{ color: '#74C648' }}>{currency.symbol}{formatNumber(stat.total)}</div>
                                <div className="text-helper text-xs">{percentage.toFixed(1)}%</div>
                              </div>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#2A2A2A' }}>
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  backgroundColor: stat.category.color || '#74C648',
                                  width: `${percentage}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Expenses Section */}
                {expenseStats.length > 0 && (
                  <div>
                    <h3 className="text-card-header mb-4" style={{ color: '#D93F3F' }}>Expenses</h3>
                    <div className="space-y-4">
                      {expenseStats.map(stat => {
                        const Icon = getIcon(stat.category.icon);
                        const percentage = expenseTotal > 0 ? (stat.total / expenseTotal) * 100 : 0;
                        
                        return (
                          <div
                            key={`expense-${stat.category.id}`}
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
                                <div className="text-body font-semibold" style={{ color: '#D93F3F' }}>{currency.symbol}{formatNumber(stat.total)}</div>
                                <div className="text-helper text-xs">{percentage.toFixed(1)}%</div>
                              </div>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#2A2A2A' }}>
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  backgroundColor: stat.category.color || '#D93F3F',
                                  width: `${percentage}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

