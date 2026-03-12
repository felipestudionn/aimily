import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { MARKETING_PROMPTS } from '@/lib/prompts/marketing-prompts';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'models/gemini-2.5-flash-lite';

/**
 * AI Paid Media Plan Generation
 * Modes: 'asistido' (user provides budget + objective, AI suggests campaigns)
 *        'propuesta' (AI generates full paid plan)
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
      // Asistido
      userDirection,
    } = body;

    const dropsBlock = (drops || []).map((d: { name: string; launch_date: string; story_alignment?: string; expected_sales_weight?: number }) =>
      `- ${d.name}: ${d.launch_date}, story "${d.story_alignment || 'N/A'}", expected ${d.expected_sales_weight || 0}% of sales`
    ).join('\n');

    let promptTemplate: string = MARKETING_PROMPTS.paid_plan.user;

    // Simple template replacement
    promptTemplate = promptTemplate
      .replace('{{brand_name}}', brandName || 'Brand')
      .replace('{{consumer_demographics}}', consumerDemographics || 'N/A')
      .replace('{{consumer_psychographics}}', consumerPsychographics || 'N/A')
      .replace('{{consumer_lifestyle}}', consumerLifestyle || 'N/A')
      .replace('{{markets}}', markets || 'N/A')
      .replace('{{total_paid_budget}}', String(totalBudget || 0))
      .replace('{{total_sales_target}}', String(totalSalesTarget || 0))
      .replace('{{target_roas}}', String(targetRoas || 4))
      .replace('{{active_platforms}}', activePlatforms || 'Meta, Google, TikTok');

    // Replace drops block (handlebars-style each)
    const dropsEachRegex = /\{\{#each drops\}\}[\s\S]*?\{\{\/each\}\}/;
    promptTemplate = promptTemplate.replace(dropsEachRegex, dropsBlock);

    // Replace user direction conditional
    const directionRegex = /\{\{#if user_direction\}\}[\s\S]*?\{\{\/if\}\}/;
    promptTemplate = promptTemplate.replace(
      directionRegex,
      userDirection ? `USER DIRECTION: ${userDirection}` : ''
    );

    const prompt = `${MARKETING_PROMPTS.paid_plan.system}\n\n${promptTemplate}`;

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
      console.error('Failed to parse paid plan', textResponse);
      return NextResponse.json({ error: 'Failed to parse AI response', raw: textResponse }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Paid plan generation error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
