import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { fetchAssetHistory, HistoryDataPoint } from '@/lib/investment-history';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const assetId = parseInt(id, 10);
        if (isNaN(assetId)) {
            return NextResponse.json({ error: 'Invalid Asset ID' }, { status: 400 });
        }

        const user = await requireCurrentUserWithLanguage();

        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || '1M';

        const asset = await db.asset.findUnique({
            where: { id: assetId }
        });

        if (!asset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        // Check ownership if private
        if (asset.userId && asset.userId !== user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        let history: HistoryDataPoint[] = [];

        if (asset.pricingMode === 'live') {
            if (asset.assetType === 'crypto' || asset.assetType === 'stock') {
                 history = await fetchAssetHistory(
                    asset.ticker || '', 
                    asset.assetType, 
                    asset.coingeckoId, 
                    range
                );

                // Convert history from USD to user's currency
                const usd = await db.currency.findFirst({ 
                    where: { alias: { equals: 'usd', mode: 'insensitive' } } 
                });
                const userCurrencyId = user.currencyId || (await db.currency.findFirst())?.id;

                if (usd && userCurrencyId && usd.id !== userCurrencyId && history.length > 0) {
                    const { convertAmount } = await import('@/lib/currency-conversion');
                    // Use latest rate for the whole history trend (efficient for charts)
                    const rate = await convertAmount(1, usd.id, userCurrencyId, new Date());
                    history = history.map(point => ({
                        ...point,
                        price: point.price * rate
                    }));
                }
            }
        } 
        
        return NextResponse.json({ history });
    } catch (error) {
        console.error('Error fetching asset history:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
