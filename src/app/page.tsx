'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { Check, X, Sparkles, Zap, Building2, Crown, ArrowRight, ChevronDown } from 'lucide-react';

const PRICING_PLANS = [
  {
    id: 'free',
    name: 'Free',
    icon: Sparkles,
    price: 0,
    priceAnnual: 0,
    description: 'Explore the platform',
    features: [
      { text: '1 collection', included: true },
      { text: '10 AI generations/month', included: true },
      { text: '1 user', included: true },
      { text: 'Basic timeline', included: true },
      { text: 'Excel export', included: false },
      { text: 'Trend analytics', included: false },
      { text: 'Go-to-market planning', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Zap,
    price: 49,
    priceAnnual: 39,
    description: 'For independent designers',
    popular: true,
    features: [
      { text: 'Unlimited collections', included: true },
      { text: '100 AI generations/month', included: true },
      { text: 'Up to 3 users', included: true },
      { text: 'Full Gantt timeline + export', included: true },
      { text: 'Excel export', included: true },
      { text: 'Trend analytics', included: true },
      { text: 'Go-to-market planning', included: false },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    icon: Building2,
    price: 299,
    priceAnnual: 199,
    description: 'For brands with a team',
    features: [
      { text: 'Unlimited collections', included: true },
      { text: '500 AI generations/month', included: true },
      { text: 'Up to 10 users', included: true },
      { text: 'Full Gantt timeline + export', included: true },
      { text: 'Excel export', included: true },
      { text: 'Advanced trend analytics', included: true },
      { text: 'Go-to-market planning', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Crown,
    price: 499,
    priceAnnual: 399,
    description: 'For growing brands',
    features: [
      { text: 'Unlimited collections', included: true },
      { text: 'Unlimited AI generations', included: true },
      { text: 'Unlimited users', included: true },
      { text: 'Full Gantt timeline + export', included: true },
      { text: 'Excel export', included: true },
      { text: 'Advanced trend analytics', included: true },
      { text: 'Go-to-market planning', included: true },
    ],
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [annual, setAnnual] = useState(true);

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
        <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 md:px-10 py-5 animate-fade-in-up">
          <div className="flex items-center gap-6">
            <Link href="/discover" className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors">
              Discover
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
              className="text-crema text-xs font-medium tracking-widest uppercase hover:text-crema/70 transition-colors"
            >
              Sign up
            </button>
          </div>
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
              GET STARTED
            </button>
            <button
              onClick={() => openAuth('signin')}
              className="btn-secondary px-10 py-4 text-sm tracking-[0.15em]"
            >
              SIGN IN
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <a
          href="#pricing"
          className="absolute bottom-10 z-20 flex flex-col items-center gap-2 text-gris/30 hover:text-gris/60 transition-colors animate-bounce"
        >
          <span className="text-[10px] tracking-widest uppercase font-medium">Pricing</span>
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
            <p className="text-gris/60 text-lg mb-8">
              Choose the plan that fits your brand
            </p>

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
                  Save ~25%
                </span>
              )}
            </div>
          </div>

          {/* Plans grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  </div>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-crema">{price}€</span>
                    {price > 0 && (
                      <span className="text-gris/40 text-sm">/mo</span>
                    )}
                    {price === 0 && (
                      <span className="text-gris/40 text-sm ml-1">forever</span>
                    )}
                    {annual && price > 0 && (
                      <div className="text-xs text-gris/30 mt-1">
                        {price * 12}€/year{' '}
                        <span className="line-through text-gris/20">{plan.price * 12}€</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => openAuth('signup')}
                    className={`w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                      plan.popular
                        ? 'bg-crema text-carbon hover:bg-crema/90'
                        : 'bg-crema/10 text-crema hover:bg-crema/20 border border-crema/10'
                    }`}
                  >
                    {plan.id === 'free' ? 'Start free' : 'Get started'}
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
            All plans include SketchFlow, AI Studio, and Gantt Timeline.
            <br />
            <span className="text-gris/20 text-xs">Prices excl. VAT. Tax calculated at checkout.</span>
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <div className="relative z-20">
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
