'use client';

import Link from 'next/link';
import { NavArrowLeft } from 'iconoir-react';
import { useAuth } from '@clerk/nextjs';

export default function PrivacyPage() {
  const { isSignedIn } = useAuth();

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 md:px-8 py-16 md:py-24">
        <Link 
          href={isSignedIn ? "/dashboard" : "/"}


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
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">1. Data Ownership & Privacy</h2>
              <p>At Moneta, we believe your financial data belongs to you. We do not sell, rent, or trade your personal information or financial data to third parties. Our platform is built with a privacy-first approach.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">2. Information We Collect</h2>
              <p>We collect only the information necessary to provide our service:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Account Information:</strong> Managed via Clerk (email, name, authentication logs).</li>
                <li><strong>Financial Data:</strong> Transactions, assets, and goals that you manually input or import via PDF.</li>
                <li><strong>Usage Data:</strong> Basic technical logs to help us improve the application's performance.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">3. Third-Party Services</h2>
              <p>We use trusted third-party services to enhance Moneta:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Clerk:</strong> For secure authentication and user management.</li>
                <li><strong>Neon/Prisma:</strong> For encrypted database storage.</li>
                <li><strong>CoinGecko & Stooq:</strong> For live market data tracking.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">4. Data Security</h2>
              <p>Your data is stored securely using industry-standard encryption. Access to your financial information is restricted and used only to generate your personal dashboard and insights.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">5. Your Rights</h2>
              <p>You have full control over your data. You can export your transaction history at any time through the Settings page. You also have the right to permanently delete your account and all associated data through the account management interface.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">6. Contact Us</h2>
              <p>If you have any questions or concerns about our Privacy Policy or your data, please contact us at <strong>egorkabantsov@gmail.com</strong>.</p>
            </section>

          </div>
        </div>
      </div>
    </main>
  );
}
