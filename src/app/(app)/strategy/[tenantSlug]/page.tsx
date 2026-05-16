/* ═══════════════════════════════════════════════════════════════════════════
   /strategy/[tenantSlug] — tenant workspace.

   The authenticated landing page for a single tenant. Shows:
   - Tenant header (display name, tier, role, isolation mode badge)
   - Sources panel: uploads to date, observation date range, season coverage
   - Analysis runs list: most recent at top, status pill, run shortcut
   - CTAs: upload new source, start new run

   Server-rendered so all data lands without skeleton flash.
   ═══════════════════════════════════════════════════════════════════════════ */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from '@/lib/auth/server-session';
import { listUserTenants } from '@/lib/strategy/tenant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  Building2,
  ShieldCheck,
  UploadCloud,
  Plus,
  ArrowRight,
  Clock3,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
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

const STATUS_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  pending: { label: 'Queued', icon: Clock3, className: 'bg-carbon/[0.06] text-carbon/60' },
  ingesting: {
    label: 'Ingesting',
    icon: UploadCloud,
    className: 'bg-blue-50 text-blue-700',
  },
  scoring: {
    label: 'Scoring',
    icon: PlayCircle,
    className: 'bg-amber-50 text-amber-700',
  },
  recommending: {
    label: 'Recommending',
    icon: PlayCircle,
    className: 'bg-amber-50 text-amber-700',
  },
  complete: {
    label: 'Complete',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-700',
  },
  failed: {
    label: 'Failed',
    icon: AlertCircle,
    className: 'bg-red-50 text-red-700',
  },
};

export default async function TenantWorkspacePage({ params }: PageProps) {
  const { user } = await getServerSession();
  if (!user) redirect('/');

  const { tenantSlug } = await params;

  const tenants = await listUserTenants(user.id);
  const tenant = tenants.find((t) => t.slug === tenantSlug);
  if (!tenant) notFound();

  // Pull recent activity in parallel.
  const [sourcesRes, runsRes, constraintsRes, briefsRes] = await Promise.all([
    supabaseAdmin
      .from('strategy_sources')
      .select(
        'id, season, market, source_format, observation_date, record_count, parse_confidence, uploaded_at, processed_at'
      )
      .eq('tenant_id', tenant.id)
      .order('observation_date', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('strategy_analysis_runs')
      .select('id, name, run_status, created_at, scoring_completed_at, recommending_completed_at')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('strategy_constraints')
      .select('id, name, target_total_skus, target_avg_margin, created_at')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('strategy_creative_briefs')
      .select('id, name, color_story, archetypes_focus, created_at')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const sources = sourcesRes.data || [];
  const runs = runsRes.data || [];
  const constraints = constraintsRes.data || [];
  const briefs = briefsRes.data || [];

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
            <div className="flex gap-3">
              <Link
                href={`/strategy/${tenant.slug}/upload`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-carbon/[0.12] text-carbon/70 text-[13px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/[0.04]"
              >
                <UploadCloud className="h-4 w-4" />
                Upload source
              </Link>
              <Link
                href={`/strategy/${tenant.slug}/setup`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-carbon/[0.12] text-carbon/70 text-[13px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/[0.04]"
              >
                Setup
              </Link>
              <Link
                href={`/strategy/${tenant.slug}/runs/new`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90"
              >
                <Plus className="h-4 w-4" />
                New analysis run
              </Link>
            </div>
          </div>
        </header>

        {/* Two-column main grid: sources + runs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          {/* Sources */}
          <section className="bg-white rounded-[20px] p-8 md:p-10">
            <header className="flex items-center justify-between mb-6">
              <h2 className="text-[20px] font-semibold text-carbon tracking-[-0.02em]">
                Sources
              </h2>
              <Link
                href={`/strategy/${tenant.slug}/upload`}
                className="text-[12px] text-carbon/60 hover:text-carbon underline-offset-4 hover:underline"
              >
                Upload new →
              </Link>
            </header>
            {sources.length === 0 ? (
              <p className="text-[13px] text-carbon/40 italic">
                No sources ingested yet. Upload your first SKU performance feed to begin.
              </p>
            ) : (
              <ul className="divide-y divide-carbon/[0.06]">
                {sources.map((s) => (
                  <li key={s.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[14px] text-carbon font-medium">
                        {s.season} · {s.source_format}
                        {s.market ? ` · ${s.market}` : ''}
                      </p>
                      <p className="text-[12px] text-carbon/40">
                        {s.record_count} records · obs {new Date(s.observation_date).toLocaleDateString()}{' '}
                        · parse {Math.round(Number(s.parse_confidence) * 100)}%
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.08em] ${
                        s.processed_at
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {s.processed_at ? 'Processed' : 'Pending'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Runs */}
          <section className="bg-white rounded-[20px] p-8 md:p-10">
            <header className="flex items-center justify-between mb-6">
              <h2 className="text-[20px] font-semibold text-carbon tracking-[-0.02em]">
                Analysis runs
              </h2>
              <Link
                href={`/strategy/${tenant.slug}/runs/new`}
                className="text-[12px] text-carbon/60 hover:text-carbon underline-offset-4 hover:underline"
              >
                Start new →
              </Link>
            </header>
            {runs.length === 0 ? (
              <p className="text-[13px] text-carbon/40 italic">
                No analysis runs yet. Once you have at least one ingested source, start a
                run to score SKUs and generate recommendations.
              </p>
            ) : (
              <ul className="divide-y divide-carbon/[0.06]">
                {runs.map((r) => {
                  const meta = STATUS_META[r.run_status] || STATUS_META.pending;
                  const Icon = meta.icon;
                  return (
                    <li key={r.id} className="py-3 flex items-center justify-between gap-4">
                      <Link
                        href={`/strategy/${tenant.slug}/runs/${r.id}`}
                        className="flex-1 group"
                      >
                        <p className="text-[14px] text-carbon font-medium group-hover:text-carbon/70">
                          {r.name || `Run · ${new Date(r.created_at).toLocaleString()}`}
                        </p>
                        <p className="text-[12px] text-carbon/40">
                          {new Date(r.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </Link>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.08em] ${meta.className}`}
                      >
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </span>
                      <ArrowRight className="h-4 w-4 text-carbon/30" />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Constraints + Briefs row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <section className="bg-white rounded-[20px] p-8 md:p-10">
            <header className="flex items-center justify-between mb-6">
              <h2 className="text-[20px] font-semibold text-carbon tracking-[-0.02em]">
                Buy strategy
              </h2>
              <Link
                href={`/strategy/${tenant.slug}/setup?block=buy-strategy`}
                className="text-[12px] text-carbon/60 hover:text-carbon underline-offset-4 hover:underline"
              >
                Open setup →
              </Link>
            </header>
            {constraints.length === 0 ? (
              <p className="text-[13px] text-carbon/40 italic">
                Hard targets (margin, SKU count, budget, family share, positioning).
                Recommendations must respect these.
              </p>
            ) : (
              <ul className="space-y-2">
                {constraints.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-[12px] bg-carbon/[0.03] text-[13px]"
                  >
                    <span className="text-carbon font-medium">{c.name}</span>
                    <span className="text-carbon/50 text-[12px]">
                      {c.target_total_skus ? `${c.target_total_skus} SKUs` : '—'}
                      {c.target_avg_margin
                        ? ` · ${(Number(c.target_avg_margin) * 100).toFixed(0)}% margin`
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-[20px] p-8 md:p-10">
            <header className="flex items-center justify-between mb-6">
              <h2 className="text-[20px] font-semibold text-carbon tracking-[-0.02em]">
                Creative briefs
              </h2>
              <Link
                href={`/strategy/${tenant.slug}/setup?block=creative`}
                className="text-[12px] text-carbon/60 hover:text-carbon underline-offset-4 hover:underline"
              >
                Open setup →
              </Link>
            </header>
            {briefs.length === 0 ? (
              <p className="text-[13px] text-carbon/40 italic">
                Optional. Color story, archetype focus, family pivot. Modulates the
                recommendation; never overrides constraints.
              </p>
            ) : (
              <ul className="space-y-2">
                {briefs.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between p-3 rounded-[12px] bg-carbon/[0.03] text-[13px]"
                  >
                    <span className="text-carbon font-medium">{b.name}</span>
                    <span className="text-carbon/50 text-[12px]">
                      {(b.color_story || []).length}c · {(b.archetypes_focus || []).length}a
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
