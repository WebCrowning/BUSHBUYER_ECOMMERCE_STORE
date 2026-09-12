import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import { WhatsAppFloatWrapper } from "@/components/whatsapp-float-wrapper";
import { ChatbotProvider } from "@/components/chatbot-provider";
import { CookiesPolicy } from "@/components/cookies-policy";
import { TrafficTracker } from "@/components/traffic-tracker";
import { PWAProvider } from "@/components/pwa-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bushbuyer.com"),
  title: "Bushbuyer | Premium African Raw Food Marketplace",
  description:
    "Shop authentic African raw food ingredients including snails, dry fish, and eru with fast delivery worldwide. Direct from trusted suppliers.",
  keywords: "African food, raw ingredients, snails, dry fish, eru, African marketplace",
  authors: [{ name: "Bushbuyer" }],
  creator: "Bushbuyer",
  publisher: "Bushbuyer",
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://bushbuyer.com",
    title: "Bushbuyer | Premium African Raw Food Marketplace",
    description: "Shop authentic African raw food ingredients with worldwide delivery",
    siteName: "Bushbuyer",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Bushbuyer - African Raw Food Marketplace",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bushbuyer | Premium African Raw Food Marketplace",
    description: "Shop authentic African raw food ingredients with worldwide delivery",
    images: ["/images/og-image.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/icons/icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bushbuyer",
  },
  formatDetection: {
    telephone: false,
  },
  alternates: {
    canonical: "https://bushbuyer.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#1a3a2a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Bushbuyer" />
        <meta name="application-name" content="Bushbuyer" />
        <meta name="msapplication-TileColor" content="#1a3a2a" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-144x144.png" />
        <link rel="mask-icon" href="/favicon.ico" color="#1a3a2a" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col">
        <AppProviders>
          <TrafficTracker />
          {children}
          <WhatsAppFloatWrapper />
          <ChatbotProvider />
          <CookiesPolicy />
          <PWAProvider />
        </AppProviders>
      </body>
    </html>
  );
}
