import Stripe from 'stripe';

/**
 * Stripe runs in TEST MODE ONLY. Stripe live accounts are not available in our country,
 * so the app refuses to start Stripe with anything but a test key (sk_test_ / rk_test_),
 * and the webhook rejects live-mode events. No real money can move through this code.
 *
 * Keys come from env vars (see .env.example), never from code:
 *   STRIPE_SECRET_KEY        sk_test_...   server-side API key
 *   STRIPE_WEBHOOK_SECRET    whsec_...     signing secret of the webhook endpoint (or `stripe listen`)
 *   STRIPE_PREMIUM_PRICE_ID  price_...     the Premium monthly price (scripts/stripe-setup.ts creates it)
 */

// Pinned on purpose: the SDK types are generated for this version, and pinning means a
// Stripe-side default change can't silently alter payload shapes under us.
const STRIPE_API_VERSION = '2026-09-30.endive';

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) return client;

  const key = requireEnv('STRIPE_SECRET_KEY');
  if (!/^(sk|rk)_test_/.test(key)) {
    throw new Error('Refusing to start Stripe with a non-test key: this app runs Stripe in test mode only.');
  }

  client = new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    // The SDK retries network failures and reuses the same idempotency key on each retry,
    // so a retried POST can never create a second object.
    maxNetworkRetries: 2,
    appInfo: { name: 'Moneta' },
  });
  return client;
}

export function getWebhookSecret(): string {
  return requireEnv('STRIPE_WEBHOOK_SECRET');
}

export function getPremiumPriceId(): string {
  return requireEnv('STRIPE_PREMIUM_PRICE_ID');
}

export function isBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PREMIUM_PRICE_ID);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}
