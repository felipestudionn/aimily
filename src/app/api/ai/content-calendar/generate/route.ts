import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { MARKETING_PROMPTS } from '@/lib/prompts/marketing-prompts';
import { generateJSON } from '@/lib/ai/llm-client';

/**
 * AI Content Calendar Generation
 * Modes: 'asistido' (user gives direction + drops, AI suggests calendar)
 *        'propuesta' (AI generates full editorial calendar from date range)
 */
export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const body = await req.json();
    const {
      mode,
      drops,
      commercialActions,
      stories,
      userDirection,
      startDate,
      endDate,
      platforms,
      language,
    } = body;

    const dropsBlock = (drops || []).map((d: { name: string; launch_date: string; story_alignment?: string }) =>
      `- ${d.name}: launches ${d.launch_date}, story "${d.story_alignment || 'N/A'}"`
    ).join('\n');

    const actionsBlock = (commercialActions || []).map((a: { name: string; type: string; date: string }) =>
      `- ${a.name} (${a.type}): ${a.date}`
    ).join('\n');

    const storiesBlock = (stories || []).map((s: { name: string; mood?: string }) =>
      `- "${s.name}": ${s.mood || 'N/A'}`
    ).join('\n');

    let userInput = '';
    if (mode === 'asistido') {
      userInput = `MODE: ASSISTED — Generate a content calendar aligned with the GTM drops below.
${userDirection ? `USER DIRECTION: ${userDirection}` : ''}
Use the drops as anchor points. Create teasing content 2-3 weeks before each drop, launch day content, and sustain content after.`;
    } else {
      userInput = `MODE: FULL PROPOSAL — Generate a complete editorial content calendar.
CALENDAR PERIOD: ${startDate} to ${endDate}
ACTIVE PLATFORMS: ${platforms || 'instagram, tiktok, email'}
Create a comprehensive content plan covering the full period.`;
    }

    const userPrompt = `${MARKETING_PROMPTS.calendar_generate.system}

GTM TIMELINE:
${dropsBlock || 'No drops defined yet.'}

COMMERCIAL ACTIONS:
${actionsBlock || 'No commercial actions defined yet.'}

STORIES:
${storiesBlock || 'No stories defined yet.'}

${userInput}`;

    const { data, model, fallback } = await generateJSON({
      system: MARKETING_PROMPTS.calendar_generate.system,
      user: userPrompt,
      temperature: 0.75,
      maxTokens: 8192,
      language,
    });

    return NextResponse.json({ ...(data as Record<string, unknown>), model, fallback });
  } catch (error) {
    console.error('Calendar generation error', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
