import type { Metadata, Viewport } from "next";
import { Sen } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { Analytics } from "@vercel/analytics/react";

const sen = Sen({
  variable: "--font-sen",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://monetafin.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "Moneta — Smart Financial Dashboard",
    template: "%s | Moneta"
  },
  description: "Experience the next generation of personal finance management. Beautiful charts, deep insights, and secure tracking.",
  keywords: ["financial dashboard", "expense tracker", "investment portfolio", "money management", "personal finance"],
  authors: [{ name: "Moneta Team" }],
  creator: "Moneta",
  publisher: "Moneta",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(siteUrl),
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/monetalogo.png"],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Moneta",
    title: "Moneta — Smart Financial Dashboard",
    description: "Elegant and powerful financial tracking for modern investors.",
    images: [
      {
        url: "/dashboard.png",
        width: 1200,
        height: 630,
        alt: "Moneta Dashboard Overview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Moneta — Smart Financial Dashboard",
    description: "Elegant and powerful financial tracking for modern investors.",
    images: ["/dashboard.png"],
    creator: "@moneta_app",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentSiteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#AC66DA",
          colorBackground: "#1a1a1a",
          colorInputBackground: "#282828",
          colorInputText: "#E7E4E4",
          colorText: "#E7E4E4",
          colorTextSecondary: "rgba(231, 228, 228, 0.7)",
          colorDanger: "#D93F3F",
          colorSuccess: "#74C648",
          fontFamily: "var(--font-sen), Arial, Helvetica, sans-serif",
          borderRadius: "15px",
        },
        elements: {
          card: "border border-[rgba(231,228,228,0.06)] shadow-[0_10px_20px_rgba(0,0,0,0.3)]",
          cardBox: "rounded-[30px]",
        }
      }}
      afterSignOutUrl="/"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      allowedRedirectOrigins={[currentSiteUrl, "http://localhost:3000", "http://127.0.0.1:3000"]}
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
                {children}
                <Analytics />
              </ToastProvider>
            </NotificationProvider>
          </CurrencyProvider>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

