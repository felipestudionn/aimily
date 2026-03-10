import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/notifications?user_id=xxx
 *
 * Returns in-app notifications computed from timeline milestones:
 * - Overdue milestones
 * - Due within 3 days
 * - Launch approaching (within 30 days)
 * - Recently started (in-progress)
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id');
    if (!userId) {
      return NextResponse.json({ error: 'user_id query parameter is required' }, { status: 400 });
    }

    // Get all collection plans
    const { data: plans, error: plansError } = await supabaseAdmin
      .from('collection_plans')
      .select('id, name, season')
      .eq('user_id', userId);

    if (plansError) {
      return NextResponse.json({ error: plansError.message }, { status: 500 });
    }

    const planIds = (plans || []).map((p) => p.id);
    if (planIds.length === 0) {
      return NextResponse.json({ notifications: [], unread_count: 0 });
    }

    // Get timelines
    const { data: timelines, error: tlError } = await supabaseAdmin
      .from('collection_timelines')
      .select('collection_plan_id, launch_date, milestones')
      .in('collection_plan_id', planIds);

    if (tlError) {
      return NextResponse.json({ error: tlError.message }, { status: 500 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDays = new Date(today);
    threeDays.setDate(threeDays.getDate() + 3);
    const sevenDays = new Date(today);
    sevenDays.setDate(sevenDays.getDate() + 7);

    interface Notification {
      id: string;
      type: 'overdue' | 'due_soon' | 'launch_approaching' | 'in_progress';
      severity: 'critical' | 'warning' | 'info';
      title: string;
      title_es: string;
      body: string;
      body_es: string;
      collection: string;
      collection_id: string;
      phase?: string;
      milestone_id?: string;
      created_at: string;
    }

    const notifications: Notification[] = [];

    for (const tl of timelines || []) {
      const plan = plans?.find((p) => p.id === tl.collection_plan_id);
      const collectionLabel = plan ? `${plan.name} ${plan.season || ''}`.trim() : 'Unknown';
      const launchDate = new Date(tl.launch_date);
      const daysUntilLaunch = Math.ceil((launchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      for (const m of tl.milestones || []) {
        const startDate = new Date(tl.launch_date);
        startDate.setDate(startDate.getDate() - m.startWeeksBefore * 7);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + m.durationWeeks * 7);

        // Overdue
        if (endDate < today && m.status !== 'completed') {
          const daysOverdue = Math.ceil((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
          notifications.push({
            id: `overdue-${tl.collection_plan_id}-${m.id}`,
            type: 'overdue',
            severity: daysOverdue > 14 ? 'critical' : 'warning',
            title: m.name,
            title_es: m.nameEs,
            body: `${daysOverdue} days overdue in ${collectionLabel}`,
            body_es: `${daysOverdue} dias de retraso en ${collectionLabel}`,
            collection: collectionLabel,
            collection_id: tl.collection_plan_id,
            phase: m.phase,
            milestone_id: m.id,
            created_at: endDate.toISOString(),
          });
        }

        // Due soon (within 3 days)
        if (endDate >= today && endDate <= threeDays && m.status !== 'completed') {
          const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          notifications.push({
            id: `due-${tl.collection_plan_id}-${m.id}`,
            type: 'due_soon',
            severity: 'warning',
            title: m.name,
            title_es: m.nameEs,
            body: daysLeft === 0 ? `Due today in ${collectionLabel}` : `Due in ${daysLeft} day${daysLeft > 1 ? 's' : ''} in ${collectionLabel}`,
            body_es: daysLeft === 0 ? `Vence hoy en ${collectionLabel}` : `Vence en ${daysLeft} dia${daysLeft > 1 ? 's' : ''} en ${collectionLabel}`,
            collection: collectionLabel,
            collection_id: tl.collection_plan_id,
            phase: m.phase,
            milestone_id: m.id,
            created_at: today.toISOString(),
          });
        }
      }

      // Launch approaching
      if (daysUntilLaunch > 0 && daysUntilLaunch <= 30) {
        notifications.push({
          id: `launch-${tl.collection_plan_id}`,
          type: 'launch_approaching',
          severity: daysUntilLaunch <= 7 ? 'critical' : 'info',
          title: `Launch Day`,
          title_es: `Dia de Lanzamiento`,
          body: `${collectionLabel} launches in ${daysUntilLaunch} day${daysUntilLaunch > 1 ? 's' : ''}`,
          body_es: `${collectionLabel} se lanza en ${daysUntilLaunch} dia${daysUntilLaunch > 1 ? 's' : ''}`,
          collection: collectionLabel,
          collection_id: tl.collection_plan_id,
          created_at: today.toISOString(),
        });
      }
    }

    // Sort: critical first, then warning, then info
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    notifications.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return NextResponse.json({
      notifications,
      unread_count: notifications.length,
    });
  } catch (error) {
    console.error('Notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
