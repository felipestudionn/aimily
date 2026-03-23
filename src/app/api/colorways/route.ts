import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

// GET /api/colorways?skuId=xxx — Get all colorways for a SKU
export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const skuId = searchParams.get('skuId');
    const planId = searchParams.get('planId');

    if (!skuId && !planId) {
      return NextResponse.json({ error: 'skuId or planId is required' }, { status: 400 });
    }

    if (planId) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, planId);
      if (!authorized) return ownerError;
    }

    if (skuId) {
      // If no planId provided, look up the SKU to verify ownership
      if (!planId) {
        const { data: sku } = await supabaseAdmin
          .from('collection_skus')
          .select('collection_plan_id')
          .eq('id', skuId)
          .single();

        if (sku?.collection_plan_id) {
          const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, sku.collection_plan_id);
          if (!authorized) return ownerError;
        }
      }

      const { data, error } = await supabaseAdmin
        .from('sku_colorways')
        .select('*')
        .eq('sku_id', skuId)
        .order('position', { ascending: true });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    }

    // Fetch all colorways for all SKUs in a collection
    const { data: skus, error: skuErr } = await supabaseAdmin
      .from('collection_skus')
      .select('id')
      .eq('plan_id', planId!);

    if (skuErr) {
      return NextResponse.json({ error: skuErr.message }, { status: 500 });
    }

    if (!skus || skus.length === 0) {
      return NextResponse.json([]);
    }

    const skuIds = skus.map((s) => s.id);
    const { data, error } = await supabaseAdmin
      .from('sku_colorways')
      .select('*')
      .in('sku_id', skuIds)
      .order('position', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET colorways error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/colorways — Create a new colorway
export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const body = await req.json();
    const { sku_id, name, hex_primary } = body;

    if (!sku_id || !name || !hex_primary) {
      return NextResponse.json(
        { error: 'sku_id, name, and hex_primary are required' },
        { status: 400 }
      );
    }

    // Verify ownership via SKU
    const { data: sku } = await supabaseAdmin
      .from('collection_skus')
      .select('collection_plan_id')
      .eq('id', sku_id)
      .single();

    if (sku?.collection_plan_id) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, sku.collection_plan_id);
      if (!authorized) return ownerError;
    }

    const { data, error } = await supabaseAdmin
      .from('sku_colorways')
      .insert([body])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('POST colorway error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
