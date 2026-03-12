import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const planId = req.nextUrl.searchParams.get('planId');
    if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 });

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
    const body = await req.json();

    // Support bulk insert
    if (Array.isArray(body.pillars)) {
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
