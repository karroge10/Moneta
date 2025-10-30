import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Sen } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
      // Also expose logo for broad agent/UA compatibility
      { url: "/monetalogo.png", rel: "icon", sizes: "any", type: "image/png" },
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
  themeColor: "#202020",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sen.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar />
          <div style={{ marginLeft: "280px", flex: 1 }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
