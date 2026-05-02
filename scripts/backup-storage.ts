/**
 * Manual cold backup of the `collection-assets` bucket.
 *
 * Why this exists: Supabase Pro daily backups cover the database (rows,
 * schema, sequences) but NOT Storage objects. If a customer's images are
 * lost — accidental delete, bucket misconfig, region outage — the DB
 * backup gets us back the metadata, never the bytes. This script is the
 * runnable answer until we wire a true cross-cloud backup (B2/S3/Vercel
 * Blob) into a cron.
 *
 * What it does:
 *   1. Lists every object in `collection-assets` (recursive, batched).
 *   2. Downloads each one, preserving the path layout.
 *   3. Writes them under `./.storage-backup/{ISO_TIMESTAMP}/...`.
 *   4. Writes a `manifest.json` mapping path → size + checksum.
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/backup-storage.ts
 *   # add --dry-run to print the plan without downloading
 *   # add --output=/path/to/dir to override the default location
 *
 * Output is gitignored (.storage-backup/). Move the resulting folder
 * to wherever you actually keep cold backups (external drive, B2, etc.)
 * — this script does not push to any remote on its own.
 *
 * Cross-cloud automation TODO (NOT done in this script):
 *   - Add B2/S3 bucket + credentials in Vercel env (KEEP_BACKUP_B2_KEY etc).
 *   - Wrap the download loop in an `s3.putObject` per file.
 *   - Schedule via vercel.json cron (weekly).
 *
 * Without those credentials this script is run-on-demand from the
 * founder's laptop or any VM with network access to Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = 'collection-assets';
const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const outputArg = process.argv.find((a) => a.startsWith('--output='));
const ISO = new Date().toISOString().replace(/[:.]/g, '-');
const OUTPUT_ROOT = outputArg ? outputArg.slice('--output='.length) : `./.storage-backup/${ISO}`;

interface ManifestEntry {
  path: string;
  size: number;
  sha256: string;
}

async function listAllPaths(prefix = ''): Promise<string[]> {
  const all: string[] = [];
  const stack: string[] = [prefix];
  while (stack.length) {
    const current = stack.pop()!;
    const { data, error } = await supabase.storage.from(BUCKET).list(current, { limit: 1000 });
    if (error) {
      console.error(`list(${current}) failed: ${error.message}`);
      continue;
    }
    if (!data) continue;
    for (const entry of data) {
      const next = current ? `${current}/${entry.name}` : entry.name;
      if (entry.id) {
        all.push(next);
      } else {
        stack.push(next);
      }
    }
  }
  return all;
}

async function downloadAndWrite(path: string): Promise<ManifestEntry | null> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) {
    console.error(`download(${path}) failed: ${error?.message ?? 'no data'}`);
    return null;
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  const sha = createHash('sha256').update(buffer).digest('hex');
  const target = join(OUTPUT_ROOT, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, buffer);
  return { path, size: buffer.length, sha256: sha };
}

async function main() {
  console.log(`[backup-storage] listing bucket ${BUCKET}…`);
  const paths = await listAllPaths();
  // Skip the trash prefix — it's already a soft-deleted bucket and doubling
  // it up just doubles backup size for nothing.
  const real = paths.filter((p) => !p.startsWith('__trash/'));
  const trash = paths.length - real.length;
  console.log(`[backup-storage] found ${paths.length} objects (${real.length} live, ${trash} in __trash/)`);

  if (DRY_RUN) {
    console.log('[backup-storage] --dry-run set, not downloading');
    return;
  }

  await mkdir(OUTPUT_ROOT, { recursive: true });

  const manifest: ManifestEntry[] = [];
  let i = 0;
  for (const path of real) {
    i += 1;
    const entry = await downloadAndWrite(path);
    if (entry) manifest.push(entry);
    if (i % 25 === 0) console.log(`  ${i}/${real.length}`);
  }

  await writeFile(
    join(OUTPUT_ROOT, 'manifest.json'),
    JSON.stringify({ bucket: BUCKET, takenAt: ISO, count: manifest.length, entries: manifest }, null, 2),
  );

  const totalBytes = manifest.reduce((acc, e) => acc + e.size, 0);
  console.log(`[backup-storage] done — ${manifest.length} files, ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`[backup-storage] output: ${OUTPUT_ROOT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
