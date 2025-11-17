'use client';

import { StatisticsSummaryItem } from '@/types/dashboard';
import { MoreHoriz, StatUp, NavArrowRight } from 'iconoir-react';
import Card from '@/components/ui/Card';
import { getIcon } from '@/lib/iconMapping';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import Link from 'next/link';

interface StatisticsSummaryProps {
  items: StatisticsSummaryItem[];
}

export default function StatisticsSummary({ items }: StatisticsSummaryProps) {
  const { currency } = useCurrency();
  const regularItems = items.filter(item => !item.isLarge);
  const largeItem = items.find(item => item.isLarge);

  return (
    <Card 
      title="Summary" 
      className="h-full flex flex-col"
      customHeader={
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-card-header">Summary</h2>
          <button
            className="p-1 hover:opacity-70 transition-opacity cursor-pointer"
            aria-label="More options"
          >
            <MoreHoriz width={20} height={20} strokeWidth={1.5} style={{ color: '#E7E4E4' }} />
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 mt-4 flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 space-y-3 pr-1">
          {regularItems.map((item) => {
            const Icon = getIcon(item.icon);
            const displayValue = typeof item.value === 'number' 
              ? formatNumber(item.value) 
              : item.value;
            
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3"
                style={{
                  backgroundColor: '#202020',
                  borderRadius: '30px',
                  width: '100%',
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(163, 102, 203, 0.1)' }}
                >
                  <Icon
                    width={24}
                    height={24}
                    strokeWidth={1.5}
                    style={{ color: '#E7E4E4' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-body font-medium text-wrap-safe break-words">{item.label}</div>
                  {item.change && (
                    <div className="flex items-center gap-1 mt-1">
                      <StatUp width={14} height={14} strokeWidth={1.5} style={{ color: '#74C648' }} />
                      <span className="text-helper">{item.change}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-baseline gap-1 flex-shrink-0">
                  {typeof item.value === 'number' && <span className="text-body font-semibold">{currency.symbol}</span>}
                  <span className="text-body font-semibold">{displayValue}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Financial Health Score Card (Large) */}
        {largeItem && (
          <div
            className="flex flex-col items-center justify-center p-6 mt-4"
            style={{
              backgroundColor: '#202020',
              borderRadius: '30px',
              width: '100%',
              minHeight: '200px',
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(163, 102, 203, 0.1)' }}
            >
              {(() => {
                const Icon = getIcon(largeItem.icon);
                return (
                  <Icon
                    width={32}
                    height={32}
                    strokeWidth={1.5}
                    style={{ color: '#E7E4E4' }}
                  />
                );
              })()}
            </div>
            <h3 className="text-card-header mb-4">{largeItem.label}</h3>
            <div 
              className="mb-4" 
              style={{ 
                color: largeItem.iconColor,
                fontSize: 'clamp(48px, 5vw, 64px)',
                fontWeight: 700,
                lineHeight: 1.1
              }}
            >
              {largeItem.value}
            </div>
            {largeItem.link && (
              <Link 
                href="#" 
                className="text-helper flex items-center gap-1 cursor-pointer group hover-text-purple transition-colors flex-wrap"
              >
                <span className="text-wrap-safe break-words">{largeItem.link}</span>
                <NavArrowRight width={14} height={14} className="stroke-current transition-colors flex-shrink-0" />
              </Link>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

