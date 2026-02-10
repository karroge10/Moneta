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
            pricingMode: asset.pricingMode, // Include pricing mode
            manualPrice: asset.manualPrice, // Include raw manual price
            icon: portfolioAsset?.icon || asset.icon, // Use derived icon from portfolio
        };

        return NextResponse.json({ asset: assetWithStats });
    } catch (error) {
        console.error('Error fetching asset details:', error);
        return NextResponse.json({ error: 'Failed to fetch asset details' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await requireCurrentUserWithLanguage();
        const assetId = parseInt(id, 10);
        const body = await request.json();

        if (isNaN(assetId)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        const asset = await db.asset.findUnique({ where: { id: assetId } });
        if (!asset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        // Only allow updating if it's a private asset belonging to this user
        if (asset.userId !== user.id) {
            return NextResponse.json({ error: 'Cannot edit global or other users assets' }, { status: 403 });
        }

        const { name, ticker, manualPrice } = body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (ticker !== undefined) updateData.ticker = ticker || null;
        if (manualPrice !== undefined) updateData.manualPrice = manualPrice;

        const updatedAsset = await db.asset.update({
            where: { id: assetId },
            data: updateData,
        });

        return NextResponse.json({ asset: updatedAsset });
    } catch (error) {
        console.error('Error updating asset:', error);
        return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
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
        // If it's a private asset, we should probably delete the Asset itself too if user wants?
        // Current behavior: Deletes transactions.
        // If private asset, should we delete the asset record too?
        // User might want to keep the asset record but reset transactions?
        // Let's stick to deleting transactions for consistency with "Delete from Portfolio".
        // BUT if it's a private asset and we remove all transactions, it becomes an orphan record in Asset table.
        // Let's delete the Asset record too IF it is private (userId matches).

        const asset = await db.asset.findUnique({ where: { id: assetId } });

        await db.transaction.deleteMany({
            where: {
                userId: user.id,
                investmentAssetId: assetId
            }
        });

        if (asset && asset.userId === user.id) {
            await db.asset.delete({ where: { id: assetId } });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting investment holding:', error);
        return NextResponse.json({ error: 'Failed to delete investment holding' }, { status: 500 });
    }
}
