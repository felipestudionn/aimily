/* ═══════════════════════════════════════════════════════════════════
   Tech Pack comments thread.
   GET    /api/tech-pack/comments?skuId=X → ordered list
   POST   /api/tech-pack/comments         → { skuId, block, body }
   PATCH  /api/tech-pack/comments         → { id, body }
   DELETE /api/tech-pack/comments?id=X
   ═══════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

const VALID_BLOCKS = new Set([
  'header', 'drawings', 'measurements', 'bom', 'grading', 'factory', 'general',
]);

async function ensureOwnership(userId: string, skuId: string): Promise<string | null> {
  const { data: sku } = await supabaseAdmin
    .from('collection_skus')
    .select('collection_plan_id')
    .eq('id', skuId)
    .maybeSingle();
  if (!sku) return null;
  const { data: plan } = await supabaseAdmin
    .from('collection_plans')
    .select('user_id')
    .eq('id', sku.collection_plan_id)
    .maybeSingle();
  if (!plan || plan.user_id !== userId) return null;
  return sku.collection_plan_id;
}

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  const skuId = req.nextUrl.searchParams.get('skuId');
  if (!skuId) return NextResponse.json({ error: 'Missing skuId' }, { status: 400 });
  const collectionPlanId = await ensureOwnership(user!.id, skuId);
  if (!collectionPlanId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data } = await supabaseAdmin
    .from('tech_pack_comments')
    .select('id, block, body, author_id, author_name, drawing_slot, pin_x, pin_y, created_at, updated_at')
    .eq('sku_id', skuId)
    .order('created_at', { ascending: true });

  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  let body: {
    skuId?: string;
    block?: string;
    body?: string;
    drawingSlot?: string | null;
    pinX?: number | null;
    pinY?: number | null;
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.skuId || !body.block || !VALID_BLOCKS.has(body.block) || !body.body?.trim()) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const collectionPlanId = await ensureOwnership(user!.id, body.skuId);
  if (!collectionPlanId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const authorName = user!.email?.split('@')[0] || null;
  const isPin = typeof body.pinX === 'number' && typeof body.pinY === 'number' && body.drawingSlot;
  const { data, error } = await supabaseAdmin
    .from('tech_pack_comments')
    .insert({
      collection_plan_id: collectionPlanId,
      sku_id: body.skuId,
      block: body.block,
      body: body.body.trim(),
      author_id: user!.id,
      author_name: authorName,
      drawing_slot: isPin ? body.drawingSlot : null,
      pin_x: isPin ? body.pinX : null,
      pin_y: isPin ? body.pinY : null,
    })
    .select()
    .single();
  if (error) {
    console.error('[tech-pack/comments POST]', error);
    return NextResponse.json({ error: 'Failed to save comment' }, { status: 500 });
  }
  return NextResponse.json({ comment: data });
}

export async function PATCH(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  let body: { id?: string; body?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.id || !body.body?.trim()) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Ownership via join through sku
  const { data: existing } = await supabaseAdmin
    .from('tech_pack_comments')
    .select('id, sku_id')
    .eq('id', body.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const ok = await ensureOwnership(user!.id, existing.sku_id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await supabaseAdmin
    .from('tech_pack_comments')
    .update({ body: body.body.trim(), updated_at: new Date().toISOString() })
    .eq('id', body.id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { data: existing } = await supabaseAdmin
    .from('tech_pack_comments')
    .select('id, sku_id')
    .eq('id', id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const ok = await ensureOwnership(user!.id, existing.sku_id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await supabaseAdmin.from('tech_pack_comments').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
