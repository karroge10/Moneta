import { db } from './db';
import { fetchStockHistory, fetchStockPrices } from './stock-prices';
import { Prisma, type Asset, type Currency, type AssetType, type PricingMode } from '@prisma/client';
import { buildCacheKey, preloadRates, type RatesMap } from './currency-conversion';
import { addUtcDays, toDateKey } from './dates';
import { moneyToNumber, sumMoney } from './money';
import { aggregateHolding, valueHolding, type Holding } from './investment-holdings';

export interface PortfolioAsset {
  assetId: number;
  name: string;
  ticker: string;
  type: AssetType;
  quantity: number;
  avgPrice: number; 
  currentPrice: number;
  currentValue: number;
  totalCost: number; 
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  realizedPnl: number; 
  pnl: number; 
  pricingMode: PricingMode;
  icon?: string;
  /** Live price could not be fetched; the holding is excluded from portfolio totals. */
  priceMissing: boolean;
  /** An FX rate was missing (cost basis or live price); the holding is excluded from totals. */
  rateMissing: boolean;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalUnrealizedPnl: number;
  totalRealizedPnl: number;
  totalPnl: number;
  pnlPercent: number;
  assets: PortfolioAsset[];
  /** Holdings left out of the totals because a price or FX rate was missing. */
  missingValuations: number;
}


const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  ADA: 'cardano',
  USDT: 'tether',
  USDC: 'usd-coin',
  DOGE: 'dogecoin',
  LTC: 'litecoin',
  XRP: 'ripple',
};

export async function getInvestmentsPortfolio(userId: number, targetCurrency: Currency): Promise<PortfolioSummary> {
  const usd = await db.currency.findFirst({ where: { alias: { equals: 'usd', mode: 'insensitive' } } });

  const transactions = await db.transaction.findMany({
    where: {
      userId,
      investmentAssetId: { not: null },
    },
    include: {
      asset: true,
      currency: true,
    },
    orderBy: { date: 'asc' },
  });

  const assetMap = new Map<number, {
    asset: NonNullable<(typeof transactions)[number]['asset']>;
    txs: typeof transactions;
  }>();

  for (const t of transactions) {
    if (!t.investmentAssetId) continue;
    if (!t.asset) continue;
    if (!assetMap.has(t.investmentAssetId)) {
      assetMap.set(t.investmentAssetId, { asset: t.asset, txs: [] });
    }
    assetMap.get(t.investmentAssetId)!.txs.push(t);
  }

  const cryptoIds: string[] = [];
  const stockTickers: string[] = [];

  for (const item of assetMap.values()) {
    if (item.asset.pricingMode !== 'live') continue;
    if (item.asset.assetType === 'crypto') {
      const id = coingeckoIdFor(item.asset);
      if (id) cryptoIds.push(id);
    } else if (item.asset.assetType === 'stock' && item.asset.ticker) {
      stockTickers.push(item.asset.ticker);
    }
  }

  const now = new Date();
  const rateRequests = transactions.map((t) => ({ currencyId: t.currencyId, date: t.date }));
  if (usd) rateRequests.push({ currencyId: usd.id, date: now });

  const [cryptoPrices, stockPrices, ratesMap] = await Promise.all([
    fetchCryptoPrices(cryptoIds),
    fetchStockPrices(stockTickers),
    preloadRates(rateRequests, targetCurrency.id),
  ]);

  const usdRate = usd ? usdToTargetRate(usd.id, targetCurrency.id, now, ratesMap) : null;
  const portfolioAssets: PortfolioAsset[] = [];
  const valued: { value: Prisma.Decimal; cost: Prisma.Decimal; realized: Prisma.Decimal }[] = [];
  let missingValuations = 0;

  for (const { asset, txs } of assetMap.values()) {
    const holdingTxs = txs.map((t) => ({
      investmentType: t.investmentType,
      quantity: t.quantity,
      convertedPricePerUnit: convertPrice(t, targetCurrency.id, ratesMap),
    }));
    const holding = aggregateHolding(holdingTxs);
    const livePriceUsd = livePriceFor(asset, cryptoPrices, stockPrices);
    const price = resolveCurrentPrice(asset, holding, livePriceUsd, usdRate);
    const valuation = valueHolding(holding, price.value ?? new Prisma.Decimal(0));
    const excluded = holding.rateMissing || price.priceMissing || price.rateMissing;

    if (excluded) {
      missingValuations += 1;
    } else {
      valued.push({ value: valuation.currentValue, cost: holding.totalCost, realized: holding.realizedPnl });
    }

    portfolioAssets.push({
      assetId: asset.id,
      name: asset.name,
      ticker: asset.ticker ?? '',
      type: asset.assetType,
      quantity: moneyToNumber(holding.quantity),
      avgPrice: moneyToNumber(valuation.avgPrice),
      currentPrice: price.value ? moneyToNumber(price.value) : 0,
      currentValue: moneyToNumber(valuation.currentValue),
      totalCost: moneyToNumber(holding.totalCost),
      unrealizedPnl: moneyToNumber(valuation.unrealizedPnl),
      unrealizedPnlPercent: valuation.unrealizedPnlPercent,
      realizedPnl: moneyToNumber(holding.realizedPnl),
      pnl: moneyToNumber(valuation.totalPnl),
      pricingMode: asset.pricingMode,
      icon: asset.icon || deriveAssetIcon(asset),
      priceMissing: price.priceMissing,
      rateMissing: holding.rateMissing || price.rateMissing,
    });
  }

  const totalValue = sumMoney(valued.map((v) => v.value));
  const totalCost = sumMoney(valued.map((v) => v.cost));
  const totalRealized = sumMoney(valued.map((v) => v.realized));
  const totalUnrealized = totalValue.minus(totalCost);
  const totalPnl = totalRealized.plus(totalUnrealized);
  const pnlRatio = totalCost.gt(0) ? totalPnl.div(totalCost) : new Prisma.Decimal(0);

  return {
    totalValue: moneyToNumber(totalValue),
    totalCost: moneyToNumber(totalCost),
    totalUnrealizedPnl: moneyToNumber(totalUnrealized),
    totalRealizedPnl: moneyToNumber(totalRealized),
    totalPnl: moneyToNumber(totalPnl),
    pnlPercent: pnlRatio.mul(100).toNumber(),
    assets: portfolioAssets,
    missingValuations,
  };
}

export async function getInvestmentPriceHistory(userId: number, assetId: number, maxPoints: number = 30): Promise<{ date: string; value: number }[]> {
  // Shared assets have no owner; private assets are visible only to the user who created them.
  const asset = await db.asset.findFirst({
    where: { id: assetId, OR: [{ userId: null }, { userId }] },
  });
  if (!asset) return [];

  if (asset.pricingMode === 'manual') {
    const price = Number(asset.manualPrice || 0);
    return flatHistory(price, maxPoints);
  }

  if (asset.assetType === 'crypto') {
    const cgId = coingeckoIdFor(asset);
    if (cgId) {
      const history = await fetchCryptoHistory(cgId, maxPoints);
      if (history.length > 0) {
        return history.slice(-maxPoints);
      }
    }
  }

  if (asset.assetType === 'stock' && asset.ticker) {
    return fetchStockHistory(asset.ticker, maxPoints);
  }
  // No price source: an empty history is shown as "no data" instead of a made-up flat line.
  return [];
}

export async function getAssetHolding(userId: number, assetId: number): Promise<Prisma.Decimal> {
  const transactions = await db.transaction.findMany({
    where: {
      userId,
      investmentAssetId: assetId,
    },
    select: {
      quantity: true,
      investmentType: true,
    },
  });

  let total = new Prisma.Decimal(0);
  for (const t of transactions) {
    const qty = t.quantity ?? new Prisma.Decimal(0);
    if (t.investmentType === 'buy') total = total.plus(qty);
    else if (t.investmentType === 'sell') total = total.minus(qty);
  }
  return total;
}

/** Icon used when the asset has none of its own. */
function deriveAssetIcon(asset: Pick<Asset, 'assetType' | 'pricingMode' | 'ticker'>): string {
  if (asset.pricingMode === 'live' && asset.ticker) {
    if (asset.assetType === 'crypto') {
      const symbol = asset.ticker.toLowerCase();
      return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${symbol}.png`;
    }
  }
  if (asset.assetType === 'crypto') return 'BitcoinCircle';
  if (asset.assetType === 'stock') return 'Cash';
  if (asset.assetType === 'property') return 'Neighbourhood';
  return 'Reports';
}

type CurrentPrice = { value: Prisma.Decimal | null; priceMissing: boolean; rateMissing: boolean };

/**
 * Live assets use the fetched USD price converted at today's USD rate. Manual assets use the
 * manual price, falling back to the last transaction price. Nothing is ever substituted with 1.
 */
function resolveCurrentPrice(
  asset: Asset,
  holding: Holding,
  livePriceUsd: number | null,
  usdRate: Prisma.Decimal | null,
): CurrentPrice {
  if (asset.pricingMode === 'live') {
    if (livePriceUsd === null) return { value: null, priceMissing: true, rateMissing: false };
    if (!usdRate) return { value: null, priceMissing: false, rateMissing: true };
    const usdPrice = new Prisma.Decimal(livePriceUsd);
    return { value: usdPrice.mul(usdRate), priceMissing: false, rateMissing: false };
  }
  const manual = asset.manualPrice ?? holding.lastPrice;
  return { value: manual, priceMissing: false, rateMissing: false };
}

function livePriceFor(
  asset: Asset,
  cryptoPrices: Record<string, number>,
  stockPrices: Record<string, number>,
): number | null {
  if (asset.pricingMode !== 'live') return null;
  if (asset.assetType === 'crypto') {
    const id = coingeckoIdFor(asset);
    return id && cryptoPrices[id] ? cryptoPrices[id] : null;
  }
  if (asset.assetType === 'stock' && asset.ticker) {
    return stockPrices[asset.ticker] || null;
  }
  return null;
}

function convertPrice(
  t: { pricePerUnit: Prisma.Decimal | null; currencyId: number; date: Date },
  targetCurrencyId: number,
  ratesMap: RatesMap,
): Prisma.Decimal | null {
  const price = t.pricePerUnit ?? new Prisma.Decimal(0);
  if (t.currencyId === targetCurrencyId) return price;
  const key = buildCacheKey(t.currencyId, targetCurrencyId, t.date);
  const rate = ratesMap.get(key);
  return rate ? price.mul(rate) : null;
}

function usdToTargetRate(usdId: number, targetId: number, now: Date, ratesMap: RatesMap): Prisma.Decimal | null {
  if (usdId === targetId) return new Prisma.Decimal(1);
  const key = buildCacheKey(usdId, targetId, now);
  return ratesMap.get(key) ?? null;
}

function coingeckoIdFor(asset: Pick<Asset, 'coingeckoId' | 'ticker'>): string | null {
  if (asset.coingeckoId) return asset.coingeckoId;
  return asset.ticker ? COINGECKO_IDS[asset.ticker] ?? null : null;
}

/** One point per UTC day ending today, all at the same price. */
function flatHistory(price: number, points: number): { date: string; value: number }[] {
  const today = new Date();
  return Array.from({ length: points }).map((_, i) => {
    const day = addUtcDays(today, i - (points - 1));
    return { date: toDateKey(day), value: price };
  });
}

async function fetchCryptoHistory(id: string, days: number = 30): Promise<{ date: string; value: number }[]> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    
    const data = await res.json();
    if (!data.prices || !Array.isArray(data.prices)) return [];

    return data.prices.map((item: [number, number]) => {
      const day = new Date(item[0]);
      return { date: toDateKey(day), value: item[1] };
    });
  } catch (error) {
    console.error(`Failed to fetch crypto history for ${id}`, error);
    return [];
  }
}

async function fetchCryptoPrices(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  const unique = Array.from(new Set(ids));
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${unique.join(',')}&vs_currencies=usd`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return {};
    const data = await res.json();
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

