import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables immediately at the top
config({ path: resolve(process.cwd(), '.env.local') });
if (!process.env.DATABASE_URL) {
    config({ path: resolve(process.cwd(), '.env') });
}

// Now we can safely import things that might check for DATABASE_URL
import { PrismaClient } from '@prisma/client';

async function main() {
    console.log('🌱 Starting portfolio snapshot seeding...');

    // Use dynamic import for anything that touches src/lib/db.ts
    const { getInvestmentsPortfolio } = await import('../src/lib/investments');

    const prisma = new PrismaClient();

    try {
        const users = await prisma.user.findMany({
            include: {
                currency: true
            }
        });

        if (users.length === 0) {
            console.log('❌ No users found to seed snapshots for.');
            return;
        }

        for (const user of users) {
            console.log(`\n👤 Processing User: ${user.clerkUserId || user.id}`);

            // 1. Get current portfolio state
            const userCurrency = user.currency || await prisma.currency.findFirst();
            if (!userCurrency) {
                console.log(`   skipping user ${user.id}: no currency found`);
                continue;
            }

            const currentPortfolio = await getInvestmentsPortfolio(user.id, userCurrency);
            const { totalValue, totalCost, totalPnl } = currentPortfolio;

            console.log(`   Current Portfolio: Value=${totalValue.toFixed(2)}, Cost=${totalCost.toFixed(2)}, PnL=${totalPnl.toFixed(2)}`);

            if (totalValue === 0 && totalCost === 0) {
                console.log('   skipping user: empty portfolio');
                continue;
            }

            // 2. Generate 30 days of history
            const snapshots = [];
            let runningValue = totalValue;
            let runningCost = totalCost;

            for (let i = 0; i < 30; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);

                snapshots.push({
                    userId: user.id,
                    totalValue: runningValue,
                    totalCost: runningCost,
                    totalPnl: runningValue - runningCost,
                    timestamp: date
                });

                // Simulate historical walk
                const changePercent = (Math.random() * 0.04) - 0.02; // -2% to +2%
                runningValue = runningValue / (1 + changePercent);

                if (Math.random() > 0.8) {
                    const costChange = (Math.random() * 0.1) - 0.05; // -5% to +5%
                    runningCost = runningCost / (1 + costChange);
                }
            }

            // 3. Save to DB
            console.log(`   Saving ${snapshots.length} snapshots...`);
            
            await prisma.portfolioSnapshot.deleteMany({
                where: {
                    userId: user.id,
                    timestamp: {
                        gte: snapshots[snapshots.length - 1].timestamp,
                        lte: snapshots[0].timestamp
                    }
                }
            });

            await prisma.portfolioSnapshot.createMany({
                data: snapshots
            });
            
            console.log(`   ✓ Done for user ${user.id}`);
        }

        console.log('\n✅ Seeding completed!');
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
});
