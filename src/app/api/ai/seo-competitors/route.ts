/* POST /api/ai/seo-competitors
   Body: { collectionPlanId }
   Returns: { competitors: [{ name, url, estimated_traffic_tier, ranking_keywords_sample, content_strengths, gaps_for_us }] } */

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership, enforceAiUserRateLimit } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';
import { competitorsPrompt } from '@/lib/ai/seo/prompts';
import { loadFullContext } from '@/lib/ai/load-full-context';

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const rateLimit = enforceAiUserRateLimit(user.id, 'heavy-text');
  if (rateLimit) return rateLimit;

  let body: { collectionPlanId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.collectionPlanId) return NextResponse.json({ error: 'collectionPlanId required' }, { status: 400 });

  const own = await verifyCollectionOwnership(user.id, body.collectionPlanId, 'view_all');
  if (!own.authorized) return own.error;

  const ctx = await loadFullContext(body.collectionPlanId);
  const brandName = ctx?.brandName ?? '';
  if (!brandName) {
    return NextResponse.json({ error: 'Brand DNA missing.', reason: 'data_incomplete' }, { status: 400 });
  }

  const families = [(ctx?.productCategory ?? "")].filter(Boolean).slice(0, 8);
  const prompt = competitorsPrompt(brandName, families);

  try {
    const { data } = await generateJSON<{ competitors: Array<Record<string, unknown>> }>({
      system: 'You are a senior fashion SEO strategist. Always return valid JSON.',
      user: prompt,
      maxTokens: 1800,
      temperature: 0.4,
      jsonMode: true,
    });
    return NextResponse.json({ competitors: data.competitors ?? [] });
  } catch (e) {
    console.error('[seo-competitors] failed:', e);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
