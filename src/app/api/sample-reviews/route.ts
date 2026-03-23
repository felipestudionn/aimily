import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

// GET /api/sample-reviews?planId=xxx&reviewType=xxx
export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('planId');
    const reviewType = searchParams.get('reviewType');
    const skuId = searchParams.get('skuId');

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, planId);
    if (!authorized) return ownerError;

    let query = supabaseAdmin
      .from('sample_reviews')
      .select('*')
      .eq('collection_plan_id', planId)
      .order('created_at', { ascending: false });

    if (reviewType) {
      query = query.eq('review_type', reviewType);
    }
    if (skuId) {
      query = query.eq('sku_id', skuId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET sample-reviews error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/sample-reviews
export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const body = await req.json();
    const { collection_plan_id, review_type } = body;

    if (!collection_plan_id || !review_type) {
      return NextResponse.json(
        { error: 'collection_plan_id and review_type are required' },
        { status: 400 }
      );
    }

    const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, collection_plan_id);
    if (!authorized) return ownerError;

    const { data, error } = await supabaseAdmin
      .from('sample_reviews')
      .insert([body])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('POST sample-review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
