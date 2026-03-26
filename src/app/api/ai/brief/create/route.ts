import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { DEFAULT_MILESTONES } from '@/lib/timeline-template';

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { name, season, launchDate, brand, creative, merchandising, skus, setupData } =
      await req.json();

    if (!name || !season) {
      return NextResponse.json({ error: 'name and season are required' }, { status: 400 });
    }

    // 1. Create collection plan
    const { data: plan, error: planError } = await supabaseAdmin
      .from('collection_plans')
      .insert({
        user_id: user.id,
        name,
        season,
        status: 'active',
        setup_data: setupData,
      })
      .select()
      .single();

    if (planError || !plan) {
      console.error('Failed to create collection plan:', planError);
      return NextResponse.json(
        { error: 'Failed to create collection plan' },
        { status: 500 },
      );
    }

    // 2. Create timeline with default milestones
    const milestones = DEFAULT_MILESTONES
      ? DEFAULT_MILESTONES.map((m) => ({
          ...m,
          startDate: null,
          endDate: null,
          status: 'pending' as const,
        }))
      : [];

    const { error: timelineError } = await supabaseAdmin
      .from('collection_timelines')
      .insert({
        collection_plan_id: plan.id,
        launch_date: launchDate,
        milestones,
      });

    if (timelineError) {
      console.error('Failed to create timeline:', timelineError);
    }

    // 3. Save creative workspace data
    if (brand || creative) {
      const { error: creativeError } = await supabaseAdmin
        .from('collection_workspace_data')
        .upsert(
          {
            collection_plan_id: plan.id,
            workspace: 'creative',
            data: {
              blockData: {
                'brand-dna': { confirmed: true, mode: 'ai', data: brand },
                consumer: {
                  confirmed: true,
                  mode: 'ai',
                  data: { profile: brand?.consumerProfile },
                },
                vibe: {
                  confirmed: true,
                  mode: 'ai',
                  data: {
                    vibe: creative?.collectionVibe,
                    colors: creative?.colorPalette,
                  },
                },
                moodboard: { confirmed: false, mode: 'free', data: {} },
              },
              activeStep: 2,
            },
          },
          { onConflict: 'collection_plan_id,workspace' },
        );

      if (creativeError) {
        console.error('Failed to save creative workspace:', creativeError);
      }
    }

    // 4. Save merchandising workspace data
    if (merchandising) {
      const { error: merchError } = await supabaseAdmin
        .from('collection_workspace_data')
        .upsert(
          {
            collection_plan_id: plan.id,
            workspace: 'merchandising',
            data: {
              cardData: {
                families: {
                  confirmed: true,
                  mode: 'ai',
                  data: { families: merchandising.families },
                },
                pricing: {
                  confirmed: true,
                  mode: 'ai',
                  data: merchandising.families,
                },
                channels: {
                  confirmed: true,
                  mode: 'ai',
                  data: merchandising.channels,
                },
                budget: {
                  confirmed: true,
                  mode: 'ai',
                  data: merchandising.budget,
                },
              },
            },
          },
          { onConflict: 'collection_plan_id,workspace' },
        );

      if (merchError) {
        console.error('Failed to save merchandising workspace:', merchError);
      }
    }

    // 5. Batch insert SKUs
    if (skus && skus.length > 0) {
      const skuRows = skus.map((sku: Record<string, unknown>, idx: number) => ({
        collection_plan_id: plan.id,
        name: sku.name,
        family: sku.family,
        subcategory: sku.subcategory || null,
        category: sku.category || 'CALZADO',
        pvp: sku.pvp,
        cost: sku.cost,
        margin: sku.margin,
        buy_units: sku.buy_units,
        discount: sku.discount || 0,
        sale_percentage: sku.sale_percentage || 85,
        final_price:
          (sku.pvp as number) * (1 - ((sku.discount as number) || 0) / 100),
        expected_sales: Math.round(
          (((sku.buy_units as number) * ((sku.sale_percentage as number) || 85)) /
            100) *
            (sku.pvp as number),
        ),
        channel: sku.channel || 'DTC',
        type: sku.type || 'REVENUE',
        drop_number: sku.drop_number || 1,
        novelty: sku.novelty || 'NEW',
        notes: sku.notes || '',
        design_phase: 'range_plan',
        position: idx,
      }));

      const { error: skuError } = await supabaseAdmin
        .from('collection_skus')
        .insert(skuRows);

      if (skuError) {
        console.error('Failed to insert SKUs:', skuError);
      }
    }

    return NextResponse.json({ plan });
  } catch (err) {
    console.error('Brief create error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
