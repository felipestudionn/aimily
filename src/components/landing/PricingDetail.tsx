'use client';

/* ═══════════════════════════════════════════════════════════════════
   PricingDetail — clean editorial pricing, fully i18n.

   4 plans synced 1:1 with Stripe LIVE. Every visible string comes
   from `useHomeTranslation()` so the section follows the global
   language switcher coherently across all 9 locales.
   ═══════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useHomeTranslation } from '@/i18n/home';
import { ArrowRight, Check } from 'lucide-react';

type PlanId = 'starter' | 'professional' | 'professional_max' | 'enterprise';
type PackId = 'pack_50' | 'pack_250' | 'pack_1000';

const PLAN_META: {
  id: PlanId;
  price: number | null;
  priceAnnual: number | null;
  imagery: string;
  seats: string;
  popular?: boolean;
}[] = [
  { id: 'starter', price: 199, priceAnnual: 159, imagery: '200', seats: '1' },
  { id: 'professional', price: 599, priceAnnual: 479, imagery: '1.000', seats: '5', popular: true },
  { id: 'professional_max', price: 1499, priceAnnual: 1199, imagery: '5.000', seats: '25' },
  { id: 'enterprise', price: null, priceAnnual: null, imagery: '∞', seats: '∞' },
];

const PACKS: { id: PackId; imagery: number; price: number }[] = [
  { id: 'pack_50', imagery: 50, price: 29 },
  { id: 'pack_250', imagery: 250, price: 119 },
  { id: 'pack_1000', imagery: 1000, price: 399 },
];

interface PricingDetailProps {
  openAuth: () => void;
}

export function PricingDetail({ openAuth }: PricingDetailProps) {
  const { user } = useAuth();
  const { subscription, checkoutPlan, buyCreditPack, isPaid, openPortal } = useSubscription();
  const h = useHomeTranslation();
  const p = h.pricing;
  const [annual, setAnnual] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [loadingPack, setLoadingPack] = useState<PackId | null>(null);

  const planName: Record<PlanId, string> = {
    starter: p.starterName,
    professional: p.professionalName,
    professional_max: p.proMaxName,
    enterprise: p.enterpriseName,
  };

  const planTagline: Record<PlanId, string> = {
    starter: p.starterTagline,
    professional: p.professionalTagline,
    professional_max: p.proMaxTagline,
    enterprise: p.enterpriseTagline,
  };

  const planHighlights: Record<PlanId, string[]> = {
    starter: [p.h.starter1, p.h.starter2, p.h.starter3, p.h.starter4],
    professional: [p.h.pro1, p.h.pro2, p.h.pro3, p.h.pro4],
    professional_max: [p.h.proMax1, p.h.proMax2, p.h.proMax3, p.h.proMax4],
    enterprise: [p.h.ent1, p.h.ent2, p.h.ent3, p.h.ent4],
  };

  const planImagery: Record<PlanId, string> = {
    starter: '200',
    professional: '1.000',
    professional_max: '5.000',
    enterprise: p.unlimited,
  };

  const planSeats: Record<PlanId, string> = {
    starter: '1',
    professional: '5',
    professional_max: '25',
    enterprise: p.unlimited,
  };

  const handleSelectPlan = async (planId: PlanId) => {
    if (planId === 'enterprise') {
      window.location.href = 'mailto:hello@aimily.app?subject=Enterprise%20Plan%20Inquiry';
      return;
    }
    if (!user) { openAuth(); return; }
    if (planId === subscription?.plan) return;
    // Has-subscription users changing plan: route through Customer Portal
    // so Stripe handles proration. Avoids creating a parallel sub that
    // would double-bill the customer.
    if (isPaid && subscription?.plan !== planId) {
      setLoadingPlan(planId);
      try { await openPortal(); }
      finally { setLoadingPlan(null); }
      return;
    }
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
        <div className="text-center mb-16">
          <div className="text-[12px] tracking-[0.3em] uppercase text-carbon/55 font-medium mb-6">
            {p.eyebrow}
          </div>
          <h2 className="text-[40px] md:text-[56px] font-light tracking-[-0.03em] leading-[1.05] max-w-[820px] mx-auto mb-6">
            <span className="italic">{p.titleItalic}</span>{p.titleEnd}
          </h2>
          <p className="max-w-[520px] mx-auto text-[15px] text-carbon/65 leading-[1.6] mb-10">
            {p.subtitle}
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 bg-white border border-carbon/10 rounded-full p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-[13px] font-medium transition-colors ${
                !annual ? 'bg-carbon text-crema' : 'text-carbon/65 hover:text-carbon'
              }`}
            >
              {p.monthly}
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-[13px] font-medium transition-colors ${
                annual ? 'bg-carbon text-crema' : 'text-carbon/65 hover:text-carbon'
              }`}
            >
              {p.annual} <span className="opacity-65 ml-1">{p.annualSave}</span>
            </button>
          </div>
        </div>

        {/* Plans grid — 4 cards with equal min-h */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-24 items-stretch">
          {PLAN_META.map((plan) => {
            const price = annual ? plan.priceAnnual : plan.price;
            const isCurrent = subscription?.plan === plan.id;
            const isLoading = loadingPlan === plan.id;
            const isDark = plan.popular;
            return (
              <div
                key={plan.id}
                className={`relative rounded-[20px] p-7 flex flex-col h-full min-h-[620px] transition-all ${
                  isDark
                    ? 'bg-carbon text-crema'
                    : 'bg-white text-carbon border border-carbon/[0.08] hover:border-carbon/20'
                } ${isCurrent ? 'ring-2 ring-carbon/40' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-moss text-crema text-[11px] tracking-[0.18em] uppercase font-bold px-4 py-2 rounded-full shadow-[0_6px_22px_rgba(128,131,104,0.35)] whitespace-nowrap">
                    {p.recommended}
                  </div>
                )}

                <div className="mb-7">
                  <div className={`text-[12px] tracking-[0.25em] uppercase font-medium mb-2 ${isDark ? 'text-crema/65' : 'text-carbon/55'}`}>
                    {planName[plan.id]}
                  </div>
                  <p className={`text-[13px] leading-[1.5] min-h-[2.6rem] ${isDark ? 'text-crema/65' : 'text-carbon/65'}`}>
                    {planTagline[plan.id]}
                  </p>
                </div>

                <div className="mb-7 min-h-[4rem]">
                  {price !== null ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[40px] font-light tracking-[-0.03em] leading-none">€{price}</span>
                        <span className={`text-[13px] ${isDark ? 'text-crema/55' : 'text-carbon/55'}`}>{p.perMonth}</span>
                      </div>
                      {annual && (
                        <div className={`text-[12px] mt-2 ${isDark ? 'text-crema/55' : 'text-carbon/55'}`}>
                          {p.perYear.replace('{price}', String(price * 12))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-[32px] font-light tracking-[-0.03em] leading-none">{p.customPrice}</div>
                      <div className={`text-[12px] mt-2 ${isDark ? 'text-crema/55' : 'text-carbon/55'}`}>
                        {p.customFrom}
                      </div>
                    </>
                  )}
                </div>

                <div className={`grid grid-cols-2 gap-4 pb-6 mb-6 border-b ${isDark ? 'border-crema/15' : 'border-carbon/10'}`}>
                  <div>
                    <div className={`text-[11px] uppercase tracking-[0.12em] mb-1 ${isDark ? 'text-crema/55' : 'text-carbon/55'}`}>
                      {p.imagery}
                    </div>
                    <div className="text-[18px] font-light tracking-[-0.02em]">{planImagery[plan.id]}</div>
                  </div>
                  <div>
                    <div className={`text-[11px] uppercase tracking-[0.12em] mb-1 ${isDark ? 'text-crema/55' : 'text-carbon/55'}`}>
                      {p.seats}
                    </div>
                    <div className="text-[18px] font-light tracking-[-0.02em]">{planSeats[plan.id]}</div>
                  </div>
                </div>

                <ul className="space-y-2.5 flex-1 mb-7">
                  {planHighlights[plan.id].map((highlight, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] leading-[1.5]">
                      <Check className={`w-3.5 h-3.5 mt-1 shrink-0 ${isDark ? 'text-crema/65' : 'text-carbon/55'}`} />
                      <span className={isDark ? 'text-crema/85' : 'text-carbon/85'}>{highlight}</span>
                    </li>
                  ))}
                </ul>

                {(() => {
                  // CTA copy depends on context:
                  //   - enterprise plan       → Contact sales
                  //   - this is current plan  → Current plan (disabled)
                  //   - paid user, other plan → Change plan (opens Stripe Portal so Stripe handles proration)
                  //   - logged in trial       → Subscribe
                  //   - anonymous             → Start free (signup CTA)
                  const isEnterprise = plan.id === 'enterprise';
                  const ctaLabel = isEnterprise
                    ? p.ctaContact
                    : isCurrent
                      ? p.ctaCurrent
                      : user
                        ? (isPaid ? p.ctaChangePlan : p.ctaSubscribe)
                        : p.ctaStart;
                  return (
                    <button
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={isCurrent || isLoading}
                      className={`w-full py-3 px-5 rounded-full text-[13px] font-semibold transition-all flex items-center justify-center gap-2 ${
                        isCurrent
                          ? (isDark
                              ? 'bg-crema/15 text-crema/65 cursor-default'
                              : 'bg-carbon/[0.06] text-carbon/55 cursor-default')
                          : isDark
                            ? 'bg-crema text-carbon hover:bg-crema/90'
                            : 'bg-carbon text-crema hover:bg-carbon/90'
                      }`}
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          {ctaLabel}
                          {!isCurrent && <ArrowRight className="w-4 h-4" />}
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* Top-up packs */}
        <div className="border-t border-carbon/10 pt-16 mb-12">
          <div className="text-center mb-10">
            <div className="text-[12px] tracking-[0.3em] uppercase text-carbon/55 font-medium mb-4">
              {p.topupsEyebrow}
            </div>
            <h3 className="text-[24px] md:text-[32px] font-light tracking-[-0.02em] italic">
              {p.topupsTitle}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {PACKS.map((pack) => (
              <button
                key={pack.id}
                onClick={() => handleBuyPack(pack.id)}
                disabled={loadingPack === pack.id}
                className="bg-white border border-carbon/10 rounded-[16px] p-6 hover:border-carbon/30 transition-colors text-left group"
              >
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[24px] font-light tracking-[-0.02em]">+{pack.imagery}</span>
                  <span className="text-[20px] font-medium">€{pack.price}</span>
                </div>
                <div className="flex items-center justify-between text-[12px] text-carbon/55">
                  <span>imagery</span>
                  <span className="inline-flex items-center gap-1 text-carbon group-hover:translate-x-0.5 transition-transform text-[13px] font-medium">
                    {p.topupsBuy} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
                {loadingPack === pack.id && (
                  <div className="mt-2 w-4 h-4 border-2 border-carbon border-t-transparent rounded-full animate-spin" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* What counts — collapsed */}
        <details className="max-w-2xl mx-auto group">
          <summary className="flex items-center justify-center gap-2 cursor-pointer text-[13px] text-carbon/65 hover:text-carbon transition-colors list-none">
            <span className="border-b border-carbon/30 group-hover:border-carbon transition-colors">
              {p.whatCounts}
            </span>
            <ArrowRight className="w-3.5 h-3.5 rotate-90 group-open:rotate-[270deg] transition-transform" />
          </summary>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px]">
            {[
              { label: p.countSketch, units: 1 },
              { label: p.countColorize, units: 1 },
              { label: p.countEditorial, units: 1 },
              { label: p.countStillLife, units: 1 },
              { label: p.countVisualRefs, units: 4 },
              { label: p.countVideo, units: 5 },
              { label: p.countText, units: 0 },
              { label: p.countResearch, units: 0 },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-white/60 border border-carbon/10 rounded-[10px] px-4 py-3">
                <span className="text-carbon/85">{item.label}</span>
                <span className={`text-[11px] uppercase tracking-[0.1em] font-medium px-2 py-0.5 rounded-full ${
                  item.units === 0 ? 'bg-carbon/10 text-carbon/85' : 'bg-carbon text-crema'
                }`}>
                  {item.units === 0 ? p.countFree : p.countImg.replace('{n}', String(item.units))}
                </span>
              </div>
            ))}
          </div>
        </details>

        {/* Bottom note */}
        <div className="text-center mt-16">
          <p className="text-[12px] text-carbon/55">
            {p.footerNote}
          </p>
          {isPaid && (
            <button
              onClick={() => openPortal()}
              className="mt-4 text-[13px] text-carbon/65 hover:text-carbon underline transition-colors"
            >
              {p.manage}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
