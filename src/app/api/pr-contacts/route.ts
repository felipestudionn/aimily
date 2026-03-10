import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const planId = req.nextUrl.searchParams.get('planId');
    const type = req.nextUrl.searchParams.get('type');
    const status = req.nextUrl.searchParams.get('status');

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('pr_contacts')
      .select('*')
      .eq('collection_plan_id', planId)
      .order('created_at', { ascending: false });

    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching pr_contacts:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.collection_plan_id || !body.name || !body.type) {
      return NextResponse.json(
        { error: 'collection_plan_id, name, and type are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('pr_contacts')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating pr_contacts:', error);
    const message = error instanceof Error ? error.message : 'Failed to create';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
