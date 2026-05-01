/* Quick smoke test for the brand-name detector against the live
   SLAIZ workspace_data — confirms hits are found and the snippet
   formatting reads cleanly. */

import { createClient } from '@supabase/supabase-js';
import { detectBrandNames } from '../src/lib/brand-name-detector';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const { data: rows } = await supabase
    .from('collection_workspace_data')
    .select('workspace, data')
    .eq('collection_plan_id', '60652ef7-1b06-4be4-9a61-31357be0be65');
  for (const row of rows ?? []) {
    const hits = detectBrandNames(row.data);
    if (hits.length === 0) continue;
    console.log(`\n=== workspace=${row.workspace} (${hits.length} brands) ===`);
    for (const h of hits) {
      console.log(`  • ${h.brand}: ${h.contextSnippet}`);
    }
  }
}

main();
