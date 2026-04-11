import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { checkTeamPermission } from '@/lib/team-permissions';
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit-log';
import { MARKETING_PROMPTS } from '@/lib/prompts/marketing-prompts';
import { buildPromptContext, renderPrompt } from '@/lib/prompts/prompt-context';
import { generateJSON } from '@/lib/ai/llm-client';

/**
 * POST /api/ai/stories/generate
 * Body: { collectionPlanId, mode: 'generate' | 'assist', userDirection?: string }
 */
export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  try {
    const body = await req.json();
    const {
      collectionPlanId,
      mode = 'generate',
      userDirection,
      consumerSignals,
      language,
    } = body as {
      collectionPlanId?: string;
      mode?: 'generate' | 'assist';
      userDirection?: string;
      consumerSignals?: string[] | string;
      language?: 'en' | 'es';
    };

    if (!collectionPlanId) {
      return NextResponse.json({ error: 'collectionPlanId is required' }, { status: 400 });
    }

    // Team permission check (also verifies the collection exists + user has access)
    const perm = await checkTeamPermission({
      userId: user!.id,
      collectionPlanId,
      permission: 'generate_ai_marketing',
    });
    if (!perm.allowed) return perm.error!;

    // Plan-level AI usage check (billing)
    const usage = await checkAIUsage(user!.id, user!.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    // Build full context from all blocks
    const ctx = await buildPromptContext(collectionPlanId);

    // Choose prompt template
    const template = mode === 'assist'
      ? MARKETING_PROMPTS.stories_assist
      : MARKETING_PROMPTS.stories_generate;

    // Flatten context for template rendering
    const flatCtx: Record<string, unknown> = {
      season: ctx.season,
      brand_name: ctx.brand_name,
      brand_voice_tone: ctx.brand_dna.voice.tone,
      brand_voice_personality: ctx.brand_dna.voice.personality,
      brand_values: ctx.brand_dna.values.join(', '),
      collection_vibe: ctx.collection_vibe,
      consumer_demographics: ctx.consumer_profile.demographics,
      consumer_psychographics: ctx.consumer_profile.psychographics,
      consumer_lifestyle: ctx.consumer_profile.lifestyle,
      selected_trends: ctx.selected_trends.join(', '),
      moodboard_summary: ctx.moodboard_summary,
      reference_brands: ctx.reference_brands.join(', '),
      sku_count: ctx.sku_count,
      sku_list_json: JSON.stringify(
        ctx.skus.map(s => ({
          id: s.id,
          name: s.name,
          family: s.family,
          subcategory: s.subcategory,
          pvp: s.pvp,
          colorways: s.colorways,
          type: s.type,
          novelty: s.novelty,
        })),
        null,
        2
      ),
      user_direction: userDirection || '',
      consumer_signals: Array.isArray(consumerSignals)
        ? consumerSignals.map((s) => `- ${s}`).join('\n')
        : consumerSignals || '',
    };

    const systemPrompt = template.system;
    const userPrompt = renderPrompt(template.user, flatCtx);

    const { data, model, fallback } = await generateJSON<{ stories: Array<Record<string, unknown>>; rationale?: string }>({
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.8,
      language,
    });

    // Fire-and-forget audit of the billed AI event
    logAudit({
      userId: user!.id,
      collectionPlanId,
      action: AUDIT_ACTIONS.MARKETING_AI_STORIES,
      entityType: 'collection_plan',
      entityId: collectionPlanId,
      metadata: { mode, model, fallback, sku_count: ctx.sku_count, language },
    });

    return NextResponse.json({
      stories: data.stories,
      rationale: data.rationale,
      sku_count: ctx.sku_count,
      model,
      fallback,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const stack = error instanceof Error ? error.stack : undefined;
    // Structured error log — shows up in Vercel runtime logs with enough
    // context to diagnose without redeploying.
    console.error('[ai/stories/generate] FAILED', {
      message,
      stack,
      name: error instanceof Error ? error.name : typeof error,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
