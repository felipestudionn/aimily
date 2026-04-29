import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/wholesale-orders?planId=X
 */
export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const planId = req.nextUrl.searchParams.get('planId');
  if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 });

  const ownership = await verifyCollectionOwnership(user.id, planId);
  if (!ownership.authorized) return ownership.error;

  const { data, error } = await supabaseAdmin
    .from('wholesale_orders')
    .select('*')
    .eq('collection_plan_id', planId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

/**
 * POST /api/wholesale-orders
 */
export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = await req.json();
  const { collection_plan_id, buyer_name, buyer_company, buyer_email, order_lines, notes, delivery_date } = body;

  if (!collection_plan_id || !buyer_name) {
    return NextResponse.json({ error: 'collection_plan_id and buyer_name required' }, { status: 400 });
  }

  const ownership = await verifyCollectionOwnership(user.id, collection_plan_id);
  if (!ownership.authorized) return ownership.error;

  const lines = order_lines || [];
  const totalUnits = lines.reduce((sum: number, l: { quantity?: number }) => sum + (l.quantity || 0), 0);
  const totalValue = lines.reduce((sum: number, l: { quantity?: number; unit_price?: number }) => sum + ((l.quantity || 0) * (l.unit_price || 0)), 0);

  const { data, error } = await supabaseAdmin
    .from('wholesale_orders')
    .insert({
      collection_plan_id,
      buyer_name,
      buyer_company: buyer_company || null,
      buyer_email: buyer_email || null,
      order_lines: lines,
      total_units: totalUnits,
      total_value: totalValue,
      notes: notes || null,
      delivery_date: delivery_date || null,
      status: 'draft',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // CIS capture
  const { recordDecision } = await import('@/lib/collection-intelligence');
  recordDecision({
    collectionPlanId: collection_plan_id,
    domain: 'sales', subdomain: 'wholesale', key: `order_${data.id.slice(0, 8)}`,
    value: { buyer: buyer_name, company: buyer_company, units: totalUnits, value: totalValue },
    sourcePhase: 'sales', sourceComponent: 'PointOfSaleCard',
    tags: ['affects_finance'],
    userId: user!.id,
  }).catch((err: unknown) => console.error('[CIS] wholesale order capture failed:', err));

  return NextResponse.json(data, { status: 201 });
}
