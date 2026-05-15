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
import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { ArrowRight, Check, GraduationCap } from 'lucide-react';

type PlanId = 'founder' | 'team' | 'enterprise';

// ─── Studio + Student-bullet i18n (inline, fully translated × 9 locales) ───
// Kept inline because the existing home.ts is large and slow to maintain.
// `Capsule / Editorial / Full Campaign` stay in English in every locale —
// they're product-tier names, treated as a brand vocabulary.
const STUDIO_I18N: Record<Language, {
  studioTagline: string;
  studioOutputs: (n: number) => string;
  studioBullet1: string;
  studioBullet2: string;
  studioBullet3: string;
  studioBullet4: string;
  studioCta: string;
  studentTitle: string;
  studentDesc: string;
  studentCta: string;
}> = {
  en: {
    studioTagline: 'AI fashion content, brand-locked. Pay-per-campaign, no subscription.',
    studioOutputs: (n) => `${n} editorial photos`,
    studioBullet1: 'Curated Aimily casting · full access',
    studioBullet2: '12 formats per photo (Instagram · TikTok · web · ecom · print)',
    studioBullet3: 'Product preserved pixel by pixel',
    studioBullet4: 'No subscription · delivered in hours',
    studioCta: 'Start with Studio',
    studentTitle: 'Free for students',
    studentDesc: 'Verify your school email and get 12 months of Founder free. Not renewable.',
    studentCta: 'Verify student email',
  },
  es: {
    studioTagline: 'Contenido de moda con IA, brand-locked. Pago por campaña, sin suscripción.',
    studioOutputs: (n) => `${n} fotos editoriales`,
    studioBullet1: 'Casting Aimily curado · acceso completo',
    studioBullet2: '12 formatos por foto (Instagram · TikTok · web · ecom · print)',
    studioBullet3: 'Producto preservado píxel a píxel',
    studioBullet4: 'Sin suscripción · entrega en horas',
    studioCta: 'Empezar con Studio',
    studentTitle: 'Gratis para estudiantes',
    studentDesc: 'Verifica tu email de estudiante y obtén 12 meses gratis del plan Founder. No renovable.',
    studentCta: 'Verificar email de estudiante',
  },
  fr: {
    studioTagline: 'Contenu de mode IA, brand-locked. Paiement par campagne, sans abonnement.',
    studioOutputs: (n) => `${n} photos éditoriales`,
    studioBullet1: 'Casting Aimily curé · accès complet',
    studioBullet2: '12 formats par photo (Instagram · TikTok · web · e-commerce · print)',
    studioBullet3: 'Produit préservé pixel par pixel',
    studioBullet4: 'Sans abonnement · livraison en heures',
    studioCta: 'Commencer avec Studio',
    studentTitle: 'Gratuit pour les étudiants',
    studentDesc: "Vérifie ton email étudiant et obtiens 12 mois du plan Founder gratuits. Non renouvelable.",
    studentCta: "Vérifier l'email étudiant",
  },
  it: {
    studioTagline: 'Contenuti di moda con AI, brand-locked. Pagamento per campagna, senza abbonamento.',
    studioOutputs: (n) => `${n} foto editoriali`,
    studioBullet1: 'Casting Aimily curato · accesso completo',
    studioBullet2: '12 formati per foto (Instagram · TikTok · web · ecom · print)',
    studioBullet3: 'Prodotto preservato pixel per pixel',
    studioBullet4: 'Senza abbonamento · consegna in ore',
    studioCta: 'Inizia con Studio',
    studentTitle: 'Gratis per studenti',
    studentDesc: 'Verifica la tua email da studente e ottieni 12 mesi gratis del piano Founder. Non rinnovabile.',
    studentCta: 'Verifica email da studente',
  },
  de: {
    studioTagline: 'KI-Mode-Content, brand-locked. Pro Kampagne zahlen, kein Abo.',
    studioOutputs: (n) => `${n} Editorial-Fotos`,
    studioBullet1: 'Kuratiertes Aimily-Casting · voller Zugang',
    studioBullet2: '12 Formate pro Foto (Instagram · TikTok · Web · E-Commerce · Print)',
    studioBullet3: 'Produkt Pixel für Pixel erhalten',
    studioBullet4: 'Kein Abo · Lieferung in Stunden',
    studioCta: 'Mit Studio starten',
    studentTitle: 'Kostenlos für Studierende',
    studentDesc: 'Verifiziere deine Hochschul-E-Mail und erhalte 12 Monate Founder kostenlos. Nicht verlängerbar.',
    studentCta: 'Studenten-E-Mail verifizieren',
  },
  pt: {
    studioTagline: 'Conteúdo de moda com IA, brand-locked. Pague por campanha, sem assinatura.',
    studioOutputs: (n) => `${n} fotos editoriais`,
    studioBullet1: 'Casting Aimily curado · acesso completo',
    studioBullet2: '12 formatos por foto (Instagram · TikTok · web · ecom · print)',
    studioBullet3: 'Produto preservado píxel a píxel',
    studioBullet4: 'Sem assinatura · entrega em horas',
    studioCta: 'Começar com Studio',
    studentTitle: 'Grátis para estudantes',
    studentDesc: 'Verifica o teu email de estudante e obtém 12 meses grátis do plano Founder. Não renovável.',
    studentCta: 'Verificar email de estudante',
  },
  nl: {
    studioTagline: 'AI-mode-content, brand-locked. Per campagne betalen, geen abonnement.',
    studioOutputs: (n) => `${n} editoriale foto's`,
    studioBullet1: 'Gecureerde Aimily-casting · volledige toegang',
    studioBullet2: "12 formaten per foto (Instagram · TikTok · web · e-commerce · print)",
    studioBullet3: 'Product pixel voor pixel behouden',
    studioBullet4: 'Geen abonnement · levering in uren',
    studioCta: 'Beginnen met Studio',
    studentTitle: 'Gratis voor studenten',
    studentDesc: 'Verifieer je studenten-e-mail en krijg 12 maanden Founder gratis. Niet verlengbaar.',
    studentCta: 'Studenten-e-mail verifiëren',
  },
  no: {
    studioTagline: 'AI-motekontent, brand-locked. Betal per kampanje, ingen abonnement.',
    studioOutputs: (n) => `${n} redaksjonelle bilder`,
    studioBullet1: 'Kuratert Aimily-casting · full tilgang',
    studioBullet2: '12 formater per bilde (Instagram · TikTok · web · netthandel · print)',
    studioBullet3: 'Produkt bevart piksel for piksel',
    studioBullet4: 'Ingen abonnement · levering på timer',
    studioCta: 'Start med Studio',
    studentTitle: 'Gratis for studenter',
    studentDesc: 'Verifiser studentmailen din og få 12 måneder gratis Founder. Ikke fornybar.',
    studentCta: 'Verifiser studentmail',
  },
  sv: {
    studioTagline: 'AI-modeinnehåll, brand-locked. Betala per kampanj, ingen prenumeration.',
    studioOutputs: (n) => `${n} redaktionella bilder`,
    studioBullet1: 'Kurerad Aimily-casting · full åtkomst',
    studioBullet2: '12 format per foto (Instagram · TikTok · webb · e-handel · print)',
    studioBullet3: 'Produkt bevarat pixel för pixel',
    studioBullet4: 'Ingen prenumeration · leverans på timmar',
    studioCta: 'Börja med Studio',
    studentTitle: 'Gratis för studenter',
    studentDesc: 'Verifiera din studentmejl och få 12 månader Founder gratis. Inte förnybart.',
    studentCta: 'Verifiera studentmejl',
  },
};

interface PricingDetailProps {
  openAuth: () => void;
}

export function PricingDetail({ openAuth }: PricingDetailProps) {
  const { user } = useAuth();
  const { subscription, checkoutPlan, isPaid, openPortal } = useSubscription();
  const h = useHomeTranslation();
  const p = h.pricing;
  const { language } = useLanguage();
  const t = STUDIO_I18N[language] ?? STUDIO_I18N.en;
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
            t={t}
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
          <ContentStudioCard t={t} />
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
interface StudioI18n {
  studioTagline: string;
  studioOutputs: (n: number) => string;
  studioBullet1: string;
  studioBullet2: string;
  studioBullet3: string;
  studioBullet4: string;
  studioCta: string;
  studentTitle: string;
  studentDesc: string;
  studentCta: string;
}

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
  t: StudioI18n;
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
  t,
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

      {/* Student bullet — destacado within Founder card (no border, soft shaded panel) */}
      <div className="mb-5 rounded-[14px] bg-carbon/[0.04] p-4">
        <div className="flex items-start gap-2.5 mb-2">
          <GraduationCap className="w-4 h-4 mt-[2px] shrink-0 text-carbon/85" />
          <p className="text-[13px] leading-[1.5] text-carbon font-medium">
            {t.studentTitle}
          </p>
        </div>
        <p className="text-[12px] leading-[1.55] text-carbon/65 mb-3 pl-[26px]">
          {t.studentDesc}
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
              <>{t.studentCta} <ArrowRight className="w-3 h-3" /></>
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
interface ContentStudioCardProps {
  t: StudioI18n;
}
function ContentStudioCard({ t }: ContentStudioCardProps) {
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
          {t.studioTagline}
        </p>
      </div>

      {/* Three sub-tiers inline — no border, soft shaded rows */}
      <div className="mb-6 space-y-2">
        {STUDIO_TIERS.map((tier) => (
          <div
            key={tier.label}
            className="flex items-baseline justify-between rounded-[12px] bg-carbon/[0.04] px-4 py-3"
          >
            <div className="flex flex-col">
              <span className="text-[14px] font-medium text-carbon">{tier.label}</span>
              <span className="text-[11px] text-carbon/55">{t.studioOutputs(tier.outputs)}</span>
            </div>
            <div className="leading-none text-carbon flex items-baseline">
              <span className="text-[13px] font-light text-carbon/55 mr-1">€</span>
              <span className="text-[24px] font-light tracking-[-0.03em]">{tier.price}</span>
            </div>
          </div>
        ))}
      </div>

      <ul className="space-y-3 flex-1 mb-7">
        {[t.studioBullet1, t.studioBullet2, t.studioBullet3, t.studioBullet4].map((b, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-[1.5]">
            <Check className="w-4 h-4 mt-[2px] shrink-0 text-carbon/65" />
            <span className="text-carbon/85">{b}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/studio"
        className="w-full py-3 px-5 rounded-full text-[13px] font-semibold transition-all flex items-center justify-center gap-2 bg-carbon text-crema hover:bg-carbon/90"
      >
        {t.studioCta}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
