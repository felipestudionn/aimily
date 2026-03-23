import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

// Helper to verify colorway ownership via SKU -> collection_plan
async function verifyColorwayOwnership(userId: string, colorwayId: string) {
  const { data: colorway } = await supabaseAdmin
    .from('sku_colorways')
    .select('sku_id')
    .eq('id', colorwayId)
    .single();

  if (colorway?.sku_id) {
    const { data: sku } = await supabaseAdmin
      .from('collection_skus')
      .select('collection_plan_id')
      .eq('id', colorway.sku_id)
      .single();

    if (sku?.collection_plan_id) {
      return verifyCollectionOwnership(userId, sku.collection_plan_id);
    }
  }

  return { authorized: true as const, error: null };
}

// PATCH /api/colorways/[id] — Update a colorway
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { id } = await params;

    const { authorized, error: ownerError } = await verifyColorwayOwnership(user.id, id);
    if (!authorized) return ownerError;

    const updates = await req.json();

    const { data, error } = await supabaseAdmin
      .from('sku_colorways')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('PATCH colorway error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/colorways/[id] — Delete a colorway
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { id } = await params;

    const { authorized, error: ownerError } = await verifyColorwayOwnership(user.id, id);
    if (!authorized) return ownerError;

    const { error } = await supabaseAdmin
      .from('sku_colorways')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE colorway error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
