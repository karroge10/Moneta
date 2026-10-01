'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Card from '@/components/ui/Card';
import { Crown, WarningTriangle } from 'iconoir-react';

// Display only. The real price lives in Stripe (created by scripts/stripe-setup.ts).
const PREMIUM_PRICE_LABEL = '$4/month';
const CONFIRM_POLL_INTERVAL_MS = 2000;
const CONFIRM_POLL_ATTEMPTS = 15;

type BillingState = {
  plan: 'free' | 'premium';
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  paymentFailed: boolean;
  nextPaymentAttemptAt: string | null;
  pdfImportsUsed: number;
  pdfImportsLimit: number | null;
  configured: boolean;
};

interface PlanCardProps {
  enabled: boolean;
}

export default function PlanCard({ enabled }: PlanCardProps) {
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // One id per upgrade attempt, reused if the request is retried, so the server's
  // idempotency key returns the same Checkout session instead of creating another.
  const attemptIdRef = useRef<string | null>(null);

  const loadBilling = useCallback(async (): Promise<BillingState | null> => {
    const res = await fetch('/api/billing', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as BillingState;
    setBilling(data);
    return data;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const run = async () => {
      const result = readCheckoutResult();
      if (result === 'cancelled') setNotice('Checkout cancelled. You have not been charged.');
      if (result !== 'success') {
        await loadBilling();
        return;
      }

      // Back from Checkout. Premium is granted by the webhook, not by this redirect,
      // so wait until the webhook has updated our database.
      setNotice('Confirming your payment with Stripe...');
      for (let attempt = 0; attempt < CONFIRM_POLL_ATTEMPTS && !cancelled; attempt++) {
        const state = await loadBilling();
        if (state?.plan === 'premium') {
          setNotice('Payment confirmed. Premium is active.');
          return;
        }
        await wait(CONFIRM_POLL_INTERVAL_MS);
      }
      if (!cancelled) setNotice('Payment is still being confirmed. Refresh in a minute.');
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [enabled, loadBilling]);

  const handleUpgrade = async () => {
    setBusy(true);
    attemptIdRef.current ??= crypto.randomUUID();
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId: attemptIdRef.current }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        setNotice(data?.error ?? 'Could not start checkout. Please try again.');
        setBusy(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setNotice('Could not start checkout. Please try again.');
      setBusy(false);
    }
  };

  const handleManage = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        setNotice(data?.error ?? 'Could not open billing. Please try again.');
        setBusy(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setNotice('Could not open billing. Please try again.');
      setBusy(false);
    }
  };

  if (!billing) {
    return (
      <Card title="Plan" showActions={false}>
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 rounded shrink-0 animate-pulse" style={{ backgroundColor: '#3a3a3a' }} />
          <div className="h-4 flex-1 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }} />
          <div className="h-10 px-6 min-w-[7.5rem] rounded-full shrink-0 animate-pulse" style={{ backgroundColor: '#3a3a3a' }} />
        </div>
      </Card>
    );
  }

  const isPremium = billing.plan === 'premium';

  return (
    <Card title="Plan" showActions={false} action={<TestModeBadge />}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Crown
            width={24}
            height={24}
            strokeWidth={1.5}
            className="shrink-0"
            style={{ color: isPremium ? 'var(--accent-purple)' : '#B9B9B9' }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-body font-semibold" style={{ color: '#E7E4E4' }}>
              {isPremium ? 'Premium' : 'Free'}
            </p>
            <p className="text-sm" style={{ color: '#B9B9B9' }}>
              {describePlan(billing)}
            </p>
          </div>
          {billing.configured && (
            <button
              type="button"
              onClick={isPremium ? handleManage : handleUpgrade}
              disabled={busy}
              className={`px-4 py-2 rounded-full text-body font-semibold transition-opacity shrink-0 ${
                busy ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'
              }`}
              style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}
            >
              {busy ? 'Opening...' : isPremium ? 'Manage billing' : `Upgrade · ${PREMIUM_PRICE_LABEL}`}
            </button>
          )}
        </div>

        {billing.paymentFailed && (
          <div className="flex items-start gap-3 rounded-2xl p-3" style={{ backgroundColor: 'rgba(255, 99, 99, 0.1)' }}>
            <WarningTriangle width={20} height={20} strokeWidth={1.5} className="shrink-0" style={{ color: 'var(--error)' }} />
            <p className="text-sm" style={{ color: '#E7E4E4' }}>
              Your last payment failed.
              {billing.nextPaymentAttemptAt ? ` Stripe will retry on ${formatDate(billing.nextPaymentAttemptAt)}.` : ''}
              {' '}Update your card in Manage billing to keep Premium.
            </p>
          </div>
        )}

        {!isPremium && billing.configured && (
          <p className="text-sm" style={{ color: '#B9B9B9' }}>
            Test mode, no real charge. Pay with card 4242 4242 4242 4242, any future expiry date and any CVC.
          </p>
        )}
        {!billing.configured && (
          <p className="text-sm" style={{ color: '#B9B9B9' }}>Billing is not configured on this server.</p>
        )}
        {notice && (
          <p className="text-sm" role="status" style={{ color: '#E7E4E4' }}>
            {notice}
          </p>
        )}
      </div>
    </Card>
  );
}

function TestModeBadge() {
  return (
    <span
      className="text-xs font-semibold px-2 py-1 rounded-full"
      style={{ backgroundColor: 'rgba(255, 184, 0, 0.15)', color: '#FFB800' }}
    >
      Stripe test mode
    </span>
  );
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

function readCheckoutResult(): 'success' | 'cancelled' | null {
  const url = new URL(window.location.href);
  const result = url.searchParams.get('billing');
  if (!result) return null;
  url.searchParams.delete('billing');
  window.history.replaceState(null, '', url.toString());
  return result === 'success' || result === 'cancelled' ? result : null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
