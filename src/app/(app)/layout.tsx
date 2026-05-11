/* ═══════════════════════════════════════════════════════════════════
   (app)/layout.tsx — root layout for the AUTHENTICATED APP.

   Houses every route the user only reaches after login: account,
   my-collections, collection, calendar, new-collection, planner, p,
   presentation, tech-pack, welcome, video-reel, color-palettes,
   library, vendor, auth, icon-test.

   Marketing pages live in [locale]/layout.tsx (with dynamic html lang
   for SEO). The (app) route group keeps its existing English-default
   shell because LanguageContext continues running for the in-app UI.

   Route group syntax `(app)/` is transparent in the URL — `/account`
   stays `/account`. See SEO-GEO-STRATEGY §3.3.2.
   ═══════════════════════════════════════════════════════════════════ */

import '@/styles/globals.css';
import { geist } from '@/lib/fonts';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ServiceWorkerRegistrar } from '@/components/pwa/ServiceWorkerRegistrar';
import { CookieConsent } from '@/components/CookieConsent';
import { ObservabilityBootstrap } from '@/components/ObservabilityBootstrap';
import { GlobalNav } from '@/components/layout/GlobalNav';
import { ToastProvider } from '@/components/ui/toast';
import { Analytics } from '@vercel/analytics/react';
import { GoogleAdsTag } from '@/components/GoogleAdsTag';
import { cn } from '@/lib/utils';
import { Suspense } from 'react';
import { AssistantMount } from '@/components/aimily-assistant/AssistantMount';
import { organizationSchema, jsonLdScript } from '@/lib/schema/aimily';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)}>
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationSchema()) }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <LanguageProvider>
            <SubscriptionProvider>
              <ToastProvider>
                <ObservabilityBootstrap />
                <ServiceWorkerRegistrar />
                <GlobalNav />
                <Suspense fallback={<main className="relative min-h-screen">{children}</main>}>
                  <AssistantMount>
                    <main className="relative min-h-screen">{children}</main>
                  </AssistantMount>
                </Suspense>
                <CookieConsent />
                <Analytics />
                <GoogleAdsTag />
              </ToastProvider>
            </SubscriptionProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
