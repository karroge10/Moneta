import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { fetchStockQuote } from '@/lib/stock-prices';

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
  const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${query}`, {
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = await res.json();
  const coins = (data?.coins || []).slice(0, 6);
  return coins.map((coin: { id: string; name: string; symbol?: string; large?: string; thumb?: string }) => ({
    id: `coingecko:${coin.id}`,
    name: coin.name,
    symbol: coin.symbol?.toUpperCase?.() || coin.id,
    type: 'crypto',
    icon: coin.large || coin.thumb || 'BitcoinCircle',
    ticker: coin.symbol?.toUpperCase?.() || coin.id,
  }));
}

async function searchStockQuote(ticker: string): Promise<SearchResult[]> {
  const quote = await fetchStockQuote(ticker);
  if (!quote) return [];
  return [
    {
      id: `stock:${quote.ticker}`,
      name: quote.name,
      symbol: quote.ticker,
      type: 'stock',
      icon: 'Cash',
      price: quote.price,
      ticker: quote.ticker,
    },
  ];
}



const priceCache: Record<string, { price: number; timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 5; 

async function fetchCryptoPrices(ids: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  const missingIds: string[] = [];

  
  const now = Date.now();
  for (const id of ids) {
    if (priceCache[id] && (now - priceCache[id].timestamp) < CACHE_TTL) {
      result[id] = priceCache[id].price;
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length === 0) return result;

  
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
  try {
    await requireCurrentUser();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const type = searchParams.get('type'); 
    const promises = [];
    
    
    if (!type || type === 'crypto') {
      promises.push(searchCoingecko(query));
    } else {
      promises.push(Promise.resolve([]));
    }

    
    if (!type || type === 'stock') {
      promises.push(query.length <= 6 ? searchStockQuote(query) : Promise.resolve([]));
    } else {
      promises.push(Promise.resolve([]));
    }

    const [crypto, stocks] = await Promise.all(promises);

    
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

