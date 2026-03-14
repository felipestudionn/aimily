import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ServiceWorkerRegistrar } from '@/components/pwa/ServiceWorkerRegistrar';
import { CookieConsent } from '@/components/CookieConsent';
import { Analytics } from '@vercel/analytics/react';

export const metadata: Metadata = {
  title: 'aimily — Collection Management',
  description: 'Plan, design, and launch fashion collections.',
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <LanguageProvider>
            <SubscriptionProvider>
              <ServiceWorkerRegistrar />
              <main className="relative min-h-screen">{children}</main>
              <CookieConsent />
              <Analytics />
            </SubscriptionProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
