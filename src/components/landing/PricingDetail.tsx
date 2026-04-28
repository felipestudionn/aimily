'use client';

/* ═══════════════════════════════════════════════════════════════════
   PricingDetail — single source of truth for plans + packs + imagery.

   Lives inside the home (`/#pricing`). Replaces both:
     - The 3-plan inline pricing block that used to live in /page.tsx
     - The standalone /pricing route (now redirected to /#pricing)

   4 plans synced 1:1 with Stripe LIVE: Starter, Professional, Pro Max,
   Enterprise. Same dark editorial language as the rest of the home.
   ═══════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useTranslation } from '@/i18n';
import { ArrowRight, Check, Clock, Zap } from 'lucide-react';

type PlanId = 'starter' | 'professional' | 'professional_max' | 'enterprise';
type PackId = 'pack_50' | 'pack_250' | 'pack_1000';

const PLAN_META: {
  id: PlanId;
  price: number | null;
  priceAnnual: number | null;
  imageryNum: number;
  seatsNum: number;
  popular?: boolean;
}[] = [
  { id: 'starter', price: 199, priceAnnual: 159, imageryNum: 200, seatsNum: 1 },
  { id: 'professional', price: 599, priceAnnual: 479, imageryNum: 1000, seatsNum: 5, popular: true },
  { id: 'professional_max', price: 1499, priceAnnual: 1199, imageryNum: 5000, seatsNum: 25 },
  { id: 'enterprise', price: null, priceAnnual: null, imageryNum: -1, seatsNum: -1 },
];

const PACKS: { id: PackId; imagery: number; price: number; perImg: string }[] = [
  { id: 'pack_50', imagery: 50, price: 29, perImg: '€0.58' },
  { id: 'pack_250', imagery: 250, price: 119, perImg: '€0.48' },
  { id: 'pack_1000', imagery: 1000, price: 399, perImg: '€0.40' },
];

interface PricingDetailProps {
  openAuth: () => void;
}

export function PricingDetail({ openAuth }: PricingDetailProps) {
  const { user } = useAuth();
  const { subscription, checkoutPlan, buyCreditPack, isPaid, openPortal } = useSubscription();
  const t = useTranslation();
  const tp = t.pricingPage;
  const [annual, setAnnual] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [loadingPack, setLoadingPack] = useState<PackId | null>(null);

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
    if (!user) { openAuth(); return; }
    if (planId === subscription?.plan) return;
    setLoadingPlan(planId);
    try { await checkoutPlan(planId, annual); }
    finally { setLoadingPlan(null); }
  };

  const handleBuyPack = async (packId: PackId) => {
    if (!user) { openAuth(); return; }
    setLoadingPack(packId);
    try { await buyCreditPack(packId); }
    finally { setLoadingPack(null); }
  };

  return (
    <section id="pricing" className="bg-crema text-carbon px-6 py-32 md:py-44 border-t border-carbon/[0.06]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="text-[12px] tracking-[0.3em] uppercase text-carbon/55 font-medium mb-6">
            Pricing
          </div>
          <h2 className="text-[40px] md:text-[64px] font-light tracking-[-0.03em] leading-[1.05] max-w-[1000px] mx-auto mb-6">
            <span className="italic">Free</span> for 14 days. Same models on every tier.
          </h2>
          <p className="max-w-[640px] mx-auto text-[16px] md:text-[18px] text-carbon/65 leading-[1.6] tracking-[-0.01em] mb-10">
            Differentiation by quantity, never by quality. Top imagery models on every plan.
          </p>

          {/* Trial badge */}
          <div className="inline-flex items-center gap-2 mb-8 text-[13px] text-carbon/65">
            <Clock className="w-4 h-4" />
            <span>14 days free trial — full access, no credit card</span>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm ${!annual ? 'text-carbon font-medium' : 'text-carbon/55'}`}>{t.landing.monthly}</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-14 h-7 rounded-full transition-colors ${annual ? 'bg-carbon' : 'bg-carbon/30'}`}
              aria-label="Toggle annual billing"
            >
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${annual ? 'translate-x-7' : ''}`} />
            </button>
            <span className={`text-sm ${annual ? 'text-carbon font-medium' : 'text-carbon/55'}`}>{t.landing.annual}</span>
            {annual && (
              <span className="text-xs bg-carbon/10 text-carbon/85 px-2.5 py-0.5 rounded-full font-medium">{tp.saveAnnual}</span>
            )}
          </div>
        </div>

        {/* Plans grid — 4 columns on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
          {PLAN_META.map((plan) => {
            const price = annual ? plan.priceAnnual : plan.price;
            const isCurrent = subscription?.plan === plan.id;
            const isLoading = loadingPlan === plan.id;
            const labels = planLabels(plan.id);
            const imageryLabel = plan.imageryNum === -1
              ? tp.unlimitedImagery
              : `${plan.imageryNum.toLocaleString('en-US')} ${tp.imageryPerMonth}`;
            const seatsLabel = plan.seatsNum === -1
              ? tp.unlimitedUsers
              : plan.seatsNum === 1 ? tp.oneUser : `${plan.seatsNum} ${tp.seats}`;

            const isDark = plan.popular;
            return (
              <div
                key={plan.id}
                className={`relative rounded-[20px] p-8 md:p-10 flex flex-col min-h-[520px] transition-all ${
                  isDark
                    ? 'bg-carbon text-crema border border-carbon'
                    : 'bg-white text-carbon border border-carbon/[0.08] hover:border-carbon/20'
                } ${isCurrent ? 'ring-2 ring-carbon/40' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-crema text-carbon text-[11px] tracking-[0.15em] uppercase font-medium px-3 py-1 rounded-full">
                    {tp.mostPopular}
                  </div>
                )}

                <div className={`text-[12px] tracking-[0.25em] uppercase font-medium mb-6 ${isDark ? 'text-crema/65' : 'text-carbon/55'}`}>
                  {labels.name}
                </div>

                <div className="mb-6 min-h-[3rem]">
                  <p className={`text-[14px] leading-[1.5] ${isDark ? 'text-crema/65' : 'text-carbon/65'}`}>
                    {labels.tagline}
                  </p>
                </div>

                <div className="mb-6">
                  {price !== null ? (
                    <>
                      <span className="text-[44px] md:text-[56px] font-light tracking-[-0.03em] leading-none">€{price}</span>
                      <span className={`text-[13px] ml-1 ${isDark ? 'text-crema/65' : 'text-carbon/55'}`}>{tp.perMonthShort}</span>
                      {annual && (
                        <div className={`text-[12px] mt-2 ${isDark ? 'text-crema/55' : 'text-carbon/55'}`}>
                          {tp.billedMonthly} · {Math.round(((plan.price! - plan.priceAnnual!) / plan.price!) * 100)}% {tp.off}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-[36px] md:text-[44px] font-light tracking-[-0.03em] leading-none">{tp.custom}</span>
                      <div className={`text-[12px] mt-2 ${isDark ? 'text-crema/55' : 'text-carbon/55'}`}>{tp.customFrom}</div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrent || isLoading}
                  className={`w-full py-3 px-6 rounded-full text-[13px] font-semibold transition-all flex items-center justify-center gap-2 mb-6 ${
                    isCurrent
                      ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                      : isDark
                        ? 'bg-crema text-carbon hover:bg-crema/90'
                        : 'bg-carbon text-crema hover:bg-carbon/90'
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

                {/* Imagery + seats */}
                <div className={`mb-6 pb-6 border-b space-y-2 text-[14px] ${isDark ? 'border-crema/15' : 'border-carbon/10'}`}>
                  <div className="flex items-center justify-between">
                    <span className={isDark ? 'text-crema/65' : 'text-carbon/55'}>Imagery</span>
                    <span className="font-medium">{imageryLabel.replace(/imagery.*/i, '').trim() || imageryLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={isDark ? 'text-crema/65' : 'text-carbon/55'}>Seats</span>
                    <span className="font-medium">{seatsLabel}</span>
                  </div>
                </div>

                {/* Highlights */}
                <ul className="space-y-2.5 flex-1">
                  {labels.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] leading-[1.5]">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${isDark ? 'text-crema/65' : 'text-carbon/65'}`} />
                      <span className={isDark ? 'text-crema/85' : 'text-carbon/85'}>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Aimily Credits packs */}
        <div className="bg-white border border-carbon/[0.08] rounded-[20px] p-10 md:p-14 mb-16">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-carbon" />
              <div className="text-[12px] tracking-[0.3em] uppercase text-carbon/55 font-medium">{tp.packsTitle}</div>
            </div>
            <h3 className="text-[28px] md:text-[36px] font-light tracking-[-0.02em] mb-3 italic">
              Top up imagery on demand.
            </h3>
            <p className="text-[14px] text-carbon/65 max-w-xl mx-auto leading-[1.6]">{tp.packsSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {PACKS.map((pack) => (
              <div
                key={pack.id}
                className="border border-carbon/[0.08] rounded-[16px] p-8 hover:border-carbon/20 transition-colors"
              >
                <div className="text-center mb-5">
                  <div className="text-[40px] font-light text-carbon tracking-[-0.03em] leading-none">+{pack.imagery}</div>
                  <div className="text-[12px] text-carbon/55 mt-2 uppercase tracking-[0.1em]">{tp.imageryGenerations}</div>
                </div>
                <div className="text-center mb-6">
                  <div className="text-[28px] font-medium text-carbon tracking-[-0.02em]">€{pack.price}</div>
                  <div className="text-[12px] text-carbon/55 mt-1">{pack.perImg} {tp.perImagery}</div>
                </div>
                <button
                  onClick={() => handleBuyPack(pack.id)}
                  disabled={loadingPack === pack.id}
                  className="w-full py-3 px-4 rounded-full text-[13px] font-semibold bg-carbon text-crema hover:bg-carbon/90 transition-colors flex items-center justify-center gap-2"
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

          <p className="text-[13px] text-carbon/55 text-center mt-8 italic">{tp.packsTip}</p>
        </div>

        {/* What counts as imagery */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="text-[12px] tracking-[0.3em] uppercase text-carbon/55 font-medium mb-4 text-center">
            What counts as imagery
          </div>
          <h3 className="text-[24px] md:text-[32px] font-light tracking-[-0.02em] text-center mb-10 italic">
            {tp.whatCounts}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[14px]">
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
              <div key={i} className="flex items-center justify-between bg-white/60 border border-carbon/[0.06] rounded-[12px] px-5 py-4">
                <span className="text-carbon/85">{item.label}</span>
                <span className={`font-medium text-[12px] px-2.5 py-1 rounded-full ${
                  item.units === 0 ? 'bg-carbon/10 text-carbon/85' : 'bg-carbon text-crema'
                }`}>
                  {item.units === 0 ? tp.unlimited : `${item.units} imagery`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom note */}
        <div className="text-center">
          <p className="text-[14px] text-carbon/65 leading-[1.65]">
            {tp.bottomNote}
            <br />
            <span className="text-[13px] text-carbon/55">{tp.pricesExclVat}</span>
          </p>
          {isPaid && (
            <button
              onClick={() => openPortal()}
              className="mt-6 text-[13px] text-carbon/65 hover:text-carbon underline transition-colors"
            >
              {tp.manageSubscription}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
