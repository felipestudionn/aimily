/**
 * POST /api/in-season/buy-strategy-prefill-editor
 *
 * Pre-fills the 5-axis editor state when the user picks an archetype in
 * the Setup workspace. Claude grounds the proposal in the tenant's actual
 * top families + winners + last-season actuals.
 *
 * Body:    { tenant_id, archetype_id, language? }
 * Returns: { editor: BuyStrategyPrefillEditor, model, fallback }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/in-season/auth-guard';
import { generateJSON } from '@/lib/ai/llm-client';
import { loadStrategyTenantContext } from '@/lib/in-season/context-loader';
import { getBuyStrategyArchetype, type BuyStrategyArchetypeId } from '@/lib/in-season/sales-archetypes';
import { buildBuyStrategyPrefillPrompt, type BuyStrategyPrefillEditor } from '@/lib/in-season/buy-strategy-prompts';

export const runtime = 'nodejs';
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  let body: { tenant_id?: string; archetype_id?: string; language?: 'en' | 'es' } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tenantId = body?.tenant_id;
  const archetypeIdRaw = body?.archetype_id;
  if (typeof tenantId !== 'string' || !tenantId) {
    return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
  }
  if (archetypeIdRaw !== 'A' && archetypeIdRaw !== 'B' && archetypeIdRaw !== 'C' && archetypeIdRaw !== 'D') {
    return NextResponse.json({ error: 'archetype_id must be A | B | C | D' }, { status: 400 });
  }
  const archetypeId = archetypeIdRaw as BuyStrategyArchetypeId;

  const access = await requireStrategyAccess({ tenantId, minRole: 'analyst' });
  if (!access.ok) return access.response;

  const archetype = getBuyStrategyArchetype(archetypeId);
  if (!archetype) {
    return NextResponse.json({ error: `Unknown archetype ${archetypeId}` }, { status: 400 });
  }

  const tenantContext = await loadStrategyTenantContext(tenantId);
  if (!tenantContext) {
    return NextResponse.json({ error: 'Tenant context not loadable' }, { status: 500 });
  }

  const prompt = buildBuyStrategyPrefillPrompt({
    archetype,
    tenantContext,
    language: body?.language ?? 'es',
  });

  try {
    const { data, model, fallback } = await generateJSON<BuyStrategyPrefillEditor>({
      system: prompt.system,
      user: prompt.user,
      temperature: 0.5,
      maxTokens: 3000,
    });

    // Defensive: clamp action_mix to sum=100 if model strays.
    const mix = data.action_mix ?? {
      replenish_pct: 0,
      new_sku_proposal_pct: 0,
      family_extension_pct: 0,
      kill_pct: 0,
    };
    const sum =
      (mix.replenish_pct ?? 0) +
      (mix.new_sku_proposal_pct ?? 0) +
      (mix.family_extension_pct ?? 0) +
      (mix.kill_pct ?? 0);
    if (Math.abs(sum - 100) > 0.5) {
      // Snap to archetype defaults if LLM produced an invalid sum.
      data.action_mix = { ...archetype.default_action_mix };
    }

    // Defensive: enforce empty target_adjacent_families when not archetype D.
    if (archetypeId !== 'D') {
      data.target_adjacent_families = [];
    }

    return NextResponse.json({ editor: data, model, fallback });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Prefill generation failed', detail: msg },
      { status: 500 }
    );
  }
}
