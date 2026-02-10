import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const range = searchParams.get('range') || '1M';

  let startDate: Date | undefined;
  const now = new Date();

  switch (range) {
    case '1W':
      startDate = new Date();
      startDate.setDate(now.getDate() - 7);
      break;
    case '1M':
      startDate = new Date();
      startDate.setDate(now.getDate() - 30);
      break;
    case '3M':
      startDate = new Date();
      startDate.setDate(now.getDate() - 90);
      break;
    case '1Y':
      startDate = new Date();
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case 'All':
      startDate = undefined;
      break;
    default:
      startDate = new Date();
      startDate.setDate(now.getDate() - 30); // Default 1M
  }

  try {
    const whereClause: any = {
      userId: user.id,
    };

    if (startDate) {
      whereClause.timestamp = {
        gte: startDate,
      };
    }

    const snapshots = await db.portfolioSnapshot.findMany({
      where: whereClause,
      orderBy: { timestamp: 'asc' },
      select: {
        timestamp: true,
        totalValue: true,
        totalCost: true,
        totalPnl: true,
      },
    });

    // Determine conversion to user's currency if needed
    // Note: We assume snapshots are stored in USD for global consistency, 
    // or we fetch the user's current currency and convert if they deviate.
    const usd = await db.currency.findFirst({ 
        where: { alias: { equals: 'usd', mode: 'insensitive' } } 
    });
    const userCurrencyId = user.currencyId || (await db.currency.findFirst())?.id;
    
    let rate = 1;
    if (usd && userCurrencyId && usd.id !== userCurrencyId) {
        const { convertAmount } = await import('@/lib/currency-conversion');
        rate = await convertAmount(1, usd.id, userCurrencyId, new Date());
    }

    const graphData = snapshots.map((s) => ({
      date: s.timestamp.toISOString().split('T')[0],
      value: Number(s.totalValue) * rate,
      cost: Number(s.totalCost) * rate,
      pnl: Number(s.totalPnl) * rate,
    }));

    return NextResponse.json(graphData);
  } catch (error) {
    console.error('[INVESTMENTS_PERFORMANCE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
