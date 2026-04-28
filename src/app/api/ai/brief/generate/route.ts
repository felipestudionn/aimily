export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAuthOnly, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON, generateText, extractJSON } from '@/lib/ai/llm-client';
import { buildGeneratePrompt } from '@/lib/ai/brief-prompts';
import { loadFullContext } from '@/lib/ai/load-full-context';
import { formatCisPrefix } from '@/lib/ai/cis-prefix';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAuthOnly(user.id, user.email || '');
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const { understood, answers, scenario, marketResearch, language = 'en', collectionPlanId } = await req.json();

    if (!understood || !scenario) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ── CIS context: opt-in for post-creation flows ──
    let cisPrefix = '';
    if (collectionPlanId && typeof collectionPlanId === 'string') {
      try {
        const ctx = await loadFullContext(collectionPlanId);
        cisPrefix = formatCisPrefix(ctx);
      } catch (err) {
        console.warn('[Brief/Generate] loadFullContext failed, falling back:', err);
      }
    }

    const { system, user: userPromptRaw } = buildGeneratePrompt(
      understood, answers || {}, scenario, marketResearch || '', language
    );
    const userPrompt = cisPrefix + userPromptRaw;

    // Try generateJSON first, fall back to generateText + manual extraction
    let data;
    try {
      const result = await generateJSON({
        system,
        user: userPrompt,
        temperature: 0.7,
        maxTokens: 16384,
        language,
      });
      data = result.data;
    } catch (jsonErr) {
      console.error('[Brief/Generate] generateJSON failed, trying text fallback:', jsonErr instanceof Error ? jsonErr.message : jsonErr);
      const textResult = await generateText({
        system,
        user: userPrompt,
        temperature: 0.7,
        maxTokens: 16384,
        language,
      });
      console.log('[Brief/Generate] Raw text (first 500):', textResult.text.slice(0, 500));
      try {
        data = extractJSON(textResult.text);
      } catch {
        return NextResponse.json({
          error: `AI returned non-JSON. First 200 chars: ${textResult.text.slice(0, 200)}`,
        }, { status: 500 });
      }
    }

    return NextResponse.json({ result: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Brief/Generate]', msg);
    return NextResponse.json({ error: `Failed to generate collection: ${msg}` }, { status: 500 });
  }
}
