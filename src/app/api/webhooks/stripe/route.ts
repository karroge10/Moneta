import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, getWebhookSecret } from '@/lib/billing/stripe';
import { processStripeEvent } from '@/lib/billing/webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe webhook endpoint. Public (no Clerk session): Stripe proves who it is with the
 * Stripe-Signature header, an HMAC of the raw body made with our endpoint secret.
 *
 * Responses tell Stripe what to do next:
 *   2xx  received (also for duplicates and event types we ignore), Stripe stops sending it
 *   400  bad signature or live-mode event, not retried usefully, it's not from our test account
 *   500  our processing failed, Stripe retries with backoff for up to 3 days
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe-Signature header' }, { status: 400 });
  }

  // The signature covers the exact bytes Stripe sent, so read the raw body.
  // Parsing JSON first and re-serialising would change the bytes and break verification.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, getWebhookSecret());
  } catch (error) {
    console.warn('[stripe-webhook] signature verification failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.livemode) {
    console.error('[stripe-webhook] rejected live-mode event', event.id);
    return NextResponse.json({ error: 'Live mode is not supported' }, { status: 400 });
  }

  try {
    const outcome = await processStripeEvent(event);
    console.log(`[stripe-webhook] ${event.type} ${event.id}: ${outcome}`);
    return NextResponse.json({ received: true, outcome });
  } catch (error) {
    console.error(`[stripe-webhook] failed to process ${event.type} ${event.id}`, error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
