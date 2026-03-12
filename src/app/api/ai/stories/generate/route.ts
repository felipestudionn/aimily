import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { MARKETING_PROMPTS } from '@/lib/prompts/marketing-prompts';
import { buildPromptContext, renderPrompt } from '@/lib/prompts/prompt-context';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'models/gemini-2.5-flash-lite';

/**
 * POST /api/ai/stories/generate
 * Body: { collectionPlanId, mode: 'generate' | 'assist', userDirection?: string }
 */
export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
  }

  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user!.id, user!.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const body = await req.json();
    const { collectionPlanId, mode = 'generate', userDirection } = body;

    if (!collectionPlanId) {
      return NextResponse.json({ error: 'collectionPlanId is required' }, { status: 400 });
    }

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
    };

    const systemPrompt = template.system;
    const userPrompt = renderPrompt(template.user, flatCtx);

    // Call Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', errText);
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const rawText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Parse JSON from response
    let parsed: { stories: Array<Record<string, unknown>>; rationale?: string };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Try extracting JSON from markdown code block
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        return NextResponse.json(
          { error: 'Failed to parse AI response', raw: rawText },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      stories: parsed.stories,
      rationale: parsed.rationale,
      sku_count: ctx.sku_count,
    });
  } catch (error) {
    console.error('AI stories generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
