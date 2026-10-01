'use client';

import AssetLogo from './AssetLogo';
import { getAssetColor } from '@/lib/asset-utils';
import { cx } from '@/components/ui/cx';

interface AssetAvatarProps {
  icon?: string;
  assetType?: string;
  /** Logo size in px; the circle is 40px. */
  size?: number;
  className?: string;
}

/** Asset logo on a circle tinted with the asset type color; falls back to a type icon. */
export default function AssetAvatar({ icon, assetType, size = 20, className }: AssetAvatarProps) {
  const color = getAssetColor(assetType);
  return (
    <div className={cx('icon-circle size-10 shrink-0', className)} style={{ backgroundColor: `${color}1a` }}>
      <AssetLogo src={icon} size={size} className="text-current" style={{ color }} fallback={fallbackIcon(assetType)} />
    </div>
  );
}

function fallbackIcon(assetType?: string): string {
  if (assetType === 'crypto') return 'BitcoinCircle';
  if (assetType === 'stock') return 'Cash';
  if (assetType === 'property') return 'Neighbourhood';
  return 'Reports';
}
