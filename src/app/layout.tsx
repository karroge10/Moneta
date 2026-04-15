import type { Metadata, Viewport } from "next";
import { Sen } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import DynamicLayout from "@/components/layout/DynamicLayout";
import { QueryProvider } from "@/providers/QueryProvider";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { headers } from "next/headers";

const sen = Sen({
  variable: "--font-sen",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Moneta",
  description: "Smart Financial Dashboard",
  applicationName: "Moneta",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Moneta",
    description: "Smart Financial Dashboard",
    images: [
      { url: "/monetalogo.png", width: 512, height: 512, alt: "Moneta Logo" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const isUnauthorizedPage = headersList.get("x-is-unauthorized") === "true";
  const isLandingPage = headersList.get("x-is-landing-page") === "true";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return (
    <ClerkProvider
      afterSignOutUrl="/"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      allowedRedirectOrigins={[siteUrl, "http://localhost:3000", "http://127.0.0.1:3000"]}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${sen.variable} antialiased`}
        >
          <QueryProvider>
            {/* CurrencyProvider wraps everything to ensure useCurrency is always available */}
            <CurrencyProvider>
              <NotificationProvider>
              <ToastProvider>
                <DynamicLayout
                  initialIsUnauthorized={isUnauthorizedPage}
                  initialIsLanding={isLandingPage}
                >
                  {children}
                </DynamicLayout>
              </ToastProvider>
            </NotificationProvider>
          </CurrencyProvider>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
