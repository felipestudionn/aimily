import { NextRequest, NextResponse } from 'next/server';
import { stripe, PLANS, PlanId, AIMILY_CREDITS_PACKS, CreditPackId, LAUNCH_PROMO_COUPON_ID } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json() as { plan?: PlanId; annual?: boolean; pack?: CreditPackId };

    // Get or create Stripe customer
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, status, plan')
      .eq('user_id', user.id)
      .single();

    // Guard against double-billing: if the user already has a live
    // Stripe subscription (active / trialing / past_due / unpaid /
    // incomplete), creating a second checkout session would result in
    // two parallel subscriptions on the same customer. Subscription
    // changes must go through the Customer Portal so Stripe handles
    // proration. Credit-pack purchases are exempt — they're one-time
    // payments that stack on top of any plan.
    const liveSubStates = ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'];
    if (
      !body.pack &&
      existingSub?.stripe_subscription_id &&
      liveSubStates.includes(existingSub.status as string)
    ) {
      return NextResponse.json(
        {
          error: 'has_active_subscription',
          message: 'You already have a subscription. Use "Manage Subscription" to change plan.',
          portalRequired: true,
        },
        { status: 409 },
      );
    }

    let customerId = existingSub?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await supabaseAdmin.from('subscriptions').upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        plan: 'trial',
        status: 'active',
      }, { onConflict: 'user_id' });
    }

    // Aimily Credits pack purchase (one-time payment)
    if (body.pack) {
      const packConfig = AIMILY_CREDITS_PACKS[body.pack];
      if (!packConfig) {
        return NextResponse.json({ error: 'Invalid credit pack' }, { status: 400 });
      }
      if (!packConfig.stripePriceId) {
        return NextResponse.json({ error: 'Pack price not configured' }, { status: 500 });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        // Card includes Apple Pay + Google Pay automatically when the
        // domain is verified in Stripe Dashboard. PayPal needs explicit
        // listing.
        payment_method_types: ['card', 'paypal'],
        line_items: [{ price: packConfig.stripePriceId, quantity: 1 }],
        success_url: `${req.nextUrl.origin}/my-collections?credits=success`,
        cancel_url: `${req.nextUrl.origin}/?credits=canceled#pricing`,
        metadata: {
          supabase_user_id: user.id,
          pack: body.pack,
          imagery: String(packConfig.imagery),
        },
      });

      return NextResponse.json({ url: session.url });
    }

    // Subscription plan checkout
    const plan = body.plan;
    if (!plan || !PLANS[plan] || plan === 'trial' || plan === 'student' || plan === 'enterprise') {
      return NextResponse.json(
        { error: 'Invalid plan — only founder, team and team_pro support self-serve checkout' },
        { status: 400 },
      );
    }

    const planConfig = PLANS[plan];
    const priceId = body.annual
      ? planConfig.stripePriceIdAnnual
      : planConfig.stripePriceId;

    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured' }, { status: 500 });
    }

    // Try to claim a launch promo slot (first 100 paid subs get 50% off
    // for 12 months via coupon LAUNCH-50-Y1). The RPC is atomic + locks
    // the counter row, so concurrent checkouts can't oversell. If no
    // slot is available, the user gets the regular price — no error.
    let promoApplied = false;
    try {
      const { data: claim, error: claimErr } = await supabaseAdmin.rpc('claim_launch_promo_slot');
      if (!claimErr && Array.isArray(claim) && claim[0]?.claimed) {
        promoApplied = true;
      }
    } catch (e) {
      console.error('claim_launch_promo_slot RPC failed (continuing without promo):', e);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      // Card includes Apple Pay + Google Pay automatically when the
      // domain is verified in Stripe Dashboard. PayPal needs explicit
      // listing.
      payment_method_types: ['card', 'paypal'],
      // Trial without credit card friction — Stripe won't ask for a
      // payment method during the trial. The user enters payment when
      // the trial ends and they want to keep going.
      payment_method_collection: 'if_required',
      subscription_data: {
        trial_period_days: 30,
        ...(promoApplied ? { metadata: { launch_promo: 'first_100_y1' } } : {}),
      },
      ...(promoApplied
        ? { discounts: [{ coupon: LAUNCH_PROMO_COUPON_ID }] }
        : { allow_promotion_codes: true }),
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.nextUrl.origin}/my-collections?billing=success`,
      cancel_url: `${req.nextUrl.origin}/?billing=canceled#pricing`,
      metadata: {
        supabase_user_id: user.id,
        plan,
        ...(promoApplied ? { launch_promo: 'first_100_y1' } : {}),
      },
    });

    return NextResponse.json({ url: session.url, promoApplied });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
