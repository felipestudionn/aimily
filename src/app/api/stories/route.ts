import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

// GET /api/stories?planId=xxx
export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const planId = req.nextUrl.searchParams.get('planId');
    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, planId);
    if (!authorized) return ownerError;

    const { data, error } = await supabaseAdmin
      .from('collection_stories')
      .select('*')
      .eq('collection_plan_id', planId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching stories:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Stories GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/stories — create one or many stories (bulk for AI)
export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const body = await req.json();

    // Support bulk insert: { stories: [...] } or single: { collection_plan_id, name, ... }
    const rows = Array.isArray(body.stories) ? body.stories : [body];

    for (const row of rows) {
      if (!row.collection_plan_id || !row.name) {
        return NextResponse.json(
          { error: 'collection_plan_id and name are required for every story' },
          { status: 400 }
        );
      }
    }

    // Verify ownership for the collection_plan_id
    const planId = rows[0].collection_plan_id;
    const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, planId, 'edit_marketing');
    if (!authorized) return ownerError;

    const { data, error } = await supabaseAdmin
      .from('collection_stories')
      .insert(rows)
      .select();

    if (error) {
      console.error('Error creating stories:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If bulk, also assign SKUs to stories via story_id on collection_skus
    if (Array.isArray(body.stories) && body.sku_assignments) {
      // sku_assignments: Record<storyName, string[]> — map by name since IDs are new
      const storyMap = new Map<string, string>();
      for (const s of data) {
        storyMap.set(s.name, s.id);
      }

      for (const [storyName, skuIds] of Object.entries(body.sku_assignments)) {
        const storyId = storyMap.get(storyName);
        if (storyId && Array.isArray(skuIds)) {
          for (const skuId of skuIds as string[]) {
            await supabaseAdmin
              .from('collection_skus')
              .update({ story_id: storyId })
              .eq('id', skuId);
          }
        }
      }
    }

    return NextResponse.json(Array.isArray(body.stories) ? data : data[0], { status: 201 });
  } catch (error) {
    console.error('Stories POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
