import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Disable body parsing — Stripe needs raw body for signature verification
export const dynamic = 'force-dynamic';

async function getRawBody(req: NextRequest): Promise<Buffer> {
  const arrayBuffer = await req.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function mapSubscriptionPlan(priceId: string): string {
  const priceMap: Record<string, string> = {};

  // Build map from env vars
  if (process.env.STRIPE_STARTER_MONTHLY_PRICE_ID) priceMap[process.env.STRIPE_STARTER_MONTHLY_PRICE_ID] = 'starter';
  if (process.env.STRIPE_STARTER_ANNUAL_PRICE_ID) priceMap[process.env.STRIPE_STARTER_ANNUAL_PRICE_ID] = 'starter';
  if (process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID) priceMap[process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID] = 'professional';
  if (process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID) priceMap[process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID] = 'professional';
  if (process.env.STRIPE_PRO_MAX_MONTHLY_PRICE_ID) priceMap[process.env.STRIPE_PRO_MAX_MONTHLY_PRICE_ID] = 'professional_max';
  if (process.env.STRIPE_PRO_MAX_ANNUAL_PRICE_ID) priceMap[process.env.STRIPE_PRO_MAX_ANNUAL_PRICE_ID] = 'professional_max';

  return priceMap[priceId] || 'trial';
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const item = subscription.items.data[0];
  const priceId = item?.price.id;
  const plan = mapSubscriptionPlan(priceId);

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
    incomplete: 'incomplete',
    incomplete_expired: 'canceled',
    paused: 'canceled',
  };
  const status = statusMap[subscription.status] || 'active';

  // Stripe API 2025+ moved current_period_start/end from the subscription
  // root onto each subscription item. Read from the item, fall back to
  // the legacy root for older API versions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemAny = item as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subAny = subscription as any;
  const periodStart = itemAny?.current_period_start ?? subAny.current_period_start;
  const periodEnd = itemAny?.current_period_end ?? subAny.current_period_end;

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      stripe_subscription_id: subscription.id,
      plan,
      status,
      current_period_start: periodStart
        ? new Date(periodStart * 1000).toISOString()
        : null,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Failed to update subscription:', error);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const userId = session.metadata?.supabase_user_id;

  if (!userId) {
    console.error('No supabase_user_id in checkout session metadata');
    return;
  }

  // Aimily Credits pack purchase (one-time payment, mode='payment')
  if (session.mode === 'payment' && session.metadata?.pack) {
    const imagery = parseInt(session.metadata.imagery || '0', 10);
    if (imagery <= 0) {
      console.error('Invalid imagery amount in pack metadata');
      return;
    }

    // Atomic credit add via RPC (handles concurrent purchases)
    const { error } = await supabaseAdmin.rpc('add_imagery_credits', {
      p_user_id: userId,
      p_amount: imagery,
      p_pack: session.metadata.pack,
      p_stripe_session_id: session.id,
    });

    if (error) {
      console.error('Failed to add imagery credits:', error);
    }
    return;
  }

  // Subscription checkout — ensure subscription row has customer ID
  await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      plan: session.metadata?.plan || 'starter',
      status: 'active',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers.get('stripe-signature');

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed': {
        // Mark subscription as past_due
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', invoice.subscription as string);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
