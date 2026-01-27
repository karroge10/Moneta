'use client';

import { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import FAQSection from '@/components/help/FAQSection';
import SendFeedbackCard from '@/components/help/SendFeedbackCard';
import LearningCenterCard from '@/components/help/LearningCenterCard';
import { faqData } from '@/lib/faqData';
import { TimePeriod } from '@/types/dashboard';

export default function HelpPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('All Time');

  return (
    <main className="min-h-screen bg-[#202020]">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader 
          pageName="Help Center"
        />
      </div>

      {/* Mobile Navbar */}
      <div className="md:hidden">
        <MobileNavbar 
          pageName="Help Center" 
          timePeriod={timePeriod} 
          onTimePeriodChange={setTimePeriod}
          activeSection="help"
        />
      </div>

    {/* Content */}
    {/* Mobile: stacked */}
    <div className="md:hidden flex flex-col gap-4 px-4 pb-4">
      <FAQSection faqItems={faqData} />
      <SendFeedbackCard />
      <LearningCenterCard />
    </div>

    {/* Tablet: even split */}
    <div className="hidden md:grid 2xl:hidden md:grid-cols-[1fr_1fr] md:gap-4 md:px-6 md:pb-6">
      <div className="min-h-0">
        <FAQSection faqItems={faqData} />
      </div>
      <div className="flex flex-col gap-4 min-h-0">
        <SendFeedbackCard />
        <LearningCenterCard />
      </div>
    </div>

    {/* Desktop: weighted to FAQ */}
    <div className="hidden 2xl:grid 2xl:grid-cols-[1.1fr_0.9fr] 2xl:gap-4 2xl:px-6 2xl:pb-6">
      <div className="min-h-0">
        <FAQSection faqItems={faqData} />
      </div>
      <div className="flex flex-col gap-4 min-h-0">
        <SendFeedbackCard />
        <LearningCenterCard />
      </div>
    </div>
    </main>
  );
}

