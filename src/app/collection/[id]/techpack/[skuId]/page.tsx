/* ═══════════════════════════════════════════════════════════════════
   /collection/[id]/techpack/[skuId]

   Dedicated Tech Pack sheet per SKU. Loads the collection plan + SKU
   + tech pack data + comments server-side, then hands off to the
   client TechPackSheet for inline editing.
   ═══════════════════════════════════════════════════════════════════ */

import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase/server';
import { TechPackSheet } from '@/components/tech-pack/TechPackSheet';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string; skuId: string }>;
}

export default async function TechPackPage({ params }: PageProps) {
  const { id, skuId } = await params;

  // Auth via cookie client — matches the rest of the app.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: plan } = await supabaseAdmin
    .from('collection_plans')
    .select('id, name, season, user_id, setup_data')
    .eq('id', id)
    .maybeSingle();
  if (!plan || plan.user_id !== user.id) notFound();

  const { data: sku } = await supabaseAdmin
    .from('collection_skus')
    .select('*')
    .eq('id', skuId)
    .eq('collection_plan_id', id)
    .maybeSingle();
  if (!sku) notFound();

  const { data: techPackData } = await supabaseAdmin
    .from('tech_pack_data')
    .select('*')
    .eq('sku_id', skuId)
    .maybeSingle();

  const { data: comments } = await supabaseAdmin
    .from('tech_pack_comments')
    .select('id, block, body, author_id, author_name, created_at, updated_at')
    .eq('sku_id', skuId)
    .order('created_at', { ascending: true });

  return (
    <TechPackSheet
      collectionId={id}
      collectionName={plan.name || 'Collection'}
      season={plan.season || ''}
      sku={sku}
      initialData={techPackData ?? null}
      initialComments={comments ?? []}
    />
  );
}
