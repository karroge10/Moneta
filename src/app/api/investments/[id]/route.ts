import { NextResponse, NextRequest } from 'next/server';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { db } from '@/lib/db';
import { getInvestmentsPortfolio } from '@/lib/investments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await requireCurrentUserWithLanguage();
        const assetId = parseInt(id, 10);

        if (isNaN(assetId)) {
            console.error(`[api/investments/[id]] Invalid ID received: ${id}`);
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        // Get user's preferred currency
        const userCurrency =
            (user.currencyId && (await db.currency.findUnique({ where: { id: user.currencyId } }))) ||
            (await db.currency.findFirst());

        if (!userCurrency) {
            return NextResponse.json({ error: 'No currency configured' }, { status: 500 });
        }

        // Use the common portfolio logic to get live prices and currency conversion
        const portfolio = await getInvestmentsPortfolio(user.id, userCurrency);
        const portfolioAsset = portfolio.assets.find(a => a.assetId === assetId);

        // Also fetch the raw asset details for the modal
        const asset = await db.asset.findUnique({
            where: { id: assetId },
            include: {
                transactions: {
                    where: { userId: user.id },
                    orderBy: { date: 'desc' },
                    include: { currency: true }
                }
            }
        });

        if (!asset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        // Merge portfolio stats into the asset object
        const assetWithStats = {
            ...asset,
            currentPrice: portfolioAsset?.currentPrice || 0,
            quantity: portfolioAsset?.quantity || 0,
            currentValue: portfolioAsset?.currentValue || 0,
            totalCost: portfolioAsset?.totalCost || 0,
            pnl: portfolioAsset?.pnl || 0,
            pnlPercent: portfolioAsset?.pnlPercent || 0,
        };

        return NextResponse.json({ asset: assetWithStats });
    } catch (error) {
        console.error('Error fetching asset details:', error);
        return NextResponse.json({ error: 'Failed to fetch asset details' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await requireCurrentUserWithLanguage();
        const assetId = parseInt(id, 10);

        if (isNaN(assetId)) {
            console.error(`[api/investments/[id]] Invalid ID for DELETE: ${id}`);
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        // "Delete" on Portfolio means removing all Transactions for this asset for the current user.
        await db.transaction.deleteMany({
            where: {
                userId: user.id,
                investmentAssetId: assetId
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting investment holding:', error);
        return NextResponse.json({ error: 'Failed to delete investment holding' }, { status: 500 });
    }
}
