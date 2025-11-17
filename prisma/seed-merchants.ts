import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Category name mapping from SQL comments to actual database category names
// Maps the category names used in SQL comments to the actual category names in the database
const CATEGORY_NAME_MAP: Record<string, string> = {
  'Groceries': 'Groceries',
  'Restaurants': 'Restaurants',
  'Transportation': 'Transportation',
  'Technology': 'Technology',
  'Fitness': 'Fitness',
  'Entertainment': 'Entertainment',
  'Clothes': 'Clothes',
  'Furniture': 'Furniture',
  'Gifts': 'Gifts',
  'Other': 'Other', // Maps to id 24 in your DB
  'Mobile Data': 'Mobile Data',
  'Home Internet': 'Home Internet',
  'Electricity Bill': 'Electricity Bill',
  'Water Bill': 'Water Bill',
  'Heating Bill': 'Heating Bill',
  'Rent': 'Rent',
  'Taxes in Georgia': 'Taxes', // Both map to "Taxes" (id 27)
  'Taxes in USA': 'Taxes', // Both map to "Taxes" (id 27)
  'Elevator & Cleaning Bill': 'Elevator & Cleaning Bill',
};

async function main() {
  console.log('Seeding merchants from SQL file...\n');
  
  // First, get all categories and build a name -> id map
  const categories = await prisma.category.findMany();
  const categoryNameToId = new Map<string, number>();
  categories.forEach(cat => {
    categoryNameToId.set(cat.name, cat.id);
  });
  
  console.log(`Found ${categories.length} categories in database\n`);
  
  // Read and parse the SQL file
  const sqlPath = join(__dirname, 'seed-merchants.sql');
  const sql = readFileSync(sqlPath, 'utf-8');
  
  // Extract INSERT statements - look for pattern: ('merchant', categoryId, ...)
  const insertPattern = /\(['"]([^'"]+)['"],\s*(\d+),/g;
  const merchants: Array<{ name: string; categoryId: number; expectedCategory: string }> = [];
  let match;
  
  // Build reverse map: categoryId from SQL -> category name from SQL comment
  const sqlCategoryIdToName: Record<number, string> = {
    6: 'Groceries',
    4: 'Restaurants',
    14: 'Transportation',
    10: 'Technology',
    8: 'Fitness',
    3: 'Entertainment',
    12: 'Clothes',
    5: 'Furniture',
    7: 'Gifts',
    20: 'Other', // SQL uses 20, but DB has 24 - we'll map by name
    18: 'Mobile Data',
    16: 'Home Internet',
    11: 'Electricity Bill',
    9: 'Water Bill',
    15: 'Heating Bill',
    2: 'Rent',
    17: 'Taxes in Georgia', // SQL uses 17, but DB has 27 - we'll map by name
    19: 'Taxes in USA', // SQL uses 19, but DB has 27 - we'll map by name
    13: 'Elevator & Cleaning Bill',
  };
  
  while ((match = insertPattern.exec(sql)) !== null) {
    const merchantName = match[1];
    const sqlCategoryId = parseInt(match[2], 10);
    
    // Get the category name from SQL comment
    const sqlCategoryName = sqlCategoryIdToName[sqlCategoryId] || 'Unknown';
    
    // Map to actual database category name
    const dbCategoryName = CATEGORY_NAME_MAP[sqlCategoryName] || sqlCategoryName;
    
    merchants.push({
      name: merchantName,
      categoryId: sqlCategoryId, // Keep for reference, but we'll use name lookup
      expectedCategory: dbCategoryName,
    });
  }
  
  console.log(`Found ${merchants.length} merchants to seed\n`);
  
  // Upsert each merchant, using actual category IDs from database
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const merchant of merchants) {
    // Find the actual category ID by name
    const actualCategoryId = categoryNameToId.get(merchant.expectedCategory);
    
    if (!actualCategoryId) {
      console.log(`⚠️  Skipping "${merchant.name}" - category "${merchant.expectedCategory}" not found in database`);
      skipCount++;
      continue;
    }
    
    try {
      await prisma.merchantGlobal.upsert({
        where: { namePattern: merchant.name },
        update: {
          categoryId: actualCategoryId,
          updatedAt: new Date(),
        },
        create: {
          namePattern: merchant.name,
          categoryId: actualCategoryId,
        },
      });
      successCount++;
    } catch (error) {
      console.error(`❌ Error upserting "${merchant.name}":`, error);
      errorCount++;
    }
  }
  
  console.log('\n' + '─'.repeat(60));
  console.log('📊 SUMMARY:');
  console.log('─'.repeat(60));
  console.log(`✅ Successfully seeded: ${successCount}`);
  console.log(`⚠️  Skipped (category not found): ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('─'.repeat(60));
}

main()
  .catch((e) => {
    console.error('❌ Error seeding merchants:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

