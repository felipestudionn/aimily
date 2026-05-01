/**
 * Backfill CIS from workspace_data
 *
 * One-shot script. For every collection that has rows in
 * `collection_workspace_data` but a poor / empty CIS, walk each workspace
 * row through `mapWorkspaceToCIS()` and persist the resulting decisions
 * via `recordDecisions()`.
 *
 * Why: legacy collections (created before the CIS write-through hook
 * landed in /api/workspace-data) never sent their Creative blockData
 * to the CIS. Marketing prompts that depend on `compilePromptContext()`
 * (which has no fallback to workspace_data) render empty placeholders
 * for those collections.
 *
 * Usage:
 *   npx tsx scripts/backfill-cis-from-workspace.ts            # all collections
 *   npx tsx scripts/backfill-cis-from-workspace.ts <planId>   # one collection
 *
 * Safe to re-run: recordDecision() dedupes by (plan, domain, subdomain, key)
 * and only inserts a new version when the value changed.
 */

import { createClient } from '@supabase/supabase-js';
import { mapWorkspaceToCIS } from '../src/lib/ai/workspace-to-cis';
import { recordDecisions } from '../src/lib/collection-intelligence';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Workspace = 'creative' | 'merchandising' | 'design';

async function backfillOne(planId: string): Promise<{ planId: string; written: number; perWorkspace: Record<string, number> }> {
  const { data: rows, error } = await supabase
    .from('collection_workspace_data')
    .select('workspace, data')
    .eq('collection_plan_id', planId);

  if (error) {
    console.error(`  ❌ ${planId}: failed to load workspace_data —`, error.message);
    return { planId, written: 0, perWorkspace: {} };
  }

  let total = 0;
  const perWorkspace: Record<string, number> = {};

  for (const row of rows ?? []) {
    const workspace = row.workspace as Workspace;
    const decisions = mapWorkspaceToCIS({ collectionPlanId: planId }, workspace, row.data);
    if (decisions.length === 0) {
      perWorkspace[workspace] = 0;
      continue;
    }

    await recordDecisions(decisions);
    total += decisions.length;
    perWorkspace[workspace] = decisions.length;
  }

  return { planId, written: total, perWorkspace };
}

async function main() {
  const targetPlanId = process.argv[2];

  let planIds: string[];
  if (targetPlanId) {
    planIds = [targetPlanId];
    console.log(`Backfilling single collection: ${targetPlanId}`);
  } else {
    const { data: plans, error } = await supabase
      .from('collection_plans')
      .select('id, name');
    if (error) {
      console.error('Failed to list collection_plans:', error.message);
      process.exit(1);
    }
    planIds = (plans ?? []).map(p => p.id);
    console.log(`Backfilling ${planIds.length} collections:`);
    (plans ?? []).forEach(p => console.log(`  - ${p.name} (${p.id})`));
  }

  const results: Awaited<ReturnType<typeof backfillOne>>[] = [];
  for (const planId of planIds) {
    process.stdout.write(`  → ${planId} … `);
    const r = await backfillOne(planId);
    results.push(r);
    const summary = Object.entries(r.perWorkspace).map(([w, n]) => `${w}=${n}`).join(', ');
    console.log(`${r.written} decisions (${summary || 'none'})`);
  }

  const grandTotal = results.reduce((s, r) => s + r.written, 0);
  console.log(`\n✓ Done. ${grandTotal} decisions written across ${planIds.length} collections.`);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
