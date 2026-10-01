import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { getStripe, isBillingConfigured } from '@/lib/billing/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Opens the Stripe Customer Portal, where the user cancels, resumes, updates their card
 * or downloads invoices. Every change made there comes back to us as a webhook event,
 * so this route does not touch the database.
 *
 * No idempotency key: a portal session is a short-lived link with no side effects,
 * so creating two is harmless.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isBillingConfigured()) {
      return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
    }

    const user = await requireCurrentUser();
    if (!user.stripeCustomerId) {
      return NextResponse.json({ error: 'No billing account yet' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const session = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/settings`,
      configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID || undefined,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[billing/portal] failed', error);
    return NextResponse.json({ error: 'Could not open billing portal' }, { status: 500 });
  }
}
