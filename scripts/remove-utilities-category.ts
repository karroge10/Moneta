/**
 * Script to remove the "Utilities" category from the database
 * Since we have separate categories for each utility type, this generic category is no longer needed
 */

import { PrismaClient } from '@prisma/client';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load environment variables (try .env.local first, then .env)
config({ path: resolve(process.cwd(), '.env.local') });
if (!process.env.DATABASE_URL) {
  config({ path: resolve(process.cwd(), '.env') });
}

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Please create a .env or .env.local file.');
}

const prisma = new PrismaClient();

async function removeUtilitiesCategory() {
  console.log('🗑️  Removing "Utilities" category from database...\n');

  try {
    // Find the Utilities category
    const utilitiesCategory = await prisma.category.findUnique({
      where: { name: 'Utilities' },
      include: {
        transactions: true,
        bills: true,
      },
    });

    if (!utilitiesCategory) {
      console.log('  ✓ "Utilities" category not found in database - nothing to remove');
      return;
    }

    const transactionCount = utilitiesCategory.transactions.length;
    const billCount = utilitiesCategory.bills.length;

    if (transactionCount > 0 || billCount > 0) {
      console.log(`  ⚠️  Found ${transactionCount} transactions and ${billCount} bills using "Utilities" category`);
      console.log('  → Setting these to uncategorized (categoryId = null)...\n');

      // Set transactions to uncategorized
      if (transactionCount > 0) {
        await prisma.transaction.updateMany({
          where: { categoryId: utilitiesCategory.id },
          data: { categoryId: null },
        });
        console.log(`  ✓ Updated ${transactionCount} transactions to uncategorized`);
      }

      // Set bills to uncategorized
      if (billCount > 0) {
        await prisma.bill.updateMany({
          where: { categoryId: utilitiesCategory.id },
          data: { categoryId: null },
        });
        console.log(`  ✓ Updated ${billCount} bills to uncategorized`);
      }
    }

    // Delete the category
    await prisma.category.delete({
      where: { id: utilitiesCategory.id },
    });

    console.log('\n  ✅ Successfully removed "Utilities" category from database');
  } catch (error) {
    console.error('  ❌ Error removing Utilities category:', error);
    throw error;
  }
}

async function main() {
  try {
    await removeUtilitiesCategory();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

