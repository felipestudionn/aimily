/**
 * POST /api/strategy/sku-actions/open-design
 *
 * Conecta In-Season con la fase Design del Collection Builder. NO inventa
 * nada: replica la fase Design tal cual (subir referencia → sketch →
 * colorways → 3D → tech-pack), exponiéndola como funcionalidad accesible
 * desde el drawer de un SKU de In-Season.
 *
 * Felipe sprint Aimily Design · 2026-05-18.
 *
 * Lógica:
 *   1) Encuentra/crea el collection_plan "Aimily Design — In-Season" para
 *      el usuario (zona dedicada para todos los sketches generados desde
 *      cualquier run de In-Season).
 *   2) Crea un collection_sku nuevo en ese plan con la imagen del SKU del
 *      In-Season pre-cargada como reference_image_url.
 *   3) Persiste un registro en strategy_action_executions para
 *      trazabilidad.
 *   4) Devuelve la URL del Collection Builder con ?open_sku=... para que
 *      el frontend abra el SkuDetailView (la fase Design completa) de
 *      ese SKU recién creado.
 *
 * Body: {
 *   product_fact_id: uuid,
 *   run_id: uuid,
 *   action_type: 'extend_colors' | 'amplify_next_season',
 *   reference_image_url: string
 * }
 * Returns: { url: string, sku_id: string, collection_plan_id: string, execution_id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { getAuthenticatedUser } from '@/lib/api-auth';

const DESIGN_PLAN_NAME = 'Aimily Design — In-Season';

type Body = {
  product_fact_id?: string;
  run_id?: string;
  action_type?: 'extend_colors' | 'amplify_next_season';
  reference_image_url?: string; // opcional · si no viene, el usuario sube en la fase concept
};

function familyToCategory(family: string | null): 'ROPA' | 'CALZADO' | 'ACCESORIOS' {
  const f = (family || '').toUpperCase();
  if (/CALZAD|SHOE|ZAPAT|BOOT|SANDAL|SNEAK/.test(f)) return 'CALZADO';
  if (/BOLSO|BAG|JOY|ACCESS|CINTUR|BELT|BUFAND|SCARF|GAFAS|GLASS/.test(f)) return 'ACCESORIOS';
  return 'ROPA';
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.product_fact_id || !body?.run_id || !body?.action_type) {
    return NextResponse.json(
      { error: 'product_fact_id, run_id, action_type required' },
      { status: 400 }
    );
  }
  if (body.action_type !== 'extend_colors' && body.action_type !== 'amplify_next_season') {
    return NextResponse.json({ error: 'invalid action_type' }, { status: 400 });
  }

  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  // Lookup product
  const { data: product } = await supabaseAdmin
    .from('strategy_product_facts')
    .select('id, tenant_id, product_name, family_code, model_ref, color_ref, pvp, margin_pct_list')
    .eq('id', body.product_fact_id)
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ error: 'product not found' }, { status: 404 });
  }

  // Strategy access guard
  const access = await requireStrategyAccess({ tenantId: product.tenant_id, minRole: 'analyst' });
  if (!access.ok) return access.response;

  // 1) Find or create the "Aimily Design — In-Season" collection plan for this user.
  const { data: existingPlan } = await supabaseAdmin
    .from('collection_plans')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', DESIGN_PLAN_NAME)
    .is('deleted_at', null)
    .maybeSingle();

  let collectionPlanId = existingPlan?.id as string | undefined;

  if (!collectionPlanId) {
    const { data: newPlan, error: planErr } = await supabaseAdmin
      .from('collection_plans')
      .insert({
        user_id: user.id,
        name: DESIGN_PLAN_NAME,
        description: 'Sketches y variantes generados desde In-Season Sales Management.',
        season: 'In-Season',
        status: 'active',
        setup_data: {
          source: 'in_season',
          productFamilies: [],
          productTypeSegments: [],
        },
      })
      .select('id')
      .single();
    if (planErr || !newPlan) {
      return NextResponse.json(
        { error: `collection plan create failed: ${planErr?.message}` },
        { status: 500 }
      );
    }
    collectionPlanId = newPlan.id;
  }

  // 2) Create a new collection_sku in that plan with the reference image
  //    pre-loaded. Defaults of the schema cover everything else (design_phase
  //    = 'range_plan', proto_iterations = [], etc).
  const skuName =
    body.action_type === 'amplify_next_season'
      ? `${product.product_name || product.model_ref || 'SKU'} · concept replica`
      : `${product.product_name || product.model_ref || 'SKU'} · color variants`;

  const { data: newSku, error: skuErr } = await supabaseAdmin
    .from('collection_skus')
    .insert({
      collection_plan_id: collectionPlanId,
      name: skuName,
      family: product.family_code || 'General',
      category: familyToCategory(product.family_code),
      type: 'IMAGEN',
      channel: 'DTC',
      drop_number: 1,
      pvp: Number(product.pvp) || 0,
      cost: 0,
      final_price: Number(product.pvp) || 0,
      margin: Number(product.margin_pct_list) || 0,
      buy_units: 0,
      expected_sales: 0,
      launch_date: new Date().toISOString().slice(0, 10),
      ...(body.reference_image_url ? { reference_image_url: body.reference_image_url } : {}),
      sku_role: body.action_type === 'amplify_next_season' ? 'NEW' : 'BESTSELLER_REINVENTION',
      notes: [
        `Origen: In-Season Sales Management`,
        `SKU referencia: ${product.model_ref}${product.color_ref ? ` · ${product.color_ref}` : ''}`,
        `Acción: ${body.action_type === 'extend_colors' ? 'Extender colores' : 'Replicar concepto en nuevo modelo'}`,
      ].join('\n'),
    })
    .select('id')
    .single();

  if (skuErr || !newSku) {
    return NextResponse.json(
      { error: `sku create failed: ${skuErr?.message}` },
      { status: 500 }
    );
  }

  // 3) Persist execution row for traceability + future "ya tienes N variantes" UX.
  const { data: execution, error: execErr } = await supabaseAdmin
    .from('strategy_action_executions')
    .insert({
      tenant_id: product.tenant_id,
      run_id: body.run_id,
      product_fact_id: product.id,
      action_type: body.action_type,
      payload: {
        reference_image_url: body.reference_image_url,
        collection_plan_id: collectionPlanId,
        sku_id: newSku.id,
        sku_name: skuName,
      },
      status: 'pending', // se completa cuando el usuario avanza la fase Design
      created_by: user.id,
    })
    .select('id')
    .single();

  if (execErr || !execution) {
    return NextResponse.json(
      { error: `execution insert failed: ${execErr?.message}` },
      { status: 500 }
    );
  }

  // 4) Build URL to the Collection Builder with the SKU detail auto-open param.
  // El CollectionBuilder vive en /collection/[id]/product (no en la raíz
  // /collection/[id] que es el Overview).
  const url = `/collection/${collectionPlanId}/product?open_sku=${newSku.id}&from=in_season&action=${body.action_type}`;

  return NextResponse.json({
    url,
    sku_id: newSku.id,
    collection_plan_id: collectionPlanId,
    execution_id: execution.id,
  });
}
