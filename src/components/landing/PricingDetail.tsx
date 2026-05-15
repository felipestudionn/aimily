'use client';

/* ═══════════════════════════════════════════════════════════════════
   PricingDetail — clean editorial pricing, fully i18n.

   May 2026 rebrand v3 (Felipe directive):
     • 3 cards: Founder (€99/mo with student bullet inside) · Team (€599/mo) · Content Studio
     • Content Studio = the wedge product. ONE card shows the 3 Studio tiers
       inline (Capsule €49 / Editorial €99 / Full Campaign €199), single
       CTA goes to /studio.
     • Student is NO LONGER a standalone plan — it's a destacado bullet
       inside Founder: "Free for students. Verify your school email and
       get 12 months of Founder free."
     • Team Pro removed.
     • Top-up packs (Aimily Credits) removed from public pricing — users
       see them in-product when they need them, not as a confusing
       "you'll run out" upsell on the landing.
     • Enterprise band stays as a discreet inline strip at the bottom.
   ═══════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useHomeTranslation } from '@/i18n/home';
import { ArrowRight, Check, GraduationCap } from 'lucide-react';

type PlanId = 'founder' | 'team' | 'enterprise';

interface PricingDetailProps {
  openAuth: () => void;
}

export function PricingDetail({ openAuth }: PricingDetailProps) {
  const { user } = useAuth();
  const { subscription, checkoutPlan, isPaid, openPortal } = useSubscription();
  const h = useHomeTranslation();
  const p = h.pricing;
  const [loadingPlan, setLoadingPlan] = useState<PlanId | 'student' | null>(null);
  const [studentMsg, setStudentMsg] = useState<string | null>(null);

  const handleSelectPlan = async (planId: PlanId) => {
    if (planId === 'enterprise') {
      window.location.href = 'mailto:hello@aimily.app?subject=Enterprise%20Plan%20Inquiry';
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
    try { await checkoutPlan(planId, false); }
    finally { setLoadingPlan(null); }
  };

  const handleStudentVerify = async () => {
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
  };

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
          <p className="max-w-[520px] mx-auto text-[15px] text-carbon/65 leading-[1.6]">
            {p.subtitle}
          </p>
        </div>

        {/* Plans grid — 3 cards: Founder · Team · Content Studio */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 items-stretch">
          {/* ─── Founder ─── */}
          <FounderCard
            currentPlan={subscription?.plan}
            isPaid={isPaid}
            user={user}
            loading={loadingPlan === 'founder'}
            studentLoading={loadingPlan === 'student'}
            studentMsg={studentMsg}
            onSelect={() => handleSelectPlan('founder')}
            onStudentVerify={handleStudentVerify}
            p={p}
          />

          {/* ─── Team ─── */}
          <TeamCard
            currentPlan={subscription?.plan}
            isPaid={isPaid}
            user={user}
            loading={loadingPlan === 'team'}
            onSelect={() => handleSelectPlan('team')}
            p={p}
          />

          {/* ─── Content Studio (wedge, the new third card) ─── */}
          <ContentStudioCard />
        </div>

        {/* Single global note */}
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

        {/* Bottom note */}
        <div className="text-center">
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

// ─────────────────────────────────────────────────────────────────────
// Founder card — includes the destacado student bullet inside
// ─────────────────────────────────────────────────────────────────────
interface FounderCardProps {
  currentPlan?: string;
  isPaid: boolean;
  user: unknown;
  loading: boolean;
  studentLoading: boolean;
  studentMsg: string | null;
  onSelect: () => void;
  onStudentVerify: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  p: any;
}
function FounderCard({
  currentPlan,
  isPaid,
  user,
  loading,
  studentLoading,
  studentMsg,
  onSelect,
  onStudentVerify,
  p,
}: FounderCardProps) {
  const isCurrent = currentPlan === 'founder';
  const ctaLabel = isCurrent
    ? p.ctaCurrent
    : user
      ? (isPaid ? p.ctaChangePlan : p.ctaStartFree30)
      : p.ctaStartFree30;

  return (
    <div className={`relative rounded-[20px] p-7 flex flex-col h-full min-h-[600px] bg-white border border-carbon/[0.08] hover:border-carbon/25 transition-colors ${isCurrent ? 'ring-2 ring-carbon/40' : ''}`}>
      <div className="mb-6">
        <h3 className="text-[28px] font-medium tracking-[-0.02em] leading-none text-carbon mb-2">
          {p.founderName}
        </h3>
        <p className="text-[13px] leading-[1.5] text-carbon/65 min-h-[3rem]">
          {p.founderTagline}
        </p>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="leading-none text-carbon flex items-baseline">
            <span className="text-[22px] font-light text-carbon/55 mr-1.5">€</span>
            <span className="text-[44px] font-light tracking-[-0.03em]">99</span>
          </span>
          <span className="text-[13px] text-carbon/55">{p.perMonth}</span>
        </div>
      </div>

      <ul className="space-y-3 flex-1 mb-5">
        {[p.h.founder1, p.h.founder2, p.h.founder3, p.h.founder4].map((highlight, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-[1.5]">
            <Check className="w-4 h-4 mt-[2px] shrink-0 text-carbon/65" />
            <span className="text-carbon/85">{highlight}</span>
          </li>
        ))}
      </ul>

      {/* Student bullet — destacado within Founder card */}
      <div className="mb-5 rounded-[14px] border border-carbon/15 bg-carbon/[0.03] p-4">
        <div className="flex items-start gap-2.5 mb-2">
          <GraduationCap className="w-4 h-4 mt-[2px] shrink-0 text-carbon/85" />
          <p className="text-[13px] leading-[1.5] text-carbon font-medium">
            Free for students
          </p>
        </div>
        <p className="text-[12px] leading-[1.55] text-carbon/65 mb-3 pl-[26px]">
          Verify your school email and get 12 months of Founder free. Not renewable.
        </p>
        <div className="pl-[26px]">
          <button
            onClick={onStudentVerify}
            disabled={studentLoading}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-carbon underline underline-offset-2 hover:text-carbon/70 transition-colors disabled:opacity-50"
          >
            {studentLoading ? (
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Verify student email <ArrowRight className="w-3 h-3" /></>
            )}
          </button>
        </div>
        {studentMsg && (
          <p className="text-[11px] mt-2 pl-[26px] leading-[1.5] text-carbon/65">
            {studentMsg}
          </p>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={onSelect}
        disabled={isCurrent || loading}
        className={`w-full py-3 px-5 rounded-full text-[13px] font-semibold transition-all flex items-center justify-center gap-2 ${
          isCurrent ? 'bg-carbon/[0.06] text-carbon/55 cursor-default' : 'bg-carbon text-crema hover:bg-carbon/90'
        }`}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {ctaLabel}
            {!isCurrent && <ArrowRight className="w-4 h-4" />}
          </>
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Team card
// ─────────────────────────────────────────────────────────────────────
interface TeamCardProps {
  currentPlan?: string;
  isPaid: boolean;
  user: unknown;
  loading: boolean;
  onSelect: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  p: any;
}
function TeamCard({ currentPlan, isPaid, user, loading, onSelect, p }: TeamCardProps) {
  const isCurrent = currentPlan === 'team';
  const ctaLabel = isCurrent
    ? p.ctaCurrent
    : user
      ? (isPaid ? p.ctaChangePlan : p.ctaStartFree30)
      : p.ctaStartFree30;

  return (
    <div className={`relative rounded-[20px] p-7 flex flex-col h-full min-h-[600px] bg-white border border-carbon/[0.08] hover:border-carbon/25 transition-colors ${isCurrent ? 'ring-2 ring-carbon/40' : ''}`}>
      <div className="mb-6">
        <h3 className="text-[28px] font-medium tracking-[-0.02em] leading-none text-carbon mb-2">
          {p.teamName}
        </h3>
        <p className="text-[13px] leading-[1.5] text-carbon/65 min-h-[3rem]">
          {p.teamTagline}
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="leading-none text-carbon flex items-baseline">
            <span className="text-[22px] font-light text-carbon/55 mr-1.5">€</span>
            <span className="text-[44px] font-light tracking-[-0.03em]">599</span>
          </span>
          <span className="text-[13px] text-carbon/55">{p.perMonth}</span>
        </div>
      </div>

      <ul className="space-y-3 flex-1 mb-7">
        {[p.h.team1, p.h.team2, p.h.team3, p.h.team4].map((highlight, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-[1.5]">
            <Check className="w-4 h-4 mt-[2px] shrink-0 text-carbon/65" />
            <span className="text-carbon/85">{highlight}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={isCurrent || loading}
        className={`w-full py-3 px-5 rounded-full text-[13px] font-semibold transition-all flex items-center justify-center gap-2 ${
          isCurrent ? 'bg-carbon/[0.06] text-carbon/55 cursor-default' : 'bg-carbon text-crema hover:bg-carbon/90'
        }`}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {ctaLabel}
            {!isCurrent && <ArrowRight className="w-4 h-4" />}
          </>
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Content Studio card — the wedge product, 3 tiers inline
// ─────────────────────────────────────────────────────────────────────
function ContentStudioCard() {
  const STUDIO_TIERS = [
    { label: 'Capsule', outputs: 10, price: 49 },
    { label: 'Editorial', outputs: 25, price: 99 },
    { label: 'Full Campaign', outputs: 50, price: 199 },
  ];

  return (
    <div className="relative rounded-[20px] p-7 flex flex-col h-full min-h-[600px] bg-white border border-carbon/[0.08] hover:border-carbon/25 transition-colors">
      <div className="mb-6">
        <h3 className="text-[28px] font-medium tracking-[-0.02em] leading-none text-carbon mb-2">
          Content Studio
        </h3>
        <p className="text-[13px] leading-[1.5] text-carbon/65 min-h-[3rem]">
          AI fashion content, brand-locked. Pay-per-campaign, no subscription.
        </p>
      </div>

      {/* Three sub-tiers inline */}
      <div className="mb-6 space-y-2">
        {STUDIO_TIERS.map((tier) => (
          <div
            key={tier.label}
            className="flex items-baseline justify-between rounded-[12px] border border-carbon/[0.08] bg-carbon/[0.02] px-4 py-3"
          >
            <div className="flex flex-col">
              <span className="text-[14px] font-medium text-carbon">{tier.label}</span>
              <span className="text-[11px] text-carbon/55">{tier.outputs} fotos editoriales</span>
            </div>
            <div className="leading-none text-carbon flex items-baseline">
              <span className="text-[13px] font-light text-carbon/55 mr-1">€</span>
              <span className="text-[24px] font-light tracking-[-0.03em]">{tier.price}</span>
            </div>
          </div>
        ))}
      </div>

      <ul className="space-y-3 flex-1 mb-7">
        <li className="flex items-start gap-2.5 text-[13.5px] leading-[1.5]">
          <Check className="w-4 h-4 mt-[2px] shrink-0 text-carbon/65" />
          <span className="text-carbon/85">Casting Aimily curado · acceso completo</span>
        </li>
        <li className="flex items-start gap-2.5 text-[13.5px] leading-[1.5]">
          <Check className="w-4 h-4 mt-[2px] shrink-0 text-carbon/65" />
          <span className="text-carbon/85">12 formatos por foto (Instagram · TikTok · web · ecom · print)</span>
        </li>
        <li className="flex items-start gap-2.5 text-[13.5px] leading-[1.5]">
          <Check className="w-4 h-4 mt-[2px] shrink-0 text-carbon/65" />
          <span className="text-carbon/85">Producto preservado píxel a píxel</span>
        </li>
        <li className="flex items-start gap-2.5 text-[13.5px] leading-[1.5]">
          <Check className="w-4 h-4 mt-[2px] shrink-0 text-carbon/65" />
          <span className="text-carbon/85">Sin suscripción · entrega en horas</span>
        </li>
      </ul>

      <Link
        href="/studio"
        className="w-full py-3 px-5 rounded-full text-[13px] font-semibold transition-all flex items-center justify-center gap-2 bg-carbon text-crema hover:bg-carbon/90"
      >
        Empezar con Studio
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
