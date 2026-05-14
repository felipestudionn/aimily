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

   Server Component since 2026-05-13: resolves user + subscription
   server-side via `@supabase/ssr` so the HTML lands already
   authenticated. Eliminates the auth/subscription flash that used to
   repaint the Navbar and every consumer of useAuth() on first mount.
   See `src/components/providers/AppProviders.tsx` for the client
   provider tree that receives the SSR'd values.
   ═══════════════════════════════════════════════════════════════════ */

import '@/styles/globals.css';
import { geist } from '@/lib/fonts';
import { AppProviders } from '@/components/providers/AppProviders';
import { ServiceWorkerRegistrar } from '@/components/pwa/ServiceWorkerRegistrar';
import { CookieConsent } from '@/components/CookieConsent';
import { ObservabilityBootstrap } from '@/components/ObservabilityBootstrap';
import { GlobalNav } from '@/components/layout/GlobalNav';
import { StudioSwitcher } from '@/components/layout/StudioSwitcher';
import { Analytics } from '@vercel/analytics/react';
import { GoogleAdsTag } from '@/components/GoogleAdsTag';
import { GtagEventFirer } from '@/components/GtagEventFirer';
import { cn } from '@/lib/utils';
import { Suspense } from 'react';
import { AssistantMount } from '@/components/aimily-assistant/AssistantMount';
import { organizationSchema, jsonLdScript } from '@/lib/schema/aimily';
import { getServerSession } from '@/lib/auth/server-session';
import { loadSubscriptionForUser, type LoadedSubscription } from '@/lib/billing/load-subscription';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolve auth + subscription server-side so the first paint already
  // has the correct user state. Auth routes (auth/login, auth/signup,
  // auth/callback) tolerate a null user — they handle their own gating.
  // Subscription is loaded best-effort; any failure falls back to client
  // refetch via `/api/billing/subscription`.
  const { user } = await getServerSession();
  let initialSubscription: LoadedSubscription | null = null;
  if (user) {
    try {
      initialSubscription = await loadSubscriptionForUser(user.id, user.email);
    } catch (err) {
      console.error('[app-layout] subscription SSR failed, falling back to client fetch', err);
    }
  }

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
        <AppProviders
          initialUser={user}
          initialSubscription={initialSubscription}
        >
          <ObservabilityBootstrap />
          <ServiceWorkerRegistrar />
          <GlobalNav />
          {/* StudioSwitcher renders only when the user has BOTH Aimily 360 and Aimily Studio (otherwise null) */}
          <StudioSwitcher />
          <Suspense fallback={<main className="relative min-h-screen">{children}</main>}>
            <AssistantMount>
              <main className="relative min-h-screen">{children}</main>
            </AssistantMount>
          </Suspense>
          <CookieConsent />
          <Analytics />
          <GoogleAdsTag />
          <Suspense fallback={null}><GtagEventFirer /></Suspense>
        </AppProviders>
      </body>
    </html>
  );
}
