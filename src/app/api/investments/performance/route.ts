import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { addUtcDays, addUtcMonths, toDateKey } from '@/lib/dates';
import { moneyToNumber } from '@/lib/money';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const range = searchParams.get('range') || '1M';

  const startDate = rangeStart(range, new Date());

  try {
    const whereClause: Prisma.PortfolioSnapshotWhereInput = {
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

    
    
    
    // Snapshots are written by the cron in the user's currency, so no conversion is applied.
    const graphData = snapshots.map((s) => ({
      date: toDateKey(s.timestamp),
      value: moneyToNumber(s.totalValue),
      cost: moneyToNumber(s.totalCost),
      pnl: moneyToNumber(s.totalPnl),
    }));

    return NextResponse.json(graphData);
  } catch (error) {
    console.error('[INVESTMENTS_PERFORMANCE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

function rangeStart(range: string, now: Date): Date | undefined {
  switch (range) {
    case '1W':
      return addUtcDays(now, -7);
    case '3M':
      return addUtcDays(now, -90);
    case '1Y':
      return addUtcMonths(now, -12);
    case 'All':
      return undefined;
    case '1M':
    default:
      return addUtcDays(now, -30);
  }
}
