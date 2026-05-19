/**
 * POST /api/in-season/runs/[runId]/sku-selections
 *   body: { product_fact_id: string, chosen_scenario: ScenarioId }
 *   → Crea o sustituye el lock activo del SKU.
 *
 * DELETE /api/in-season/runs/[runId]/sku-selections?product_fact_id=...
 *   → Libera el lock (soft-delete via unlocked_at).
 *
 * Spec: memory/decision-tree_aimily-in-season-2026-05-18.md §8.3
 *
 * Auto-save flow (Google Docs style): cada acción del usuario en la UI
 * (lock / unlock) llama uno de estos endpoints inmediatamente. No hay
 * botón "guardar".
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { ScenarioId } from '@/lib/strategy/scenario-diales';

export const runtime = 'nodejs';

const VALID_SCENARIOS: readonly ScenarioId[] = [
  'conservar_margen',
  'balanceada',
  'maximizar_venta',
  'tu_mezcla',
];

interface RouteContext {
  params: Promise<{ runId: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { runId } = await ctx.params;
  let body: { product_fact_id?: unknown; chosen_scenario?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const productFactId = typeof body.product_fact_id === 'string' ? body.product_fact_id : '';
  const chosenScenario = typeof body.chosen_scenario === 'string' ? body.chosen_scenario : '';
  if (!productFactId) {
    return NextResponse.json({ error: 'missing_product_fact_id' }, { status: 400 });
  }
  if (!(VALID_SCENARIOS as readonly string[]).includes(chosenScenario)) {
    return NextResponse.json(
      { error: 'invalid_scenario', valid: VALID_SCENARIOS },
      { status: 400 }
    );
  }

  // Cargar run para validar tenant + obtener tenant_id
  const { data: run, error: runErr } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select('id, tenant_id')
    .eq('id', runId)
    .maybeSingle();
  if (runErr || !run) {
    return NextResponse.json({ error: 'run_not_found' }, { status: 404 });
  }

  const access = await requireStrategyAccess({
    tenantId: run.tenant_id,
    minRole: 'analyst',
  });
  if (!access.ok) return access.response;
  const userId = access.userId;

  // Validar que el product_fact pertenece al mismo tenant
  const { data: pf, error: pfErr } = await supabaseAdmin
    .from('strategy_product_facts')
    .select('id, tenant_id')
    .eq('id', productFactId)
    .maybeSingle();
  if (pfErr || !pf) {
    return NextResponse.json({ error: 'product_fact_not_found' }, { status: 404 });
  }
  if (pf.tenant_id !== run.tenant_id) {
    return NextResponse.json({ error: 'tenant_mismatch' }, { status: 403 });
  }

  // Soft-cerrar el lock activo previo (si lo hay), luego insertar el nuevo.
  // Esto preserva historial de cambios en la propia tabla.
  await supabaseAdmin
    .from('strategy_user_sku_selections')
    .update({ unlocked_at: new Date().toISOString() })
    .eq('run_id', runId)
    .eq('product_fact_id', productFactId)
    .is('unlocked_at', null);

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from('strategy_user_sku_selections')
    .insert({
      tenant_id: run.tenant_id,
      run_id: runId,
      product_fact_id: productFactId,
      chosen_scenario: chosenScenario,
      locked_by: userId,
    })
    .select('id, chosen_scenario, locked_at')
    .single();

  if (insErr || !inserted) {
    return NextResponse.json(
      { error: 'persist_failed', detail: insErr?.message ?? 'unknown' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    lock: {
      product_fact_id: productFactId,
      chosen_scenario: inserted.chosen_scenario,
      locked_at: inserted.locked_at,
    },
  });
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { runId } = await ctx.params;
  const url = new URL(req.url);
  const productFactId = url.searchParams.get('product_fact_id') ?? '';
  if (!productFactId) {
    return NextResponse.json({ error: 'missing_product_fact_id' }, { status: 400 });
  }

  const { data: run, error: runErr } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select('id, tenant_id')
    .eq('id', runId)
    .maybeSingle();
  if (runErr || !run) {
    return NextResponse.json({ error: 'run_not_found' }, { status: 404 });
  }

  const access = await requireStrategyAccess({
    tenantId: run.tenant_id,
    minRole: 'analyst',
  });
  if (!access.ok) return access.response;

  // Soft-delete del lock activo
  const { error: updErr } = await supabaseAdmin
    .from('strategy_user_sku_selections')
    .update({ unlocked_at: new Date().toISOString() })
    .eq('run_id', runId)
    .eq('product_fact_id', productFactId)
    .is('unlocked_at', null);

  if (updErr) {
    return NextResponse.json(
      { error: 'unlock_failed', detail: updErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
