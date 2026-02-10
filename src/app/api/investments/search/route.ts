import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AssetType = 'crypto' | 'stock';

interface SearchResult {
  id: string;
  name: string;
  symbol: string;
  type: AssetType;
  icon: string;
  price?: number;
  ticker?: string;
}

async function searchCoingecko(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];
  const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`, {
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = await res.json();
  const coins = (data?.coins || []).slice(0, 6);
  return coins.map((coin: any) => ({
    id: `coingecko:${coin.id}`,
    name: coin.name,
    symbol: coin.symbol?.toUpperCase?.() || coin.id,
    type: 'crypto',
    icon: coin.large || coin.thumb || 'BitcoinCircle',
    ticker: coin.symbol?.toUpperCase?.() || coin.id,
  }));
}

async function tryStooqQuote(ticker: string): Promise<SearchResult[]> {
  if (!ticker) return [];
  const normalized = ticker.toLowerCase();
  const res = await fetch(`https://stooq.pl/q/l/?s=${normalized}.us&f=sd2t2ohlcv&h&e=json`, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  const symbolData = data?.symbols?.[0];
  if (!symbolData || symbolData.close === 'N/D') return [];
  const close = Number(symbolData.close);
  if (!Number.isFinite(close)) return [];
  return [
    {
      id: `stooq:${normalized.toUpperCase()}`,
      name: symbolData.name || normalized.toUpperCase(),
      symbol: normalized.toUpperCase(),
      type: 'stock',
      icon: `https://images.financialmodelingprep.com/symbol/${normalized.toUpperCase()}.png`,
      price: close,
      ticker: normalized.toUpperCase(),
    },
  ];
}

// Simple in-memory cache for crypto prices to avoid rate limits
// Only persists while the dev server is running
const priceCache: Record<string, { price: number; timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

async function fetchCryptoPrices(ids: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  const missingIds: string[] = [];

  // 1. Check Cache
  const now = Date.now();
  for (const id of ids) {
    if (priceCache[id] && (now - priceCache[id].timestamp) < CACHE_TTL) {
      result[id] = priceCache[id].price;
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length === 0) return result;

  // 2. Fetch missing from CoinGecko with a single retry
  const fetchWithRetry = async (attempt: number = 1): Promise<void> => {
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${missingIds.join(',')}&vs_currencies=usd`, {
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        for (const id of missingIds) {
          if (data[id]?.usd !== undefined) {
            const price = data[id].usd;
            result[id] = price;
            priceCache[id] = { price, timestamp: now };
          }
        }
      } else if (res.status === 429 && attempt < 2) {
        // Wait 1.5s and retry once on rate limit
        await new Promise(r => setTimeout(r, 1500));
        return fetchWithRetry(attempt + 1);
      } else {
        console.warn(`[investments][search] crypto price API returned ${res.status}`);
      }
    } catch (err) {
      console.error('[investments][search] crypto price fetch failed', err);
    }
  };

  await fetchWithRetry();
  return result;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() || '';
  const type = searchParams.get('type'); // 'crypto' | 'stock' | null

  try {
    const promises = [];
    
    // Only search crypto if no type specified or type is crypto
    if (!type || type === 'crypto') {
      promises.push(searchCoingecko(query));
    } else {
      promises.push(Promise.resolve([]));
    }

    // Only search stocks if no type specified or type is stock
    if (!type || type === 'stock') {
      promises.push(query.length <= 6 ? tryStooqQuote(query) : Promise.resolve([]));
    } else {
      promises.push(Promise.resolve([]));
    }

    const [crypto, stocks] = await Promise.all(promises);

    // Fetch prices for crypto assets if any were found
    let cryptoWithPrices = crypto;
    if (crypto.length > 0) {
      const ids = crypto.map(c => c.id.replace('coingecko:', ''));
      const priceData = await fetchCryptoPrices(ids);
      
      cryptoWithPrices = crypto.map(c => {
        const coinId = c.id.replace('coingecko:', '');
        return {
          ...c,
          price: priceData[coinId]
        };
      });
    }

    const assets = [...cryptoWithPrices, ...stocks];
    return NextResponse.json({ assets });
  } catch (error) {
    console.error('[investments][search] failed', error);
    return NextResponse.json({ assets: [] }, { status: 200 });
  }
}

