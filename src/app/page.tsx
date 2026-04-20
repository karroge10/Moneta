import LandingPage from '@/components/LandingPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Moneta — Elegant Financial Tracking",
  description: "Experience the next generation of personal finance management. Beautiful charts, deep insights, and secure tracking.",
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
    "description": "Smart financial dashboard for modern life. Experience the next generation of personal finance management with beautiful charts, deep insights, and secure tracking."
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

