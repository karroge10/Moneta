/**
 * Fix category IDs in Merchant and MerchantGlobal tables
 * Maps old category IDs to new category IDs
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
if (!process.env.DATABASE_URL) {
  config({ path: resolve(process.cwd(), '.env') });
}

const prisma = new PrismaClient();

// Category ID mapping: oldId -> newId
const CATEGORY_ID_MAPPING: Record<number, number> = {
  6: 1,
  2: 8,
  3: 3,  // no change
  4: 2,
  5: 5,  // no change
  7: 18,
  8: 19,
  9: 12,
  10: 4,
  11: 11, // no change
  12: 6,
  13: 14,
  14: 7,
  15: 13,
  16: 9,
  18: 10,
  24: 17,
};

async function main() {
  console.log('🔧 Fixing category IDs in Merchant and MerchantGlobal tables...\n');
  console.log('='.repeat(50) + '\n');

  // Get all categories to validate mappings
  const categories = await prisma.category.findMany();
  const validCategoryIds = new Set(categories.map(c => c.id));
  
  // Validate all target category IDs exist
  const invalidTargets: number[] = [];
  for (const [oldId, newId] of Object.entries(CATEGORY_ID_MAPPING)) {
    if (!validCategoryIds.has(Number(newId))) {
      invalidTargets.push(Number(newId));
    }
  }
  
  if (invalidTargets.length > 0) {
    console.log(`❌ Invalid target category IDs: ${invalidTargets.join(', ')}`);
    console.log(`   Available category IDs: ${Array.from(validCategoryIds).sort((a, b) => a - b).join(', ')}\n`);
    return;
  }

  // Build CASE statement for SQL update
  // This handles all mappings in one query, avoiding circular dependency issues
  const caseStatements: string[] = [];
  for (const [oldIdStr, newId] of Object.entries(CATEGORY_ID_MAPPING)) {
    const oldId = Number(oldIdStr);
    if (oldId !== newId) {
      caseStatements.push(`WHEN ${oldId} THEN ${newId}`);
    }
  }
  
  if (caseStatements.length === 0) {
    console.log('   ℹ️  No category IDs to update (all mappings are no-ops)\n');
    return;
  }

  const caseSql = caseStatements.join(' ');
  
  console.log(`📊 Updating ${caseStatements.length} category ID mappings...\n`);

  // Update Merchant table using raw SQL
  const merchantResult = await prisma.$executeRawUnsafe(`
    UPDATE "Merchant"
    SET "categoryId" = CASE "categoryId"
      ${caseSql}
      ELSE "categoryId"
    END
    WHERE "categoryId" IN (${Object.keys(CATEGORY_ID_MAPPING).map(k => Number(k)).filter(id => CATEGORY_ID_MAPPING[id] !== id).join(', ')})
  `);
  
  console.log(`   ✓ Updated ${merchantResult} merchants`);

  // Update MerchantGlobal table using raw SQL
  const merchantGlobalResult = await prisma.$executeRawUnsafe(`
    UPDATE "MerchantGlobal"
    SET "categoryId" = CASE "categoryId"
      ${caseSql}
      ELSE "categoryId"
    END
    WHERE "categoryId" IN (${Object.keys(CATEGORY_ID_MAPPING).map(k => Number(k)).filter(id => CATEGORY_ID_MAPPING[id] !== id).join(', ')})
  `);
  
  console.log(`   ✓ Updated ${merchantGlobalResult} global merchants`);

  // Show detailed mapping summary
  console.log('\n📋 Mapping details:');
  for (const [oldIdStr, newId] of Object.entries(CATEGORY_ID_MAPPING)) {
    const oldId = Number(oldIdStr);
    if (oldId !== newId) {
      const merchantCount = await prisma.merchant.count({
        where: { categoryId: newId },
      });
      const merchantGlobalCount = await prisma.merchantGlobal.count({
        where: { categoryId: newId },
      });
      console.log(`   ${oldId} → ${newId} (${merchantCount} merchants, ${merchantGlobalCount} global)`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('\n✅ Category ID fix complete!\n');
  
  // Show summary
  const merchantSummary = await prisma.merchant.groupBy({
    by: ['categoryId'],
    _count: true,
  });
  
  const merchantGlobalSummary = await prisma.merchantGlobal.groupBy({
    by: ['categoryId'],
    _count: true,
  });
  
  console.log('📊 Summary:');
  console.log(`   Total merchants: ${merchantSummary.reduce((sum, g) => sum + g._count, 0)}`);
  console.log(`   Total global merchants: ${merchantGlobalSummary.reduce((sum, g) => sum + g._count, 0)}`);
  console.log(`   Unique category IDs in use: ${new Set([...merchantSummary.map(g => g.categoryId), ...merchantGlobalSummary.map(g => g.categoryId)]).size}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Fix failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
