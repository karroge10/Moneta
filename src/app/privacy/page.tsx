import LegalPageShell, { LegalSection } from '@/components/landing/LegalPageShell';

const UPDATED_AT = '2026-10-01T12:00:00Z';

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updatedAt={UPDATED_AT}>
      <LegalSection title="1. Data ownership">
        <p>
          Your financial data belongs to you. We do not sell, rent or trade your personal information or financial data
          to third parties.
        </p>
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <p>We collect only what is needed to provide the service:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-fg">Account information:</strong> managed by Clerk (email, name, sign-in history).
          </li>
          <li>
            <strong className="text-fg">Financial data:</strong> transactions, assets and goals that you enter by hand or
            import from a bank statement PDF.
          </li>
          <li>
            <strong className="text-fg">Profile details you choose to add:</strong> country, date of birth, profession and
            currency.
          </li>
          <li>
            <strong className="text-fg">Usage data:</strong> anonymous page view statistics and basic technical logs.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Peer comparisons">
        <p>
          If Data Sharing is on in Settings, your income, expenses, goal success rate, portfolio balance and financial
          health score are pooled with other members who also opted in. The pool is used to show members how they
          compare with the average for their age group, country or profession. Your name, email and individual
          transactions are never shown to anyone. You can turn Data Sharing off at any time; you then stop contributing
          and stop seeing comparisons.
        </p>
      </LegalSection>

      <LegalSection title="4. Third-party services">
        <p>We rely on these services to run Moneta:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-fg">Clerk:</strong> authentication and account management.
          </li>
          <li>
            <strong className="text-fg">Neon:</strong> database hosting.
          </li>
          <li>
            <strong className="text-fg">Stripe:</strong> payments for Moneta Premium. Card details go to Stripe and never
            reach our servers.
          </li>
          <li>
            <strong className="text-fg">Vercel Analytics:</strong> anonymous page view statistics.
          </li>
          <li>
            <strong className="text-fg">CoinGecko and Stooq:</strong> market prices for your investments. Only asset
            symbols are sent, never your holdings.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Data security">
        <p>
          All traffic to Moneta uses HTTPS, and your financial information is used only to build your own dashboard and,
          if you opt in, the peer comparisons described above.
        </p>
      </LegalSection>

      <LegalSection title="6. Your rights">
        <p>
          You can export your transactions at any time from the Settings page, and you can permanently delete your
          account and its data from the same page.
        </p>
      </LegalSection>

      <LegalSection title="7. Contact us">
        <p>
          Questions about this policy or your data? Email <strong className="text-fg">egorkabantsov@gmail.com</strong>.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
