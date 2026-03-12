import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser } from '@/lib/api-auth';

// GET /api/skus/carry-over?userId=xxx - List SKUs from other collections for import
export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const excludePlanId = searchParams.get('excludePlanId');

    // Get all collection plans for this user
    const { data: plans, error: plansError } = await supabaseAdmin
      .from('collection_plans')
      .select('id, name, season')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (plansError) {
      return NextResponse.json({ error: plansError.message }, { status: 500 });
    }

    const planIds = (plans || [])
      .filter(p => p.id !== excludePlanId)
      .map(p => p.id);

    if (planIds.length === 0) {
      return NextResponse.json({ collections: [], skus: [] });
    }

    // Get SKUs from those plans
    const { data: skus, error: skusError } = await supabaseAdmin
      .from('collection_skus')
      .select('*')
      .in('collection_plan_id', planIds)
      .order('expected_sales', { ascending: false });

    if (skusError) {
      return NextResponse.json({ error: skusError.message }, { status: 500 });
    }

    // Group by collection
    const collections = (plans || [])
      .filter(p => p.id !== excludePlanId)
      .map(p => ({
        ...p,
        skuCount: (skus || []).filter(s => s.collection_plan_id === p.id).length,
      }));

    return NextResponse.json({
      collections,
      skus: skus || [],
    });
  } catch (error) {
    console.error('Carry-over SKUs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/skus/carry-over - Import SKUs from another collection
export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  try {
    const { targetPlanId, sourceSkuIds, role } = await req.json();

    if (!targetPlanId || !sourceSkuIds?.length) {
      return NextResponse.json(
        { error: 'targetPlanId and sourceSkuIds are required' },
        { status: 400 }
      );
    }

    // Fetch source SKUs
    const { data: sourceSkus, error: fetchError } = await supabaseAdmin
      .from('collection_skus')
      .select('*')
      .in('id', sourceSkuIds);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Create copies in target collection
    const newSkus = (sourceSkus || []).map(sku => ({
      collection_plan_id: targetPlanId,
      name: sku.name,
      family: sku.family,
      category: sku.category,
      type: sku.type,
      channel: sku.channel,
      drop_number: 1,
      pvp: sku.pvp,
      cost: sku.cost,
      discount: 0,
      final_price: sku.pvp,
      buy_units: sku.buy_units,
      sale_percentage: sku.sale_percentage || 60,
      expected_sales: sku.expected_sales,
      margin: sku.margin,
      launch_date: new Date().toISOString().split('T')[0],
      notes: sku.notes ? `[Imported] ${sku.notes}` : '[Imported from previous collection]',
      reference_image_url: sku.reference_image_url,
      origin: sku.origin,
      size_run: sku.size_run,
      sku_role: role || 'CARRYOVER',
      source_sku_id: sku.id,
    }));

    const { data: created, error: insertError } = await supabaseAdmin
      .from('collection_skus')
      .insert(newSkus)
      .select();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      imported: created?.length || 0,
      skus: created || [],
    });
  } catch (error) {
    console.error('Carry-over import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
