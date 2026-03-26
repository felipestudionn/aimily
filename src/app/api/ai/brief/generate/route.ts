export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';
import { buildGeneratePrompt } from '@/lib/ai/brief-prompts';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email || '');
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const { understood, answers, scenario, marketResearch, language = 'en' } = await req.json();

    if (!understood || !scenario) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { system, user: userPrompt } = buildGeneratePrompt(
      understood, answers || {}, scenario, marketResearch || '', language
    );

    const { data } = await generateJSON({
      system,
      user: userPrompt,
      temperature: 0.8,
      maxTokens: 8192,
      language,
    });

    return NextResponse.json({ result: data });
  } catch (err) {
    console.error('[Brief/Generate]', err);
    return NextResponse.json({ error: 'Failed to generate collection' }, { status: 500 });
  }
}
