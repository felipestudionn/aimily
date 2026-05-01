/**
 * Force CDN cache invalidation on every object in `collection-assets`
 * by re-uploading each file to itself with `upsert: true`. Smart CDN
 * picks up the metadata change and propagates the eviction across
 * edge nodes in ~60 seconds.
 *
 * Why: when we flipped the bucket from public to private the existing
 * public URLs continued to serve from CDN cache — bucket-level
 * privacy doesn't trigger an automatic CDN purge. Without this touch,
 * URLs an attacker had captured before the flip would keep working
 * until natural eviction (could be hours).
 *
 * Safe to re-run: re-uploading the same bytes is idempotent.
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/purge-storage-cdn-cache.ts
 *   # add --dry-run to print paths without re-uploading
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = 'collection-assets';
const DRY_RUN = process.argv.includes('--dry-run');

interface FileEntry {
  name: string;
  metadata?: { mimetype?: string };
}

async function listAll(prefix = ''): Promise<string[]> {
  const out: string[] = [];
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) { console.error(`list(${prefix}): ${error.message}`); return out; }
  for (const entry of (data ?? []) as FileEntry[]) {
    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.metadata?.mimetype) {
      out.push(fullPath);
    } else {
      // Folder — recurse
      const sub = await listAll(fullPath);
      out.push(...sub);
    }
  }
  return out;
}

async function touch(path: string): Promise<boolean> {
  // Download → re-upload at same path with upsert=true. This bumps
  // the Smart CDN metadata and triggers global edge-cache eviction.
  const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(path);
  if (dlErr || !blob) {
    console.error(`  ❌ download(${path}): ${dlErr?.message}`);
    return false;
  }
  const buf = Buffer.from(await blob.arrayBuffer());
  const contentType = blob.type || 'application/octet-stream';
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType,
    upsert: true,
  });
  if (upErr) {
    console.error(`  ❌ upload(${path}): ${upErr.message}`);
    return false;
  }
  return true;
}

async function main() {
  console.log(`CDN purge ${DRY_RUN ? '[DRY RUN] ' : ''}starting on bucket ${BUCKET}`);
  const paths = await listAll('');
  console.log(`Found ${paths.length} files.\n`);

  if (DRY_RUN) {
    paths.slice(0, 10).forEach((p) => console.log(`  • ${p}`));
    if (paths.length > 10) console.log(`  … and ${paths.length - 10} more`);
    return;
  }

  let ok = 0;
  for (const path of paths) {
    const success = await touch(path);
    if (success) ok++;
    if ((ok + 1) % 25 === 0) console.log(`  ${ok}/${paths.length}…`);
  }
  console.log(`\nDone. Purged ${ok}/${paths.length} files. Cache propagation finishes in ~60s globally.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
