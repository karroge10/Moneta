import { NextResponse } from 'next/server';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { db } from '@/lib/db';
import { getFinancialHealthScore, FINANCIAL_HEALTH_TIME_PERIOD } from '@/lib/financial-health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
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

    const result = await getFinancialHealthScore(user.id, FINANCIAL_HEALTH_TIME_PERIOD, targetCurrencyId);

    return NextResponse.json({
      score: result.score,
      trend: result.trend,
      details: result.details,
      timePeriod: FINANCIAL_HEALTH_TIME_PERIOD,
    });
  } catch (error) {
    console.error('Error fetching financial health:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial health' },
      { status: 500 }
    );
  }
}
