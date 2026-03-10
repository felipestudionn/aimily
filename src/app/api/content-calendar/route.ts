import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const planId = req.nextUrl.searchParams.get('planId');
    const campaign = req.nextUrl.searchParams.get('campaign');
    const status = req.nextUrl.searchParams.get('status');

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('content_calendar')
      .select('*')
      .eq('collection_plan_id', planId)
      .order('scheduled_date', { ascending: true });

    if (campaign) query = query.eq('campaign', campaign);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching content_calendar:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.collection_plan_id || !body.title || !body.content_type || !body.scheduled_date) {
      return NextResponse.json(
        { error: 'collection_plan_id, title, content_type, and scheduled_date are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('content_calendar')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating content_calendar:', error);
    const message = error instanceof Error ? error.message : 'Failed to create';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
