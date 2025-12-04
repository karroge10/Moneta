/**
 * Update category types - set income/expense types for categories
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

// Categories that are income types
const INCOME_CATEGORIES = [
  'Salary',
  'Gift',
  'Investment Income',
  'Freelance',
  'Bonus',
  'Dividend',
  'Interest',
  'Rental Income',
  'Refund',
  'Other Income',
];

// Categories that are expense types (most categories)
// If not in INCOME_CATEGORIES and not explicitly listed here, they default to expense
const EXPENSE_CATEGORIES = [
  'Rent',
  'Groceries',
  'Restaurants',
  'Entertainment',
  'Transportation',
  'Technology',
  'Furniture',
  'Clothes',
  'Gifts',
  'Fitness',
  'Water Bill',
  'Electricity Bill',
  'Heating Bill',
  'Home Internet',
  'Mobile Data',
  'Elevator & Cleaning Bill',
  'Taxes',
  'Taxes in Georgia',
  'Taxes in USA',
  'Subscriptions',
  'Other',
];

async function main() {
  try {
    console.log('📝 Updating category types...\n');

    // Update income categories
    console.log('💰 Setting income categories...');
    for (const categoryName of INCOME_CATEGORIES) {
      const result = await prisma.category.updateMany({
        where: { name: categoryName },
        data: { type: 'income' },
      });
      if (result.count > 0) {
        console.log(`   ✅ ${categoryName} -> income`);
      }
    }

    // Update expense categories
    console.log('\n💸 Setting expense categories...');
    for (const categoryName of EXPENSE_CATEGORIES) {
      const result = await prisma.category.updateMany({
        where: { name: categoryName },
        data: { type: 'expense' },
      });
      if (result.count > 0) {
        console.log(`   ✅ ${categoryName} -> expense`);
      }
    }

    // Set all other categories to expense (default)
    console.log('\n📋 Setting remaining categories to expense (default)...');
    const allCategories = await prisma.category.findMany({
      where: {
        type: null,
      },
    });

    for (const category of allCategories) {
      // Skip if it's in income list (shouldn't happen, but just in case)
      if (!INCOME_CATEGORIES.includes(category.name)) {
        await prisma.category.update({
          where: { id: category.id },
          data: { type: 'expense' },
        });
        console.log(`   ✅ ${category.name} -> expense (default)`);
      }
    }

    console.log('\n✨ Category types updated!\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

