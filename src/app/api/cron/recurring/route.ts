import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processDueRecurringItems } from '@/lib/recurring-core';
import { updateDailyExchangeRates } from '@/lib/currency-update';
import { secretsMatch } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    // Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". An unset secret rejects every call.
    const authorization = request.headers.get('authorization');
    const expectedAuthorization = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : undefined;
    if (!secretsMatch(authorization, expectedAuthorization)) {
      console.error('[cron] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    
    console.log('[cron] Starting currency exchange rate update...');
    const currencyUpdateResult = await updateDailyExchangeRates();
    console.log('[cron] Currency update completed:', currencyUpdateResult);

    
    console.log('[cron] Starting users maintenance task...');
    const users = await db.user.findMany({
      include: {
        currency: true,
      }
    });

    let usersProcessed = 0;
    let transactionsCreated = 0;
    let snapshotsCreated = 0;
    const errors: string[] = [];

    const { getInvestmentsPortfolio } = await import('@/lib/investments');

    for (const user of users) {
      try {
        console.log(`[cron] Processing user ${user.id}...`);

        
        const beforeCount = await db.transaction.count({
          where: { userId: user.id },
        });
        await processDueRecurringItems(user.id, now);
        const afterCount = await db.transaction.count({
          where: { userId: user.id },
        });
        const created = afterCount - beforeCount;
        transactionsCreated += created;

        
        const userCurrency = user.currency || await db.currency.findFirst();
        if (userCurrency) {
          const portfolio = await getInvestmentsPortfolio(user.id, userCurrency);
          
          
          if (portfolio.totalValue > 0 || portfolio.totalCost > 0) {
            await db.portfolioSnapshot.create({
              data: {
                userId: user.id,
                totalValue: portfolio.totalValue,
                totalCost: portfolio.totalCost,
                totalPnl: portfolio.totalPnl,
                timestamp: now,
              }
            });
            snapshotsCreated += 1;
            console.log(`[cron] User ${user.id}: Saved snapshot. Value=${portfolio.totalValue.toFixed(2)}`);

            
            const { generatePerformanceAlerts } = await import('@/lib/notifications');
            await generatePerformanceAlerts(user.id, portfolio.totalValue, userCurrency.symbol);
          }
        }

        const { runUserScheduledNotifications } = await import('@/lib/cron-notifications');
        await runUserScheduledNotifications(user.id, now);

        usersProcessed += 1;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`User ${user.id}: ${errorMessage}`);
        console.error(`[cron] Error processing user ${user.id}:`, error);
      }
    }

    const summary = {
      success: true,
      timestamp: now.toISOString(),
      currencyUpdate: {
        updated: currencyUpdateResult.updated,
        errors: currencyUpdateResult.errors.length > 0 ? currencyUpdateResult.errors : undefined,
      },
      maintenance: {
        usersProcessed,
        transactionsCreated,
        snapshotsCreated,
        errors: errors.length > 0 ? errors : undefined,
      },
    };

    console.log(`[cron] Completed: ${usersProcessed} users processed, ${transactionsCreated} transactions created, ${snapshotsCreated} snapshots saved, ${currencyUpdateResult.updated} exchange rates updated`);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[cron] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process cron tasks',
      },
      { status: 500 }
    );
  }
}
