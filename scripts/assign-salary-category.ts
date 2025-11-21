/**
 * Create Salary category and assign it to all income transactions
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
    console.log('💰 Creating Salary category...\n');

    // Find or create Salary category
    let salaryCategory = await prisma.category.findUnique({
      where: { name: 'Salary' },
    });

    if (!salaryCategory) {
      salaryCategory = await prisma.category.create({
        data: {
          name: 'Salary',
          icon: 'Wallet', // Using Wallet icon for salary/income
          color: '#74C648', // Green color for income
        },
      });
      console.log(`✨ Created Salary category (ID: ${salaryCategory.id})\n`);
    } else {
      console.log(`✓ Salary category already exists (ID: ${salaryCategory.id})\n`);
    }

    // Get the logged-in user (User 3 with Clerk ID)
    const user = await prisma.user.findUnique({
      where: { clerkUserId: 'user_35NUOoqSLVMmP1IZICZx1sng1gv' },
    });

    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }

    console.log(`👤 Updating income transactions for User ${user.id}...\n`);

    // Count income transactions
    const incomeCount = await prisma.transaction.count({
      where: {
        userId: user.id,
        type: 'income',
      },
    });

    console.log(`Found ${incomeCount} income transactions\n`);

    if (incomeCount === 0) {
      console.log('⚠️  No income transactions found. Nothing to update.\n');
      return;
    }

    // Update all income transactions to have Salary category
    const result = await prisma.transaction.updateMany({
      where: {
        userId: user.id,
        type: 'income',
      },
      data: {
        categoryId: salaryCategory.id,
      },
    });

    console.log(`✅ Successfully assigned Salary category to ${result.count} income transactions!\n`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();




