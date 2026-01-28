/**
 * Import user-specific merchants from CSV backup
 * Maps old userId (3) to new userId (1)
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

// Target user ID
const TARGET_USER_ID = 1;

// CSV file path
const CSV_PATH = 'C:\\Users\\egots\\Downloads\\Merchant.csv';

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

async function main() {
  console.log('🚀 Importing user merchants...\n');
  console.log('='.repeat(50) + '\n');

  // Check if user exists
  const user = await prisma.user.findUnique({ where: { id: TARGET_USER_ID } });
  if (!user) {
    console.log(`❌ User with ID ${TARGET_USER_ID} not found!`);
    console.log('   Please sign in first to create your user account.\n');
    return;
  }
  console.log(`✓ Found user: ${user.firstName || user.userName || `ID ${user.id}`}\n`);

  // Get valid category IDs
  const categories = await prisma.category.findMany();
  const validCategoryIds = new Set(categories.map(c => c.id));
  console.log(`✓ Found ${categories.length} categories in database\n`);

  // Read CSV
  const csvContent = readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(csvContent);
  console.log(`✓ Read ${rows.length} merchants from CSV\n`);

  // Clear existing merchants for this user
  const deleted = await prisma.merchant.deleteMany({
    where: { userId: TARGET_USER_ID }
  });
  console.log(`🗑️  Cleared ${deleted.count} existing merchants for user ${TARGET_USER_ID}\n`);

  // Import merchants
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
      await prisma.merchant.create({
        data: {
          userId: TARGET_USER_ID,  // Map to new user ID
          namePattern: row.namePattern,
          categoryId: categoryId,
          matchCount: parseInt(row.matchCount) || 1,
        },
      });
      imported++;
    } catch (e) {
      // Likely duplicate namePattern
      skipped++;
    }
  }

  console.log('='.repeat(50));
  console.log('\n✅ Import complete!\n');
  console.log(`   ✓ Imported: ${imported} merchants`);
  console.log(`   ⚠️ Skipped: ${skipped} (invalid category or duplicate)`);
  console.log(`\n   These merchants will be used for auto-categorization.\n`);
}

main()
  .catch((e) => {
    console.error('❌ Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
