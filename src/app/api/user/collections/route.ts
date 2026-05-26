import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/user/collections — current user's active collections.

   Lightweight list used by surfaces that need to offer cross-product
   linking (Studio brand-inherit dropdown is the first consumer). Returns
   only the fields needed for a selector: id, name, season, brand_name
   (resolved from CIS).

   Auth required. RLS on collection_plans bound by user_id.
   ═══════════════════════════════════════════════════════════════════════════ */

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const { data: collections } = await supabaseAdmin
    .from('collection_plans')
    .select('id, name, season')
    .eq('user_id', user!.id)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  const ids = (collections || []).map((c) => c.id as string);
  if (!ids.length) {
    return NextResponse.json({ collections: [] });
  }

  // Pull brand_name from CIS so the dropdown reads "AZUR · Nudo" not just
  // "AZUR". The brand_name decision is the most recent row per collection.
  const { data: brandRows } = await supabaseAdmin
    .from('collection_decisions')
    .select('collection_plan_id, value, created_at')
    .in('collection_plan_id', ids)
    .eq('domain', 'creative')
    .eq('subdomain', 'identity')
    .eq('key', 'brand_name')
    .order('created_at', { ascending: false });

  const brandByCollection: Record<string, string | null> = {};
  for (const row of brandRows || []) {
    if (!(row.collection_plan_id in brandByCollection)) {
      const v = row.value;
      brandByCollection[row.collection_plan_id as string] =
        typeof v === 'string' ? v : null;
    }
  }

  const enriched = (collections || []).map((c) => ({
    id: c.id,
    name: c.name,
    season: c.season,
    brand_name: brandByCollection[c.id as string] ?? null,
  }));

  return NextResponse.json({ collections: enriched });
}
