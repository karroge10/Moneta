'use client';

import { useState, type ReactNode } from 'react';
import { EditPencil } from 'iconoir-react';
import Button from '@/components/ui/Button';
import Stat from '@/components/ui/Stat';
import { inputClass } from '@/components/ui/Field';
import { cx } from '@/components/ui/cx';
import { isValuationMissing, type AssetDetail } from '@/hooks/investments/types';
import { formatMoney, formatPercent } from '@/lib/format';
import { formatSmartNumber } from '@/lib/utils';

interface AssetOverviewProps {
  asset: AssetDetail;
  currencySymbol: string;
  /** Resolves true when the manual price was saved. */
  onUpdatePrice: (price: string) => Promise<boolean>;
  saving: boolean;
  disabled: boolean;
}

/** Invested, current value (editable for manual assets), P&L and ROI. */
export default function AssetOverview({ asset, currencySymbol, onUpdatePrice, saving, disabled }: AssetOverviewProps) {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [draftPrice, setDraftPrice] = useState('');
  const missing = isValuationMissing(asset);
  const canEditPrice = Boolean(asset.userId) && asset.pricingMode === 'manual';
  const pnl = asset.pnl ?? 0;
  const roi = asset.pnlPercent ?? 0;

  const startEditing = () => {
    const current = asset.manualPrice ?? asset.currentPrice;
    setDraftPrice(current ? String(current) : '');
    setIsEditingPrice(true);
  };

  const savePrice = async () => {
    const saved = await onUpdatePrice(draftPrice);
    if (saved) setIsEditingPrice(false);
  };

  const priceEditor = (
    <div className="mt-1 space-y-2">
      <input
        type="number"
        value={draftPrice}
        onChange={(event) => setDraftPrice(event.target.value)}
        disabled={saving}
        aria-label="Manual price per unit"
        className={cx(inputClass, 'tabular-nums')}
        placeholder="Enter price"
        autoFocus
        onKeyDown={(event) => {
          if (event.key === 'Enter') void savePrice();
          if (event.key === 'Escape') {
            event.stopPropagation();
            setIsEditingPrice(false);
          }
        }}
      />
      <div className="flex gap-1">
        <Button size="sm" className="flex-1" onClick={savePrice} loading={saving}>
          Save
        </Button>
        <Button size="sm" variant="secondary" className="flex-1" onClick={() => setIsEditingPrice(false)} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <section aria-labelledby="asset-overview-heading">
      <h3 id="asset-overview-heading" className="mb-3 text-ui font-medium">
        Overview
      </h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Tile>
          <StatTile label="Total Invested">
            {currencySymbol}
            {formatSmartNumber(asset.totalCost ?? 0)}
          </StatTile>
        </Tile>
        <Tile>
          {isEditingPrice ? (
            <>
              <span className="text-ui text-secondary">Current Value</span>
              {priceEditor}
            </>
          ) : (
            <StatTile label="Current Value">
              {missing ? <Unavailable /> : formatMoney(asset.currentValue ?? 0, currencySymbol)}
            </StatTile>
          )}
          {canEditPrice && !isEditingPrice && (
            <button
              type="button"
              onClick={startEditing}
              disabled={disabled}
              aria-label="Edit current price"
              className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-1 hover:text-fg disabled:opacity-0"
            >
              <EditPencil width={14} height={14} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </Tile>
        <Tile>
          <StatTile label="P&L">
            {missing ? <Unavailable /> : <Signed value={pnl}>{formatMoney(pnl, currencySymbol, { sign: 'exceptZero' })}</Signed>}
          </StatTile>
        </Tile>
        <Tile>
          <StatTile label="ROI">
            {missing ? <Unavailable /> : <Signed value={roi}>{formatPercent(roi, { signed: true })}</Signed>}
          </StatTile>
        </Tile>
      </div>
      {missing && (
        <p className="mt-2 text-caption text-muted">
          No current price or exchange rate is available for this asset, so it is left out of portfolio totals.
        </p>
      )}
    </section>
  );
}

function Tile({ children }: { children: ReactNode }) {
  return <div className="relative rounded-panel border border-line bg-surface-0 p-4">{children}</div>;
}

function StatTile({ label, children }: { label: string; children: ReactNode }) {
  return <Stat label={label} value={children} size="md" />;
}

function Signed({ value, children }: { value: number; children: ReactNode }) {
  return <span className={value >= 0 ? 'text-positive' : 'text-negative-fg'}>{children}</span>;
}

function Unavailable() {
  return <span className="text-ui font-semibold text-warning">Price unavailable</span>;
}
