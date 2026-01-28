/**
 * Main seed script - runs automatically after prisma migrate reset
 * Populates: Categories, Currencies, Languages, Exchange Rates, Merchants
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
if (!process.env.DATABASE_URL) {
  config({ path: resolve(process.cwd(), '.env') });
}

const prisma = new PrismaClient();

// ============================================================================
// CATEGORIES
// ============================================================================
const CATEGORIES = [
  { name: 'Groceries', icon: 'Cart', color: '#AC66DA', type: 'expense' },
  { name: 'Restaurants', icon: 'PizzaSlice', color: '#D93F3F', type: 'expense' },
  { name: 'Entertainment', icon: 'Tv', color: '#74C648', type: 'expense' },
  { name: 'Technology', icon: 'Tv', color: '#74C648', type: 'expense' },
  { name: 'Furniture', icon: 'Sofa', color: '#74C648', type: 'expense' },
  { name: 'Clothes', icon: 'Shirt', color: '#AC66DA', type: 'expense' },
  { name: 'Transportation', icon: 'Tram', color: '#74C648', type: 'expense' },
  { name: 'Rent', icon: 'City', color: '#74C648', type: 'expense' },
  { name: 'Home Internet', icon: 'Wifi', color: '#AC66DA', type: 'expense' },
  { name: 'Mobile Data', icon: 'SmartphoneDevice', color: '#D93F3F', type: 'expense' },
  { name: 'Electricity Bill', icon: 'Flash', color: '#AC66DA', type: 'expense' },
  { name: 'Water Bill', icon: 'Droplet', color: '#AC66DA', type: 'expense' },
  { name: 'Heating Bill', icon: 'FireFlame', color: '#D93F3F', type: 'expense' },
  { name: 'Elevator & Cleaning Bill', icon: 'City', color: '#74C648', type: 'expense' },
  { name: 'Subscriptions', icon: 'RefreshDouble', color: '#D93F3F', type: 'expense' },
  { name: 'Other', icon: 'HelpCircle', color: '#AC66DA', type: null },
  { name: 'Taxes', icon: 'Cash', color: '#74C648', type: 'expense' },
  { name: 'Gifts', icon: 'Gift', color: '#AC66DA', type: null },
  { name: 'Fitness', icon: 'Gym', color: '#74C648', type: 'expense' },
  // Income categories
  { name: 'Salary', icon: 'Wallet', color: '#74C648', type: 'income' },
  { name: 'Freelance', icon: 'LotOfCash', color: '#74C648', type: 'income' },
  { name: 'Investment Returns', icon: 'StatUp', color: '#74C648', type: 'income' },
  { name: 'Refunds', icon: 'Cash', color: '#74C648', type: 'income' },
  { name: 'Transfers', icon: 'LotOfCash', color: '#AC66DA', type: null },
];

// ============================================================================
// CURRENCIES
// ============================================================================
const CURRENCIES = [
  { name: 'Georgian Lari', symbol: '₾', alias: 'GEL' },
  { name: 'US Dollar', symbol: '$', alias: 'USD' },
  { name: 'Euro', symbol: '€', alias: 'EUR' },
  { name: 'British Pound', symbol: '£', alias: 'GBP' },
  { name: 'Russian Ruble', symbol: '₽', alias: 'RUB' },
  { name: 'Turkish Lira', symbol: '₺', alias: 'TRY' },
  { name: 'Armenian Dram', symbol: '֏', alias: 'AMD' },
  { name: 'Kazakhstani Tenge', symbol: '₸', alias: 'KZT' },
  { name: 'Ukrainian Hryvnia', symbol: '₴', alias: 'UAH' },
  { name: 'Japanese Yen', symbol: '¥', alias: 'JPY' },
  { name: 'Chinese Yuan', symbol: '¥', alias: 'CNY' },
  { name: 'Swiss Franc', symbol: 'Fr', alias: 'CHF' },
  { name: 'Canadian Dollar', symbol: 'C$', alias: 'CAD' },
  { name: 'Australian Dollar', symbol: 'A$', alias: 'AUD' },
  { name: 'Polish Zloty', symbol: 'zł', alias: 'PLN' },
  { name: 'Swedish Krona', symbol: 'kr', alias: 'SEK' },
  { name: 'Norwegian Krone', symbol: 'kr', alias: 'NOK' },
  { name: 'Danish Krone', symbol: 'kr', alias: 'DKK' },
  { name: 'Indian Rupee', symbol: '₹', alias: 'INR' },
  { name: 'South Korean Won', symbol: '₩', alias: 'KRW' },
];

// ============================================================================
// LANGUAGES
// ============================================================================
const LANGUAGES = [
  { name: 'English', alias: 'en' },
  { name: 'Georgian', alias: 'ka' },
  { name: 'Russian', alias: 'ru' },
];

// ============================================================================
// MERCHANTS (Global merchant-to-category mappings)
// ============================================================================
const MERCHANTS: Array<{ pattern: string; category: string }> = [
  // Groceries
  { pattern: 'carrefour', category: 'Groceries' },
  { pattern: 'spar', category: 'Groceries' },
  { pattern: 'goodwill', category: 'Groceries' },
  { pattern: 'nikora', category: 'Groceries' },
  { pattern: 'smart', category: 'Groceries' },
  { pattern: 'magnit', category: 'Groceries' },
  { pattern: 'whole foods', category: 'Groceries' },
  { pattern: 'trader joe', category: 'Groceries' },
  { pattern: 'costco', category: 'Groceries' },
  { pattern: 'walmart', category: 'Groceries' },
  // Restaurants
  { pattern: 'starbucks', category: 'Restaurants' },
  { pattern: 'mcdonalds', category: 'Restaurants' },
  { pattern: 'subway', category: 'Restaurants' },
  { pattern: 'dominos', category: 'Restaurants' },
  { pattern: 'pizza hut', category: 'Restaurants' },
  { pattern: 'kfc', category: 'Restaurants' },
  { pattern: 'burger king', category: 'Restaurants' },
  { pattern: 'dunkin', category: 'Restaurants' },
  { pattern: 'chipotle', category: 'Restaurants' },
  { pattern: 'wendys', category: 'Restaurants' },
  // Transportation
  { pattern: 'uber', category: 'Transportation' },
  { pattern: 'lyft', category: 'Transportation' },
  { pattern: 'bolt', category: 'Transportation' },
  { pattern: 'yandex taxi', category: 'Transportation' },
  { pattern: 'metro', category: 'Transportation' },
  { pattern: 'shell', category: 'Transportation' },
  { pattern: 'chevron', category: 'Transportation' },
  { pattern: 'exxon', category: 'Transportation' },
  // Technology
  { pattern: 'apple', category: 'Technology' },
  { pattern: 'amazon', category: 'Technology' },
  { pattern: 'best buy', category: 'Technology' },
  { pattern: 'newegg', category: 'Technology' },
  // Subscriptions
  { pattern: 'netflix', category: 'Subscriptions' },
  { pattern: 'spotify', category: 'Subscriptions' },
  { pattern: 'hulu', category: 'Subscriptions' },
  { pattern: 'disney+', category: 'Subscriptions' },
  { pattern: 'youtube premium', category: 'Subscriptions' },
  { pattern: 'adobe', category: 'Subscriptions' },
  { pattern: 'microsoft 365', category: 'Subscriptions' },
  { pattern: 'chatgpt', category: 'Subscriptions' },
  { pattern: 'openai', category: 'Subscriptions' },
  // Fitness
  { pattern: 'gym', category: 'Fitness' },
  { pattern: 'fitness', category: 'Fitness' },
  { pattern: 'planet fitness', category: 'Fitness' },
  // Entertainment
  { pattern: 'cinema', category: 'Entertainment' },
  { pattern: 'theater', category: 'Entertainment' },
  { pattern: 'steam', category: 'Entertainment' },
  { pattern: 'playstation', category: 'Entertainment' },
  { pattern: 'xbox', category: 'Entertainment' },
];

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function seedCategories() {
  console.log('📁 Seeding categories...');
  let created = 0;

  for (const cat of CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name },
    });
    
    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { icon: cat.icon, color: cat.color, type: cat.type },
      });
    } else {
      await prisma.category.create({ data: cat });
    }
    created++;
  }

  console.log(`   ✓ ${created} categories ready\n`);
}

async function seedCurrencies() {
  console.log('💱 Seeding currencies...');
  const createdCurrencies: Array<{ id: number; alias: string }> = [];

  for (const currency of CURRENCIES) {
    const result = await prisma.currency.upsert({
      where: { id: -1 }, // Force create since there's no unique constraint on alias
      update: {},
      create: currency,
    }).catch(async () => {
      // If upsert fails, try findFirst + create pattern
      const existing = await prisma.currency.findFirst({
        where: { alias: currency.alias },
      });
      if (existing) return existing;
      return prisma.currency.create({ data: currency });
    });
    createdCurrencies.push({ id: result.id, alias: result.alias });
  }

  console.log(`   ✓ ${createdCurrencies.length} currencies ready\n`);
  return createdCurrencies;
}

async function seedLanguages() {
  console.log('🌐 Seeding languages...');
  let created = 0;

  for (const lang of LANGUAGES) {
    const existing = await prisma.language.findFirst({
      where: { alias: lang.alias },
    });
    if (!existing) {
      await prisma.language.create({ data: lang });
    }
    created++;
  }

  console.log(`   ✓ ${created} languages ready\n`);
}

async function seedExchangeRates(currencies: Array<{ id: number; alias: string }>) {
  console.log('📈 Fetching exchange rates...');
  
  const targetDate = new Date();
  targetDate.setHours(0, 0, 0, 0);
  
  let totalCreated = 0;

  // Only fetch for major currencies to avoid rate limiting
  const majorCurrencies = ['USD', 'EUR', 'GBP', 'GEL'];
  
  for (const baseCurrency of currencies.filter(c => majorCurrencies.includes(c.alias))) {
    try {
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${baseCurrency.alias}`
      );
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      for (const quoteCurrency of currencies) {
        if (baseCurrency.id === quoteCurrency.id) continue;
        
        const rate = data.rates?.[quoteCurrency.alias];
        if (!rate || !Number.isFinite(rate)) continue;

        const existingRate = await prisma.exchangeRate.findFirst({
          where: {
            baseCurrencyId: baseCurrency.id,
            quoteCurrencyId: quoteCurrency.id,
            rateDate: targetDate,
          },
        });
        
        if (existingRate) {
          await prisma.exchangeRate.update({
            where: { id: existingRate.id },
            data: { rate: new Prisma.Decimal(rate) },
          });
        } else {
          await prisma.exchangeRate.create({
            data: {
              baseCurrencyId: baseCurrency.id,
              quoteCurrencyId: quoteCurrency.id,
              rate: new Prisma.Decimal(rate),
              rateDate: targetDate,
            },
          });
        }
        totalCreated++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 300));
    } catch (error) {
      console.log(`   ⚠ Could not fetch rates for ${baseCurrency.alias}`);
    }
  }

  console.log(`   ✓ ${totalCreated} exchange rates ready\n`);
}

async function seedMerchants() {
  console.log('🏪 Seeding merchants...');
  
  // Get category name -> id map
  const categories = await prisma.category.findMany();
  const categoryMap = new Map(categories.map(c => [c.name, c.id]));
  
  let created = 0;
  
  for (const merchant of MERCHANTS) {
    const categoryId = categoryMap.get(merchant.category);
    if (!categoryId) continue;
    
    const existing = await prisma.merchantGlobal.findFirst({
      where: { namePattern: merchant.pattern },
    });
    
    if (existing) {
      await prisma.merchantGlobal.update({
        where: { id: existing.id },
        data: { categoryId },
      });
    } else {
      await prisma.merchantGlobal.create({
        data: { namePattern: merchant.pattern, categoryId },
      });
    }
    created++;
  }

  console.log(`   ✓ ${created} merchants ready\n`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n🚀 Starting database seed...\n');
  console.log('='.repeat(50) + '\n');

  // Seed in order (some depend on others)
  await seedCategories();
  const currencies = await seedCurrencies();
  await seedLanguages();
  await seedExchangeRates(currencies);
  await seedMerchants();

  console.log('='.repeat(50));
  console.log('\n✅ Database seeded successfully!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
