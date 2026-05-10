/**
 * POST /api/drops/synthesize
 *
 * Path B · structural drop materialization.
 *
 * If the `drops` table is EMPTY for the given collection_plan_id,
 * synthesize N drops from CIS strategy + season + (optional) Block 4
 * cadence and INSERT them atomically. Returns the created drops or
 * the existing ones if already populated.
 *
 * Idempotent: if drops already exist, returns them without duplicating.
 *
 * Body: { collection_plan_id: string, force?: boolean }
 *   force = true → wipe existing + re-synthesize (use with caution)
 *
 * Reference: memory/spec_block-4-sales-strategy-archetypes.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { synthesizeSchedule } from '@/lib/sales-strategy/synthesize-schedule';
import type { DropMechanic } from '@/types/sales-strategy';

interface Body {
  collection_plan_id?: string;
  force?: boolean;
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as Body | null;
  const collection_plan_id = body?.collection_plan_id;
  const force = body?.force === true;

  if (!collection_plan_id) {
    return NextResponse.json(
      { error: 'collection_plan_id required' },
      { status: 400 },
    );
  }

  const ownership = await verifyCollectionOwnership(user.id, collection_plan_id, 'edit_marketing');
  if (!ownership.authorized) return ownership.error;

  // 1. Check if drops already exist
  const { data: existing } = await supabaseAdmin
    .from('drops')
    .select('*')
    .eq('collection_plan_id', collection_plan_id)
    .order('position', { ascending: true });

  if (existing && existing.length > 0 && !force) {
    return NextResponse.json({
      result: { drops: existing, synthesized: false },
    });
  }

  // 2. Load inputs from CIS + collection_plans
  const { data: cisRows } = await supabaseAdmin
    .from('collection_decisions')
    .select('domain, subdomain, key, value')
    .eq('collection_plan_id', collection_plan_id)
    .eq('is_current', true);

  const cis = new Map<string, unknown>();
  for (const r of cisRows ?? []) {
    cis.set(`${r.domain}.${r.subdomain}.${r.key}`, r.value);
  }

  const dropsCis = cis.get('merchandising.strategy.drops') as
    | { count?: number; suggested_names?: string[] }
    | undefined;
  const cadence = cis.get('marketing.sales_strategy.cadence') as
    | { drops_frequency_weeks?: number }
    | undefined;
  const dropMechanic = cis.get(
    'marketing.sales_strategy.drop_mechanic_default',
  ) as DropMechanic | undefined;

  const { data: planRow } = await supabaseAdmin
    .from('collection_plans')
    .select('season, setup_data')
    .eq('id', collection_plan_id)
    .single();

  const setupData = (planRow?.setup_data as Record<string, unknown>) ?? {};
  const explicitLaunchDate =
    (setupData.launch_date as string | undefined) ??
    (setupData.launchDate as string | undefined) ??
    null;

  const dropCount = dropsCis?.count ?? 1;
  if (dropCount < 1) {
    return NextResponse.json(
      {
        error:
          'Cannot synthesize: merchandising.strategy.drops.count is missing or 0. Confirm 02.1 Estrategia de Compra first.',
      },
      { status: 400 },
    );
  }

  const toCreate = synthesizeSchedule({
    drop_count: dropCount,
    suggested_names: dropsCis?.suggested_names,
    explicit_launch_date: explicitLaunchDate,
    season: planRow?.season,
    cadence_weeks: cadence?.drops_frequency_weeks,
    drop_mechanic: dropMechanic,
  });

  // 3. If force, delete existing first
  if (force && existing && existing.length > 0) {
    await supabaseAdmin
      .from('drops')
      .delete()
      .eq('collection_plan_id', collection_plan_id);
  }

  // 4. Insert all drops atomically
  const rows = toCreate.map((d) => ({
    collection_plan_id,
    drop_number: d.drop_number,
    name: d.name,
    launch_date: d.launch_date,
    weeks_active: d.weeks_active,
    channels: d.channels,
    mechanic: d.mechanic,
    position: d.position,
  }));

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('drops')
    .insert(rows)
    .select();

  if (insertError) {
    console.error('[drops/synthesize] insert failed', insertError);
    return NextResponse.json(
      { error: `Failed to insert drops: ${insertError.message}` },
      { status: 500 },
    );
  }

  // 5. Backfill collection_skus.drop_id by matching drop_number → drop.id.
  // This ensures the dashboard's per-drop curve aggregation can find each
  // SKU's anchor without falling back on legacy sku.launch_date.
  if (inserted && inserted.length > 0) {
    for (const drop of inserted) {
      await supabaseAdmin
        .from('collection_skus')
        .update({ drop_id: drop.id })
        .eq('collection_plan_id', collection_plan_id)
        .eq('drop_number', drop.drop_number)
        .is('drop_id', null);
    }
  }

  return NextResponse.json({
    result: { drops: inserted, synthesized: true },
  });
}
