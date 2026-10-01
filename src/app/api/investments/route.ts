import { NextResponse, NextRequest } from 'next/server';
import { getDerivedAssetIcon } from '@/lib/asset-utils';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { errorResponse } from '@/lib/api-errors';
import { db } from '@/lib/db';
import { moneyToNumber, parseQuantity } from '@/lib/money';
import { getAssetHolding, getInvestmentsPortfolio } from '@/lib/investments';
import { ensureAsset } from '@/lib/assets';
import { Prisma } from '@prisma/client';
import { convertTransactionsWithRatesMap, countMissingRates, preloadRates } from '@/lib/currency-conversion';
import { addUtcDays, toDateKey } from '@/lib/dates';
import { parseDisplayDate } from '@/lib/transaction-utils';
import { investmentCreateSchema, parseJsonBody } from '@/lib/validation';

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

    
    const thirtyDaysAgo = addUtcDays(new Date(), -30);

    
    const [summary, recentTransactions, latestNotification, snapshots] = await Promise.all([
      getInvestmentsPortfolio(user.id, userCurrency),
      db.transaction.findMany({
        where: { userId: user.id, investmentAssetId: { not: null } },
        include: { asset: true, currency: true },
        orderBy: { date: 'desc' },
        take: 10,
      }),
      db.notification.findFirst({
        where: { userId: user.id },
        orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
      }),
      db.portfolioSnapshot.findMany({
        where: { userId: user.id, timestamp: { gte: thirtyDaysAgo } },
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true, totalValue: true, totalCost: true, totalPnl: true }
      }),
    ]);

    
    const rateRequests = recentTransactions.map((t) => ({ currencyId: t.currencyId, date: t.date }));
    const ratesMap = await preloadRates(rateRequests, userCurrency.id);

    const activitiesWithPrice = recentTransactions.map((t) => {
      const price = t.pricePerUnit ?? new Prisma.Decimal(0);
      const quantity = t.quantity ?? new Prisma.Decimal(0);
      return { ...t, amount: price.mul(quantity) };
    });

    const convertedActivities = convertTransactionsWithRatesMap(activitiesWithPrice, userCurrency.id, ratesMap);

    const recentActivities = convertedActivities.map((t) => {
      const derivedIcon = getDerivedAssetIcon(t.asset?.assetType, t.asset?.ticker, t.asset?.pricingMode);
      const assetIcon = t.asset?.icon || derivedIcon;

      return {
        id: t.id.toString(),
        assetId: t.investmentAssetId?.toString(),
        name: t.asset?.name || 'Unknown Asset',
        ticker: t.asset?.ticker || '',
        type: t.investmentType === 'buy' ? 'Buy' : 'Sell',
        investmentType: t.investmentType,
        quantity: Number(t.quantity),
        pricePerUnit: Number(t.pricePerUnit),
        amount: t.convertedAmount,
        rateMissing: t.rateMissing,
        date: t.date.toISOString(),
        icon: assetIcon,
        assetType: t.asset?.assetType,
      };
    });

    
    const portfolio = summary.assets.map(a => ({
      id: a.assetId.toString(),
      name: a.name,
      subtitle: a.ticker,
      ticker: a.ticker,
      assetType: a.type,
      sourceType: a.pricingMode,
      quantity: a.quantity,
      currentValue: a.currentValue,
      currentPrice: a.currentPrice,
      totalCost: a.totalCost,
      gainLoss: a.pnl,
      changePercent: a.unrealizedPnlPercent, 
      unrealizedPnl: a.unrealizedPnl,
      realizedPnl: a.realizedPnl,
      priceMissing: a.priceMissing,
      rateMissing: a.rateMissing,
      icon: a.icon || (a.type === 'crypto' ? 'BitcoinCircle' : 'Reports'),
      priceHistory: [], 
    }));

    
    const update = latestNotification ? {
      date: latestNotification.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      message: latestNotification.text,
      highlight: '',
      link: 'View all notifications',
      isUnread: !latestNotification.read,
    } : {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      message: 'No new updates at this time.',
      highlight: '',
      link: 'View notifications',
      isUnread: false,
    };

    const graphData = snapshots.map(s => ({
        date: toDateKey(s.timestamp),
        value: moneyToNumber(s.totalValue),
        cost: moneyToNumber(s.totalCost),
        pnl: moneyToNumber(s.totalPnl)
    }));

    

    
    let totalCostTrend = 0;
    const totalCostComparisonLabel = 'vs last 30 days';

    if (snapshots.length > 0) {
        const startSnapshot = snapshots[0];
        const prevTotalCost = moneyToNumber(startSnapshot.totalCost);
        
        if (prevTotalCost > 0) {
            const diff = summary.totalCost - prevTotalCost;
            totalCostTrend = (diff / prevTotalCost) * 100;
        } else if (summary.totalCost > 0) {
             totalCostTrend = 100; 
        }
    }

    const responsePayload = {
      update,
      balance: {
        amount: summary.totalValue,
        trend: summary.pnlPercent,
      },
      totalCost: summary.totalCost,
      totalCostTrend,
      totalCostComparisonLabel,
      portfolio,
      performance: {
        trend: summary.pnlPercent,
        trendText: summary.totalPnl >= 0 ? `+${summary.totalPnl.toFixed(2)}` : `${summary.totalPnl.toFixed(2)}`,
        data: graphData, 
      },
      recentActivities,
      missingValuations: summary.missingValuations,
      missingRates: countMissingRates(convertedActivities),
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    return errorResponse(error, 'Error fetching investments data', 'Failed to fetch investments data');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUserWithLanguage();
    const parsed = await parseJsonBody(request, investmentCreateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const {
      assetId,
      name,
      ticker,
      assetType, 
      pricingMode, 
      investmentType, 
      quantity,
      pricePerUnit,
      date,
      currencyId, 
      notes: _notes,
      coingeckoId,
      icon,
    } = body;

    const quantityValue = parseQuantity(quantity)!;
    const priceValue = parseQuantity(pricePerUnit)!;
    let targetAssetId = assetId ?? null;

    
    if (!targetAssetId) {
      if (!name || !assetType) {
        return NextResponse.json({ error: 'Asset name and type required' }, { status: 400 });
      }

      
      if ((assetType === 'crypto' || assetType === 'stock') && !ticker) {
          return NextResponse.json({ error: 'Ticker is required for Crypto/Stock assets' }, { status: 400 });
      }

      
      
      const isPrivate = assetType === 'property' || assetType === 'custom' || assetType === 'other';
      const assetUserId = isPrivate ? user.id : undefined;

      const asset = await ensureAsset(
        ticker || null,
        name,
        assetType,
        pricingMode || 'manual',
        coingeckoId ?? undefined,
        assetUserId,
        icon ?? undefined
      );
      targetAssetId = asset.id;
    }

    if (!targetAssetId) {
      return NextResponse.json({ error: 'Failed to resolve asset' }, { status: 500 });
    }

    
    const legacyType = investmentType === 'buy' ? 'expense' : 'income';

    
    if (investmentType === 'sell') {
      const currentHolding = await getAssetHolding(user.id, targetAssetId);
      if (currentHolding.lt(quantityValue)) {
        const holdingText = currentHolding.toNumber().toLocaleString(undefined, { maximumFractionDigits: 8 });
        return NextResponse.json({
          error: `Insufficient holdings. You only own ${holdingText} of this asset.`
        }, { status: 400 });
      }
    }

    
    const transaction = await db.transaction.create({
      data: {
        userId: user.id,
        type: legacyType,
        amount: 0, 
        description: `${investmentType === 'buy' ? 'Bought' : 'Sold'} ${quantity} ${ticker || 'Asset'}`,
        date: date ? parseDisplayDate(date)! : new Date(),
        currencyId: currencyId ?? user.currencyId!,

        investmentAssetId: targetAssetId,
        investmentType,
        quantity: quantityValue,
        pricePerUnit: priceValue,
      },
    });

    return NextResponse.json({ transaction });
  } catch (error) {
    return errorResponse(error, 'Error creating investment transaction', 'Failed to create investment transaction');
  }
}
