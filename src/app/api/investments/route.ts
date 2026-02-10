import { NextResponse, NextRequest } from 'next/server';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { db } from '@/lib/db';
import { getInvestmentsPortfolio } from '@/lib/investments';
import { ensureAsset, getAssetById } from '@/lib/assets';
import { AssetType, PricingMode, InvestmentType } from '@prisma/client';
import { convertAmount } from '@/lib/currency-conversion';

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

    const summary = await getInvestmentsPortfolio(user.id, userCurrency);

    // 2. Fetch Recent Activities (Transactions)
    const recentTransactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        investmentAssetId: { not: null },
      },
      include: {
        asset: true,
        currency: true,
      },
      orderBy: { date: 'desc' },
      take: 10,
    });

    const recentActivities = recentTransactions.map(t => ({
      id: t.id.toString(),
      assetId: t.investmentAssetId?.toString(),
      name: t.asset?.name || 'Unknown Asset',
      ticker: t.asset?.ticker || '',
      type: t.investmentType === 'buy' ? 'Buy' : 'Sell',
      investmentType: t.investmentType,
      quantity: Number(t.quantity),
      pricePerUnit: Number(t.pricePerUnit),
      amount: Number(t.pricePerUnit) * Number(t.quantity),
      date: t.date.toISOString(), // ISO for better client-side parsing
      icon: t.asset?.assetType === 'crypto' ? 'BitcoinCircle' :
        t.asset?.assetType === 'stock' ? 'Cash' :
          t.asset?.assetType === 'property' ? 'Neighbourhood' : 'Reports',
      assetType: t.asset?.assetType,
    }));

    // Map to Frontend expected structure
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
      gainLoss: a.pnl,
      changePercent: a.pnlPercent,
      icon: a.icon || (a.type === 'crypto' ? 'BitcoinCircle' : 'Reports'),
      priceHistory: [], // Not supported in MVP refactor
    }));

    // Fetch latest notification (prefer unread)
    const latestNotification = await db.notification.findFirst({
      where: { userId: user.id },
      orderBy: [
        { read: 'asc' },      // unread first
        { createdAt: 'desc' } // then most recent
      ],
    });

    // Format notification for UpdateCard
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

    const responsePayload = {
      update,
      balance: {
        amount: summary.totalValue,
        trend: summary.pnlPercent,
      },
      totalCost: summary.totalCost,
      portfolio,
      performance: {
        trend: summary.pnlPercent,
        trendText: summary.totalPnl >= 0 ? `+${summary.totalPnl.toFixed(2)}` : `${summary.totalPnl.toFixed(2)}`,
        data: [], // Graph data removed as per refactor plan (no cron)
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
      assetType, // 'crypto' | 'stock' | 'other'
      pricingMode, // 'live' | 'manual'
      investmentType, // 'buy' | 'sell'
      quantity,
      pricePerUnit,
      date,
      currencyId, // Currency of the transaction
      notes,
      coingeckoId,
    } = body;

    if (!investmentType || !quantity || !pricePerUnit) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let targetAssetId = assetId ? Number(assetId) : null;

    // Create/Ensure Asset if not provided
    if (!targetAssetId) {
      if (!name || !assetType) {
        return NextResponse.json({ error: 'Asset name and type required' }, { status: 400 });
      }

      // For crypto/stock, ticker is usually required to fetch price, but we can be flexible if manual
      if ((assetType === 'crypto' || assetType === 'stock') && !ticker) {
          return NextResponse.json({ error: 'Ticker is required for Crypto/Stock assets' }, { status: 400 });
      }

      // If it's a private asset type (property/custom), we associate it with the user
      // Stocks/Crypto considered global for now, unless we want to allow "My Private Bitcoin" (maybe later)
      const isPrivate = assetType === 'property' || assetType === 'custom' || assetType === 'other';
      const assetUserId = isPrivate ? user.id : undefined;

      const asset = await ensureAsset(
        ticker || null,
        name,
        assetType as AssetType,
        (pricingMode as PricingMode) || 'manual',
        coingeckoId,
        assetUserId
      );
      targetAssetId = asset.id;
    }

    if (!targetAssetId) {
      return NextResponse.json({ error: 'Failed to resolve asset' }, { status: 500 });
    }

    // Determine Transaction Type string (legacy)
    const legacyType = investmentType === 'buy' ? 'expense' : 'income';

    // Create Transaction
    const transaction = await db.transaction.create({
      data: {
        userId: user.id,
        type: legacyType,
        amount: 0, // Legacy amount ignored for investments
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
