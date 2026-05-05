'use client';

/* ═══════════════════════════════════════════════════════════════════
   PricingDetail — clean editorial pricing, fully i18n.

   May 2026 rebrand:
     • 4 cards: Student (free) · Founder (€99) · Team (€599) · Team Pro (€1.499)
     • Enterprise moved to a discreet inline band below the grid
     • Launch promo: first 100 paid subs get -50% for 12 months,
       counter pulled from /api/promo/counter
     • Student tier auto-verified via academic email domain
   ═══════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useHomeTranslation } from '@/i18n/home';
import { ArrowRight, Check, GraduationCap } from 'lucide-react';

type PlanId = 'student' | 'founder' | 'team' | 'team_pro' | 'enterprise';
type PackId = 'pack_50' | 'pack_250' | 'pack_1000';

const PLAN_META: {
  id: PlanId;
  price: number | null;
  priceAnnual: number | null;
  imagery: string;
  seats: string;
  popular?: boolean;
}[] = [
  { id: 'student', price: 0, priceAnnual: 0, imagery: '100', seats: '1' },
  { id: 'founder', price: 99, priceAnnual: 79, imagery: '100', seats: '1' },
  { id: 'team', price: 599, priceAnnual: 479, imagery: '1.000', seats: '5', popular: true },
  { id: 'team_pro', price: 1499, priceAnnual: 1199, imagery: '5.000', seats: '25' },
];

const PROMO_PLANS: PlanId[] = ['founder', 'team', 'team_pro'];

const PACKS: { id: PackId; imagery: number; price: number }[] = [
  { id: 'pack_50', imagery: 50, price: 29 },
  { id: 'pack_250', imagery: 250, price: 119 },
  { id: 'pack_1000', imagery: 1000, price: 399 },
];

interface PricingDetailProps {
  openAuth: () => void;
}

interface PromoState {
  active: boolean;
  slots_left: number;
  total_slots: number;
}

export function PricingDetail({ openAuth }: PricingDetailProps) {
  const { user } = useAuth();
  const { subscription, checkoutPlan, buyCreditPack, isPaid, openPortal } = useSubscription();
  const h = useHomeTranslation();
  const p = h.pricing;
  const [annual, setAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [loadingPack, setLoadingPack] = useState<PackId | null>(null);
  const [promo, setPromo] = useState<PromoState | null>(null);
  const [studentMsg, setStudentMsg] = useState<string | null>(null);

  // Pull launch promo state once on mount
  useEffect(() => {
    fetch('/api/promo/counter')
      .then((r) => r.json())
      .then((data) => setPromo(data))
      .catch(() => setPromo(null));
  }, []);

  const planName: Record<PlanId, string> = {
    student: p.studentName,
    founder: p.founderName,
    team: p.teamName,
    team_pro: p.teamProName,
    enterprise: p.enterpriseName,
  };

  const planTagline: Record<PlanId, string> = {
    student: p.studentTagline,
    founder: p.founderTagline,
    team: p.teamTagline,
    team_pro: p.teamProTagline,
    enterprise: p.enterpriseTagline,
  };

  const planHighlights: Record<PlanId, string[]> = {
    student: [p.h.student1, p.h.student2, p.h.student3, p.h.student4],
    founder: [p.h.founder1, p.h.founder2, p.h.founder3, p.h.founder4],
    team: [p.h.team1, p.h.team2, p.h.team3, p.h.team4],
    team_pro: [p.h.teamPro1, p.h.teamPro2, p.h.teamPro3, p.h.teamPro4],
    enterprise: [p.h.ent1, p.h.ent2, p.h.ent3, p.h.ent4],
  };

  const handleSelectPlan = async (planId: PlanId) => {
    if (planId === 'enterprise') {
      window.location.href = 'mailto:hello@aimily.app?subject=Enterprise%20Plan%20Inquiry';
      return;
    }

    if (planId === 'student') {
      if (!user) { openAuth(); return; }
      setLoadingPlan('student');
      setStudentMsg(null);
      try {
        const res = await fetch('/api/student/verify', { method: 'POST' });
        const data = await res.json();
        if (data.eligible) {
          setStudentMsg(p.studentSuccess.replace('{school}', data.school_name || ''));
          // Force a refresh so SubscriptionContext picks up the new plan
          window.location.reload();
        } else if (data.reason === 'domain_not_whitelisted') {
          setStudentMsg(p.studentNotEligible);
        } else if (data.reason === 'has_paid_subscription') {
          setStudentMsg(p.studentBlockedPaid);
        } else {
          setStudentMsg(p.studentError);
        }
      } catch {
        setStudentMsg(p.studentError);
      } finally {
        setLoadingPlan(null);
      }
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

  const promoActive = !!promo?.active && promo.slots_left > 0;
  const promoLabel = promoActive
    ? p.promoBanner
        .replace('{left}', String(promo!.slots_left))
        .replace('{total}', String(promo!.total_slots))
    : null;

  return (
    <section id="pricing" className="bg-crema text-carbon px-6 py-32 md:py-44 border-t border-carbon/[0.06]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-[12px] tracking-[0.3em] uppercase text-carbon/55 font-medium mb-6">
            {p.eyebrow}
          </div>
          <h2 className="text-[40px] md:text-[56px] font-light tracking-[-0.03em] leading-[1.05] max-w-[820px] mx-auto mb-6">
            <span className="italic">{p.titleItalic}</span>{p.titleEnd}
          </h2>
          <p className="max-w-[520px] mx-auto text-[15px] text-carbon/65 leading-[1.6] mb-8">
            {p.subtitle}
          </p>

          {/* Promo strip — discreet, editorial, only when active */}
          {promoLabel && (
            <div className="inline-flex items-center gap-2 bg-carbon text-crema px-5 py-2 rounded-full text-[12px] tracking-[0.08em] uppercase font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-moss animate-pulse" />
              {promoLabel}
            </div>
          )}

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

        {/* Plans grid — 4 cards (Student/Founder/Team/Team Pro), equal min-h */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12 items-stretch">
          {PLAN_META.map((plan) => {
            const basePrice = annual ? plan.priceAnnual : plan.price;
            const showPromo = promoActive && PROMO_PLANS.includes(plan.id) && basePrice !== null && basePrice > 0;
            // Round to whole euro so visual price never ends in .5
            const promoPrice = showPromo && basePrice !== null ? Math.round(basePrice * 0.5) : null;
            const isCurrent = subscription?.plan === plan.id;
            const isLoading = loadingPlan === plan.id;
            const isDark = plan.popular;
            const isStudent = plan.id === 'student';
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

                {/* Plan name — large and prominent */}
                <div className="mb-5">
                  <div className={`flex items-center gap-2 mb-1`}>
                    {isStudent && <GraduationCap className={`w-6 h-6 ${isDark ? 'text-crema/85' : 'text-carbon/85'}`} />}
                    <h3 className={`text-[28px] font-medium tracking-[-0.02em] leading-none`}>
                      {planName[plan.id]}
                    </h3>
                  </div>
                  <p className={`text-[13px] leading-[1.5] min-h-[2.6rem] mt-3 ${isDark ? 'text-crema/65' : 'text-carbon/65'}`}>
                    {planTagline[plan.id]}
                  </p>
                </div>

                {/* Price block — fixed height so all cards line up */}
                <div className="mb-6 min-h-[6.5rem]">
                  {basePrice !== null ? (
                    <>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        {showPromo && promoPrice !== null ? (
                          <>
                            <span className="text-[44px] font-light tracking-[-0.03em] leading-none">€{promoPrice}</span>
                            <span className={`text-[16px] line-through ${isDark ? 'text-crema/45' : 'text-carbon/40'}`}>€{basePrice}</span>
                            <span className={`text-[13px] ${isDark ? 'text-crema/55' : 'text-carbon/55'}`}>{p.perMonth}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-[44px] font-light tracking-[-0.03em] leading-none">
                              {basePrice === 0 ? p.free : `€${basePrice}`}
                            </span>
                            {basePrice > 0 && (
                              <span className={`text-[13px] ${isDark ? 'text-crema/55' : 'text-carbon/55'}`}>{p.perMonth}</span>
                            )}
                          </>
                        )}
                      </div>
                      <div className={`text-[12px] mt-2 min-h-[1rem] ${isDark ? 'text-crema/55' : 'text-carbon/55'}`}>
                        {basePrice > 0 && annual && p.perYear.replace('{price}', String((showPromo && promoPrice !== null ? promoPrice : basePrice) * 12))}
                      </div>
                      <div className={`text-[11px] mt-1 italic min-h-[1.1rem] ${isDark ? 'text-crema/55' : 'text-carbon/55'}`}>
                        {showPromo && p.promoCardNote}
                        {isStudent && p.studentDuration}
                      </div>
                    </>
                  ) : null}
                </div>

                <div className={`grid grid-cols-2 gap-4 pb-6 mb-6 border-b ${isDark ? 'border-crema/15' : 'border-carbon/10'}`}>
                  <div>
                    <div className={`text-[11px] uppercase tracking-[0.12em] mb-1 ${isDark ? 'text-crema/55' : 'text-carbon/55'}`}>
                      {p.imagery}
                    </div>
                    <div className="text-[18px] font-light tracking-[-0.02em]">{plan.imagery}</div>
                  </div>
                  <div>
                    <div className={`text-[11px] uppercase tracking-[0.12em] mb-1 ${isDark ? 'text-crema/55' : 'text-carbon/55'}`}>
                      {p.seats}
                    </div>
                    <div className="text-[18px] font-light tracking-[-0.02em]">{plan.seats}</div>
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
                  //   - student plan          → Verify with school email
                  //   - this is current plan  → Current plan (disabled)
                  //   - paid user, other plan → Change plan (Customer Portal)
                  //   - logged in trial       → Start free for 30 days
                  //   - anonymous             → Start free
                  const ctaLabel = isStudent
                    ? p.ctaVerifyStudent
                    : isCurrent
                      ? p.ctaCurrent
                      : user
                        ? (isPaid ? p.ctaChangePlan : p.ctaStartFree30)
                        : p.ctaStartFree30;
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

                {!isStudent && !isCurrent && (
                  <p className={`text-[11px] mt-3 text-center ${isDark ? 'text-crema/55' : 'text-carbon/55'}`}>
                    {p.noCardNote}
                  </p>
                )}
                {isStudent && studentMsg && (
                  <p className={`text-[11px] mt-3 text-center leading-[1.5] ${isDark ? 'text-crema/65' : 'text-carbon/65'}`}>
                    {studentMsg}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Enterprise band — discreet, separate from main grid */}
        <div className="border border-carbon/10 rounded-[20px] p-6 md:p-8 mb-16 bg-white/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-[12px] tracking-[0.25em] uppercase font-medium text-carbon/55 mb-1">
                {p.enterpriseName}
              </div>
              <p className="text-[15px] text-carbon/85 leading-[1.5]">
                {p.enterpriseTagline} <span className="text-carbon/55">· {p.customFrom}</span>
              </p>
            </div>
            <a
              href="mailto:hello@aimily.app?subject=Enterprise%20Plan%20Inquiry"
              className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-full text-[13px] font-semibold bg-carbon text-crema hover:bg-carbon/90 transition-colors whitespace-nowrap"
            >
              {p.ctaContact}
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
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
