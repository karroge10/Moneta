import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Transactions", template: "%s | Moneta" } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
