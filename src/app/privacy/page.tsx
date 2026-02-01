import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Moneta',
  description: 'Privacy policy for Moneta.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#202020]">
      <div className="max-w-2xl mx-auto px-6 md:px-8 py-12 md:py-16">
        <div
          className="rounded-[30px] p-6 md:p-8"
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          <h1 className="text-page-title text-[#E7E4E4] font-bold mb-4">
            Privacy Policy
          </h1>
          <p className="text-body text-[#E7E4E4] opacity-70 mb-6">
            Our privacy policy will be published here. Contact us for questions via the Help Center.
          </p>
          <Link
            href="/"
            className="text-body font-semibold transition-colors hover:opacity-90"
            style={{ color: 'var(--accent-purple)' }}
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
