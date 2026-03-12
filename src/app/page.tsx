'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { Check, X, Sparkles, Rocket, Building2, Crown, ArrowRight, ChevronDown, Clock } from 'lucide-react';

const PRICING_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    icon: Rocket,
    price: 199,
    priceAnnual: 159,
    description: 'For founders & solo designers',
    tagline: '1 person, 1 brand',
    features: [
      { text: '1 user', included: true },
      { text: '2 active collections', included: true },
      { text: '100 AI generations/month', included: true },
      { text: 'All AI tools (sketches, models, video)', included: true },
      { text: 'Timeline / Gantt + export', included: true },
      { text: 'Tech Packs + PDF', included: true },
      { text: 'Trend analytics', included: true },
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    icon: Building2,
    price: 599,
    priceAnnual: 479,
    description: 'For teams & growing brands',
    tagline: '1 team, multiple brands',
    popular: true,
    features: [
      { text: '10 users', included: true },
      { text: 'Unlimited collections', included: true },
      { text: '500 AI generations/month', included: true },
      { text: 'All AI tools + trend alerts', included: true },
      { text: 'Real-time collaboration', included: true },
      { text: 'Roles & permissions', included: true },
      { text: 'Multi-brand support', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Crown,
    price: null,
    priceAnnual: null,
    description: 'For established brands',
    tagline: 'Multiple teams, full control',
    features: [
      { text: 'Unlimited users', included: true },
      { text: 'Unlimited AI generations', included: true },
      { text: 'SSO & API access', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'Dedicated support', included: true },
      { text: 'Custom onboarding (3 sessions)', included: true },
      { text: 'Everything in Professional', included: true },
    ],
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [annual, setAnnual] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);

  // If already authenticated, redirect to collections
  if (user) {
    router.push('/my-collections');
    return null;
  }

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <div className="bg-carbon">
      {/* ── Hero Section ── */}
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Discrete top navigation */}
        <nav className="absolute top-0 left-0 right-0 z-20 px-6 md:px-10 py-5 animate-fade-in-up">
          {/* Desktop nav */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/discover" className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors">
                Discover
              </Link>
              <Link href="/meet-aimily" className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors">
                Meet Aimily
              </Link>
              <Link href="/contact" className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors">
                Contact
              </Link>
              <a href="#pricing" className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors">
                Pricing
              </a>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() => openAuth('signin')}
                className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors"
              >
                Log in
              </button>
              <button
                onClick={() => openAuth('signup')}
                className="bg-crema text-carbon text-xs font-medium tracking-widest uppercase px-5 py-2.5 hover:bg-crema/90 transition-colors"
              >
                Start free trial
              </button>
            </div>
          </div>

          {/* Mobile nav */}
          <div className="md:hidden flex items-center justify-between">
            <Link href="/discover" className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors">
              Discover
            </Link>
            <button
              onClick={() => setMobileNav(!mobileNav)}
              className="text-gris/60 hover:text-crema transition-colors p-1"
              aria-label="Toggle menu"
            >
              {mobileNav ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile dropdown */}
          {mobileNav && (
            <div className="md:hidden mt-4 bg-carbon/95 backdrop-blur-sm border border-gris/20 rounded-xl p-5 flex flex-col gap-4">
              <Link href="/discover" onClick={() => setMobileNav(false)} className="text-gris/60 text-sm font-medium tracking-widest uppercase hover:text-crema transition-colors">
                Discover
              </Link>
              <Link href="/meet-aimily" onClick={() => setMobileNav(false)} className="text-gris/60 text-sm font-medium tracking-widest uppercase hover:text-crema transition-colors">
                Meet Aimily
              </Link>
              <Link href="/contact" onClick={() => setMobileNav(false)} className="text-gris/60 text-sm font-medium tracking-widest uppercase hover:text-crema transition-colors">
                Contact
              </Link>
              <a href="#pricing" onClick={() => setMobileNav(false)} className="text-gris/60 text-sm font-medium tracking-widest uppercase hover:text-crema transition-colors">
                Pricing
              </a>
              <hr className="border-gris/20" />
              <button
                onClick={() => { openAuth('signin'); setMobileNav(false); }}
                className="text-gris/60 text-sm font-medium tracking-widest uppercase hover:text-crema transition-colors text-left"
              >
                Log in
              </button>
              <button
                onClick={() => { openAuth('signup'); setMobileNav(false); }}
                className="bg-crema text-carbon text-sm font-medium tracking-widest uppercase px-5 py-2.5 hover:bg-crema/90 transition-colors text-center"
              >
                Start free trial
              </button>
            </div>
          )}
        </nav>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl">
          {/* Logo */}
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

          <p className="text-gris text-lg md:text-xl font-light tracking-wide leading-relaxed max-w-xl mb-12 animate-fade-in-up animate-delay-100">
            Plan, design, and launch your fashion collection.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up animate-delay-200">
            <button
              onClick={() => openAuth('signup')}
              className="btn-primary px-10 py-4 text-sm tracking-[0.15em]"
            >
              START FREE TRIAL
            </button>
            <a
              href="#pricing"
              className="btn-secondary px-10 py-4 text-sm tracking-[0.15em] text-center"
            >
              SEE PRICING
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <a
          href="#pricing"
          className="absolute bottom-6 md:bottom-10 z-20 flex flex-col items-center gap-1 text-gris/20 hover:text-gris/50 transition-colors animate-bounce"
        >
          <ChevronDown className="w-4 h-4" />
        </a>
      </div>

      {/* ── Pricing Section ── */}
      <section id="pricing" className="relative py-24 px-4">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-crema mb-3">
              Plans & Pricing
            </h2>
            <p className="text-gris/60 text-lg mb-4">
              All plans include every AI tool. The difference is scale.
            </p>

            {/* Trial badge */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <Clock className="w-4 h-4 text-crema/60" />
              <span className="text-crema/60 text-sm">14-day free trial — full access, no credit card</span>
            </div>

            {/* Toggle annual/monthly */}
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm ${!annual ? 'text-crema font-medium' : 'text-gris/40'}`}>
                Monthly
              </span>
              <button
                onClick={() => setAnnual(!annual)}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  annual ? 'bg-crema' : 'bg-gris/30'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-carbon transition-transform ${
                    annual ? 'translate-x-7' : ''
                  }`}
                />
              </button>
              <span className={`text-sm ${annual ? 'text-crema font-medium' : 'text-gris/40'}`}>
                Annual
              </span>
              {annual && (
                <span className="text-xs bg-crema/10 text-crema/80 px-2.5 py-0.5 rounded-full font-medium border border-crema/20">
                  Save ~20%
                </span>
              )}
            </div>
          </div>

          {/* Plans grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING_PLANS.map((plan) => {
              const price = annual ? plan.priceAnnual : plan.price;

              return (
                <div
                  key={plan.id}
                  className={`relative bg-carbon rounded-2xl p-6 border transition-all hover:border-crema/40 ${
                    plan.popular
                      ? 'border-crema/60 shadow-[0_0_30px_rgba(255,246,220,0.08)]'
                      : 'border-gris/20'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-crema text-carbon text-xs px-3 py-1 rounded-full font-medium">
                      Most popular
                    </div>
                  )}

                  <div className="mb-4">
                    <plan.icon className="w-7 h-7 text-crema/70 mb-3" />
                    <h3 className="text-xl font-bold text-crema">{plan.name}</h3>
                    <p className="text-sm text-gris/40 mt-1">{plan.description}</p>
                    <p className="text-xs text-gris/30 mt-0.5 italic">{plan.tagline}</p>
                  </div>

                  <div className="mb-6">
                    {price !== null ? (
                      <>
                        <span className="text-4xl font-bold text-crema">{price}€</span>
                        <span className="text-gris/40 text-sm">/mo</span>
                        {annual && (
                          <div className="text-xs text-gris/30 mt-1">
                            {price * 12}€/year{' '}
                            <span className="line-through text-gris/20">{plan.price! * 12}€</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-crema">Custom</span>
                        <div className="text-xs text-gris/30 mt-1">From €1,500/mo</div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => plan.id === 'enterprise'
                      ? (window.location.href = 'mailto:hello@aimily.app?subject=Enterprise%20Plan%20Inquiry')
                      : openAuth('signup')
                    }
                    className={`w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                      plan.popular
                        ? 'bg-crema text-carbon hover:bg-crema/90'
                        : 'bg-crema/10 text-crema hover:bg-crema/20 border border-crema/10'
                    }`}
                  >
                    {plan.id === 'enterprise' ? 'Contact sales' : 'Start free trial'}
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-gris/20 mt-0.5 shrink-0" />
                        )}
                        <span className={feature.included ? 'text-gris/70' : 'text-gris/25'}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Bottom note */}
          <p className="text-center text-gris/30 text-sm mt-12">
            All plans include every AI tool. The difference is scale and collaboration.
            <br />
            <span className="text-gris/20 text-xs">Prices excl. VAT. Tax calculated at checkout.</span>
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <div className="relative z-20 pb-6">
        <div className="flex items-center justify-center gap-6 py-5">
          <Link href="/terms" className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors">
            Privacy
          </Link>
          <Link href="/cookies" className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors">
            Cookies
          </Link>
        </div>
        <div className="h-px bg-gris/20" />
        <p className="text-center text-gris/20 text-[10px] tracking-wide mt-4">
          aimily is a product by StudioNN Agency S.L.
        </p>
      </div>

      {/* Auth */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => router.push('/my-collections')}
        defaultMode={authMode}
      />
    </div>
  );
}
