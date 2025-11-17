/**
 * Category Mapper & Upserter
 * Maps Excel expense columns to English category names and ensures they exist in the database
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

interface CategoryMapping {
  excelName: string;
  englishName: string;
  icon: string;
  color: string;
}

// Map Excel Russian categories to English names with icons and colors
const EXCEL_CATEGORY_MAPPINGS: CategoryMapping[] = [
  {
    excelName: 'Продукты',
    englishName: 'Groceries',
    icon: 'Cart',
    color: '#AC66DA',
  },
  {
    excelName: 'Рестораны',
    englishName: 'Restaurants',
    icon: 'PizzaSlice',
    color: '#D93F3F',
  },
  {
    excelName: 'Развлечения, Фитнесс',
    englishName: 'Entertainment',
    icon: 'Tv',
    color: '#74C648',
  },
  {
    excelName: 'Техника',
    englishName: 'Technology',
    icon: 'Tv',
    color: '#74C648',
  },
  {
    excelName: 'Мебель / посуда',
    englishName: 'Furniture',
    icon: 'Sofa',
    color: '#74C648',
  },
  {
    excelName: 'Одежда',
    englishName: 'Clothes',
    icon: 'Shirt',
    color: '#AC66DA',
  },
  {
    excelName: 'Транспорт',
    englishName: 'Transportation',
    icon: 'Tram',
    color: '#74C648',
  },
  {
    excelName: 'Аренда',
    englishName: 'Rent',
    icon: 'City',
    color: '#74C648',
  },
  {
    excelName: 'Интернет',
    englishName: 'Home Internet',
    icon: 'Wifi',
    color: '#AC66DA',
  },
  {
    excelName: 'Телефон',
    englishName: 'Mobile Data',
    icon: 'SmartphoneDevice',
    color: '#D93F3F',
  },
  {
    excelName: 'Электричество',
    englishName: 'Electricity Bill',
    icon: 'Flash',
    color: '#AC66DA',
  },
  {
    excelName: 'Вода',
    englishName: 'Water Bill',
    icon: 'Droplet',
    color: '#AC66DA',
  },
  {
    excelName: 'Газ',
    englishName: 'Heating Bill',
    icon: 'FireFlame',
    color: '#D93F3F',
  },
  {
    excelName: 'Лифт / Уборка и т.д.',
    englishName: 'Elevator & Cleaning Bill',
    icon: 'City',
    color: '#74C648',
  },
  {
    excelName: 'Банк',
    englishName: 'Subscriptions',
    icon: 'LotOfCash',
    color: '#D93F3F',
  },
  {
    excelName: 'Другое',
    englishName: 'Other',
    icon: 'HelpCircle',
    color: '#AC66DA',
  },
  {
    excelName: 'Налоги в РФ',
    englishName: 'Taxes',
    icon: 'Cash',
    color: '#74C648',
  },
  {
    excelName: 'Налоги в Грузии',
    englishName: 'Taxes',
    icon: 'Cash',
    color: '#74C648',
  },
];

async function cleanupUnwantedCategories() {
  console.log('🧹 Cleaning up unwanted categories...\n');

  const categoriesToDelete = [
    'Entertainment & Fitness',
    'Bank Fees',
    'Taxes in Russia',
    'Taxes in Georgia',
  ];

  for (const categoryName of categoriesToDelete) {
    try {
      const category = await prisma.category.findUnique({
        where: { name: categoryName },
      });

      if (category) {
        // Check if any transactions use this category
        const transactionCount = await prisma.transaction.count({
          where: { categoryId: category.id },
        });

        if (transactionCount > 0) {
          console.log(
            `  ⚠️  Skipping deletion of "${categoryName}" (${transactionCount} transactions use it)`
          );
        } else {
          await prisma.category.delete({
            where: { id: category.id },
          });
          console.log(`  🗑️  Deleted: ${categoryName}`);
        }
      }
    } catch (error) {
      console.error(`  ❌ Error deleting ${categoryName}:`, error);
    }
  }
  console.log();
}

async function ensureCategories() {
  console.log('🔧 Ensuring Excel categories exist in database...\n');

  const results = {
    existing: [] as string[],
    created: [] as string[],
    updated: [] as string[],
  };

  // Track unique category names (since Taxes appears twice)
  const processedCategories = new Set<string>();

  for (const mapping of EXCEL_CATEGORY_MAPPINGS) {
    // Skip duplicates (Taxes appears twice)
    if (processedCategories.has(mapping.englishName)) {
      continue;
    }
    processedCategories.add(mapping.englishName);

    try {
      // Check if category exists
      const existing = await prisma.category.findUnique({
        where: { name: mapping.englishName },
      });

      if (existing) {
        // Category exists - check if we need to update icon/color
        const needsUpdate =
          existing.icon !== mapping.icon || existing.color !== mapping.color;

        if (needsUpdate) {
          await prisma.category.update({
            where: { id: existing.id },
            data: {
              icon: mapping.icon,
              color: mapping.color,
            },
          });
          results.updated.push(mapping.englishName);
          console.log(`  ✏️  Updated: ${mapping.englishName}`);
        } else {
          results.existing.push(mapping.englishName);
          console.log(`  ✓  Exists: ${mapping.englishName}`);
        }
      } else {
        // Create new category
        await prisma.category.create({
          data: {
            name: mapping.englishName,
            icon: mapping.icon,
            color: mapping.color,
          },
        });
        results.created.push(mapping.englishName);
        console.log(`  ✨ Created: ${mapping.englishName}`);
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${mapping.englishName}:`, error);
      throw error;
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log('📊 SUMMARY:');
  console.log('─'.repeat(60));
  console.log(`  Already existed: ${results.existing.length}`);
  console.log(`  Newly created:   ${results.created.length}`);
  console.log(`  Updated:         ${results.updated.length}`);
  console.log(`  Total:           ${EXCEL_CATEGORY_MAPPINGS.length}`);

  if (results.created.length > 0) {
    console.log('\n✨ Newly created categories:');
    results.created.forEach((name: string) => console.log(`  - ${name}`));
  }

  if (results.updated.length > 0) {
    console.log('\n✏️  Updated categories:');
    results.updated.forEach((name: string) => console.log(`  - ${name}`));
  }

  console.log('\n✅ All Excel categories are now in the database!\n');

  // Print mapping table for reference
  console.log('📋 Excel → Database Category Mapping:');
  console.log('─'.repeat(60));
  EXCEL_CATEGORY_MAPPINGS.forEach((mapping: CategoryMapping) => {
    console.log(`  ${mapping.excelName.padEnd(30)} → ${mapping.englishName}`);
  });
  console.log();
}

async function main() {
  try {
    // First, clean up unwanted categories
    await cleanupUnwantedCategories();
    
    // Then, ensure all required categories exist
    await ensureCategories();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

