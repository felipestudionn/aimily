import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAuthOnly, usageDeniedResponse } from '@/lib/api-auth';
import { checkTeamPermission } from '@/lib/team-permissions';
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit-log';
import { MARKETING_PROMPTS } from '@/lib/prompts/marketing-prompts';
import { renderPrompt } from '@/lib/prompts/prompt-context';
import { generateJSON } from '@/lib/ai/llm-client';
import {
  buildPerformanceContext,
  formatPerformanceContextForPrompt,
} from '@/lib/performance-context';
import { loadFullContext, mergeContextWithInput } from '@/lib/ai/load-full-context';

/**
 * AI Paid Media Plan Generation
 * Modes: 'asistido' (user provides budget + objective, AI suggests campaigns)
 *        'propuesta' (AI generates full paid plan)
 */
export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  try {
    const body = await req.json();
    const {
      collectionPlanId,
      brandName,
      drops,
      totalBudget,
      totalSalesTarget,
      targetRoas,
      activePlatforms,
      consumerDemographics,
      consumerPsychographics,
      consumerLifestyle,
      markets,
      userDirection,
      language,
    } = body;

    if (!collectionPlanId) {
      return NextResponse.json({ error: 'collectionPlanId is required' }, { status: 400 });
    }

    // Paid campaigns are financial — require both marketing AI + financial edit rights.
    // The cheaper marketing AI gate runs first.
    const perm = await checkTeamPermission({
      userId: user!.id,
      collectionPlanId,
      permission: 'generate_ai_marketing',
    });
    if (!perm.allowed) return perm.error!;

    const usage = await checkAuthOnly(user!.id, user!.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    // SERVER-SIDE: Load FULL context from CIS + Creative + Brief
    if (collectionPlanId) {
      const serverCtx = await loadFullContext(collectionPlanId);
      const flat: Record<string, string> = {
        collectionName: brandName || '',
        consumer: consumerDemographics || '',
        brandDNA: '',
        vibe: '',
        salesTarget: String(totalSalesTarget || ''),
      };
      mergeContextWithInput(serverCtx, flat);
      // Enrich body fields used in templateContext below
      if (!brandName && flat.collectionName) body.brandName = flat.collectionName;
      if (!consumerDemographics && flat.consumer) body.consumerDemographics = flat.consumer;
    }

    const dropsBlock = (drops || []).map((d: { name: string; launch_date: string; story_alignment?: string; expected_sales_weight?: number }) =>
      `- ${d.name}: ${d.launch_date}, story "${d.story_alignment || 'N/A'}", expected ${d.expected_sales_weight || 0}% of sales`
    ).join('\n');

    // C7 — collect previous favorites to bias toward winners
    const perfSummary = await buildPerformanceContext(collectionPlanId);
    const perfBlock = formatPerformanceContextForPrompt(perfSummary);

    const templateContext: Record<string, unknown> = {
      brand_name: brandName || 'Brand',
      consumer_demographics: consumerDemographics || 'N/A',
      consumer_psychographics: consumerPsychographics || 'N/A',
      consumer_lifestyle: consumerLifestyle || 'N/A',
      markets: markets || 'N/A',
      total_paid_budget: String(totalBudget || 0),
      total_sales_target: String(totalSalesTarget || 0),
      target_roas: String(targetRoas || 4),
      active_platforms: activePlatforms || 'Meta, Google, TikTok',
      user_direction: userDirection || '',
      // C1 — historical conversion gate (forces manual/cost_cap bidding when <50)
      previous_conversions_count: String(perfSummary.total_favorites || 0),
    };

    let userPrompt = renderPrompt(MARKETING_PROMPTS.paid_plan.user, templateContext);
    if (perfBlock) {
      userPrompt = `${userPrompt}\n\n${perfBlock}`;
    }

    // Replace drops each block manually (renderPrompt handles simple {{#each}} but drops are passed inline)
    const dropsEachRegex = /\{\{#each drops\}\}[\s\S]*?\{\{\/each\}\}/;
    userPrompt = userPrompt.replace(dropsEachRegex, dropsBlock);

    // Replace user direction conditional
    const directionRegex = /\{\{#if user_direction\}\}[\s\S]*?\{\{\/if\}\}/;
    userPrompt = userPrompt.replace(
      directionRegex,
      userDirection ? `USER DIRECTION: ${userDirection}` : ''
    );

    const { data, model, fallback } = await generateJSON({
      system: MARKETING_PROMPTS.paid_plan.system,
      user: userPrompt,
      temperature: 0.65,
      language,
    });

    logAudit({
      userId: user!.id,
      collectionPlanId,
      action: AUDIT_ACTIONS.MARKETING_AI_PAID,
      entityType: 'collection_plan',
      entityId: collectionPlanId,
      metadata: {
        model,
        fallback,
        total_budget: totalBudget,
        target_roas: targetRoas,
        drop_count: drops?.length ?? 0,
        language,
      },
    });

    return NextResponse.json({ ...(data as Record<string, unknown>), model, fallback });
  } catch (error) {
    console.error('Paid plan generation error', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
