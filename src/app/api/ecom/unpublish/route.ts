/* ═══════════════════════════════════════════════════════════════════
   POST /api/ecom/unpublish

   Body: { storefrontId: string }

   Unpublishes a storefront:
   - Sets `published_at = NULL` and `unpublished_at = NOW()` on the row
   - Removes the subdomain from Vercel project (frees the SSL cert)
   - Writes audit row in storefront_publishes
   - Invalidates SSR cache

   Auth: required + ownership of the storefront's collection.
   Idempotent: re-unpublishing an already-unpublished storefront is a no-op.
   ═══════════════════════════════════════════════════════════════════ */

import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { unregisterStorefrontDomain } from '@/lib/storefront/vercel-domains';

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  let body: { storefrontId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { storefrontId } = body;
  if (!storefrontId) {
    return NextResponse.json({ error: 'storefrontId is required' }, { status: 400 });
  }

  const { data: storefront, error: loadError } = await supabaseAdmin
    .from('storefronts')
    .select('id, collection_plan_id, subdomain, published_at')
    .eq('id', storefrontId)
    .maybeSingle();

  if (loadError || !storefront) {
    return NextResponse.json({ error: 'Storefront not found' }, { status: 404 });
  }

  const ownership = await verifyCollectionOwnership(user.id, storefront.collection_plan_id, 'view_all');
  if (!ownership.authorized) return ownership.error;

  // Idempotent: already unpublished
  if (!storefront.published_at) {
    return NextResponse.json({ ok: true, alreadyUnpublished: true });
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabaseAdmin
    .from('storefronts')
    .update({ published_at: null, unpublished_at: now })
    .eq('id', storefrontId);

  if (updateError) {
    console.error('[ecom/unpublish] db update failed:', updateError);
    return NextResponse.json({ error: 'Failed to unpublish' }, { status: 500 });
  }

  // Remove the subdomain from Vercel (frees the SSL cert).
  // Soft-fail: if Vercel API errors, the storefront is unpublished in DB but
  // the cert may linger on Vercel until manual cleanup. Worst case = stale cert.
  const baseDomain = process.env.NEXT_PUBLIC_STOREFRONT_BASE_DOMAIN ?? 'aimily.shop';
  const fullDomain = `${storefront.subdomain}.${baseDomain}`;
  const vercelResult = await unregisterStorefrontDomain(fullDomain);
  if (!vercelResult.ok) {
    console.error('[ecom/unpublish] Vercel unregister failed:', vercelResult.error);
  }

  // Audit
  await supabaseAdmin.from('storefront_publishes').insert({
    storefront_id: storefrontId,
    action: 'unpublish',
    triggered_by: user.id,
    payload_snapshot: { subdomain: storefront.subdomain, vercelOk: vercelResult.ok },
  });

  revalidateTag(`storefront-${storefrontId}`, 'default');

  return NextResponse.json({ ok: true });
}
