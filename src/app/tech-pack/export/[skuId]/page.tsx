/* ═══════════════════════════════════════════════════════════════════
   /tech-pack/export/[skuId]?token=…

   Internal render of the Tech Pack sheet for PDF export. Validated
   via the signed token (no user session needed — Puppeteer runs
   unauthenticated). Renders a print-optimised version of the sheet
   with no top bar + no interactive buttons.
   ═══════════════════════════════════════════════════════════════════ */

import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyTechPackToken } from '@/lib/tech-pack/export-token';
import { TechPackExportSheet } from '@/components/tech-pack/TechPackExportSheet';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ skuId: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function TechPackExportPage({ params, searchParams }: PageProps) {
  const { skuId } = await params;
  const { token } = await searchParams;
  if (!token) notFound();

  const payload = verifyTechPackToken(token);
  if (!payload || payload.skuId !== skuId) notFound();

  const { data: sku } = await supabaseAdmin
    .from('collection_skus')
    .select('*')
    .eq('id', skuId)
    .maybeSingle();
  if (!sku) notFound();

  const { data: plan } = await supabaseAdmin
    .from('collection_plans')
    .select('id, name, season, user_id')
    .eq('id', sku.collection_plan_id)
    .maybeSingle();
  if (!plan || plan.user_id !== payload.userId) notFound();

  const { data: techPackData } = await supabaseAdmin
    .from('tech_pack_data')
    .select('*')
    .eq('sku_id', skuId)
    .maybeSingle();

  const { data: comments } = await supabaseAdmin
    .from('tech_pack_comments')
    .select('id, block, body, author_id, author_name, drawing_slot, pin_x, pin_y, created_at, updated_at')
    .eq('sku_id', skuId)
    .order('created_at', { ascending: true });

  return (
    <TechPackExportSheet
      collectionName={plan.name || 'Collection'}
      season={plan.season || ''}
      sku={sku}
      data={techPackData ?? null}
      comments={comments ?? []}
    />
  );
}
