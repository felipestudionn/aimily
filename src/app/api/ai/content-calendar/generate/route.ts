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
 * AI Content Calendar Generation
 * Modes:
 *   - 'asistido'       user direction + drops, AI suggests calendar
 *   - 'propuesta'      AI generates full editorial calendar from date range
 *   - 'atom_repurpose' takes ONE pillar asset and generates 5-10 atoms
 *                      distributed over N days (C2)
 */
export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  try {
    const body = await req.json();
    const {
      collectionPlanId,
      mode,
      drops,
      commercialActions,
      stories,
      userDirection,
      startDate,
      endDate,
      platforms,
      language,
      // C2 — atom_repurpose inputs
      pillarType,
      pillarDescription,
      pillarNotes,
      distributionDays,
      brandName,
      brandVoiceSummary,
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

    // SERVER-SIDE: Load FULL context from CIS + Creative + Brief
    if (collectionPlanId) {
      const serverCtx = await loadFullContext(collectionPlanId);
      const flat: Record<string, string> = {
        collectionName: brandName || '',
        brandVoice: brandVoiceSummary || '',
        consumer: '',
        vibe: '',
        brandDNA: '',
        contentPillars: '',
        stories: '',
      };
      mergeContextWithInput(serverCtx, flat);
      // Enrich body fields used in prompt building below
      if (!brandName && flat.collectionName) body.brandName = flat.collectionName;
      if (!brandVoiceSummary && flat.brandVoice) body.brandVoiceSummary = flat.brandVoice;
    }

    // C2 — atom repurpose mode. Uses the calendar_atom_repurpose prompt
    // from the registry with its own shape (atoms[], not calendar_entries[]).
    if (mode === 'atom_repurpose') {
      /* Read from `body` to pick up server-side enrichment from
         loadFullContext above; the destructured consts captured the
         original (possibly empty) payload. */
      const flatCtx = {
        brand_name: body.brandName || 'Brand',
        brand_voice_summary: body.brandVoiceSummary || '',
        pillar_type: pillarType || 'photo_set',
        pillar_description: pillarDescription || '',
        pillar_notes: pillarNotes || '',
        distribution_days: distributionDays ?? 14,
        active_platforms: platforms || 'instagram, tiktok, email',
      };
      const { data, model, fallback } = await generateJSON({
        system: MARKETING_PROMPTS.calendar_atom_repurpose.system,
        user: renderPrompt(MARKETING_PROMPTS.calendar_atom_repurpose.user, flatCtx),
        temperature: 0.8,
        maxTokens: 6144,
        language,
      });

      logAudit({
        userId: user!.id,
        collectionPlanId,
        action: AUDIT_ACTIONS.MARKETING_AI_CONTENT_CALENDAR,
        entityType: 'collection_plan',
        entityId: collectionPlanId,
        metadata: {
          mode: 'atom_repurpose',
          model,
          fallback,
          pillar_type: pillarType,
          language,
        },
      });

      return NextResponse.json({ ...(data as Record<string, unknown>), model, fallback });
    }

    // C7 — perf signals from previous favorited generations
    const perfSummary = await buildPerformanceContext(collectionPlanId);
    const perfBlock = formatPerformanceContextForPrompt(perfSummary);

    /* Render the calendar_generate.user template via renderPrompt so
       every {{placeholder}} (brand_name, brand_voice_summary, drops
       #each, commercial_actions #each, stories #each, start/end_date,
       user_direction #if) is filled from the same flat context. The
       previous implementation glued strings by hand and re-injected the
       SYSTEM prompt as the user message — every template placeholder
       was silently dropped. */
    const flatCtx: Record<string, unknown> = {
      brand_name: body.brandName || 'Brand',
      brand_voice_summary: body.brandVoiceSummary || '',
      content_pillars_list: body.contentPillarsList || '',
      active_platforms: platforms || 'instagram, tiktok, email',
      drops: (drops || []).map((d: { name: string; launch_date: string; story_alignment?: string }) => ({
        name: d.name,
        launch_date: d.launch_date,
        story_alignment: d.story_alignment || 'N/A',
      })),
      commercial_actions: (commercialActions || []).map((a: { name: string; type: string; date: string }) => ({
        name: a.name,
        type: a.type,
        date: a.date,
      })),
      stories: (stories || []).map((s: { name: string; mood?: string }) => ({
        name: s.name,
        mood: s.mood || 'N/A',
      })),
      start_date: startDate || '',
      end_date: endDate || '',
      user_direction: mode === 'asistido' ? (userDirection || '') : '',
    };

    const modeDirective = mode === 'asistido'
      ? `MODE: ASSISTED — anchor the calendar on the GTM drops above. Build teasing content 2-3 weeks before each drop, launch-day content, and sustain content after.`
      : `MODE: FULL PROPOSAL — build a comprehensive editorial calendar covering the full period regardless of how many drops are defined.`;

    const userPrompt = `${renderPrompt(MARKETING_PROMPTS.calendar_generate.user, flatCtx)}

${modeDirective}${perfBlock ? `\n\n${perfBlock}` : ''}`;

    const { data, model, fallback } = await generateJSON({
      system: MARKETING_PROMPTS.calendar_generate.system,
      user: userPrompt,
      temperature: 0.75,
      maxTokens: 8192,
      language,
    });

    logAudit({
      userId: user!.id,
      collectionPlanId,
      action: AUDIT_ACTIONS.MARKETING_AI_CONTENT_CALENDAR,
      entityType: 'collection_plan',
      entityId: collectionPlanId,
      metadata: { mode, model, fallback, drop_count: drops?.length ?? 0, language },
    });

    return NextResponse.json({ ...(data as Record<string, unknown>), model, fallback });
  } catch (error) {
    console.error('Calendar generation error', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
