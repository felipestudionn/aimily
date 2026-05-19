/* ═══════════════════════════════════════════════════════════════════════════
   /strategy/[tenantSlug]/seeds — Pool de semillas In-Season (Sprint C).

   Lista todas las semillas de SKU generadas por los runs In-Season de este
   tenant. Cada semilla es una proposal de cambio para la próxima colección
   (extend_colors, amplify_next_season, drop_color, retire).

   Server component: RLS-gated query a in_season_sku_seeds.
   Filtros via query string: ?status=live|consumed|rejected · ?seed_type=…

   Architecture: memory/architecture_in-season-feedback-loop.md
   ═══════════════════════════════════════════════════════════════════════════ */

import { redirect, notFound } from 'next/navigation';
import { getServerSession } from '@/lib/auth/server-session';
import { listUserTenants } from '@/lib/strategy/tenant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ status?: string; seed_type?: string; source_run_id?: string }>;
}

interface SeedRow {
  id: string;
  source_run_id: string;
  source_product_fact_id: string;
  source_action_type: string;
  seed_type: 'amplify_next_season' | 'extend_colors' | 'drop_color' | 'retire' | 'reorder';
  proposed_changes: Record<string, unknown>;
  evidence: Record<string, unknown>;
  rationale: string;
  source_model_ref: string | null;
  source_color_ref: string | null;
  source_product_name: string | null;
  source_family_code: string | null;
  source_season_tag: string | null;
  status: 'live' | 'consumed' | 'rejected' | 'expired';
  consumed_at: string | null;
  consumed_in_collection_id: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  expires_at: string;
  created_at: string;
}

const SEED_TYPE_LABEL: Record<SeedRow['seed_type'], string> = {
  amplify_next_season: 'Replica el concepto · próxima temporada',
  extend_colors: 'Extender colores',
  drop_color: 'Retirar color de paleta',
  retire: 'Decontinuar modelo',
  reorder: 'Re-pedir AHORA',
};

const SEED_TYPE_TONE: Record<SeedRow['seed_type'], string> = {
  amplify_next_season: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  extend_colors: 'bg-sky-50 text-sky-700 border-sky-200',
  drop_color: 'bg-amber-50 text-amber-700 border-amber-200',
  retire: 'bg-rose-50 text-rose-700 border-rose-200',
  reorder: 'bg-violet-50 text-violet-700 border-violet-200',
};

export default async function SeedsPoolPage({ params, searchParams }: PageProps) {
  const { user } = await getServerSession();
  if (!user) redirect('/');

  const { tenantSlug } = await params;
  const { status: filterStatus, seed_type: filterSeedType, source_run_id: filterRunId } = await searchParams;

  const tenants = await listUserTenants(user.id);
  const tenant = tenants.find((t) => t.slug === tenantSlug);
  if (!tenant) notFound();

  // Build query
  let q = supabaseAdmin
    .from('in_season_sku_seeds')
    .select(
      'id, source_run_id, source_product_fact_id, source_action_type, seed_type, ' +
        'proposed_changes, evidence, rationale, ' +
        'source_model_ref, source_color_ref, source_product_name, source_family_code, source_season_tag, ' +
        'status, consumed_at, consumed_in_collection_id, rejected_at, rejection_reason, expires_at, created_at'
    )
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(500);

  const statusToFilter = filterStatus ?? 'live';
  if (statusToFilter !== 'all') q = q.eq('status', statusToFilter);
  if (filterSeedType) q = q.eq('seed_type', filterSeedType);
  if (filterRunId) q = q.eq('source_run_id', filterRunId);

  const { data, error } = await q;
  const seeds = (data ?? []) as unknown as SeedRow[];

  // Aggregate counts
  const countsByType: Record<string, number> = {};
  const countsByStatus: Record<string, number> = {};
  for (const s of seeds) {
    countsByType[s.seed_type] = (countsByType[s.seed_type] || 0) + 1;
    countsByStatus[s.status] = (countsByStatus[s.status] || 0) + 1;
  }

  // Total live across all types for header
  const { count: totalLive } = await supabaseAdmin
    .from('in_season_sku_seeds')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)
    .eq('status', 'live');

  return (
    <div className="min-h-screen bg-[#F3F2F0] py-10 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-1">
            <Link href={`/strategy/${tenantSlug}`} className="hover:text-carbon transition-colors">
              {tenant.display_name}
            </Link>
            {' · '}
            <span>Semillas In-Season</span>
          </div>
          <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-tight">
            Mis semillas
          </h1>
          <p className="text-[14px] text-carbon/60 mt-3 max-w-2xl leading-relaxed">
            Cada semilla es una propuesta que el motor In-Season generó a partir de un verdict.
            Cuando arranques tu próxima colección, podrás traerte las que quieras como SKUs base.
            <span className="ml-1 text-carbon/40">{totalLive ?? 0} vivas · {seeds.length} mostradas con filtros.</span>
          </p>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['live', 'consumed', 'rejected', 'expired', 'all'] as const).map((s) => {
            const active = statusToFilter === s;
            return (
              <Link
                key={s}
                href={{ pathname: `/strategy/${tenantSlug}/seeds`, query: s === 'live' ? {} : { status: s } }}
                className={`px-4 py-2 rounded-full text-[12px] font-medium border transition-colors ${
                  active
                    ? 'bg-carbon text-white border-carbon'
                    : 'bg-white text-carbon/60 border-carbon/[0.12] hover:border-carbon/30'
                }`}
              >
                {s === 'live' ? 'Activas' : s === 'consumed' ? 'Consumidas' : s === 'rejected' ? 'Descartadas' : s === 'expired' ? 'Caducadas' : 'Todas'}
              </Link>
            );
          })}
        </div>

        {/* Seed type breakdown */}
        {seeds.length > 0 && (
          <div className="bg-white rounded-[16px] p-6 mb-6 border border-carbon/[0.06]">
            <div className="text-[11px] uppercase tracking-[0.12em] text-carbon/45 mb-3">Distribución por tipo</div>
            <div className="flex flex-wrap gap-3">
              {Object.entries(countsByType).map(([type, count]) => (
                <Link
                  key={type}
                  href={{
                    pathname: `/strategy/${tenantSlug}/seeds`,
                    query: filterSeedType === type ? { status: statusToFilter } : { status: statusToFilter, seed_type: type },
                  }}
                  className={`px-4 py-2 rounded-full text-[12px] font-medium border ${
                    filterSeedType === type
                      ? 'bg-carbon text-white border-carbon'
                      : SEED_TYPE_TONE[type as SeedRow['seed_type']] ?? 'bg-carbon/[0.04] text-carbon/60 border-carbon/[0.08]'
                  }`}
                >
                  {SEED_TYPE_LABEL[type as SeedRow['seed_type']] ?? type} · {count}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-[12px] p-4 text-[13px] text-rose-700 mb-6">
            Error cargando semillas: {error.message}
          </div>
        )}

        {/* Empty state */}
        {!error && seeds.length === 0 && (
          <div className="bg-white rounded-[20px] p-16 text-center border border-carbon/[0.06]">
            <div className="text-[14px] text-carbon/60 mb-2">No hay semillas para mostrar.</div>
            <div className="text-[13px] text-carbon/40">
              {statusToFilter === 'live'
                ? 'Ejecuta un run In-Season en modo aimily_360 para generar tus primeras semillas.'
                : 'Prueba quitar filtros o cambiar el estado.'}
            </div>
          </div>
        )}

        {/* Seed list */}
        {seeds.length > 0 && (
          <div className="space-y-3">
            {seeds.map((seed) => (
              <SeedCard key={seed.id} seed={seed} tenantSlug={tenantSlug} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SeedCard({ seed, tenantSlug }: { seed: SeedRow; tenantSlug: string }) {
  const tone = SEED_TYPE_TONE[seed.seed_type] ?? 'bg-carbon/[0.04] text-carbon/60 border-carbon/[0.08]';
  const label = SEED_TYPE_LABEL[seed.seed_type] ?? seed.seed_type;
  const createdAt = new Date(seed.created_at).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const proposedColors = (seed.proposed_changes?.new_colors ?? seed.proposed_changes?.proposed_colors) as
    | Array<{ name?: string; hex?: string }>
    | undefined;

  return (
    <div className="bg-white rounded-[16px] p-6 border border-carbon/[0.06]">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-[11px] font-medium border ${tone}`}>{label}</span>
            <span className="text-[11px] text-carbon/40">{createdAt}</span>
            {seed.status !== 'live' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-carbon/[0.06] text-carbon/50 uppercase tracking-wider">
                {seed.status}
              </span>
            )}
          </div>
          <div className="text-[15px] font-medium text-carbon mb-1">
            {seed.source_product_name ?? seed.source_model_ref ?? '—'}
          </div>
          <div className="text-[12px] text-carbon/45 font-mono mb-3">
            {seed.source_model_ref}
            {seed.source_family_code ? ` · ${seed.source_family_code}` : ''}
            {seed.source_color_ref ? ` · ${seed.source_color_ref}` : ''}
            {seed.source_season_tag ? ` · ${seed.source_season_tag}` : ''}
          </div>
          {seed.rationale && (
            <p className="text-[13px] text-carbon/70 leading-relaxed mb-3">{seed.rationale}</p>
          )}
          {proposedColors && proposedColors.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[11px] text-carbon/45 uppercase tracking-wider mr-1">Colores propuestos:</span>
              {proposedColors.map((c, i) => (
                <span key={i} className="flex items-center gap-1.5 text-[12px] text-carbon/70">
                  {c.hex && (
                    <span
                      className="w-3 h-3 rounded-full border border-carbon/10"
                      style={{ backgroundColor: c.hex }}
                    />
                  )}
                  {c.name ?? '—'}
                </span>
              ))}
            </div>
          )}
        </div>
        <Link
          href={`/strategy/${tenantSlug}/runs/${seed.source_run_id}/pdf-view#sku-row-${seed.source_product_fact_id}`}
          className="text-[12px] text-carbon/50 hover:text-carbon transition-colors whitespace-nowrap"
        >
          Ver run origen →
        </Link>
      </div>
    </div>
  );
}
