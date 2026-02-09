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
    icon: coin.thumb || 'BitcoinCircle',
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
      icon: 'Cash',
      price: close,
      ticker: normalized.toUpperCase(),
    },
  ];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() || '';

  try {
    const [crypto, stocks] = await Promise.all([
      searchCoingecko(query),
      query.length <= 6 ? tryStooqQuote(query) : Promise.resolve([]),
    ]);

    const assets = [...crypto, ...stocks];
    return NextResponse.json({ assets });
  } catch (error) {
    console.error('[investments][search] failed', error);
    return NextResponse.json({ assets: [] }, { status: 200 });
  }
}

