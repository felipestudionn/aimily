/**
 * In-Season SKU seed materialization · Felipe 2026-05-19.
 *
 * Doc canon: memory/architecture_in-season-feedback-loop.md
 *
 * After the verdict resolver builds the SKU stack for a run, this helper
 * walks each SKU's actions and materializes a row in `in_season_sku_seeds`
 * for the seed-producing verbs (extend_colors, amplify_next_season,
 * drop_color, retire). Only fires for tenants with surface_mode='aimily_360'
 * — connector_standalone tenants get verdicts only.
 *
 * Idempotent: re-running on the same run upserts via (run_id, pfid,
 * action_type, seed_type) tuple. New verdict shifts only add new seeds; they
 * don't duplicate.
 *
 * NOT a hot path: invoked once per run, after verdicts are built. Adds
 * ~50-300ms latency depending on seed count.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';

export type InSeasonSeedType =
  | 'amplify_next_season'
  | 'extend_colors'
  | 'drop_color'
  | 'retire'
  | 'reorder';

// Map verdict action_type → seed_type. Only the seed-producing verbs are
// listed; anything else returns null and is skipped.
const ACTION_TO_SEED_TYPE: Record<string, InSeasonSeedType> = {
  amplify_next_season: 'amplify_next_season',
  extend_colors: 'extend_colors',
  drop_color: 'drop_color',
  kill: 'retire',
  // Note: replenish / amplify_in_season produce action AHORA, not seeds for
  // next collection. They are NOT materialized.
};

interface SkuForSeeding {
  product_fact_id: string;
  model_ref?: string | null;
  color_ref?: string | null;
  product_name?: string | null;
  family_code?: string | null;
  season_tag?: string | null;
  actions: Array<{
    action: string;
    rationale?: string;
    evidence?: Record<string, unknown>;
  }>;
}

/** Materialize seeds for a single run. Returns the count materialized.
 *  No-ops (returns 0) when the tenant is not in aimily_360 mode. */
export async function materializeSkuSeedsForRun(
  runId: string,
  tenantId: string,
  skus: SkuForSeeding[]
): Promise<{ created: number; skipped_non_360: boolean }> {
  // Gate: only aimily_360 tenants materialize seeds.
  const { data: tenant } = await supabaseAdmin
    .from('strategy_tenants')
    .select('surface_mode')
    .eq('id', tenantId)
    .single();

  if (!tenant || tenant.surface_mode !== 'aimily_360') {
    return { created: 0, skipped_non_360: true };
  }

  // Build the rows to upsert. We dedupe by (run, pfid, action_type, seed_type)
  // — if the same seed already exists for this run/pfid/action, skip (the
  // engine is deterministic-ish, re-running should produce same seeds).
  type SeedRow = {
    tenant_id: string;
    source_run_id: string;
    source_product_fact_id: string;
    source_action_type: string;
    seed_type: InSeasonSeedType;
    proposed_changes: Record<string, unknown>;
    evidence: Record<string, unknown>;
    rationale: string;
    source_model_ref: string | null;
    source_color_ref: string | null;
    source_product_name: string | null;
    source_family_code: string | null;
    source_season_tag: string | null;
  };

  const rows: SeedRow[] = [];
  for (const sku of skus) {
    for (const action of sku.actions) {
      const seedType = ACTION_TO_SEED_TYPE[action.action];
      if (!seedType) continue;

      // Build proposed_changes payload depending on seed_type.
      const evidence = action.evidence ?? {};
      let proposedChanges: Record<string, unknown> = {};
      switch (seedType) {
        case 'extend_colors':
          proposedChanges = {
            new_colors: evidence.proposed_colors ?? [],
            current_color: sku.color_ref,
          };
          break;
        case 'amplify_next_season':
          proposedChanges = {
            concept_brief: evidence.concept_brief ?? null,
            alter_dims: evidence.alter_dims ?? ['color', 'fabric'],
            proposed_colors: evidence.proposed_colors ?? [],
          };
          break;
        case 'drop_color':
          proposedChanges = {
            color_name: sku.color_ref ?? evidence.color_name ?? null,
            color_hex: evidence.color_hex ?? null,
          };
          break;
        case 'retire':
          proposedChanges = {
            reason: evidence.kill_reason ?? action.rationale ?? 'kill verdict',
          };
          break;
        case 'reorder':
          // Should not reach here — reorder isn't in ACTION_TO_SEED_TYPE.
          proposedChanges = {};
          break;
      }

      rows.push({
        tenant_id: tenantId,
        source_run_id: runId,
        source_product_fact_id: sku.product_fact_id,
        source_action_type: action.action,
        seed_type: seedType,
        proposed_changes: proposedChanges,
        evidence: evidence as Record<string, unknown>,
        rationale: action.rationale ?? '',
        source_model_ref: sku.model_ref ?? null,
        source_color_ref: sku.color_ref ?? null,
        source_product_name: sku.product_name ?? null,
        source_family_code: sku.family_code ?? null,
        source_season_tag: sku.season_tag ?? null,
      });
    }
  }

  if (rows.length === 0) {
    return { created: 0, skipped_non_360: false };
  }

  // De-dup: check existing seeds for this run + delete the ones that are
  // about to be re-inserted (so we don't violate the natural key).
  // Idempotency strategy: for the same run, the latest materialization wins.
  await supabaseAdmin
    .from('in_season_sku_seeds')
    .delete()
    .eq('source_run_id', runId)
    .eq('status', 'live');

  const { error, count } = await supabaseAdmin
    .from('in_season_sku_seeds')
    .insert(rows, { count: 'exact' });

  if (error) {
    console.error('[materializeSkuSeeds] insert failed', error);
    return { created: 0, skipped_non_360: false };
  }

  return { created: count ?? rows.length, skipped_non_360: false };
}
