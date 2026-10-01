'use client';

import { NavArrowRight, Search as SearchIcon } from 'iconoir-react';
import Spinner from '@/components/ui/Spinner';
import AssetLogo from '@/components/investments/AssetLogo';
import { useAssetSearch } from '@/hooks/investments/useInvestmentQueries';
import { useCurrency } from '@/hooks/useCurrency';
import { getDerivedAssetIcon } from '@/lib/asset-utils';
import { formatSmartNumber } from '@/lib/utils';
import type { InvestmentSearchResultAsset } from '@/types/investments';

interface AssetSearchStepProps {
  assetType: 'crypto' | 'stock' | 'property' | 'custom';
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (asset: InvestmentSearchResultAsset) => void;
  onSkip: () => void;
  /** USD to user-currency rate, for the "approximately" line under USD prices. */
  usdRate: number | null;
  disabled?: boolean;
}

/** Second wizard step for crypto and stocks: search a market asset or skip to manual entry. */
export default function AssetSearchStep({ assetType, query, onQueryChange, onSelect, onSkip, usdRate, disabled }: AssetSearchStepProps) {
  const { currency } = useCurrency();
  const { results, loading } = useAssetSearch(query, assetType);
  const placeholder = assetType === 'crypto' ? 'Search BTC, Ethereum...' : 'Search AAPL, TSLA...';

  return (
    <div className="space-y-5">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" width={20} height={20} aria-hidden="true" />
        <input
          className="min-h-11 w-full rounded-control border border-line bg-surface-0 px-12 py-2 text-base text-fg transition-colors placeholder:text-muted focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-ui"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          aria-label="Search assets"
          autoFocus
          disabled={disabled}
        />
        {assetType === 'stock' && (
          <span className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 text-caption text-muted sm:block">
            US stocks only (e.g. AAPL.US)
          </span>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="ml-1 text-caption uppercase tracking-wider text-muted">Results</h4>
        <div className="custom-scrollbar max-h-[300px] divide-y divide-line-subtle overflow-y-auto rounded-control border border-line bg-surface-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 text-muted" aria-busy="true">
              <Spinner size={24} />
              <span className="mt-2 text-caption">Searching...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((asset) => (
              <SearchResultRow key={asset.id} asset={asset} usdRate={usdRate} currency={currency} onSelect={onSelect} />
            ))
          ) : (
            <p className="p-8 text-center text-caption text-muted">
              {query.trim().length < 2 ? 'Start typing to search...' : 'No assets found.'}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-dashed border-line text-caption text-muted transition-colors hover:border-accent hover:text-fg"
      >
        Skip and enter details manually
        <NavArrowRight width={14} height={14} aria-hidden="true" />
      </button>
    </div>
  );
}

interface SearchResultRowProps {
  asset: InvestmentSearchResultAsset;
  usdRate: number | null;
  currency: { symbol: string };
  onSelect: (asset: InvestmentSearchResultAsset) => void;
}

function SearchResultRow({ asset, usdRate, currency, onSelect }: SearchResultRowProps) {
  const fallback = getDerivedAssetIcon(asset.type, asset.ticker, 'manual');
  return (
    <button
      type="button"
      onClick={() => onSelect(asset)}
      className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-1"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-1 text-accent">
          <AssetLogo src={asset.icon} size={18} fallback={fallback} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-ui font-semibold text-fg">{asset.name}</div>
          <div className="text-caption uppercase text-muted">{asset.symbol}</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {asset.price !== undefined && (
          <div className="mr-1 text-right tabular-nums">
            <div className="text-ui font-bold text-fg">${formatSmartNumber(asset.price)}</div>
            {usdRate !== null && (
              <div className="text-caption text-muted">
                ≈ {currency.symbol}
                {formatSmartNumber(asset.price * usdRate)}
              </div>
            )}
          </div>
        )}
        <NavArrowRight
          className="text-muted opacity-50 transition-[opacity,translate] group-hover:translate-x-1 group-hover:opacity-100"
          width={16}
          aria-hidden="true"
        />
      </div>
    </button>
  );
}
