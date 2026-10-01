import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getConversionRate } from '@/lib/currency-conversion';
import { moneyToNumber } from '@/lib/money';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { errorResponse } from '@/lib/api-errors';
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

                
                const usd = await db.currency.findFirst({
                    where: { alias: { equals: 'usd', mode: 'insensitive' } }
                });
                const userCurrencyId = user.currencyId || (await db.currency.findFirst())?.id;

                if (usd && userCurrencyId && usd.id !== userCurrencyId && history.length > 0) {
                    const rate = await getConversionRate(usd.id, userCurrencyId, new Date());
                    if (!rate) {
                        return NextResponse.json({ history: [], rateMissing: true });
                    }
                    history = history.map(point => {
                        const usdPrice = new Prisma.Decimal(point.price);
                        return { ...point, price: moneyToNumber(usdPrice.mul(rate)) };
                    });
                }
            }
        }

        return NextResponse.json({ history, rateMissing: false });
    } catch (error) {
      return errorResponse(error, 'Error fetching asset history', 'Failed');
    }
}
