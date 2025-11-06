'use client';

import { useState, useMemo } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import FeatureCarousel from '@/components/pricing/FeatureCarousel';
import PricingTiers from '@/components/pricing/PricingTiers';
import ComparisonTable from '@/components/pricing/ComparisonTable';
import FAQSection from '@/components/help/FAQSection';
import { faqData } from '@/lib/faqData';
import { TimePeriod } from '@/types/dashboard';

export default function PricingPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('All Time');

  // Filter FAQ to only show Pricing category
  const pricingFAQs = useMemo(() => {
    return faqData.filter(item => item.category === 'Pricing');
  }, []);

  return (
    <main className="min-h-screen bg-[#202020]">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader 
          pageName="Pricing"
          timePeriod={timePeriod} 
          onTimePeriodChange={setTimePeriod}
        />
      </div>

      {/* Mobile Navbar */}
      <div className="md:hidden">
        <MobileNavbar 
          pageName="Pricing" 
          timePeriod={timePeriod} 
          onTimePeriodChange={setTimePeriod}
          activeSection="pricing"
        />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-8 px-4 md:px-6 pb-6">
        {/* Feature Carousel */}
        <div>
          <FeatureCarousel />
        </div>

        {/* Pricing Tiers */}
        <div>
          <PricingTiers />
        </div>

        {/* Comparison Table and FAQ - Side by Side */}
        <div className="flex flex-col md:grid md:grid-cols-[2fr_1fr] gap-6">
          {/* Left Column - Comparison Table */}
          <div className="min-h-0">
            <ComparisonTable />
          </div>
          
          {/* Right Column - FAQ */}
          <div className="min-h-0">
            <div className="card-surface flex flex-col gap-6">
              <h2 className="text-card-header">FAQ</h2>
              <div className="flex flex-col gap-6">
                {pricingFAQs.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="shrink-0 mt-1">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold"
                        style={{ backgroundColor: 'var(--accent-purple)', color: '#fff' }}
                      >
                        ?
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <h3 className="text-body font-semibold">{item.question}</h3>
                      <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
                        {item.answer}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

