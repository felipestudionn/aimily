/* POST /api/ai/seo-onpage
   Body: { collectionPlanId, page: 'home'|'plp'|'pdp'|'lookbook'|'about', skuId? }
   Returns: { meta_title, meta_description, og_title, og_description, h1, image_alt_pattern } */

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership, enforceAiUserRateLimit } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';
import { onpagePrompt } from '@/lib/ai/seo/prompts';
import { loadFullContext } from '@/lib/ai/load-full-context';
import { supabaseAdmin } from '@/lib/supabase-admin';

const VALID_PAGES = ['home', 'plp', 'pdp', 'lookbook', 'about'] as const;
type PageId = typeof VALID_PAGES[number];

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const rateLimit = enforceAiUserRateLimit(user.id, 'text');
  if (rateLimit) return rateLimit;

  let body: { collectionPlanId?: string; page?: string; skuId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.collectionPlanId || !body.page) {
    return NextResponse.json({ error: 'collectionPlanId + page required' }, { status: 400 });
  }
  if (!VALID_PAGES.includes(body.page as PageId)) {
    return NextResponse.json({ error: `page must be one of ${VALID_PAGES.join(', ')}` }, { status: 400 });
  }

  const own = await verifyCollectionOwnership(user.id, body.collectionPlanId, 'view_all');
  if (!own.authorized) return own.error;

  const ctx = await loadFullContext(body.collectionPlanId);
  const brandName = ctx?.brandName ?? '';
  if (!brandName) return NextResponse.json({ error: 'Brand DNA missing.', reason: 'data_incomplete' }, { status: 400 });

  let pageContext = '';
  if (body.page === 'pdp' && body.skuId) {
    const { data: sku } = await supabaseAdmin
      .from('collection_skus')
      .select('type, notes, pvp')
      .eq('id', body.skuId)
      .maybeSingle();
    pageContext = `Product: ${(sku?.notes as string)?.split('\n')[0] ?? sku?.type ?? ''}. Price: €${sku?.pvp ?? ''}. Family: ${sku?.type ?? ''}.`;
  } else if (body.page === 'home') {
    pageContext = `Collection: ${ctx?.collectionName ?? ''} ${ctx?.season ?? ''}. Vibe: ${(ctx?.vibe ?? '').slice(0, 400)}`;
  } else if (body.page === 'plp') {
    pageContext = `Shop ${ctx?.collectionName ?? ''} ${ctx?.season ?? ''} — ${ctx?.productCategory ?? ''}`;
  } else if (body.page === 'lookbook') {
    pageContext = `Editorial lookbook for ${ctx?.collectionName ?? ''} ${ctx?.season ?? ''}`;
  } else {
    pageContext = `About ${brandName}: ${(ctx?.vibe ?? '').slice(0, 300)}`;
  }

  const prompt = onpagePrompt(brandName, body.page, pageContext, ctx?.brandVoice ?? '');

  try {
    const { data } = await generateJSON<{
      meta_title: string; meta_description: string; og_title: string; og_description: string; h1: string; image_alt_pattern: string;
    }>({ system: 'You are a senior fashion SEO strategist. Always return valid JSON.', user: prompt, maxTokens: 800, temperature: 0.4, jsonMode: true });
    return NextResponse.json(data);
  } catch (e) {
    console.error('[seo-onpage] failed:', e);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
