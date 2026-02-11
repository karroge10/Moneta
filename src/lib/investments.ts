import { db } from './db';
import { Currency, InvestmentType, AssetType, PricingMode } from '@prisma/client';
import { convertAmount } from './currency-conversion';

export interface PortfolioAsset {
  assetId: number;
  name: string;
  ticker: string;
  type: AssetType;
  quantity: number;
  avgPrice: number; // Average buy price of REMAINING holdings (FIFO basis)
  currentPrice: number;
  currentValue: number;
  totalCost: number; // Cost of remaining quantity
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  realizedPnl: number; // Profit/Loss from items already sold
  pnl: number; // Total PnL (Realized + Unrealized)
  pricingMode: PricingMode;
  icon?: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalUnrealizedPnl: number;
  totalRealizedPnl: number;
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
      } else if (item.asset.assetType === 'stock' && item.asset.ticker) {
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
  let globalTotalRealizedPnl = 0;

  // 4. Aggregation Logic
  for (const [assetId, { asset, txs }] of assetMap) {
    if (!asset) continue;

    // FIFO Lots tracking
    let buyLots: { qty: number; costPerUnit: number }[] = [];
    let realizedPnl = 0;
    let lastPrice = 0;

    for (const t of txs) {
      const qty = Number(t.quantity);
      let pricePerUnit = Number(t.pricePerUnit);
      if (t.currencyId !== targetCurrency.id) {
        pricePerUnit = await convertAmount(pricePerUnit, t.currencyId, targetCurrency.id, t.date);
      }
      lastPrice = pricePerUnit;

      if (t.investmentType === 'buy') {
        buyLots.push({ qty, costPerUnit: pricePerUnit });
      } else if (t.investmentType === 'sell') {
        let remainingToSell = qty;
        while (remainingToSell > 0 && buyLots.length > 0) {
          const lot = buyLots[0];
          const sellQty = Math.min(remainingToSell, lot.qty);
          
          // Calculate gain for this portion of the sell
          const gain = sellQty * (pricePerUnit - lot.costPerUnit);
          realizedPnl += gain;

          lot.qty -= sellQty;
          remainingToSell -= sellQty;
          if (lot.qty <= 0.00000001) { // Use a small epsilon for float comparison
            buyLots.shift();
          }
        }
      }
    }

    const remainingQty = buyLots.reduce((sum, l) => sum + l.qty, 0);
    const remainingCost = buyLots.reduce((sum, l) => sum + (l.qty * l.costPerUnit), 0);
    const avgPrice = remainingQty > 0 ? remainingCost / remainingQty : 0;

    // Determine Current Price
    let currentPrice = lastPrice;
    let isLivePriceInUSD = false;

    if (asset.pricingMode === 'live') {
      if (asset.assetType === 'crypto') {
        const id = asset.coingeckoId || (asset.ticker ? coingeckoMap[asset.ticker] : null);
        if (id && cryptoPrices[id]) {
          currentPrice = cryptoPrices[id];
          isLivePriceInUSD = true;
        }
      } else if (asset.assetType === 'stock' && asset.ticker) {
        if (stockPrices[asset.ticker]) {
          currentPrice = stockPrices[asset.ticker];
          isLivePriceInUSD = true;
        }
      }
    } else if (asset.pricingMode === 'manual' && asset.manualPrice) {
      currentPrice = Number(asset.manualPrice);
    }

    // Convert Live USD price to Target Currency immediately if needed
    if (isLivePriceInUSD && usd && targetCurrency.id !== usd.id) {
      currentPrice = await convertAmount(currentPrice, usd.id, targetCurrency.id, new Date());
    }

    const currentValue = remainingQty * currentPrice;
    const unrealizedPnl = currentValue - remainingCost;
    const unrealizedPnlPercent = remainingCost > 0 ? (unrealizedPnl / remainingCost) * 100 : 0;
    const totalPnl = realizedPnl + unrealizedPnl;

    let derivedIcon = asset.assetType === 'crypto' ? 'BitcoinCircle' : asset.assetType === 'stock' ? 'Cash' : asset.assetType === 'property' ? 'Neighbourhood' : 'Reports';
    if (asset.pricingMode === 'live') {
      if (asset.assetType === 'stock' && asset.ticker) {
        derivedIcon = `https://images.financialmodelingprep.com/symbol/${asset.ticker.toUpperCase()}.png`;
      } else if (asset.assetType === 'crypto' && asset.ticker) {
        // Use a reliable crypto icon CDN as fallback for live assets
        // We use the ticker-based URL which is fairly standard
        derivedIcon = `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${asset.ticker.toLowerCase()}.png`;
      }
    }

    portfolioAssets.push({
      assetId: asset.id,
      name: asset.name,
      ticker: asset.ticker,
      type: asset.assetType,
      quantity: remainingQty,
      avgPrice,
      currentPrice,
      currentValue,
      totalCost: remainingCost,
      unrealizedPnl,
      unrealizedPnlPercent,
      realizedPnl,
      pnl: totalPnl,
      pricingMode: asset.pricingMode,
      icon: asset.icon || derivedIcon,
    });

    globalTotalValue += currentValue;
    globalTotalCost += remainingCost;
    globalTotalRealizedPnl += realizedPnl;
  }

  const globalUnrealizedPnl = globalTotalValue - globalTotalCost;
  const globalTotalPnl = globalTotalRealizedPnl + globalUnrealizedPnl;
  const globalPnlPercent = globalTotalCost > 0 ? (globalTotalPnl / globalTotalCost) * 100 : 0;

  return {
    totalValue: globalTotalValue,
    totalCost: globalTotalCost,
    totalUnrealizedPnl: globalUnrealizedPnl,
    totalRealizedPnl: globalTotalRealizedPnl,
    totalPnl: globalTotalPnl,
    pnlPercent: globalPnlPercent,
    assets: portfolioAssets
  };
}

async function fetchCryptoHistory(id: string, days: number = 30): Promise<{ date: string; value: number }[]> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    
    const data = await res.json();
    if (!data.prices || !Array.isArray(data.prices)) return [];

    return data.prices.map((item: [number, number]) => ({
      date: new Date(item[0]).toISOString().split('T')[0],
      value: item[1]
    }));
  } catch (error) {
    console.error(`Failed to fetch crypto history for ${id}`, error);
    return [];
  }
}

export async function getInvestmentPriceHistory(assetId: number, maxPoints: number = 30): Promise<{ date: string; value: number }[]> {
  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) return [];

  // 1. Manual assets -> Flat line
  if (asset.pricingMode === 'manual') {
    const price = Number(asset.manualPrice || 0);
    return Array.from({ length: maxPoints }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (maxPoints - 1 - i));
      return {
        date: d.toISOString().split('T')[0],
        value: price
      };
    });
  }

  // 2. Crypto
  if (asset.assetType === 'crypto') {
    const cgId = asset.coingeckoId || (asset.ticker ? coingeckoMap[asset.ticker] : null);
    if (cgId) {
      const history = await fetchCryptoHistory(cgId, maxPoints);
      if (history.length > 0) {
          return history.slice(-maxPoints);
      }
    }
  }

  // 3. Stocks/Others -> Live Price Flat Line (fallback)
  let currentPrice = 0;
  if (asset.assetType === 'stock' && asset.ticker) {
    // Reuse existing fetcher for single item
    try {
        const prices = await fetchStockPrices([asset.ticker]);
        currentPrice = prices[asset.ticker] || 0;
    } catch (e) {
        console.error('Failed to fetch stock price for history', e);
    }
  }
  
  return Array.from({ length: maxPoints }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (maxPoints - 1 - i));
      return {
        date: d.toISOString().split('T')[0],
        value: currentPrice
      };
    });
}

/**
 * Calculates current quantity of an asset owned by a user
 */
export async function getAssetHolding(userId: number, assetId: number): Promise<number> {
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

  let totalQuantity = 0;
  for (const t of transactions) {
    const qty = Number(t.quantity || 0);
    if (t.investmentType === 'buy') {
      totalQuantity += qty;
    } else if (t.investmentType === 'sell') {
      totalQuantity -= qty;
    }
  }

  return totalQuantity;
}
