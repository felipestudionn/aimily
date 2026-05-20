/* ═══════════════════════════════════════════════════════════════════════════
   /strategy — Aimily Strategy dashboard.

   The authenticated landing for Aimily Strategy users. Lists the enterprise
   tenants the user is a member of, with their role + tier + recent activity.

   Aimily Strategy is the third product in the family (after aimily 360 +
   Aimily Studio). Wedge B2B for tier-2/tier-1 fashion brands. Forensic
   merchandising intelligence layer with creative modulation.

   See business-plan_aimily-strategy-2026-05-15.md for the full thesis.

   Server Component: resolves auth + tenant membership server-side so the
   HTML reaches the browser populated, no skeleton flash.
   ═══════════════════════════════════════════════════════════════════════════ */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from '@/lib/auth/server-session';
import { listUserTenants } from '@/lib/strategy/tenant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ArrowRight, Plus, BarChart3, Building2, ShieldCheck, FileSearch } from 'lucide-react';

export const dynamic = 'force-dynamic';

const TIER_LABELS: Record<string, string> = {
  tier2_mid: 'Tier-2 Mid',
  tier2_premium: 'Tier-2 Premium',
  tier1_fashion: 'Tier-1 Fashion',
  tier1_mega: 'Tier-1 Mega',
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  analyst: 'Analyst',
  viewer: 'Viewer',
};

export default async function StrategyDashboardPage() {
  const { user } = await getServerSession();
  if (!user) redirect('/');

  const tenants = await listUserTenants(user.id);

  // For each tenant, count recent runs + sources for the card.
  const tenantStats = await Promise.all(
    tenants.map(async (t) => {
      const [runsRes, sourcesRes] = await Promise.all([
        supabaseAdmin
          .from('strategy_analysis_runs')
          .select('id, run_status, created_at', { count: 'exact', head: false })
          .eq('tenant_id', t.id)
          .order('created_at', { ascending: false })
          .limit(1),
        supabaseAdmin
          .from('strategy_sources')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', t.id),
      ]);
      const lastRun = (runsRes.data || [])[0] || null;
      return {
        tenant: t,
        run_count: runsRes.count ?? 0,
        source_count: sourcesRes.count ?? 0,
        last_run_at: lastRun?.created_at ?? null,
        last_run_status: lastRun?.run_status ?? null,
      };
    })
  );

  return (
    <main className="min-h-screen bg-shade px-6 py-12 md:px-12 xl:px-16">
      <div className="mx-auto max-w-[2200px]">
        {/* Header */}
        <header className="mb-12 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-2">
              aimily In-Season
            </p>
            <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.05]">
              In-Season Sales Management &amp; Actions
            </h1>
            <p className="mt-3 text-[14px] text-carbon/50 max-w-2xl leading-[1.6]">
              Daily in-season decisions backed by your own SKU data — what to
              replenish, kill, resize, recolor, carry over, mark down, or
              investigate. Optional creative direction modulates the
              recommendation.
            </p>
          </div>
          {tenants.length > 0 && (
            <Link
              href="/in-season/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90"
            >
              <Plus className="h-4 w-4" />
              New analysis run
            </Link>
          )}
        </header>

        {tenants.length === 0 && <EmptyState />}

        {tenants.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {tenantStats.map((row) => {
              const t = row.tenant;
              const lastRunAt = row.last_run_at
                ? new Date(row.last_run_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : null;
              return (
                <Link
                  key={t.id}
                  href={`/in-season/${t.slug}`}
                  className="group relative bg-white rounded-[20px] p-8 md:p-10 flex flex-col min-h-[280px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] text-left"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-2.5 px-3 py-1 rounded-full bg-carbon/[0.04] text-[11px] text-carbon/50 uppercase tracking-[0.08em]">
                      <Building2 className="h-3 w-3" />
                      {TIER_LABELS[t.tier] || t.tier}
                    </div>
                    <span className="text-[11px] text-carbon/30 uppercase tracking-[0.08em]">
                      {ROLE_LABELS[t.role] || t.role}
                    </span>
                  </div>

                  <h3 className="text-[22px] md:text-[24px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-3">
                    {t.display_name}
                  </h3>
                  {t.legal_name && t.legal_name !== t.display_name && (
                    <p className="text-[12px] text-carbon/40 mb-3 leading-[1.5]">
                      {t.legal_name}
                    </p>
                  )}

                  <div className="mt-auto pt-6 grid grid-cols-2 gap-3 text-[12px] text-carbon/50">
                    <div>
                      <div className="text-[20px] font-semibold text-carbon tracking-[-0.02em]">
                        {row.run_count}
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.08em] text-carbon/35">
                        Runs
                      </div>
                    </div>
                    <div>
                      <div className="text-[20px] font-semibold text-carbon tracking-[-0.02em]">
                        {row.source_count}
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.08em] text-carbon/35">
                        Sources
                      </div>
                    </div>
                  </div>

                  {lastRunAt && (
                    <p className="mt-4 text-[11px] text-carbon/35">
                      Last run · {lastRunAt}
                    </p>
                  )}

                  <ArrowRight className="absolute right-6 bottom-6 h-4 w-4 text-carbon/30 group-hover:text-carbon group-hover:translate-x-0.5 transition-all" />
                </Link>
              );
            })}
          </div>
        )}

        {/* Trust + positioning band */}
        <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-5">
          <TrustCard
            icon={FileSearch}
            title="Backtested first"
            description="Every algorithm version is validated against the prior season before any recommendation reaches you. Calibrated uncertainty over confident guessing."
          />
          <TrustCard
            icon={BarChart3}
            title="6 confidence dimensions"
            description="Data completeness, identity, demand, margin, creative fit, action robustness. No single score — the breakdown is the value."
          />
          <TrustCard
            icon={ShieldCheck}
            title="EU AI Act lane"
            description="No training on your data. DPA + SCCs default. Dedicated tenant available for tier-1. Audit trail per recommendation."
          />
        </section>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-[20px] p-12 md:p-16 text-center max-w-3xl mx-auto">
      <h2 className="text-[28px] md:text-[32px] font-medium text-carbon tracking-[-0.03em] leading-[1.15] mb-4">
        You are not yet a member of any Strategy tenant
      </h2>
      <p className="text-[14px] text-carbon/50 leading-[1.7] max-w-xl mx-auto mb-8">
        Aimily Strategy is invite-only for enterprise customers. If you are
        evaluating Strategy for your brand, reach out to{' '}
        <a href="mailto:hello@aimily.app" className="text-carbon underline underline-offset-2">
          hello@aimily.app
        </a>{' '}
        to schedule a pilot scoping call.
      </p>
      <Link
        href="mailto:hello@aimily.app?subject=Aimily%20Strategy%20pilot%20enquiry"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] hover:bg-carbon/90 transition-all"
      >
        Request a pilot scoping call
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

interface TrustCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function TrustCard({ icon: Icon, title, description }: TrustCardProps) {
  return (
    <div className="bg-white rounded-[20px] p-8 md:p-10">
      <Icon className="h-5 w-5 text-carbon/60 mb-5" />
      <h3 className="text-[18px] font-semibold text-carbon tracking-[-0.02em] mb-3 leading-[1.2]">
        {title}
      </h3>
      <p className="text-[13px] text-carbon/50 leading-[1.6]">{description}</p>
    </div>
  );
}
