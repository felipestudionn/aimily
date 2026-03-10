import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/brand-profiles?planId=xxx - Get or create brand profile for a collection
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('planId');

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    // Try to find existing profile
    const { data, error } = await supabaseAdmin
      .from('brand_profiles')
      .select('*')
      .eq('collection_plan_id', planId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Not found — auto-create an empty profile
      const { data: created, error: createErr } = await supabaseAdmin
        .from('brand_profiles')
        .insert([{ collection_plan_id: planId }])
        .select()
        .single();

      if (createErr) {
        console.error('Error creating brand profile:', createErr);
        return NextResponse.json({ error: createErr.message }, { status: 500 });
      }

      return NextResponse.json(created);
    }

    if (error) {
      console.error('Error fetching brand profile:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET brand profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/brand-profiles - Update brand profile
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('brand_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating brand profile:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('PATCH brand profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
