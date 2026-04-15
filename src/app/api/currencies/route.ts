import { NextResponse, NextRequest } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { preloadRatesMap, buildCacheKey } from '@/lib/currency-conversion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const searchParams = request.nextUrl.searchParams;
    const includeRates = searchParams.get('includeRates') === 'true';

    const currencies = await db.currency.findMany({
      orderBy: { name: 'asc' },
    });

    let rates: Record<number, number> = {};

    if (includeRates && user.currencyId) {
      const now = new Date();
      const ratesMap = await preloadRatesMap(
        currencies.map(c => ({ currencyId: c.id, date: now })),
        user.currencyId
      );

      rates = currencies.reduce((acc, c) => {
        if (c.id === user.currencyId) {
          acc[c.id] = 1;
        } else {
          acc[c.id] = ratesMap.get(buildCacheKey(c.id, user.currencyId!, now)) ?? 1;
        }
        return acc;
      }, {} as Record<number, number>);
    }

    return NextResponse.json({ currencies, rates });
  } catch (error) {
    console.error('Error fetching currencies:', error);
    return NextResponse.json({ error: 'Failed to fetch currencies' }, { status: 500 });
  }
}




