/**
 * POST /api/strategy/buy-strategy-confirm
 *
 * Persists the user's confirmed buy-strategy choice into
 * strategy_constraints. Mirrors the CIS-write pattern of Block 2's
 * /api/strategy-confirm but writes to strategy_constraints columns
 * (chosen_archetype_id, action_mix, buy_waves, target_adjacent_families)
 * — the engine reads these in orchestrator.ts during the next run.
 *
 * Optionally chains into run creation if `create_run=true` is set.
 *
 * Body:
 * {
 *   tenant_id: string,
 *   archetype_id: 'A'|'B'|'C'|'D',
 *   action_mix: { replenish_pct, new_sku_proposal_pct, family_extension_pct, kill_pct },
 *   buy_waves: [{ name, share_pct, target_lead_time_days, scheduled_at? }],
 *   target_adjacent_families: string[],
 *   family_share_targets?: Record<string, number>,
 *   target_total_skus?: number,
 *   target_buy_budget?: number,
 *   target_avg_margin?: number,
 *   positioning_tier?: 'premium'|'mid'|'value',
 *   hard_exclusions?: string[],
 *   name?: string,
 *   description?: string,
 *   constraint_id?: string,  // when patching an existing row instead of creating new
 *   create_run?: boolean,
 *   brief_id?: string
 * }
 *
 * Returns: { constraint_id, run_id? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

type ArchetypeId = 'A' | 'B' | 'C' | 'D';

interface ActionMix {
  replenish_pct: number;
  new_sku_proposal_pct: number;
  family_extension_pct: number;
  kill_pct: number;
}

interface BuyWave {
  name?: string;
  share_pct?: number;
  target_lead_time_days?: number;
  scheduled_at?: string;
}

interface ConfirmBody {
  tenant_id?: string;
  archetype_id?: string;
  action_mix?: ActionMix;
  buy_waves?: BuyWave[];
  target_adjacent_families?: string[];
  family_share_targets?: Record<string, number>;
  target_total_skus?: number | null;
  target_buy_budget?: number | null;
  target_avg_margin?: number | null;
  positioning_tier?: 'premium' | 'mid' | 'value' | null;
  hard_exclusions?: string[];
  name?: string;
  description?: string;
  constraint_id?: string;
  create_run?: boolean;
  brief_id?: string;
  source_set_ids?: string[];
}

function validateActionMix(mix: ActionMix | undefined): { ok: true } | { ok: false; error: string } {
  if (!mix) return { ok: false, error: 'action_mix is required' };
  const keys: Array<keyof ActionMix> = [
    'replenish_pct',
    'new_sku_proposal_pct',
    'family_extension_pct',
    'kill_pct',
  ];
  for (const k of keys) {
    const v = mix[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 100) {
      return { ok: false, error: `action_mix.${k} must be a number in [0, 100]` };
    }
  }
  const sum =
    mix.replenish_pct + mix.new_sku_proposal_pct + mix.family_extension_pct + mix.kill_pct;
  if (Math.abs(sum - 100) > 0.5) {
    return { ok: false, error: `action_mix sum must be 100, got ${sum}` };
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  let body: ConfirmBody | null = null;
  try {
    body = (await req.json()) as ConfirmBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tenantId = body.tenant_id;
  if (typeof tenantId !== 'string' || !tenantId) {
    return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
  }

  const archetypeIdRaw = body.archetype_id;
  if (archetypeIdRaw !== 'A' && archetypeIdRaw !== 'B' && archetypeIdRaw !== 'C' && archetypeIdRaw !== 'D') {
    return NextResponse.json({ error: 'archetype_id must be A | B | C | D' }, { status: 400 });
  }
  const archetypeId = archetypeIdRaw as ArchetypeId;

  const mixCheck = validateActionMix(body.action_mix);
  if (!mixCheck.ok) {
    return NextResponse.json({ error: mixCheck.error }, { status: 400 });
  }

  const adjacency = Array.isArray(body.target_adjacent_families)
    ? body.target_adjacent_families.filter((f) => typeof f === 'string' && f.trim().length > 0)
    : [];

  if (archetypeId === 'D' && adjacency.length === 0) {
    return NextResponse.json(
      { error: 'Category Transition (D) requires at least one target adjacent family' },
      { status: 400 }
    );
  }

  const buyWaves = Array.isArray(body.buy_waves) ? body.buy_waves : [];

  const access = await requireStrategyAccess({ tenantId, minRole: 'analyst' });
  if (!access.ok) return access.response;

  // Server-side data sufficiency gate: at least 1 completed run must exist
  // for the tenant. context-loader only hydrates winners/top families from
  // a completed run — without one, the orchestrator wouldn't have enough
  // ground truth to honour the confirmed strategy.
  const { count: completedRunCount, error: countErr } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('run_status', 'complete');
  if (countErr) {
    return NextResponse.json(
      { error: 'Failed to verify baseline run', detail: countErr.message },
      { status: 500 }
    );
  }
  if ((completedRunCount ?? 0) === 0) {
    return NextResponse.json(
      {
        error: 'No completed baseline run. Run an exploratory analysis first to populate winners + last-season actuals.',
      },
      { status: 412 }
    );
  }

  const constraintsRow = {
    tenant_id: tenantId,
    name: body.name ?? `Buy strategy ${archetypeId} · ${new Date().toISOString().slice(0, 10)}`,
    description: body.description ?? null,
    chosen_archetype_id: archetypeId,
    action_mix: body.action_mix!,
    buy_waves: buyWaves,
    target_adjacent_families: adjacency,
    target_total_skus: body.target_total_skus ?? null,
    target_buy_budget: body.target_buy_budget ?? null,
    target_avg_margin: body.target_avg_margin ?? null,
    positioning_tier: body.positioning_tier ?? null,
    family_share_targets: body.family_share_targets ?? {},
    hard_exclusions: body.hard_exclusions ?? [],
    created_by: access.userId,
  };

  let constraintId: string;

  if (body.constraint_id) {
    // Patch existing — verify it belongs to the tenant first.
    const { data: patched, error: patchErr } = await supabaseAdmin
      .from('strategy_constraints')
      .update(constraintsRow)
      .eq('id', body.constraint_id)
      .eq('tenant_id', tenantId)
      .select('id')
      .single();
    if (patchErr || !patched) {
      return NextResponse.json(
        { error: 'Failed to update constraints', detail: patchErr?.message },
        { status: 500 }
      );
    }
    constraintId = patched.id;
  } else {
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('strategy_constraints')
      .insert(constraintsRow)
      .select('id')
      .single();
    if (insertErr || !inserted) {
      // CHECK constraint violation surfaces here — bubble the DB error so
      // the UI can show "action_mix sum must be 100" / range errors.
      return NextResponse.json(
        { error: 'Failed to create constraints', detail: insertErr?.message },
        { status: 400 }
      );
    }
    constraintId = inserted.id;
  }

  let runId: string | undefined;
  if (body.create_run) {
    // Tenant must have at least one processed source. Mirrors the gate in
    // /api/strategy/runs.
    const { data: sources, error: sourceErr } = await supabaseAdmin
      .from('strategy_sources')
      .select('id')
      .eq('tenant_id', tenantId)
      .not('processed_at', 'is', null)
      .limit(20);
    if (sourceErr || !sources || sources.length === 0) {
      return NextResponse.json(
        {
          constraint_id: constraintId,
          warning: 'Strategy saved but no processed sources to run against. Upload + ingest first.',
        },
        { status: 200 }
      );
    }

    const { data: run, error: runErr } = await supabaseAdmin
      .from('strategy_analysis_runs')
      .insert({
        tenant_id: tenantId,
        constraint_id: constraintId,
        creative_brief_id: body.brief_id ?? null,
        source_set_ids: body.source_set_ids ?? sources.map((s) => s.id),
        run_status: 'pending',
        name: `Run · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · archetype ${archetypeId}`,
        created_by: access.userId,
      })
      .select('id')
      .single();
    if (runErr || !run) {
      return NextResponse.json(
        {
          constraint_id: constraintId,
          warning: 'Strategy saved but run creation failed. Create it manually.',
          detail: runErr?.message,
        },
        { status: 200 }
      );
    }
    runId = run.id;
  }

  return NextResponse.json({ constraint_id: constraintId, run_id: runId ?? null });
}
