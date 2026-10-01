import { db } from '@/lib/db';
import { getStripe } from './stripe';

/**
 * Returns the user's Stripe customer id, creating the customer on first use.
 *
 * Two layers stop duplicate customers:
 *   - Idempotency key "customer:<userId>": if this call times out after Stripe created the
 *     customer and we retry (or two requests race), Stripe returns the same customer
 *     instead of making a second one. Keys are remembered by Stripe for at least 24 hours.
 *   - The DB write only fills an empty stripeCustomerId, so a racing request can't
 *     overwrite a link that is already there; everyone then reads back the stored value.
 */
export async function ensureStripeCustomer(user: { id: number; stripeCustomerId: string | null }): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await getStripe().customers.create(
    { metadata: { userId: String(user.id) } },
    { idempotencyKey: `customer:${user.id}` },
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
