import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { checkTeamPermission } from '@/lib/team-permissions';
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit-log';
import { MARKETING_PROMPTS } from '@/lib/prompts/marketing-prompts';
import { renderPrompt, buildPromptContext } from '@/lib/prompts/prompt-context';
import { generateJSON } from '@/lib/ai/llm-client';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * C6 — Post-launch analysis generation.
 *
 * Analyzes launch performance against predictions and generates actionable
 * recommendations for next season. Built on the post_launch_analysis prompt
 * from the registry.
 *
 * V1 (pre-analytics): uses the data available today — SKU sales weights,
 * drops configuration, story alignment — plus whatever performance_data
 * the caller passes. When real analytics land, buildPerformanceContext from
 * C7 can feed richer signals into this prompt without changing the route.
 *
 * Called from:
 *   - LaunchCard "Generate retrospective" button (user-initiated)
 *   - /api/cron/post-launch-analysis (auto, 7+ days after launch_date)
 */
export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  try {
    const body = await req.json();
    const {
      collectionPlanId,
      salesSummary,
      predictionsVsActual,
      language,
    } = body as {
      collectionPlanId?: string;
      salesSummary?: string;
      predictionsVsActual?: string;
      language?: 'en' | 'es';
    };

    if (!collectionPlanId) {
      return NextResponse.json({ error: 'collectionPlanId is required' }, { status: 400 });
    }

    const perm = await checkTeamPermission({
      userId: user!.id,
      collectionPlanId,
      permission: 'generate_ai_marketing',
    });
    if (!perm.allowed) return perm.error!;

    const usage = await checkAIUsage(user!.id, user!.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    const ctx = await buildPromptContext(collectionPlanId);

    const storiesBlock = ctx.stories.map((s) => ({
      name: s.name,
      story_sales_summary: `${s.sku_ids.length} SKUs`,
    }));

    const flatCtx: Record<string, unknown> = {
      brand_name: ctx.brand_name,
      season: ctx.season,
      launch_date: ctx.launch_date,
      sales_summary: salesSummary || 'No sales data provided yet — best-effort assessment.',
      predictions_vs_actual:
        predictionsVsActual || 'No prediction data provided yet.',
      stories: storiesBlock,
    };

    const { data, model, fallback } = await generateJSON({
      system: MARKETING_PROMPTS.post_launch_analysis.system,
      user: renderPrompt(MARKETING_PROMPTS.post_launch_analysis.user, flatCtx),
      temperature: 0.5,
      maxTokens: 4096,
      language,
    });

    // Persist the analysis back to the plan so it's visible across sessions.
    // We store it in setup_data.post_launch_analysis so it lives alongside
    // the rest of the setup metadata and is already serialized to JSONB.
    try {
      const { data: plan } = await supabaseAdmin
        .from('collection_plans')
        .select('setup_data')
        .eq('id', collectionPlanId)
        .single();

      const nextSetup = {
        ...((plan?.setup_data as Record<string, unknown>) ?? {}),
        post_launch_analysis: {
          generated_at: new Date().toISOString(),
          result: data,
        },
      };

      await supabaseAdmin
        .from('collection_plans')
        .update({ setup_data: nextSetup })
        .eq('id', collectionPlanId);
    } catch (err) {
      console.error('[Post-launch] Persist failed:', err);
    }

    logAudit({
      userId: user!.id,
      collectionPlanId,
      action: AUDIT_ACTIONS.MARKETING_AI_LAUNCH,
      entityType: 'collection_plan',
      entityId: collectionPlanId,
      metadata: {
        subtype: 'post_launch_analysis',
        model,
        fallback,
        language,
      },
    });

    return NextResponse.json({ result: data, model, fallback });
  } catch (error) {
    console.error('Post-launch analysis error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
