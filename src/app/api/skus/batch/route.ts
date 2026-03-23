import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

// POST /api/skus/batch - Insert multiple SKUs at once
export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { skus } = await req.json();

    if (!Array.isArray(skus) || skus.length === 0) {
      return NextResponse.json({ error: 'skus array is required' }, { status: 400 });
    }

    // Verify ownership for all unique collection_plan_ids in the batch
    const planIds = Array.from(new Set(skus.map((s: { collection_plan_id?: string }) => s.collection_plan_id).filter(Boolean))) as string[];
    for (const planId of planIds) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, planId);
      if (!authorized) return ownerError;
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
