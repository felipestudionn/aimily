/**
 * POST /api/strategy/sku-image
 *
 * Upload de la imagen referencia del SKU (recortada del canvas del PDF en
 * el frontend) y persistencia de la URL en strategy_product_facts.product_image_url.
 *
 * Felipe sprint Aimily Design 2026-05-18. La extracción se hace on-demand
 * la primera vez que el usuario abre el modal para un SKU; futuras
 * apertura reutilizan la URL guardada.
 *
 * Body: FormData con `product_fact_id` (uuid) y `image` (File / Blob, PNG).
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';

const STORAGE_BUCKET = 'strategy-uploads';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const productFactId = formData.get('product_fact_id');
  const image = formData.get('image');

  if (typeof productFactId !== 'string' || !productFactId) {
    return NextResponse.json({ error: 'product_fact_id required' }, { status: 400 });
  }
  if (!(image instanceof Blob)) {
    return NextResponse.json({ error: 'image file required' }, { status: 400 });
  }

  // Look up the product fact to get the tenant for auth.
  const { data: product } = await supabaseAdmin
    .from('strategy_product_facts')
    .select('id, tenant_id, model_ref, color_ref, product_image_url')
    .eq('id', productFactId)
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ error: 'product not found' }, { status: 404 });
  }

  const access = await requireStrategyAccess({ tenantId: product.tenant_id, minRole: 'analyst' });
  if (!access.ok) return access.response;

  // Si ya hay una imagen, devolvemos esa — no re-extraer.
  if (product.product_image_url) {
    return NextResponse.json({
      url: product.product_image_url,
      reused: true,
    });
  }

  const buf = Buffer.from(await image.arrayBuffer());
  const path = `${product.tenant_id}/sku-images/${product.model_ref}-${product.color_ref ?? 'all'}-${Date.now()}.png`.replace(/\s+/g, '_');

  const { error: upErr } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(path, buf, { contentType: 'image/png', upsert: false });

  if (upErr) {
    return NextResponse.json({ error: `upload failed: ${upErr.message}` }, { status: 500 });
  }

  const { data: signed } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 año

  const url = signed?.signedUrl;
  if (!url) {
    return NextResponse.json({ error: 'signed url generation failed' }, { status: 500 });
  }

  await supabaseAdmin
    .from('strategy_product_facts')
    .update({ product_image_url: url })
    .eq('id', productFactId);

  return NextResponse.json({ url, reused: false });
}
