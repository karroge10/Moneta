import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { db } from '@/lib/db';
import { getFinancialHealthScore } from '@/lib/financial-health';
import type { TimePeriod } from '@/types/dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUserWithLanguage();

    const userCurrencyRecord = user.currencyId
      ? await db.currency.findUnique({ where: { id: user.currencyId } })
      : await db.currency.findFirst();

    if (!userCurrencyRecord) {
      return NextResponse.json(
        { error: 'No currency configured.' },
        { status: 500 }
      );
    }

    const targetCurrencyId = userCurrencyRecord.id;
    const { searchParams } = new URL(request.url);
    const timePeriod = (searchParams.get('timePeriod') || 'This Month') as TimePeriod;

    const result = await getFinancialHealthScore(user.id, timePeriod, targetCurrencyId);

    return NextResponse.json({
      score: result.score,
      trend: result.trend,
      details: result.details,
      timePeriod,
    });
  } catch (error) {
    console.error('Error fetching financial health:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial health' },
      { status: 500 }
    );
  }
}
