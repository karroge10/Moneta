'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check } from 'iconoir-react';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { CheckoutButton } from '@clerk/nextjs/experimental';
import { pricingTiers as fallbackTiers } from '@/lib/pricingData';

const VALID_PLAN_IDS = ['basic', 'premium', 'ultimate'] as const;
type PlanId = (typeof VALID_PLAN_IDS)[number];

function isPlanId(s: string | null | undefined): s is PlanId {
  return s != null && VALID_PLAN_IDS.includes(s as PlanId);
}

export interface DisplayTier {
  id: string;
  clerkPlanId?: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: { text: string }[];
  ctaText: string;
  hasDiscount?: boolean;
  discountPercent?: number;
}

function displayTiersFromApi(plans: { id: string; clerkPlanId?: string; name: string; description: string; monthlyPrice: number; yearlyPrice: number; features: { key: string; name: string; description: string }[] }[]): DisplayTier[] {
  return plans.map((plan, index) => ({
    id: plan.id,
    clerkPlanId: plan.clerkPlanId,
    name: plan.name,
    tagline: plan.description,
    monthlyPrice: plan.monthlyPrice,
    yearlyPrice: plan.yearlyPrice,
    features: plan.features.map((f) => ({ text: f.name })),
    ctaText: index === 0 || plan.monthlyPrice === 0 ? 'Get Started' : 'Upgrade',
  }));
}

function displayTiersFromFallback(): DisplayTier[] {
  return fallbackTiers.map((t) => ({
    id: t.id,
    name: t.name,
    tagline: t.tagline,
    monthlyPrice: t.monthlyPrice,
    yearlyPrice: t.yearlyPrice,
    features: t.features.map((f) => ({ text: f.text })),
    ctaText: t.ctaText,
    hasDiscount: t.hasDiscount,
    discountPercent: t.discountPercent,
  }));
}

export default function PricingTiers() {
  const [tiers, setTiers] = useState<DisplayTier[]>(displayTiersFromFallback());
  const [isYearly, setIsYearly] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PlanId | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingTierId, setUpdatingTierId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [plansRes, settingsRes] = await Promise.all([
        fetch('/api/plans'),
        fetch('/api/user/settings'),
      ]);

      const plansData = plansRes.ok ? await plansRes.json() : { plans: [] };
      const plans = plansData?.plans ?? [];
      if (plans.length > 0) {
        setTiers(displayTiersFromApi(plans));
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const plan = settingsData?.plan;
        setCurrentPlan(isPlanId(plan) ? plan : 'basic');
      } else {
        if (settingsRes.status === 401) setCurrentPlan(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setCurrentPlan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectPlan = async (tier: DisplayTier) => {
    if (currentPlan === tier.id) return;
    setUpdatingTierId(tier.id);
    setError(null);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: tier.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? 'Failed to update plan');
      }
      setCurrentPlan(isPlanId(tier.id) ? tier.id : 'basic');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update plan');
    } finally {
      setUpdatingTierId(null);
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return `$ ${price.toFixed(2)}`;
  };

  return (
    <div className="card-surface flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-card-header mb-2">Subscription Plans</h2>
          <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
            Flexible plans designed for every type of user. Upgrade anytime.
          </p>
          {error && (
            <p className="mt-2 text-sm" style={{ color: 'var(--error)' }}>
              {error}
            </p>
          )}
          {!loading && currentPlan === null && (
            <p className="mt-2 text-helper">
              Sign in to select or change your plan.
            </p>
          )}
        </div>

        {/* Billing Toggle - On the right */}
        <div className="flex items-center gap-4 shrink-0">
          <span className={`text-body transition-colors ${!isYearly ? 'font-semibold' : ''}`} style={{ color: !isYearly ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            Monthly
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className="relative w-14 h-7 rounded-full transition-colors cursor-pointer"
            style={{ backgroundColor: isYearly ? 'var(--accent-purple)' : '#393939' }}
            aria-label={isYearly ? 'Switch to monthly billing' : 'Switch to yearly billing'}
          >
            <span
              className="absolute top-1 left-1 w-5 h-5 rounded-full transition-transform bg-white"
              style={{ transform: isYearly ? 'translateX(28px)' : 'translateX(0)' }}
            />
          </button>
          <span className={`text-body transition-colors ${isYearly ? 'font-semibold' : ''}`} style={{ color: isYearly ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            Yearly <span style={{ color: 'var(--accent-green)' }}>(Save 20%)</span>
          </span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const price = isYearly ? tier.yearlyPrice : tier.monthlyPrice;
          const period = isYearly ? '/ year' : '/ month';

          return (
            <div key={tier.id} className="relative">
              {/* Discount Badge - On top of card */}
              {tier.hasDiscount && tier.discountPercent && (
                <div
                  className="absolute -top-4 right-4 px-5 py-2 text-sm font-bold transform rotate-12 z-10"
                  style={{
                    backgroundColor: 'var(--accent-purple)',
                    color: '#fff',
                    clipPath: 'polygon(0 0, 100% 0, 100% 75%, 85% 100%, 0 100%)',
                  }}
                >
                  {tier.discountPercent}% OFF
                </div>
              )}

              <div
                className="relative flex flex-col rounded-3xl p-6"
                style={{ 
                  position: 'relative',
                  backgroundColor: '#202020'
                }}
              >
                {/* Badges */}
                {!loading && currentPlan === tier.id && (
                  <div
                    className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: '#E7E4E4', color: '#282828' }}
                  >
                    Current Plan
                  </div>
                )}

              {/* Tier Info */}
              <div className="flex flex-col gap-4 flex-1">
                <div>
                  <h3 className="text-card-header mb-2">{tier.name}</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-card-value">{formatPrice(price)}</span>
                    {price > 0 && <span className="text-body" style={{ color: 'var(--text-secondary)' }}>{period}</span>}
                  </div>
                  <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
                    {tier.tagline}
                  </p>
                </div>

                {/* Features List */}
                <ul className="flex flex-col gap-3 flex-1">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="shrink-0 mt-0.5">
                        <Check width={20} height={20} strokeWidth={2} style={{ color: 'var(--accent-purple)' }} />
                      </div>
                      <span className="text-body">{feature.text}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button - Free: PATCH plan; Paid with Clerk Billing: CheckoutButton */}
                {tier.monthlyPrice === 0 ? (
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(tier)}
                    disabled={loading || updatingTierId !== null || currentPlan === tier.id || currentPlan === null}
                    className="mt-4 py-3 px-6 rounded-lg text-body font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-[#282828] hover:bg-[#393939]"
                    style={{ color: '#E7E4E4' }}
                  >
                    {updatingTierId === tier.id ? 'Updating…' : currentPlan === tier.id ? 'Current Plan' : tier.ctaText}
                  </button>
                ) : tier.clerkPlanId ? (
                  <>
                    <SignedIn>
                      <CheckoutButton
                        planId={tier.clerkPlanId}
                        planPeriod={isYearly ? 'annual' : 'month'}
                        for="user"
                        newSubscriptionRedirectUrl="/pricing"
                        onSubscriptionComplete={fetchData}
                      >
                        <button
                          type="button"
                          disabled={loading || currentPlan === tier.id}
                          className="mt-4 w-full py-3 px-6 rounded-lg text-body font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 ring-2 ring-[#AC66DA]/50 ring-offset-2 ring-offset-[#202020]"
                          style={{ backgroundColor: 'var(--accent-purple)', color: '#E7E4E4' }}
                        >
                          {currentPlan === tier.id ? 'Current Plan' : tier.ctaText}
                        </button>
                      </CheckoutButton>
                    </SignedIn>
                    <SignedOut>
                      <button
                        type="button"
                        disabled
                        className="mt-4 w-full py-3 px-6 rounded-lg text-body font-semibold opacity-60 cursor-not-allowed ring-2 ring-[#AC66DA]/50 ring-offset-2 ring-offset-[#202020]"
                        style={{ backgroundColor: 'var(--accent-purple)', color: '#E7E4E4' }}
                      >
                        Sign in to upgrade
                      </button>
                    </SignedOut>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(tier)}
                    disabled={loading || updatingTierId !== null || currentPlan === tier.id || currentPlan === null}
                    className="mt-4 py-3 px-6 rounded-lg text-body font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 ring-2 ring-[#AC66DA]/50 ring-offset-2 ring-offset-[#202020]"
                    style={{ backgroundColor: 'var(--accent-purple)', color: '#E7E4E4' }}
                  >
                    {updatingTierId === tier.id ? 'Updating…' : currentPlan === tier.id ? 'Current Plan' : tier.ctaText}
                  </button>
                )}
              </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

