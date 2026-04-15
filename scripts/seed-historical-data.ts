/**
 * Seed historical expense and income data
 * Expenses: July 2023 - September 2024 (in GEL)
 * Income: January 2023 - January 2026 (in RUB)
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

// User ID to seed data for
const USER_ID = 1;

// Currency IDs (from imported CSV)
const GEL_CURRENCY_ID = 2;  // Georgian Lari
const RUB_CURRENCY_ID = 5;  // Russian Ruble

// Map Russian category names to English database category names
const CATEGORY_MAP: Record<string, string> = {
  'Продукты': 'Groceries',
  'Рестораны': 'Restaurants',
  'Развлечения_Фитнесс': 'Entertainment',  // Could also be Fitness
  'Техника': 'Technology',
  'Мебель_посуда': 'Furniture',
  'Одежда': 'Clothes',
  'Транспорт': 'Transportation',
  'Аренда': 'Rent',
  'Интернет': 'Home Internet',
  'Телефон': 'Mobile Data',
  'Электричество': 'Electricity Bill',
  'Вода': 'Water Bill',
  'Газ': 'Heating Bill',
  'Лифт_Уборка': 'Elevator & Cleaning Bill',
  'Банк': 'Subscriptions',
  'Другое': 'Other',
  'Налоги_РФ': 'Taxes',
  'Налоги_Грузия': 'Taxes',
};

// Expense data (amounts in GEL)
const EXPENSE_DATA = [
  {
    "month": "2023-07",
    "Продукты": 530,
    "Рестораны": 70,
    "Развлечения_Фитнесс": 61,
    "Техника": 913,
    "Мебель_посуда": 225,
    "Одежда": 0,
    "Транспорт": 70,
    "Аренда": 2844,
    "Интернет": 0,
    "Телефон": 60,
    "Электричество": 14,
    "Вода": 10,
    "Газ": 0,
    "Лифт_Уборка": 0,
    "Банк": 12,
    "Другое": 170,
    "Налоги_РФ": 102,
    "Налоги_Грузия": 0,
  },
  {
    "month": "2023-08",
    "Продукты": 405.32,
    "Рестораны": 364.39,
    "Развлечения_Фитнесс": 106,
    "Техника": 0,
    "Мебель_посуда": 0,
    "Одежда": 395,
    "Транспорт": 108.78,
    "Аренда": 1534,
    "Интернет": 40,
    "Телефон": 52,
    "Электричество": 87,
    "Вода": 13,
    "Газ": 4,
    "Лифт_Уборка": 27,
    "Банк": 12,
    "Другое": 248.48,
    "Налоги_РФ": 97,
    "Налоги_Грузия": 0,
  },
  {
    "month": "2023-09",
    "Продукты": 359.17,
    "Рестораны": 231.35,
    "Развлечения_Фитнесс": 22,
    "Техника": 0,
    "Мебель_посуда": 0,
    "Одежда": 65.49,
    "Транспорт": 48.4,
    "Аренда": 1179,
    "Интернет": 40,
    "Телефон": 18,
    "Электричество": 55.32,
    "Вода": 12,
    "Газ": 3.78,
    "Лифт_Уборка": 27,
    "Банк": 12,
    "Другое": 0,
    "Налоги_РФ": 98,
    "Налоги_Грузия": 0,
  },
  {
    "month": "2023-10",
    "Продукты": 359.47,
    "Рестораны": 174.84,
    "Развлечения_Фитнесс": 22,
    "Техника": 0,
    "Мебель_посуда": 0,
    "Одежда": 50,
    "Транспорт": 27.3,
    "Аренда": 1220,
    "Интернет": 40,
    "Телефон": 18,
    "Электричество": 44.13,
    "Вода": 14,
    "Газ": 29.68,
    "Лифт_Уборка": 27,
    "Банк": 12,
    "Другое": 34.6,
    "Налоги_РФ": 96,
    "Налоги_Грузия": 0,
  },
  {
    "month": "2023-11",
    "Продукты": 429.76,
    "Рестораны": 242.82,
    "Развлечения_Фитнесс": 15,
    "Техника": 1250,
    "Мебель_посуда": 204,
    "Одежда": 0,
    "Транспорт": 66.8,
    "Аренда": 1216,
    "Интернет": 40,
    "Телефон": 32,
    "Электричество": 63,
    "Вода": 25,
    "Газ": 55,
    "Лифт_Уборка": 27,
    "Банк": 12,
    "Другое": 271.64,
    "Налоги_РФ": 100,
    "Налоги_Грузия": 0,
  },
  {
    "month": "2023-12",
    "Продукты": 682.32,
    "Рестораны": 326.03,
    "Развлечения_Фитнесс": 0,
    "Техника": 27,
    "Мебель_посуда": 169.7,
    "Одежда": 651.5,
    "Транспорт": 119.5,
    "Аренда": 1330,
    "Интернет": 40,
    "Телефон": 17,
    "Электричество": 64.22,
    "Вода": 10,
    "Газ": 122,
    "Лифт_Уборка": 27,
    "Банк": 12,
    "Другое": 79,
    "Налоги_РФ": 200,
    "Налоги_Грузия": 0,
  },
  {
    "month": "2024-01",
    "Продукты": 530.56,
    "Рестораны": 262.16,
    "Развлечения_Фитнесс": 0,
    "Техника": 25,
    "Мебель_посуда": 58.31,
    "Одежда": 0,
    "Транспорт": 28.5,
    "Аренда": 1064,
    "Интернет": 40,
    "Телефон": 19,
    "Электричество": 51.78,
    "Вода": 3,
    "Газ": 151.12,
    "Лифт_Уборка": 27,
    "Банк": 12,
    "Другое": 244.64,
    "Налоги_РФ": 200,
    "Налоги_Грузия": 0,
  },
  {
    "month": "2024-02",
    "Продукты": 582.25,
    "Рестораны": 615.91,
    "Развлечения_Фитнесс": 1560.45,
    "Техника": 0,
    "Мебель_посуда": 0,
    "Одежда": 0,
    "Транспорт": 42.6,
    "Аренда": 1330,
    "Интернет": 40,
    "Телефон": 18,
    "Электричество": 50.29,
    "Вода": 5,
    "Газ": 118.2,
    "Лифт_Уборка": 27,
    "Банк": 12,
    "Другое": 109.76,
    "Налоги_РФ": 209,
    "Налоги_Грузия": 0,
  },
  {
    "month": "2024-03",
    "Продукты": 530.41,
    "Рестораны": 836.96,
    "Развлечения_Фитнесс": 246,
    "Техника": 191,
    "Мебель_посуда": 133.25,
    "Одежда": 333.5,
    "Транспорт": 99.1,
    "Аренда": 1064,
    "Интернет": 40,
    "Телефон": 19,
    "Электричество": 79.76,
    "Вода": 0,
    "Газ": 106.32,
    "Лифт_Уборка": 27,
    "Банк": 12,
    "Другое": 715.78,
    "Налоги_РФ": 296,
    "Налоги_Грузия": 0,
  },
  {
    "month": "2024-04",
    "Продукты": 453.09,
    "Рестораны": 218.18,
    "Развлечения_Фитнесс": 64.4,
    "Техника": 1150,
    "Мебель_посуда": 20,
    "Одежда": 0,
    "Транспорт": 43,
    "Аренда": 1206,
    "Интернет": 40,
    "Телефон": 27,
    "Электричество": 44,
    "Вода": 14,
    "Газ": 61.53,
    "Лифт_Уборка": 27,
    "Банк": 12,
    "Другое": 301.88,
    "Налоги_РФ": 285,
    "Налоги_Грузия": 0,
  },
  {
    "month": "2024-05",
    "Продукты": 744.734,
    "Рестораны": 518.06,
    "Развлечения_Фитнесс": 119,
    "Техника": 0,
    "Мебель_посуда": 8.8,
    "Одежда": 105,
    "Транспорт": 34.2,
    "Аренда": 1240,
    "Интернет": 40,
    "Телефон": 18,
    "Электричество": 0,
    "Вода": 0,
    "Газ": 31.84,
    "Лифт_Уборка": 27,
    "Банк": 12,
    "Другое": 9.444,
    "Налоги_РФ": 285,
    "Налоги_Грузия": 0,
  },
  {
    "month": "2024-06",
    "Продукты": 545.38,
    "Рестораны": 973.02,
    "Развлечения_Фитнесс": 95.4,
    "Техника": 0,
    "Мебель_посуда": 25,
    "Одежда": 0,
    "Транспорт": 256.59,
    "Аренда": 1541,
    "Интернет": 40,
    "Телефон": 22.65,
    "Электричество": 67,
    "Вода": 7,
    "Газ": 27,
    "Лифт_Уборка": 27,
    "Банк": 12,
    "Другое": 1222,
    "Налоги_РФ": 285,
    "Налоги_Грузия": 0,
  },
  {
    "month": "2024-07",
    "Продукты": 730.58,
    "Рестораны": 505.12,
    "Развлечения_Фитнесс": 130,
    "Техника": 106,
    "Мебель_посуда": 70,
    "Одежда": 77.8,
    "Транспорт": 91.95,
    "Аренда": 2538,
    "Интернет": 38,
    "Телефон": 19,
    "Электричество": 82.17,
    "Вода": 7,
    "Газ": 11.45,
    "Лифт_Уборка": 12.5,
    "Банк": 15,
    "Другое": 333.5,
    "Налоги_РФ": 400,
    "Налоги_Грузия": 0,
  },
  {
    "month": "2024-08",
    "Продукты": 485.32,
    "Рестораны": 353.14,
    "Развлечения_Фитнесс": 113,
    "Техника": 0,
    "Мебель_посуда": 109,
    "Одежда": 66.3,
    "Транспорт": 512.25,
    "Аренда": 1525,
    "Интернет": 37,
    "Телефон": 18,
    "Электричество": 99.56,
    "Вода": 0,
    "Газ": 0,
    "Лифт_Уборка": 10,
    "Банк": 12,
    "Другое": 364.26,
    "Налоги_РФ": 390,
    "Налоги_Грузия": 0,
  },
  {
    "month": "2024-09",
    "Продукты": 399.76,
    "Рестораны": 1037,
    "Развлечения_Фитнесс": 125,
    "Техника": 20,
    "Мебель_посуда": 0,
    "Одежда": 211,
    "Транспорт": 457.7,
    "Аренда": 1210,
    "Интернет": 37,
    "Телефон": 12,
    "Электричество": 43.25,
    "Вода": 0,
    "Газ": 0,
    "Лифт_Уборка": 10,
    "Банк": 12,
    "Другое": 118.35,
    "Налоги_РФ": 0,
    "Налоги_Грузия": 0,
  },
];

// Income data (amounts in RUB)
const INCOME_DATA = [
  { "month": "2023-01", "earned_rub": 50000 },
  { "month": "2023-02", "earned_rub": 50000 },
  { "month": "2023-03", "earned_rub": 50000 },
  { "month": "2023-04", "earned_rub": 90000 },
  { "month": "2023-05", "earned_rub": 90000 },
  { "month": "2023-06", "earned_rub": 90000 },
  { "month": "2023-07", "earned_rub": 90000 },
  { "month": "2023-08", "earned_rub": 90000 },
  { "month": "2023-09", "earned_rub": 90000 },
  { "month": "2023-10", "earned_rub": 90000 },
  { "month": "2023-11", "earned_rub": 82000 },
  { "month": "2023-12", "earned_rub": 125000 },
  { "month": "2024-01", "earned_rub": 125000 },
  { "month": "2024-02", "earned_rub": 125000 },
  { "month": "2024-03", "earned_rub": 125000 },
  { "month": "2024-04", "earned_rub": 125000 },
  { "month": "2024-05", "earned_rub": 125000 },
  { "month": "2024-06", "earned_rub": 125000 },
  { "month": "2024-07", "earned_rub": 140000 },
  { "month": "2024-08", "earned_rub": 140000 },
  { "month": "2024-09", "earned_rub": 140000 },
  { "month": "2024-10", "earned_rub": 140000 },
  { "month": "2024-11", "earned_rub": 140000 },
  { "month": "2024-12", "earned_rub": 140000 },
  { "month": "2025-01", "earned_rub": 155000 },
  { "month": "2025-02", "earned_rub": 155000 },
  { "month": "2025-03", "earned_rub": 155000 },
  { "month": "2025-04", "earned_rub": 155000 },
  { "month": "2025-05", "earned_rub": 155000 },
  { "month": "2025-06", "earned_rub": 155000 },
  { "month": "2025-07", "earned_rub": 155000 },
  { "month": "2025-08", "earned_rub": 175000 },
  { "month": "2025-09", "earned_rub": 175000 },
  { "month": "2025-10", "earned_rub": 175000 },
  { "month": "2025-11", "earned_rub": 175000 },
  { "month": "2025-12", "earned_rub": 175000 },
  { "month": "2026-01", "earned_rub": 175000 },
];

async function main() {
  console.log('🚀 Seeding historical data...\n');
  console.log('='.repeat(50) + '\n');

  // Check if user exists
  const user = await prisma.user.findUnique({ where: { id: USER_ID } });
  if (!user) {
    console.log(`❌ User with ID ${USER_ID} not found!`);
    console.log('   Please sign in first to create your user account.\n');
    return;
  }
  console.log(`✓ Found user: ${user.clerkUserId ?? `ID ${user.id}`}\n`);

  // Get category name -> ID mapping
  const categories = await prisma.category.findMany();
  const categoryNameToId = new Map(categories.map(c => [c.name, c.id]));
  
  console.log('📁 Category mappings:');
  for (const [ruName, enName] of Object.entries(CATEGORY_MAP)) {
    const categoryId = categoryNameToId.get(enName);
    if (categoryId) {
      console.log(`   ${ruName} → ${enName} (ID: ${categoryId})`);
    } else {
      console.log(`   ⚠️ ${ruName} → ${enName} (NOT FOUND!)`);
    }
  }
  console.log();

  // Get Salary category for income
  const salaryCategory = categories.find(c => c.name === 'Salary');
  if (!salaryCategory) {
    console.log('❌ Salary category not found! Cannot seed income data.');
    return;
  }
  console.log(`✓ Salary category found (ID: ${salaryCategory.id})\n`);

  // Verify currencies exist
  const gelCurrency = await prisma.currency.findUnique({ where: { id: GEL_CURRENCY_ID } });
  const rubCurrency = await prisma.currency.findUnique({ where: { id: RUB_CURRENCY_ID } });
  
  if (!gelCurrency) {
    console.log(`❌ GEL currency (ID: ${GEL_CURRENCY_ID}) not found!`);
    return;
  }
  if (!rubCurrency) {
    console.log(`❌ RUB currency (ID: ${RUB_CURRENCY_ID}) not found!`);
    return;
  }
  console.log(`✓ Currencies: GEL (${gelCurrency.symbol}), RUB (${rubCurrency.symbol})\n`);

  // =========================================================================
  // SEED EXPENSES
  // =========================================================================
  console.log('💸 Seeding expenses (GEL)...');
  let expenseCount = 0;
  let expenseTotal = 0;

  for (const monthData of EXPENSE_DATA) {
    const [year, month] = monthData.month.split('-').map(Number);
    // Set date to 15th of the month (middle of month)
    const date = new Date(year, month - 1, 15, 12, 0, 0);

    for (const [ruCategory, amount] of Object.entries(monthData)) {
      if (ruCategory === 'month' || ruCategory === 'Всего') continue;
      if (amount === 0) continue;

      const enCategory = CATEGORY_MAP[ruCategory];
      if (!enCategory) {
        console.log(`   ⚠️ Unknown category: ${ruCategory}`);
        continue;
      }

      const categoryId = categoryNameToId.get(enCategory);
      if (!categoryId) {
        console.log(`   ⚠️ Category not in DB: ${enCategory}`);
        continue;
      }

      await prisma.transaction.create({
        data: {
          userId: USER_ID,
          type: 'expense',
          amount: Number(amount),
          description: `${enCategory} - ${monthData.month}`,
          date: date,
          categoryId: categoryId,
          currencyId: GEL_CURRENCY_ID,
          source: 'historical_import',
        },
      });

      expenseCount++;
      expenseTotal += Number(amount);
    }
    console.log(`   ✓ ${monthData.month}: expenses seeded`);
  }

  console.log(`\n   📊 Total: ${expenseCount} expense transactions`);
  console.log(`   📊 Total amount: ₾${expenseTotal.toFixed(2)} GEL\n`);

  // =========================================================================
  // SEED INCOME
  // =========================================================================
  console.log('💰 Seeding income (RUB)...');
  let incomeCount = 0;
  let incomeTotal = 0;

  for (const monthData of INCOME_DATA) {
    const [year, month] = monthData.month.split('-').map(Number);
    // Set date to 1st of the month (payday)
    const date = new Date(year, month - 1, 1, 12, 0, 0);

    await prisma.transaction.create({
      data: {
        userId: USER_ID,
        type: 'income',
        amount: monthData.earned_rub,
        description: `Salary - ${monthData.month}`,
        date: date,
        categoryId: salaryCategory.id,
        currencyId: RUB_CURRENCY_ID,
        source: 'historical_import',
      },
    });

    incomeCount++;
    incomeTotal += monthData.earned_rub;
    console.log(`   ✓ ${monthData.month}: ₽${monthData.earned_rub.toLocaleString()}`);
  }

  console.log(`\n   📊 Total: ${incomeCount} income transactions`);
  console.log(`   📊 Total amount: ₽${incomeTotal.toLocaleString()} RUB\n`);

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('='.repeat(50));
  console.log('\n✅ Historical data seeded successfully!\n');
  console.log('Summary:');
  console.log(`  • ${expenseCount} expense transactions (₾${expenseTotal.toFixed(2)} GEL)`);
  console.log(`  • ${incomeCount} income transactions (₽${incomeTotal.toLocaleString()} RUB)`);
  console.log(`  • Total: ${expenseCount + incomeCount} transactions\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
