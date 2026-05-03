/**
 * Daily cron — hard-delete soft-deleted collections older than 30 days.
 *
 * Trigger: scheduled via Vercel Cron at the same window as the other
 * daily aimily crons (see vercel.json). Idempotent: if a collection is
 * already gone (a previous run swept it), the helper just throws and we
 * skip to the next one.
 *
 * Verifies CRON_SECRET to block public invocation.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { hardDeleteCollection } from '@/lib/collection-hard-delete';

const RETENTION_MS = 30 * 86_400_000;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();

  const { data: rows, error } = await supabaseAdmin
    .from('collection_plans')
    .select('id, user_id, name, deleted_at')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff);

  if (error) {
    console.error('[cron/cleanup-deleted-collections] query failed:', error);
    return NextResponse.json({ error: 'query failed' }, { status: 500 });
  }

  const swept: Array<{ id: string; storageFilesMoved: number }> = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const row of rows || []) {
    try {
      const { storageFilesMovedToTrash } = await hardDeleteCollection(row.id);
      swept.push({ id: row.id, storageFilesMoved: storageFilesMovedToTrash });
    } catch (err) {
      failed.push({
        id: row.id,
        error: err instanceof Error ? err.message : String(err),
      });
      console.error('[cron/cleanup-deleted-collections] failed for', row.id, err);
    }
  }

  return NextResponse.json({
    ok: true,
    cutoff,
    candidates: rows?.length || 0,
    sweptCount: swept.length,
    failedCount: failed.length,
    swept,
    failed,
  });
}
