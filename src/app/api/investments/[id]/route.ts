import { NextResponse, NextRequest } from 'next/server';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { errorResponse } from '@/lib/api-errors';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getInvestmentsPortfolio } from '@/lib/investments';
import { parseQuantity } from '@/lib/money';
import { assetUpdateSchema, parseJsonBody } from '@/lib/validation';

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

        
        // Shared assets have no owner; a private asset is visible only to the user who created it.
        const asset = await db.asset.findFirst({
            where: { id: assetId, OR: [{ userId: null }, { userId: user.id }] },
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
            priceMissing: portfolioAsset?.priceMissing ?? false,
            rateMissing: portfolioAsset?.rateMissing ?? false,
            pricingMode: asset.pricingMode, 
            manualPrice: asset.manualPrice, 
            icon: portfolioAsset?.icon || asset.icon, 
        };

        return NextResponse.json({ asset: assetWithStats });
    } catch (error) {
      return errorResponse(error, 'Error fetching asset details', 'Failed to fetch asset details');
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

        if (isNaN(assetId)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        const parsed = await parseJsonBody(request, assetUpdateSchema);
        if (!parsed.ok) return parsed.response;
        const body = parsed.data;

        const asset = await db.asset.findUnique({ where: { id: assetId } });
        if (!asset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        
        if (asset.userId !== user.id) {
            return NextResponse.json({ error: 'Cannot edit global or other users assets' }, { status: 403 });
        }

        const { name, ticker, manualPrice } = body;

        const updateData: Prisma.AssetUpdateInput = {};
        if (name !== undefined) updateData.name = name;
        if (ticker !== undefined) updateData.ticker = ticker || null;
        if (manualPrice !== undefined) updateData.manualPrice = manualPrice === null ? null : parseQuantity(manualPrice);

        const updatedAsset = await db.asset.update({
            where: { id: assetId, userId: user.id },
            data: updateData,
        });

        return NextResponse.json({ asset: updatedAsset });
    } catch (error) {
      return errorResponse(error, 'Error updating asset', 'Failed to update asset');
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
            await db.asset.delete({ where: { id: assetId, userId: user.id } });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
      return errorResponse(error, 'Error deleting investment holding', 'Failed to delete investment holding');
    }
}
