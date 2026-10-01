import type { Investment, PerformanceDataPoint } from '@/types/dashboard';
import type {
  AssetDetailTransactionRow,
  InvestmentAssetType,
  InvestmentRecentActivity,
} from '@/types/investments';

/** Valuation flags the API sets when a live price or an FX rate could not be resolved. */
export interface ValuationFlags {
  priceMissing?: boolean;
  rateMissing?: boolean;
}

/** One portfolio row from GET /api/investments. */
export interface Holding extends Investment, ValuationFlags {
  totalCost?: number;
  unrealizedPnl?: number;
  realizedPnl?: number;
}

export interface InvestmentsUpdate {
  date: string;
  message: string;
  highlight: string;
  link: string;
  isUnread?: boolean;
}

/** GET /api/investments. `missingValuations` / `missingRates` are optional until every server sends them. */
export interface InvestmentsSummary {
  update: InvestmentsUpdate;
  balance: { amount: number; trend: number; trendText?: string };
  totalCost: number;
  totalCostTrend?: number;
  totalCostComparisonLabel?: string;
  portfolio: Holding[];
  performance: { trend: number; trendText: string; data: PerformanceDataPoint[] };
  recentActivities: InvestmentRecentActivity[];
  missingValuations?: number;
  missingRates?: number;
}

/** `asset` from GET /api/investments/[id]. */
export interface AssetDetail extends ValuationFlags {
  id: number | string;
  name: string;
  ticker: string | null;
  assetType?: InvestmentAssetType;
  icon?: string;
  userId?: number | string | null;
  pricingMode: 'live' | 'manual';
  manualPrice?: number | string | null;
  currentPrice?: number;
  quantity?: number;
  currentValue?: number;
  totalCost?: number;
  pnl?: number;
  pnlPercent?: number;
  transactions?: AssetDetailTransactionRow[];
}

/** True when the holding has no usable price or FX rate, so its value is not a real number. */
export function isValuationMissing(flags: ValuationFlags | null | undefined): boolean {
  return Boolean(flags?.priceMissing || flags?.rateMissing);
}
