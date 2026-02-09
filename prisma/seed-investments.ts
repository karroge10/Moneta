import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main() {
    const userId = 1;

    // 1. Ensure User 1 exists (or find him)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        console.error('User 1 not found. Please run main seed first.');
        return;
    }

    // 2. Currencies
    const usd = await prisma.currency.findFirst({ where: { alias: { equals: 'USD', mode: 'insensitive' } } });
    if (!usd) {
        console.error('USD currency not found.');
        return;
    }

    // 3. Assets
    const assetsData = [
        { name: 'Bitcoin', ticker: 'BTC', assetType: 'crypto' as const, pricingMode: 'live' as const, coingeckoId: 'bitcoin' },
        { name: 'Ethereum', ticker: 'ETH', assetType: 'crypto' as const, pricingMode: 'live' as const, coingeckoId: 'ethereum' },
        { name: 'Apple Inc.', ticker: 'AAPL', assetType: 'stock' as const, pricingMode: 'live' as const },
        { name: 'Tesla, Inc.', ticker: 'TSLA', assetType: 'stock' as const, pricingMode: 'live' as const },
    ];

    const assets = [];
    for (const a of assetsData) {
        let asset = await prisma.asset.findFirst({
            where: { ticker: a.ticker }
        });

        if (asset) {
            asset = await prisma.asset.update({
                where: { id: asset.id },
                data: { coingeckoId: a.coingeckoId, pricingMode: a.pricingMode }
            });
        } else {
            asset = await prisma.asset.create({
                data: {
                    name: a.name,
                    ticker: a.ticker,
                    assetType: a.assetType,
                    pricingMode: a.pricingMode,
                    coingeckoId: a.coingeckoId
                }
            });
        }
        assets.push(asset);
    }

    // 4. Transactions for User 1
    const transactions = [
        {
            investmentAssetId: assets.find(a => a.ticker === 'BTC')!.id,
            investmentType: 'buy',
            quantity: 0.5,
            pricePerUnit: 45000,
            description: 'Bought 0.5 BTC',
            date: new Date('2024-01-10'),
        },
        {
            investmentAssetId: assets.find(a => a.ticker === 'BTC')!.id,
            investmentType: 'buy',
            quantity: 0.2,
            pricePerUnit: 60000,
            description: 'Bought 0.2 BTC',
            date: new Date('2024-02-15'),
        },
        {
            investmentAssetId: assets.find(a => a.ticker === 'ETH')!.id,
            investmentType: 'buy',
            quantity: 10,
            pricePerUnit: 2200,
            description: 'Bought 10 ETH',
            date: new Date('2024-01-05'),
        },
        {
            investmentAssetId: assets.find(a => a.ticker === 'AAPL')!.id,
            investmentType: 'buy',
            quantity: 50,
            pricePerUnit: 180,
            description: 'Bought 50 AAPL',
            date: new Date('2024-01-20'),
        },
        {
            investmentAssetId: assets.find(a => a.ticker === 'TSLA')!.id,
            investmentType: 'buy',
            quantity: 20,
            pricePerUnit: 250,
            description: 'Bought 20 TSLA',
            date: new Date('2024-01-25'),
        },
        {
            investmentAssetId: assets.find(a => a.ticker === 'TSLA')!.id,
            investmentType: 'sell',
            quantity: 5,
            pricePerUnit: 280,
            description: 'Sold 5 TSLA',
            date: new Date('2024-02-28'),
        },
    ];

    for (const t of transactions) {
        await prisma.transaction.create({
            data: {
                userId: userId,
                type: t.investmentType === 'buy' ? 'expense' : 'income',
                amount: 0, // Legacy amount ignored for investments
                description: t.description,
                date: t.date,
                currencyId: usd.id,
                investmentAssetId: t.investmentAssetId,
                investmentType: t.investmentType as any,
                quantity: t.quantity,
                pricePerUnit: t.pricePerUnit,
            },
        });
    }

    console.log('Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
