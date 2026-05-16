/**
 * POST /api/strategy/runs/[runId]/recommend-palette
 *
 * Generates a 5-7 color palette for a specific family, grounded in:
 *   - Current winning colors in the family
 *   - Active creative brief color story (if any)
 *   - Perplexity color trend signals
 *   - Tenant brand DNA
 *
 * Persists to strategy_recommended_palettes.
 *
 * Body: { familyCode: string (required), language?: 'en' | 'es' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { recommendPalette } from '@/lib/strategy/proposers';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface RouteParams {
  params: Promise<{ runId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { runId } = await params;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof body.familyCode !== 'string' || !body.familyCode) {
    return NextResponse.json({ error: 'familyCode is required' }, { status: 400 });
  }

  const { data: run } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select('tenant_id, run_status')
    .eq('id', runId)
    .single();
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

  const access = await requireStrategyAccess({ tenantId: run.tenant_id, minRole: 'analyst' });
  if (!access.ok) return access.response;

  if (run.run_status !== 'complete') {
    return NextResponse.json(
      { error: 'Run must be complete before recommending palette', status: run.run_status },
      { status: 409 }
    );
  }

  let result;
  try {
    result = await recommendPalette({
      runId,
      familyCode: body.familyCode,
      language: body.language === 'es' || body.language === 'en' ? body.language : undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'recommendPalette failed', detail: err?.message || String(err) },
      { status: 500 }
    );
  }

  const { data: palette, error: insertError } = await supabaseAdmin
    .from('strategy_recommended_palettes')
    .insert({
      tenant_id: run.tenant_id,
      run_id: runId,
      family_code: body.familyCode,
      palette: {
        colors: result.palette,
        brief_alignment: result.brief_alignment,
        trend_signals_used: result.trend_signals_used,
        generated_at: new Date().toISOString(),
        algorithm: 'recommend-palette-v1',
      },
      created_by: access.userId,
    })
    .select('id')
    .single();

  if (insertError || !palette) {
    return NextResponse.json(
      { error: 'palette persist failed', detail: insertError?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    palette_id: palette.id,
    family_code: body.familyCode,
    colors: result.palette,
    brief_alignment: result.brief_alignment,
    trend_signals_used: result.trend_signals_used,
    warnings: result.warnings,
  });
}
