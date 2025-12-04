/**
 * Delete rent transactions for user ID 1 and delete all users except user ID 3
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
    console.log('🧹 Cleaning up users and rent transactions...\n');

    // Step 1: Delete rent transactions for user ID 1
    console.log('1️⃣ Deleting rent transactions for user ID 1...\n');
    
    const rentCategory = await prisma.category.findUnique({
      where: { name: 'Rent' },
    });

    if (rentCategory) {
      const rentTransactionsCount = await prisma.transaction.count({
        where: {
          userId: 1,
          categoryId: rentCategory.id,
        },
      });

      if (rentTransactionsCount > 0) {
        const deleteResult = await prisma.transaction.deleteMany({
          where: {
            userId: 1,
            categoryId: rentCategory.id,
          },
        });
        console.log(`   ✅ Deleted ${deleteResult.count} rent transactions for user ID 1\n`);
      } else {
        console.log('   ⏭️  No rent transactions found for user ID 1\n');
      }
    } else {
      console.log('   ⏭️  Rent category not found\n');
    }

    // Step 2: Delete all users except user ID 3
    console.log('2️⃣ Deleting all users except user ID 3...\n');
    
    // First, delete all transactions for users that will be deleted (except user 3)
    const usersToDelete = await prisma.user.findMany({
      where: {
        id: {
          not: 3,
        },
      },
    });

    if (usersToDelete.length > 0) {
      console.log(`   Found ${usersToDelete.length} user(s) to delete\n`);
      
      // Delete transactions for these users first (cascade should handle this, but being explicit)
      for (const user of usersToDelete) {
        const transactionCount = await prisma.transaction.count({
          where: { userId: user.id },
        });
        
        if (transactionCount > 0) {
          await prisma.transaction.deleteMany({
            where: { userId: user.id },
          });
          console.log(`   ✅ Deleted ${transactionCount} transactions for user ID ${user.id}`);
        }
      }

      // Delete the users
      const deleteResult = await prisma.user.deleteMany({
        where: {
          id: {
            not: 3,
          },
        },
      });
      
      console.log(`\n   ✅ Deleted ${deleteResult.count} user(s)\n`);
    } else {
      console.log('   ⏭️  No users to delete (only user ID 3 exists)\n');
    }

    // Verify user 3 exists
    const user3 = await prisma.user.findUnique({
      where: { id: 3 },
    });

    if (user3) {
      console.log(`✅ User ID 3 exists: ${user3.clerkUserId || 'no clerk ID'}\n`);
    } else {
      console.log('⚠️  Warning: User ID 3 not found!\n');
    }

    console.log('✨ Cleanup completed!\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

