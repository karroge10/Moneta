/**
 * Add rent transactions for each month starting from October 2024
 * Creates transactions on the 12th of each month
 * Usage: npx tsx scripts/add-rent-transactions.ts [userId|clerkUserId]
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
    console.log('🏠 Adding rent transactions...\n');

    // Get user (from argument or first user)
    const userIdArg = process.argv[2];
    
    let user;
    if (userIdArg) {
      // Try to find by clerkUserId first, then by id
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { clerkUserId: userIdArg },
            { id: parseInt(userIdArg, 10) || -1 },
          ],
        },
      });
    } else {
      // Get first user
      user = await prisma.user.findFirst();
    }

    if (!user) {
      console.error('❌ No user found. Please provide a userId or clerkUserId as argument.');
      console.error('   Usage: npx tsx scripts/add-rent-transactions.ts [userId|clerkUserId]');
      process.exit(1);
    }

    console.log(`👤 User: ${user.id} (${user.clerkUserId || 'no clerk ID'})\n`);

    // Find Rent category
    const rentCategory = await prisma.category.findUnique({
      where: { name: 'Rent' },
    });

    if (!rentCategory) {
      console.error('❌ Rent category not found');
      process.exit(1);
    }

    console.log(`📁 Category: ${rentCategory.name} (ID: ${rentCategory.id})\n`);

    // Get user's default currency
    let currencyId = user.currencyId;
    if (!currencyId) {
      const defaultCurrency = await prisma.currency.findFirst();
      if (!defaultCurrency) {
        console.error('❌ No currency configured');
        process.exit(1);
      }
      currencyId = defaultCurrency.id;
    }

    const currency = await prisma.currency.findUnique({
      where: { id: currencyId },
    });

    console.log(`💱 Currency: ${currency?.name} (${currency?.symbol}) - ID: ${currencyId}\n`);

    // Generate dates from October 2024 to current month
    const startDate = new Date(2024, 9, 12); // October 12, 2024 (month is 0-indexed)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const transactionsToCreate = [];

    // Generate transactions for each month
    let currentDate = new Date(startDate);
    while (
      currentDate.getFullYear() < currentYear ||
      (currentDate.getFullYear() === currentYear && currentDate.getMonth() <= currentMonth)
    ) {
      const transactionDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 12);
      const dateStr = transactionDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Check if transaction already exists for this date
      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          userId: user.id,
          categoryId: rentCategory.id,
          date: {
            gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 12),
            lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), 13),
          },
        },
      });

      if (existingTransaction) {
        console.log(`⏭️  Skipping ${dateStr} - transaction already exists`);
      } else {
        // Format description as "Month Year Rent Total" (e.g., "August 2024 Rent Total")
        const monthName = transactionDate.toLocaleDateString('en-US', { month: 'long' });
        const year = transactionDate.getFullYear();
        const description = `${monthName} ${year} Rent Total`;
        
        transactionsToCreate.push({
          userId: user.id,
          type: 'expense',
          amount: 450,
          description,
          date: transactionDate,
          categoryId: rentCategory.id,
          currencyId,
          source: 'manual',
        });
        console.log(`✅ Will create transaction for ${dateStr}: "${description}"`);
      }

      // Move to next month
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 12);
    }

    if (transactionsToCreate.length === 0) {
      console.log('\n⚠️  All rent transactions already exist. Nothing to create.\n');
      return;
    }

    console.log(`\n📝 Creating ${transactionsToCreate.length} transaction(s)...\n`);

    // Create all transactions
    const result = await prisma.transaction.createMany({
      data: transactionsToCreate,
      skipDuplicates: true,
    });

    console.log(`\n✅ Successfully created ${result.count} rent transaction(s)!\n`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

