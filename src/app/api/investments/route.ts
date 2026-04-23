import { NextResponse, NextRequest } from 'next/server';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { db } from '@/lib/db';
import { getInvestmentsPortfolio } from '@/lib/investments';
import { ensureAsset, getAssetById } from '@/lib/assets';
import { AssetType, PricingMode, InvestmentType } from '@prisma/client';
import { convertAmount, convertTransactionsWithRatesMap, preloadRatesMap } from '@/lib/currency-conversion';

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

    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    
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

    
    const ratesMap = await preloadRatesMap(
      recentTransactions.map(t => ({ currencyId: t.currencyId, date: t.date })),
      userCurrency.id
    );
    
    
    const activitiesWithPrice = recentTransactions.map(t => ({
      ...t,
      amount: Number(t.pricePerUnit) * Number(t.quantity),
      date: t.date
    }));
    
    const convertedActivities = convertTransactionsWithRatesMap(activitiesWithPrice, userCurrency.id, ratesMap);

    const recentActivities = convertedActivities.map((t: any) => {
      const assetIcon = t.asset?.icon || (
        t.asset?.assetType === 'crypto' ? (
          t.asset?.pricingMode === 'live' && t.asset?.ticker ? 
          `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${t.asset.ticker.toLowerCase()}.png`
          'BitcoinCircle'
        ) :
        t.asset?.assetType === 'stock' ? `https://logo.clearbit.com/${t.asset.ticker.split('.')[0]}.us` :
        t.asset?.assetType === 'property' ? 'Neighbourhood' : 'Reports'
      );

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
        date: s.timestamp.toISOString().split('T')[0], 
        value: s.totalValue,
        cost: s.totalCost,
        pnl: s.totalPnl
    }));

    

    
    let totalCostTrend = 0;
    let totalCostComparisonLabel = 'vs last 30 days';

    if (snapshots.length > 0) {
        const startSnapshot = snapshots[0];
        const prevTotalCost = startSnapshot.totalCost || 0;
        
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
    };

    return NextResponse.json(responsePayload);
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
      notes,
      coingeckoId,
      icon,
    } = body;

    if (!investmentType || !quantity || !pricePerUnit) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let targetAssetId = assetId ? Number(assetId) : null;

    
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
        assetType as AssetType,
        (pricingMode as PricingMode) || 'manual',
        coingeckoId,
        assetUserId,
        icon
      );
      targetAssetId = asset.id;
    }

    if (!targetAssetId) {
      return NextResponse.json({ error: 'Failed to resolve asset' }, { status: 500 });
    }

    
    const legacyType = investmentType === 'buy' ? 'expense' : 'income';

    
    if (investmentType === 'sell') {
      const { getAssetHolding } = await import('@/lib/investments');
      const currentHolding = await getAssetHolding(user.id, targetAssetId);
      const epsilon = 0.00000001; 
      
      if (currentHolding + epsilon < Number(quantity)) {
        return NextResponse.json({ 
          error: `Insufficient holdings. You only own ${currentHolding.toLocaleString(undefined, { maximumFractionDigits: 8 })} of this asset.` 
        }, { status: 400 });
      }
    }

    
    const transaction = await db.transaction.create({
      data: {
        userId: user.id,
        type: legacyType,
        amount: 0, 
        description: `${investmentType === 'buy' ? 'Bought' : 'Sold'} ${quantity} ${ticker || 'Asset'}`,
        date: date ? new Date(date) : new Date(),
        currencyId: currencyId ? Number(currencyId) : user.currencyId!,

        investmentAssetId: targetAssetId,
        investmentType: investmentType as InvestmentType,
        quantity: Number(quantity),
        pricePerUnit: Number(pricePerUnit),
      },
    });

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('Error creating investment transaction:', error);
    return NextResponse.json({ error: 'Failed to create investment transaction' }, { status: 500 });
  }
}
