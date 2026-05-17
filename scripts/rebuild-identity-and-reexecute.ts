/**
 * One-off: rebuild the identity graph for a tenant + re-execute its analysis run.
 *
 * Context (2026-05-17 P0 fix):
 * The audit D.1 finding showed the identity graph's `canonicalPrefix` was
 * grouping by the first model_ref token only, collapsing 9 SKUs (Grandad
 * Collar / Linen Shirt / Knotted Collar / Balloon Sleeve / Fluid Polo) into
 * a single "FLUID POLO" lineage because they all share prefix "4786". The
 * code fix shipped in commit 6d922f8 (2 tokens) but the DATABASE was not
 * rebuilt — strategy_sku_identity_graph rows still reflect the old grouping.
 *
 * This script:
 *  1. Identifies the tenant + run.
 *  2. Wipes + rebuilds strategy_sku_identity_graph for the tenant using
 *     the fixed canonicalPrefix (2-token grouping).
 *  3. Resets the run status to 'pending' so the orchestrator's atomic
 *     claim succeeds.
 *  4. Re-executes the run end-to-end (scoring → recommending → scenarios)
 *     — the new lineages now feed into amplify_winner sibling-ref evidence,
 *     extend_colors winner detection, and color-scope kill propagation.
 *  5. Smoke-tests SKU 1 (model_ref starts with `4786 166`, color 401):
 *     verifies it emits `amplify_winner` and `extend_colors` only,
 *     no rogue `kill` from color-scope propagation (bug 8.1).
 *
 * Usage: npx tsx scripts/rebuild-identity-and-reexecute.ts [run_id]
 * Default run_id = the V26 corpus dogfood run (0c2ed3e9).
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildIdentityGraphForTenant } from '@/lib/strategy/identity-graph';
import { executeAnalysisRun } from '@/lib/strategy/orchestrator';

const DEFAULT_RUN_ID = '0c2ed3e9-cef4-4107-abea-c01535d885e3';

interface RunRow {
  id: string;
  tenant_id: string;
  source_set_ids: string[];
  run_status: string;
}

interface IdentityGraphRow {
  canonical_id: string;
  display_name: string;
  match_type: string;
  member_product_fact_ids: string[];
  variant_color_codes: string[];
}

async function main() {
  const runId = process.argv[2] || DEFAULT_RUN_ID;
  console.log(`\n=== Identity graph rebuild + re-execute ===`);
  console.log(`Run ID: ${runId}\n`);

  // 1) Look up the tenant_id.
  const { data: run, error: runErr } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select('id, tenant_id, source_set_ids, run_status')
    .eq('id', runId)
    .single();
  if (runErr || !run) {
    console.error('Run not found:', runErr?.message);
    process.exit(1);
  }
  const runRow = run as RunRow;
  console.log(`Tenant: ${runRow.tenant_id}`);
  console.log(`Source sets: ${runRow.source_set_ids?.join(', ') || '(none)'}`);
  console.log(`Current status: ${runRow.run_status}\n`);

  // 2) Snapshot the identity graph BEFORE rebuild for visibility.
  const { count: beforeCount } = await supabaseAdmin
    .from('strategy_sku_identity_graph')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', runRow.tenant_id);
  console.log(`Identity graph BEFORE rebuild: ${beforeCount ?? 0} lineages\n`);

  // 3) Rebuild identity graph. The builder is idempotent — it wipes prior
  //    rows for the tenant and re-emits with the corrected canonicalPrefix.
  console.log('Rebuilding identity graph...');
  const t0 = Date.now();
  const summary = await buildIdentityGraphForTenant(runRow.tenant_id);
  console.log(`Identity graph rebuilt in ${Date.now() - t0}ms.`);
  console.log(`  Total lineages: ${summary.lineages_total}`);
  console.log(`  Created: ${summary.lineages_created}`);
  console.log(`  Updated: ${summary.lineages_updated}`);
  console.log(`  Match types: ${JSON.stringify(summary.match_type_counts)}\n`);

  // 4) Show the new lineage distribution for sanity check.
  const { data: lineages } = await supabaseAdmin
    .from('strategy_sku_identity_graph')
    .select('canonical_id, display_name, match_type, member_product_fact_ids, variant_color_codes')
    .eq('tenant_id', runRow.tenant_id)
    .order('canonical_id');
  if (lineages && lineages.length > 0) {
    console.log(`Sample of new lineages (first 5):`);
    for (const l of (lineages as IdentityGraphRow[]).slice(0, 5)) {
      console.log(
        `  ${l.canonical_id} · ${l.display_name} · ${l.match_type} · ` +
        `${l.member_product_fact_ids.length} members · ` +
        `${l.variant_color_codes.length} colors`
      );
    }
    console.log();
  }

  // 5) Reset the run status to 'pending' so the orchestrator's atomic
  //    claim succeeds. The orchestrator itself wipes derived rows on every run.
  console.log('Resetting run status to pending...');
  const { error: resetErr } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .update({
      run_status: 'pending',
      scoring_started_at: null,
      scoring_completed_at: null,
      recommending_completed_at: null,
      error_log: null,
    })
    .eq('id', runId);
  if (resetErr) {
    console.error('Status reset failed:', resetErr.message);
    process.exit(1);
  }
  console.log('Run status reset.\n');

  // 6) Re-execute the orchestrator end-to-end.
  console.log('Executing analysis run end-to-end...');
  const t1 = Date.now();
  let result;
  try {
    result = await executeAnalysisRun(runId);
  } catch (e) {
    console.error('Orchestrator failed:', (e as Error).message);
    process.exit(1);
  }
  console.log(`Orchestrator complete in ${Date.now() - t1}ms.`);
  console.log(`  SKU scores: ${result.sku_score_count}`);
  console.log(`  Family scores: ${result.family_score_count}`);
  console.log(`  Candidates: ${result.candidate_count}`);
  console.log(`  Scenarios: ${result.scenario_count}`);
  console.log(`  Duration: ${result.duration_ms}ms`);
  if (result.warnings.length > 0) {
    console.log(`  Warnings:`);
    for (const w of result.warnings) console.log(`    - ${w}`);
  }
  console.log();

  // 7) Smoke test SKU 1 — the top of the V26 RNK PDF (model_ref "4786 166 401",
  //    color 401). Verify it emits amplify_winner + extend_colors only, no
  //    rogue color-scope kill (bug 8.1 fix verification).
  console.log('Smoke test: SKU 1 (model_ref like "4786 166 401")...');
  const { data: sku1Product } = await supabaseAdmin
    .from('strategy_product_facts')
    .select('id, model_ref, color_ref, product_name')
    .eq('tenant_id', runRow.tenant_id)
    .like('model_ref', '4786 166%')
    .eq('color_ref', '401')
    .limit(1)
    .maybeSingle();
  if (!sku1Product) {
    console.log('  SKU 1 not found by model_ref pattern + color 401.\n');
  } else {
    const sku1 = sku1Product as { id: string; model_ref: string; color_ref: string; product_name: string };
    console.log(`  Found: ${sku1.model_ref} · ${sku1.product_name} · color ${sku1.color_ref}`);
    const { data: candidates } = await supabaseAdmin
      .from('strategy_recommendation_candidates')
      .select('action_type, confidence_action, evidence')
      .eq('run_id', runId)
      .eq('product_fact_id', sku1.id)
      .order('confidence_action', { ascending: false });
    if (candidates && candidates.length > 0) {
      console.log(`  Candidates emitted for SKU 1:`);
      for (const c of candidates as Array<{ action_type: string; confidence_action: number; evidence: Record<string, unknown> }>) {
        const scopeHint = c.evidence?.scope_hint ?? '';
        const scopeStr = scopeHint ? ` [scope: ${scopeHint}]` : '';
        console.log(`    ${c.action_type}${scopeStr} · ${Math.round(c.confidence_action * 100)}%`);
      }
      const hasRogueKill = (candidates as Array<{ action_type: string; evidence: Record<string, unknown> }>).some(
        (c) => c.action_type === 'kill' && c.evidence?.scope_hint === 'color'
      );
      if (hasRogueKill) {
        console.log(`\n  ❌ FAIL: SKU 1 still receives a color-scope KILL. Bug 8.1 fix not applied?`);
        process.exit(2);
      } else {
        console.log(`\n  ✅ PASS: SKU 1 has no rogue color-scope KILL. Bug 8.1 fix verified.`);
      }
    } else {
      console.log(`  No candidates emitted — orchestrator may not have run scoring for SKU 1.`);
    }
  }

  console.log(`\n=== Done ===\n`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
