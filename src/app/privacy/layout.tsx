import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Moneta',
  description: 'Privacy policy for Moneta.',
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
