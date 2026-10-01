import { NextResponse, NextRequest } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { preloadRates, buildCacheKey } from '@/lib/currency-conversion';
import { moneyToNumber } from '@/lib/money';

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

    const rates: Record<number, number> = {};
    // Currencies with no known rate are left out of `rates` and listed here instead of defaulting to 1.
    const missingRates: number[] = [];

    if (includeRates && user.currencyId) {
      const now = new Date();
      const targetCurrencyId = user.currencyId;
      const ratesMap = await preloadRates(
        currencies.map(c => ({ currencyId: c.id, date: now })),
        targetCurrencyId
      );

      for (const c of currencies) {
        const key = buildCacheKey(c.id, targetCurrencyId, now);
        const rate = ratesMap.get(key);
        if (rate) {
          rates[c.id] = moneyToNumber(rate);
        } else {
          missingRates.push(c.id);
        }
      }
    }

    return NextResponse.json({ currencies, rates, missingRates });
  } catch (error) {
    console.error('Error fetching currencies:', error);
    return NextResponse.json({ error: 'Failed to fetch currencies' }, { status: 500 });
  }
}




