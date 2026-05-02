import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const BUCKET = 'collection-assets';
const TRASH_PREFIX = '__trash';
const MAX_AGE_DAYS = 30;

/**
 * Monthly cron — purges Storage objects under `__trash/` older than 30 days.
 *
 * Why this exists: Supabase Pro daily backups don't cover Storage objects.
 * `DELETE /api/collections/[id]` moves files into `__trash/{id}/{ts}/...`
 * instead of removing them so a customer who deletes a collection by
 * mistake has a real recovery window. This cron is the eventual sweeper.
 *
 * Path convention from collection delete:
 *   __trash/{collection_id}/{ISO_timestamp_with_dashes}/{asset_type}/{filename}
 *
 * Verifies CRON_SECRET to block public invocation. Idempotent.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 86_400_000);

  let deleted = 0;
  let kept = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    // Layer 1: list collection-id folders inside __trash/
    const { data: collectionFolders, error: rootErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(TRASH_PREFIX);
    if (rootErr) throw rootErr;
    if (!collectionFolders) {
      return NextResponse.json({ ok: true, deleted: 0, kept: 0, failed: 0, message: 'No __trash/ folder yet' });
    }

    for (const collectionFolder of collectionFolders) {
      // Folders have id === null in Supabase Storage list().
      if (collectionFolder.id) continue;
      const collectionId = collectionFolder.name;

      // Layer 2: each delete event creates a timestamp slug under the collection folder.
      const { data: timestampFolders } = await supabaseAdmin.storage
        .from(BUCKET)
        .list(`${TRASH_PREFIX}/${collectionId}`);
      if (!timestampFolders?.length) continue;

      for (const tsFolder of timestampFolders) {
        if (tsFolder.id) continue;
        const tsSlug = tsFolder.name;
        // tsSlug is the ISO timestamp with `:` and `.` replaced by `-`.
        // Recover a parseable date by re-inserting the colons; if parsing
        // fails we treat the folder as old enough to evaluate again next run.
        const isoCandidate = recoverIsoFromSlug(tsSlug);
        const deletedAt = isoCandidate ? new Date(isoCandidate) : null;
        if (!deletedAt || isNaN(deletedAt.getTime())) {
          // Unparseable — leave it for a human to inspect rather than purge.
          kept += 1;
          continue;
        }
        if (deletedAt > cutoff) {
          kept += 1;
          continue;
        }

        // Old enough — list every file under this trash bucket and remove.
        const filesToRemove = await listAllFilesUnderPrefix(`${TRASH_PREFIX}/${collectionId}/${tsSlug}`);
        for (let i = 0; i < filesToRemove.length; i += 100) {
          const batch = filesToRemove.slice(i, i + 100);
          const { error } = await supabaseAdmin.storage.from(BUCKET).remove(batch);
          if (error) {
            failed += batch.length;
            errors.push(`${collectionId}/${tsSlug}: ${error.message}`);
          } else {
            deleted += batch.length;
          }
        }
      }
    }

    return NextResponse.json({ ok: true, deleted, kept, failed, errors: errors.slice(0, 10) });
  } catch (e) {
    console.error('[cleanup-storage-trash] failed', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e), deleted, kept, failed },
      { status: 500 },
    );
  }
}

/** Walk a Storage prefix recursively (depth ≤ 3 in our path scheme). */
async function listAllFilesUnderPrefix(prefix: string): Promise<string[]> {
  const all: string[] = [];
  const stack: string[] = [prefix];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).list(current);
    if (error || !data) continue;
    for (const entry of data) {
      const path = `${current}/${entry.name}`;
      if (entry.id) {
        all.push(path);
      } else {
        stack.push(path);
      }
    }
  }
  return all;
}

/**
 * collection delete writes timestamps as `2026-05-02T07-15-23-512Z` (the `.` and
 * `:` were replaced with `-`). Recover the ISO form so `Date` can parse it.
 *
 * Pattern: YYYY-MM-DDTHH-MM-SS-mmmZ → YYYY-MM-DDTHH:MM:SS.mmmZ
 */
function recoverIsoFromSlug(slug: string): string | null {
  const m = slug.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/);
  if (!m) return null;
  const [, date, hh, mm, ss, ms] = m;
  return `${date}T${hh}:${mm}:${ss}.${ms}Z`;
}
