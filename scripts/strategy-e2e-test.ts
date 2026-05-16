/**
 * Aimily Strategy · End-to-end pipeline test with REAL Zara RNK PDF.
 *
 * Bypasses auth (uses supabaseAdmin) but exercises the full business logic:
 *   1. Read the PDF from disk
 *   2. Upload to strategy-uploads bucket under <tenant_id>/<source_id>/...
 *   3. Insert strategy_sources row
 *   4. Call parseZaraRnkPdf — Claude vision extraction
 *   5. persistParserResult → 4 fact tables
 *   6. buildIdentityGraphForTenant → lineage detection
 *   7. Create a strategy_analysis_run
 *   8. executeAnalysisRun → scores + candidates + scenarios
 *   9. runBacktest (requires 2+ seasons; will skip with "insufficient" if not)
 *  10. generateRunSummary → LLM learnings narrative
 *  11. Print a console scoreboard
 *
 * Usage:
 *   npx tsx scripts/strategy-e2e-test.ts <pdf-path>
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.env.local' });

// Lazy-import after env is loaded so supabaseAdmin sees the keys.
async function main() {
  const pdfArg = process.argv[2] || '/Users/felipemartinez/Downloads/RNK TOTAL WOMAN.pdf';
  const pdfPath = resolve(pdfArg);
  if (!existsSync(pdfPath)) {
    throw new Error(`PDF not found: ${pdfPath}`);
  }

  const { supabaseAdmin } = await import('../src/lib/supabase-admin');
  const { parseZaraRnkPdf } = await import('../src/lib/strategy/parsers/zara-rnk-pdf');
  const { persistParserResult } = await import('../src/lib/strategy/etl/persist');
  const { buildIdentityGraphForTenant } = await import('../src/lib/strategy/identity-graph');
  const { executeAnalysisRun } = await import('../src/lib/strategy/orchestrator');
  const { runBacktest } = await import('../src/lib/strategy/backtest');
  const { generateRunSummary } = await import('../src/lib/strategy/narrative');

  const t0 = Date.now();
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Aimily Strategy · E2E pipeline test`);
  console.log(`PDF: ${pdfPath}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // 1. Resolve tenant
  const { data: tenant, error: tErr } = await supabaseAdmin
    .from('strategy_tenants')
    .select('id, slug, display_name')
    .eq('slug', 'aimily-internal')
    .single();
  if (tErr || !tenant) throw new Error(`Tenant not found: ${tErr?.message}`);
  console.log(`[1] Tenant: ${tenant.display_name} (${tenant.id})`);

  // 2. Locate Felipe's user_id (owner of the dogfood tenant)
  const { data: member } = await supabaseAdmin
    .from('strategy_tenant_members')
    .select('user_id, role')
    .eq('tenant_id', tenant.id)
    .eq('role', 'owner')
    .limit(1)
    .single();
  const uploaderId = member?.user_id;
  console.log(`[2] Uploader: ${uploaderId} (${member?.role})`);

  // 3. Read PDF
  const bytes = readFileSync(pdfPath);
  console.log(`[3] PDF read: ${(bytes.length / 1024).toFixed(1)} KB`);

  // 4. Create source row (gets us an id to use as the path segment)
  const fileName = pdfPath.split('/').pop() || 'rnk.pdf';
  const { data: sourceRow, error: srcErr } = await supabaseAdmin
    .from('strategy_sources')
    .insert({
      tenant_id: tenant.id,
      season: 'V26',
      market: 'global',
      source_format: 'zara_rnk_pdf',
      source_type: 'pdf',
      observation_date: '2026-05-14',
      uploaded_by: uploaderId,
      notes: 'E2E pipeline test · real Zara RNK TOTAL WOMAN snapshot (121 SKUs).',
    })
    .select('id')
    .single();
  if (srcErr || !sourceRow) throw new Error(`Source create failed: ${srcErr?.message}`);
  console.log(`[4] strategy_sources row: ${sourceRow.id}`);

  // 5. Upload to bucket
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 200);
  const storagePath = `${tenant.id}/${sourceRow.id}/${Date.now()}-${safeName}`;
  const { error: upErr } = await supabaseAdmin.storage
    .from('strategy-uploads')
    .upload(storagePath, bytes, { contentType: 'application/pdf', upsert: false });
  if (upErr) throw new Error(`Bucket upload failed: ${upErr.message}`);
  await supabaseAdmin.from('strategy_sources').update({ storage_path: storagePath }).eq('id', sourceRow.id);
  console.log(`[5] Uploaded to bucket: ${storagePath}`);

  // 6. Parse via Claude vision
  console.log(`[6] Parsing PDF via Claude Sonnet …`);
  const t6 = Date.now();
  const parseResult = await parseZaraRnkPdf(new Uint8Array(bytes));
  console.log(
    `    → ${parseResult.records.length} rows parsed in ${(
      (Date.now() - t6) /
      1000
    ).toFixed(1)}s · parse_confidence=${parseResult.parse_confidence.toFixed(2)}`
  );
  if (parseResult.parser_warnings.length > 0) {
    console.log(`    Parser warnings: ${parseResult.parser_warnings.join(' / ')}`);
  }
  const coverageActive = Object.entries(parseResult.coverage_dimensions)
    .filter(([, v]) => v)
    .map(([k]) => k);
  console.log(`    Coverage dims active: ${coverageActive.join(', ')}`);

  // 7. Persist to fact tables
  console.log(`[7] Persisting to 4 fact tables …`);
  const persist = await persistParserResult(tenant.id, sourceRow.id, '2026-05-14', parseResult);
  console.log(
    `    raw=${persist.raw_record_count} · products=${persist.product_fact_count} · inventory=${persist.inventory_fact_count} · sales_windows=${persist.sales_window_count} · efficiency=${persist.efficiency_fact_count}`
  );

  // 8. Identity graph
  console.log(`[8] Building identity graph …`);
  const graph = await buildIdentityGraphForTenant(tenant.id);
  console.log(
    `    lineages=${graph.lineages_total} (created ${graph.lineages_created}, updated ${graph.lineages_updated})`
  );
  console.log(`    match types: ${JSON.stringify(graph.match_type_counts)}`);

  // 9. Resolve default algorithm version
  const { data: algoVer } = await supabaseAdmin
    .from('strategy_algorithm_versions')
    .select('id, version')
    .eq('is_default', true)
    .single();
  console.log(`[9] Algorithm version: ${algoVer?.version}`);

  // 10. Create analysis run
  const { data: run, error: runErr } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .insert({
      tenant_id: tenant.id,
      name: 'E2E test · Zara RNK V26 dogfood',
      created_by: uploaderId,
      source_set_ids: [sourceRow.id],
      algorithm_version_id: algoVer!.id,
      run_status: 'pending',
    })
    .select('id')
    .single();
  if (runErr || !run) throw new Error(`Run create failed: ${runErr?.message}`);
  console.log(`[10] strategy_analysis_runs row: ${run.id}`);

  // 11. Execute orchestrator
  console.log(`[11] Running orchestrator (scoring + recommendations) …`);
  const t11 = Date.now();
  const exec = await executeAnalysisRun(run.id);
  console.log(
    `     ✓ scores=${exec.sku_score_count} · families=${exec.family_score_count} · candidates=${exec.candidate_count} · scenarios=${exec.scenario_count} · ${(
      (Date.now() - t11) /
      1000
    ).toFixed(1)}s`
  );

  // 12. Backtest (will be "insufficient" because only 1 season ingested)
  console.log(`[12] Running backtest …`);
  const { data: tenantForBt } = await supabaseAdmin
    .from('strategy_tenants')
    .select('reverse_logistics_cost_per_unit')
    .eq('id', tenant.id)
    .single();
  const { data: algoForBt } = await supabaseAdmin
    .from('strategy_algorithm_versions')
    .select('thresholds')
    .eq('id', algoVer!.id)
    .single();
  const backtest = await runBacktest(
    run.id,
    tenant.id,
    algoForBt!.thresholds as any,
    Number(tenantForBt?.reverse_logistics_cost_per_unit ?? 6)
  );
  if (backtest.scorecard_summary?.skipped) {
    console.log(`     ⏭  ${backtest.scorecard_summary.skipped}`);
  } else {
    console.log(
      `     ✓ precision: heroes=${pct(backtest.precision_heroes)} dogs=${pct(backtest.precision_dogs)} carryover=${pct(
        backtest.precision_carryover
      )} return-trap-catch=${pct(backtest.return_trap_catch_rate)}`
    );
  }

  // 13. Print top recommendations
  const { data: topRecs } = await supabaseAdmin
    .from('strategy_recommendation_candidates')
    .select('scope, scope_ref, action_type, confidence_action, confidence_data_completeness, confidence_demand, confidence_margin, confidence_creative_fit, evidence, data_sufficiency_warning')
    .eq('run_id', run.id)
    .order('confidence_action', { ascending: false })
    .limit(15);
  console.log(`\n[13] Top 15 recommendations:`);
  for (const r of topRecs || []) {
    const ev = r.evidence as any;
    const stub =
      r.scope === 'sku'
        ? `${(ev.lifecycle_stage || '?').padEnd(8)} demand=${num(ev.demand_score)} margin=${num(ev.margin_score)} sell_through=${pct(ev.sell_through_bought_pct)} returns=${pct(ev.returns_pct)}`
        : `family-level`;
    console.log(
      `     [${r.scope}] ${r.action_type.padEnd(20)} ${String(r.scope_ref).slice(0, 28).padEnd(28)} conf=${pct(r.confidence_action)} ${stub}`
    );
    if (r.data_sufficiency_warning) {
      console.log(`         ⚠ ${r.data_sufficiency_warning}`);
    }
  }

  // 14. Family scoreboard
  const { data: families } = await supabaseAdmin
    .from('strategy_family_scores')
    .select('family_code, sku_count, hero_count, dog_count, family_roi, return_drag_score, saturation_score, share_of_wallet_pct')
    .eq('run_id', run.id)
    .order('share_of_wallet_pct', { ascending: false });
  console.log(`\n[14] Family scoreboard (top by share):`);
  for (const f of families || []) {
    console.log(
      `     ${(f.family_code || '?').slice(0, 36).padEnd(36)} skus=${(f.sku_count || 0).toString().padStart(3)} heroes=${(f.hero_count || 0).toString().padStart(2)} dogs=${(f.dog_count || 0).toString().padStart(2)} roi=${num(f.family_roi)} returns=${pct(f.return_drag_score)} sat=${pct(f.saturation_score)} share=${pct(f.share_of_wallet_pct)}`
    );
  }

  // 15. Scenarios
  const { data: scenarios } = await supabaseAdmin
    .from('strategy_scenarios')
    .select('name, scenario_type, predicted_sku_count, total_predicted_revenue, total_predicted_margin, total_predicted_buy_budget, constraint_satisfaction_summary, creative_application_summary')
    .eq('run_id', run.id);
  console.log(`\n[15] Scenarios:`);
  for (const s of scenarios || []) {
    console.log(
      `     ${(s.name || '?').padEnd(22)} type=${(s.scenario_type || '?').padEnd(20)} skus=${(s.predicted_sku_count || 0).toString().padStart(4)} revenue=${eur(s.total_predicted_revenue)} margin=${eur(s.total_predicted_margin)} budget=${eur(s.total_predicted_buy_budget)}`
    );
  }

  // 16. LLM narrative
  console.log(`\n[16] Generating LLM run summary …`);
  try {
    const t16 = Date.now();
    const { learnings_narrative, creative_application } = await generateRunSummary(run.id);
    console.log(`     ✓ ${((Date.now() - t16) / 1000).toFixed(1)}s`);
    console.log(`\n──── LEARNINGS ────`);
    console.log(learnings_narrative);
    if (creative_application) {
      console.log(`\n──── CREATIVE APPLICATION ────`);
      console.log(creative_application);
    }
  } catch (e: any) {
    console.log(`     ✗ Narrative generation failed: ${e?.message}`);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✓ E2E pipeline completed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  Run id: ${run.id}`);
  console.log(`  Visit: https://aimily.app/strategy/aimily-internal/runs/${run.id}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

function pct(v: any): string {
  if (v == null) return '—'.padStart(6);
  const n = Number(v);
  if (!Number.isFinite(n)) return '—'.padStart(6);
  return `${(n * 100).toFixed(1)}%`.padStart(6);
}
function num(v: any): string {
  if (v == null) return '—'.padStart(5);
  const n = Number(v);
  if (!Number.isFinite(n)) return '—'.padStart(5);
  return n.toFixed(2).padStart(5);
}
function eur(v: any): string {
  if (v == null) return '—'.padStart(10);
  const n = Number(v);
  if (!Number.isFinite(n)) return '—'.padStart(10);
  if (Math.abs(n) >= 1e6) return `€${(n / 1e6).toFixed(2)}M`.padStart(10);
  if (Math.abs(n) >= 1e3) return `€${(n / 1e3).toFixed(1)}K`.padStart(10);
  return `€${n.toFixed(0)}`.padStart(10);
}

main().catch((err) => {
  console.error(`\n✗ E2E test failed:`, err);
  process.exit(1);
});
