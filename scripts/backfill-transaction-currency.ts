/**
 * Backfill transaction currency information and seed a GEL→GEL exchange rate.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
if (!process.env.DATABASE_URL) {
  config({ path: resolve(process.cwd(), '.env') });
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔄 Starting transaction currency backfill...\n');

    const gelCurrency = await prisma.currency.findFirst({
      where: {
        OR: [{ alias: 'GEL' }, { name: 'Georgian Lari' }],
      },
    });

    if (!gelCurrency) {
      throw new Error('GEL currency not found. Please seed currencies first.');
    }

    const totalTransactions = await prisma.transaction.count();
    console.log(`Found ${totalTransactions} transactions to update.`);

    if (totalTransactions === 0) {
      console.log('No transactions found. Exiting.\n');
      return;
    }

    const result = await prisma.transaction.updateMany({
      data: {
        currencyId: gelCurrency.id,
      },
    });

    console.log(`✅ Updated ${result.count} transactions to use currency ID ${gelCurrency.id} (GEL).`);

    const rateDate = new Date();
    rateDate.setUTCHours(0, 0, 0, 0);

    await prisma.exchangeRate.upsert({
      where: {
        baseCurrencyId_quoteCurrencyId_rateDate: {
          baseCurrencyId: gelCurrency.id,
          quoteCurrencyId: gelCurrency.id,
          rateDate,
        },
      },
      update: {
        rate: new Prisma.Decimal(1),
      },
      create: {
        baseCurrencyId: gelCurrency.id,
        quoteCurrencyId: gelCurrency.id,
        rate: new Prisma.Decimal(1),
        rateDate,
      },
    });

    console.log('💱 Seeded GEL→GEL exchange rate (1:1).');
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();



