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

      const purchasePriceBase = source.purchasePrice || undefined;

      const baseCurrentValueUsd =
        livePriceUsd && Number.isFinite(livePriceUsd) && source.sourceType !== 'manual'
          ? livePriceUsd * quantity
          : source.currentValue;

      const derivedChangePercent =
        purchasePriceBase && purchasePriceBase > 0
          ? ((baseCurrentValueUsd / (purchasePriceBase * quantity) - 1) * 100)
          : undefined;

      const baseChangePercent = Number.isFinite(derivedChangePercent)
        ? derivedChangePercent
        : Number.isFinite(liveChangePercent)
          ? liveChangePercent
          : source.changePercent;

      const prevValueUsd =
        purchasePriceBase && purchasePriceBase > 0
          ? purchasePriceBase * quantity
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
        purchasePriceUsd: purchasePriceBase ?? undefined,
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

  const performance: PerformanceDataPoint[] = [
    { date: 'Previous', value: Number(totalPrevious.toFixed(2)) },
    { date: 'Now', value: Number(totalCurrent.toFixed(2)) },
  ];

  const portfolio: Investment[] = enriched.map((inv) => ({
    id: inv.source.id.toString(),
    name: inv.source.name,
    subtitle: inv.source.subtitle || inv.ticker || '',
    ticker: inv.ticker,
    assetType: (inv.source.assetType as any) || undefined,
    sourceType: (inv.source.sourceType as any) || undefined,
    quantity: inv.source.quantity,
    purchasePrice: inv.source.purchasePrice ?? undefined,
    purchaseDate: inv.source.purchaseDate ? inv.source.purchaseDate.toISOString() : undefined,
    currentValue: Number(inv.currentValueConverted.toFixed(2)),
    changePercent: Number(inv.liveChangePercent?.toFixed(2) ?? inv.source.changePercent),
    icon: inv.source.icon,
  }));

  const updateHighlight = portfolioTrend !== 0 ? `${portfolioTrend > 0 ? '+' : ''}${portfolioTrend}%` : '';

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
    recentActivities: [],
  };
}

