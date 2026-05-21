import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Collect all user data
    const exportData: Record<string, unknown> = {
      account: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      },
    };

    // Subscription
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();
    exportData.subscription = subscription;

    // AI Usage
    const { data: aiUsage } = await supabaseAdmin
      .from('ai_usage')
      .select('*')
      .eq('user_id', user.id);
    exportData.ai_usage = aiUsage;

    // Collection plans
    const { data: plans } = await supabaseAdmin
      .from('collection_plans')
      .select('*')
      .eq('user_id', user.id);
    exportData.collection_plans = plans;

    if (plans && plans.length > 0) {
      const planIds = plans.map((p) => p.id);

      // Related collection data. Aligned to the canonical schema after
      // the 2026-05-21 orphan-tables cleanup (4 waves, 25 tables dropped):
      //   · Wave 2: 'tech_packs' → tech_pack_data + tech_pack_revisions + tech_pack_comments
      //   · Wave 3: dropped 'market_predictions', 'brand_models', 'pr_contacts'
      //   · Wave 4: dropped 'commercial_actions', 'content_calendar',
      //     'lookbook_pages', 'product_copy' (and others not in this array)
      // GDPR export now mirrors exactly what the user sees in the active product.
      const tables = [
        'collection_skus', 'collection_timelines', 'drops',
        'ai_generations', 'brand_profiles',
        'production_orders', 'sample_reviews', 'sku_colorways',
        'tech_pack_data', 'tech_pack_revisions', 'tech_pack_comments',
      ];

      for (const table of tables) {
        const { data } = await supabaseAdmin
          .from(table)
          .select('*')
          .in('collection_plan_id', planIds);
        exportData[table] = data;
      }
    }

    // Standalone timelines
    const { data: timelines } = await supabaseAdmin
      .from('standalone_timelines')
      .select('*')
      .eq('user_id', user.id);
    exportData.standalone_timelines = timelines;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="aimily-data-export-${user.id}.json"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
