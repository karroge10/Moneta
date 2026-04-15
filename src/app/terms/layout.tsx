import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions | Moneta',
  description: 'Terms of service for Moneta.',
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
