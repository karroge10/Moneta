import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { errorResponse } from '@/lib/api-errors';
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
    return errorResponse(error, '[billing] failed to load state', 'Failed to load billing state');
  }
}
