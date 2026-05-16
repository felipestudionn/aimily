/**
 * Strategy tenant context loader — the equivalent of Block 1's `loadFullContext`
 * but for enterprise Strategy tenants without a collection_plan.
 *
 * Per `research_block-1-2-reuse-for-strategy-2026-05-16.md` §6.2: every
 * Paso 2 LLM endpoint (creative-discovery, proposers) reads this context
 * server-side and merges it into the prompt so the model never sees
 * client-supplied untrusted context.
 *
 * Pulls:
 *   - tenant identity (display_name, country, tier, currency, isolation)
 *   - tenant_brand_profile (standalone brand DNA shape)
 *   - active creative brief (most-recent, if any)
 *   - latest completed run summary (sku/family/lineage counts, top families)
 *   - top carryover survivors from the latest run (the "winners" used by
 *     the SKU proposer to ground extensions)
 *   - identity graph snapshot (lineage count + sample)
 *   - active taxonomies (family + color + archetype mappings)
 */

import { supabaseAdmin } from '@/lib/supabase-admin';

export interface TenantBrandProfile {
  brand_archetype?: string;
  brand_values?: string[];
  tone_of_voice?: string;
  visual_anchors?: {
    colors?: Array<{ name?: string; hex?: string }>;
    typography?: string[];
    photography_style?: string;
  };
  target_consumer_hint?: string;
  positioning?: string;
  website?: string;
  instagram?: string;
}

export interface StrategyTenantContextWinner {
  product_fact_id: string;
  identity_node_id: string | null;
  model_ref: string;
  color_ref: string | null;
  product_name: string | null;
  family_code: string | null;
  pvp: number | null;
  margin_pct_list: number | null;
  effective_margin: number | null;
  demand_score: number | null;
  margin_score: number | null;
  lifecycle_stage: string | null;
  seasonal_runway_days: number | null;
}

export interface StrategyTenantContextFamily {
  family_code: string;
  family_display_name: string | null;
  family_roi: number | null;
  hero_count: number;
  dog_count: number;
  sku_count: number;
  share_of_wallet_pct: number | null;
  return_drag_score: number | null;
  saturation_score: number | null;
}

export interface StrategyTenantContext {
  tenant: {
    id: string;
    slug: string;
    display_name: string;
    legal_name: string | null;
    country_code: string;
    tier: string;
    default_currency: string;
    reverse_logistics_cost_per_unit: number;
  };
  brand_profile: TenantBrandProfile;
  has_brand_profile: boolean;
  active_brief: {
    id: string;
    name: string;
    color_story: string[];
    archetypes_focus: string[];
    family_pivot: Record<string, number>;
    silhouette_preferences: Record<string, unknown>;
    material_direction: Record<string, unknown>;
    customer_segment_shift: string | null;
    creative_narrative: string | null;
  } | null;
  latest_run: {
    id: string;
    name: string | null;
    run_status: string;
    created_at: string;
    sku_count: number;
    family_count: number;
    lineage_count: number;
  } | null;
  top_winners: StrategyTenantContextWinner[];
  top_families: StrategyTenantContextFamily[];
  taxonomies: {
    family: Record<string, unknown> | null;
    color_code_to_name: Record<string, string>;
    archetypes: string[];
  };
}

const WINNER_LIMIT = 12;
const FAMILY_LIMIT = 10;

export async function loadStrategyTenantContext(
  tenantId: string
): Promise<StrategyTenantContext | null> {
  const { data: tenant, error: tenantErr } = await supabaseAdmin
    .from('strategy_tenants')
    .select(
      'id, slug, display_name, legal_name, country_code, tier, default_currency, reverse_logistics_cost_per_unit, tenant_brand_profile'
    )
    .eq('id', tenantId)
    .is('archived_at', null)
    .single();
  if (tenantErr || !tenant) return null;

  const brandProfile = (tenant.tenant_brand_profile || {}) as TenantBrandProfile;
  const hasBrandProfile =
    !!brandProfile.brand_archetype ||
    !!brandProfile.positioning ||
    (Array.isArray(brandProfile.brand_values) && brandProfile.brand_values.length > 0);

  const [briefRes, latestRunRes, taxonomyRes] = await Promise.all([
    supabaseAdmin
      .from('strategy_creative_briefs')
      .select(
        'id, name, color_story, archetypes_focus, family_pivot, silhouette_preferences, material_direction, customer_segment_shift, creative_narrative'
      )
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('strategy_analysis_runs')
      .select('id, name, run_status, created_at, data_coverage_summary')
      .eq('tenant_id', tenantId)
      .eq('run_status', 'complete')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('strategy_taxonomies')
      .select('taxonomy_kind, mapping')
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
  ]);

  const activeBrief = briefRes.data
    ? {
        id: briefRes.data.id as string,
        name: briefRes.data.name as string,
        color_story: (briefRes.data.color_story as string[]) || [],
        archetypes_focus: (briefRes.data.archetypes_focus as string[]) || [],
        family_pivot: ((briefRes.data.family_pivot as Record<string, number>) || {}),
        silhouette_preferences: (briefRes.data.silhouette_preferences as Record<string, unknown>) || {},
        material_direction: (briefRes.data.material_direction as Record<string, unknown>) || {},
        customer_segment_shift: briefRes.data.customer_segment_shift as string | null,
        creative_narrative: briefRes.data.creative_narrative as string | null,
      }
    : null;

  let latestRunSummary: StrategyTenantContext['latest_run'] = null;
  let topWinners: StrategyTenantContextWinner[] = [];
  let topFamilies: StrategyTenantContextFamily[] = [];

  if (latestRunRes.data) {
    const coverage = (latestRunRes.data.data_coverage_summary || {}) as any;
    latestRunSummary = {
      id: latestRunRes.data.id as string,
      name: latestRunRes.data.name as string | null,
      run_status: latestRunRes.data.run_status as string,
      created_at: latestRunRes.data.created_at as string,
      sku_count: Number(coverage.sku_count ?? 0),
      family_count: Number(coverage.family_count ?? 0),
      lineage_count: Number(coverage.lineages_count ?? 0),
    };

    const [winnersRes, familiesRes] = await Promise.all([
      supabaseAdmin
        .from('strategy_sku_scores')
        .select(
          `
          product_fact_id, identity_node_id, demand_score, margin_score, effective_margin,
          lifecycle_stage, seasonal_runway_days,
          strategy_product_facts!inner (
            model_ref, color_ref, product_name, family_code, pvp, margin_pct_list
          )
          `
        )
        .eq('run_id', latestRunSummary.id)
        .in('lifecycle_stage', ['mature', 'peak', 'ramp'])
        .order('confidence_action', { ascending: false })
        .limit(WINNER_LIMIT * 3),
      supabaseAdmin
        .from('strategy_family_scores')
        .select(
          'family_code, family_display_name, family_roi, hero_count, dog_count, sku_count, share_of_wallet_pct, return_drag_score, saturation_score'
        )
        .eq('run_id', latestRunSummary.id)
        .order('share_of_wallet_pct', { ascending: false })
        .limit(FAMILY_LIMIT),
    ]);

    topWinners = ((winnersRes.data || []) as any[])
      .map((r: any) => ({
        product_fact_id: r.product_fact_id,
        identity_node_id: r.identity_node_id,
        model_ref: r.strategy_product_facts?.model_ref ?? null,
        color_ref: r.strategy_product_facts?.color_ref ?? null,
        product_name: r.strategy_product_facts?.product_name ?? null,
        family_code: r.strategy_product_facts?.family_code ?? null,
        pvp: r.strategy_product_facts?.pvp != null ? Number(r.strategy_product_facts.pvp) : null,
        margin_pct_list:
          r.strategy_product_facts?.margin_pct_list != null
            ? Number(r.strategy_product_facts.margin_pct_list)
            : null,
        effective_margin: r.effective_margin != null ? Number(r.effective_margin) : null,
        demand_score: r.demand_score != null ? Number(r.demand_score) : null,
        margin_score: r.margin_score != null ? Number(r.margin_score) : null,
        lifecycle_stage: r.lifecycle_stage as string | null,
        seasonal_runway_days:
          r.seasonal_runway_days != null ? Number(r.seasonal_runway_days) : null,
      }))
      .filter((w) => w.model_ref)
      .slice(0, WINNER_LIMIT);

    topFamilies = ((familiesRes.data || []) as any[]).map((f: any) => ({
      family_code: f.family_code,
      family_display_name: f.family_display_name,
      family_roi: f.family_roi != null ? Number(f.family_roi) : null,
      hero_count: Number(f.hero_count ?? 0),
      dog_count: Number(f.dog_count ?? 0),
      sku_count: Number(f.sku_count ?? 0),
      share_of_wallet_pct:
        f.share_of_wallet_pct != null ? Number(f.share_of_wallet_pct) : null,
      return_drag_score:
        f.return_drag_score != null ? Number(f.return_drag_score) : null,
      saturation_score:
        f.saturation_score != null ? Number(f.saturation_score) : null,
    }));
  }

  const taxonomies = {
    family: null as Record<string, unknown> | null,
    color_code_to_name: {} as Record<string, string>,
    archetypes: [] as string[],
  };
  for (const t of (taxonomyRes.data || []) as Array<{
    taxonomy_kind: string;
    mapping: any;
  }>) {
    if (t.taxonomy_kind === 'family') taxonomies.family = t.mapping || null;
    if (t.taxonomy_kind === 'color') {
      taxonomies.color_code_to_name = (t.mapping?.code_to_name || {}) as Record<
        string,
        string
      >;
    }
    if (t.taxonomy_kind === 'archetype') {
      taxonomies.archetypes = (t.mapping?.archetypes || []) as string[];
    }
  }

  return {
    tenant: {
      id: tenant.id as string,
      slug: tenant.slug as string,
      display_name: tenant.display_name as string,
      legal_name: tenant.legal_name as string | null,
      country_code: tenant.country_code as string,
      tier: tenant.tier as string,
      default_currency: tenant.default_currency as string,
      reverse_logistics_cost_per_unit: Number(tenant.reverse_logistics_cost_per_unit) || 6,
    },
    brand_profile: brandProfile,
    has_brand_profile: hasBrandProfile,
    active_brief: activeBrief,
    latest_run: latestRunSummary,
    top_winners: topWinners,
    top_families: topFamilies,
    taxonomies,
  };
}

/**
 * Stringify the context into a compact, LLM-friendly block. Used as the
 * common preamble for creative-discovery + proposers prompts so the model
 * sees the tenant's brand DNA, current portfolio winners, and active brief
 * in a consistent shape regardless of which generator is calling.
 */
export function formatContextForPrompt(ctx: StrategyTenantContext): string {
  const lines: string[] = [];
  lines.push(`# Tenant`);
  lines.push(
    `${ctx.tenant.display_name} (${ctx.tenant.slug}) · ${ctx.tenant.country_code} · ${ctx.tenant.tier} · ${ctx.tenant.default_currency}`
  );

  if (ctx.has_brand_profile) {
    lines.push(`\n# Brand DNA`);
    const bp = ctx.brand_profile;
    if (bp.brand_archetype) lines.push(`Archetype: ${bp.brand_archetype}`);
    if (bp.brand_values && bp.brand_values.length > 0)
      lines.push(`Values: ${bp.brand_values.join(', ')}`);
    if (bp.positioning) lines.push(`Positioning: ${bp.positioning}`);
    if (bp.tone_of_voice) lines.push(`Tone: ${bp.tone_of_voice}`);
    if (bp.target_consumer_hint) lines.push(`Consumer: ${bp.target_consumer_hint}`);
    if (bp.visual_anchors?.colors && bp.visual_anchors.colors.length > 0) {
      lines.push(
        `Visual colors: ${bp.visual_anchors.colors
          .map((c) => c.name || c.hex || '?')
          .filter(Boolean)
          .join(', ')}`
      );
    }
  } else {
    lines.push(`\n# Brand DNA`);
    lines.push(`(not yet captured — run /api/strategy/briefs/discover to auto-discover)`);
  }

  if (ctx.active_brief) {
    lines.push(`\n# Active creative brief (Bucket B)`);
    lines.push(`Name: ${ctx.active_brief.name}`);
    if (ctx.active_brief.color_story.length > 0)
      lines.push(`Color story: ${ctx.active_brief.color_story.join(', ')}`);
    if (ctx.active_brief.archetypes_focus.length > 0)
      lines.push(`Archetype focus: ${ctx.active_brief.archetypes_focus.join(', ')}`);
    const pivots = Object.entries(ctx.active_brief.family_pivot || {});
    if (pivots.length > 0) {
      lines.push(
        `Family pivot: ${pivots
          .map(([f, v]) => `${f} ${v > 0 ? '+' : ''}${(v * 100).toFixed(0)}%`)
          .join(' / ')}`
      );
    }
    if (ctx.active_brief.creative_narrative) {
      lines.push(`Narrative: ${ctx.active_brief.creative_narrative.slice(0, 400)}`);
    }
  } else {
    lines.push(`\n# Active creative brief`);
    lines.push(`(none — recommendations will be pure data-driven)`);
  }

  if (ctx.latest_run) {
    lines.push(`\n# Latest complete run`);
    lines.push(
      `${ctx.latest_run.name || ctx.latest_run.id} · ${ctx.latest_run.sku_count} SKUs · ${ctx.latest_run.family_count} families · ${ctx.latest_run.lineage_count} lineages`
    );
  }

  if (ctx.top_families.length > 0) {
    lines.push(`\n# Top families by share-of-wallet (current run)`);
    for (const f of ctx.top_families) {
      const share = f.share_of_wallet_pct != null ? `${(f.share_of_wallet_pct * 100).toFixed(1)}%` : '?';
      const roi = f.family_roi != null ? f.family_roi.toFixed(2) : '?';
      lines.push(
        `- ${f.family_code} · share ${share} · ROI ${roi} · ${f.hero_count}H/${f.dog_count}D over ${f.sku_count} SKUs`
      );
    }
  }

  if (ctx.top_winners.length > 0) {
    lines.push(`\n# Top winning SKUs (current run, lifecycle ∈ {mature, peak, ramp})`);
    for (const w of ctx.top_winners) {
      const price = w.pvp != null ? `€${w.pvp.toFixed(2)}` : '?';
      const margin = w.margin_pct_list != null ? `${(w.margin_pct_list * 100).toFixed(0)}%m` : '';
      const lifecycle = w.lifecycle_stage ?? '?';
      const runway = w.seasonal_runway_days != null ? `${w.seasonal_runway_days}d` : '';
      lines.push(
        `- ${w.product_name || w.model_ref} · ${w.model_ref} · ${w.family_code || '?'} · ${price} · ${margin} · ${lifecycle} · runway ${runway}`
      );
    }
  }

  return lines.join('\n');
}
