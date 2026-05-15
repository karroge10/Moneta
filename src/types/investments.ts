import type { Investment } from '@/types/dashboard';

export type InvestmentAssetType = 'crypto' | 'stock' | 'property' | 'custom';

/** Row returned by GET /api/investments for recent activity lists */
export interface InvestmentRecentActivity {
  id: string;
  name: string;
  ticker: string | null;
  date: string;
  type: 'Buy' | 'Sell';
  quantity: number;
  pricePerUnit: number;
  investmentType: 'buy' | 'sell';
  icon: string;
  assetType?: InvestmentAssetType;
}

/** Payload from InvestmentForm onSave → POST /api/investments */
export interface InvestmentCreatePayload {
  name: string;
  ticker: string | null;
  assetType: InvestmentAssetType;
  investmentType: 'buy' | 'sell';
  quantity: number;
  pricePerUnit: number;
  date: string;
  coingeckoId?: string;
  pricingMode: 'live' | 'manual';
  currencyId: number;
  subtitle?: string;
  icon?: string;
}

/** Editing an investment-linked transaction (modal + page state) */
export interface InvestmentTransactionEditState {
  id: string;
  date: string;
  investmentType: 'buy' | 'sell';
  quantity: number;
  pricePerUnit: number;
  assetName?: string;
  assetTicker?: string | null;
  icon?: string;
  assetType?: InvestmentAssetType;
  name?: string;
  amount?: number;
  currency?: { symbol: string; alias: string; id: number };
  currencyId?: number;
}

/** Matches GET /api/investments/search `assets` items (crypto + stock) */
export interface InvestmentSearchResultAsset {
  id: string;
  name: string;
  symbol: string;
  type: 'crypto' | 'stock';
  icon: string;
  price?: number;
  ticker?: string;
}

export type InvestmentForAddTransaction = Pick<
  Investment,
  'id' | 'name' | 'ticker' | 'assetType' | 'icon'
>;

export interface PriceHistoryPoint {
  date: string;
  value: number;
}

export type AssetUpdatePayload = Record<
  string,
  string | number | boolean | null | undefined
>;

/** Investment tx row from GET /api/investments/[id] */
export interface AssetDetailTransactionRow {
  id: string;
  date: string;
  investmentType: 'buy' | 'sell';
  quantity: number | string;
  pricePerUnit: number | string;
  currency?: { symbol: string; alias: string; id: number };
}

export interface InvestmentHistoryApiRow {
  date: string;
  price: number;
}
