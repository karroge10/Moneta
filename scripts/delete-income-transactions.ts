/**
 * Delete all income transactions from the database
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

async function main() {
  try {
    console.log('🗑️  Deleting all income transactions...\n');

    // Get count before deletion
    const countBefore = await prisma.transaction.count({
      where: { type: 'income' },
    });

    console.log(`Found ${countBefore} income transactions to delete\n`);

    if (countBefore === 0) {
      console.log('✅ No income transactions found. Nothing to delete.\n');
      return;
    }

    // Delete all income transactions
    const result = await prisma.transaction.deleteMany({
      where: { type: 'income' },
    });

    console.log(`✅ Successfully deleted ${result.count} income transactions!\n`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();



