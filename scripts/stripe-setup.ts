/**
 * One-off setup of Stripe TEST MODE objects for Moneta Premium. Safe to re-run: it finds
 * existing objects (price by lookup_key, portal config by metadata) before creating any.
 *
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/stripe-setup.ts
 *   (or put the key in .env.local)
 *
 * Prints the env lines to add to .env.local / Vercel.
 */
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const PRICE_LOOKUP_KEY = 'moneta_premium_monthly';
const PORTAL_METADATA_TAG = 'moneta';

async function main() {
  // Imported after dotenv so the key is in process.env; getStripe() enforces test mode.
  const { getStripe } = await import('../src/lib/billing/stripe');
  const stripe = getStripe();

  const priceId = await ensurePremiumPrice(stripe);
  const portalConfigurationId = await ensurePortalConfiguration(stripe);

  console.log('\nAdd to .env.local (and Vercel env vars):\n');
  console.log(`STRIPE_PREMIUM_PRICE_ID=${priceId}`);
  console.log(`STRIPE_PORTAL_CONFIGURATION_ID=${portalConfigurationId}`);
}

type StripeClient = ReturnType<typeof import('../src/lib/billing/stripe').getStripe>;

async function ensurePremiumPrice(stripe: StripeClient): Promise<string> {
  const existing = await stripe.prices.list({ lookup_keys: [PRICE_LOOKUP_KEY], active: true, limit: 1 });
  if (existing.data[0]) {
    console.log(`Price exists: ${existing.data[0].id}`);
    return existing.data[0].id;
  }

  const price = await stripe.prices.create(
    {
      currency: 'usd',
      // Stripe amounts are integers in the currency's minor unit: 400 cents = $4.00.
      unit_amount: 400,
      recurring: { interval: 'month' },
      lookup_key: PRICE_LOOKUP_KEY,
      product_data: { name: 'Moneta Premium' },
    },
    { idempotencyKey: `setup:${PRICE_LOOKUP_KEY}:v1` },
  );
  console.log(`Price created: ${price.id}`);
  return price.id;
}

async function ensurePortalConfiguration(stripe: StripeClient): Promise<string> {
  const configurations = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  const existing = configurations.data.find((c) => c.metadata?.app === PORTAL_METADATA_TAG);
  if (existing) {
    console.log(`Portal configuration exists: ${existing.id}`);
    return existing.id;
  }

  const configuration = await stripe.billingPortal.configurations.create(
    {
      business_profile: { headline: 'Moneta Premium (Stripe test mode, no real charges)' },
      features: {
        // Cancelling keeps Premium until the end of the paid period.
        subscription_cancel: { enabled: true, mode: 'at_period_end' },
        payment_method_update: { enabled: true },
        invoice_history: { enabled: true },
      },
      metadata: { app: PORTAL_METADATA_TAG },
    },
    { idempotencyKey: 'setup:portal-configuration:v1' },
  );
  console.log(`Portal configuration created: ${configuration.id}`);
  return configuration.id;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
