import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createDefaultTimeline } from '@/lib/timeline-template';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, season, location, setup_data, user_id } = body;

    if (!name || !setup_data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from('collection_plans')
      .insert({
        name,
        description,
        season,
        location,
        setup_data,
        user_id,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving plan:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Auto-create default timeline for the new collection
    const defaultLaunchDate = '2027-02-01';
    const timeline = createDefaultTimeline(name, season || 'SS27', defaultLaunchDate);

    const { error: timelineError } = await supabaseAdmin
      .from('collection_timelines')
      .insert({
        collection_plan_id: data.id,
        launch_date: defaultLaunchDate,
        milestones: timeline.milestones,
      });

    if (timelineError) {
      console.error('Error creating default timeline:', timelineError);
      // Non-blocking: collection was created, timeline can be created later
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Create plan error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
