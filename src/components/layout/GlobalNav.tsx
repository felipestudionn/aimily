'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { PublicNav } from './PublicNav';
import { AuthModal } from '@/components/auth/AuthModal';
import { useRouter } from 'next/navigation';

/**
 * Global navigation that persists across page transitions.
 * Lives in the root layout — never remounts between routes.
 * Only renders on public pages (not in /collection/*, /my-collections, etc.)
 */

const PUBLIC_ROUTES = ['/', '/discover', '/how-it-works', '/contact', '/trust', '/meet-aimily', '/video-reel'];
const LIGHT_ROUTES = ['/privacy', '/terms', '/cookies', '/pricing'];

export function GlobalNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const isPublic = PUBLIC_ROUTES.includes(pathname);
  const isLight = LIGHT_ROUTES.includes(pathname);
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
