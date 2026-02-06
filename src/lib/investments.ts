import { db } from './db';
import { convertAmount } from './currency-conversion';
import { Investment as InvestmentModel, Currency } from '@prisma/client';
import { Investment, InvestmentActivity, PerformanceDataPoint } from '@/types/dashboard';

type AssetKind = 'crypto' | 'stock' | 'property' | 'custom';

interface ParsedHolding {
  quantity: number | null;
  ticker: string | null;
}

interface EnrichedInvestment {
  source: InvestmentModel;
  kind: AssetKind;
  coingeckoId?: string;
  ticker?: string | null;
  quantity: number;
  purchasePriceUsd?: number;
  livePriceUsd?: number;
  liveChangePercent?: number;
  currentValueUsd: number;
  previousValueUsd: number;
  currentValueConverted: number;
  previousValueConverted: number;
}

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
};

function parseSubtitle(subtitle: string | null): ParsedHolding {
  if (!subtitle) return { quantity: null, ticker: null };
  const match = subtitle.match(/([\d,.]+)\s+([A-Za-z.\-]+)/);
  if (!match) return { quantity: null, ticker: null };
  const quantity = Number(match[1].replace(/,/g, ''));
  const ticker = match[2].toUpperCase();
  if (!Number.isFinite(quantity)) return { quantity: null, ticker };
  return { quantity, ticker };
}

function detectKind(icon: string | null, ticker: string | null, assetType?: string | null): AssetKind {
  if (assetType === 'property') return 'property';
  if (assetType === 'custom') return 'custom';
  if (assetType === 'crypto') return 'crypto';
  if (assetType === 'stock') return 'stock';
  if (icon === 'Neighbourhood') return 'property';
  if (icon === 'BitcoinCircle') return 'crypto';
  if (ticker && coingeckoMap[ticker]) return 'crypto';
  if (ticker) return 'stock';
  return 'custom';
}

async function fetchCryptoPrices(ids: string[]): Promise<Record<string, { usd: number; usd_24h_change?: number }>> {
  if (ids.length === 0) return {};
  const unique = Array.from(new Set(ids));
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${unique.join(',')}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    console.warn('[investments] CoinGecko request failed', res.status);
    return {};
  }
  return res.json();
}

async function fetchStooqQuote(ticker: string): Promise<{ close: number; open: number | null } | null> {
  // Stooq uses .us suffix for US tickers. Example: tsla.us
  const url = `https://stooq.pl/q/l/?s=${ticker.toLowerCase()}.us&f=sd2t2ohlcv&h&e=json`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    console.warn('[investments] Stooq request failed', res.status, ticker);
    return null;
  }
  const data = await res.json();
  const symbolData = data?.symbols?.[0];
  if (!symbolData || symbolData.close === 'N/D') return null;
  const close = Number(symbolData.close);
  const open = symbolData.open === 'N/D' ? null : Number(symbolData.open);
  if (!Number.isFinite(close)) return null;
  return { close, open: Number.isFinite(open) ? open : null };
}

function computePreviousValue(current: number, changePercent: number | undefined): number {
  if (changePercent === undefined || !Number.isFinite(changePercent) || changePercent === -100) return current;
  const delta = 1 + changePercent / 100;
  if (delta === 0) return current;
  return current / delta;
}

async function convertValue(
  amount: number,
  baseCurrency: Currency,
  targetCurrency: Currency,
  date: Date,
): Promise<number> {
  if (baseCurrency.id === targetCurrency.id) return amount;
  return convertAmount(amount, baseCurrency.id, targetCurrency.id, date);
}

export interface InvestmentPortfolioPayload {
  update: {
    date: string;
    message: string;
    highlight: string;
    link: string;
  };
  balance: {
    amount: number;
    trend: number;
  };
  portfolio: Investment[];
  performance: {
    trend: number;
    trendText: string;
    data: PerformanceDataPoint[];
  };
  recentActivities: InvestmentActivity[];
}

export async function getInvestmentsPortfolio(
  userId: number,
  targetCurrency: Currency,
): Promise<InvestmentPortfolioPayload> {
  const now = new Date();
  const usdCurrency =
    (await db.currency.findFirst({
      where: { alias: { equals: 'usd', mode: 'insensitive' } },
    })) || targetCurrency;

  const investments = await db.investment.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  if (investments.length === 0) {
    const emptyPerformance: PerformanceDataPoint[] = [{ date: 'Now', value: 0 }];
    return {
      update: {
        date: now.toDateString(),
        message: 'Add investments to see live performance.',
        highlight: '',
        link: 'Statistics',
      },
      balance: { amount: 0, trend: 0 },
      portfolio: [],
      performance: { trend: 0, trendText: '', data: emptyPerformance },
      recentActivities: [],
    };
  }

  // Prepare fetch batches
  const parsed = investments.map((inv) => {
    const { quantity, ticker } = parseSubtitle(inv.subtitle);
    const kind = detectKind(inv.icon, ticker, inv.assetType);
    const coingeckoId = ticker && coingeckoMap[ticker] ? coingeckoMap[ticker] : undefined;
    return {
      source: inv,
      quantity: Number.isFinite(inv.quantity) && inv.quantity > 0 ? inv.quantity : quantity ?? 1,
      ticker: inv.ticker || ticker,
      kind,
      coingeckoId,
    };
  });

  const cryptoIds = parsed
    .map((p) => p.coingeckoId)
    .filter((id): id is string => Boolean(id));
  const stockTickers = parsed
    .filter((p) => p.kind === 'stock' && p.ticker)
    .map((p) => p.ticker as string);

  const [cryptoPrices, stockQuotes] = await Promise.all([
    fetchCryptoPrices(cryptoIds),
    Promise.all(
      stockTickers.map(async (ticker) => {
        const quote = await fetchStooqQuote(ticker);
        return { ticker, quote };
      }),
    ),
  ]);

  const stockQuoteMap = stockQuotes.reduce<Record<string, { close: number; open: number | null }>>((acc, item) => {
    if (item.quote) {
      acc[item.ticker.toUpperCase()] = item.quote;
    }
    return acc;
  }, {});

  const enriched: EnrichedInvestment[] = await Promise.all(
    parsed.map(async (entry) => {
      const { source, quantity, kind, coingeckoId, ticker } = entry;
      let livePriceUsd: number | undefined;
      let liveChangePercent: number | undefined;

      if (kind === 'crypto' && coingeckoId && cryptoPrices[coingeckoId]) {
        livePriceUsd = cryptoPrices[coingeckoId].usd;
        liveChangePercent = cryptoPrices[coingeckoId].usd_24h_change;
      } else if (kind === 'stock' && ticker && stockQuoteMap[ticker.toUpperCase()]) {
        const quote = stockQuoteMap[ticker.toUpperCase()];
        livePriceUsd = quote.close;
        if (quote.open && quote.open > 0) {
          liveChangePercent = ((quote.close - quote.open) / quote.open) * 100;
        }
      }

      const purchasePriceRaw = source.purchasePrice || 0;
      const purchasePriceUsd = (purchasePriceRaw > 0 && source.purchaseCurrencyId)
        ? await convertAmount(purchasePriceRaw, source.purchaseCurrencyId, usdCurrency.id, source.purchaseDate || source.createdAt)
        : purchasePriceRaw;

      const baseCurrentValueUsd =
        livePriceUsd && Number.isFinite(livePriceUsd) && source.sourceType !== 'manual'
          ? livePriceUsd * quantity
          : source.currentValue;

      const derivedChangePercent =
        purchasePriceUsd && purchasePriceUsd > 0
          ? ((baseCurrentValueUsd / (purchasePriceUsd * quantity) - 1) * 100)
          : undefined;

      const baseChangePercent = Number.isFinite(derivedChangePercent)
        ? derivedChangePercent
        : Number.isFinite(liveChangePercent)
          ? liveChangePercent
          : source.changePercent;

      const prevValueUsd =
        purchasePriceUsd > 0
          ? purchasePriceUsd * quantity
          : computePreviousValue(baseCurrentValueUsd, baseChangePercent);

      const [currentValueConverted, previousValueConverted] = await Promise.all([
        convertValue(baseCurrentValueUsd, usdCurrency, targetCurrency, now),
        convertValue(prevValueUsd, usdCurrency, targetCurrency, now),
      ]);

      return {
        source,
        kind,
        coingeckoId,
        ticker,
        quantity,
        purchasePriceUsd,
        livePriceUsd,
        liveChangePercent: baseChangePercent,
        currentValueUsd: baseCurrentValueUsd,
        previousValueUsd: prevValueUsd,
        currentValueConverted,
        previousValueConverted,
      };
    }),
  );

  const totalCurrent = enriched.reduce((sum, inv) => sum + inv.currentValueConverted, 0);
  const totalPrevious = enriched.reduce((sum, inv) => sum + inv.previousValueConverted, 0);
  const portfolioTrend =
    totalPrevious > 0 ? Math.round(((totalCurrent - totalPrevious) / totalPrevious) * 100 * 100) / 100 : 0;
  const delta = totalCurrent - totalPrevious;

  // Fetch overall portfolio history for performance graph
  const invIds = investments.map(i => i.id);
  const rawHistory = await db.investmentPriceHistory.findMany({
    where: { investmentId: { in: invIds } },
    orderBy: { priceDate: 'asc' },
  });

  // Calculate overall performance history range
  const earliestInvestment = await db.investment.findFirst({
    where: { userId },
    orderBy: { purchaseDate: 'asc' },
  });
  const earliestDate = earliestInvestment?.purchaseDate || earliestInvestment?.createdAt || now;
  const totalDays = Math.ceil((now.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysToTrack = Math.max(30, totalDays);
  const startDate = new Date(now.getTime() - daysToTrack * 24 * 60 * 60 * 1000);

  // Generate daily portfolio values
  const performance: PerformanceDataPoint[] = [];

  for (let i = 0; i <= daysToTrack; i++) {
    // If tracking more than 60 days, only sample every few days to avoid huge response
    if (daysToTrack > 60 && i % Math.ceil(daysToTrack / 30) !== 0 && i !== daysToTrack) continue;

    const checkDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = checkDate.toISOString().split('T')[0];
    let dailyTotalUsd = 0;

    for (const inv of enriched) {
      const pDate = inv.source.purchaseDate ? new Date(inv.source.purchaseDate) : inv.source.createdAt;
      if (checkDate < pDate) continue; // Not owned yet

      // Find closest price on or before this date
      const closestHistory = rawHistory
        .filter(h => h.investmentId === inv.source.id && h.priceDate <= checkDate)
        .pop();

      let price = closestHistory ? Number(closestHistory.price) : (inv.source.purchasePrice ? Number(inv.source.purchasePrice) : 0);

      // Normalize price to USD if it's from purchasePrice (fallback) and not in USD
      if (!closestHistory && inv.source.purchasePrice && inv.source.purchaseCurrencyId && inv.source.purchaseCurrencyId !== usdCurrency.id) {
        price = await convertAmount(price, inv.source.purchaseCurrencyId, usdCurrency.id, pDate);
      }

      dailyTotalUsd += price * Number(inv.source.quantity);
    }

    if (dailyTotalUsd > 0 || performance.length > 0) {
      performance.push({
        date: checkDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: daysToTrack > 365 ? 'numeric' : undefined }),
        value: Number(dailyTotalUsd.toFixed(2)),
      });
    }
  }

  // Fallback if still empty
  if (performance.length < 2) {
    performance.push({ date: 'Previous', value: Number(totalPrevious.toFixed(2)) });
    performance.push({ date: 'Now', value: Number(totalCurrent.toFixed(2)) });
  }

  const portfolio: Investment[] = await Promise.all(enriched.map(async (inv) => {
    // Fetch and sample history for each asset
    const assetHistory = await getInvestmentPriceHistory(inv.source.id, 20);

    return {
      id: inv.source.id.toString(),
      name: inv.source.name,
      subtitle: inv.source.subtitle || inv.ticker || '',
      ticker: inv.ticker,
      assetType: (inv.source.assetType as any) || undefined,
      sourceType: (inv.source.sourceType as any) || undefined,
      quantity: inv.source.quantity,
      purchasePrice: inv.source.purchasePrice ?? undefined,
      purchaseDate: inv.source.purchaseDate ? inv.source.purchaseDate.toISOString() : undefined,
      purchaseCurrencyId: inv.source.purchaseCurrencyId ?? undefined,
      currentValue: Number(inv.currentValueConverted.toFixed(2)),
      changePercent: Number(inv.liveChangePercent?.toFixed(2) ?? inv.source.changePercent),
      icon: inv.source.icon,
      priceHistory: assetHistory,
    };
  }));

  const updateHighlight = portfolioTrend !== 0 ? `${portfolioTrend > 0 ? '+' : ''}${portfolioTrend}%` : '';

  // Helper for better date formatting
  const formatActivityDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Deriving recent activities from history and creation
  const historyActivities: InvestmentActivity[] = rawHistory
    .slice(-8)
    .reverse()
    .map((h, idx) => {
      const inv = enriched.find((i: any) => i.source.id === h.investmentId);
      const isPositive = Number(h.price) >= (inv?.source.purchasePrice || 0);

      return {
        id: `price-${h.id}-${idx}`,
        assetName: inv?.source.name || 'Asset',
        date: formatActivityDate(h.priceDate),
        change: `${Number(h.price).toLocaleString()} USD`,
        changeType: isPositive ? 'positive' : 'negative',
        icon: inv?.source.icon || 'Cash',
      };
    });

  const creationActivities: InvestmentActivity[] = investments
    .slice(-8)
    .reverse()
    .map((inv, idx) => ({
      id: `add-${inv.id}-${idx}`,
      assetName: inv.name,
      date: formatActivityDate(inv.createdAt),
      change: `+${inv.quantity} ${inv.ticker || ''}`,
      changeType: 'positive',
      icon: inv.icon,
    }));

  const recentActivities = [...historyActivities, ...creationActivities]
    .sort((a, b) => {
      // Need to parse the custom date format for sorting if we mixed them, 
      // but they were already sorted by date before formatting in the original code.
      // Let's re-sort properly using the original objects if possible, 
      // but here we just slice and combine.
      return 0; // Keeping original order logic as much as possible but combining
    });

  // Re-sort combined list correctly
  const sortedActivities = [...recentActivities]
    .sort((a, b) => {
      // Extract original dates for sorting
      const dateA = a.id.startsWith('price-')
        ? rawHistory.find(h => `price-${h.id}` === a.id.split('-').slice(0, 2).join('-'))?.priceDate
        : investments.find(inv => `add-${inv.id}` === a.id.split('-').slice(0, 2).join('-'))?.createdAt;
      const dateB = b.id.startsWith('price-')
        ? rawHistory.find(h => `price-${h.id}` === b.id.split('-').slice(0, 2).join('-'))?.priceDate
        : investments.find(inv => `add-${inv.id}` === b.id.split('-').slice(0, 2).join('-'))?.createdAt;

      return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
    })
    .slice(0, 10);

  return {
    update: {
      date: now.toDateString(),
      message:
        portfolioTrend !== 0
          ? `Your portfolio moved ${updateHighlight} over the latest refresh window`
          : 'Your portfolio is stable since last refresh',
      highlight: updateHighlight,
      link: 'Statistics',
    },
    balance: {
      amount: Number(totalCurrent.toFixed(2)),
      trend: Math.round(portfolioTrend),
    },
    portfolio,
    performance: {
      trend: Math.round(portfolioTrend * 100) / 100,
      trendText: `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`,
      data: performance,
    },
    recentActivities: sortedActivities,
  };
}

/**
 * Records a single price point for an investment
 */
export async function recordInvestmentPrice(
  investmentId: number,
  price: number,
  source: 'live' | 'manual' | 'auto',
  date: Date = new Date(),
) {
  return db.investmentPriceHistory.create({
    data: {
      investmentId,
      price,
      source,
      priceDate: date,
    },
  });
}

/**
 * Refreshes all live investment prices and checks for notifications
 */
export async function refreshInvestmentPrices() {
  const liveInvestments = await db.investment.findMany({
    where: { sourceType: 'live' },
  });

  const now = new Date();

  // Group by crypto/stock for batching
  const crypto = liveInvestments.filter(i => i.assetType === 'crypto' && i.ticker);
  const stocks = liveInvestments.filter(i => i.assetType === 'stock' && i.ticker);

  // Fetch prices (simplified batching for now)
  const results = await Promise.all([
    ...crypto.map(async i => {
      const id = coingeckoMap[i.ticker!.toUpperCase()] || i.ticker!.toLowerCase();
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
      if (!res.ok) return null;
      const data = await res.json();
      const price = data?.[id]?.usd;
      return price ? { id: i.id, price, assetType: 'crypto' } : null;
    }),
    ...stocks.map(async i => {
      const res = await fetch(`https://stooq.pl/q/l/?s=${i.ticker!.toLowerCase()}.us&f=sd2t2ohlcv&h&e=json`);
      if (!res.ok) return null;
      const data = await res.json();
      const price = Number(data?.symbols?.[0]?.close);
      return price && Number.isFinite(price) ? { id: i.id, price, assetType: 'stock' } : null;
    })
  ]);

  const updates = results.filter((r): r is { id: number; price: number; assetType: string } => r !== null);

  for (const update of updates) {
    const inv = liveInvestments.find(i => i.id === update.id);
    if (!inv) continue;

    const qty = Number(inv.quantity);
    const currentValue = update.price * qty;
    const purchaseValue = inv.purchasePrice ? Number(inv.purchasePrice) * qty : null;
    const changePercent = purchaseValue ? ((currentValue - purchaseValue) / purchaseValue) * 100 : 0;

    // Update investment
    await db.investment.update({
      where: { id: inv.id },
      data: {
        currentValue,
        changePercent,
      },
    });

    // Record history
    await recordInvestmentPrice(inv.id, update.price, 'auto', now);

    // Check for milestone (growth > 10%)
    if (changePercent >= 10 && (inv.changePercent || 0) < 10) {
      await db.notification.create({
        data: {
          userId: inv.userId,
          type: 'Investments',
          text: `Milestone: Your investment in ${inv.name} has grown by over 10%!`,
          date: now,
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        }
      });
    }
  }

  // Check for stale manual assets (not updated in 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const staleAssets = await db.investment.findMany({
    where: {
      sourceType: 'manual',
      OR: [
        { lastPriceUpdateDate: { lt: sevenDaysAgo } },
        { lastPriceUpdateDate: null }
      ]
    }
  });

  for (const asset of staleAssets) {
    // Check if we already notified recently? (Simplified: just one notification)
    const existing = await db.notification.findFirst({
      where: {
        userId: asset.userId,
        type: 'Investments',
        text: { contains: asset.name },
        createdAt: { gt: sevenDaysAgo }
      }
    });

    if (!existing) {
      await db.notification.create({
        data: {
          userId: asset.userId,
          type: 'Investments',
          text: `Update Price: It's been over a week since you updated the price for ${asset.name}. Keep your portfolio accurate!`,
          date: now,
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        }
      });
    }
  }

  return updates.length;
}

/**
 * Fetches and samples price history for an investment to ensure consistent graph points
 */
export async function getInvestmentPriceHistory(investmentId: number, maxPoints: number = 25) {
  const history = await db.investmentPriceHistory.findMany({
    where: { investmentId },
    orderBy: { priceDate: 'asc' },
  });

  if (history.length <= maxPoints) {
    return history.map((h) => ({
      date: h.priceDate.toISOString(),
      price: Number(h.price),
    }));
  }

  // Simple sampling: pick every Nth point to get roughly maxPoints
  const step = Math.ceil(history.length / maxPoints);
  const sampled = [];
  for (let i = 0; i < history.length; i += step) {
    sampled.push(history[i]);
  }

  // Ensure the latest point is always included
  if (sampled[sampled.length - 1].id !== history[history.length - 1].id) {
    sampled[sampled.length - 1] = history[history.length - 1];
  }

  return sampled.map((h) => ({
    date: h.priceDate.toISOString(),
    price: Number(h.price),
  }));
}

/**
 * Fetches retroactive historical prices from external APIs
 */
export async function fetchHistoricalPricesForAsset(
  ticker: string,
  assetType: 'crypto' | 'stock',
  startDate: Date,
): Promise<{ date: Date; price: number }[]> {
  const now = new Date();
  const daysDiff = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff <= 0) return [];

  if (assetType === 'crypto') {
    const cgId = coingeckoMap[ticker.toUpperCase()] || ticker.toLowerCase();
    const url = `https://api.coingecko.com/api/v3/coins/${cgId}/market_chart?vs_currency=usd&days=${daysDiff}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      console.warn('[investments] CoinGecko historical fetch failed', cgId);
      return [];
    }

    const data = await res.json();
    // CoinGecko returns [timestamp, price] pairs
    return (data.prices || []).map((p: [number, number]) => ({
      date: new Date(p[0]),
      price: p[1],
    }));
  } else if (assetType === 'stock') {
    // Stooq historical format: s=ticker.us&d1=YYYYMMDD&d2=YYYYMMDD&i=d
    const d1 = startDate.toISOString().split('T')[0].replace(/-/g, '');
    const d2 = now.toISOString().split('T')[0].replace(/-/g, '');
    const url = `https://stooq.pl/q/d/l/?s=${ticker.toLowerCase()}.us&d1=${d1}&d2=${d2}&i=d&f=sd2ohlcv&h&e=json`;

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn('[investments] Stooq historical fetch failed', ticker);
      return [];
    }

    const data = await res.json();
    if (!data.symbols?.[0]?.data) return [];

    return data.symbols[0].data.map((row: any) => ({
      date: new Date(row.date),
      price: Number(row.close),
    }));
  }

  return [];
}

