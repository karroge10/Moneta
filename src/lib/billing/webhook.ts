import type Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getStripe } from './stripe';
import { isPremiumStatus } from './entitlements';

/**
 * Processes one verified Stripe webhook event.
 *
 * Guarantees:
 *   - Deduplication: the event id is inserted into StripeEvent in the same DB transaction
 *     as the state change. A second delivery of the same event hits the primary key and is
 *     skipped. If the change fails, the event row rolls back too, we return 500, and
 *     Stripe's retry processes it again. Nothing is half-applied or lost.
 *   - Order independence: Stripe does not guarantee delivery order, so the payload is only
 *     a trigger. We re-read the subscription/invoice from Stripe and store the current
 *     state. Processing events in any order converges on the same result.
 */

export type WebhookOutcome = 'processed' | 'duplicate' | 'ignored';

const HANDLED_EVENTS = new Set<string>([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
]);

type BillingChange = {
  subscription: Stripe.Subscription | null;
  invoice: Stripe.Invoice | null;
  // From Checkout: links the Stripe customer to our user if it is not linked yet.
  checkoutLink: { userId: number; customerId: string } | null;
};

type Tx = Prisma.TransactionClient;

export async function processStripeEvent(event: Stripe.Event): Promise<WebhookOutcome> {
  if (!HANDLED_EVENTS.has(event.type)) return 'ignored';

  // Fast path for redeliveries. The primary key inside the transaction is the real guard
  // (it also covers two deliveries of the same event arriving at the same moment).
  const alreadyProcessed = await db.stripeEvent.findUnique({ where: { id: event.id } });
  if (alreadyProcessed) return 'duplicate';

  // Network calls happen before the DB transaction: never hold a transaction open on HTTP.
  const change = await loadCurrentState(event);

  try {
    await db.$transaction(async (tx) => {
      await tx.stripeEvent.create({ data: { id: event.id, type: event.type } });
      if (change) await applyChange(tx, change);
    });
  } catch (error) {
    if (isDuplicateEventError(error)) return 'duplicate';
    throw error;
  }

  return change ? 'processed' : 'ignored';
}

async function loadCurrentState(event: Stripe.Event): Promise<BillingChange | null> {
  const stripe = getStripe();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode !== 'subscription' || !session.subscription || !session.customer) return null;
      const subscriptionId = idOf(session.subscription);
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = Number(session.client_reference_id);
      const checkoutLink = Number.isInteger(userId) && userId > 0
        ? { userId, customerId: idOf(session.customer) }
        : null;
      return { subscription, invoice: null, checkoutLink };
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      // A deleted (canceled) subscription can still be retrieved, with status "canceled".
      const subscription = await stripe.subscriptions.retrieve(event.data.object.id);
      return { subscription, invoice: null, checkoutLink: null };
    }

    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const invoice = await stripe.invoices.retrieve(event.data.object.id);
      const subscriptionRef = invoice.parent?.subscription_details?.subscription;
      const subscription = subscriptionRef ? await stripe.subscriptions.retrieve(idOf(subscriptionRef)) : null;
      return { subscription, invoice, checkoutLink: null };
    }

    default:
      return null;
  }
}

async function applyChange(tx: Tx, change: BillingChange): Promise<void> {
  if (change.checkoutLink) {
    // Only fills an empty link; never re-points a user to a different customer.
    await tx.user.updateMany({
      where: { id: change.checkoutLink.userId, stripeCustomerId: null },
      data: { stripeCustomerId: change.checkoutLink.customerId },
    });
  }

  const customerRef = change.subscription?.customer ?? change.invoice?.customer;
  if (!customerRef) return;
  const user = await tx.user.findUnique({ where: { stripeCustomerId: idOf(customerRef) } });
  if (!user) {
    console.warn('[stripe-webhook] no user for customer', idOf(customerRef));
    return;
  }

  if (change.subscription) await saveSubscription(tx, user.id, change.subscription);
  if (change.invoice) await savePayment(tx, user.id, change.invoice);
}

async function saveSubscription(tx: Tx, userId: number, subscription: Stripe.Subscription): Promise<void> {
  const existing = await tx.subscription.findUnique({ where: { userId } });

  // A late event about an old, ended subscription must not overwrite a newer live one
  // (user canceled, then subscribed again, and the old "deleted" event arrives last).
  const isOtherSubscription = existing !== null && existing.stripeSubscriptionId !== subscription.id;
  if (isOtherSubscription && isPremiumStatus(existing.status) && !isPremiumStatus(subscription.status)) {
    return;
  }

  const firstItem = subscription.items.data[0];
  const data = {
    stripeSubscriptionId: subscription.id,
    stripePriceId: firstItem?.price.id ?? '',
    status: subscription.status,
    currentPeriodEnd: firstItem ? fromUnix(firstItem.current_period_end) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end || subscription.cancel_at !== null,
    canceledAt: subscription.canceled_at ? fromUnix(subscription.canceled_at) : null,
  };

  await tx.subscription.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

async function savePayment(tx: Tx, userId: number, invoice: Stripe.Invoice): Promise<void> {
  const subscriptionRef = invoice.parent?.subscription_details?.subscription;
  const data = {
    userId,
    stripeSubscriptionId: subscriptionRef ? idOf(subscriptionRef) : null,
    status: invoice.status ?? 'draft',
    amountDueMinor: invoice.amount_due,
    amountPaidMinor: invoice.amount_paid,
    currency: invoice.currency,
    attemptCount: invoice.attempt_count,
    nextPaymentAttemptAt: invoice.next_payment_attempt ? fromUnix(invoice.next_payment_attempt) : null,
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
  };

  await tx.payment.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: { stripeInvoiceId: invoice.id, ...data },
    update: data,
  });
}

function isDuplicateEventError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    error.meta?.modelName === 'StripeEvent'
  );
}

function idOf(ref: string | { id: string }): string {
  return typeof ref === 'string' ? ref : ref.id;
}

function fromUnix(seconds: number): Date {
  return new Date(seconds * 1000);
}
