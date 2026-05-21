/* ═══════════════════════════════════════════════════════════════════════════
   /strategy/[tenantSlug]/connections — Tenant sales connections.

   List + connect Shopify (Stripe a futuro). MVP: paste-token. Real OAuth
   handshake = sprint hardening.
   Architecture: memory/architecture_in-season-feedback-loop.md §4.
   ═══════════════════════════════════════════════════════════════════════════ */

import { redirect, notFound } from 'next/navigation';
import { getServerSession } from '@/lib/auth/server-session';
import { listUserTenants } from '@/lib/in-season/tenant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Link from 'next/link';
import { ConnectionsClient } from './ConnectionsClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function ConnectionsPage({ params }: PageProps) {
  const { user } = await getServerSession();
  if (!user) redirect('/');
  const { tenantSlug } = await params;
  const tenants = await listUserTenants(user.id);
  const tenant = tenants.find((t) => t.slug === tenantSlug);
  if (!tenant) notFound();

  const { data } = await supabaseAdmin
    .from('tenant_sales_connections')
    .select(
      'id, provider, shop_domain, scopes, status, last_sync_at, last_sync_records_count, last_sync_error, next_sync_at, sync_cadence_hours, created_at'
    )
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false });

  const connections = (data ?? []) as Array<{
    id: string;
    provider: 'shopify' | 'stripe';
    shop_domain: string | null;
    scopes: string[];
    status: 'active' | 'paused' | 'error' | 'revoked';
    last_sync_at: string | null;
    last_sync_records_count: number | null;
    last_sync_error: string | null;
    next_sync_at: string;
    sync_cadence_hours: number;
    created_at: string;
  }>;

  // Get recent sync runs (last 5 per connection)
  const connIds = connections.map((c) => c.id);
  const { data: syncRunsData } =
    connIds.length > 0
      ? await supabaseAdmin
          .from('tenant_sales_sync_runs')
          .select('id, connection_id, trigger, started_at, finished_at, status, records_count, error, duration_ms')
          .in('connection_id', connIds)
          .order('started_at', { ascending: false })
          .limit(50)
      : { data: [] };

  return (
    <div className="min-h-screen bg-[#F3F2F0] py-10 px-6 md:px-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <div className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-1">
            <Link href={`/in-season/${tenantSlug}`} className="hover:text-carbon transition-colors">
              {tenant.display_name}
            </Link>
            {' · '}
            <span>Conexiones de ventas</span>
          </div>
          <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-tight">
            Conectar tu tienda
          </h1>
          <p className="text-[14px] text-carbon/60 mt-3 max-w-2xl leading-relaxed">
            Conecta Shopify (o Stripe en breve) para que In-Season tenga datos frescos de ventas
            cada mañana, sin subir CSVs manualmente. El cron diario corre a las 07:00 UTC.
          </p>
        </div>

        <ConnectionsClient
          tenantSlug={tenantSlug}
          connections={connections}
          syncRuns={syncRunsData ?? []}
        />
      </div>
    </div>
  );
}
