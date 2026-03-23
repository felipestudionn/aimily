import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

// GET /api/collection-timelines?planId=xxx
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
      .from('collection_timelines')
      .select('*')
      .eq('collection_plan_id', planId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || null);
  } catch (error) {
    console.error('Timeline GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/collection-timelines - Create or update (upsert)
export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const body = await req.json();
    const { collection_plan_id, launch_date, milestones } = body;

    if (!collection_plan_id || !launch_date || !milestones) {
      return NextResponse.json(
        { error: 'collection_plan_id, launch_date, and milestones are required' },
        { status: 400 }
      );
    }

    const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, collection_plan_id);
    if (!authorized) return ownerError;

    // Upsert: create or update based on collection_plan_id
    const { data, error } = await supabaseAdmin
      .from('collection_timelines')
      .upsert(
        {
          collection_plan_id,
          launch_date,
          milestones,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'collection_plan_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting timeline:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Timeline POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
