import type { Metadata, Viewport } from "next";
import { Sen } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ToastProvider } from "@/contexts/ToastContext";

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
                {children}
              </ToastProvider>
            </NotificationProvider>
          </CurrencyProvider>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
