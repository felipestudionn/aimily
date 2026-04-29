export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAuthOnly, usageDeniedResponse, verifyCollectionOwnership } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';
import { buildAnalyzePrompt } from '@/lib/ai/brief-prompts';
import { loadFullContext } from '@/lib/ai/load-full-context';
import { formatCisPrefix } from '@/lib/ai/cis-prefix';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAuthOnly(user.id, user.email || '');
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const { brief, language = 'en', collectionPlanId } = await req.json();

    if (!brief || typeof brief !== 'string' || brief.trim().length < 10) {
      return NextResponse.json({ error: 'Brief must be at least 10 characters' }, { status: 400 });
    }

    // ── CIS context: opt-in for post-creation flows (Scenarios sub-block) ──
    let cisPrefix = '';
    if (collectionPlanId && typeof collectionPlanId === 'string') {
      const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
      if (!ownership.authorized) return ownership.error;
      try {
        const ctx = await loadFullContext(collectionPlanId);
        cisPrefix = formatCisPrefix(ctx);
      } catch (err) {
        console.warn('[Brief/Analyze] loadFullContext failed, falling back to brief-only:', err);
      }
    }

    const { system, user: userPrompt } = buildAnalyzePrompt(brief.trim(), language);
    const fullUserPrompt = cisPrefix + userPrompt;

    const { data } = await generateJSON({
      system,
      user: fullUserPrompt,
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
