import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';
import { buildDesignPrompt } from '@/lib/ai/design-prompts';

/* ═══════════════════════════════════════════════════════════
   Design & Dev Block — AI Generation Endpoint
   4 prompt types · Claude Haiku primary, Gemini fallback
   ═══════════════════════════════════════════════════════════ */

type GenerationType =
  | 'sketch-suggest'
  | 'color-suggest'
  | 'materials-suggest'
  | 'catalog-description';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  const body = await req.json().catch(() => null);
  if (!body?.type) {
    return NextResponse.json({ error: 'Missing "type" in request body' }, { status: 400 });
  }

  const type = body.type as GenerationType;
  const input = (body.input || {}) as Record<string, string>;

  const prompt = buildDesignPrompt(type, input);
  if (!prompt) {
    return NextResponse.json({ error: `Unknown generation type: ${type}` }, { status: 400 });
  }

  try {
    const { data, model, fallback } = await generateJSON({
      system: prompt.system,
      user: prompt.user,
      temperature: prompt.temperature,
    });
    return NextResponse.json({ result: data, model, fallback });
  } catch (error) {
    console.error('Design generation error:', error);
    const message = error instanceof Error ? error.message : 'AI generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
