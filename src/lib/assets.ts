import { db } from './db';
import { Asset, AssetType, PricingMode } from '@prisma/client';

export async function searchAssets(query: string, userId?: number) {
    if (!query) return [];

    return db.asset.findMany({
        where: {
            OR: [
                // Global assets (ticker or name match)
                {
                    AND: [
                        { userId: null },
                        {
                            OR: [
                                { name: { contains: query, mode: 'insensitive' } },
                                { ticker: { contains: query, mode: 'insensitive' } },
                            ]
                        }
                    ]
                },
                // Private assets (name match, userId match)
                ...(userId ? [{
                    AND: [
                        { userId },
                        { name: { contains: query, mode: 'insensitive' } }
                    ]
                }] : [])
            ],
        },
        take: 20,
        orderBy: { ticker: 'asc' }, // Note: Ticker might be null now, so this might put nulls last or first depending on DB
    });
}

export async function getAssetById(id: number) {
    return db.asset.findUnique({
        where: { id },
    });
}

export async function ensureAsset(
    ticker: string | null,
    name: string,
    assetType: AssetType,
    pricingMode: PricingMode,
    coingeckoId?: string,
    userId?: number,
    icon?: string
) {
    // 1. If ticker is present, try to find global asset first (e.g. BTC, AAPL)
    if (ticker) {
        const globalAsset = await db.asset.findFirst({
            where: {
                ticker: { equals: ticker, mode: 'insensitive' },
                assetType: assetType,
                userId: null
            }
        });
        if (globalAsset) {
            // If it doesn't have an icon, and we have one, update it?
            // For now just return it.
            return globalAsset;
        }
    }

    // 2. If userId provided, try to find private asset by name (and ticker if exists)
    if (userId) {
        const privateQuery: any = {
            userId,
            assetType,
            name: { equals: name, mode: 'insensitive' }
        };
        
        // Refine if ticker is provided, though name matching is usually sufficient for private
        if (ticker) {
            privateQuery.ticker = { equals: ticker, mode: 'insensitive' };
        }

        const privateAsset = await db.asset.findFirst({
            where: privateQuery
        });
        if (privateAsset) return privateAsset;
    }

    // 3. Create new Asset
    return db.asset.create({
        data: {
            name,
            ticker: ticker ? ticker.toUpperCase() : null,
            assetType,
            pricingMode,
            coingeckoId,
            userId,
            icon,
            manualPrice: null,
        }
    });
}
