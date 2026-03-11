import { NextRequest, NextResponse } from 'next/server';
import { stripe, PLANS, PlanId } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan, annual } = await req.json() as { plan: PlanId; annual?: boolean };

    if (!plan || !PLANS[plan] || plan === 'trial' || plan === 'enterprise') {
      return NextResponse.json({ error: 'Invalid plan — only starter and professional support self-serve checkout' }, { status: 400 });
    }

    const planConfig = PLANS[plan];
    const priceId = annual
      ? planConfig.stripePriceIdAnnual
      : planConfig.stripePriceId;

    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured' }, { status: 500 });
    }

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

      // Upsert subscription record with customer ID
      await supabaseAdmin.from('subscriptions').upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        plan: 'trial',
        status: 'active',
      }, { onConflict: 'user_id' });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.nextUrl.origin}/my-collections?billing=success`,
      cancel_url: `${req.nextUrl.origin}/pricing?billing=canceled`,
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
