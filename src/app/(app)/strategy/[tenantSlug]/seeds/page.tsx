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
  amplify_next_season: 'Replica · próxima temporada',
  extend_colors: 'Extender colores',
  drop_color: 'Retirar color',
  retire: 'Decontinuar modelo',
  reorder: 'Re-pedir AHORA',
};

const SEED_TYPE_HINT: Record<SeedRow['seed_type'], string> = {
  amplify_next_season: 'Sequel brief para nueva temporada',
  extend_colors: 'Mismo modelo, nuevos colores',
  drop_color: 'Color que no funciona — sacar de paleta',
  retire: 'No volver a desarrollar este modelo',
  reorder: 'Acción inmediata: re-pedir mismo SKU',
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

  // JOIN to product_facts for image + pvp (denormalized snapshot in seed
  // doesn't include the image URL — we look it up so the SKU card can
  // render the photo, matching the merchandising/builder pattern).
  const pfids = Array.from(new Set(seeds.map((s) => s.source_product_fact_id)));
  const productMeta = new Map<string, { product_image_url: string | null; pvp: number | null }>();
  if (pfids.length > 0) {
    const { data: pfRows } = await supabaseAdmin
      .from('strategy_product_facts')
      .select('id, product_image_url, pvp')
      .in('id', pfids);
    for (const row of (pfRows ?? []) as Array<{
      id: string;
      product_image_url: string | null;
      pvp: number | null;
    }>) {
      productMeta.set(row.id, {
        product_image_url: row.product_image_url,
        pvp: row.pvp,
      });
    }
  }

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

        {/* Filter row — neutral carbon palette, no tailwind generic */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <span className="text-[11px] uppercase tracking-[0.12em] text-carbon/40 mr-2">Estado:</span>
          {(['live', 'consumed', 'rejected', 'expired', 'all'] as const).map((s) => {
            const active = statusToFilter === s;
            return (
              <Link
                key={s}
                href={{ pathname: `/strategy/${tenantSlug}/seeds`, query: s === 'live' ? {} : { status: s } }}
                className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  active
                    ? 'bg-carbon text-white'
                    : 'bg-white text-carbon/60 border border-carbon/[0.08] hover:border-carbon/25'
                }`}
              >
                {s === 'live' ? 'Activas' : s === 'consumed' ? 'Consumidas' : s === 'rejected' ? 'Descartadas' : s === 'expired' ? 'Caducadas' : 'Todas'}
              </Link>
            );
          })}
          {Object.keys(countsByType).length > 0 && (
            <>
              <span className="text-[11px] uppercase tracking-[0.12em] text-carbon/40 ml-4 mr-2">Tipo:</span>
              {Object.entries(countsByType).map(([type, count]) => (
                <Link
                  key={type}
                  href={{
                    pathname: `/strategy/${tenantSlug}/seeds`,
                    query: filterSeedType === type ? { status: statusToFilter } : { status: statusToFilter, seed_type: type },
                  }}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                    filterSeedType === type
                      ? 'bg-carbon text-white'
                      : 'bg-white text-carbon/60 border border-carbon/[0.08] hover:border-carbon/25'
                  }`}
                >
                  {SEED_TYPE_LABEL[type as SeedRow['seed_type']] ?? type} <span className="text-carbon/35 ml-1">{count}</span>
                </Link>
              ))}
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-white rounded-[16px] p-4 text-[13px] text-carbon/70 border border-carbon/10 mb-6">
            Error cargando semillas: {error.message}
          </div>
        )}

        {/* Empty */}
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

        {/* SKU-card grid — same canonical pattern as merchandising FamilyCardGrid */}
        {seeds.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {seeds.map((seed) => (
              <SeedCard
                key={seed.id}
                seed={seed}
                tenantSlug={tenantSlug}
                productImageUrl={productMeta.get(seed.source_product_fact_id)?.product_image_url ?? null}
                productPvp={productMeta.get(seed.source_product_fact_id)?.pvp ?? null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SeedCard({
  seed,
  tenantSlug,
  productImageUrl,
  productPvp,
}: {
  seed: SeedRow;
  tenantSlug: string;
  productImageUrl: string | null;
  productPvp: number | null;
}) {
  const label = SEED_TYPE_LABEL[seed.seed_type] ?? seed.seed_type;
  const hint = SEED_TYPE_HINT[seed.seed_type] ?? '';
  const createdAt = new Date(seed.created_at).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
  const proposedColors = (seed.proposed_changes?.new_colors ??
    seed.proposed_changes?.proposed_colors) as
    | Array<{ name?: string; hex?: string }>
    | undefined;

  return (
    <div className="group bg-white rounded-[20px] p-6 md:p-8 flex flex-col min-h-[480px] border border-carbon/[0.06] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
      {/* Square photo (or placeholder) — same as merchandising SKU thumbnails */}
      <div className="w-full aspect-[3/4] bg-carbon/[0.04] rounded-[14px] overflow-hidden mb-5 flex items-center justify-center">
        {productImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={productImageUrl}
            alt={seed.source_product_name ?? seed.source_model_ref ?? ''}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-[10px] uppercase tracking-[0.15em] text-carbon/25">sin foto</span>
        )}
      </div>

      {/* Type label · subtle, carbon palette only */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-[0.12em] text-carbon/45 font-medium">
          {label}
        </span>
        <span className="text-carbon/15">·</span>
        <span className="text-[10px] text-carbon/35">{createdAt}</span>
        {seed.status !== 'live' && (
          <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-medium bg-carbon/[0.04] text-carbon/45 uppercase tracking-wider">
            {seed.status}
          </span>
        )}
      </div>

      {/* Title — same hierarchy as SKU card */}
      <h3 className="text-[18px] md:text-[20px] font-semibold text-carbon tracking-[-0.02em] leading-tight mb-1.5">
        {seed.source_product_name ?? seed.source_model_ref ?? '—'}
      </h3>

      {/* SKU / family / color · mono · subtle */}
      <div className="text-[11px] text-carbon/45 font-mono mb-3 truncate">
        {seed.source_model_ref}
        {seed.source_family_code ? ` · ${seed.source_family_code}` : ''}
        {seed.source_color_ref ? ` · ${seed.source_color_ref}` : ''}
        {productPvp != null ? ` · €${productPvp.toFixed(0)}` : ''}
      </div>

      {/* Hint about what this seed proposes */}
      {hint && (
        <div className="text-[11px] uppercase tracking-[0.06em] text-carbon/35 mb-2 font-medium">
          {hint}
        </div>
      )}

      {/* Rationale — main body */}
      {seed.rationale && (
        <p className="text-[12px] text-carbon/55 leading-[1.6] mb-4 line-clamp-4">
          {seed.rationale}
        </p>
      )}

      {/* Color swatches when applicable (extend_colors / amplify_next_season briefs with palette) */}
      {proposedColors && proposedColors.length > 0 && (
        <div className="flex items-center gap-1.5 mt-auto pt-3 border-t border-carbon/[0.04]">
          <span className="text-[10px] uppercase tracking-[0.08em] text-carbon/40 mr-1">Paleta:</span>
          {proposedColors.slice(0, 6).map((c, i) => (
            <span
              key={i}
              title={c.name ?? ''}
              className="w-5 h-5 rounded-full border border-carbon/10"
              style={{ backgroundColor: c.hex ?? 'transparent' }}
            />
          ))}
        </div>
      )}

      {/* CTA pill — carbon palette, like SKU cards */}
      <div className={`flex items-center justify-between gap-3 ${proposedColors && proposedColors.length > 0 ? 'mt-3' : 'mt-auto pt-4'}`}>
        <Link
          href={`/strategy/${tenantSlug}/runs/${seed.source_run_id}/pdf-view#sku-row-${seed.source_product_fact_id}`}
          className="text-[11px] text-carbon/45 hover:text-carbon transition-colors uppercase tracking-[0.08em]"
        >
          Ver run origen →
        </Link>
      </div>
    </div>
  );
}
