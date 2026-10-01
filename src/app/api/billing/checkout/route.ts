import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { errorResponse } from '@/lib/api-errors';
import { db } from '@/lib/db';
import { ensureStripeCustomer } from '@/lib/billing/customers';
import { isPremiumStatus } from '@/lib/billing/entitlements';
import { getPremiumPriceId, getStripe, isBillingConfigured } from '@/lib/billing/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Starts a Stripe Checkout session for Moneta Premium and returns its URL.
 *
 * The browser sends an attemptId (one UUID per click on "Upgrade"). It becomes part of the
 * idempotency key, so a double click or a network retry of the same attempt returns the
 * same Checkout session instead of creating two.
 *
 * Returning from Checkout does not grant Premium. Only the webhook does, after Stripe
 * confirms the payment, because the redirect can be faked, lost or arrive early.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isBillingConfigured()) {
      return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
    }

    const user = await requireCurrentUser();
    const body = await request.json().catch(() => ({}));
    const attemptId = typeof body?.attemptId === 'string' && UUID_PATTERN.test(body.attemptId) ? body.attemptId : null;
    if (!attemptId) {
      return NextResponse.json({ error: 'attemptId (UUID) is required' }, { status: 400 });
    }

    const subscription = await db.subscription.findUnique({ where: { userId: user.id } });
    if (subscription && isPremiumStatus(subscription.status)) {
      return NextResponse.json({ error: 'You already have Premium. Use Manage billing instead.' }, { status: 409 });
    }

    const customerId = await ensureStripeCustomer(user);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    const session = await getStripe().checkout.sessions.create(
      {
        mode: 'subscription',
        customer: customerId,
        client_reference_id: String(user.id),
        line_items: [{ price: getPremiumPriceId(), quantity: 1 }],
        subscription_data: { metadata: { userId: String(user.id) } },
        success_url: `${appUrl}/settings?billing=success`,
        cancel_url: `${appUrl}/settings?billing=cancelled`,
      },
      { idempotencyKey: `checkout:${user.id}:${attemptId}` },
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return errorResponse(error, '[billing/checkout] failed', 'Could not start checkout');
  }
}
