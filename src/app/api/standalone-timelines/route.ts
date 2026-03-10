import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/standalone-timelines?userId=xxx
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('standalone_timelines')
      .select('*')
      .eq('user_id', userId)
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
    const body = await req.json();
    const { user_id, collection_name, season, launch_date, milestones } = body;

    if (!user_id || !collection_name || !launch_date || !milestones) {
      return NextResponse.json(
        { error: 'user_id, collection_name, launch_date, and milestones are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('standalone_timelines')
      .upsert(
        {
          user_id,
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
