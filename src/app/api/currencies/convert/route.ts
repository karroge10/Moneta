import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { getConversionRate } from '@/lib/currency-conversion';
import { moneyToNumber, parseMoney } from '@/lib/money';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        await requireCurrentUser();
        const { searchParams } = new URL(request.url);
        const amountParam = searchParams.get('amount') || '1';
        const amountMoney = parseMoney(amountParam);
        const from = Number(searchParams.get('from'));
        const to = Number(searchParams.get('to'));

        if (isNaN(from) || isNaN(to)) {
            return NextResponse.json({ error: 'Source and target currency IDs are required' }, { status: 400 });
        }
        if (!amountMoney) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        const amount = moneyToNumber(amountMoney);
        const rateMoney = await getConversionRate(from, to);
        if (!rateMoney) {
            return NextResponse.json(
                { error: 'Exchange rate not available', amount, from, to, convertedAmount: null, rate: null, missingRate: true },
                { status: 404 }
            );
        }

        const convertedMoney = amountMoney.mul(rateMoney);
        return NextResponse.json({
            amount,
            from,
            to,
            convertedAmount: moneyToNumber(convertedMoney),
            rate: moneyToNumber(rateMoney)
        });
    } catch (error) {
        console.error('[api/currencies/convert] error:', error);
        return NextResponse.json({ error: 'Failed to convert currency' }, { status: 500 });
    }
}
