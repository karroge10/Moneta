import { NextResponse, NextRequest } from 'next/server';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { db } from '@/lib/db';
import { getInvestmentsPortfolio } from '@/lib/investments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireCurrentUserWithLanguage();
    const userCurrency =
      (user.currencyId && (await db.currency.findUnique({ where: { id: user.currencyId } }))) ||
      (await db.currency.findFirst());

    if (!userCurrency) {
      return NextResponse.json({ error: 'No currency configured.' }, { status: 500 });
    }

    const payload = await getInvestmentsPortfolio(user.id, userCurrency);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error fetching investments data:', error);
    return NextResponse.json({ error: 'Failed to fetch investments data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUserWithLanguage();
    const body = await request.json();

    const {
      name,
      subtitle,
      ticker,
      assetType,
      sourceId,
      quantity = 1,
      purchasePrice,
      purchaseDate,
      icon,
    } = body || {};

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const qty = Number(quantity) > 0 ? Number(quantity) : 1;
    const purchasePriceNumber = Number(purchasePrice);
    const purchaseDateValue = purchaseDate ? new Date(purchaseDate) : null;

    let livePriceUsd: number | null = null;
    let resolvedAssetType: string | null = assetType || null;
    let resolvedIcon = icon || 'Cash';
    let resolvedTicker: string | null = ticker || null;
    let sourceType: 'live' | 'manual' = 'manual';

    if (sourceId && typeof sourceId === 'string') {
      sourceType = 'live';
      if (sourceId.startsWith('coingecko:')) {
        const coingeckoId = sourceId.replace('coingecko:', '');
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coingeckoId)}&vs_currencies=usd`,
          { cache: 'no-store' },
        );
        if (res.ok) {
          const data = await res.json();
          livePriceUsd = data?.[coingeckoId]?.usd ?? null;
        }
        resolvedAssetType = resolvedAssetType || 'crypto';
        resolvedIcon = 'BitcoinCircle';
      } else if (sourceId.startsWith('stooq:')) {
        const tickerCode = sourceId.replace('stooq:', '').toLowerCase();
        const res = await fetch(`https://stooq.pl/q/l/?s=${tickerCode}.us&f=sd2t2ohlcv&h&e=json`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const symbolData = data?.symbols?.[0];
          if (symbolData && symbolData.close !== 'N/D') {
            livePriceUsd = Number(symbolData.close);
            resolvedTicker = symbolData.symbol?.toUpperCase?.() || resolvedTicker || tickerCode.toUpperCase();
            if (symbolData.name && !subtitle) {
              // keep existing subtitle if provided
            }
          }
        }
        resolvedAssetType = resolvedAssetType || 'stock';
        resolvedIcon = 'Cash';
      }
    }

    const manualCurrentPrice = Number(body.currentPrice ?? body.currentValue ?? 0);
    const currentValue =
      livePriceUsd && Number.isFinite(livePriceUsd) ? livePriceUsd * qty : Number.isFinite(manualCurrentPrice) ? manualCurrentPrice * qty : 0;

    const purchaseValue = Number.isFinite(purchasePriceNumber) ? purchasePriceNumber * qty : null;
    const changePercent =
      purchaseValue && purchaseValue > 0 && Number.isFinite(currentValue)
        ? ((currentValue - purchaseValue) / purchaseValue) * 100
        : 0;

    const investment = await db.investment.create({
      data: {
        userId: user.id,
        name,
        subtitle: subtitle || (resolvedTicker ? `${qty} ${resolvedTicker}` : ''),
        ticker: resolvedTicker,
        assetType: resolvedAssetType,
        sourceType,
        quantity: qty,
        purchasePrice: Number.isFinite(purchasePriceNumber) ? purchasePriceNumber : null,
        purchaseDate: purchaseDateValue && !Number.isNaN(purchaseDateValue.getTime()) ? purchaseDateValue : null,
        currentValue: Number.isFinite(currentValue) ? currentValue : 0,
        changePercent: Number.isFinite(changePercent) ? changePercent : 0,
        icon: resolvedIcon || 'Cash',
      },
    });

    return NextResponse.json({ investment });
  } catch (error) {
    console.error('Error creating investment:', error);
    return NextResponse.json({ error: 'Failed to create investment' }, { status: 500 });
  }
}

