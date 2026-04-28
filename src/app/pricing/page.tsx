'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useTranslation } from '@/i18n';
import { AuthModal } from '@/components/auth/AuthModal';
import {
  Check,
  Rocket,
  Building2,
  Crown,
  Zap,
  ArrowRight,
  Clock,
  Image as ImageIcon,
} from 'lucide-react';

type PlanId = 'starter' | 'professional' | 'professional_max' | 'enterprise';
type PackId = 'pack_50' | 'pack_250' | 'pack_1000';

interface PlanCard {
  id: PlanId;
  name: string;
  tagline: string;
  price: number | null;
  priceAnnual: number | null;
  imagery: string;
  seats: string;
  popular?: boolean;
  icon: typeof Rocket;
  highlights: string[];
}

const PLAN_CARDS: PlanCard[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For solo founders building their first collections.',
    price: 199,
    priceAnnual: 159,
    imagery: '200 imagery / month',
    seats: '1 user',
    icon: Rocket,
    highlights: [
      'Unlimited brands & collections',
      'All 28 aimily models',
      'Top-quality AI on every render',
      'Unlimited text generation',
      'Email support',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    tagline: 'For small fashion teams shipping multiple drops.',
    price: 599,
    priceAnnual: 479,
    imagery: '1,000 imagery / month',
    seats: '5 users',
    popular: true,
    icon: Building2,
    highlights: [
      'Everything in Starter',
      'Video generation (Kling 2.1)',
      'Priority email support',
      'Roles & permissions',
      'Realtime collaboration',
    ],
  },
  {
    id: 'professional_max',
    name: 'Professional Max',
    tagline: 'For studios and brands at full creative velocity.',
    price: 1499,
    priceAnnual: 1199,
    imagery: '5,000 imagery / month',
    seats: '25 users',
    icon: Crown,
    highlights: [
      'Everything in Professional',
      '5× more imagery',
      '25 seats',
      'Priority email + setup call',
      'Volume top-up packs available',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Custom imagery + seats, dedicated onboarding.',
    price: null,
    priceAnnual: null,
    imagery: 'Unlimited imagery',
    seats: 'Unlimited users',
    icon: Crown,
    highlights: [
      'Everything in Pro Max',
      'Unlimited imagery',
      'API access',
      'SSO',
      'Dedicated onboarding',
    ],
  },
];

interface PackCard {
  id: PackId;
  imagery: number;
  price: number;
  perImg: string;
}

const PACKS: PackCard[] = [
  { id: 'pack_50', imagery: 50, price: 29, perImg: '€0.58' },
  { id: 'pack_250', imagery: 250, price: 119, perImg: '€0.48' },
  { id: 'pack_1000', imagery: 1000, price: 399, perImg: '€0.40' },
];

export default function PricingPage() {
  const { user } = useAuth();
  const { subscription, checkoutPlan, buyCreditPack, isPaid, openPortal } = useSubscription();
  const router = useRouter();
  const t = useTranslation();
  const [annual, setAnnual] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [loadingPack, setLoadingPack] = useState<PackId | null>(null);

  const handleSelectPlan = async (planId: PlanId) => {
    if (planId === 'enterprise') {
      window.location.href = 'mailto:hello@aimily.app?subject=Enterprise%20Plan%20Inquiry';
      return;
    }

    if (!user) {
      setShowAuth(true);
      return;
    }

    if (planId === subscription?.plan) return;

    setLoadingPlan(planId);
    try {
      await checkoutPlan(planId, annual);
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleBuyPack = async (packId: PackId) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setLoadingPack(packId);
    try {
      await buyCreditPack(packId);
    } finally {
      setLoadingPack(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff6dc]">
      <Navbar />

      <div className="pt-28 pb-16 px-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-light text-carbon tracking-tight mb-3">
            {t.pricingPage.title}
          </h1>
          <p className="text-lg text-carbon/60 mb-2">
            Same top-quality models on every plan. Differentiation by quantity, never by quality.
          </p>
        </div>

        {/* Trial banner */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="bg-carbon text-white rounded-md px-6 py-4 flex items-center gap-4">
            <div className="p-2 bg-white/10 rounded-md shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-sm">14-day free trial</p>
              <p className="text-white/70 text-xs">Full access. No card required.</p>
            </div>
          </div>
        </div>

        {/* Toggle annual/monthly */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm ${!annual ? 'text-carbon font-medium' : 'text-carbon/50'}`}>
            {t.landing.monthly}
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              annual ? 'bg-carbon' : 'bg-carbon/30'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${
                annual ? 'translate-x-7' : ''
              }`}
            />
          </button>
          <span className={`text-sm ${annual ? 'text-carbon font-medium' : 'text-carbon/50'}`}>
            {t.landing.annual}
          </span>
          {annual && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              Save 20%
            </span>
          )}
        </div>

        {/* Plans grid — 4 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {PLAN_CARDS.map((plan) => {
            const price = annual ? plan.priceAnnual : plan.price;
            const isCurrent = subscription?.plan === plan.id;
            const isLoading = loadingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-md p-6 border transition-all hover:shadow-lg ${
                  plan.popular ? 'border-carbon shadow-md' : 'border-carbon/10'
                } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-carbon text-white text-xs px-3 py-1 rounded-full font-medium">
                    Most popular
                  </div>
                )}

                <div className="mb-4">
                  <plan.icon className="w-7 h-7 text-carbon mb-3" />
                  <h3 className="text-lg font-medium text-carbon tracking-tight">{plan.name}</h3>
                  <p className="text-xs text-carbon/50 mt-1 leading-relaxed min-h-[2.5rem]">
                    {plan.tagline}
                  </p>
                </div>

                <div className="mb-5 min-h-[5rem]">
                  {price !== null ? (
                    <>
                      <span className="text-3xl font-light text-carbon tracking-tight">
                        {price}€
                      </span>
                      <span className="text-carbon/50 text-sm">/mo</span>
                      {annual && (
                        <div className="text-xs text-carbon/40 mt-1">
                          Billed monthly · {Math.round(((plan.price! - plan.priceAnnual!) / plan.price!) * 100)}% off
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-light text-carbon tracking-tight">Custom</span>
                      <div className="text-xs text-carbon/40 mt-1">From €3,000/mo</div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrent || isLoading}
                  className={`w-full py-2.5 px-4 rounded-md font-medium text-sm transition-all flex items-center justify-center gap-2 mb-4 ${
                    isCurrent
                      ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                      : plan.popular
                        ? 'bg-carbon text-white hover:bg-carbon/90'
                        : 'bg-carbon/5 text-carbon hover:bg-carbon/10'
                  }`}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : isCurrent ? (
                    <>Current plan</>
                  ) : plan.id === 'enterprise' ? (
                    <>
                      Contact sales
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Start free trial
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Imagery + seats — the two key dimensions */}
                <div className="mb-4 pb-4 border-b border-carbon/10 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <ImageIcon className="w-4 h-4 text-carbon/60 shrink-0" />
                    <span className="text-carbon font-medium">{plan.imagery}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-carbon/60 shrink-0" />
                    <span className="text-carbon font-medium">{plan.seats}</span>
                  </div>
                </div>

                {/* Highlights */}
                <ul className="space-y-2.5">
                  {plan.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <span className="text-carbon">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Aimily Credits packs */}
        <div className="bg-white rounded-md border border-carbon/10 p-8 mb-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-carbon" />
              <h2 className="text-2xl font-light text-carbon tracking-tight">Aimily Credits</h2>
            </div>
            <p className="text-sm text-carbon/60 max-w-xl mx-auto">
              One-time imagery top-ups for busy months. No subscription, no expiry — added straight to your account balance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {PACKS.map((pack) => (
              <div
                key={pack.id}
                className="border border-carbon/10 rounded-md p-6 hover:border-carbon/30 transition-colors"
              >
                <div className="text-center mb-4">
                  <div className="text-3xl font-light text-carbon tracking-tight">+{pack.imagery}</div>
                  <div className="text-xs text-carbon/50 mt-1">imagery generations</div>
                </div>
                <div className="text-center mb-4">
                  <div className="text-2xl font-medium text-carbon">€{pack.price}</div>
                  <div className="text-xs text-carbon/40 mt-1">{pack.perImg} per imagery</div>
                </div>
                <button
                  onClick={() => handleBuyPack(pack.id)}
                  disabled={loadingPack === pack.id}
                  className="w-full py-2.5 px-4 rounded-md text-sm font-medium bg-carbon/5 text-carbon hover:bg-carbon/10 transition-colors flex items-center justify-center gap-2"
                >
                  {loadingPack === pack.id ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Buy pack
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs text-carbon/40 text-center mt-6">
            Tip: 2-3 packs per month means you'd save with the next plan tier.
          </p>
        </div>

        {/* What counts as imagery */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-xl font-light text-carbon text-center mb-6 tracking-tight">
            What counts as one imagery?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Sketch from photo', units: '1' },
              { label: 'Colorize / 3D render', units: '1' },
              { label: 'Editorial on-model', units: '1' },
              { label: 'Still life / try-on / brand-model', units: '1' },
              { label: 'Brand visual references (4 images)', units: '4' },
              { label: 'Video Kling Pro', units: '5' },
              { label: 'Text generation (briefs, copy, plans, …)', units: 'free' },
              { label: 'Research & analysis', units: 'free' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-white/60 rounded-md px-4 py-3">
                <span className="text-carbon">{item.label}</span>
                <span className={`font-medium text-xs px-2 py-0.5 rounded-full ${
                  item.units === 'free' ? 'bg-green-100 text-green-700' : 'bg-carbon/10 text-carbon'
                }`}>
                  {item.units === 'free' ? 'Unlimited' : `${item.units} imagery`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="text-center">
          <p className="text-carbon/50 text-sm">
            All plans include a 14-day free trial. No card required.
            <br />
            <span className="text-carbon/30 text-xs">Prices exclude VAT.</span>
          </p>
          {isPaid && (
            <button
              onClick={() => openPortal()}
              className="mt-4 text-sm text-carbon/50 hover:text-carbon underline transition-colors"
            >
              Manage subscription
            </button>
          )}
        </div>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
