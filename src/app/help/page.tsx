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

      {/* Content - 2 Column Layout */}
      <div className="flex flex-col md:grid md:grid-cols-[1fr_1fr] gap-4 px-4 md:px-6 pb-6">
        {/* Left Column - FAQ */}
        <div className="min-h-0">
          <FAQSection faqItems={faqData} />
        </div>
        
        {/* Right Column - Send Feedback + Learning Center */}
        <div className="flex flex-col gap-4 min-h-0">
          <SendFeedbackCard />
          <LearningCenterCard />
        </div>
      </div>
    </main>
  );
}

