import LandingPage from '@/components/LandingPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Moneta — Elegant Financial Tracking",
  description: "Experience the next generation of personal finance management. Beautiful charts, deep insights, and secure tracking.",
};

export default function Home() {
  return <LandingPage />;
}
