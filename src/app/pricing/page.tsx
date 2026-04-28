'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

// Plan + pack metadata is structural only. All visible labels come from i18n.
const PLAN_META = [
  { id: 'starter' as PlanId, price: 199, priceAnnual: 159, imageryNum: 200, seatsNum: 1, icon: Rocket },
  { id: 'professional' as PlanId, price: 599, priceAnnual: 479, imageryNum: 1000, seatsNum: 5, icon: Building2, popular: true },
  { id: 'professional_max' as PlanId, price: 1499, priceAnnual: 1199, imageryNum: 5000, seatsNum: 25, icon: Crown },
  { id: 'enterprise' as PlanId, price: null, priceAnnual: null, imageryNum: -1, seatsNum: -1, icon: Crown },
];

const PACKS: { id: PackId; imagery: number; price: number; perImg: string }[] = [
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

  const tp = t.pricingPage;

  // Plan name + tagline + highlights resolution by id
  const planLabels = (id: PlanId) => {
    if (id === 'starter') return { name: t.landing.starter, tagline: tp.starterTagline, highlights: [tp.hStarter1, tp.hStarter2, tp.hStarter3, tp.hStarter4, tp.hStarter5] };
    if (id === 'professional') return { name: t.landing.professional, tagline: tp.professionalTagline, highlights: [tp.hPro1, tp.hPro2, tp.hPro3, tp.hPro4, tp.hPro5] };
    if (id === 'professional_max') return { name: tp.proMax, tagline: tp.proMaxTagline, highlights: [tp.hProMax1, tp.hProMax2, tp.hProMax3, tp.hProMax4, tp.hProMax5] };
    return { name: t.landing.enterprise, tagline: tp.enterpriseTagline, highlights: [tp.hEnt1, tp.hEnt2, tp.hEnt3, tp.hEnt4, tp.hEnt5] };
  };

  const handleSelectPlan = async (planId: PlanId) => {
    if (planId === 'enterprise') {
      window.location.href = 'mailto:hello@aimily.app?subject=Enterprise%20Plan%20Inquiry';
      return;
    }
    if (!user) { setShowAuth(true); return; }
    if (planId === subscription?.plan) return;
    setLoadingPlan(planId);
    try { await checkoutPlan(planId, annual); }
    finally { setLoadingPlan(null); }
  };

  const handleBuyPack = async (packId: PackId) => {
    if (!user) { setShowAuth(true); return; }
    setLoadingPack(packId);
    try { await buyCreditPack(packId); }
    finally { setLoadingPack(null); }
  };

  return (
    <div className="min-h-screen bg-[#fff6dc]">
      {/* GlobalNav (mounted in root layout) handles the top navigation —
          dropped the legacy <Navbar /> here that was creating a double
          header. Removed 2026-04-28. */}

      <div className="pt-28 pb-16 px-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-light text-carbon tracking-tight mb-3">
            {tp.title}
          </h1>
          <p className="text-lg text-carbon/60 mb-2">
            {tp.subtitleV2}
          </p>
        </div>

        {/* Trial banner */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="bg-carbon text-white rounded-md px-6 py-4 flex items-center gap-4">
            <div className="p-2 bg-white/10 rounded-md shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-sm">{tp.bannerTitle}</p>
              <p className="text-white/70 text-xs">{tp.bannerSubtitle}</p>
            </div>
          </div>
        </div>

        {/* Toggle annual/monthly */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm ${!annual ? 'text-carbon font-medium' : 'text-carbon/50'}`}>{t.landing.monthly}</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-14 h-7 rounded-full transition-colors ${annual ? 'bg-carbon' : 'bg-carbon/30'}`}
            aria-label="Toggle annual billing"
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${annual ? 'translate-x-7' : ''}`} />
          </button>
          <span className={`text-sm ${annual ? 'text-carbon font-medium' : 'text-carbon/50'}`}>{t.landing.annual}</span>
          {annual && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{tp.saveAnnual}</span>
          )}
        </div>

        {/* Plans grid — 4 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {PLAN_META.map((plan) => {
            const price = annual ? plan.priceAnnual : plan.price;
            const isCurrent = subscription?.plan === plan.id;
            const isLoading = loadingPlan === plan.id;
            const labels = planLabels(plan.id);
            const Icon = plan.icon;
            const imageryLabel = plan.imageryNum === -1
              ? tp.unlimitedImagery
              : `${plan.imageryNum.toLocaleString('en-US')} ${tp.imageryPerMonth}`;
            const seatsLabel = plan.seatsNum === -1
              ? tp.unlimitedUsers
              : plan.seatsNum === 1 ? tp.oneUser : `${plan.seatsNum} ${tp.seats}`;
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-md p-6 border transition-all hover:shadow-lg ${
                  plan.popular ? 'border-carbon shadow-md' : 'border-carbon/10'
                } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-carbon text-white text-xs px-3 py-1 rounded-full font-medium">
                    {tp.mostPopular}
                  </div>
                )}

                <div className="mb-4">
                  <Icon className="w-7 h-7 text-carbon mb-3" />
                  <h3 className="text-lg font-medium text-carbon tracking-tight">{labels.name}</h3>
                  <p className="text-xs text-carbon/50 mt-1 leading-relaxed min-h-[2.5rem]">{labels.tagline}</p>
                </div>

                <div className="mb-5 min-h-[5rem]">
                  {price !== null ? (
                    <>
                      <span className="text-3xl font-light text-carbon tracking-tight">{price}€</span>
                      <span className="text-carbon/50 text-sm">{tp.perMonthShort}</span>
                      {annual && (
                        <div className="text-xs text-carbon/40 mt-1">
                          {tp.billedMonthly} · {Math.round(((plan.price! - plan.priceAnnual!) / plan.price!) * 100)}% {tp.off}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-light text-carbon tracking-tight">{tp.custom}</span>
                      <div className="text-xs text-carbon/40 mt-1">{tp.customFrom}</div>
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
                    <>{tp.currentPlan}</>
                  ) : plan.id === 'enterprise' ? (
                    <>{tp.contactSales}<ArrowRight className="w-4 h-4" /></>
                  ) : (
                    <>{tp.startFreeTrial}<ArrowRight className="w-4 h-4" /></>
                  )}
                </button>

                {/* Imagery + seats — the two key dimensions */}
                <div className="mb-4 pb-4 border-b border-carbon/10 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <ImageIcon className="w-4 h-4 text-carbon/60 shrink-0" />
                    <span className="text-carbon font-medium">{imageryLabel}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-carbon/60 shrink-0" />
                    <span className="text-carbon font-medium">{seatsLabel}</span>
                  </div>
                </div>

                {/* Highlights */}
                <ul className="space-y-2.5">
                  {labels.highlights.map((h, i) => (
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
              <h2 className="text-2xl font-light text-carbon tracking-tight">{tp.packsTitle}</h2>
            </div>
            <p className="text-sm text-carbon/60 max-w-xl mx-auto">{tp.packsSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {PACKS.map((pack) => (
              <div
                key={pack.id}
                className="border border-carbon/10 rounded-md p-6 hover:border-carbon/30 transition-colors"
              >
                <div className="text-center mb-4">
                  <div className="text-3xl font-light text-carbon tracking-tight">+{pack.imagery}</div>
                  <div className="text-xs text-carbon/50 mt-1">{tp.imageryGenerations}</div>
                </div>
                <div className="text-center mb-4">
                  <div className="text-2xl font-medium text-carbon">€{pack.price}</div>
                  <div className="text-xs text-carbon/40 mt-1">{pack.perImg} {tp.perImagery}</div>
                </div>
                <button
                  onClick={() => handleBuyPack(pack.id)}
                  disabled={loadingPack === pack.id}
                  className="w-full py-2.5 px-4 rounded-md text-sm font-medium bg-carbon/5 text-carbon hover:bg-carbon/10 transition-colors flex items-center justify-center gap-2"
                >
                  {loadingPack === pack.id ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>{tp.buyPack}<ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs text-carbon/40 text-center mt-6">{tp.packsTip}</p>
        </div>

        {/* What counts as imagery */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-xl font-light text-carbon text-center mb-6 tracking-tight">{tp.whatCounts}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              { label: tp.countSketch, units: 1 },
              { label: tp.countColorize, units: 1 },
              { label: tp.countEditorial, units: 1 },
              { label: tp.countStillLife, units: 1 },
              { label: tp.countVisualRefs, units: 4 },
              { label: tp.countVideo, units: 5 },
              { label: tp.countText, units: 0 },
              { label: tp.countResearch, units: 0 },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-white/60 rounded-md px-4 py-3">
                <span className="text-carbon">{item.label}</span>
                <span className={`font-medium text-xs px-2 py-0.5 rounded-full ${
                  item.units === 0 ? 'bg-green-100 text-green-700' : 'bg-carbon/10 text-carbon'
                }`}>
                  {item.units === 0 ? tp.unlimited : `${item.units} imagery`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="text-center">
          <p className="text-carbon/50 text-sm">
            {tp.bottomNote}
            <br />
            <span className="text-carbon/30 text-xs">{tp.pricesExclVat}</span>
          </p>
          {isPaid && (
            <button
              onClick={() => openPortal()}
              className="mt-4 text-sm text-carbon/50 hover:text-carbon underline transition-colors"
            >
              {tp.manageSubscription}
            </button>
          )}
        </div>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
