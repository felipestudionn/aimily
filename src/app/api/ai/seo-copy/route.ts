/* POST /api/ai/seo-copy
   Body: { collectionPlanId, skuId }
   Returns: { description, primary_keyword, secondary_keywords, suggested_meta_title, suggested_meta_description } */

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership, enforceAiUserRateLimit } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';
import { copyPrompt } from '@/lib/ai/seo/prompts';
import { loadFullContext } from '@/lib/ai/load-full-context';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const rateLimit = enforceAiUserRateLimit(user.id, 'text');
  if (rateLimit) return rateLimit;

  let body: { collectionPlanId?: string; skuId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.collectionPlanId || !body.skuId) {
    return NextResponse.json({ error: 'collectionPlanId + skuId required' }, { status: 400 });
  }

  const own = await verifyCollectionOwnership(user.id, body.collectionPlanId, 'view_all');
  if (!own.authorized) return own.error;

  const ctx = await loadFullContext(body.collectionPlanId);
  const brandName = ctx?.brandName ?? '';
  if (!brandName) return NextResponse.json({ error: 'Brand DNA missing.', reason: 'data_incomplete' }, { status: 400 });

  const { data: sku } = await supabaseAdmin
    .from('collection_skus')
    .select('id, type, notes, collection_plan_id')
    .eq('id', body.skuId)
    .maybeSingle();
  if (!sku || sku.collection_plan_id !== body.collectionPlanId) {
    return NextResponse.json({ error: 'SKU not found in this collection' }, { status: 404 });
  }

  const skuName = ((sku.notes as string) ?? '').split('\n')[0] || (sku.type as string) || 'Product';
  const prompt = copyPrompt(
    brandName,
    ctx?.brandVoice ?? '',
    skuName,
    (sku.notes as string) ?? '',
    (sku.type as string) ?? '',
  );

  try {
    const { data } = await generateJSON<{
      description: string;
      primary_keyword: string;
      secondary_keywords: string[];
      suggested_meta_title: string;
      suggested_meta_description: string;
    }>({ system: 'You are a senior fashion SEO strategist. Always return valid JSON.', user: prompt, maxTokens: 800, temperature: 0.5, jsonMode: true });
    return NextResponse.json(data);
  } catch (e) {
    console.error('[seo-copy] failed:', e);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
