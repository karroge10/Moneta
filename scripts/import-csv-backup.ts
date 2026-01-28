/**
 * Import CSV backup data into database
 * Maps old IDs to new IDs by name/alias
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
if (!process.env.DATABASE_URL) {
  config({ path: resolve(process.cwd(), '.env') });
}

const prisma = new PrismaClient();

// CSV file paths
const CSV_DIR = 'C:\\Users\\egots\\Downloads';

function parseCSV(content: string): Array<Record<string, string>> {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    return row;
  });
}

async function importCurrencies() {
  console.log('\n💱 Importing currencies...');
  
  const csvContent = readFileSync(`${CSV_DIR}\\Currency.csv`, 'utf-8');
  const rows = parseCSV(csvContent);
  
  // Clear existing currencies (cascade will clear exchange rates)
  await prisma.exchangeRate.deleteMany({});
  await prisma.currency.deleteMany({});
  
  let imported = 0;
  for (const row of rows) {
    await prisma.currency.create({
      data: {
        id: parseInt(row.id),
        name: row.name,
        symbol: row.symbol,
        alias: row.alias,
      },
    });
    imported++;
  }
  
  // Reset sequence to max ID + 1
  const maxId = Math.max(...rows.map(r => parseInt(r.id)));
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Currency_id_seq" RESTART WITH ${maxId + 1}`);
  
  console.log(`   ✓ Imported ${imported} currencies`);
}

async function importExchangeRates() {
  console.log('\n📈 Importing exchange rates...');
  
  const csvContent = readFileSync(`${CSV_DIR}\\ExchangeRate.csv`, 'utf-8');
  const rows = parseCSV(csvContent);
  
  let imported = 0;
  let skipped = 0;
  
  for (const row of rows) {
    try {
      await prisma.exchangeRate.create({
        data: {
          baseCurrencyId: parseInt(row.baseCurrencyId),
          quoteCurrencyId: parseInt(row.quoteCurrencyId),
          rate: parseFloat(row.rate),
          rateDate: new Date(row.rateDate),
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        },
      });
      imported++;
    } catch (e) {
      skipped++;
    }
  }
  
  console.log(`   ✓ Imported ${imported} exchange rates (${skipped} skipped)`);
}

async function importMerchantGlobal() {
  console.log('\n🏪 Importing global merchants...');
  
  const csvContent = readFileSync(`${CSV_DIR}\\MerchantGlobal.csv`, 'utf-8');
  const rows = parseCSV(csvContent);
  
  // Get category ID mapping (old ID -> new ID by looking up what categories exist)
  // Since categories were seeded fresh, we need to map by checking which IDs are valid
  const categories = await prisma.category.findMany();
  const validCategoryIds = new Set(categories.map(c => c.id));
  
  // Clear existing
  await prisma.merchantGlobal.deleteMany({});
  
  let imported = 0;
  let skipped = 0;
  
  for (const row of rows) {
    const categoryId = parseInt(row.categoryId);
    
    // Skip if category doesn't exist
    if (!validCategoryIds.has(categoryId)) {
      skipped++;
      continue;
    }
    
    try {
      await prisma.merchantGlobal.create({
        data: {
          namePattern: row.namePattern,
          categoryId: categoryId,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        },
      });
      imported++;
    } catch (e) {
      skipped++;
    }
  }
  
  console.log(`   ✓ Imported ${imported} global merchants (${skipped} skipped - category mismatch)`);
}

async function importMerchant() {
  console.log('\n👤 Importing user merchants...');
  
  const csvContent = readFileSync(`${CSV_DIR}\\Merchant.csv`, 'utf-8');
  const rows = parseCSV(csvContent);
  
  // Get valid category IDs
  const categories = await prisma.category.findMany();
  const validCategoryIds = new Set(categories.map(c => c.id));
  
  // Clear existing
  await prisma.merchant.deleteMany({});
  
  let imported = 0;
  let skipped = 0;
  
  for (const row of rows) {
    const categoryId = parseInt(row.categoryId);
    const userId = parseInt(row.userId);
    
    // Skip if category doesn't exist
    if (!validCategoryIds.has(categoryId)) {
      skipped++;
      continue;
    }
    
    // Note: userId references might not exist yet (user needs to sign in first)
    // We'll skip these for now - they'll be recreated when user imports transactions
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        skipped++;
        continue;
      }
      
      await prisma.merchant.create({
        data: {
          userId: userId,
          namePattern: row.namePattern,
          categoryId: categoryId,
          matchCount: parseInt(row.matchCount) || 1,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        },
      });
      imported++;
    } catch (e) {
      skipped++;
    }
  }
  
  console.log(`   ✓ Imported ${imported} user merchants (${skipped} skipped - user/category missing)`);
  console.log(`   ℹ️  User merchants will be recreated when you import transactions`);
}

async function main() {
  console.log('🚀 Importing CSV backup data...\n');
  console.log('='.repeat(50));
  
  try {
    await importCurrencies();
    await importExchangeRates();
    await importMerchantGlobal();
    await importMerchant();
    
    console.log('\n' + '='.repeat(50));
    console.log('\n✅ Import complete!\n');
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
