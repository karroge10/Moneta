'use client';

import { useState } from 'react';
import { EditPencil } from 'iconoir-react';
import Button from '@/components/ui/Button';
import { inputClass } from '@/components/ui/Field';
import { cx } from '@/components/ui/cx';
import AssetLogo from '@/components/investments/AssetLogo';
import { isValuationMissing, type AssetDetail } from '@/hooks/investments/types';
import { getAssetColor, getDerivedAssetIcon } from '@/lib/asset-utils';
import { formatQuantity } from '@/lib/format';
import { formatSmartNumber } from '@/lib/utils';

interface AssetHeaderProps {
  asset: AssetDetail;
  currencySymbol: string;
  /** Resolves true when the rename was saved. */
  onRename: (name: string) => Promise<boolean>;
  saving: boolean;
  disabled: boolean;
}

/** Logo, name (renamable for user-owned assets), held quantity and the live unit price. */
export default function AssetHeader({ asset, currencySymbol, onRename, saving, disabled }: AssetHeaderProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(asset.name);
  const color = getAssetColor(asset.assetType);
  const quantity = asset.quantity ?? 0;
  const unit = asset.ticker || (quantity === 1 ? 'Item' : 'Items');
  const showLivePrice = asset.pricingMode === 'live' && Boolean(asset.currentPrice) && !isValuationMissing(asset);
  const canRename = Boolean(asset.userId);

  const startRename = () => {
    setDraftName(asset.name);
    setIsRenaming(true);
  };

  const saveRename = async () => {
    const saved = await onRename(draftName);
    if (saved) setIsRenaming(false);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="icon-circle size-12 shrink-0 bg-surface-0">
        <AssetLogo
          src={asset.icon || getDerivedAssetIcon(asset.assetType, asset.ticker, asset.pricingMode)}
          size={28}
          style={{ color }}
          fallback={getDerivedAssetIcon(asset.assetType, asset.ticker, 'manual')}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          {isRenaming ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                disabled={saving}
                aria-label="Asset name"
                className={cx(inputClass, 'min-w-48 flex-1')}
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void saveRename();
                  if (event.key === 'Escape') {
                    event.stopPropagation();
                    setIsRenaming(false);
                  }
                }}
              />
              <Button size="sm" onClick={saveRename} loading={saving}>
                Save
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setIsRenaming(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-1">
              <span className="truncate text-heading font-semibold leading-tight">{asset.name}</span>
              {canRename && (
                <button
                  type="button"
                  onClick={startRename}
                  disabled={disabled}
                  aria-label="Rename asset"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-accent-fg transition-colors hover:bg-surface-2 disabled:opacity-50"
                >
                  <EditPencil width={16} height={16} strokeWidth={2} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
          {showLivePrice && (
            <div className="shrink-0 text-right text-base font-bold leading-tight tabular-nums text-fg">
              {currencySymbol}
              {formatSmartNumber(asset.currentPrice ?? 0)}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className="rounded-chip bg-current/10 px-2 py-0.5 text-ui font-bold uppercase leading-none tracking-wider tabular-nums"
              style={{ color }}
            >
              {formatQuantity(quantity)} {unit}
            </span>
            {asset.assetType && <span className="text-caption font-medium capitalize text-muted">• {asset.assetType}</span>}
          </div>
          {showLivePrice && (
            <span className="shrink-0 rounded-chip border border-line bg-surface-0 px-1.5 py-0.5 text-caption font-bold uppercase leading-none tracking-wider text-secondary">
              Per 1 {asset.ticker}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
