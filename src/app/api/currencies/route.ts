import { NextResponse, NextRequest } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getConversionRate } from '@/lib/currency-conversion';

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
      // Fetch rates for today for all currencies relative to user's currency
      const ratesPromises = currencies.map(async (c) => {
        if (c.id === user.currencyId) return { id: c.id, rate: 1 };
        try {
          const rate = await getConversionRate(c.id, user.currencyId!);
          return { id: c.id, rate };
        } catch (e) {
          return { id: c.id, rate: 1 };
        }
      });

      const resolvedRates = await Promise.all(ratesPromises);
      rates = resolvedRates.reduce((acc, r) => {
        acc[r.id] = r.rate;
        return acc;
      }, {} as Record<number, number>);
    }

    return NextResponse.json({ currencies, rates });
  } catch (error) {
    console.error('Error fetching currencies:', error);
    return NextResponse.json({ error: 'Failed to fetch currencies' }, { status: 500 });
  }
}




