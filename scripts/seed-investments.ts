import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load env
config({ path: resolve(process.cwd(), '.env.local') });
if (!process.env.DATABASE_URL) {
    config({ path: resolve(process.cwd(), '.env') });
}

const prisma = new PrismaClient();

async function main() {
    // Find a user to attach investments to
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error('No users found in database. Please sign up first.');
        return;
    }

    const userId = user.id;
    console.log(`Using user: ${user.userName || user.clerkUserId} (ID: ${userId})`);

    // Clear existing for this specific user to avoid duplicates if re-run
    await prisma.investment.deleteMany({ where: { userId } });

    const investments = [
        {
            name: 'Bitcoin',
            ticker: 'BTC',
            assetType: 'crypto',
            sourceType: 'live',
            quantity: 0.52,
            purchasePrice: 42000,
            currentValue: 52000,
            icon: 'BitcoinCircle',
            subtitle: '0.52 BTC',
            purchaseDate: new Date('2023-10-15'),
        },
        {
            name: 'Ethereum',
            ticker: 'ETH',
            assetType: 'crypto',
            sourceType: 'live',
            quantity: 4.5,
            purchasePrice: 2100,
            currentValue: 12150,
            icon: 'BitcoinCircle',
            subtitle: '4.5 ETH',
            purchaseDate: new Date('2023-11-20'),
        },
        {
            name: 'NVIDIA',
            ticker: 'NVDA',
            assetType: 'stock',
            sourceType: 'live',
            quantity: 15,
            purchasePrice: 450,
            currentValue: 18000,
            icon: 'Cash',
            subtitle: '15 shares',
            purchaseDate: new Date('2023-12-05'),
        },
        {
            name: 'Apple',
            ticker: 'AAPL',
            assetType: 'stock',
            sourceType: 'live',
            quantity: 10,
            purchasePrice: 175,
            currentValue: 1900,
            icon: 'Cash',
            subtitle: '10 shares',
            purchaseDate: new Date('2024-01-10'),
        },
        {
            name: 'Tbilisi Apartment',
            ticker: null,
            assetType: 'property',
            sourceType: 'manual',
            quantity: 1,
            purchasePrice: 85000,
            currentValue: 92000,
            icon: 'Neighbourhood',
            subtitle: 'Vake Residence',
            purchaseDate: new Date('2022-05-20'),
            lastPriceUpdateDate: new Date(),
        }
    ];

    console.log('Seeding investments...');

    for (const inv of investments) {
        const created = await prisma.investment.create({
            data: {
                userId,
                ...inv
            }
        });

        // Add 30 days of history
        for (let i = 0; i <= 30; i++) {
            const factor = 1 + (Math.random() * 0.2 - 0.1);
            await prisma.investmentPriceHistory.create({
                data: {
                    investmentId: created.id,
                    price: (inv.purchasePrice || 100) * factor,
                    priceDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
                    source: 'auto'
                }
            });
        }
    }

    console.log('Done seeding investments!');
}

main()
    .catch(e => {
        console.error('Seed failed:');
        console.error(e);
    })
    .finally(() => prisma.$disconnect());
