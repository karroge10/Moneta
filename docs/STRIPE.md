# Stripe billing (test mode only)

Moneta Premium is a $4/month subscription that removes the free plan's limit of 3 PDF
bank-statement imports per month. It runs on **Stripe test mode only**: Stripe live accounts
are not available in Georgia or Serbia, so the app never activates live mode. The code
enforces it: `getStripe()` refuses any key that is not `sk_test_`/`rk_test_`, and the
webhook rejects events with `livemode: true`. Anyone can upgrade with the test card
`4242 4242 4242 4242`; no real money moves.

## How it fits together

```
Settings "Upgrade"  ->  POST /api/billing/checkout  ->  Stripe Checkout (hosted page)
                                                            |
                         Stripe sends events  <-------------+
                                |
                     POST /api/webhooks/stripe   (signature check, dedup by event id)
                                |
                    Subscription / Payment rows  ->  getBillingState()  ->  PDF import limit
```

| Piece | File |
|---|---|
| Stripe client, test-mode guard, env | `src/lib/billing/stripe.ts` |
| Who is Premium, PDF limit | `src/lib/billing/entitlements.ts` |
| Customer creation (idempotent) | `src/lib/billing/customers.ts` |
| Webhook processing | `src/lib/billing/webhook.ts`, `src/app/api/webhooks/stripe/route.ts` |
| Checkout / portal / status | `src/app/api/billing/{checkout,portal}/route.ts`, `src/app/api/billing/route.ts` |
| UI | `src/components/settings/PlanCard.tsx` |
| Tables | `Subscription`, `Payment`, `StripeEvent`, `User.stripeCustomerId` |

## Design decisions

- **Access comes only from the webhook.** The success redirect after Checkout grants
  nothing: it can be lost, faked or arrive before the payment settles. The Plan card polls
  `/api/billing` until the webhook has written the subscription.
- **Deduplication.** Stripe delivers events at least once. The event id is inserted into
  `StripeEvent` in the same DB transaction as the change. A redelivery hits the primary key
  and is skipped. If processing fails, the transaction rolls back (event row included), the
  endpoint returns 500 and Stripe retries for up to 3 days.
- **Order independence.** Events can arrive out of order, so a payload is only a trigger:
  the handler re-reads the subscription/invoice from Stripe and stores the current state. A
  late event about an old, ended subscription cannot overwrite a newer live one.
- **Idempotency keys** on every Stripe call that creates something: `customer:<env>:<userId>` (env in the key because local dev and production share one sandbox),
  `checkout:<userId>:<attemptId>` (one UUID per click, from the browser). The SDK retries
  network errors with the same key, so a retry never creates a duplicate.
- **Failed payments.** `past_due` keeps Premium while Stripe retries the card and the Plan
  card asks the user to update it. When retries run out Stripe sets `unpaid`/`canceled`
  and access ends. **Cancellations** happen in the Customer Portal at period end: Premium
  stays until the paid period ends, then `customer.subscription.deleted` arrives.
- **Money.** Stripe amounts are stored as integers in minor units (`400` = $4.00) with
  their currency, exactly as Stripe sends them. App money uses `Decimal(19,4)`.

Events handled: `checkout.session.completed`, `customer.subscription.created|updated|deleted`,
`invoice.paid`, `invoice.payment_failed`. Everything else gets a 200 and is ignored.

## Local setup

1. Create a Stripe account (no activation needed for test mode) and copy the test secret
   key (Dashboard > Developers > API keys) into `.env.local` as `STRIPE_SECRET_KEY`.
2. Create the product, price and portal configuration, then add the printed lines to `.env.local`:
   ```
   npx tsx scripts/stripe-setup.ts
   ```
3. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli), then:
   ```
   stripe login
   stripe listen \
     --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed \
     --forward-to localhost:3000/api/webhooks/stripe
   ```
   Put the printed `whsec_...` into `.env.local` as `STRIPE_WEBHOOK_SECRET`, then `npm run dev`.

## Test scenarios

| Scenario | How |
|---|---|
| Subscribe | Settings > Upgrade, card `4242 4242 4242 4242`, any future date, any CVC |
| 3-D Secure | card `4000 0025 0000 3155` |
| Declined at checkout | card `4000 0000 0000 0002` |
| Renewal fails later | subscribe with `4000 0000 0000 0341` (attaches, then every charge fails), then advance a [test clock](https://docs.stripe.com/billing/testing/test-clocks) past the period end, or from the dashboard |
| Cancel | Settings > Manage billing > Cancel plan (stays Premium until period end) |
| Duplicate delivery | `stripe events resend evt_...` → log shows `duplicate` |
| Free limit | as a Free user, import 3 PDFs in a month; the 4th returns 402 |

## Deploying (still test mode)

Add the four `STRIPE_*` vars to Vercel. In the Stripe dashboard (test mode) add a webhook
endpoint `https://<domain>/api/webhooks/stripe` with the six events above and use its
signing secret as `STRIPE_WEBHOOK_SECRET`.

## Going live would need

A Stripe account in a supported country, live keys, removing the test-key guard, tax
handling (Stripe Tax), customer emails/receipts, and a check against two concurrent
checkouts creating two subscriptions for one user.
