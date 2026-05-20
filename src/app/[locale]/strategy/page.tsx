/* ═══════════════════════════════════════════════════════════════════════════
   /[locale]/strategy — Aimily Strategy public landing.

   Wedge B2B enterprise landing — forensic merchandising intelligence layer
   for tier-2 / tier-1 fashion brands with real SKU history. Sells the
   pilot ("Season Performance Intelligence Pack") and the 6-confidence-
   dimension methodology, NOT a "we replace planning" pitch (BP §11.4).

   Targeted at category / merchandising / buying directors with one
   painful seasonal review process. NOT consumer, NOT SMB.
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
  Building2,
  Layers,
  BarChart3,
  Brain,
} from 'lucide-react';

export default async function StrategyLandingPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { user } = await getServerSession();
  if (user) redirect('/strategy');

  await props.params; // satisfy Next 16 dynamic params API

  return (
    <main className="min-h-screen bg-shade">
      {/* Hero */}
      <section className="px-6 py-20 md:px-12 md:py-32">
        <div className="mx-auto max-w-5xl">
          <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-carbon/45 mb-6">
            aimily In-Season · Enterprise
          </p>
          <h1 className="text-[44px] md:text-[64px] font-medium text-carbon tracking-[-0.035em] leading-[1.02] mb-6 max-w-[14ch]">
            In-Season Sales Management &amp; Actions
          </h1>
          <p className="text-[16px] md:text-[18px] text-carbon/55 leading-[1.55] max-w-2xl">
            For established fashion brands with real SKU history. Ingest your
            sales data, run 10 deterministic classifiers, and walk into your
            daily trading meeting with an evidence-backed action pack —
            replenish, kill, resize, recolor, markdown, investigate.{' '}
            <strong className="text-carbon">No black-box AI</strong>. Six
            confidence dimensions per recommendation. Backtested before we
            recommend.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="mailto:hello@aimily.app?subject=Aimily%20Strategy%20pilot%20enquiry"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-carbon text-white text-[14px] font-semibold tracking-[-0.01em] hover:bg-carbon/90"
            >
              Request a pilot scoping call
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
            Invite-only. Reach out for a 30-minute pilot scoping call.
          </p>
        </div>
      </section>

      {/* The problem band */}
      <section className="px-6 md:px-12 py-16 bg-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-carbon/40 mb-4">
            The problem
          </p>
          <h2 className="text-[28px] md:text-[36px] font-medium text-carbon tracking-[-0.025em] leading-[1.15] mb-8 max-w-[24ch]">
            Two camps. Nobody serves the intersection.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-[18px] bg-shade p-7">
              <p className="text-[11px] uppercase tracking-[0.1em] text-carbon/40 mb-3">
                Quant planning
              </p>
              <p className="text-[14px] text-carbon/70 leading-[1.6]">
                o9, Centric Planning, Anaplan, Nextail, RELEX. They eat your
                numbers and output more numbers. Zero creative-merch awareness.
                Zero natural-language explanation.
              </p>
            </div>
            <div className="rounded-[18px] bg-shade p-7">
              <p className="text-[11px] uppercase tracking-[0.1em] text-carbon/40 mb-3">
                Trend & creative
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
            On Excel. Every season. <strong className="text-carbon">Aimily Strategy
            is the layer between</strong> — your real SKU history × your creative
            direction × an evidence-bound recommendation pack.
          </p>
        </div>
      </section>

      {/* Methodology */}
      <section id="methodology" className="px-6 md:px-12 py-20">
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
              body="Upload your Inditex-style internal ranking PDF, Shopify CSV bundle, or custom ERP feed. We extract product / inventory / velocity / efficiency facts into a normalized schema. Identity graph groups colorways across seasons with confidence."
            />
            <MethodCard
              icon={BarChart3}
              title="Score"
              body="10 versioned classifiers run deterministically: distribution-normalized velocity, returns-penalized margin, capacity-aware demand ceiling, stockout-aware velocity, cannibalization, lifecycle stage, color winner intra-lineage, carryover survivor, family-level returns risk, family ROI."
            />
            <MethodCard
              icon={Brain}
              title="Recommend"
              body="Candidates per SKU, family, color, lineage. Scenarios honor your hard constraints (margin, SKU count, budget, positioning) and your optional creative brief (color story, archetype focus, family pivot). LLM translates structured scores into merchandising language — never the other way."
            />
          </div>
        </div>
      </section>

      {/* Pricing — section anchored on the landing per BP §11 */}
      <section id="pricing" className="px-6 md:px-12 py-20 bg-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-carbon/40 mb-4">
            Pricing
          </p>
          <h2 className="text-[28px] md:text-[36px] font-medium text-carbon tracking-[-0.025em] leading-[1.15] mb-3 max-w-[24ch]">
            Paid diagnostic. Then annual.
          </h2>
          <p className="text-[14px] text-carbon/55 leading-[1.6] max-w-2xl mb-10">
            We do not replace your planning stack. We make your existing
            seasonal review process evidence-backed and creative-aware. Every
            engagement opens with a paid pilot — backtested against the season
            we trained on, before any next-season recommendation goes to print.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <PricingCard
              tier="Tier-2"
              price="€40–90K"
              cadence="6–8 week pilot"
              tag="Mid-market entry"
              features={[
                '1 category scoped',
                '1–2 seasons of historical data',
                '1 creative direction overlay',
                'Retrospective backtest report',
                'Decision workshop (2h)',
                'Decision pack PDF deliverable',
              ]}
            />
            <PricingCard
              tier="Enterprise"
              price="€100–250K"
              cadence="6–8 week pilot"
              tag="Tier-2 premium / tier-1 fashion"
              recommended
              features={[
                '1 category + multi-region scope',
                '2+ seasons of historical data',
                'Bucket A + Bucket B full integration',
                'Custom taxonomy mapping setup',
                'Backtest + comparative analysis',
                'Executive decision workshop (half day)',
                'Pilot-to-annual conversion path',
              ]}
            />
            <PricingCard
              tier="Annual"
              price="€250–750K"
              cadence="post-pilot"
              tag="Recurring engagement"
              features={[
                'Quarterly seasonal reviews',
                'All categories or multi-region',
                'Mid-season replenishment alerts (v4)',
                'Custom ERP / PLM integration',
                'Dedicated tenant or VPC (tier-1)',
                'Annex IV documentation included',
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
      <section className="px-6 md:px-12 py-20">
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
              body="No training on customer data. DPA + SCCs default. Dedicated tenant or VPC available for tier-1. Algorithm versions, taxonomy versions, evidence pairs — every recommendation reproduces exactly."
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
            href="mailto:hello@aimily.app?subject=Aimily%20Strategy%20pilot%20enquiry"
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
    <div className="rounded-[20px] bg-shade p-8 md:p-10">
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
  price: string;
  cadence: string;
  tag: string;
  features: string[];
  recommended?: boolean;
}

function PricingCard({ tier, price, cadence, tag, features, recommended }: PricingCardProps) {
  return (
    <div
      className={`rounded-[20px] p-8 md:p-10 ${
        recommended ? 'bg-carbon text-white ring-2 ring-carbon' : 'bg-shade text-carbon'
      }`}
    >
      {recommended && (
        <p className="text-[10px] uppercase tracking-[0.12em] text-white/60 mb-3">
          Most landable for tier-2 premium
        </p>
      )}
      <p
        className={`text-[11px] uppercase tracking-[0.1em] mb-3 ${
          recommended ? 'text-white/50' : 'text-carbon/40'
        }`}
      >
        {tag}
      </p>
      <h3 className="text-[24px] font-semibold tracking-[-0.02em] mb-1">{tier}</h3>
      <div
        className={`text-[28px] font-medium tracking-[-0.02em] mb-1 ${
          recommended ? 'text-white' : 'text-carbon'
        }`}
      >
        {price}
      </div>
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
    <div className="rounded-[20px] bg-white p-8 md:p-10">
      <Icon className="h-5 w-5 text-carbon/55 mb-5" />
      <h3 className="text-[18px] font-semibold text-carbon tracking-[-0.02em] mb-3 leading-[1.2]">
        {title}
      </h3>
      <p className="text-[13px] text-carbon/55 leading-[1.65]">{body}</p>
    </div>
  );
}
