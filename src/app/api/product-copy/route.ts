import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const planId = req.nextUrl.searchParams.get('planId');
    const skuId = req.nextUrl.searchParams.get('skuId');
    const copyType = req.nextUrl.searchParams.get('copyType');

    let query = supabaseAdmin
      .from('product_copy')
      .select('*')
      .order('created_at', { ascending: false });

    if (planId) query = query.eq('collection_plan_id', planId);
    if (skuId) query = query.eq('sku_id', skuId);
    if (copyType) query = query.eq('copy_type', copyType);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching product_copy:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch copy';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.collection_plan_id || !body.copy_type || !body.title) {
      return NextResponse.json(
        { error: 'collection_plan_id, copy_type, and title are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('product_copy')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating product_copy:', error);
    const message = error instanceof Error ? error.message : 'Failed to create copy';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
