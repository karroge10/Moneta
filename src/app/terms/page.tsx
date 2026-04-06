import Link from 'next/link';
import { NavArrowLeft } from 'iconoir-react';

export const metadata = {
  title: 'Terms and Conditions | Moneta',
  description: 'Terms of service for Moneta.',
};

export default function TermsPage() {
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
            Terms and Conditions
          </h1>
          <div className="space-y-6 text-body text-[#E7E4E4] opacity-80 leading-relaxed">
            <p>
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">1. Introduction</h2>
              <p>Welcome to Moneta. By using the app, you're agreeing to these terms. They're here to protect both you and our platform.</p>
            </section>
            
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">2. Application of Terms</h2>
              <p>These terms apply to everyone using Moneta. If we update them, we'll let you know. Continuing to use the app means you're good with the changes.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">3. User Data</h2>
              <p>Your data is yours. We never sell your personal info to anyone. Check our Privacy Policy for the full details on how we keep your data safe.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#E7E4E4] mt-8 mb-4">4. Contact Us</h2>
              <p>If you have any questions about these Terms, please contact us at <strong>egorkabantsov@gmail.com</strong>.</p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
