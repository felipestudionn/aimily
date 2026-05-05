/* POST /api/ai/seo-keywords
   Body: { collectionPlanId }
   Returns: { keywords: [{ term, intent, difficulty_hint, rationale }] } */

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership, enforceAiUserRateLimit } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';
import { keywordsPrompt } from '@/lib/ai/seo/prompts';
import { loadFullContext } from '@/lib/ai/load-full-context';

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const rateLimit = enforceAiUserRateLimit(user.id, 'text');
  if (rateLimit) return rateLimit;

  let body: { collectionPlanId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.collectionPlanId) return NextResponse.json({ error: 'collectionPlanId required' }, { status: 400 });

  const own = await verifyCollectionOwnership(user.id, body.collectionPlanId, 'view_all');
  if (!own.authorized) return own.error;

  const ctx = await loadFullContext(body.collectionPlanId);
  const brandName = ctx?.brandName ?? '';
  if (!brandName) return NextResponse.json({ error: 'Brand DNA missing.', reason: 'data_incomplete' }, { status: 400 });

  const families = [(ctx?.productCategory ?? "")].filter(Boolean).slice(0, 8);
  const audience = ctx?.consumer ?? '';
  const prompt = keywordsPrompt(brandName, ctx?.season ?? '', families, audience);

  try {
    const { data } = await generateJSON<{
      keywords: Array<{ term: string; intent: string; difficulty_hint: string; rationale: string }>;
    }>({ system: 'You are a senior fashion SEO strategist. Always return valid JSON.', user: prompt, maxTokens: 1500, temperature: 0.4, jsonMode: true });
    return NextResponse.json({ keywords: data.keywords ?? [] });
  } catch (e) {
    console.error('[seo-keywords] failed:', e);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
