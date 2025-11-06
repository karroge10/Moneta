'use client';

import { useState } from 'react';
import { Check } from 'iconoir-react';
import { pricingTiers } from '@/lib/pricingData';

export default function PricingTiers() {
  const [isYearly, setIsYearly] = useState(false);

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
        {pricingTiers.map((tier) => {
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
                {tier.isCurrentPlan && (
                  <div
                    className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: 'var(--accent-purple)', color: '#fff' }}
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

                {/* CTA Button */}
                <button
                  className={`mt-4 py-3 px-6 rounded-lg text-body font-semibold transition-colors cursor-pointer ${
                    tier.id === 'basic'
                      ? 'bg-[#282828] hover:bg-[#393939]'
                      : 'hover:opacity-90'
                  }`}
                  style={{
                    backgroundColor: tier.id === 'basic' ? '#282828' : 'var(--accent-purple)',
                    color: '#fff',
                  }}
                >
                  {tier.ctaText}
                </button>
              </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

