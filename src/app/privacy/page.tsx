import Link from 'next/link';
import { NavArrowLeft } from 'iconoir-react';

export const metadata = {
  title: 'Privacy Policy | Moneta',
  description: 'Privacy policy for Moneta.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 md:px-8 py-16 md:py-24">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-body font-semibold text-[#E7E4E4] opacity-70 hover:opacity-100 hover:text-[#AC66DA] transition-colors mb-8"
        >
          <NavArrowLeft width={20} height={20} />
          Back to home
        </Link>
        <div className="rounded-[30px] p-8 md:p-12 surface-elevated bg-[#282828] border border-[#3a3a3a] shadow-lg">
          <h1 className="text-page-title text-[#E7E4E4] font-bold mb-8 tracking-tight">
            Privacy Policy
          </h1>
          <div className="space-y-6 text-body text-[#E7E4E4] opacity-80 leading-relaxed">
            <p>
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">1. Information We Collect</h2>
              <p>We collect information that you provide directly to us, including your personal details necessary to create an account, and the financial data you input or connect to the Moneta application.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">2. How We Use Your Information</h2>
              <p>We use your data to keep the app running, personalize your dashboard, and give you clear insights into your finances.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">3. Data Security</h2>
              <p>Your data is protected with bank-grade encryption. We take security seriously to ensure your financial information stays private and under your control.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">4. Contact Us</h2>
              <p>If you have any questions or concerns about our Privacy Policy or your data, please contact us at <strong>egorkabantsov@gmail.com</strong>.</p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
