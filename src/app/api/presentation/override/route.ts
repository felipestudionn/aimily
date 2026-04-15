/* ═══════════════════════════════════════════════════════════════════
   Presentation deck overrides API

   POST  /api/presentation/override  — save or update field overrides
                                       for a (collection, slide) pair
   DELETE /api/presentation/override?collectionId=X&slideId=Y  — revert
                                                                 the entire slide to the CIS
                                                                 original
   DELETE /api/presentation/override?collectionId=X&slideId=Y&field=Z
                                     — revert only one field; if that
                                       was the last override field, the
                                       row is removed.
   ═══════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

interface SaveBody {
  collectionId: string;
  slideId: string;
  fields: Record<string, string>;
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  let body: SaveBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { collectionId, slideId, fields } = body;
  if (!collectionId || !slideId || !fields || typeof fields !== 'object') {
    return NextResponse.json({ error: 'Missing collectionId, slideId, or fields' }, { status: 400 });
  }

  const check = await verifyCollectionOwnership(user!.id, collectionId);
  if (!check.authorized) return check.error;

  // Fetch existing row so we merge field overrides rather than replace.
  const existing = await supabaseAdmin
    .from('presentation_deck_overrides')
    .select('field_overrides')
    .eq('collection_plan_id', collectionId)
    .eq('slide_id', slideId)
    .maybeSingle();

  const currentFields = (existing.data?.field_overrides as Record<string, string>) ?? {};
  const mergedFields = { ...currentFields };
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined || v === '') delete mergedFields[k];
    else mergedFields[k] = v;
  }

  // If merged is empty, delete the row entirely (clean state).
  if (Object.keys(mergedFields).length === 0) {
    await supabaseAdmin
      .from('presentation_deck_overrides')
      .delete()
      .eq('collection_plan_id', collectionId)
      .eq('slide_id', slideId);
    return NextResponse.json({ ok: true, cleared: true });
  }

  const { error } = await supabaseAdmin
    .from('presentation_deck_overrides')
    .upsert({
      collection_plan_id: collectionId,
      slide_id: slideId,
      field_overrides: mergedFields,
      updated_by: user!.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'collection_plan_id,slide_id' });

  if (error) {
    console.error('[api/presentation/override] upsert failed:', error);
    return NextResponse.json({ error: 'Failed to save override' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, fields: mergedFields });
}

export async function DELETE(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const collectionId = req.nextUrl.searchParams.get('collectionId');
  const slideId = req.nextUrl.searchParams.get('slideId');
  const field = req.nextUrl.searchParams.get('field');
  if (!collectionId || !slideId) {
    return NextResponse.json({ error: 'Missing collectionId or slideId' }, { status: 400 });
  }

  const check = await verifyCollectionOwnership(user!.id, collectionId);
  if (!check.authorized) return check.error;

  if (!field) {
    // Drop the whole slide override row
    await supabaseAdmin
      .from('presentation_deck_overrides')
      .delete()
      .eq('collection_plan_id', collectionId)
      .eq('slide_id', slideId);
    return NextResponse.json({ ok: true });
  }

  // Remove just one field; if that empties the row, drop it
  const existing = await supabaseAdmin
    .from('presentation_deck_overrides')
    .select('field_overrides')
    .eq('collection_plan_id', collectionId)
    .eq('slide_id', slideId)
    .maybeSingle();
  if (!existing.data) return NextResponse.json({ ok: true });

  const fields = { ...(existing.data.field_overrides as Record<string, string>) };
  delete fields[field];

  if (Object.keys(fields).length === 0) {
    await supabaseAdmin
      .from('presentation_deck_overrides')
      .delete()
      .eq('collection_plan_id', collectionId)
      .eq('slide_id', slideId);
  } else {
    await supabaseAdmin
      .from('presentation_deck_overrides')
      .update({
        field_overrides: fields,
        updated_by: user!.id,
        updated_at: new Date().toISOString(),
      })
      .eq('collection_plan_id', collectionId)
      .eq('slide_id', slideId);
  }

  return NextResponse.json({ ok: true });
}
