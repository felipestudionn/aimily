'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { PublicNav } from './PublicNav';
import { AuthModal } from '@/components/auth/AuthModal';
import { useRouter } from 'next/navigation';
import { locales } from '@/i18n/config';

/**
 * Global navigation that persists across page transitions.
 * Lives in the root layout — never remounts between routes.
 * Only renders on public pages (not in /collection/*, /my-collections, etc.)
 *
 * Marketing pages live under /[locale]/ so the real pathname is always
 * /en, /es/contact, /fr/trust, etc. We strip the locale segment before
 * matching so PUBLIC_ROUTES / LIGHT_ROUTES stay locale-agnostic.
 */

// Routes simplified 2026-04-28 — /discover, /how-it-works, /meet-aimily,
// /pricing were consolidated into `/`.
// Added 2026-05-21: /studio, /in-season — marketing-locale-only pages.
const PUBLIC_ROUTES = ['/', '/contact', '/trust', '/video-reel', '/studio', '/in-season', '/strategy'];
const LIGHT_ROUTES = ['/privacy', '/terms', '/cookies'];

function stripLocale(pathname: string): string {
  // /en          → /
  // /es/contact  → /contact
  // /fr/studio/x → /studio/x
  for (const locale of locales) {
    if (pathname === `/${locale}`) return '/';
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(`/${locale}`.length);
  }
  return pathname;
}

export function GlobalNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const normalized = stripLocale(pathname);
  const isPublic = PUBLIC_ROUTES.includes(normalized);
  const isLight = LIGHT_ROUTES.includes(normalized);
  const shouldShow = isPublic || isLight;

  if (!shouldShow) return null;

  const handleAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <>
      <PublicNav
        variant={isLight ? 'light' : 'dark'}
        onAuth={handleAuth}
      />
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => { setAuthOpen(false); router.push('/my-collections'); }}
        defaultMode={authMode}
      />
    </>
  );
}
