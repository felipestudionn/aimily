/* /strategy/[tenantSlug]/runs/new — create a new analysis run */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from '@/lib/auth/server-session';
import { listUserTenants } from '@/lib/strategy/tenant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getStrategyDictForUser } from '@/lib/strategy/server-i18n';
import { NewRunClient } from './NewRunClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function NewRunPage({ params }: PageProps) {
  const { user } = await getServerSession();
  if (!user) redirect('/');

  const { tenantSlug } = await params;
  const tenants = await listUserTenants(user.id);
  const tenant = tenants.find((t) => t.slug === tenantSlug);
  if (!tenant) notFound();

  const dict = getStrategyDictForUser(user);

  const [sourcesRes, constraintsRes, briefsRes] = await Promise.all([
    supabaseAdmin
      .from('strategy_sources')
      .select('id, season, market, source_format, observation_date, record_count, processed_at')
      .eq('tenant_id', tenant.id)
      .not('processed_at', 'is', null)
      .order('observation_date', { ascending: false }),
    supabaseAdmin
      .from('strategy_constraints')
      .select('id, name, target_total_skus, target_avg_margin')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('strategy_creative_briefs')
      .select('id, name')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <main className="min-h-screen bg-shade px-6 py-12 md:px-12 xl:px-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/strategy/${tenant.slug}`}
          className="text-[12px] text-carbon/40 hover:text-carbon/70 transition-colors uppercase tracking-[0.08em] mb-3 inline-block"
        >
          ← {tenant.display_name}
        </Link>
        <h1 className="text-[36px] md:text-[42px] font-medium text-carbon tracking-[-0.03em] leading-[1.1] mb-3">
          {dict.inSeason.surfaces.runsNewTitle}
        </h1>
        <p className="text-[14px] text-carbon/50 leading-[1.6] mb-10 max-w-xl">
          {dict.inSeason.surfaces.runsNewDescription}
        </p>
        <NewRunClient
          tenantSlug={tenant.slug}
          sources={sourcesRes.data || []}
          constraints={constraintsRes.data || []}
          briefs={briefsRes.data || []}
        />
      </div>
    </main>
  );
}
