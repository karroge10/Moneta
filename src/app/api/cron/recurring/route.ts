import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processDueRecurringItems } from '@/app/api/recurring/route';
import { updateDailyExchangeRates } from '@/lib/currency-update';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/recurring
 * Vercel Cron endpoint that runs daily maintenance tasks:
 * 1. Processes recurring transactions for all users
 * 2. Updates daily exchange rates for currency conversions
 * 
 * Security: Verifies User-Agent is 'vercel-cron/1.0' (set by Vercel) OR
 * optional CRON_SECRET header (for manual testing).
 * 
 * Schedule: Configured in vercel.json to run daily at 2:00 AM UTC.
 */
export async function GET(request: NextRequest) {
  // Log immediately to verify function is being called
  console.log('[cron] Endpoint called at:', new Date().toISOString());
  console.log('[cron] Headers:', {
    userAgent: request.headers.get('user-agent'),
    cronSecret: request.headers.get('x-cron-secret') ? 'present' : 'missing',
  });

  try {
    // Security check: Vercel sets User-Agent to 'vercel-cron/1.0' for cron requests
    const userAgent = request.headers.get('user-agent') || '';
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    const isVercelCron = userAgent.includes('vercel-cron');
    const hasValidSecret = expectedSecret && cronSecret === expectedSecret;

    // Log for debugging
    console.log('[cron] Security check:', {
      userAgent,
      isVercelCron,
      hasValidSecret,
    });

    if (!isVercelCron && !hasValidSecret) {
      console.error('[cron] Unauthorized access attempt');
      return NextResponse.json(
        {
          error: 'Unauthorized',
          debug: {
            userAgent,
            hasSecret: !!cronSecret,
            hasExpectedSecret: !!expectedSecret,
          }
        },
        { status: 401 }
      );
    }

    const now = new Date();

    // ===== TASK 1: Update Exchange Rates =====
    console.log('[cron] Starting currency exchange rate update...');
    const currencyUpdateResult = await updateDailyExchangeRates();
    console.log('[cron] Currency update completed:', currencyUpdateResult);

    // ===== TASK 2: Process Recurring Transactions & Snapshots =====
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

        // 2a. Recurring Transactions
        const beforeCount = await db.transaction.count({
          where: { userId: user.id },
        });
        await processDueRecurringItems(user.id, now);
        const afterCount = await db.transaction.count({
          where: { userId: user.id },
        });
        const created = afterCount - beforeCount;
        transactionsCreated += created;

        // 2b. Portfolio Snapshot
        const userCurrency = user.currency || await db.currency.findFirst();
        if (userCurrency) {
          const portfolio = await getInvestmentsPortfolio(user.id, userCurrency);
          
          // Only save if there's actual value or cost to track
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
          }
        }

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
        error: error instanceof Error ? error.message : 'Failed to process cron tasks',
      },
      { status: 500 }
    );
  }
}
