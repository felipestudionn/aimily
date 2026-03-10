import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const PHASE_NAMES: Record<string, { name: string; nameEs: string }> = {
  aimily: { name: 'Product & Merchandising', nameEs: 'Producto y Merchandising' },
  brand: { name: 'Brand & Identity', nameEs: 'Marca e Identidad' },
  design: { name: 'Design & Development', nameEs: 'Diseño y Desarrollo' },
  prototyping: { name: 'Prototyping', nameEs: 'Prototipado' },
  sampling: { name: 'Sampling', nameEs: 'Muestrario' },
  digital: { name: 'Digital Presence', nameEs: 'Presencia Digital' },
  marketing: { name: 'Marketing Pre-launch', nameEs: 'Marketing Pre-lanzamiento' },
  production: { name: 'Production', nameEs: 'Producción' },
  launch: { name: 'Launch', nameEs: 'Lanzamiento' },
};

/**
 * GET /api/alfred-milestones?email=user@example.com
 *
 * Alfred API v2 — Returns milestones, phase summaries, next-action
 * recommendations, and overdue alerts for a user across all collections.
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
        tasks.push(milestoneToTask(m, startDate, endDate, collectionLabel, ct.launch_date, today, plan?.id));
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

    // 6. Build phase summaries per collection
    const collections_summary: CollectionSummary[] = [];
    for (const ct of collectionTimelines) {
      const plan = plans?.find((p) => p.id === ct.collection_plan_id);
      const collectionLabel = plan ? `${plan.name} ${plan.season || ''}`.trim() : 'Unknown';
      collections_summary.push(
        buildCollectionSummary(ct.milestones, ct.launch_date, collectionLabel, plan?.id, today)
      );
    }
    for (const st of standalones) {
      const collectionLabel = `${st.collection_name} ${st.season || ''}`.trim();
      collections_summary.push(
        buildCollectionSummary(st.milestones, st.launch_date, collectionLabel, undefined, today)
      );
    }

    // 7. Build next-action recommendations
    const next_actions = buildNextActions(tasks, today);

    // 8. Build overdue alerts
    const alerts = buildAlerts(tasks, today);

    return NextResponse.json({
      user_email: email,
      total_tasks: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      in_progress: tasks.filter((t) => t.status === 'in-progress').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      overdue: tasks.filter((t) => t.is_overdue).length,
      collections_summary,
      next_actions,
      alerts,
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
  collection_id?: string;
  launch_date: string;
  is_user_task: boolean;
  is_overdue: boolean;
  days_overdue?: number;
  notes?: string;
}

interface PhaseSummary {
  phase: string;
  phase_name: string;
  phase_name_es: string;
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  overdue: number;
  progress_pct: number;
}

interface CollectionSummary {
  collection: string;
  collection_id?: string;
  launch_date: string;
  days_until_launch: number;
  overall_progress_pct: number;
  total_milestones: number;
  completed_milestones: number;
  overdue_milestones: number;
  phases: PhaseSummary[];
}

interface NextAction {
  priority: 'critical' | 'high' | 'medium';
  action: string;
  action_es: string;
  context: string;
  collection: string;
  collection_id?: string;
  milestone_id: string;
  phase: string;
  due_date: string;
}

interface Alert {
  type: 'overdue' | 'due_soon' | 'launch_approaching';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  message_es: string;
  collection: string;
  collection_id?: string;
  details?: string;
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
  today: Date,
  collectionId?: string
): AlfredTask {
  const isOverdue = endDate < today && m.status !== 'completed';
  const daysOverdue = isOverdue ? Math.ceil((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)) : undefined;
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
    collection_id: collectionId,
    launch_date: launchDate,
    is_user_task: ['US', 'ALL', 'AGENCY/US'].includes(m.responsible),
    is_overdue: isOverdue,
    days_overdue: daysOverdue,
    notes: m.notes,
  };
}

function buildCollectionSummary(
  milestones: TimelineMilestoneRaw[],
  launchDate: string,
  collection: string,
  collectionId: string | undefined,
  today: Date
): CollectionSummary {
  const launchD = new Date(launchDate);
  const daysUntilLaunch = Math.ceil((launchD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const totalCompleted = milestones.filter((m) => m.status === 'completed').length;
  const overallPct = milestones.length > 0 ? Math.round((totalCompleted / milestones.length) * 100) : 0;

  // Group by phase
  const phaseGroups: Record<string, TimelineMilestoneRaw[]> = {};
  for (const m of milestones) {
    if (!phaseGroups[m.phase]) phaseGroups[m.phase] = [];
    phaseGroups[m.phase].push(m);
  }

  const phases: PhaseSummary[] = Object.entries(phaseGroups).map(([phase, ms]) => {
    const completed = ms.filter((m) => m.status === 'completed').length;
    const inProgress = ms.filter((m) => m.status === 'in-progress').length;
    const pending = ms.length - completed - inProgress;
    const overdue = ms.filter((m) => {
      const endDate = computeEndDate(computeStartDate(launchDate, m.startWeeksBefore), m.durationWeeks);
      return endDate < today && m.status !== 'completed';
    }).length;
    const phaseName = PHASE_NAMES[phase];
    return {
      phase,
      phase_name: phaseName?.name || phase,
      phase_name_es: phaseName?.nameEs || phase,
      total: ms.length,
      completed,
      in_progress: inProgress,
      pending,
      overdue,
      progress_pct: Math.round((completed / ms.length) * 100),
    };
  });

  const totalOverdue = milestones.filter((m) => {
    const endDate = computeEndDate(computeStartDate(launchDate, m.startWeeksBefore), m.durationWeeks);
    return endDate < today && m.status !== 'completed';
  }).length;

  return {
    collection,
    collection_id: collectionId,
    launch_date: launchDate,
    days_until_launch: daysUntilLaunch,
    overall_progress_pct: overallPct,
    total_milestones: milestones.length,
    completed_milestones: totalCompleted,
    overdue_milestones: totalOverdue,
    phases,
  };
}

function buildNextActions(tasks: AlfredTask[], today: Date): NextAction[] {
  const actions: NextAction[] = [];
  const sevenDays = new Date(today);
  sevenDays.setDate(sevenDays.getDate() + 7);

  // 1. Critical: overdue user tasks
  const overdueTasks = tasks.filter((t) => t.is_overdue && t.is_user_task);
  for (const t of overdueTasks.slice(0, 3)) {
    actions.push({
      priority: 'critical',
      action: `Complete "${t.title}" — ${t.days_overdue} days overdue`,
      action_es: `Completar "${t.title_es}" — ${t.days_overdue} dias de retraso`,
      context: `This ${PHASE_NAMES[t.phase]?.name || t.phase} milestone was due ${t.end_date}`,
      collection: t.collection,
      collection_id: t.collection_id,
      milestone_id: t.id,
      phase: t.phase,
      due_date: t.end_date,
    });
  }

  // 2. High: in-progress user tasks
  const inProgressTasks = tasks.filter((t) => t.status === 'in-progress' && t.is_user_task && !t.is_overdue);
  for (const t of inProgressTasks.slice(0, 3)) {
    actions.push({
      priority: 'high',
      action: `Continue working on "${t.title}"`,
      action_es: `Continuar trabajando en "${t.title_es}"`,
      context: `Due ${t.end_date} for ${t.collection}`,
      collection: t.collection,
      collection_id: t.collection_id,
      milestone_id: t.id,
      phase: t.phase,
      due_date: t.end_date,
    });
  }

  // 3. Medium: upcoming user tasks starting within 7 days
  const upcoming = tasks.filter((t) => {
    if (t.status !== 'pending' || !t.is_user_task) return false;
    const start = new Date(t.start_date);
    return start >= today && start <= sevenDays;
  });
  for (const t of upcoming.slice(0, 3)) {
    actions.push({
      priority: 'medium',
      action: `Start "${t.title}" — begins ${t.start_date}`,
      action_es: `Iniciar "${t.title_es}" — comienza ${t.start_date}`,
      context: `${PHASE_NAMES[t.phase]?.name || t.phase} phase for ${t.collection}`,
      collection: t.collection,
      collection_id: t.collection_id,
      milestone_id: t.id,
      phase: t.phase,
      due_date: t.end_date,
    });
  }

  return actions;
}

function buildAlerts(tasks: AlfredTask[], today: Date): Alert[] {
  const alerts: Alert[] = [];

  // Group overdue by collection
  const overdueByCollection: Record<string, AlfredTask[]> = {};
  for (const t of tasks.filter((t) => t.is_overdue)) {
    if (!overdueByCollection[t.collection]) overdueByCollection[t.collection] = [];
    overdueByCollection[t.collection].push(t);
  }

  for (const [collection, overdueTasks] of Object.entries(overdueByCollection)) {
    const maxOverdue = Math.max(...overdueTasks.map((t) => t.days_overdue || 0));
    const severity = maxOverdue > 14 ? 'critical' : 'warning';
    alerts.push({
      type: 'overdue',
      severity,
      message: `${overdueTasks.length} overdue milestone${overdueTasks.length > 1 ? 's' : ''} in ${collection} (up to ${maxOverdue} days late)`,
      message_es: `${overdueTasks.length} hito${overdueTasks.length > 1 ? 's' : ''} atrasado${overdueTasks.length > 1 ? 's' : ''} en ${collection} (hasta ${maxOverdue} dias de retraso)`,
      collection,
      collection_id: overdueTasks[0]?.collection_id,
      details: overdueTasks.map((t) => `${t.title} (${t.days_overdue}d overdue)`).join('; '),
    });
  }

  // Due within 3 days
  const threeDays = new Date(today);
  threeDays.setDate(threeDays.getDate() + 3);
  const dueSoon = tasks.filter((t) => {
    if (t.status === 'completed') return false;
    const end = new Date(t.end_date);
    return end >= today && end <= threeDays;
  });

  if (dueSoon.length > 0) {
    const byCollection: Record<string, AlfredTask[]> = {};
    for (const t of dueSoon) {
      if (!byCollection[t.collection]) byCollection[t.collection] = [];
      byCollection[t.collection].push(t);
    }
    for (const [collection, tasks] of Object.entries(byCollection)) {
      alerts.push({
        type: 'due_soon',
        severity: 'warning',
        message: `${tasks.length} milestone${tasks.length > 1 ? 's' : ''} due within 3 days in ${collection}`,
        message_es: `${tasks.length} hito${tasks.length > 1 ? 's' : ''} vence${tasks.length > 1 ? 'n' : ''} en 3 dias en ${collection}`,
        collection,
        collection_id: tasks[0]?.collection_id,
        details: tasks.map((t) => `${t.title} (due ${t.end_date})`).join('; '),
      });
    }
  }

  // Launch approaching (within 30 days)
  const launchDates = new Set<string>();
  for (const t of tasks) {
    const key = `${t.collection}|${t.launch_date}|${t.collection_id || ''}`;
    if (launchDates.has(key)) continue;
    launchDates.add(key);
    const launch = new Date(t.launch_date);
    const daysUntil = Math.ceil((launch.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil > 0 && daysUntil <= 30) {
      alerts.push({
        type: 'launch_approaching',
        severity: daysUntil <= 7 ? 'critical' : 'info',
        message: `${t.collection} launches in ${daysUntil} days (${t.launch_date})`,
        message_es: `${t.collection} se lanza en ${daysUntil} dias (${t.launch_date})`,
        collection: t.collection,
        collection_id: t.collection_id,
      });
    }
  }

  return alerts;
}
