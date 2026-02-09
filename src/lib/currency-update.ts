import { db } from './db';
import { Prisma } from '@prisma/client';

/**
 * Fetches today's exchange rates for major currency pairs and stores them in the database.
 * This runs daily via the cron job to ensure we have current rates without API calls during user sessions.
 */
export async function updateDailyExchangeRates(): Promise<{ success: boolean; updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    try {
        // Fetch all currencies in the system
        const currencies = await db.currency.findMany({
            select: { id: true, alias: true }
        });

        if (currencies.length === 0) {
            return { success: true, updated: 0, errors: [] };
        }

        // Define major currency pairs to fetch
        // We'll fetch USD as base against all other currencies
        const baseCurrency = currencies.find(c => c.alias.toLowerCase() === 'usd');

        if (!baseCurrency) {
            console.warn('[currency-update] USD currency not found, skipping exchange rate update');
            return { success: true, updated: 0, errors: ['USD currency not configured'] };
        }

        // Get all other currencies
        const targetCurrencies = currencies.filter(c => c.id !== baseCurrency.id);

        for (const targetCurrency of targetCurrencies) {
            try {
                // Check if we already have a rate for today
                const existing = await db.exchangeRate.findFirst({
                    where: {
                        baseCurrencyId: baseCurrency.id,
                        quoteCurrencyId: targetCurrency.id,
                        rateDate: today,
                    }
                });

                if (existing) {
                    console.log(`[currency-update] Rate already exists for ${baseCurrency.alias}->${targetCurrency.alias} on ${today.toISOString().split('T')[0]}`);
                    continue;
                }

                // Fetch rate from Frankfurter API
                const dateStr = today.toISOString().split('T')[0];
                const url = `https://api.frankfurter.app/${dateStr}?from=${baseCurrency.alias}&to=${targetCurrency.alias}`;

                const res = await fetch(url);
                if (!res.ok) {
                    errors.push(`Failed to fetch ${baseCurrency.alias}->${targetCurrency.alias}: ${res.status}`);
                    continue;
                }

                const data = await res.json();
                const rate = data.rates?.[targetCurrency.alias.toUpperCase()];

                if (!rate) {
                    errors.push(`No rate data for ${baseCurrency.alias}->${targetCurrency.alias}`);
                    continue;
                }

                // Store in database
                await db.exchangeRate.create({
                    data: {
                        baseCurrencyId: baseCurrency.id,
                        quoteCurrencyId: targetCurrency.id,
                        rate: new Prisma.Decimal(rate),
                        rateDate: today,
                    }
                });

                console.log(`[currency-update] Stored rate: ${baseCurrency.alias}->${targetCurrency.alias} = ${rate} on ${dateStr}`);
                updated++;

            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                errors.push(`${baseCurrency.alias}->${targetCurrency.alias}: ${errorMsg}`);
                console.error(`[currency-update] Error fetching rate for ${baseCurrency.alias}->${targetCurrency.alias}:`, error);
            }
        }

        return { success: true, updated, errors };

    } catch (error) {
        console.error('[currency-update] Fatal error:', error);
        return {
            success: false,
            updated,
            errors: [error instanceof Error ? error.message : 'Fatal error during currency update']
        };
    }
}
