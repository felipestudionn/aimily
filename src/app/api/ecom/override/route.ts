/* POST /api/ecom/override
   Body: { storefrontId, pageId, fieldOverrides }   — replaces the page's overrides
   Auth + ownership gated. Idempotent upsert. Invalidates cache. */

import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

const VALID_PAGES = new Set(['home', 'plp', 'pdp', 'lookbook', 'about', 'contact', 'global']);

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  let body: { storefrontId?: string; pageId?: string; fieldOverrides?: Record<string, string> };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!body.storefrontId || !body.pageId || !body.fieldOverrides) {
    return NextResponse.json({ error: 'storefrontId + pageId + fieldOverrides required' }, { status: 400 });
  }
  if (!VALID_PAGES.has(body.pageId)) {
    return NextResponse.json({ error: 'invalid pageId' }, { status: 400 });
  }

  const { data: storefront } = await supabaseAdmin
    .from('storefronts')
    .select('id, collection_plan_id')
    .eq('id', body.storefrontId)
    .maybeSingle();
  if (!storefront) return NextResponse.json({ error: 'Storefront not found' }, { status: 404 });

  const own = await verifyCollectionOwnership(user.id, storefront.collection_plan_id, 'view_all');
  if (!own.authorized) return own.error;

  // Filter out empty/null values; only persist non-empty strings
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.fieldOverrides)) {
    if (typeof v === 'string' && v.trim().length > 0) cleaned[k] = v;
  }

  const { error: upsertError } = await supabaseAdmin
    .from('storefront_overrides')
    .upsert(
      {
        storefront_id: body.storefrontId,
        page_id: body.pageId,
        field_overrides: cleaned,
        updated_by: user.id,
      },
      { onConflict: 'storefront_id,page_id' },
    );

  if (upsertError) {
    console.error('[ecom/override] upsert failed:', upsertError);
    return NextResponse.json({ error: 'Failed to save overrides' }, { status: 500 });
  }

  revalidateTag(`storefront-${body.storefrontId}`, 'default');
  return NextResponse.json({ ok: true, fieldsCount: Object.keys(cleaned).length });
}

export async function GET(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const url = new URL(request.url);
  const storefrontId = url.searchParams.get('storefrontId');
  if (!storefrontId) return NextResponse.json({ error: 'storefrontId required' }, { status: 400 });

  const { data: storefront } = await supabaseAdmin
    .from('storefronts')
    .select('id, collection_plan_id')
    .eq('id', storefrontId)
    .maybeSingle();
  if (!storefront) return NextResponse.json({ error: 'Storefront not found' }, { status: 404 });

  const own = await verifyCollectionOwnership(user.id, storefront.collection_plan_id, 'view_all');
  if (!own.authorized) return own.error;

  const { data: rows } = await supabaseAdmin
    .from('storefront_overrides')
    .select('page_id, field_overrides, updated_at')
    .eq('storefront_id', storefrontId);

  return NextResponse.json({ overrides: rows ?? [] });
}
