/**
 * POST /api/strategy/buy-strategy-deepen
 *
 * Refines ONE axis of the buy-strategy editor when the user clicks
 * "+ Más" on an axis card. Returns just the patch for that axis.
 *
 * Body:    { tenant_id, archetype_id, axis, current_editor, language? }
 * Returns: { patch: Partial<BuyStrategyPrefillEditor>, model, fallback }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { generateJSON } from '@/lib/ai/llm-client';
import { loadStrategyTenantContext } from '@/lib/strategy/context-loader';
import { getBuyStrategyArchetype, type BuyStrategyArchetypeId } from '@/lib/strategy/sales-archetypes';
import { buildBuyStrategyDeepenPrompt, type BuyStrategyAxis, type BuyStrategyPrefillEditor } from '@/lib/strategy/buy-strategy-prompts';

const VALID_AXES: BuyStrategyAxis[] = [
  'action_mix',
  'budget',
  'lead_time_calendar',
  'family_pivot',
  'actuals_delta',
];

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: {
    tenant_id?: string;
    archetype_id?: string;
    axis?: string;
    current_editor?: BuyStrategyPrefillEditor;
    language?: 'en' | 'es';
  } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tenantId = body?.tenant_id;
  const archetypeIdRaw = body?.archetype_id;
  const axisRaw = body?.axis;

  if (typeof tenantId !== 'string' || !tenantId) {
    return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
  }
  if (archetypeIdRaw !== 'A' && archetypeIdRaw !== 'B' && archetypeIdRaw !== 'C' && archetypeIdRaw !== 'D') {
    return NextResponse.json({ error: 'archetype_id must be A | B | C | D' }, { status: 400 });
  }
  if (typeof axisRaw !== 'string' || !VALID_AXES.includes(axisRaw as BuyStrategyAxis)) {
    return NextResponse.json(
      { error: `axis must be one of ${VALID_AXES.join(', ')}` },
      { status: 400 }
    );
  }
  if (!body?.current_editor) {
    return NextResponse.json({ error: 'current_editor is required' }, { status: 400 });
  }

  const access = await requireStrategyAccess({ tenantId, minRole: 'analyst' });
  if (!access.ok) return access.response;

  const archetype = getBuyStrategyArchetype(archetypeIdRaw as BuyStrategyArchetypeId);
  if (!archetype) {
    return NextResponse.json({ error: 'Unknown archetype' }, { status: 400 });
  }

  const tenantContext = await loadStrategyTenantContext(tenantId);
  if (!tenantContext) {
    return NextResponse.json({ error: 'Tenant context not loadable' }, { status: 500 });
  }

  const prompt = buildBuyStrategyDeepenPrompt({
    archetype,
    axis: axisRaw as BuyStrategyAxis,
    currentEditor: body.current_editor,
    tenantContext,
    language: body?.language ?? 'es',
  });

  try {
    const { data, model, fallback } = await generateJSON<Partial<BuyStrategyPrefillEditor>>({
      system: prompt.system,
      user: prompt.user,
      temperature: 0.5,
      maxTokens: 2000,
    });

    return NextResponse.json({ patch: data, axis: axisRaw, model, fallback });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Deepen generation failed', detail: msg },
      { status: 500 }
    );
  }
}
