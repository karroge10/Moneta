import { db } from './db';
import { startOfUtcDay, toDateKey } from './dates';
import { fetchHistoricalRate } from './currency-conversion';


export async function updateDailyExchangeRates(): Promise<{ success: boolean; updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;
    const now = new Date();
    const today = startOfUtcDay(now);
    const dateStr = toDateKey(today);

    try {
        
        const currencies = await db.currency.findMany({
            select: { id: true, alias: true }
        });

        if (currencies.length === 0) {
            return { success: true, updated: 0, errors: [] };
        }

        
        
        const baseCurrency = currencies.find(c => c.alias.toLowerCase() === 'usd');

        if (!baseCurrency) {
            console.warn('[currency-update] USD currency not found, skipping exchange rate update');
            return { success: true, updated: 0, errors: ['USD currency not configured'] };
        }

        
        const targetCurrencies = currencies.filter(c => c.id !== baseCurrency.id);

        for (const targetCurrency of targetCurrencies) {
            try {
                
                const existing = await db.exchangeRate.findFirst({
                    where: {
                        baseCurrencyId: baseCurrency.id,
                        quoteCurrencyId: targetCurrency.id,
                        rateDate: today,
                    }
                });

                if (existing) {
                    console.log(`[currency-update] Rate already exists for ${baseCurrency.alias}->${targetCurrency.alias} on ${dateStr}`);
                    continue;
                }

                
                const baseAlias = baseCurrency.alias.toUpperCase();
                const targetAlias = targetCurrency.alias.toUpperCase();
                const rate = await fetchHistoricalRate(baseAlias, targetAlias, today);

                if (!rate) {
                    errors.push(`No rate data for ${baseCurrency.alias}->${targetCurrency.alias}`);
                    continue;
                }

                
                await db.exchangeRate.create({
                    data: {
                        baseCurrencyId: baseCurrency.id,
                        quoteCurrencyId: targetCurrency.id,
                        rate,
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
