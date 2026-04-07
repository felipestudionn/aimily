import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

// GET /api/skus?planId=xxx - List SKUs for a collection plan
export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('planId');

    if (!planId) {
      return NextResponse.json(
        { error: 'planId is required' },
        { status: 400 }
      );
    }

    const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, planId);
    if (!authorized) return ownerError;

    const { data, error } = await supabaseAdmin
      .from('collection_skus')
      .select('*')
      .eq('collection_plan_id', planId)
      .order('created_at', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching SKUs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('GET SKUs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/skus - Create a new SKU
export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const body = await req.json();
    const {
      collection_plan_id,
      name,
      family,
      category,
      type,
      channel,
      drop_number,
      pvp,
      cost,
      discount,
      final_price,
      buy_units,
      sale_percentage,
      expected_sales,
      margin,
      launch_date,
      notes,
      reference_image_url,
      origin,
      size_run,
      sku_role,
      source_sku_id,
    } = body;

    if (!collection_plan_id || !name) {
      return NextResponse.json(
        { error: 'collection_plan_id and name are required' },
        { status: 400 }
      );
    }

    const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, collection_plan_id);
    if (!authorized) return ownerError;

    const { data, error } = await supabaseAdmin
      .from('collection_skus')
      .insert([{
        collection_plan_id,
        name,
        family,
        category,
        type,
        channel,
        drop_number,
        pvp,
        cost,
        discount,
        final_price,
        buy_units,
        sale_percentage,
        expected_sales,
        margin,
        launch_date,
        notes,
        reference_image_url,
        origin,
        size_run,
        sku_role,
        source_sku_id,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating SKU:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('POST SKU error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
