import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const planId = req.nextUrl.searchParams.get('planId');
    if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('brand_voice_config')
      .select('*')
      .eq('collection_plan_id', planId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching brand_voice_config:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.collection_plan_id) {
      return NextResponse.json({ error: 'collection_plan_id required' }, { status: 400 });
    }

    // Upsert: one config per collection
    const { data: existing } = await supabaseAdmin
      .from('brand_voice_config')
      .select('id')
      .eq('collection_plan_id', body.collection_plan_id)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('brand_voice_config')
        .update(body)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    const { data, error } = await supabaseAdmin
      .from('brand_voice_config')
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error saving brand_voice_config:', error);
    const message = error instanceof Error ? error.message : 'Failed to save';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
