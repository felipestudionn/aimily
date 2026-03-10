import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/alfred-milestones?email=user@example.com
 *
 * Returns all milestones for a user (identified by email) across all their
 * collection timelines AND standalone timelines.
 *
 * Each milestone is returned with computed absolute dates, the collection
 * context, and a flag indicating if it's a user-actionable task.
 *
 * Used by the Alfred assistant to read OLAWAVE milestones as tasks/todos.
 */
export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email');
    if (!email) {
      return NextResponse.json(
        { error: 'email query parameter is required' },
        { status: 400 }
      );
    }

    // 1. Find auth user by email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      return NextResponse.json({ error: 'Failed to lookup user' }, { status: 500 });
    }
    const authUser = authData.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!authUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Get all collection plans for this user
    const { data: plans, error: plansError } = await supabaseAdmin
      .from('collection_plans')
      .select('id, name, season, status')
      .eq('user_id', authUser.id);

    if (plansError) {
      return NextResponse.json({ error: plansError.message }, { status: 500 });
    }

    // 3. Get all timelines (collection-linked)
    const planIds = (plans || []).map((p) => p.id);
    let collectionTimelines: {
      collection_plan_id: string;
      launch_date: string;
      milestones: TimelineMilestoneRaw[];
    }[] = [];

    if (planIds.length > 0) {
      const { data: timelines, error: tlError } = await supabaseAdmin
        .from('collection_timelines')
        .select('collection_plan_id, launch_date, milestones')
        .in('collection_plan_id', planIds);

      if (tlError) {
        return NextResponse.json({ error: tlError.message }, { status: 500 });
      }
      collectionTimelines = timelines || [];
    }

    // 4. Get standalone timelines for this user
    const { data: standaloneTimelines, error: stError } = await supabaseAdmin
      .from('standalone_timelines')
      .select('id, collection_name, season, launch_date, milestones')
      .eq('user_id', authUser.id);

    // standalone_timelines table may not exist yet — that's ok
    const standalones = stError ? [] : (standaloneTimelines || []);

    // 5. Build flat task list
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tasks: AlfredTask[] = [];

    // From collection-linked timelines
    for (const ct of collectionTimelines) {
      const plan = plans?.find((p) => p.id === ct.collection_plan_id);
      const collectionLabel = plan ? `${plan.name} ${plan.season || ''}`.trim() : 'Unknown';

      for (const m of ct.milestones) {
        const startDate = computeStartDate(ct.launch_date, m.startWeeksBefore);
        const endDate = computeEndDate(startDate, m.durationWeeks);
        tasks.push(milestoneToTask(m, startDate, endDate, collectionLabel, ct.launch_date, today));
      }
    }

    // From standalone timelines
    for (const st of standalones) {
      const collectionLabel = `${st.collection_name} ${st.season || ''}`.trim();
      for (const m of st.milestones) {
        const startDate = computeStartDate(st.launch_date, m.startWeeksBefore);
        const endDate = computeEndDate(startDate, m.durationWeeks);
        tasks.push(milestoneToTask(m, startDate, endDate, collectionLabel, st.launch_date, today));
      }
    }

    // Sort: overdue first, then in-progress, then by start date
    tasks.sort((a, b) => {
      if (a.is_overdue && !b.is_overdue) return -1;
      if (!a.is_overdue && b.is_overdue) return 1;
      if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
      if (a.status !== 'in-progress' && b.status === 'in-progress') return 1;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });

    return NextResponse.json({
      user_email: email,
      total_tasks: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      in_progress: tasks.filter((t) => t.status === 'in-progress').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      overdue: tasks.filter((t) => t.is_overdue).length,
      tasks,
    });
  } catch (error) {
    console.error('Alfred milestones error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// --- Helpers ---

interface TimelineMilestoneRaw {
  id: string;
  phase: string;
  name: string;
  nameEs: string;
  responsible: string;
  startWeeksBefore: number;
  durationWeeks: number;
  color: string;
  status: string;
  notes?: string;
}

interface AlfredTask {
  id: string;
  title: string;
  title_es: string;
  phase: string;
  responsible: string;
  status: string;
  start_date: string;
  end_date: string;
  duration_weeks: number;
  collection: string;
  launch_date: string;
  is_user_task: boolean;
  is_overdue: boolean;
  notes?: string;
}

function computeStartDate(launchDate: string, weeksBefore: number): Date {
  const d = new Date(launchDate);
  d.setDate(d.getDate() - weeksBefore * 7);
  return d;
}

function computeEndDate(startDate: Date, durationWeeks: number): Date {
  const d = new Date(startDate);
  d.setDate(d.getDate() + durationWeeks * 7);
  return d;
}

function milestoneToTask(
  m: TimelineMilestoneRaw,
  startDate: Date,
  endDate: Date,
  collection: string,
  launchDate: string,
  today: Date
): AlfredTask {
  return {
    id: m.id,
    title: m.name,
    title_es: m.nameEs,
    phase: m.phase,
    responsible: m.responsible,
    status: m.status,
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    duration_weeks: m.durationWeeks,
    collection,
    launch_date: launchDate,
    is_user_task: ['US', 'ALL', 'AGENCY/US'].includes(m.responsible),
    is_overdue: endDate < today && m.status !== 'completed',
    notes: m.notes,
  };
}
