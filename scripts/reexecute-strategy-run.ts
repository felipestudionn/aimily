/**
 * One-off: re-execute a Strategy analysis run after fixing source data.
 *
 * Context: the 2026-05-17 audit found that the dogfood run `0c2ed3e9` was
 * ingested 4 min before the `normalizeMarkupPct` parser fix shipped, so
 * `margin_pct_list` was corrupt across all 48 SKUs. SQL UPDATE has now
 * corrected product_facts in place. This script regenerates the derived
 * `strategy_sku_scores` + `strategy_recommendation_candidates` +
 * `strategy_scenarios` by re-running the orchestrator against the fixed
 * facts.
 *
 * The orchestrator's atomic claim only transitions runs from
 * 'pending' | 'failed'. The dogfood run is in 'complete'. We reset it to
 * 'pending' first so the claim succeeds. The orchestrator then
 * idempotently wipes any prior derived rows and rebuilds them.
 *
 * Usage: npx tsx scripts/reexecute-strategy-run.ts <run_id>
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { executeAnalysisRun } from '@/lib/strategy/orchestrator';

async function main() {
  const runId = process.argv[2] || '0c2ed3e9-cef4-4107-abea-c01535d885e3';
  console.log(`Re-executing analysis run: ${runId}`);

  // 1) Reset status to 'pending' so the orchestrator's atomic claim succeeds.
  //    The orchestrator itself wipes derived rows on every run.
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
  console.log('Run status reset to pending');

  // 2) Run the orchestrator end-to-end (scoring → recommending → scenarios).
  const t0 = Date.now();
  let result;
  try {
    result = await executeAnalysisRun(runId);
  } catch (e) {
    console.error('Orchestrator threw:', e instanceof Error ? e.message : e);
    process.exit(2);
  }
  const elapsed = Date.now() - t0;

  console.log('--- Re-execution complete ---');
  console.log(`  Duration: ${elapsed}ms`);
  console.log(`  SKU scores produced: ${result.sku_score_count}`);
  console.log(`  Family scores: ${result.family_score_count}`);
  console.log(`  Candidates: ${result.candidate_count}`);
  console.log(`  Scenarios: ${result.scenario_count}`);
  if (result.warnings.length > 0) {
    console.log('  Warnings:');
    for (const w of result.warnings) console.log(`    - ${w}`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error('Top-level error:', e);
  process.exit(99);
});
