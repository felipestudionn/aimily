'use client';

/**
 * <TourDeck />
 *
 * Read-only embed of <EverythingInside /> for the public-facing
 * /welcome/tour route. No language picker, no completion CTA, no
 * onboarding state writes. Just the editorial deck behind a
 * shareable URL.
 *
 * Why public: this is the same content used in the post-signup
 * onboarding, but framed as a marketing surface. Logged-in users
 * can re-watch it from /account; prospects can be sent the link
 * directly.
 */

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { EverythingInside } from './EverythingInside';

export function TourDeck() {
  const t = useTranslation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-carbon text-crema">
      {/* Top bar — logo on the left, contextual CTA on the right */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 md:px-10 pt-8">
        <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
          <Image
            src="/images/aimily-logo-white.png"
            alt="aimily"
            width={84}
            height={28}
            className="opacity-70"
            priority
          />
        </Link>
        <Link
          href={user ? '/my-collections' : '/'}
          className="inline-flex items-center gap-1.5 text-[12px] tracking-[-0.01em] text-crema/55 hover:text-crema transition-colors"
        >
          {user ? 'Open aimily' : 'Get started'}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <EverythingInside t={t.welcome} variant="dark" showCta={false} />
    </div>
  );
}
