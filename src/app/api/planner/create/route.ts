import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createDefaultTimeline } from '@/lib/timeline-template';
import { ADMIN_EMAILS, getPlanLimits, PlanId } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      season,
      location,
      setup_data,
      user_id,
      launch_date,
      milestones: customMilestones,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Check collection limit
    if (user_id) {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('plan, status, trial_ends_at, is_admin')
        .eq('user_id', user_id)
        .single();

      const isAdmin = sub?.is_admin || false;

      if (!isAdmin) {
        // Trial expiration check
        if (sub?.plan === 'trial' && sub?.trial_ends_at && new Date(sub.trial_ends_at) < new Date()) {
          return NextResponse.json(
            { error: 'Your trial has expired. Choose a plan to create collections.' },
            { status: 403 }
          );
        }

        const plan = (sub?.plan || 'trial') as PlanId;
        const limits = getPlanLimits(plan);

        if (limits.collections !== -1) {
          const { count } = await supabaseAdmin
            .from('collection_plans')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id);

          if ((count || 0) >= limits.collections) {
            return NextResponse.json(
              { error: `Your ${plan} plan allows ${limits.collections} collection${(limits.collections as number) === 1 ? '' : 's'}. Upgrade to create more.` },
              { status: 403 }
            );
          }
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('collection_plans')
      .insert({
        name,
        description,
        season,
        location,
        setup_data: setup_data || {},
        user_id,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving plan:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Use wizard-provided launch_date and milestones, or fall back to defaults
    const finalLaunchDate = launch_date || '2027-02-01';
    const finalMilestones = customMilestones
      ? customMilestones
      : createDefaultTimeline(name, season || 'SS27', finalLaunchDate).milestones;

    const { error: timelineError } = await supabaseAdmin
      .from('collection_timelines')
      .insert({
        collection_plan_id: data.id,
        launch_date: finalLaunchDate,
        milestones: finalMilestones,
      });

    if (timelineError) {
      console.error('Error creating default timeline:', timelineError);
    }

    // CIS: capture initial collection plan decisions from setup_data (fire-and-forget)
    if (data && setup_data && user_id) {
      const { recordDecisions } = await import('@/lib/collection-intelligence');
      const base = { collectionPlanId: data.id, sourcePhase: 'merchandising', sourceComponent: 'CollectionWizard', userId: user_id };
      const decisions: Parameters<typeof recordDecisions>[0] = [];

      if (setup_data.total_sales_target != null) {
        decisions.push({ ...base, domain: 'merchandising', subdomain: 'budget', key: 'total_sales_target', value: setup_data.total_sales_target, tags: ['affects_pricing', 'affects_finance'] });
      }
      if (setup_data.avg_price_target != null) {
        decisions.push({ ...base, domain: 'merchandising', subdomain: 'pricing', key: 'avg_price_target', value: setup_data.avg_price_target, tags: ['affects_pricing', 'affects_production'] });
      }
      if (setup_data.price_range) {
        decisions.push({ ...base, domain: 'merchandising', subdomain: 'pricing', key: 'price_range', value: setup_data.price_range, tags: ['affects_pricing', 'affects_production'] });
      }
      if (setup_data.families?.length) {
        decisions.push({ ...base, domain: 'merchandising', subdomain: 'structure', key: 'families_selected', value: setup_data.families, tags: ['affects_production', 'affects_content'] });
      }

      if (decisions.length > 0) {
        recordDecisions(decisions).catch((err: unknown) => console.error('[CIS] planner create capture failed:', err));
      }
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
