import { db } from '@/lib/db';
import Stripe from 'stripe';
import { getStripe } from './stripe';

/**
 * Returns the user's Stripe customer id, creating the customer on first use.
 *
 * Two layers stop duplicate customers:
 *   - Idempotency key "customer:<env>:<userId>": if this call times out after Stripe created the
 *     customer and we retry (or two requests race), Stripe returns the same customer
 *     instead of making a second one. Keys are remembered by Stripe for at least 24 hours.
 *   - The DB write only fills an empty stripeCustomerId, so a racing request can't
 *     overwrite a link that is already there; everyone then reads back the stored value.
 */
export async function ensureStripeCustomer(user: { id: number; stripeCustomerId: string | null }): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  // The key must be unique across everything sharing this Stripe account. Local dev and
  // production share one sandbox and have overlapping user ids, so the environment is
  // part of the key; otherwise local user 1 and production user 1 get the same customer.
  const environment = process.env.VERCEL_ENV ?? 'local';
  const customer = await getStripe().customers.create(
    { metadata: { userId: String(user.id), environment } },
    { idempotencyKey: `customer:${environment}:${user.id}` },
  );

  await db.user.updateMany({
    where: { id: user.id, stripeCustomerId: null },
    data: { stripeCustomerId: customer.id },
  });
  const stored = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { stripeCustomerId: true },
  });
  return stored.stripeCustomerId ?? customer.id;
}

/**
 * Deletes the Stripe customer, which also cancels its subscriptions immediately.
 * A customer that is already gone counts as success.
 */
export async function deleteStripeCustomer(stripeCustomerId: string): Promise<void> {
  try {
    await getStripe().customers.del(stripeCustomerId);
  } catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === 'resource_missing') return;
    throw error;
  }
}
