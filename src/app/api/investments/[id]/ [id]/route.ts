import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireCurrentUserWithLanguage } from '@/lib/auth';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireCurrentUserWithLanguage();
        const id = parseInt(params.id);
        const body = await request.json();

        const investment = await db.investment.findUnique({
            where: { id },
        });

        if (!investment || investment.userId !== user.id) {
            return new Response('Not Found', { status: 404 });
        }

        const updated = await db.investment.update({
            where: { id },
            data: {
                name: body.name,
                ticker: body.ticker,
                assetType: body.assetType,
                quantity: body.quantity,
                purchasePrice: body.purchasePrice,
                purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
                purchaseCurrencyId: body.purchaseCurrencyId,
                currentValue: body.currentPrice ? (body.currentPrice * body.quantity) : investment.currentValue,
                subtitle: body.subtitle,
                icon: body.icon,
                lastPriceUpdateDate: body.assetType === 'custom' ? new Date() : investment.lastPriceUpdateDate,
            },
        });

        return NextResponse.json({ investment: updated });
    } catch (error) {
        console.error('[investments] update failed', error);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireCurrentUserWithLanguage();
        const id = parseInt(params.id);

        const investment = await db.investment.findUnique({
            where: { id },
        });

        if (!investment || investment.userId !== user.id) {
            return new Response('Not Found', { status: 404 });
        }

        await db.investment.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[investments] delete failed', error);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
