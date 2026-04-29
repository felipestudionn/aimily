'use client';

/* ═══════════════════════════════════════════════════════════════════
   Home (`/`) — fashion-editorial portada → full E2E narrative.

   Layer 1 (hero): minimal "aimily" wordmark + tagline + CTAs.
                   Acts like a magazine cover. No competing content.
   Layer 2 (content): MeetAimilyContent — full Devil Wears Prada angle,
                      AZUR · SS27 walkthrough across the 4 blocks,
                      enterprise artifacts, StudioNN origin.
   Layer 3 (pricing): PricingDetail — 4 plans synced with Stripe LIVE,
                      credit packs, "what counts as imagery" table.
   Layer 4 (final CTA): "That's all." — last conversion punch.
   Layer 5 (footer): SiteFooter — same as every other public page.

   Replaces and consolidates: the old / + /meet-aimily + /pricing.
   ═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n';
import { AuthModal } from '@/components/auth/AuthModal';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { track, Events } from '@/lib/posthog';
import { MeetAimilyContent } from '@/components/landing/MeetAimilyContent';
import { PricingDetail } from '@/components/landing/PricingDetail';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { useHomeTranslation } from '@/i18n/home';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslation();
  const h = useHomeTranslation();
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    track(Events.LANDING_VIEWED, { page: 'home' });
  }, []);

  // If already authenticated, redirect to collections — UNLESS the user
  // landed here intentionally to see pricing (e.g. clicked "Ver planes"
  // from /account). Detected via the #pricing hash. In that case we let
  // the page render and scroll to the pricing section.
  useEffect(() => {
    if (!user) return;
    if (typeof window !== 'undefined' && window.location.hash === '#pricing') {
      // Allow logged-in upgrade/downgrade flow. Scroll to pricing once mounted.
      const t = setTimeout(() => {
        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
      return () => clearTimeout(t);
    }
    router.push('/my-collections');
  }, [user, router]);

  const openAuth = () => {
    track(Events.CTA_CLICKED, { source: 'home', authed: !!user });
    if (user) router.push('/my-collections');
    else {
      track(Events.AUTH_OPENED, { source: 'home' });
      setAuthOpen(true);
    }
  };

  return (
    <div className="bg-carbon text-crema min-h-screen overflow-x-hidden">
      {/* ═══════════════════════ LAYER 1 — PORTADA (logo + tagline) ═══════════════════════ */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl">
          <div className="mb-10 animate-fade-in-up w-full flex justify-center">
            <Image
              src="/images/aimily-logo-white.png"
              alt="aimily"
              width={500}
              height={500}
              className="object-contain w-[clamp(140px,35vw,336px)] h-auto brightness-[0.95] sepia-[0.15]"
              priority
            />
          </div>

          <p className="text-crema/75 text-[18px] md:text-[20px] font-light tracking-[-0.01em] leading-relaxed max-w-xl mb-12 animate-fade-in-up animate-delay-100">
            {t.landing.tagline}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up animate-delay-200">
            <button
              onClick={openAuth}
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-crema text-carbon text-[14px] font-semibold tracking-[-0.01em] hover:bg-crema/90 transition-all"
            >
              {t.common.startFreeTrial}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full border border-crema/20 text-crema/85 text-[14px] font-medium hover:border-crema/40 hover:text-crema transition-all"
            >
              {t.common.seePricing}
            </a>
          </div>
        </div>

        {/* Scroll cue */}
        <a
          href="#meet-aimily"
          className="absolute bottom-10 z-20 flex flex-col items-center gap-2 text-crema/55 hover:text-crema transition-colors"
          aria-label="Scroll to content"
        >
          <ChevronDown className="w-5 h-5 animate-bounce" />
          <span className="text-[11px] tracking-[0.3em] uppercase">{h.hero.scrollCue}</span>
        </a>
      </section>

      {/* ═══════════════════════ LAYER 2 — MEET AIMILY (DWP narrative + AZUR) ═══════════════════════ */}
      <div id="meet-aimily">
        <MeetAimilyContent openAuth={openAuth} />
      </div>

      {/* ═══════════════════════ LAYER 3 — PRICING (4 plans + packs + imagery) ═══════════════════════ */}
      <PricingDetail openAuth={openAuth} />

      {/* ═══════════════════════ LAYER 4 — FINAL CTA ═══════════════════════ */}
      <section className="px-6 py-32 md:py-56 border-t border-crema/[0.06] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
          }}
        />
        <div className="max-w-5xl mx-auto text-center relative">
          <h2 className="text-[60px] md:text-[120px] lg:text-[160px] font-light tracking-[-0.04em] leading-[0.92] italic">
            {h.finalCta.title}
          </h2>
          <p className="mt-12 max-w-[600px] mx-auto text-[16px] md:text-[19px] text-crema/65 leading-[1.55] font-light tracking-[-0.01em]">
            {h.finalCta.subtitle}
          </p>
          <div className="mt-12 flex justify-center">
            <button
              onClick={openAuth}
              className="group inline-flex items-center gap-3 px-9 py-4 rounded-full bg-crema text-carbon text-[14px] font-semibold tracking-[-0.01em] hover:bg-crema/90 transition-all"
            >
              {h.finalCta.button}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ LAYER 5 — FOOTER ═══════════════════════ */}
      <SiteFooter variant="dark" />

      {/* Auth modal */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => router.push('/my-collections')}
        defaultMode="signup"
      />
    </div>
  );
}
