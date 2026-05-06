/**
 * POST /api/collection-timelines/sync-progress
 *
 * Re-evaluates every milestone in a collection's timeline against the
 * live production state and promotes their `status` accordingly.
 *
 * Thin wrapper over the typed milestone-sync-map (src/lib/milestone-sync-map.ts).
 * Add new milestones by extending DEFAULT_MILESTONES and SYNC_MAP — the
 * coverage test in `tests/milestone-coverage.ts` will fail the build
 * if either side is missing an entry.
 *
 * Already-`completed` milestones are never demoted.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { SYNC_MAP, loadSyncSnapshot, type SyncStatus } from '@/lib/milestone-sync-map';

interface MilestoneRow {
  id: string;
  status: SyncStatus;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { planId } = await req.json();
    if (!planId) {
      return NextResponse.json({ error: 'planId required' }, { status: 400 });
    }

    const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, planId);
    if (!authorized) return ownerError;

    const { data: timeline, error: tlError } = await supabaseAdmin
      .from('collection_timelines')
      .select('id, milestones')
      .eq('collection_plan_id', planId)
      .single();

    if (tlError || !timeline) {
      return NextResponse.json({ error: 'Timeline not found' }, { status: 404 });
    }

    const snapshot = await loadSyncSnapshot(supabaseAdmin, planId);

    const milestones = (timeline.milestones as MilestoneRow[]) || [];
    let changed = false;
    const updated = milestones.map((m): MilestoneRow => {
      // Never demote: completed stays completed even if data changes.
      if (m.status === 'completed') return m;

      const entry = SYNC_MAP[m.id];
      if (!entry) {
        // Unknown milestone id (legacy carry-over from older templates) —
        // leave its status alone. The coverage test catches drift on the
        // current default template.
        return m;
      }

      const next = entry.decide(snapshot);
      if (next !== m.status) {
        changed = true;
        return { ...m, status: next };
      }
      return m;
    });

    if (changed) {
      await supabaseAdmin
        .from('collection_timelines')
        .update({ milestones: updated, updated_at: new Date().toISOString() })
        .eq('id', timeline.id);
    }

    const completed = updated.filter(m => m.status === 'completed').length;
    return NextResponse.json({
      synced: changed,
      completed,
      total: updated.length,
    });
  } catch (error) {
    console.error('Sync progress error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
