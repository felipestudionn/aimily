import type { Metadata } from 'next';
import { Instrument_Serif, Geist } from 'next/font/google';
import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ServiceWorkerRegistrar } from '@/components/pwa/ServiceWorkerRegistrar';
import { CookieConsent } from '@/components/CookieConsent';
import { PostHogBootstrap } from '@/components/PostHogBootstrap';
import { GlobalNav } from '@/components/layout/GlobalNav';
import { ToastProvider } from '@/components/ui/toast';
import { Analytics } from '@vercel/analytics/react';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.aimily.app'),
  title: {
    default: 'aimily — fashion collection platform',
    template: '%s · aimily',
  },
  description: 'Plan, design, render and launch fashion collections. AI-powered. Same top-quality models on every plan. 14-day free trial.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'aimily',
  },
  themeColor: '#282A29',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  openGraph: {
    type: 'website',
    siteName: 'aimily',
    locale: 'en_US',
    images: [{ url: '/meet-aimily/og.jpg', width: 1200, height: 630, alt: 'aimily' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/meet-aimily/og.jpg'],
    creator: '@studionn_agency',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <LanguageProvider>
            <SubscriptionProvider>
              <ToastProvider>
                <PostHogBootstrap />
                <ServiceWorkerRegistrar />
                <GlobalNav />
                <main className="relative min-h-screen">{children}</main>
                <CookieConsent />
                <Analytics />
              </ToastProvider>
            </SubscriptionProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
