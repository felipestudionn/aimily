import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Cancel Stripe subscription if exists
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('user_id', user.id)
      .single();

    if (sub?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      } catch {
        // Subscription may already be cancelled
      }
    }

    if (sub?.stripe_customer_id) {
      try {
        await stripe.customers.del(sub.stripe_customer_id);
      } catch {
        // Customer may already be deleted
      }
    }

    // 2. Delete all user data from Supabase
    // Tables with direct user_id reference
    const directTables = ['subscriptions', 'ai_usage', 'standalone_timelines'];
    for (const table of directTables) {
      await supabaseAdmin.from(table).delete().eq('user_id', user.id);
    }

    // Get all collection_plan_ids for cascading delete
    const { data: plans } = await supabaseAdmin
      .from('collection_plans')
      .select('id')
      .eq('user_id', user.id);

    if (plans && plans.length > 0) {
      // Clean up Storage files for each collection
      const BUCKET = 'collection-assets';
      const assetTypes = ['moodboard', 'render', 'lifestyle', 'tryon', 'sketch', 'video', 'model'];
      for (const plan of plans) {
        const paths: string[] = [];
        for (const type of assetTypes) {
          const { data: files } = await supabaseAdmin.storage.from(BUCKET).list(`${plan.id}/${type}`);
          if (files?.length) paths.push(...files.map((f) => `${plan.id}/${type}/${f.name}`));
        }
        if (paths.length > 0) {
          for (let i = 0; i < paths.length; i += 100) {
            await supabaseAdmin.storage.from(BUCKET).remove(paths.slice(i, i + 100));
          }
        }
      }

      // Delete collection plans — CASCADE handles all 29 related tables automatically
      await supabaseAdmin.from('collection_plans').delete().eq('user_id', user.id);
    }

    // Delete user_brands
    await supabaseAdmin.from('user_brands').delete().eq('user_id', user.id);

    // 3. Delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
