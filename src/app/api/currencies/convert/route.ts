import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { convertAmount } from '@/lib/currency-conversion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        await requireCurrentUser();
        const { searchParams } = new URL(request.url);
        const amount = Number(searchParams.get('amount') || 1);
        const from = Number(searchParams.get('from'));
        const to = Number(searchParams.get('to'));

        if (isNaN(from) || isNaN(to)) {
            return NextResponse.json({ error: 'Source and target currency IDs are required' }, { status: 400 });
        }

        const convertedAmount = await convertAmount(amount, from, to);
        const rate = await convertAmount(1, from, to);

        return NextResponse.json({
            amount,
            from,
            to,
            convertedAmount,
            rate
        });
    } catch (error) {
        console.error('[api/currencies/convert] error:', error);
        return NextResponse.json({ error: 'Failed to convert currency' }, { status: 500 });
    }
}
