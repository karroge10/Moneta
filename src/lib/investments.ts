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

async function fetchStockPrices(tickers: string[]): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};
  const unique = Array.from(new Set(tickers));
  const symbols = unique.map(t => `${t.toLowerCase()}.us`).join('+');
  const url = `https://stooq.pl/q/l/?s=${symbols}&f=sd2t2ohlcv&h&e=json`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return {};
    const data = await res.json();
    const prices: Record<string, number> = {};
    if (data?.symbols) {
      for (const s of data.symbols) {
        if (s.close !== 'N/D') {
          const ticker = s.symbol.split('.')[0].toUpperCase();
          prices[ticker] = Number(s.close);
        }
      }
    }
    return prices;
  } catch (e) {
    console.error('Failed to fetch stock prices', e);
    return {};
  }
}

export async function getInvestmentsPortfolio(userId: number, targetCurrency: Currency): Promise<PortfolioSummary> {
  console.log('[investments] Getting portfolio for user', userId, 'target', targetCurrency.alias);

  // Resolve USD currency ID for live price conversion
  const usd = await db.currency.findFirst({ where: { alias: { equals: 'usd', mode: 'insensitive' } } });

  // 1. Fetch all investment transactions
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
  const cryptoIds: string[] = [];
  const stockTickers: string[] = [];

  for (const item of assetMap.values()) {
    if (item.asset?.pricingMode === 'live') {
      if (item.asset.assetType === 'crypto') {
        const id = item.asset.coingeckoId || coingeckoMap[item.asset.ticker];
        if (id) cryptoIds.push(id);
      } else if (item.asset.assetType === 'stock') {
        stockTickers.push(item.asset.ticker);
      }
    }
  }

  const [cryptoPrices, stockPrices] = await Promise.all([
    fetchCryptoPrices(cryptoIds),
    fetchStockPrices(stockTickers)
  ]);

  const portfolioAssets: PortfolioAsset[] = [];
  let globalTotalValue = 0;
  let globalTotalCost = 0;

  // 4. Aggregation Logic
  for (const [assetId, { asset, txs }] of assetMap) {
    if (!asset) continue;

    let quantity = 0;
    let totalCost = 0;
    let lastPrice = 0;

    for (const t of txs) {
      const qty = Number(t.quantity);
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
          const ratio = qty / quantity;
          totalCost -= totalCost * ratio;
        }
        quantity -= qty;
        lastPrice = pricePerUnit;
      }
    }

    if (quantity < 0.00000001) quantity = 0;

    let avgPrice = quantity > 0 ? totalCost / quantity : 0;

    // Determine Current Price
    let currentPrice = lastPrice;
    let isLivePriceInUSD = false;

    if (asset.pricingMode === 'live') {
      if (asset.assetType === 'crypto') {
        const id = asset.coingeckoId || coingeckoMap[asset.ticker];
        if (id && cryptoPrices[id]) {
          currentPrice = cryptoPrices[id];
          isLivePriceInUSD = true;
        }
      } else if (asset.assetType === 'stock') {
        if (stockPrices[asset.ticker]) {
          currentPrice = stockPrices[asset.ticker];
          isLivePriceInUSD = true;
        }
      }
    }

    // Convert Live USD price to Target Currency immediately if needed
    if (isLivePriceInUSD && usd && targetCurrency.id !== usd.id) {
      currentPrice = await convertAmount(currentPrice, usd.id, targetCurrency.id, new Date());
    }

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
      icon: asset.assetType === 'crypto' ? 'BitcoinCircle' : asset.assetType === 'stock' ? 'Cash' : asset.assetType === 'property' ? 'Neighbourhood' : 'Reports',
    });

    globalTotalValue += currentValue;
    globalTotalCost += totalCost;
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
