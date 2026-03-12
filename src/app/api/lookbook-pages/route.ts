import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const planId = req.nextUrl.searchParams.get('planId');
    const lookbookName = req.nextUrl.searchParams.get('lookbookName');
    const storyId = req.nextUrl.searchParams.get('storyId');

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('lookbook_pages')
      .select('*')
      .eq('collection_plan_id', planId)
      .order('page_number', { ascending: true });

    if (lookbookName) query = query.eq('lookbook_name', lookbookName);
    if (storyId) query = query.eq('story_id', storyId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching lookbook_pages:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch pages';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.collection_plan_id || !body.layout_type) {
      return NextResponse.json(
        { error: 'collection_plan_id and layout_type are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('lookbook_pages')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating lookbook_page:', error);
    const message = error instanceof Error ? error.message : 'Failed to create page';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
