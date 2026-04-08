'use client';

import { StatisticsSummaryItem } from '@/types/dashboard';
import { NavArrowRight } from 'iconoir-react';
import Card from '@/components/ui/Card';
import { getIcon } from '@/lib/iconMapping';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import Link from 'next/link';

const SKELETON_STYLE = { backgroundColor: '#3a3a3a' };
const SKELETON_ITEMS = 5;

interface StatisticsSummaryProps {
  items: StatisticsSummaryItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** When provided, the Financial Health "Learn" link opens this callback (e.g. modal) instead of linking */
  onFinancialHealthLearnClick?: () => void;
}

export default function StatisticsSummary({
  items,
  loading = false,
  error = null,
  onRetry,
  onFinancialHealthLearnClick,
}: StatisticsSummaryProps) {
  const { currency } = useCurrency();
  const regularItems = items.filter(item => !item.isLarge);
  const largeItem = items.find(item => item.isLarge);
  const portfolioIndex = regularItems.findIndex(item => item.label === 'Portfolio Balance');

  // Render order: items before Portfolio Balance, Portfolio Balance, Financial Health Score, items after
  const itemsBeforePortfolio = portfolioIndex >= 0 ? regularItems.slice(0, portfolioIndex) : regularItems;
  const portfolioItem = portfolioIndex >= 0 ? regularItems[portfolioIndex] : null;
  const itemsAfterPortfolio = portfolioIndex >= 0 ? regularItems.slice(portfolioIndex + 1) : [];

  const contentMinHeight = 420;

  const showError = !loading && !!error;

  if (showError) {
    return (
      <Card title="Summary" className="h-full flex flex-col min-h-0 flex-1" showActions={false}>
        <div
          className="flex flex-col flex-1 justify-center items-center gap-4 py-10 px-4 text-center mt-4"
          style={{ minHeight: contentMinHeight }}
        >
          <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
            {error}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 rounded-full text-body font-semibold cursor-pointer transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#E7E4E4', color: '#282828' }}
            >
              Try again
            </button>
          )}
        </div>
      </Card>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <Card title="Summary" className="h-full flex flex-col min-h-0 flex-1" showActions={false}>
        <div
          className="flex flex-col flex-1 justify-center items-center gap-4 py-10 px-4 text-center mt-4"
          style={{ minHeight: contentMinHeight }}
        >
          <p className="text-body font-medium" style={{ color: 'var(--text-primary)' }}>
            No summary yet
          </p>
          <p className="text-helper max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Log income and expenses to unlock income and expense totals, trends, goals, portfolio balance, and your financial health score.
          </p>
          <Link
            href="/transactions"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-body font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}
          >
            Go to Transactions
            <NavArrowRight width={16} height={16} strokeWidth={1.5} />
          </Link>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card
        title="Summary"
        className="h-full flex flex-col min-h-0 flex-1"
        showActions={false}
      >
        <div className="flex flex-col gap-4 mt-4 flex-1 min-h-0" style={{ minHeight: contentMinHeight }}>
          {/* Same order as content: 5 small rows (Income, Expenses, Income Saved, Goals, Portfolio) then Financial Health block right under */}
          <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0 space-y-3 pr-2">
            {Array.from({ length: SKELETON_ITEMS }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-3xl" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="w-12 h-12 rounded-full shrink-0 animate-pulse" style={SKELETON_STYLE} />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-4 w-28 rounded animate-pulse" style={SKELETON_STYLE} />
                  <div className="h-3 w-20 rounded animate-pulse" style={SKELETON_STYLE} />
                </div>
                <div className="h-4 w-14 rounded animate-pulse shrink-0" style={SKELETON_STYLE} />
              </div>
            ))}
            <div className="p-6 mt-4 rounded-3xl min-h-[200px] flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <div className="w-16 h-16 rounded-full animate-pulse mb-4" style={SKELETON_STYLE} />
              <div className="h-6 w-32 rounded animate-pulse mb-4" style={SKELETON_STYLE} />
              <div className="h-12 w-24 rounded animate-pulse" style={SKELETON_STYLE} />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Summary"
      className="h-full flex flex-col"
      showActions={false}
    >
      <div className="flex flex-col gap-4 mt-4 flex-1 min-h-0" style={{ filter: 'none', minHeight: contentMinHeight }}>
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 space-y-3 pr-2">
          {itemsBeforePortfolio.map((item) => (
            <SummaryItem key={item.id} item={item} currency={currency} />
          ))}
          {portfolioItem && <SummaryItem key={portfolioItem.id} item={portfolioItem} currency={currency} />}
          {largeItem && (
            <div
              key={largeItem.id}
              className="flex flex-col items-center justify-center p-6 mt-4"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '30px',
                width: '100%',
                minHeight: '200px',
              }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ 
                  backgroundColor: `${largeItem.iconColor}1a`,
                  border: '1px solid rgba(231, 228, 228, 0.1)'
                }}
              >
                {(() => {
                  const Icon = getIcon(largeItem.icon);
                  return (
                    <Icon
                      width={32}
                      height={32}
                      strokeWidth={1.5}
                      style={{ color: largeItem.iconColor }}
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
                  lineHeight: 1.1,
                }}
              >
                {largeItem.value}
              </div>
              {largeItem.change && (
                <div className="text-helper mb-2">{largeItem.change}</div>
              )}
              {largeItem.link && (
                onFinancialHealthLearnClick ? (
                  <button
                    type="button"
                    onClick={onFinancialHealthLearnClick}
                    className="text-helper flex items-center gap-1 cursor-pointer group hover-text-purple transition-colors flex-wrap text-left"
                  >
                    <span className="text-wrap-safe break-words">{largeItem.link}</span>
                    <NavArrowRight width={14} height={14} className="stroke-current transition-colors shrink-0" />
                  </button>
                ) : (
                  <Link
                    href="/financial-health"
                    className="text-helper flex items-center gap-1 cursor-pointer group hover-text-purple transition-colors flex-wrap"
                  >
                    <span className="text-wrap-safe break-words">{largeItem.link}</span>
                    <NavArrowRight width={14} height={14} className="stroke-current transition-colors shrink-0" />
                  </Link>
                )
              )}
            </div>
          )}
          {itemsAfterPortfolio.map((item) => (
            <SummaryItem key={item.id} item={item} currency={currency} />
          ))}
        </div>
      </div>
    </Card>
  );
}

function SummaryItem({ item, currency }: { item: StatisticsSummaryItem; currency: { symbol: string } }) {
  const Icon = getIcon(item.icon);
  const displayValue = typeof item.value === 'number'
    ? formatNumber(item.value)
    : item.value;
  const isNegativeChange = item.change.startsWith('-');
  const changeColor = isNegativeChange ? '#D93F3F' : '#74C648';
  const changeParts = item.change ? item.change.split(/\s+(.+)/) : [];
  const changePct = changeParts[0] ?? '';
  const changeLabel = changeParts[1] ?? '';

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 relative"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '30px',
        width: '100%',
      }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
        style={{ 
          backgroundColor: `${item.iconColor}1a`,
          border: '1px solid rgba(231, 228, 228, 0.1)'
        }}
      >
        <Icon width={24} height={24} strokeWidth={1.5} style={{ color: item.iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-body font-medium text-wrap-safe break-words">{item.label}</div>
        {item.change && (
          <div className="flex items-center gap-2 mt-1">
            <span>
              <span style={{ color: changeColor, fontWeight: 600 }}>{changePct}</span>
              {changeLabel && <span className="text-helper"> {changeLabel}</span>}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1 flex-shrink-0">
        {typeof item.value === 'number' && <span className="text-body font-semibold">{currency.symbol}</span>}
        <span className="text-body font-semibold">{displayValue}</span>
      </div>
    </div>
  );
}

