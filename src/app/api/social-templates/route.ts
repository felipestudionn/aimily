import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const planId = req.nextUrl.searchParams.get('planId');
    if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 });

    let query = supabaseAdmin
      .from('social_templates')
      .select('*')
      .eq('collection_plan_id', planId)
      .order('created_at', { ascending: false });

    const storyId = req.nextUrl.searchParams.get('storyId');
    if (storyId) query = query.eq('story_id', storyId);

    const platform = req.nextUrl.searchParams.get('platform');
    if (platform) query = query.eq('platform', platform);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching social_templates:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support bulk insert
    if (Array.isArray(body.templates)) {
      const { data, error } = await supabaseAdmin
        .from('social_templates')
        .insert(body.templates)
        .select();
      if (error) throw error;
      return NextResponse.json(data, { status: 201 });
    }

    if (!body.collection_plan_id || !body.platform || !body.type) {
      return NextResponse.json({ error: 'collection_plan_id, platform, and type required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('social_templates')
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating social_template:', error);
    const message = error instanceof Error ? error.message : 'Failed to create';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
