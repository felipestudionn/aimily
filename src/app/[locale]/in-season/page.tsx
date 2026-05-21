/* ═══════════════════════════════════════════════════════════════════════════
   /[locale]/in-season — aimily In-Season public landing.

   Canonical landing for In-Season Sales Management & Actions. Replaces the
   retired /strategy landing (renamed 2026-05-20). Two surfaces share the
   same engine:

     A) Standalone connector for Shopify/Stripe brands (OAuth, daily cron)
     B) Block 5 of aimily 360 — sales feedback loop into next-season Moodboard

   Daily trading meeting is the canonical cadence. 13 verbs, 10 deterministic
   classifiers, 6 confidence dimensions per recommendation. No black-box AI.

   Targeted at director-level merchandising / planning / buying.
   ═══════════════════════════════════════════════════════════════════════════ */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from '@/lib/auth/server-session';
import {
  ArrowRight,
  Check,
  FileSearch,
  Activity,
  ShieldCheck,
  Layers,
  BarChart3,
  Brain,
  ShoppingBag,
  Sun,
} from 'lucide-react';

export default async function InSeasonLandingPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { user } = await getServerSession();
  if (user) redirect('/in-season');

  await props.params; // satisfy Next 16 dynamic params API

  return (
    <main className="min-h-screen bg-shade">
      {/* Hero */}
      <section className="px-6 pt-32 pb-20 md:px-12 md:pt-40 md:pb-32">
        <div className="mx-auto max-w-5xl">
          <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-carbon/45 mb-6">
            aimily In-Season
          </p>
          <h1 className="text-[44px] md:text-[64px] font-medium text-carbon tracking-[-0.035em] leading-[1.02] mb-6 max-w-[14ch]">
            In-Season Sales Management &amp; Actions
          </h1>
          <p className="text-[16px] md:text-[18px] text-carbon/55 leading-[1.55] max-w-2xl">
            Daily in-season decisions backed by your own SKU data — what to
            replenish, kill, resize, recolor, carry over, mark down, or
            investigate. Connect Shopify in two clicks, or drop a weekly PDF.
            Walk into your daily trading meeting with an evidence-backed action
            pack.{' '}
            <strong className="text-carbon">No black-box AI</strong>. Six
            confidence dimensions per recommendation. Backtested before we
            recommend.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/in-season"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-carbon text-white text-[14px] font-semibold tracking-[-0.01em] hover:bg-carbon/90"
            >
              Start the connector
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#methodology"
              className="text-[13px] text-carbon/60 hover:text-carbon underline-offset-4 hover:underline px-4 py-3"
            >
              How the engine works ↓
            </Link>
          </div>
          <p className="mt-6 text-[12px] text-carbon/35">
            Included in every aimily plan. Pilot available for enterprise
            volume — reach out for a 30-minute scoping call.
          </p>
        </div>
      </section>

      {/* Two surfaces band */}
      <section className="px-6 md:px-12 py-16 bg-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-carbon/40 mb-4">
            Two surfaces, same engine
          </p>
          <h2 className="text-[28px] md:text-[36px] font-medium text-carbon tracking-[-0.025em] leading-[1.15] mb-8 max-w-[24ch]">
            Daily decisions today. The next collection, smarter.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-[18px] bg-shade p-7">
              <ShoppingBag className="h-5 w-5 text-carbon/55 mb-4" />
              <p className="text-[11px] uppercase tracking-[0.1em] text-carbon/40 mb-3">
                Connector (standalone)
              </p>
              <h3 className="text-[18px] font-semibold text-carbon mb-3 tracking-[-0.02em]">
                Run In-Season on what you already sell
              </h3>
              <p className="text-[13.5px] text-carbon/70 leading-[1.6]">
                Connect Shopify in two clicks (OAuth, Partner App approved).
                Drop a PDF if you&apos;re on a legacy ERP. We ingest sales,
                returns, inventory and run the daily action pack. Works without
                ever creating a collection in aimily.
              </p>
            </div>
            <div className="rounded-[18px] bg-shade p-7">
              <Sun className="h-5 w-5 text-carbon/55 mb-4" />
              <p className="text-[11px] uppercase tracking-[0.1em] text-carbon/40 mb-3">
                Block 5 of aimily 360
              </p>
              <h3 className="text-[18px] font-semibold text-carbon mb-3 tracking-[-0.02em]">
                Sales feedback closes the loop
              </h3>
              <p className="text-[13.5px] text-carbon/70 leading-[1.6]">
                Seeds from in-season winners feed straight into next-season
                Moodboard — colour extensions, family amplification, lineage
                survivors. The collection you build next is informed by the
                season that just ended, not by a hunch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The problem band */}
      <section className="px-6 md:px-12 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-carbon/40 mb-4">
            The problem
          </p>
          <h2 className="text-[28px] md:text-[36px] font-medium text-carbon tracking-[-0.025em] leading-[1.15] mb-8 max-w-[24ch]">
            Two camps. Nobody serves the intersection.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-[18px] bg-white p-7">
              <p className="text-[11px] uppercase tracking-[0.1em] text-carbon/40 mb-3">
                Quant planning
              </p>
              <p className="text-[14px] text-carbon/70 leading-[1.6]">
                o9, Centric Planning, Anaplan, Nextail, RELEX. They eat your
                numbers and output more numbers. Zero creative-merch awareness.
                Zero natural-language explanation.
              </p>
            </div>
            <div className="rounded-[18px] bg-white p-7">
              <p className="text-[11px] uppercase tracking-[0.1em] text-carbon/40 mb-3">
                Trend &amp; creative
              </p>
              <p className="text-[14px] text-carbon/70 leading-[1.6]">
                WGSN, Heuritech, Stylumia, EDITED. They tell you what the world
                wants — without reconciling against YOUR last-season SKU
                performance. Recommendations float in the abstract.
              </p>
            </div>
          </div>
          <p className="mt-8 text-[15px] text-carbon/70 leading-[1.55] max-w-3xl">
            Your buyers still need to sit down and reconcile both sides. By hand.
            On Excel. Every season.{' '}
            <strong className="text-carbon">aimily In-Season is the layer between</strong>{' '}
            — your real SKU history × your creative direction × an
            evidence-bound recommendation pack.
          </p>
        </div>
      </section>

      {/* Methodology */}
      <section id="methodology" className="px-6 md:px-12 py-20 bg-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-carbon/40 mb-4">
            How it works
          </p>
          <h2 className="text-[28px] md:text-[36px] font-medium text-carbon tracking-[-0.025em] leading-[1.15] mb-10 max-w-[20ch]">
            Deterministic first. LLM only narrates.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <MethodCard
              icon={Layers}
              title="Ingest"
              body="Connect Shopify via OAuth (Partner App approved, Protected Customer Data Access), drop a weekly Inditex-style ranking PDF, or wire Stripe / a custom ERP. We extract product / inventory / velocity / efficiency facts into a normalized schema. Identity graph groups colorways across seasons with confidence."
            />
            <MethodCard
              icon={BarChart3}
              title="Score"
              body="10 versioned classifiers run deterministically: distribution-normalized velocity, returns-penalized margin, capacity-aware demand ceiling, stockout-aware velocity, cannibalization, lifecycle stage, color winner intra-lineage, carryover survivor, family-level returns risk, family ROI."
            />
            <MethodCard
              icon={Brain}
              title="Recommend"
              body="13 actions per SKU, family, color, lineage — replenish, kill, resize, recolor, markdown, amplify-distribution, pull-forward-intake, investigate, and more. Scenarios honour your hard constraints (margin, SKU count, budget, positioning) and your optional creative brief. LLM translates structured scores into merchandising language — never the other way."
            />
          </div>

          {/* Daily cadence callout */}
          <div className="mt-10 rounded-[20px] border border-carbon/[0.08] bg-shade p-8">
            <p className="text-[11px] uppercase tracking-[0.15em] text-carbon/45 mb-3">
              Daily trading meeting
            </p>
            <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-carbon mb-3 max-w-[34ch]">
              A fresh action pack every morning. Same engine, same vocabulary, every day.
            </h3>
            <p className="text-[13.5px] text-carbon/65 leading-[1.65] max-w-3xl">
              The cron pulls overnight sales at 6 am tenant time and re-runs
              the 10 classifiers. By the time your team sits down, each SKU
              has a verdict pill with six confidence dimensions visible. Pin
              verdicts to seeds for next season&apos;s Moodboard, or push a
              decision straight to your ERP. No mid-day spreadsheet
              gymnastics.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing — folded back into the main plan */}
      <section id="pricing" className="px-6 md:px-12 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-carbon/40 mb-4">
            Pricing
          </p>
          <h2 className="text-[28px] md:text-[36px] font-medium text-carbon tracking-[-0.025em] leading-[1.15] mb-3 max-w-[24ch]">
            Included in every aimily plan.
          </h2>
          <p className="text-[14px] text-carbon/55 leading-[1.6] max-w-2xl mb-10">
            In-Season runs on the unified Aimily Credits bucket — same wallet
            as Studio and the 360 builder. A daily classifier run costs 10
            credits. Founder plans get 100 credits / month, Team plans get
            1,000. Enterprise pilots quoted separately for tier-1 volume and
            dedicated infra.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <PricingCard
              tier="Founder · €99 / mo"
              cadence="100 credits / month"
              tag="Solo brands · DTC"
              features={[
                'Full In-Season engine',
                '≈ 10 daily runs / month',
                'Shopify OAuth connector',
                'PDF intake fallback',
                'Seeds → Moodboard loop',
                '6-dim confidence per recommendation',
              ]}
            />
            <PricingCard
              tier="Team · €599 / mo"
              cadence="1,000 credits / month"
              tag="Multi-brand teams"
              recommended
              features={[
                'Everything in Founder',
                '≈ 100 daily runs / month',
                'Multi-tenant (separate brands)',
                'Stripe / custom ERP connectors',
                'Webhook hardening + DLQ',
                'Vault-encrypted tokens at rest',
              ]}
            />
            <PricingCard
              tier="Enterprise"
              cadence="custom contract"
              tag="Tier-1 / tier-2 premium"
              features={[
                'Dedicated tenant or VPC',
                'Custom taxonomy mapping',
                'Backtest + comparative analysis',
                'Annex IV documentation included',
                'Executive decision workshop',
                'DPA + SCCs default · no training on your data',
              ]}
            />
          </div>
          <p className="mt-10 text-[12px] text-carbon/40 leading-[1.6] max-w-3xl">
            Tier-1 mega (Inditex / H&amp;M scale, dedicated infrastructure)
            quoted separately. Contracts include DPA + SCCs by default; no
            training on your data, ever.
          </p>
        </div>
      </section>

      {/* Trust band */}
      <section className="px-6 md:px-12 py-20 bg-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-carbon/40 mb-4">
            Trust
          </p>
          <h2 className="text-[28px] md:text-[36px] font-medium text-carbon tracking-[-0.025em] leading-[1.15] mb-10 max-w-[22ch]">
            Calibrated uncertainty over confident guessing.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <TrustCard
              icon={FileSearch}
              title="Backtested first"
              body="Every algorithm version is validated against the prior season's actual outcomes before any recommendation reaches you. Precision, recall, return-trap catch rate — all on the table."
            />
            <TrustCard
              icon={Activity}
              title="6 confidence dimensions"
              body="Data completeness, identity, demand, margin, creative fit, action robustness. Every recommendation surfaces all six. No single confidence score papering over weak signals."
            />
            <TrustCard
              icon={ShieldCheck}
              title="EU AI Act lane"
              body="No training on customer data. DPA + SCCs default. Dedicated tenant or VPC available. Algorithm versions, taxonomy versions, evidence pairs — every recommendation reproduces exactly. Shopify Protected Customer Data Access approved."
            />
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 md:px-12 py-24 bg-carbon text-white text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-[32px] md:text-[42px] font-medium tracking-[-0.025em] leading-[1.1] mb-5">
            Earn the right to recommend next season by being right about last.
          </h2>
          <p className="text-[14px] text-white/60 leading-[1.6] mb-9">
            30-minute pilot scoping call. We come prepared with a sample
            backtest against publicly-available SKU data so you can see the
            engine before you brief us on yours.
          </p>
          <Link
            href="mailto:hello@aimily.app?subject=aimily%20In-Season%20pilot%20enquiry"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-carbon text-[14px] font-semibold tracking-[-0.01em] hover:bg-white/90"
          >
            Schedule pilot scoping call
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

interface MethodCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}

function MethodCard({ icon: Icon, title, body }: MethodCardProps) {
  return (
    <div className="rounded-[20px] bg-white p-8 md:p-10 border border-carbon/[0.06]">
      <Icon className="h-5 w-5 text-carbon/55 mb-5" />
      <h3 className="text-[20px] font-semibold text-carbon tracking-[-0.02em] mb-3 leading-[1.2]">
        {title}
      </h3>
      <p className="text-[13px] text-carbon/55 leading-[1.65]">{body}</p>
    </div>
  );
}

interface PricingCardProps {
  tier: string;
  cadence: string;
  tag: string;
  features: string[];
  recommended?: boolean;
}

function PricingCard({ tier, cadence, tag, features, recommended }: PricingCardProps) {
  return (
    <div
      className={`rounded-[20px] p-8 md:p-10 ${
        recommended ? 'bg-carbon text-white ring-2 ring-carbon' : 'bg-shade text-carbon'
      }`}
    >
      {recommended && (
        <p className="text-[10px] uppercase tracking-[0.12em] text-white/60 mb-3">
          Best for most teams
        </p>
      )}
      <p
        className={`text-[11px] uppercase tracking-[0.1em] mb-3 ${
          recommended ? 'text-white/50' : 'text-carbon/40'
        }`}
      >
        {tag}
      </p>
      <h3 className="text-[22px] font-semibold tracking-[-0.02em] mb-1">{tier}</h3>
      <p
        className={`text-[12px] mb-6 ${recommended ? 'text-white/50' : 'text-carbon/50'}`}
      >
        {cadence}
      </p>
      <ul className="space-y-2.5">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-[12.5px] leading-[1.5]">
            <Check
              className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${
                recommended ? 'text-white/70' : 'text-carbon/55'
              }`}
            />
            <span className={recommended ? 'text-white/85' : 'text-carbon/70'}>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface TrustCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}

function TrustCard({ icon: Icon, title, body }: TrustCardProps) {
  return (
    <div className="rounded-[20px] bg-shade p-8 md:p-10">
      <Icon className="h-5 w-5 text-carbon/55 mb-5" />
      <h3 className="text-[18px] font-semibold text-carbon tracking-[-0.02em] mb-3 leading-[1.2]">
        {title}
      </h3>
      <p className="text-[13px] text-carbon/55 leading-[1.65]">{body}</p>
    </div>
  );
}
