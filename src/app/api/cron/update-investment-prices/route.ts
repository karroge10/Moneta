import { NextRequest, NextResponse } from 'next/server';
import { refreshInvestmentPrices } from '@/lib/investments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    // Simple check for cron secret in production
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // For local development, we allow it without secret if CRON_SECRET is not set
        if (process.env.NODE_ENV === 'production') {
            return new Response('Unauthorized', { status: 401 });
        }
    }

    try {
        const updatedCount = await refreshInvestmentPrices();
        return NextResponse.json({
            success: true,
            updated: updatedCount,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[cron][investments] failed', error);
        return NextResponse.json({ success: false, error: 'Refresh failed' }, { status: 500 });
    }
}
