/**
 * Check transactions in database
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
    console.log('🔍 Checking transactions in database...\n');

    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true, clerkUserId: true },
    });

    console.log('👥 Users in database:');
    users.forEach((u) => {
      console.log(`  User ID: ${u.id}, Clerk ID: ${u.clerkUserId || 'none'}`);
    });
    console.log();

    // Check transactions for each user
    for (const user of users) {
      const transactionCount = await prisma.transaction.count({
        where: { userId: user.id },
      });

      const incomeCount = await prisma.transaction.count({
        where: { userId: user.id, type: 'income' },
      });

      const expenseCount = await prisma.transaction.count({
        where: { userId: user.id, type: 'expense' },
      });

      console.log(`📊 User ${user.id} (${user.clerkUserId || 'no clerk ID'}):`);
      console.log(`  Total: ${transactionCount} transactions`);
      console.log(`  Income: ${incomeCount}`);
      console.log(`  Expenses: ${expenseCount}`);

      if (transactionCount > 0) {
        // Get date range
        const firstTransaction = await prisma.transaction.findFirst({
          where: { userId: user.id },
          orderBy: { date: 'asc' },
        });

        const lastTransaction = await prisma.transaction.findFirst({
          where: { userId: user.id },
          orderBy: { date: 'desc' },
        });

        console.log(`  Date range: ${firstTransaction?.date.toISOString().split('T')[0]} to ${lastTransaction?.date.toISOString().split('T')[0]}`);

        // Check current month (November 2025)
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const currentMonthCount = await prisma.transaction.count({
          where: {
            userId: user.id,
            date: {
              gte: currentMonthStart,
              lte: currentMonthEnd,
            },
          },
        });

        const currentMonthIncome = await prisma.transaction.aggregate({
          where: {
            userId: user.id,
            type: 'income',
            date: {
              gte: currentMonthStart,
              lte: currentMonthEnd,
            },
          },
          _sum: { amount: true },
        });

        const currentMonthExpenses = await prisma.transaction.aggregate({
          where: {
            userId: user.id,
            type: 'expense',
            date: {
              gte: currentMonthStart,
              lte: currentMonthEnd,
            },
          },
          _sum: { amount: true },
        });

        console.log(`  Current month (${now.getFullYear()}-${now.getMonth() + 1}): ${currentMonthCount} transactions`);
        console.log(`    Income: ${currentMonthIncome._sum.amount || 0} GEL`);
        console.log(`    Expenses: ${currentMonthExpenses._sum.amount || 0} GEL`);
      }
      console.log();
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

