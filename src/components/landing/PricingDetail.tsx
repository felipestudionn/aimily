'use client';

/* ═══════════════════════════════════════════════════════════════════
   PricingDetail — clean editorial pricing, fully i18n.

   May 2026 rebrand v2:
     • 4 cards: Student (free) · Founder (€99) · Team (€599) · Team Pro (€1.499)
     • Always shows monthly price (no toggle) — annual discount mentioned
       as a sub-line so customers don't feel bait-and-switched.
     • No "Recommended" badge — none is universally recommended.
     • Launch promo lives ONLY in the top banner, never inside cards.
     • Highlights focus on concrete resources (users, Aimily Credits,
       top LLM access, AI video) — no generic filler.
     • "No credit card" message appears ONCE at the bottom of the grid.
     • Enterprise as a discreet inline band below the grid.
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
  monthlyPrice: number | null;  // shown price — always monthly
  annualPerMonth: number | null;  // sub-line "Anual: €X/mes (−20%)"
}[] = [
  { id: 'student', monthlyPrice: 0, annualPerMonth: null },
  { id: 'founder', monthlyPrice: 99, annualPerMonth: 79 },
  { id: 'team', monthlyPrice: 599, annualPerMonth: 479 },
  { id: 'team_pro', monthlyPrice: 1499, annualPerMonth: 1199 },
];

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
    if (isPaid && subscription?.plan !== planId) {
      setLoadingPlan(planId);
      try { await openPortal(); }
      finally { setLoadingPlan(null); }
      return;
    }
    setLoadingPlan(planId);
    // Always start checkout in monthly. Customer can switch to annual
    // post-trial via Customer Portal.
    try { await checkoutPlan(planId, false); }
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

          {/* Launch promo strip — single instance, top of grid */}
          {promoLabel && (
            <div className="inline-flex items-center gap-2 bg-carbon text-crema px-5 py-2 rounded-full text-[12px] tracking-[0.08em] uppercase font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-moss animate-pulse" />
              {promoLabel}
            </div>
          )}
        </div>

        {/* Plans grid — 4 cards, identical structure for visual consistency */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 items-stretch">
          {PLAN_META.map((plan) => {
            const isCurrent = subscription?.plan === plan.id;
            const isLoading = loadingPlan === plan.id;
            const isStudent = plan.id === 'student';
            return (
              <div
                key={plan.id}
                className={`relative rounded-[20px] p-7 flex flex-col h-full min-h-[560px] bg-white border border-carbon/[0.08] hover:border-carbon/25 transition-colors ${
                  isCurrent ? 'ring-2 ring-carbon/40' : ''
                }`}
              >
                {/* Plan name — large, prominent, the visual anchor */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    {isStudent && <GraduationCap className="w-6 h-6 text-carbon/85" />}
                    <h3 className="text-[28px] font-medium tracking-[-0.02em] leading-none text-carbon">
                      {planName[plan.id]}
                    </h3>
                  </div>
                  <p className="text-[13px] leading-[1.5] text-carbon/65 min-h-[3rem]">
                    {planTagline[plan.id]}
                  </p>
                </div>

                {/* Price block — always monthly. No annual / promo / discount
                    mentioned inside the card (those live in top banner only). */}
                <div className="mb-6 min-h-[4.5rem]">
                  {plan.monthlyPrice !== null ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[44px] font-light tracking-[-0.03em] leading-none text-carbon">
                          {plan.monthlyPrice === 0 ? p.free : `€${plan.monthlyPrice}`}
                        </span>
                        {plan.monthlyPrice > 0 && (
                          <span className="text-[13px] text-carbon/55">{p.perMonth}</span>
                        )}
                      </div>
                      <div className="text-[12px] mt-2 min-h-[1rem] text-carbon/55">
                        {isStudent && p.studentDuration}
                      </div>
                    </>
                  ) : null}
                </div>

                {/* Highlights — only concrete resources, no filler.
                    flex-1 makes the list expand so CTAs end up at the same
                    Y across all 4 cards regardless of highlight count. */}
                <ul className="space-y-3 flex-1 mb-7">
                  {planHighlights[plan.id].map((highlight, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-[1.5]">
                      <Check className="w-4 h-4 mt-[2px] shrink-0 text-carbon/65" />
                      <span className="text-carbon/85">{highlight}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA — pinned to the bottom of every card by flex-1 above */}
                {(() => {
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
                          ? 'bg-carbon/[0.06] text-carbon/55 cursor-default'
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

                {isStudent && studentMsg && (
                  <p className="text-[11px] mt-3 text-center leading-[1.5] text-carbon/65">
                    {studentMsg}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Single global note — replaces 4 per-card "no credit card" lines */}
        <p className="text-center text-[15px] md:text-[16px] font-medium text-carbon mb-16">
          {p.noCardNoteGlobal}
        </p>

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
                  <span>{p.imagery}</span>
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
