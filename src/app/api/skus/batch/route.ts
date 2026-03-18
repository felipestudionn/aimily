import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// POST /api/skus/batch - Insert multiple SKUs at once
export async function POST(req: NextRequest) {
  try {
    const { skus } = await req.json();

    if (!Array.isArray(skus) || skus.length === 0) {
      return NextResponse.json({ error: 'skus array is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('collection_skus')
      .insert(skus)
      .select();

    if (error) {
      console.error('Batch SKU insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: data?.length || 0, skus: data });
  } catch (err) {
    console.error('Batch SKU error:', err);
    return NextResponse.json({ error: 'Failed to insert SKUs' }, { status: 500 });
  }
}
