import { AssetType } from '@prisma/client';

export interface HistoryDataPoint {
  date: string; 
  price: number;
}

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
const YAHOO_FINANCE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';


const RANGE_MAP: Record<string, { cg: string; yf: string; yfInterval: string }> = {
  '1W': { cg: '7', yf: '5d', yfInterval: '1d' }, 
  '1M': { cg: '30', yf: '1mo', yfInterval: '1d' },
  '3M': { cg: '90', yf: '3mo', yfInterval: '1d' },
  '1Y': { cg: '365', yf: '1y', yfInterval: '1wk' },
  'All': { cg: 'max', yf: 'max', yfInterval: '1mo' },
};

export async function fetchAssetHistory(
  ticker: string,
  assetType: AssetType,
  coingeckoId?: string | null,
  range: string = '1M'
): Promise<HistoryDataPoint[]> {
  const rangeConfig = RANGE_MAP[range] || RANGE_MAP['1M'];

  if (assetType === 'crypto') {
    const cgHistory = await fetchCryptoHistory(coingeckoId || ticker, rangeConfig.cg);
    if (cgHistory.length > 0) return cgHistory;
    
    
    const yahooTicker = ticker.toUpperCase().endsWith('-USD') ? ticker : `${ticker}-USD`;
    console.log(`[history] Falling back to Yahoo Finance for crypto ticker: ${yahooTicker}`);
    return fetchStockHistory(yahooTicker, rangeConfig.yf, rangeConfig.yfInterval);
  } else if (assetType === 'stock') {
    return fetchStockHistory(ticker, rangeConfig.yf, rangeConfig.yfInterval);
  }

  return [];
}

async function fetchCryptoHistory(id: string, days: string): Promise<HistoryDataPoint[]> {
  try {
    
    
    
    const cleanId = id.toLowerCase(); 
    
    const url = `${COINGECKO_API_URL}/coins/${cleanId}/market_chart?vs_currency=usd&days=${days}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        console.warn(`[history] CoinGecko restricted range/unauthorized for ${cleanId} (${days} days). This is likely the 365-day public API limit.`);
      } else {
        console.warn(`[history] Failed to fetch crypto history for ${cleanId}: ${res.status} ${res.statusText}`);
      }
      return [];
    }

    const data = await res.json();
    if (!data.prices || !Array.isArray(data.prices)) return [];

    
    const dailyMap = new Map<string, number>();
    data.prices.forEach((item: [number, number]) => {
      const dateKey = new Date(item[0]).toISOString().split('T')[0];
      dailyMap.set(dateKey, item[1]);
    });

    return Array.from(dailyMap.entries()).map(([date, price]) => ({
      date,
      price
    })).sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error fetching crypto history:', error);
    return [];
  }
}

async function fetchStockHistory(ticker: string, range: string, interval: string): Promise<HistoryDataPoint[]> {
  try {
    const symbol = ticker.toUpperCase();
    const url = `${YAHOO_FINANCE_URL}/${symbol}?range=${range}&interval=${interval}`;
    
    
    const res = await fetch(url, { 
      next: { revalidate: 3600 },
      headers: {
        'User-Agent': 'Mozilla/5.0' 
      }
    });

    if (!res.ok) {
       
       
       console.warn(`Failed to fetch stock history for ${symbol}: ${res.statusText}`);
       return [];
    }

    const data = await res.json();
    const result = data.chart?.result?.[0];
    
    if (!result) return [];

    const timestamps = result.timestamp;
    const prices = result.indicators.quote[0].close;

    if (!timestamps || !prices) return [];

    const history: HistoryDataPoint[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      if (prices[i] !== null && prices[i] !== undefined) {
        history.push({
          date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
          price: prices[i]
        });
      }
    }

    return history;
  } catch (error) {
    console.error('Error fetching stock history:', error);
    return [];
  }
}
