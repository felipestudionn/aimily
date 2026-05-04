/**
 * Migrate legacy `collection_skus.proto_iterations` rows into the
 * structured `sample_reviews` table.
 *
 * Mapping per ProtoIteration:
 *   review_type      = 'white_proto' (proto iterations always pre-color)
 *   status           = ProtoIteration.status (pending/issues/approved/rejected)
 *                       — 'issues' is renamed to 'issues_found' to match the
 *                       sample_reviews CHECK constraint.
 *   photos           = ProtoIteration.images
 *   construction_notes = ProtoIteration.notes
 *   reviewed_at      = ProtoIteration.created_at
 *
 * Idempotent: every created sample_review carries `_migrated_from`
 * stamped in its rectification_notes so re-runs detect-and-skip.
 *
 *   npx tsx scripts/migrate-proto-iterations-to-sample-reviews.ts [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing env');
  process.exit(1);
}
const supabase = createClient(url, key);

const dryRun = process.argv.includes('--dry-run');

interface ProtoIteration {
  id: string;
  images?: string[];
  notes?: string;
  status?: 'pending' | 'issues' | 'approved' | 'rejected';
  created_at?: string;
}

const STATUS_MAP: Record<string, 'pending' | 'issues_found' | 'approved' | 'rejected'> = {
  pending: 'pending',
  issues: 'issues_found',
  issues_found: 'issues_found',
  approved: 'approved',
  rejected: 'rejected',
};

async function main() {
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Scanning collection_skus for legacy proto_iterations…`);

  const { data: skus, error } = await supabase
    .from('collection_skus')
    .select('id, collection_plan_id, proto_iterations')
    .not('proto_iterations', 'is', null);
  if (error) {
    console.error(error);
    process.exit(1);
  }

  let scanned = 0;
  let createdReviews = 0;
  let skippedAlreadyMigrated = 0;
  let skippedEmpty = 0;

  for (const sku of skus ?? []) {
    const iters = (sku.proto_iterations as ProtoIteration[] | null) ?? [];
    if (iters.length === 0) {
      skippedEmpty += 1;
      continue;
    }
    scanned += 1;

    // Check if we've already migrated this SKU.
    const { data: existing } = await supabase
      .from('sample_reviews')
      .select('id, rectification_notes')
      .eq('sku_id', sku.id)
      .like('rectification_notes', '%_migrated_from:proto_iterations%');
    const migratedIds = new Set(
      (existing ?? [])
        .map((r) => {
          const m = /_migrated_from:proto_iterations:(\S+)/.exec(r.rectification_notes ?? '');
          return m?.[1];
        })
        .filter((x): x is string => !!x),
    );

    for (const it of iters) {
      if (!it.id) continue;
      if (migratedIds.has(it.id)) {
        skippedAlreadyMigrated += 1;
        continue;
      }
      const status = STATUS_MAP[it.status ?? 'pending'] ?? 'pending';
      const photos = Array.isArray(it.images) ? it.images : [];
      const notes = it.notes ?? null;

      if (dryRun) {
        console.log(`  would create: sku=${sku.id} iter=${it.id} status=${status} photos=${photos.length}`);
        createdReviews += 1;
        continue;
      }

      const { error: insErr } = await supabase.from('sample_reviews').insert({
        collection_plan_id: sku.collection_plan_id,
        sku_id: sku.id,
        review_type: 'white_proto',
        status,
        photos,
        construction_notes: notes,
        rectification_notes: `_migrated_from:proto_iterations:${it.id}`,
        reviewed_at: it.created_at ?? null,
      });
      if (insErr) {
        console.error(`  failed to migrate ${sku.id}/${it.id}:`, insErr);
      } else {
        createdReviews += 1;
      }
    }
  }

  console.log(`Done.`);
  console.log(`  SKUs scanned with iterations:  ${scanned}`);
  console.log(`  SKUs without iterations:       ${skippedEmpty}`);
  console.log(`  reviews created:               ${createdReviews}${dryRun ? ' (would have)' : ''}`);
  console.log(`  iterations already migrated:   ${skippedAlreadyMigrated}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
