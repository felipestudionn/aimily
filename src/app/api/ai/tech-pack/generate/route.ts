/* ═══════════════════════════════════════════════════════════════════
   POST /api/ai/tech-pack/generate
   Body: { skuId, scope: 'measurements' | 'bom' | 'both' }

   Composes a prompt from SKU data + collection CIS (category, brand
   DNA, vibe, consumer) and asks Claude Haiku for a realistic size
   grading table and/or Bill of Materials. Output is strictly shaped
   so the Tech Pack sheet can merge it directly into tech_pack_data.
   ═══════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAuthOnly, usageDeniedResponse } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateJSON } from '@/lib/ai/llm-client';
import { loadFullContext } from '@/lib/ai/load-full-context';

export const runtime = 'nodejs';

type Scope = 'measurements' | 'bom' | 'both';

async function ensureOwnership(userId: string, skuId: string) {
  const { data: sku } = await supabaseAdmin
    .from('collection_skus')
    .select('*, collection_plans!inner(user_id, name, season)')
    .eq('id', skuId)
    .maybeSingle();
  if (!sku) return null;
  const plan = sku.collection_plans as { user_id: string; name: string; season: string };
  if (plan.user_id !== userId) return null;
  return { sku, plan };
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAuthOnly(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  let body: { skuId?: string; scope?: Scope; language?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const skuId = body.skuId;
  const scope: Scope = body.scope || 'both';
  if (!skuId) return NextResponse.json({ error: 'Missing skuId' }, { status: 400 });

  const check = await ensureOwnership(user.id, skuId);
  if (!check) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { sku, plan } = check;

  const ctx = await loadFullContext(sku.collection_plan_id);

  const categoryLabel = sku.category === 'CALZADO' ? 'Footwear'
    : sku.category === 'ROPA' ? 'Apparel' : 'Accessories';

  const wantMeasurements = scope === 'measurements' || scope === 'both';
  const wantBom = scope === 'bom' || scope === 'both';

  const system = `You are a senior footwear / apparel technical designer preparing a factory-ready tech pack. You produce precise, realistic measurements and bill of materials grounded in the product category, family, brand positioning and price point. You never invent absurd numbers; when unsure, pick conservative industry-standard values that match the category.`;

  const user_prompt = `
Context — the collection and SKU:
- Brand: ${plan.name}
- Season: ${plan.season}
- Category: ${categoryLabel}
- Family: ${sku.family}
- Product name: ${sku.name}
- Segment: ${sku.type === 'IMAGEN' ? 'Image' : sku.type === 'REVENUE' ? 'Revenue driver' : 'Entry'}
- Target PVP: €${sku.pvp}
- Target COGS: €${sku.cost}
- Drop: ${sku.drop_number}
- Brand DNA: ${ctx.brandDNA || 'not specified'}
- Vibe: ${ctx.vibe || 'not specified'}
- Consumer: ${ctx.consumer || 'not specified'}
- Notes: ${sku.notes || 'none'}

Generate a tech pack shaped strictly as follows:

${wantMeasurements ? `1) MEASUREMENTS table:
   - Provide 5-8 measurement points appropriate for this product category.
   - Realistic values for a grading range across XS, S, M, L, XL.
     For footwear, grade by shoe size equivalents; for apparel, by body girth/length.
   - Include a short note (1-2 sentences) about tolerances or reference posture.
   Shape:
   {
     "measurements": {
       "rows": [
         { "point": "Length", "xs": "24.5 cm", "s": "25.5 cm", "m": "26.5 cm", "l": "27.5 cm", "xl": "28.5 cm" },
         ... 4-7 more rows
       ],
       "notes": "One or two sentences with tolerance / reference posture."
     }
   }
` : ''}
${wantBom ? `${wantMeasurements ? '2' : '1'}) BILL OF MATERIALS:
   - 5-9 lines covering Upper / Lining / Sole / Trims / Hardware / Thread / Label as applicable.
   - Material name must be specific (e.g. "Full-grain calf leather 1.2mm", not "leather").
   - qty + unit must match the material (m², pcs, cm, g).
   - Cost in EUR, realistic given the COGS target of €${sku.cost}.
   - Leave supplier empty — user will fill from supplier database.
   Shape:
   {
     "bom": {
       "lines": [
         { "type": "Upper", "material": "Full-grain calf leather 1.2mm", "qty": "0.28", "unit": "m²", "supplier": "", "cost": "18" },
         ... 4-8 more lines
       ]
     }
   }
` : ''}

Return EXACTLY this JSON:
{
${wantMeasurements ? '  "measurements": { "rows": [...], "notes": "..." }' : ''}${wantMeasurements && wantBom ? ',' : ''}
${wantBom ? '  "bom": { "lines": [...] }' : ''}
}

No extra keys, no commentary. Every field populated — no placeholders, no TODOs.
`.trim();

  try {
    const { data } = await generateJSON({
      system,
      user: user_prompt,
      temperature: 0.5,
      language: (body.language as 'en' | 'es') || 'en',
    });

    // Sanity shape check
    const payload = data as {
      measurements?: { rows?: unknown[]; notes?: string };
      bom?: { lines?: unknown[] };
    };
    if (wantMeasurements && (!payload.measurements?.rows || !Array.isArray(payload.measurements.rows))) {
      throw new Error('AI returned invalid measurements shape');
    }
    if (wantBom && (!payload.bom?.lines || !Array.isArray(payload.bom.lines))) {
      throw new Error('AI returned invalid BOM shape');
    }

    // Upsert into tech_pack_data — merge with whatever exists
    const { data: existing } = await supabaseAdmin
      .from('tech_pack_data')
      .select('id')
      .eq('sku_id', skuId)
      .maybeSingle();
    const patch: Record<string, unknown> = {};
    if (payload.measurements) patch.measurements = payload.measurements;
    if (payload.bom) patch.bom = payload.bom;
    if (existing) {
      await supabaseAdmin.from('tech_pack_data').update(patch).eq('id', existing.id);
    } else {
      await supabaseAdmin.from('tech_pack_data').insert({
        collection_plan_id: sku.collection_plan_id,
        sku_id: skuId,
        ...patch,
      });
    }

    return NextResponse.json({ result: payload });
  } catch (error) {
    console.error('[tech-pack/generate]', error);
    const message = error instanceof Error ? error.message : 'AI generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
