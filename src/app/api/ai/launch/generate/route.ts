import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { MARKETING_PROMPTS } from '@/lib/prompts/marketing-prompts';
import { buildPromptContext, renderPrompt } from '@/lib/prompts/prompt-context';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'models/gemini-2.5-flash-lite';

/**
 * AI Launch Plan Generation
 * Modes: 'asistido' (user defines launch date + channels, AI suggests tasks)
 *        'propuesta' (AI generates full launch checklist)
 */
export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
  }

  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const body = await req.json();
    const {
      mode, // 'asistido' | 'propuesta'
      collectionPlanId,
      launchDate,
      channels,
      // Asistido
      userDirection,
      existingTasks,
    } = body;

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

    const prompt = `${MARKETING_PROMPTS.launch_checklist.system}\n\n${promptTemplate}${userInput}

IMPORTANT: Output valid JSON only. Structure:
{
  "categories": [
    {
      "name": "pre-launch" | "launch-day" | "post-launch",
      "items": [
        {
          "task": "Task description",
          "priority": "critical" | "important" | "nice_to_have",
          "deadline_days_before_launch": number,
          "depends_on": "What must be done first"
        }
      ]
    }
  ]
}`;

    const url = new URL(`https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent`);
    url.searchParams.set('key', GEMINI_API_KEY);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error', response.status, errorText);
      return NextResponse.json({ error: 'Gemini API error', details: errorText }, { status: 500 });
    }

    const data = await response.json();
    const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let result;
    try {
      const firstBrace = textResponse.indexOf('{');
      const lastBrace = textResponse.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        result = JSON.parse(textResponse.slice(firstBrace, lastBrace + 1));
      } else {
        result = JSON.parse(textResponse);
      }
    } catch {
      console.error('Failed to parse launch plan', textResponse);
      return NextResponse.json({ error: 'Failed to parse AI response', raw: textResponse }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Launch plan generation error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
