export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';
import { buildAnalyzePrompt } from '@/lib/ai/brief-prompts';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email || '');
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const { brief, language = 'en' } = await req.json();

    if (!brief || typeof brief !== 'string' || brief.trim().length < 10) {
      return NextResponse.json({ error: 'Brief must be at least 10 characters' }, { status: 400 });
    }

    const { system, user: userPrompt } = buildAnalyzePrompt(brief.trim(), language);

    const { data } = await generateJSON({
      system,
      user: userPrompt,
      temperature: 0.7,
      maxTokens: 4096,
      language,
    });

    return NextResponse.json({ result: data });
  } catch (err) {
    console.error('[Brief/Analyze]', err);
    return NextResponse.json({ error: 'Failed to analyze brief' }, { status: 500 });
  }
}
