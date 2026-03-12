import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const planId = req.nextUrl.searchParams.get('planId');
    const type = req.nextUrl.searchParams.get('type');
    const status = req.nextUrl.searchParams.get('status');
    const storyId = req.nextUrl.searchParams.get('storyId');
    const skuId = req.nextUrl.searchParams.get('skuId');

    let query = supabaseAdmin
      .from('ai_generations')
      .select('*')
      .order('created_at', { ascending: false });

    if (planId) query = query.eq('collection_plan_id', planId);
    if (type) query = query.eq('generation_type', type);
    if (status) query = query.eq('status', status);
    if (storyId) query = query.eq('story_id', storyId);
    if (skuId) query = query.contains('input_data', { sku_id: skuId });

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching ai_generations:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch generations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.user_id || !body.generation_type || !body.prompt) {
      return NextResponse.json(
        { error: 'user_id, generation_type, and prompt are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('ai_generations')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating ai_generation:', error);
    const message = error instanceof Error ? error.message : 'Failed to create generation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
