import LandingPage from '@/components/LandingPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: "Moneta: Smart Financial Dashboard" },
  description: "Track spending, income, goals and investments in one place, with clear charts and bank statement import.",
  alternates: {
    canonical: '/',
  },
};

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Moneta",
    "operatingSystem": "Web",
    "applicationCategory": "FinanceApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Smart financial dashboard for modern life. Track spending, income, goals and investments in one place, with clear charts and bank statement import."
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  );
}

