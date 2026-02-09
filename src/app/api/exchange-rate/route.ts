
import { NextRequest, NextResponse } from 'next/server';
import { getConversionRate } from '@/lib/currency-conversion';
import { requireCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const user = await requireCurrentUser();
        const searchParams = request.nextUrl.searchParams;
        const fromId = searchParams.get('from');
        const toId = searchParams.get('to');
        const dateStr = searchParams.get('date');

        if (!fromId || !toId) {
            return NextResponse.json(
                { error: 'Missing from or to parameters' },
                { status: 400 }
            );
        }

        const fromCurrencyId = parseInt(fromId, 10);
        const toCurrencyId = parseInt(toId, 10);
        const date = dateStr ? new Date(dateStr) : new Date();

        if (isNaN(fromCurrencyId) || isNaN(toCurrencyId)) {
            return NextResponse.json(
                { error: 'Invalid currency IDs' },
                { status: 400 }
            );
        }

        const rate = await getConversionRate(fromCurrencyId, toCurrencyId, date);

        return NextResponse.json({ rate });
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        return NextResponse.json(
            { error: 'Failed to fetch exchange rate' },
            { status: 500 }
        );
    }
}
