import { db } from './db';
import { Asset, AssetType, PricingMode, Prisma } from '@prisma/client';

export async function searchAssets(query: string, userId?: number) {
    if (!query) return [];

    return db.asset.findMany({
        where: {
            OR: [
                
                {
                    AND: [
                        { userId: null },
                        {
                            OR: [
                                { name: { contains: query, mode: Prisma.QueryMode.insensitive } },
                                { ticker: { contains: query, mode: Prisma.QueryMode.insensitive } },
                            ]
                        }
                    ]
                },
                
                ...(userId ? [{
                    AND: [
                        { userId },
                        { name: { contains: query, mode: Prisma.QueryMode.insensitive } }
                    ]
                }] : [])
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
    ticker: string | null,
    name: string,
    assetType: AssetType,
    pricingMode: PricingMode,
    coingeckoId?: string,
    userId?: number,
    icon?: string
) {
    
    if (ticker) {
        const globalAsset = await db.asset.findFirst({
            where: {
                ticker: { equals: ticker, mode: 'insensitive' },
                assetType: assetType,
                userId: null
            }
        });
        if (globalAsset) {
            
            
            return globalAsset;
        }
    }

    
    if (userId) {
        const privateQuery: any = {
            userId,
            assetType,
            name: { equals: name, mode: 'insensitive' }
        };
        
        
        if (ticker) {
            privateQuery.ticker = { equals: ticker, mode: 'insensitive' };
        }

        const privateAsset = await db.asset.findFirst({
            where: privateQuery
        });
        if (privateAsset) return privateAsset;
    }

    
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
