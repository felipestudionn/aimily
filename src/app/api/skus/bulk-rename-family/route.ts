/**
 * POST /api/skus/bulk-rename-family
 *
 * Sprint B.5 (2026-05-09) · Cascade SKU rows when a family is renamed
 * inline on the Collection Builder. Keeps SKU.family + SKU.category in
 * sync (category re-derived via the same family→macro mapping the
 * auto-gen path uses).
 *
 * Body: { collectionPlanId, oldName, newName }
 * Returns: { ok, updated, planId }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface Body {
  collectionPlanId?: string;
  oldName?: string;
  newName?: string;
}

function familyToCategory(family: string | undefined): 'CALZADO' | 'ROPA' | 'ACCESORIOS' {
  const f = (family || '').toLowerCase();
  if (!f) return 'ROPA';
  if (/^calzad|shoe|footwear|zapato|botas?\b|sandalias?|mocasin/.test(f)) return 'CALZADO';
  if (/bolso|bag|cluth|crossbody|tote|hobo|accesori|bisuter|joyeria|jewelry/.test(f)) return 'ACCESORIOS';
  return 'ROPA';
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as Body | null;
  const { collectionPlanId, oldName, newName } = body || {};

  if (!collectionPlanId || !oldName || !newName) {
    return NextResponse.json(
      { error: 'collectionPlanId, oldName and newName are required' },
      { status: 400 },
    );
  }
  if (oldName === newName) {
    return NextResponse.json({ ok: true, updated: 0, planId: collectionPlanId });
  }

  const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
  if (!ownership.authorized) return ownership.error;

  const newCategory = familyToCategory(newName);

  const { data, error } = await supabaseAdmin
    .from('collection_skus')
    .update({ family: newName, category: newCategory })
    .eq('collection_plan_id', collectionPlanId)
    .eq('family', oldName)
    .select('id');

  if (error) {
    console.error('[bulk-rename-family] failed', error);
    return NextResponse.json({ error: 'Failed to rename family' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: data?.length || 0, planId: collectionPlanId });
}
