import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processDueRecurringItems } from '@/app/api/recurring/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/recurring
 * Vercel Cron endpoint that processes recurring transactions for all users daily.
 * 
 * Security: Verifies User-Agent is 'vercel-cron/1.0' (set by Vercel) OR
 * optional CRON_SECRET header (for manual testing).
 * 
 * Schedule: Configured in vercel.json to run daily at 2:00 AM UTC.
 */
export async function GET(request: NextRequest) {
  // Log immediately to verify function is being called
  console.log('[cron/recurring] Endpoint called at:', new Date().toISOString());
  console.log('[cron/recurring] Headers:', {
    userAgent: request.headers.get('user-agent'),
    cronSecret: request.headers.get('x-cron-secret') ? 'present' : 'missing',
    allHeaders: Object.fromEntries(request.headers.entries()),
  });

  try {
    // Security check: Vercel sets User-Agent to 'vercel-cron/1.0' for cron requests
    const userAgent = request.headers.get('user-agent') || '';
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    const isVercelCron = userAgent.includes('vercel-cron');
    const hasValidSecret = expectedSecret && cronSecret === expectedSecret;

    // Log for debugging
    console.log('[cron/recurring] Security check:', {
      userAgent,
      isVercelCron,
      hasSecret: !!cronSecret,
      hasExpectedSecret: !!expectedSecret,
      hasValidSecret,
    });

    if (!isVercelCron && !hasValidSecret) {
      console.error('[cron/recurring] Unauthorized access attempt');
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
    const users = await db.user.findMany({
      select: { id: true },
    });

    let usersProcessed = 0;
    let transactionsCreated = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        // Count transactions before processing
        const beforeCount = await db.transaction.count({
          where: { userId: user.id },
        });

        // Process recurring items for this user
        await processDueRecurringItems(user.id, now);

        // Count transactions after processing
        const afterCount = await db.transaction.count({
          where: { userId: user.id },
        });

        const created = afterCount - beforeCount;
        transactionsCreated += created;
        usersProcessed += 1;

        if (created > 0) {
          console.log(`[cron/recurring] User ${user.id}: Created ${created} transaction(s)`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`User ${user.id}: ${errorMessage}`);
        console.error(`[cron/recurring] Error processing user ${user.id}:`, error);
        // Continue processing other users even if one fails
      }
    }

    const summary = {
      success: true,
      timestamp: now.toISOString(),
      usersProcessed,
      transactionsCreated,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log(`[cron/recurring] Completed: ${usersProcessed} users, ${transactionsCreated} transactions created`);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[cron/recurring] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process recurring transactions',
      },
      { status: 500 }
    );
  }
}
