/* ═══════════════════════════════════════════════════════════════════════════
   /in-season/[tenantSlug] — tenant workspace · server data fetch.

   Server component: RLS-gated queries against Supabase + auth check.
   Render is delegated to TenantHubClient.tsx so the 4 Gold Standard cards
   can read locale-aware copy via useTranslation.
   ═══════════════════════════════════════════════════════════════════════════ */

import { redirect, notFound } from 'next/navigation';
import { getServerSession } from '@/lib/auth/server-session';
import { listUserTenants } from '@/lib/in-season/tenant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { TenantHubClient } from './TenantHubClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
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
      .select('id, processed_at, source_type')
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

  // PDF-source tenants (big-brand-style weekly internal report) get routed to
  // the PDF overlay viewer where the original report is rendered with verdicts
  // anchored on each SKU — the canonical demo wedge for that surface. API-source
  // tenants (Shopify live, CSV) have no PDF to overlay, so they keep the regular
  // list view.
  const hasPdfSource = sources.some((s) => s.source_type === 'pdf');
  const analysisRunHref = (runId: string) =>
    hasPdfSource
      ? `/in-season/${tenant.slug}/runs/${runId}/pdf-view`
      : `/in-season/${tenant.slug}/runs/${runId}`;

  // 4 hub cards · progress + status shape (status text is rendered client-side
  // via the i18n dictionary). The server only sets the shape + numeric data.
  const cards = [
    {
      number: 1,
      kind: 'sources' as const,
      href: `/in-season/${tenant.slug}/upload`,
      progress: sourcesProcessed > 0 ? 100 : sources.length > 0 ? 50 : 0,
      status:
        sources.length === 0
          ? ({ kind: 'sourcesNone' } as const)
          : sourcesProcessed === 0
          ? ({ kind: 'sourcesIngesting', count: sources.length } as const)
          : ({ kind: 'sourcesProcessed', count: sourcesProcessed } as const),
    },
    {
      number: 2,
      kind: 'creative' as const,
      href: `/in-season/${tenant.slug}/setup?block=creative`,
      progress: brief ? 100 : 0,
      status: brief
        ? ({ kind: 'briefConfirmed', label: brief.name } as const)
        : ({ kind: 'briefNotStarted' } as const),
    },
    {
      number: 3,
      kind: 'buyStrategy' as const,
      href: `/in-season/${tenant.slug}/setup?block=buy-strategy`,
      progress: constraint?.chosen_archetype_id ? 100 : 0,
      status: constraint?.chosen_archetype_id
        ? ({ kind: 'archetypeConfirmed', id: constraint.chosen_archetype_id } as const)
        : ({ kind: 'archetypeNotStarted' } as const),
    },
    {
      number: 4,
      kind: 'analysis' as const,
      href: runInFlight
        ? analysisRunHref(runInFlight.id)
        : latestCompletedRun
        ? analysisRunHref(latestCompletedRun.id)
        : `/in-season/${tenant.slug}/runs/new`,
      progress: runsCompleted > 0 ? 100 : runInFlight ? 50 : 0,
      status:
        runsCompleted > 0
          ? ({ kind: 'runsComplete', count: runsCompleted } as const)
          : runInFlight
          ? ({ kind: 'runInProgress' } as const)
          : ({ kind: 'runsNone' } as const),
    },
  ];

  return (
    <TenantHubClient
      tenant={{
        slug: tenant.slug,
        display_name: tenant.display_name,
        legal_name: tenant.legal_name,
        tier: tenant.tier,
        isolation_mode: tenant.isolation_mode,
        role: tenant.role,
      }}
      cards={cards}
      latestCompletedRunId={latestCompletedRun?.id ?? null}
    />
  );
}
