import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/* ═══════════════════════════════════════════════════════════════════════════
   Aimily Studio · /api/studio/checkout

   Creates a Stripe Checkout Session for a Studio pack purchase. The webhook
   (/api/webhooks/stripe) reads metadata.type='studio_pack' on the resulting
   payment_intent.succeeded and calls allocate_studio_outputs() to credit the
   project pool with the matching number of outputs.

   Body:
     {
       studio_project_id: UUID  (must belong to the authenticated user),
       tier: 'capsule' | 'editorial' | 'full_campaign'
     }

   Returns: { url: string }  (Stripe-hosted checkout URL)
   ═══════════════════════════════════════════════════════════════════════════ */

interface CheckoutBody {
  studio_project_id: string;
  tier: 'capsule' | 'editorial' | 'full_campaign';
}

const STUDIO_TIER_CONFIG: Record<
  CheckoutBody['tier'],
  { priceIdEnv: string; outputs: number; amountEur: number; label: string }
> = {
  capsule: {
    priceIdEnv: 'STRIPE_STUDIO_CAPSULE_PRICE_ID',
    outputs: 10,
    amountEur: 49,
    label: 'Aimily Studio · Capsule',
  },
  editorial: {
    priceIdEnv: 'STRIPE_STUDIO_EDITORIAL_PRICE_ID',
    outputs: 25,
    amountEur: 99,
    label: 'Aimily Studio · Editorial',
  },
  full_campaign: {
    priceIdEnv: 'STRIPE_STUDIO_FULL_CAMPAIGN_PRICE_ID',
    outputs: 50,
    amountEur: 199,
    label: 'Aimily Studio · Full Campaign',
  },
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as CheckoutBody;

    if (!body.studio_project_id) {
      return NextResponse.json({ error: 'studio_project_id required' }, { status: 400 });
    }
    if (!body.tier || !STUDIO_TIER_CONFIG[body.tier]) {
      return NextResponse.json({ error: 'tier must be capsule | editorial | full_campaign' }, { status: 400 });
    }

    // Verify project ownership
    const { data: project } = await supabaseAdmin
      .from('studio_projects')
      .select('id, user_id, brand_name')
      .eq('id', body.studio_project_id)
      .single();
    if (!project || project.user_id !== user.id) {
      return NextResponse.json({ error: 'studio_project not found' }, { status: 404 });
    }

    const cfg = STUDIO_TIER_CONFIG[body.tier];
    const priceId = process.env[cfg.priceIdEnv];
    if (!priceId) {
      console.error(`[Studio checkout] Missing env: ${cfg.priceIdEnv}`);
      return NextResponse.json({ error: 'Studio price not configured' }, { status: 500 });
    }

    // Get-or-create Stripe customer (reuses existing subscriptions table)
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = existingSub?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin.from('subscriptions').upsert(
        {
          user_id: user.id,
          stripe_customer_id: customerId,
          plan: 'trial',
          status: 'active',
        },
        { onConflict: 'user_id' }
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card', 'paypal'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.nextUrl.origin}/studio/${body.studio_project_id}?studio_pack=success&tier=${body.tier}`,
      cancel_url: `${req.nextUrl.origin}/studio/${body.studio_project_id}?studio_pack=canceled`,
      metadata: {
        supabase_user_id: user.id,
        type: 'studio_pack',
        tier: body.tier,
        outputs: String(cfg.outputs),
        studio_project_id: body.studio_project_id,
      },
      // Same metadata is propagated to the payment_intent so the webhook can read it
      payment_intent_data: {
        metadata: {
          supabase_user_id: user.id,
          type: 'studio_pack',
          tier: body.tier,
          outputs: String(cfg.outputs),
          studio_project_id: body.studio_project_id,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[Studio checkout] error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
