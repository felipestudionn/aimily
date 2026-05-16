/* ═══════════════════════════════════════════════════════════════════════════
   /strategy/[tenantSlug] — tenant workspace · 4 Gold Standard hub cards.

   Pattern: CLAUDE.md "GOLD STANDARD — las tarjetas del Overview de colección".
   4 white cards in a row · ghost number 72px · title 28px · description 14px ·
   CTA pill at the bottom · progress bar under the pill. Hover lift + shadow.

   The 4 cards represent the 4 inputs that feed an analysis run:
     01. Sources         — sales feeds ingested
     02. Analysis        — runs scored + scenarios assembled
     03. Buy strategy    — archetype A/B/C/D + action mix confirmed
     04. Creative brief  — moodboard + color story + archetype focus

   When all four are filled, the latest run's decision pack becomes the output.
   ═══════════════════════════════════════════════════════════════════════════ */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from '@/lib/auth/server-session';
import { listUserTenants } from '@/lib/strategy/tenant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  Building2,
  ShieldCheck,
  ArrowRight,
  Check,
  FileText,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

const TIER_LABELS: Record<string, string> = {
  tier2_mid: 'Tier-2 Mid',
  tier2_premium: 'Tier-2 Premium',
  tier1_fashion: 'Tier-1 Fashion',
  tier1_mega: 'Tier-1 Mega',
};

const ISOLATION_LABELS: Record<string, string> = {
  shared_rls: 'Shared · RLS',
  dedicated_schema: 'Dedicated schema',
  dedicated_project: 'Dedicated project',
  vpc_byoc: 'VPC · BYOC',
};

interface HubCard {
  number: number;
  title: string;
  description: string;
  href: string;
  progress: number; // 0 · 50 · 100
  statusLine: string;
}

export default async function TenantWorkspacePage({ params }: PageProps) {
  const { user } = await getServerSession();
  if (!user) redirect('/');

  const { tenantSlug } = await params;

  const tenants = await listUserTenants(user.id);
  const tenant = tenants.find((t) => t.slug === tenantSlug);
  if (!tenant) notFound();

  const [sourcesRes, runsRes, constraintRes, briefRes] = await Promise.all([
    supabaseAdmin
      .from('strategy_sources')
      .select('id, processed_at')
      .eq('tenant_id', tenant.id)
      .limit(50),
    supabaseAdmin
      .from('strategy_analysis_runs')
      .select('id, run_status, recommending_completed_at')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('strategy_constraints')
      .select('id, chosen_archetype_id, action_mix')
      .eq('tenant_id', tenant.id)
      .not('chosen_archetype_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('strategy_creative_briefs')
      .select('id, name, color_story, archetypes_focus')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const sources = sourcesRes.data ?? [];
  const runs = runsRes.data ?? [];
  const constraint = constraintRes.data ?? null;
  const brief = briefRes.data ?? null;

  const sourcesProcessed = sources.filter((s) => s.processed_at != null).length;
  const runsCompleted = runs.filter((r) => r.run_status === 'complete').length;
  const runInFlight = runs.find(
    (r) => r.run_status === 'scoring' || r.run_status === 'recommending' || r.run_status === 'pending'
  );
  const latestCompletedRun = runs.find((r) => r.run_status === 'complete');

  // 4 hub cards · progress + state-line
  const sourcesCard: HubCard = {
    number: 1,
    title: 'Sources',
    description:
      'Upload your historical sales feeds — Zara PDFs, Shopify exports, retail RNK files. Each source is parsed into facts the engine grounds every recommendation on.',
    href: `/strategy/${tenant.slug}/upload`,
    progress: sourcesProcessed > 0 ? 100 : sources.length > 0 ? 50 : 0,
    statusLine:
      sources.length === 0
        ? 'No sources yet'
        : sourcesProcessed === 0
        ? `${sources.length} ingesting…`
        : `${sourcesProcessed} processed`,
  };

  const briefCard: HubCard = {
    number: 2,
    title: 'Creative brief',
    description:
      'Moodboard + market research + selected trends. Aimily reads your visual codes and grounds the narrative direction the recommendations follow.',
    href: `/strategy/${tenant.slug}/setup?block=creative`,
    progress: brief ? 100 : 0,
    statusLine: brief
      ? brief.name ?? 'Confirmed'
      : 'Not started',
  };

  const buyStrategyCard: HubCard = {
    number: 3,
    title: 'Buy strategy',
    description:
      'Pick one of four archetypes (Replenish · Balanced · Defend · Category transition) and fine-tune the replenish / new / extension / kill mix.',
    href: `/strategy/${tenant.slug}/setup?block=buy-strategy`,
    progress: constraint?.chosen_archetype_id ? 100 : 0,
    statusLine: constraint?.chosen_archetype_id
      ? `Archetype ${constraint.chosen_archetype_id} · confirmed`
      : 'Not started',
  };

  const analysisCard: HubCard = {
    number: 4,
    title: 'Analysis',
    description:
      'Cross your sources with creative brief + buy strategy. Aimily scores every SKU, assembles scenarios, and surfaces what to replenish, refresh, or kill.',
    href: runInFlight
      ? `/strategy/${tenant.slug}/runs/${runInFlight.id}`
      : latestCompletedRun
      ? `/strategy/${tenant.slug}/runs/${latestCompletedRun.id}`
      : `/strategy/${tenant.slug}/runs/new`,
    progress: runsCompleted > 0 ? 100 : runInFlight ? 50 : 0,
    statusLine:
      runsCompleted > 0
        ? `${runsCompleted} run${runsCompleted === 1 ? '' : 's'} complete`
        : runInFlight
        ? 'Run in progress…'
        : 'No runs yet',
  };

  const cards: HubCard[] = [sourcesCard, briefCard, buyStrategyCard, analysisCard];
  const completedCount = cards.filter((c) => c.progress === 100).length;
  const allFour = completedCount === 4;

  return (
    <main className="min-h-screen bg-shade px-6 py-12 md:px-12 xl:px-16">
      <div className="mx-auto max-w-[2200px]">
        {/* Header */}
        <header className="mb-12">
          <Link
            href="/strategy"
            className="text-[12px] text-carbon/40 hover:text-carbon/70 transition-colors uppercase tracking-[0.08em] mb-3 inline-block"
          >
            ← All tenants
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-carbon/[0.04] text-[11px] text-carbon/50 uppercase tracking-[0.08em]">
                  <Building2 className="h-3 w-3" />
                  {TIER_LABELS[tenant.tier] || tenant.tier}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-carbon/[0.04] text-[11px] text-carbon/50 uppercase tracking-[0.08em]">
                  <ShieldCheck className="h-3 w-3" />
                  {ISOLATION_LABELS[tenant.isolation_mode] || tenant.isolation_mode}
                </span>
                <span className="text-[11px] text-carbon/35 uppercase tracking-[0.08em]">
                  {tenant.role}
                </span>
              </div>
              <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.05]">
                {tenant.display_name}
              </h1>
              {tenant.legal_name && tenant.legal_name !== tenant.display_name && (
                <p className="mt-2 text-[14px] text-carbon/50">{tenant.legal_name}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
                Progress
              </div>
              <div className="text-[28px] font-semibold text-carbon tabular-nums tracking-[-0.03em] mt-1">
                {completedCount}/4
              </div>
            </div>
          </div>
        </header>

        {/* 4 Gold Standard hub cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {cards.map((card) => {
            const isComplete = card.progress === 100;
            const isStarted = card.progress > 0;
            const n = card.number;
            return (
              <Link
                key={card.number}
                href={card.href}
                className="group relative bg-white rounded-[20px] p-10 md:p-14 flex flex-col min-h-[500px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] text-left"
              >
                {/* Ghost number */}
                <div className="mb-10">
                  <span className="text-[72px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em]">
                    0{n}.
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-5">
                  {card.title}
                </h3>

                {/* Description */}
                <p className="text-[14px] text-carbon/50 leading-[1.7] tracking-[-0.02em]">
                  {card.description}
                </p>

                {/* Status line */}
                <p className="text-[11px] text-carbon/35 uppercase tracking-[0.08em] mt-5">
                  {card.statusLine}
                </p>

                <div className="flex-1" />

                {/* CTA pill */}
                <div className="flex justify-center mt-10">
                  <div
                    className={`inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all ${
                      isComplete
                        ? 'border border-carbon/[0.15] text-carbon group-hover:bg-carbon/[0.04]'
                        : 'bg-carbon text-white group-hover:bg-carbon/90'
                    }`}
                  >
                    {isComplete ? 'Open' : isStarted ? 'Continue' : 'Start'}
                    {!isComplete && (
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    )}
                    {isComplete && <Check className="h-3.5 w-3.5" />}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 mx-auto w-[120px] h-[6px] rounded-full bg-carbon/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-carbon/30 transition-all duration-1000 ease-out"
                    style={{ width: `${card.progress}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Output band */}
        {allFour && latestCompletedRun ? (
          <Link
            href={`/strategy/${tenant.slug}/runs/${latestCompletedRun.id}/decision-pack`}
            className="group block bg-white rounded-[20px] p-10 md:p-14 transition-all duration-300 hover:scale-[1.005] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-carbon/55" />
                  <span className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
                    Output
                  </span>
                </div>
                <h2 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15]">
                  Decision pack ready
                </h2>
                <p className="text-[14px] text-carbon/55 mt-2 max-w-2xl leading-relaxed">
                  The four inputs are wired. Aimily has cross-referenced your sales history with
                  the creative brief and buy strategy to produce the season's plan.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 py-2.5 px-7 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] group-hover:bg-carbon/90 transition-colors">
                Open decision pack
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>
        ) : (
          <div className="bg-white rounded-[20px] p-10 md:p-14 ring-1 ring-carbon/[0.04]">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-carbon/40" />
                  <span className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/35">
                    Output
                  </span>
                </div>
                <h2 className="text-[24px] md:text-[28px] font-semibold text-carbon/40 tracking-[-0.03em] leading-[1.15]">
                  Decision pack — locked
                </h2>
                <p className="text-[14px] text-carbon/45 mt-2 max-w-2xl leading-relaxed">
                  Fill the four cards above. When all are confirmed, Aimily synthesises the
                  decision pack from your sources × brief × strategy.
                </p>
              </div>
              <div className="text-right">
                <div className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/35">
                  Missing
                </div>
                <div className="text-[20px] font-semibold text-carbon/50 tabular-nums tracking-[-0.02em] mt-1">
                  {4 - completedCount} of 4
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
