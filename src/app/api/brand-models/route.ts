import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const planId = req.nextUrl.searchParams.get('planId');
    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('brand_models')
      .select('*')
      .eq('collection_plan_id', planId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching brand_models:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch models';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.collection_plan_id || !body.name) {
      return NextResponse.json(
        { error: 'collection_plan_id and name are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('brand_models')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating brand_model:', error);
    const message = error instanceof Error ? error.message : 'Failed to create model';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
