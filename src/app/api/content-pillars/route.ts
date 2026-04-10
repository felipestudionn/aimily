import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const planId = req.nextUrl.searchParams.get('planId');
    if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 });

    const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, planId);
    if (!authorized) return ownerError;

    const { data, error } = await supabaseAdmin
      .from('content_pillars')
      .select('*')
      .eq('collection_plan_id', planId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching content_pillars:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const body = await req.json();

    // Support bulk insert
    if (Array.isArray(body.pillars)) {
      if (body.pillars.length === 0) {
        return NextResponse.json([], { status: 201 });
      }
      // All pillars must belong to the same collection plan we can authorize.
      const planIds = new Set(body.pillars.map((p: { collection_plan_id?: string }) => p.collection_plan_id));
      if (planIds.size !== 1 || !body.pillars[0].collection_plan_id) {
        return NextResponse.json(
          { error: 'All pillars must share a single collection_plan_id' },
          { status: 400 },
        );
      }

      const { authorized, error: ownerError } = await verifyCollectionOwnership(
        user.id,
        body.pillars[0].collection_plan_id,
        'edit_marketing',
      );
      if (!authorized) return ownerError;

      const { data, error } = await supabaseAdmin
        .from('content_pillars')
        .insert(body.pillars)
        .select();
      if (error) throw error;
      return NextResponse.json(data, { status: 201 });
    }

    if (!body.collection_plan_id || !body.name) {
      return NextResponse.json({ error: 'collection_plan_id and name required' }, { status: 400 });
    }

    const { authorized, error: ownerError } = await verifyCollectionOwnership(
      user.id,
      body.collection_plan_id,
      'edit_marketing',
    );
    if (!authorized) return ownerError;

    const { data, error } = await supabaseAdmin
      .from('content_pillars')
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating content_pillar:', error);
    const message = error instanceof Error ? error.message : 'Failed to create';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
