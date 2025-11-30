/**
 * Seed currencies and populate exchange rates for November 27, 2025.
 * Creates common currencies if they don't exist, then fetches and stores exchange rates.
 */

import { Prisma, PrismaClient } from '@prisma/client';
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

// Target date: November 27, 2025
const TARGET_DATE = new Date('2025-11-27T00:00:00Z');

// Currencies to seed with their symbols
const CURRENCIES_TO_SEED = [
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

interface ExchangeRateResponse {
  rates: Record<string, number>;
  base: string;
  date?: string;
}

async function seedCurrencies() {
  console.log('💱 Seeding currencies...\n');
  
  const createdCurrencies: Array<{ id: number; alias: string }> = [];
  let createdCount = 0;
  let existingCount = 0;

  for (const currency of CURRENCIES_TO_SEED) {
    try {
      const existing = await prisma.currency.findFirst({
        where: { alias: currency.alias },
      });

      if (existing) {
        existingCount++;
        createdCurrencies.push({ id: existing.id, alias: existing.alias });
        console.log(`  ✓ ${currency.name} (${currency.alias}) already exists - ID: ${existing.id}`);
      } else {
        const newCurrency = await prisma.currency.create({
          data: currency,
        });
        createdCount++;
        createdCurrencies.push({ id: newCurrency.id, alias: newCurrency.alias });
        console.log(`  ✨ Created ${currency.name} (${currency.alias}) - ID: ${newCurrency.id}`);
      }
    } catch (error) {
      console.error(`  ❌ Error creating ${currency.name}:`, error);
    }
  }

  console.log(`\n✅ Currency seeding complete!`);
  console.log(`   Created: ${createdCount} currencies`);
  console.log(`   Existing: ${existingCount} currencies`);
  console.log(`   Total: ${createdCurrencies.length} currencies\n`);

  return createdCurrencies;
}

async function fetchExchangeRates(baseCurrency: string): Promise<ExchangeRateResponse | null> {
  try {
    // Use exchangerate-api.com free tier (no API key needed)
    // For future dates, we use the latest available rates
    const url = `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`;
    
    console.log(`  Fetching rates for base currency: ${baseCurrency}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`  ⚠️  Failed to fetch rates for ${baseCurrency}: ${response.statusText}`);
      return null;
    }
    
    const data = await response.json() as ExchangeRateResponse;
    return data;
  } catch (error) {
    console.warn(`  ⚠️  Error fetching rates for ${baseCurrency}:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function populateExchangeRates(currencies: Array<{ id: number; alias: string }>) {
  console.log('💱 Populating exchange rates...\n');
  console.log(`Target date: ${TARGET_DATE.toISOString().split('T')[0]}\n`);

  let totalRatesCreated = 0;
  let totalRatesUpdated = 0;
  let totalRatesSkipped = 0;

  // For each currency, fetch rates and create exchange rate records
  for (const baseCurrency of currencies) {
    const currencyName = CURRENCIES_TO_SEED.find(c => c.alias === baseCurrency.alias)?.name || baseCurrency.alias;
    console.log(`\n📊 Processing ${currencyName} (${baseCurrency.alias})...`);
    
    const rateData = await fetchExchangeRates(baseCurrency.alias);
    
    if (!rateData || !rateData.rates) {
      console.log(`  ⚠️  Skipping ${baseCurrency.alias} - no rate data available`);
      totalRatesSkipped++;
      continue;
    }

    // Create rates for all quote currencies
    for (const quoteCurrency of currencies) {
      // Skip same currency (1:1 rate)
      if (baseCurrency.id === quoteCurrency.id) {
        continue;
      }

      const rateValue = rateData.rates[quoteCurrency.alias];
      
      if (rateValue === undefined || !Number.isFinite(rateValue)) {
        console.log(`  ⚠️  No rate found for ${baseCurrency.alias} → ${quoteCurrency.alias}`);
        totalRatesSkipped++;
        continue;
      }

      await saveRate(baseCurrency, quoteCurrency, rateValue);
    }

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async function saveRate(
    baseCurrency: { id: number; alias: string },
    quoteCurrency: { id: number; alias: string },
    rateValue: number
  ) {
    try {
      // Check if rate already exists
      const existing = await prisma.exchangeRate.findUnique({
        where: {
          baseCurrencyId_quoteCurrencyId_rateDate: {
            baseCurrencyId: baseCurrency.id,
            quoteCurrencyId: quoteCurrency.id,
            rateDate: TARGET_DATE,
          },
        },
      });

      const wasCreated = !existing;

      await prisma.exchangeRate.upsert({
        where: {
          baseCurrencyId_quoteCurrencyId_rateDate: {
            baseCurrencyId: baseCurrency.id,
            quoteCurrencyId: quoteCurrency.id,
            rateDate: TARGET_DATE,
          },
        },
        update: {
          rate: new Prisma.Decimal(rateValue),
        },
        create: {
          baseCurrencyId: baseCurrency.id,
          quoteCurrencyId: quoteCurrency.id,
          rate: new Prisma.Decimal(rateValue),
          rateDate: TARGET_DATE,
        },
      });

      if (wasCreated) {
        totalRatesCreated++;
        console.log(`  ✓ Created: ${baseCurrency.alias} → ${quoteCurrency.alias} = ${rateValue.toFixed(4)}`);
      } else {
        totalRatesUpdated++;
        console.log(`  ↻ Updated: ${baseCurrency.alias} → ${quoteCurrency.alias} = ${rateValue.toFixed(4)}`);
      }
    } catch (error) {
      console.error(`  ❌ Error saving rate ${baseCurrency.alias} → ${quoteCurrency.alias}:`, error);
      totalRatesSkipped++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Exchange rate population complete!`);
  console.log(`   Created: ${totalRatesCreated} rates`);
  console.log(`   Updated: ${totalRatesUpdated} rates`);
  console.log(`   Skipped: ${totalRatesSkipped} rates`);
  console.log(`   Total: ${totalRatesCreated + totalRatesUpdated} rates`);
  console.log('='.repeat(60) + '\n');
}

async function main() {
  try {
    console.log('🚀 Starting currency and exchange rate seeding...\n');
    console.log('='.repeat(60) + '\n');

    // Step 1: Seed currencies
    const currencies = await seedCurrencies();

    if (currencies.length === 0) {
      throw new Error('No currencies available. Cannot populate exchange rates.');
    }

    // Step 2: Populate exchange rates
    await populateExchangeRates(currencies);

    console.log('🎉 All done! Currencies and exchange rates are ready.\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();

