/**
 * Update rent transactions for user ID 3 to use USD instead of GEL
 */

import { PrismaClient } from '@prisma/client';
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
    console.log('💵 Updating rent transactions to USD...\n');

    // Find USD currency
    const usdCurrency = await prisma.currency.findFirst({
      where: {
        OR: [
          { alias: 'USD' },
          { name: { contains: 'Dollar', mode: 'insensitive' } },
        ],
      },
    });

    if (!usdCurrency) {
      console.error('❌ USD currency not found');
      process.exit(1);
    }

    console.log(`💱 Found USD currency: ${usdCurrency.name} (${usdCurrency.symbol}) - ID: ${usdCurrency.id}\n`);

    // Find Rent category
    const rentCategory = await prisma.category.findUnique({
      where: { name: 'Rent' },
    });

    if (!rentCategory) {
      console.error('❌ Rent category not found');
      process.exit(1);
    }

    // Find all rent transactions for user ID 3
    const rentTransactions = await prisma.transaction.findMany({
      where: {
        userId: 3,
        categoryId: rentCategory.id,
      },
    });

    console.log(`Found ${rentTransactions.length} rent transactions to update\n`);

    if (rentTransactions.length === 0) {
      console.log('⚠️  No rent transactions found. Nothing to update.\n');
      return;
    }

    // Update all rent transactions to use USD
    const result = await prisma.transaction.updateMany({
      where: {
        userId: 3,
        categoryId: rentCategory.id,
      },
      data: {
        currencyId: usdCurrency.id,
      },
    });

    console.log(`✅ Successfully updated ${result.count} rent transaction(s) to USD!\n`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

