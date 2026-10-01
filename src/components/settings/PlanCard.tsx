'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { Crown, WarningTriangle } from 'iconoir-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ErrorState from '@/components/ui/ErrorState';
import Skeleton from '@/components/ui/Skeleton';
import { cx } from '@/components/ui/cx';
import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { formatDate } from '@/lib/format';
import { CONFIRM_POLL_ATTEMPTS, useBilling, type BillingState } from '@/components/settings/settingsQueries';

// Display only. The real price lives in Stripe (created by scripts/stripe-setup.ts).
const PREMIUM_PRICE_LABEL = '$4/month';

type CheckoutResult = 'success' | 'cancelled' | null;

/** Free or Premium plan with the Stripe Checkout and Customer Portal buttons. */
export default function PlanCard() {
  // useSearchParams needs a Suspense boundary so the rest of the page can still prerender.
  return (
    <Suspense fallback={<PlanCardSkeleton />}>
      <PlanCardContent />
    </Suspense>
  );
}

function PlanCardContent() {
  const checkoutResult = useCheckoutResult();
  const billingQuery = useBilling(checkoutResult === 'success');
  const queryClient = useQueryClient();
  // One id per upgrade attempt, reused if the request is retried, so the server's
  // idempotency key returns the same Checkout session instead of creating another.
  const attemptIdRef = useRef<string | null>(null);

  const redirect = useMutation({
    mutationFn: (target: 'checkout' | 'portal') => requestBillingUrl(target, attemptIdRef),
    onSuccess: (url) => window.location.assign(url),
  });

  if (billingQuery.isError) {
    return (
      <Card title="Plan" showActions={false}>
        <ErrorState
          title="Could not load your plan"
          onRetry={() => billingQuery.refetch()}
          retrying={billingQuery.isFetching}
        />
      </Card>
    );
  }

  const billing = billingQuery.data;
  if (!billing) return <PlanCardSkeleton />;

  const isPremium = billing.plan === 'premium';
  const pollsExhausted = billingUpdateCount(queryClient) >= CONFIRM_POLL_ATTEMPTS;
  const checkoutNotice = describeCheckout(checkoutResult, isPremium, pollsExhausted);
  const redirectError = redirect.isError ? redirect.error.message : null;
  const isRedirecting = redirect.isPending || redirect.isSuccess;

  return (
    <Card title="Plan" showActions={false} action={<TestModeBadge />}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <Crown
            width={24}
            height={24}
            strokeWidth={1.5}
            className={cx('shrink-0', isPremium ? 'text-accent' : 'text-secondary')}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-copy font-semibold text-fg">{isPremium ? 'Premium' : 'Free'}</p>
            <p className="text-ui tabular-nums text-secondary">{describePlan(billing)}</p>
          </div>
          {billing.configured && (
            <Button
              className="shrink-0"
              loading={isRedirecting}
              onClick={() => redirect.mutate(isPremium ? 'portal' : 'checkout')}
            >
              {isPremium ? 'Manage billing' : `Upgrade · ${PREMIUM_PRICE_LABEL}`}
            </Button>
          )}
        </div>

        {billing.paymentFailed && (
          <div className="flex items-start gap-3 rounded-control bg-negative/10 p-3" role="alert">
            <WarningTriangle width={20} height={20} strokeWidth={1.5} className="shrink-0 text-negative" aria-hidden="true" />
            <p className="text-ui text-fg">
              Your last payment failed.
              {billing.nextPaymentAttemptAt ? ` Stripe will retry on ${formatDate(billing.nextPaymentAttemptAt)}.` : ''}{' '}
              Update your card in Manage billing to keep Premium.
            </p>
          </div>
        )}

        {!isPremium && billing.configured && (
          <p className="text-ui text-secondary">
            Test mode, no real charge. Pay with card <span className="tabular-nums">4242 4242 4242 4242</span>, any
            future expiry date and any CVC.
          </p>
        )}
        {!billing.configured && <p className="text-ui text-secondary">Billing is not configured on this server.</p>}

        <div aria-live="polite">
          {checkoutNotice && <p className="text-ui text-fg">{checkoutNotice}</p>}
          {redirectError && <p className="text-ui text-negative-fg">{redirectError}</p>}
        </div>
      </div>
    </Card>
  );
}

/** Reads ?billing=success|cancelled once, then removes it from the URL so a reload does not repeat it. */
function useCheckoutResult(): CheckoutResult {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const rawResult = searchParams.get('billing');
  const [result] = useState<CheckoutResult>(() => parseCheckoutResult(rawResult));

  useEffect(() => {
    if (!rawResult) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('billing');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [rawResult, searchParams, router, pathname]);

  return result;
}

function PlanCardSkeleton() {
  return (
    <Card title="Plan" showActions={false}>
      <div className="flex items-center gap-4" aria-busy="true">
        <span className="sr-only">Loading plan</span>
        <Skeleton className="size-6 shrink-0" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-10 w-32 shrink-0 rounded-full" />
      </div>
    </Card>
  );
}

function TestModeBadge() {
  return (
    <span className="whitespace-nowrap rounded-full bg-warning/15 px-2 py-1 text-caption font-semibold text-warning">
      Stripe test mode
    </span>
  );
}

async function requestBillingUrl(
  target: 'checkout' | 'portal',
  attemptIdRef: React.RefObject<string | null>,
): Promise<string> {
  const fallback =
    target === 'checkout' ? 'Could not start checkout. Please try again.' : 'Could not open billing. Please try again.';
  const url = target === 'checkout' ? '/api/billing/checkout' : '/api/billing/portal';
  attemptIdRef.current ??= crypto.randomUUID();
  const body = target === 'checkout' ? { attemptId: attemptIdRef.current } : undefined;
  try {
    const data = await apiFetch<{ url?: string }>(url, { method: 'POST', body });
    if (!data?.url) throw new Error(fallback);
    return data.url;
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : fallback;
    throw new Error(message);
  }
}

/** How many times billing data has arrived, which is how many confirmation polls have run. */
function billingUpdateCount(queryClient: QueryClient): number {
  const state = queryClient.getQueryState(queryKeys.billing.all);
  return state?.dataUpdateCount ?? 0;
}

function parseCheckoutResult(value: string | null): CheckoutResult {
  return value === 'success' || value === 'cancelled' ? value : null;
}

function describeCheckout(result: CheckoutResult, isPremium: boolean, pollsExhausted: boolean): string | null {
  if (result === 'cancelled') return 'Checkout cancelled. You have not been charged.';
  if (result !== 'success') return null;
  if (isPremium) return 'Payment confirmed. Premium is active.';
  if (pollsExhausted) return 'Payment is still being confirmed. Refresh in a minute.';
  return 'Confirming your payment with Stripe...';
}

function describePlan(billing: BillingState): string {
  if (billing.plan === 'free') {
    return `${billing.pdfImportsUsed} of ${billing.pdfImportsLimit} PDF imports used this month. Premium: unlimited.`;
  }
  if (!billing.currentPeriodEnd) return 'Unlimited PDF imports.';
  const date = formatDate(billing.currentPeriodEnd);
  return billing.cancelAtPeriodEnd
    ? `Unlimited PDF imports. Cancelled, active until ${date}.`
    : `Unlimited PDF imports. Renews on ${date}.`;
}
