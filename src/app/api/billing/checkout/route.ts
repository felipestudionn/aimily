import { NextRequest, NextResponse } from 'next/server';
import { stripe, PLANS, PlanId, AIMILY_CREDITS_PACKS, CreditPackId } from '@/lib/stripe';
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
        payment_method_types: ['card'],
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
    if (!plan || !PLANS[plan] || plan === 'trial' || plan === 'enterprise') {
      return NextResponse.json({ error: 'Invalid plan — only starter, professional and professional_max support self-serve checkout' }, { status: 400 });
    }

    const planConfig = PLANS[plan];
    const priceId = body.annual
      ? planConfig.stripePriceIdAnnual
      : planConfig.stripePriceId;

    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured' }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.nextUrl.origin}/my-collections?billing=success`,
      cancel_url: `${req.nextUrl.origin}/?billing=canceled#pricing`,
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
