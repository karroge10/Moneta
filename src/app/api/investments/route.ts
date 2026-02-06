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
    const { convertAmount } = await import('@/lib/currency-conversion');

    const {
      name,
      subtitle,
      ticker,
      assetType,
      sourceId,
      quantity = 1,
      purchasePrice,
      purchaseDate,
      purchaseCurrencyId,
      currentPriceCurrencyId, // New field from form
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

    if (sourceId && typeof sourceId === 'string' && sourceId !== 'custom' && sourceId !== 'property') {
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
          }
        }
        resolvedAssetType = resolvedAssetType || 'stock';
        resolvedIcon = 'Cash';
      }
    }

    let manualCurrentPrice = Number(body.currentPrice ?? body.currentValue ?? 0);

    // Normalize manual current price to USD if it's not already in USD
    const usdCurrency = await db.currency.findFirst({ where: { alias: 'USD' } });
    const incomingCurrencyId = currentPriceCurrencyId ? Number(currentPriceCurrencyId) : user.currencyId;

    if (sourceType === 'manual' && manualCurrentPrice > 0 && usdCurrency && incomingCurrencyId && incomingCurrencyId !== usdCurrency.id) {
      manualCurrentPrice = await convertAmount(manualCurrentPrice, incomingCurrencyId, usdCurrency.id);
    }

    const normalizedTicker = resolvedTicker?.trim().toUpperCase() || null;

    // De-duplication: match by normalized ticker
    let existingInvestment = null;
    if (normalizedTicker) {
      existingInvestment = await db.investment.findFirst({
        where: {
          userId: user.id,
          ticker: { equals: normalizedTicker, mode: 'insensitive' },
        },
      });
    }

    let investment;
    const { recordInvestmentPrice, fetchHistoricalPricesForAsset } = await import('@/lib/investments');

    if (existingInvestment) {
      // MERGE LOGIC
      const newQuantity = existingInvestment.quantity + qty;
      const existingPurchasePrice = existingInvestment.purchasePrice || 0;

      // The price at which the NEW portion was bought
      let incomingPurchasePrice = Number.isFinite(purchasePriceNumber) ? purchasePriceNumber : (livePriceUsd || manualCurrentPrice);

      // Normalize incoming purchase price to match existing investment's purchase currency
      const existingPurchaseCurrencyId = existingInvestment.purchaseCurrencyId;
      const incomingPurchaseCurrencyId = purchaseCurrencyId ? Number(purchaseCurrencyId) : null;

      if (incomingPurchaseCurrencyId && existingPurchaseCurrencyId && incomingPurchaseCurrencyId !== existingPurchaseCurrencyId) {
        incomingPurchasePrice = await convertAmount(
          incomingPurchasePrice,
          incomingPurchaseCurrencyId,
          existingPurchaseCurrencyId,
          purchaseDateValue || new Date()
        );
      } else if (!existingPurchaseCurrencyId && incomingPurchaseCurrencyId) {
        // If existing has no currency but incoming does, we assume existing was in user's base currency?
        // For safety, let's just use the incoming currency for the whole position if existing was null.
      }

      const newPurchasePrice = (existingPurchasePrice * existingInvestment.quantity + incomingPurchasePrice * qty) / newQuantity;

      // Current market value in USD
      const marketPriceUsd = livePriceUsd || (sourceType === 'manual' ? manualCurrentPrice : (existingInvestment.currentValue / existingInvestment.quantity));
      const newCurrentValueUsd = marketPriceUsd * newQuantity;
      const newChangePercent = newPurchasePrice > 0 ? ((newCurrentValueUsd / newQuantity - newPurchasePrice) / newPurchasePrice) * 100 : 0;

      investment = await db.investment.update({
        where: { id: existingInvestment.id },
        data: {
          quantity: newQuantity,
          purchasePrice: newPurchasePrice,
          currentValue: newCurrentValueUsd,
          changePercent: newChangePercent,
          sourceType: sourceType === 'live' ? 'live' : existingInvestment.sourceType, // Upgrade to live if new one is live
          lastPriceUpdateDate: sourceType === 'manual' ? new Date() : existingInvestment.lastPriceUpdateDate,
          updatedAt: new Date(),
          ticker: normalizedTicker,
          assetType: resolvedAssetType || existingInvestment.assetType,
          icon: resolvedIcon || existingInvestment.icon,
        },
      });
    } else {
      const currentValueUsd =
        livePriceUsd && Number.isFinite(livePriceUsd) ? livePriceUsd * qty : Number.isFinite(manualCurrentPrice) ? manualCurrentPrice * qty : 0;

      const purchaseValue = Number.isFinite(purchasePriceNumber) ? purchasePriceNumber * qty : null;
      const changePercent =
        purchaseValue && purchaseValue > 0 && Number.isFinite(currentValueUsd)
          ? ((currentValueUsd - purchaseValue) / purchaseValue) * 100
          : 0;

      investment = await db.investment.create({
        data: {
          userId: user.id,
          name,
          subtitle: subtitle || (normalizedTicker ? `${qty} ${normalizedTicker}` : ''),
          ticker: normalizedTicker,
          assetType: resolvedAssetType,
          sourceType,
          quantity: qty,
          purchasePrice: Number.isFinite(purchasePriceNumber) ? purchasePriceNumber : null,
          purchaseDate: purchaseDateValue && !Number.isNaN(purchaseDateValue.getTime()) ? purchaseDateValue : null,
          purchaseCurrencyId: purchaseCurrencyId ? Number(purchaseCurrencyId) : null,
          currentValue: Number.isFinite(currentValueUsd) ? currentValueUsd : 0,
          changePercent: Number.isFinite(changePercent) ? changePercent : 0,
          icon: resolvedIcon || 'Cash',
          lastPriceUpdateDate: sourceType === 'manual' ? new Date() : null,
        },
      });
    }

    // Initial price recording
    const priceToRecord = livePriceUsd || manualCurrentPrice || (investment.currentValue / investment.quantity);
    await recordInvestmentPrice(investment.id, priceToRecord, sourceType === 'manual' ? 'manual' : 'live');

    // Retroactive history fetch for live assets (only for new investments or if history is empty)
    if (sourceType === 'live' && purchaseDateValue && (resolvedAssetType === 'crypto' || resolvedAssetType === 'stock')) {
      const existingHistory = await db.investmentPriceHistory.count({ where: { investmentId: investment.id, source: 'auto' } });
      if (existingHistory === 0) {
        try {
          const history = await fetchHistoricalPricesForAsset(
            resolvedTicker || '',
            resolvedAssetType as 'crypto' | 'stock',
            purchaseDateValue
          );

          if (history.length > 0) {
            await db.investmentPriceHistory.createMany({
              data: history.map(h => ({
                investmentId: investment.id,
                price: h.price,
                priceDate: h.date,
                source: 'auto'
              }))
            });
          }
        } catch (err) {
          console.error('[investments] retroactive fetch failed', err);
        }
      }
    }

    return NextResponse.json({ investment });
  } catch (error) {
    console.error('Error creating investment:', error);
    return NextResponse.json({ error: 'Failed to create investment' }, { status: 500 });
  }
}

