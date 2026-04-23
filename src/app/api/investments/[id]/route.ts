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

        
        const userCurrency =
            (user.currencyId && (await db.currency.findUnique({ where: { id: user.currencyId } }))) ||
            (await db.currency.findFirst());

        if (!userCurrency) {
            return NextResponse.json({ error: 'No currency configured' }, { status: 500 });
        }

        
        const portfolio = await getInvestmentsPortfolio(user.id, userCurrency);
        const portfolioAsset = portfolio.assets.find(a => a.assetId === assetId);

        
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

        
        const assetWithStats = {
            ...asset,
            currentPrice: portfolioAsset?.currentPrice || 0,
            quantity: portfolioAsset?.quantity || 0,
            currentValue: portfolioAsset?.currentValue || 0,
            totalCost: portfolioAsset?.totalCost || 0,
            pnl: portfolioAsset?.pnl || 0,
            pnlPercent: portfolioAsset?.unrealizedPnlPercent || 0,
            unrealizedPnl: portfolioAsset?.unrealizedPnl || 0,
            realizedPnl: portfolioAsset?.realizedPnl || 0,
            pricingMode: asset.pricingMode, 
            manualPrice: asset.manualPrice, 
            icon: portfolioAsset?.icon || asset.icon, 
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
