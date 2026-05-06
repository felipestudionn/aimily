import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createDefaultTimeline } from '@/lib/timeline-template';
import { getPlanLimits, PlanId } from '@/lib/stripe';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { recordDecisions } from '@/lib/collection-intelligence';

const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'it', 'de', 'pt', 'nl', 'sv', 'no'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function isSupportedLanguage(v: unknown): v is SupportedLanguage {
  return typeof v === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(v);
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const body = await req.json();
    const {
      name: providedName,
      description,
      season: providedSeason,
      location,
      launch_date,
      milestones: customMilestones,
      untitledLabel,
    } = body;

    const user_id = user.id;

    // Disruptive entry: the only required field is launch_date. Name and
    // season are auto-derived if absent — the user names the collection
    // inline once inside the tool.
    const launchIso = launch_date || '2027-02-01';
    const launchDateObj = new Date(launchIso);
    const seasonAuto = (() => {
      const m = launchDateObj.getMonth();
      const isFW = m >= 7;
      return `${isFW ? 'FW' : 'SS'}${String(launchDateObj.getFullYear()).slice(2)}`;
    })();
    const season = providedSeason || seasonAuto;

    // i18n-friendly default name. The frontend ALWAYS passes a localized
    // `untitledLabel` from the user's i18n dictionary; we accept it on the
    // body as the fallback prefix when the user opted to skip naming.
    // English fallback if neither name nor untitledLabel is sent (no
    // hardcoded Spanish on the server).
    const fallbackPrefix = (typeof untitledLabel === 'string' && untitledLabel.trim().length > 0)
      ? untitledLabel.trim()
      : 'Untitled';
    const name = providedName?.trim() || `${fallbackPrefix} · ${season}`;

    // Check collection limit
    {
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

    // setup_data is intentionally NOT set on insert — it's now a derived
    // view (see src/lib/derive-setup-data.ts). The column is preserved
    // only as the carrier for the post-launch cron's analysis blob.
    const { data, error } = await supabaseAdmin
      .from('collection_plans')
      .insert({
        name,
        description,
        season,
        location,
        user_id,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving plan:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Reuse the launchIso computed above. Milestones either come from
    // a wizard payload (legacy) or get auto-generated from the template.
    const finalMilestones = customMilestones
      ? customMilestones
      : createDefaultTimeline(name, season, launchIso).milestones;

    const { error: timelineError } = await supabaseAdmin
      .from('collection_timelines')
      .insert({
        collection_plan_id: data.id,
        launch_date: launchIso,
        milestones: finalMilestones,
      });

    if (timelineError) {
      console.error('Error creating default timeline:', timelineError);
    }

    // CIS seed capture — every new collection records its identity tuple
    // (name, season, launch_date) + the user's chosen language as decisions
    // so downstream AI prompts and consumers always see the seed signals
    // without re-querying the plan row. Race-safe via recordDecisions
    // (sequential by design — see collection-intelligence.ts:157-164).
    const userLanguage = isSupportedLanguage(user.user_metadata?.language)
      ? user.user_metadata.language
      : null;

    const seedDecisions: Parameters<typeof recordDecisions>[0] = [
      {
        collectionPlanId: data.id,
        userId: user_id,
        sourcePhase: 'creative',
        sourceComponent: 'NewCollectionWizard',
        domain: 'identity',
        subdomain: 'collection',
        key: 'name',
        value: name,
        tags: ['seed'],
      },
      {
        collectionPlanId: data.id,
        userId: user_id,
        sourcePhase: 'creative',
        sourceComponent: 'NewCollectionWizard',
        domain: 'identity',
        subdomain: 'collection',
        key: 'season',
        value: season,
        tags: ['seed'],
      },
      {
        collectionPlanId: data.id,
        userId: user_id,
        sourcePhase: 'creative',
        sourceComponent: 'NewCollectionWizard',
        domain: 'identity',
        subdomain: 'collection',
        key: 'launch_date',
        value: launchIso,
        tags: ['seed'],
      },
    ];

    if (userLanguage) {
      seedDecisions.push({
        collectionPlanId: data.id,
        userId: user_id,
        sourcePhase: 'creative',
        sourceComponent: 'NewCollectionWizard',
        domain: 'identity',
        subdomain: 'user',
        key: 'language',
        value: userLanguage,
        tags: ['seed'],
      });
    }

    // Fire-and-forget: a CIS write failure should not abort the create
    // response. The plan row + timeline are already committed above.
    recordDecisions(seedDecisions).catch((err: unknown) =>
      console.error('[planner/create] CIS seed capture failed:', err)
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Create plan error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
