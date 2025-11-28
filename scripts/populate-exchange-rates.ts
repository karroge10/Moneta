/**
 * Populate exchange rates for November 27, 2025.
 * Uses exchangerate-api.com free tier for current rates.
 * Since the date is in the future, uses latest available rates.
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

// Common currency codes we want to support
const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'RUB', 'GEL', 'TRY', 'AMD', 'KZT', 'UAH'];

interface ExchangeRateResponse {
  rates: Record<string, number>;
  base: string;
  date?: string;
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

async function populateRates() {
  try {
    console.log('💱 Starting exchange rate population...\n');
    console.log(`Target date: ${TARGET_DATE.toISOString().split('T')[0]}\n`);

    // Get all currencies from database
    const currencies = await prisma.currency.findMany({
      orderBy: { alias: 'asc' },
    });

    if (currencies.length === 0) {
      throw new Error('No currencies found in database. Please seed currencies first.');
    }

    console.log(`Found ${currencies.length} currencies in database:\n`);
    currencies.forEach(c => {
      console.log(`  - ${c.name} (${c.alias}) - ID: ${c.id}`);
    });
    console.log('');

    // Filter to currencies we want to populate rates for
    const currenciesToProcess = currencies.filter(c => 
      COMMON_CURRENCIES.includes(c.alias.toUpperCase())
    );

    if (currenciesToProcess.length === 0) {
      throw new Error('No matching currencies found. Please ensure GEL, RUB, USD, EUR, etc. are seeded.');
    }

    console.log(`Processing ${currenciesToProcess.length} currencies for rate population...\n`);

    let totalRatesCreated = 0;
    let totalRatesUpdated = 0;

    // For each currency, fetch rates and create exchange rate records
    for (const baseCurrency of currenciesToProcess) {
      console.log(`\n📊 Processing ${baseCurrency.name} (${baseCurrency.alias})...`);
      
      const rateData = await fetchExchangeRates(baseCurrency.alias);
      
      if (!rateData || !rateData.rates) {
        console.log(`  ⚠️  Skipping ${baseCurrency.alias} - no rate data available`);
        continue;
      }

      // Create rates for all quote currencies we care about
      for (const quoteCurrency of currenciesToProcess) {
        // Skip same currency (1:1 rate already handled)
        if (baseCurrency.id === quoteCurrency.id) {
          continue;
        }

        const rateValue = rateData.rates[quoteCurrency.alias];
        
        if (rateValue === undefined || !Number.isFinite(rateValue)) {
          console.log(`  ⚠️  No rate found for ${baseCurrency.alias} → ${quoteCurrency.alias}`);
          continue;
        }

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
        }
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Exchange rate population complete!`);
    console.log(`   Created: ${totalRatesCreated} rates`);
    console.log(`   Updated: ${totalRatesUpdated} rates`);
    console.log(`   Total: ${totalRatesCreated + totalRatesUpdated} rates`);
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('❌ Error populating exchange rates:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

populateRates();

