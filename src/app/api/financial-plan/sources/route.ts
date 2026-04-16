/* ═══════════════════════════════════════════════════════════════════
   GET /api/financial-plan/sources?planId=X
   Returns FinancialPlanSources: selected scenario numbers, avg selling
   price, channel mix, drops — everything the Financial Plan workspace
   needs to compute its derived numbers without owning any of them.
   ═══════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { loadFinancialPlanSources } from '@/lib/financial-plan/load-sources';

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const planId = req.nextUrl.searchParams.get('planId');
  if (!planId) {
    return NextResponse.json({ error: 'planId is required' }, { status: 400 });
  }

  // Ownership check
  const { data: plan } = await supabaseAdmin
    .from('collection_plans')
    .select('user_id')
    .eq('id', planId)
    .single();
  if (!plan || plan.user_id !== user!.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const sources = await loadFinancialPlanSources(planId);
  return NextResponse.json({ sources });
}
