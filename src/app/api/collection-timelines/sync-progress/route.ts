import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Milestone ↔ Workspace Data mapping
 *
 * Each milestone ID maps to a workspace + a function that checks
 * if the relevant data exists and is non-empty.
 */

type DataCheck = (data: Record<string, unknown>) => boolean;

const hasBlock = (blockName: string): DataCheck => (data) => {
  const blockData = data.blockData as Record<string, unknown> | undefined;
  if (!blockData?.[blockName]) return false;
  const block = blockData[blockName] as Record<string, unknown>;
  return Object.values(block).some(
    (v) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
  );
};

const hasKey = (key: string): DataCheck => (data) => {
  const val = data[key];
  if (val === null || val === undefined || val === '') return false;
  if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val as object).length === 0) return false;
  if (Array.isArray(val) && val.length === 0) return false;
  return true;
};

interface MilestoneMapping {
  workspace: string;
  check: DataCheck;
}

const MILESTONE_MAP: Record<string, MilestoneMapping> = {
  // ── Creative & Brand ──
  'cr-1': { workspace: 'creative', check: hasBlock('consumer') },
  'cr-2': { workspace: 'creative', check: hasBlock('moodboard') },
  'br-1': { workspace: 'creative', check: hasBlock('brand-dna') },
  'br-2': { workspace: 'creative', check: hasBlock('brand-dna') }, // Logo & Visual Identity — part of Brand DNA
  'br-3': { workspace: 'creative', check: hasBlock('vibe') },
  'br-4': { workspace: 'creative', check: hasBlock('vibe') }, // Packaging Design — follows collection vibe

  // ── Merchandising & Planning ──
  'rp-1': { workspace: 'merchandising', check: hasBlock('families') },
  'rp-3': { workspace: 'merchandising', check: hasBlock('budget') },
  'rp-2': { workspace: 'merchandising', check: hasBlock('channels') },
  'rp-4': { workspace: 'merchandising', check: hasBlock('pricing') },

  // ── Design ──
  'dd-1': { workspace: 'design', check: hasKey('sketches') },
  'dd-2': { workspace: 'design', check: hasKey('lasts') },
  'dd-6': { workspace: 'design', check: hasKey('colorways') },
  'dd-5': { workspace: 'design', check: hasKey('patterns') },
};

// POST /api/collection-timelines/sync-progress
export async function POST(req: NextRequest) {
  try {
    const { planId } = await req.json();
    if (!planId) {
      return NextResponse.json({ error: 'planId required' }, { status: 400 });
    }

    // 1. Fetch current timeline
    const { data: timeline, error: tlError } = await supabaseAdmin
      .from('collection_timelines')
      .select('id, milestones')
      .eq('collection_plan_id', planId)
      .single();

    if (tlError || !timeline) {
      return NextResponse.json({ error: 'Timeline not found' }, { status: 404 });
    }

    // 2. Fetch all workspace data for this collection
    const { data: workspaces } = await supabaseAdmin
      .from('collection_workspace_data')
      .select('workspace, data')
      .eq('collection_plan_id', planId);

    const wsMap: Record<string, Record<string, unknown>> = {};
    for (const ws of workspaces || []) {
      wsMap[ws.workspace] = ws.data as Record<string, unknown>;
    }

    // 3. Also check for SKUs (milestone rp-5)
    const { count: skuCount } = await supabaseAdmin
      .from('collection_skus')
      .select('id', { count: 'exact', head: true })
      .eq('collection_plan_id', planId);

    // 4. Check production orders (milestones dd-15 through dd-18)
    const { count: orderCount } = await supabaseAdmin
      .from('production_orders')
      .select('id', { count: 'exact', head: true })
      .eq('collection_plan_id', planId);

    // 5. Evaluate each milestone
    const milestones = timeline.milestones as Array<{
      id: string;
      status: string;
      [key: string]: unknown;
    }>;

    let changed = false;
    const updated = milestones.map((m) => {
      // Skip already completed milestones (don't uncomplete them)
      if (m.status === 'completed') return m;

      let shouldComplete = false;

      // Check mapped milestones
      const mapping = MILESTONE_MAP[m.id];
      if (mapping && wsMap[mapping.workspace]) {
        shouldComplete = mapping.check(wsMap[mapping.workspace]);
      }

      // SKU definition
      if (m.id === 'rp-5' && (skuCount || 0) > 0) {
        shouldComplete = true;
      }

      // Production orders
      if (m.id === 'dd-15' && (orderCount || 0) > 0) {
        shouldComplete = true;
      }

      if (shouldComplete) {
        changed = true;
        return { ...m, status: 'completed' };
      }

      // Mark as in_progress if workspace has any data for this phase
      if (m.status === 'pending' && mapping && wsMap[mapping.workspace]) {
        changed = true;
        return { ...m, status: 'in_progress' };
      }

      return m;
    });

    // 6. Save if changed
    if (changed) {
      await supabaseAdmin
        .from('collection_timelines')
        .update({ milestones: updated, updated_at: new Date().toISOString() })
        .eq('id', timeline.id);
    }

    const completed = updated.filter((m) => m.status === 'completed').length;
    return NextResponse.json({ synced: changed, completed, total: updated.length });
  } catch (error) {
    console.error('Sync progress error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
