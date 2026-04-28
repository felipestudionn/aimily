import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAuthOnly, usageDeniedResponse } from '@/lib/api-auth';
import { checkTeamPermission } from '@/lib/team-permissions';
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit-log';
import { MARKETING_PROMPTS } from '@/lib/prompts/marketing-prompts';
import { buildPromptContext, renderPrompt } from '@/lib/prompts/prompt-context';
import { generateJSON } from '@/lib/ai/llm-client';

/**
 * AI Launch Plan Generation
 * Modes: 'asistido' (user defines launch date + channels, AI suggests tasks)
 *        'propuesta' (AI generates full launch checklist)
 */
export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  try {
    const body = await req.json();
    const {
      mode,
      collectionPlanId,
      launchDate,
      channels,
      userDirection,
      existingTasks,
      language,
    } = body;

    if (!collectionPlanId) {
      return NextResponse.json({ error: 'collectionPlanId is required' }, { status: 400 });
    }

    const perm = await checkTeamPermission({
      userId: user!.id,
      collectionPlanId,
      permission: 'generate_ai_marketing',
    });
    if (!perm.allowed) return perm.error!;

    const usage = await checkAuthOnly(user!.id, user!.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    // Build real context from all collection data
    const context = collectionPlanId
      ? await buildPromptContext(collectionPlanId)
      : null;

    const templateContext: Record<string, unknown> = {
      brand_name: context?.brand_name ?? '',
      season: context?.season ?? 'Current',
      launch_date: launchDate || context?.launch_date || 'TBD',
      channels: channels || context?.channels?.join(', ') || 'DTC',
      sku_count: context?.sku_count ?? 0,
      stories_count: context?.stories?.length ?? 0,
      drops: context?.drops ?? [],
      commercial_actions: context?.commercial_actions ?? [],
      render_count: context?.render_count ?? 0,
      video_count: context?.video_count ?? 0,
      copy_count: context?.copy_count ?? 0,
      email_template_count: context?.email_template_count ?? 0,
      calendar_entries_count: context?.calendar_entries_count ?? 0,
      user_direction: userDirection || '',
    };

    const promptTemplate = renderPrompt(MARKETING_PROMPTS.launch_checklist.user, templateContext);

    let userInput = '';
    if (mode === 'asistido') {
      userInput = `\n\nMODE: ASSISTED
The user wants tasks for a launch on ${launchDate || 'TBD'} via channels: ${channels || 'DTC'}.
${userDirection ? `User direction: ${userDirection}` : ''}
${existingTasks?.length ? `Already have ${existingTasks.length} tasks — suggest complementary ones.` : ''}`;
    } else {
      userInput = `\n\nMODE: FULL PROPOSAL
Generate a comprehensive launch checklist covering pre-launch, launch day, and post-launch phases.
Launch date: ${launchDate || 'TBD'}
Channels: ${channels || 'Instagram, TikTok, Email, Website'}`;
    }

    const { data, model, fallback } = await generateJSON({
      system: MARKETING_PROMPTS.launch_checklist.system,
      user: `${promptTemplate}${userInput}`,
      temperature: 0.6,
      language,
    });

    logAudit({
      userId: user!.id,
      collectionPlanId,
      action: AUDIT_ACTIONS.MARKETING_AI_LAUNCH,
      entityType: 'collection_plan',
      entityId: collectionPlanId,
      metadata: { mode, model, fallback, launch_date: launchDate, channels, language },
    });

    return NextResponse.json({ ...(data as Record<string, unknown>), model, fallback });
  } catch (error) {
    console.error('Launch plan generation error', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
