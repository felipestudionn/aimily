import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser } from '@/lib/api-auth';

// GET /api/standalone-timelines
export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    // Use authenticated user's id instead of query param
    const { data, error } = await supabaseAdmin
      .from('standalone_timelines')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Standalone timelines GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/standalone-timelines — Upsert a standalone timeline
export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const body = await req.json();
    const { collection_name, season, launch_date, milestones } = body;

    if (!collection_name || !launch_date || !milestones) {
      return NextResponse.json(
        { error: 'collection_name, launch_date, and milestones are required' },
        { status: 400 }
      );
    }

    // Use authenticated user's id
    const { data, error } = await supabaseAdmin
      .from('standalone_timelines')
      .upsert(
        {
          user_id: user.id,
          collection_name,
          season: season || null,
          launch_date,
          milestones,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,collection_name,season' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting standalone timeline:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Standalone timelines POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
