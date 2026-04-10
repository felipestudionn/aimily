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

    let query = supabaseAdmin
      .from('email_templates_content')
      .select('*')
      .eq('collection_plan_id', planId)
      .order('created_at', { ascending: false });

    const storyId = req.nextUrl.searchParams.get('storyId');
    if (storyId) query = query.eq('story_id', storyId);

    const emailType = req.nextUrl.searchParams.get('emailType');
    if (emailType) query = query.eq('email_type', emailType);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching email_templates:', error);
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
    if (Array.isArray(body.templates)) {
      if (body.templates.length === 0) {
        return NextResponse.json([], { status: 201 });
      }
      const planIds = new Set(body.templates.map((t: { collection_plan_id?: string }) => t.collection_plan_id));
      if (planIds.size !== 1 || !body.templates[0].collection_plan_id) {
        return NextResponse.json(
          { error: 'All templates must share a single collection_plan_id' },
          { status: 400 },
        );
      }

      const { authorized, error: ownerError } = await verifyCollectionOwnership(
        user.id,
        body.templates[0].collection_plan_id,
        'edit_marketing',
      );
      if (!authorized) return ownerError;

      const { data, error } = await supabaseAdmin
        .from('email_templates_content')
        .insert(body.templates)
        .select();
      if (error) throw error;
      return NextResponse.json(data, { status: 201 });
    }

    if (!body.collection_plan_id || !body.email_type) {
      return NextResponse.json({ error: 'collection_plan_id and email_type required' }, { status: 400 });
    }

    const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, body.collection_plan_id, 'edit_marketing');
    if (!authorized) return ownerError;

    const { data, error } = await supabaseAdmin
      .from('email_templates_content')
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating email_template:', error);
    const message = error instanceof Error ? error.message : 'Failed to create';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
