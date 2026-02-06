import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { getInvestmentPriceHistory } from '@/lib/investments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await requireCurrentUser();
        const id = parseInt(params.id, 10);

        if (isNaN(id)) {
            return NextResponse.json({ error: 'Invalid investment ID' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const maxPoints = parseInt(searchParams.get('maxPoints') || '25', 10);

        const history = await getInvestmentPriceHistory(id, maxPoints);
        return NextResponse.json({ history });
    } catch (error) {
        console.error('[investments][price-history] failed', error);
        return NextResponse.json({ error: 'Failed to fetch price history' }, { status: 500 });
    }
}
