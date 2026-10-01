import type { Metadata } from 'next';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import FAQSection from '@/components/help/FAQSection';
import SendFeedbackCard from '@/components/help/SendFeedbackCard';
import LearningCenterCard from '@/components/help/LearningCenterCard';
import LegalSection from '@/components/help/LegalSection';
import { faqData } from '@/lib/faqData';

export const metadata: Metadata = {
  title: 'Help Center',
};

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="hidden md:block">
        <DashboardHeader pageName="Help Center" />
      </div>

      <div className="md:hidden">
        <MobileNavbar pageName="Help Center" activeSection="help" />
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 pb-4 md:grid-cols-2 md:px-6 md:pb-6 2xl:grid-cols-[1.1fr_0.9fr]">
        <div className="min-h-0">
          <FAQSection faqItems={faqData} />
        </div>
        <div className="flex min-h-0 flex-col gap-4">
          <SendFeedbackCard />
          <LearningCenterCard />
          <LegalSection />
        </div>
      </div>
    </main>
  );
}
