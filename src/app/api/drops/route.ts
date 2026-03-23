import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

// GET /api/drops?planId=xxx - Get all drops for a collection plan
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
      .from('drops')
      .select('*')
      .eq('collection_plan_id', planId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching drops:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Drops GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/drops - Create a new drop
export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const body = await req.json();
    const {
      collection_plan_id,
      drop_number,
      name,
      launch_date,
      end_date,
      weeks_active,
      story_name,
      story_description,
      channels,
      position
    } = body;

    if (!collection_plan_id || !name || !launch_date) {
      return NextResponse.json(
        { error: 'collection_plan_id, name, and launch_date are required' },
        { status: 400 }
      );
    }

    const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, collection_plan_id);
    if (!authorized) return ownerError;

    const { data, error } = await supabaseAdmin
      .from('drops')
      .insert({
        collection_plan_id,
        drop_number: drop_number || 1,
        name,
        launch_date,
        end_date,
        weeks_active: weeks_active || 8,
        story_name,
        story_description,
        channels: channels || ['DTC', 'WHOLESALE'],
        position: position || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating drop:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Drops POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
