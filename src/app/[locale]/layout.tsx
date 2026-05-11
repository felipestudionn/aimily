/* ═══════════════════════════════════════════════════════════════════
   [locale]/layout.tsx — root layout for MARKETING pages.

   Hosts: home, contact, trust, privacy, terms, cookies. Every URL
   carries a /[locale] prefix (en, es, fr, it, de, pt, nl, no, sv).
   `<html lang>` matches the segment for SEO.

   Authenticated app routes live under (app)/layout.tsx and keep their
   own English shell. See SEO-GEO-STRATEGY §3.3.

   Pattern follows next-intl official Next.js 16 setup:
   https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing
   ═══════════════════════════════════════════════════════════════════ */

import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getMessages } from 'next-intl/server';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import '@/styles/globals.css';
import { geist, instrumentSerif } from '@/lib/fonts';
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
import { GtagEventFirer } from '@/components/GtagEventFirer';
import { cn } from '@/lib/utils';
import { Suspense } from 'react';
import { AssistantMount } from '@/components/aimily-assistant/AssistantMount';
import { organizationSchema, jsonLdScript } from '@/lib/schema/aimily';
import { routing } from '@/i18n/routing';
import { locales, localeToOgLocale, type Locale } from '@/i18n/config';

const BASE = 'https://www.aimily.app';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#282A29',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const ogLocale = localeToOgLocale[locale as Locale];
  const languages = Object.fromEntries(
    locales.map((l) => [l, `${BASE}/${l}`]),
  );
  languages['x-default'] = `${BASE}/en`;

  return {
    metadataBase: new URL(BASE),
    title: {
      default: 'aimily — the only end-to-end AI platform for fashion brands',
      template: '%s · aimily',
    },
    description:
      'Brand DNA → Range Plan → Tech Packs → Campaigns in one platform. The only AI-native fashion software that connects every block — replaces PLM + design tool + ERP + marketing software. 30-day free trial.',
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'aimily',
    },
    alternates: {
      canonical: `${BASE}/${locale}`,
      languages,
    },
    openGraph: {
      type: 'website',
      siteName: 'aimily',
      locale: ogLocale,
      images: [{ url: '/meet-aimily/og.jpg', width: 1200, height: 630, alt: 'aimily' }],
    },
    twitter: {
      card: 'summary_large_image',
      images: ['/meet-aimily/og.jpg'],
      creator: '@studionn_agency',
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={cn('font-sans', geist.variable, instrumentSerif.variable)}>
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationSchema()) }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <AuthProvider>
            <LanguageProvider initialLanguage={locale as Locale}>
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
                  <Suspense fallback={null}><GtagEventFirer /></Suspense>
                </ToastProvider>
              </SubscriptionProvider>
            </LanguageProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
