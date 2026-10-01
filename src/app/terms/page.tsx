import LegalPageShell, { LegalSection } from '@/components/landing/LegalPageShell';

const UPDATED_AT = '2026-10-01T12:00:00Z';

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms and Conditions" updatedAt={UPDATED_AT}>
      <LegalSection title="1. Acceptance of terms">
        <p>
          By accessing or using Moneta, you agree to these Terms and Conditions and all applicable laws and regulations.
          If you do not agree, please do not use the service.
        </p>
      </LegalSection>

      <LegalSection title="2. Description of service">
        <p>
          Moneta is a personal financial dashboard for informational and tracking purposes. The core service is free;
          Moneta Premium is an optional subscription that removes the monthly limit on bank statement imports. Billing
          currently runs in Stripe test mode, so no real payments are taken. All data and calculations are provided
          &quot;as is&quot; and should be verified independently.
        </p>
      </LegalSection>

      <LegalSection title="3. No professional advice">
        <p>
          Nothing in Moneta is financial, investment, legal or tax advice. You are responsible for your own financial
          decisions. Moneta is not liable for losses or damages arising from your use of the service or reliance on its
          data.
        </p>
      </LegalSection>

      <LegalSection title="4. Account security">
        <p>
          Sign-in is managed by Clerk. You are responsible for keeping your credentials confidential and for all activity
          under your account. We may suspend or terminate accounts that violate these terms.
        </p>
      </LegalSection>

      <LegalSection title="5. Use license">
        <p>
          You may use Moneta for personal, non-commercial purposes. This is a license, not a transfer of title. You may
          not use the service for any illegal purpose or to harass, abuse or harm others.
        </p>
      </LegalSection>

      <LegalSection title="6. Limitation of liability">
        <p>
          In no event shall Moneta or its developers be liable for any damages (including loss of data or profit, or
          business interruption) arising from the use of, or inability to use, Moneta.
        </p>
      </LegalSection>

      <LegalSection title="7. Contact us">
        <p>
          Questions about these terms? Email <strong className="text-fg">egorkabantsov@gmail.com</strong>.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
