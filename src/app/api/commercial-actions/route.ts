import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

// GET /api/commercial-actions?planId=xxx - Get all commercial actions for a plan
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
      .from('commercial_actions')
      .select('*')
      .eq('collection_plan_id', planId)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching commercial actions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Commercial actions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/commercial-actions - Create a new commercial action
export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const body = await req.json();
    const {
      collection_plan_id,
      name,
      action_type,
      start_date,
      end_date,
      category,
      partner_name,
      partner_logo_url,
      description,
      expected_traffic_boost,
      expected_sales_boost,
      channels,
      position
    } = body;

    if (!collection_plan_id || !name || !action_type || !start_date) {
      return NextResponse.json(
        { error: 'collection_plan_id, name, action_type, and start_date are required' },
        { status: 400 }
      );
    }

    const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, collection_plan_id, 'edit_marketing');
    if (!authorized) return ownerError;

    const { data, error } = await supabaseAdmin
      .from('commercial_actions')
      .insert({
        collection_plan_id,
        name,
        action_type,
        start_date,
        end_date,
        category,
        partner_name,
        partner_logo_url,
        description,
        expected_traffic_boost,
        expected_sales_boost,
        channels: channels || ['DTC', 'WHOLESALE'],
        position: position || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating commercial action:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Commercial actions POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
