import { db } from './db';
import { Asset, AssetType, PricingMode } from '@prisma/client';

export async function searchAssets(query: string) {
    if (!query) return [];

    return db.asset.findMany({
        where: {
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { ticker: { contains: query, mode: 'insensitive' } },
            ],
        },
        take: 20,
        orderBy: { ticker: 'asc' },
    });
}

export async function getAssetById(id: number) {
    return db.asset.findUnique({
        where: { id },
    });
}

export async function ensureAsset(
    ticker: string,
    name: string,
    assetType: AssetType,
    pricingMode: PricingMode,
    coingeckoId?: string
) {
    // Try to find by ticker first? Or just create?
    // Ticker isn't unique in schema, but should be treated as unique-ish for same type?
    // For now, let's assume we search by ticker AND type first.

    const existing = await db.asset.findFirst({
        where: {
            ticker: { equals: ticker, mode: 'insensitive' },
            assetType: assetType
        }
    });

    if (existing) return existing;

    return db.asset.create({
        data: {
            name,
            ticker: ticker.toUpperCase(),
            assetType,
            pricingMode,
            coingeckoId,
        }
    });
}
