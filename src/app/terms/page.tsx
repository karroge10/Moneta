'use client';

import Link from 'next/link';
import { NavArrowLeft } from 'iconoir-react';
import { useAuth } from '@clerk/nextjs';

export default function TermsPage() {
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
            Terms and Conditions
          </h1>
          <div className="space-y-6 text-body text-[#E7E4E4] opacity-80 leading-relaxed">
            <p>
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">1. Acceptance of Terms</h2>
              <p>By accessing or using Moneta, you agree to be bound by these Terms and Conditions and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">2. Description of Service</h2>
              <p>Moneta is a personal financial dashboard provided as a free service. It is designed for informational and tracking purposes only. Moneta does NOT provide financial, investment, legal, or tax advice. All data and calculations are provided "as is" and should be verified independently.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">3. No Professional Advice</h2>
              <p>Any information provided within Moneta is not intended as professional financial advice. You are responsible for your own financial decisions. Moneta is not liable for any losses or damages arising from your use of the service or reliance on its data.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">4. Account Security</h2>
              <p>Access to Moneta is managed through Clerk. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. We reserve the right to suspend or terminate accounts that violate these terms.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">5. Use License</h2>
              <p>Permission is granted to use Moneta for personal, non-commercial use. This is the grant of a license, not a transfer of title. You may not use the service for any illegal purpose or to harass, abuse, or harm others.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">6. Limitation of Liability</h2>
              <p>In no event shall Moneta or its developers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Moneta's website.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">7. Contact Us</h2>
              <p>If you have any questions about these Terms, please contact us at <strong>egorkabantsov@gmail.com</strong>.</p>
            </section>

          </div>
        </div>
      </div>
    </main>
  );
}
