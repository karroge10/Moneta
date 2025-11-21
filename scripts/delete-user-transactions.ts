/**
 * Delete all transactions for a specific user
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
    const userIdArg = process.argv[2];
    
    if (!userIdArg) {
      console.error('❌ Please provide a user ID');
      console.error('   Usage: npx tsx scripts/delete-user-transactions.ts <userId>');
      process.exit(1);
    }

    const userId = parseInt(userIdArg, 10);
    if (isNaN(userId)) {
      console.error('❌ Invalid user ID. Must be a number.');
      process.exit(1);
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.error(`❌ User with ID ${userId} not found.`);
      process.exit(1);
    }

    console.log(`🗑️  Deleting all transactions for User ${userId} (${user.clerkUserId || 'no clerk ID'})...\n`);

    // Get count before deletion
    const countBefore = await prisma.transaction.count({
      where: { userId },
    });

    console.log(`Found ${countBefore} transactions to delete\n`);

    if (countBefore === 0) {
      console.log('✅ No transactions found. Nothing to delete.\n');
      return;
    }

    // Delete all transactions for this user
    const result = await prisma.transaction.deleteMany({
      where: { userId },
    });

    console.log(`✅ Successfully deleted ${result.count} transactions!\n`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();




