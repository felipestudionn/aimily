import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { MARKETING_PROMPTS } from '@/lib/prompts/marketing-prompts';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'models/gemini-2.5-flash-lite';

/**
 * AI Content Calendar Generation
 * Modes: 'asistido' (user gives direction + drops, AI suggests calendar)
 *        'propuesta' (AI generates full editorial calendar from date range)
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
      drops,
      commercialActions,
      stories,
      // Asistido
      userDirection,
      // Propuesta
      startDate,
      endDate,
      platforms,
    } = body;

    const dropsBlock = (drops || []).map((d: any) =>
      `- ${d.name}: launches ${d.launch_date}, story "${d.story_alignment || 'N/A'}"`
    ).join('\n');

    const actionsBlock = (commercialActions || []).map((a: any) =>
      `- ${a.name} (${a.type}): ${a.date}`
    ).join('\n');

    const storiesBlock = (stories || []).map((s: any) =>
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

    const prompt = `${MARKETING_PROMPTS.calendar_generate.system}

GTM TIMELINE:
${dropsBlock || 'No drops defined yet.'}

COMMERCIAL ACTIONS:
${actionsBlock || 'No commercial actions defined yet.'}

STORIES:
${storiesBlock || 'No stories defined yet.'}

${userInput}

RULES:
1. Build anticipation: teasing → reveal → launch → sustain
2. Pre-drop: 2-3 weeks of teasing content
3. Drop day: multiple posts across platforms
4. Post-drop: 1-2 weeks of lifestyle, UGC reposts, styling content
5. Mix content types: product, lifestyle, behind-the-scenes, styling tips
6. Pair each post with the best asset type
7. Include email sends aligned with drops
8. Generate 20-40 entries for a full calendar

OUTPUT (JSON only):
{
  "calendar_entries": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "platform": "instagram | tiktok | pinterest | facebook | email",
      "type": "post | story | reel | email | blog | ad | pr",
      "story_name": "Story this relates to",
      "title": "Internal title",
      "caption": "Full caption text",
      "hashtags": ["hashtag1", "hashtag2"],
      "asset_suggestion": "Which type of visual to use",
      "campaign_tag": "drop-1-teasing | drop-1-launch | etc.",
      "pillar_alignment": "Which content pillar this serves"
    }
  ],
  "weekly_summary": "Overview of content strategy by week"
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
      console.error('Failed to parse calendar plan', textResponse);
      return NextResponse.json({ error: 'Failed to parse AI response', raw: textResponse }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Calendar generation error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
