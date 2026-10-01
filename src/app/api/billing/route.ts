import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { getBillingState } from '@/lib/billing/entitlements';
import { isBillingConfigured } from '@/lib/billing/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const state = await getBillingState(user.id);
    return NextResponse.json({ ...state, configured: isBillingConfigured(), testMode: true });
  } catch (error) {
    console.error('[billing] failed to load state', error);
    return NextResponse.json({ error: 'Failed to load billing state' }, { status: 500 });
  }
}
