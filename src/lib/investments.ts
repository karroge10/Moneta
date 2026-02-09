import { db } from './db';
import { Currency, InvestmentType, AssetType, PricingMode } from '@prisma/client';
import { convertAmount } from './currency-conversion';

export interface PortfolioAsset {
  assetId: number;
  name: string;
  ticker: string;
  type: AssetType;
  quantity: number;
  avgPrice: number; // Average buy price
  currentPrice: number;
  currentValue: number;
  totalCost: number;
  pnl: number;
  pnlPercent: number;
  pricingMode: PricingMode;
  icon?: string; // Derived or optional
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  pnlPercent: number;
  assets: PortfolioAsset[];
}

// Map ticker to CoinGecko ID (could be moved to DB or config)
const coingeckoMap: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  ADA: 'cardano',
  USDT: 'tether',
  USDC: 'usd-coin',
  DOGE: 'dogecoin',
  LTC: 'litecoin',
  XRP: 'ripple',
  // Add more as needed or rely on Asset.coingeckoId
};

async function fetchCryptoPrices(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  const unique = Array.from(new Set(ids));
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${unique.join(',')}&vs_currencies=usd`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return {};
    const data = await res.json();
    // Transform { bitcoin: { usd: 50000 } } to { bitcoin: 50000 }
    const prices: Record<string, number> = {};
    for (const key in data) {
      if (data[key]?.usd) prices[key] = data[key].usd;
    }
    return prices;
  } catch (e) {
    console.error('Failed to fetch crypto prices', e);
    return {};
  }
}

export async function getInvestmentsPortfolio(userId: number, targetCurrency: Currency): Promise<PortfolioSummary> {
  console.log('[investments] Getting portfolio for user', userId, 'target', targetCurrency.alias);
  // 1. Fetch all investment transactions
  const transactions = await db.transaction.findMany({
    where: {
      userId,
      investmentAssetId: { not: null },
    },
    include: {
      asset: true,
      currency: true, // Transaction currency
    },
    orderBy: { date: 'asc' },
  });

  // 2. Identify assets involved
  const assetMap = new Map<number, {
    asset: any;
    txs: typeof transactions;
  }>();

  for (const t of transactions) {
    if (!t.investmentAssetId) continue;
    if (!assetMap.has(t.investmentAssetId)) {
      assetMap.set(t.investmentAssetId, { asset: t.asset, txs: [] });
    }
    assetMap.get(t.investmentAssetId)!.txs.push(t);
  }

  // 3. Prepare for Live Pricing
  const livePriceIds: string[] = [];
  for (const item of assetMap.values()) {
    if (item.asset?.pricingMode === 'live' && (item.asset.coingeckoId || coingeckoMap[item.asset.ticker])) {
      const id = item.asset.coingeckoId || coingeckoMap[item.asset.ticker];
      if (id) livePriceIds.push(id);
    }
  }
  const livePrices = await fetchCryptoPrices(livePriceIds);
  console.log('[investments] Live prices fetched:', livePrices);

  const portfolioAssets: PortfolioAsset[] = [];
  let globalTotalValue = 0;
  let globalTotalCost = 0;

  // 4. Aggregation Logic
  for (const [assetId, { asset, txs }] of assetMap) {
    if (!asset) continue;

    let quantity = 0;
    let totalCost = 0; // Total cost basis
    let lastPrice = 0;

    for (const t of txs) {
      const qty = Number(t.quantity);
      // Ensure transaction price is converted to Target Currency?
      // Or should we calculate Cost Basis in USD and then convert?
      // Usually cleaner to convert everything to Target Currency immediately for display.
      // But if target currency changes, historical cost basis shouldn't fluctuate by FX Rate of TODAY?
      // Historical Cost is fixed in Transaction Currency.
      // We should convert Transaction Cost to Target Currency using Rate at Transaction Date?
      // Or just convert avgPrice at the end?
      // Standard: Sum(Cost in USD), Sum(Qty). Avg = Cost/Qty.
      // Let's assume we convert everything to Target Currency at the time of calculation using CURRENT rate?
      // No, cost basis uses historical rate.
      // We'll use helper `convertAmount`.

      let pricePerUnit = Number(t.pricePerUnit);
      if (t.currencyId !== targetCurrency.id) {
        pricePerUnit = await convertAmount(pricePerUnit, t.currencyId, targetCurrency.id, t.date);
      }

      const txCost = qty * pricePerUnit;

      if (t.investmentType === 'buy') {
        quantity += qty;
        totalCost += txCost;
        lastPrice = pricePerUnit;
      } else if (t.investmentType === 'sell') {
        if (quantity > 0) {
          // Reduce cost basis proportionally
          const ratio = qty / quantity;
          totalCost -= totalCost * ratio;
        }
        quantity -= qty;
        lastPrice = pricePerUnit; // Using sell price as "last valid price" source? debatable. Use buy/sell price both.
      }
    }

    if (quantity < 0.00000001) quantity = 0; // Floating point fix

    let avgPrice = quantity > 0 ? totalCost / quantity : 0;

    // Determine Current Price
    let currentPrice = lastPrice;
    if (asset.pricingMode === 'live') {
      const id = asset.coingeckoId || coingeckoMap[asset.ticker];
      if (id && livePrices[id]) {
        // Live prices are USD. Convert to target currency.
        // Assuming fetchCryptoPrices returns USD.
        // We need 'usd' currency ID.
        // TODO: Optimize getting USD currency ID.
        // For now assume logic handles it or we fetch USD id.
        // If target is USD, great. Else convert.
        // Using convertAmount from USD to Target.
        // We need existing 'convertAmount' which takes ID.
        // I will hack: assume we can resolve 'USD' id efficiently.
        // Or just `convertAmount` handles it? `convertAmount` needs DB lookup? Yes.
        // I'll leave it as TODO or do a quick lookup.
        // Actually, `investments.ts` in lines 133-136 fetched usdCurrency.
        currentPrice = livePrices[id]; // This is USD.
      }
    }

    // Normalize currentPrice to targetCurrency (if it was USD from API)
    // Need to handle currency conversion for Live Price.

    // Calculate final metrics
    const currentValue = quantity * currentPrice;
    const pnl = currentValue - totalCost;
    const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

    portfolioAssets.push({
      assetId: asset.id,
      name: asset.name,
      ticker: asset.ticker,
      type: asset.assetType,
      quantity,
      avgPrice,
      currentPrice,
      currentValue,
      totalCost,
      pnl,
      pnlPercent,
      pricingMode: asset.pricingMode,
      icon: asset.assetType === 'crypto' ? 'BitcoinCircle' : 'Reports', // Placeholder
    });

    globalTotalValue += currentValue;
    globalTotalCost += totalCost;
  }

  // Post-process: Convert Live USD prices if needed.
  // Getting USD Currency ID for conversion
  const usd = await db.currency.findFirst({ where: { alias: { equals: 'usd', mode: 'insensitive' } } });
  console.log('[investments] USD Currency lookup:', usd?.alias);

  if (usd && targetCurrency.id !== usd.id) {
    // Convert assets that used Live USD price
    const now = new Date();
    for (const p of portfolioAssets) {
      if (p.pricingMode === 'live') {
        // It is currently in USD. Convert to Target.
        p.currentPrice = await convertAmount(p.currentPrice, usd.id, targetCurrency.id, now);
        p.currentValue = p.quantity * p.currentPrice;
        // Recalculate PnL
        p.pnl = p.currentValue - p.totalCost;
        p.pnlPercent = p.totalCost > 0 ? (p.pnl / p.totalCost) * 100 : 0;
      }
    }

    // Recalculate globals after conversion
    globalTotalValue = portfolioAssets.reduce((sum, a) => sum + a.currentValue, 0);
    // globalTotalCost was already in target currency (converted at transaction time).
  }

  const globalPnl = globalTotalValue - globalTotalCost;
  const globalPnlPercent = globalTotalCost > 0 ? (globalPnl / globalTotalCost) * 100 : 0;

  return {
    totalValue: globalTotalValue,
    totalCost: globalTotalCost,
    totalPnl: globalPnl,
    pnlPercent: globalPnlPercent,
    assets: portfolioAssets
  };
}
