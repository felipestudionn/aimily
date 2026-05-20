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
  // Canonical plan price IDs (post-rebrand). The previous Starter/Professional/
  // Pro Max products were archived 2026-05-20 and their price IDs are no
  // longer issued by Checkout, so no fallback table is needed.
  const priceMap: Record<string, string> = {};
  if (process.env.STRIPE_FOUNDER_MONTHLY_PRICE_ID) priceMap[process.env.STRIPE_FOUNDER_MONTHLY_PRICE_ID] = 'founder';
  if (process.env.STRIPE_FOUNDER_ANNUAL_PRICE_ID) priceMap[process.env.STRIPE_FOUNDER_ANNUAL_PRICE_ID] = 'founder';
  if (process.env.STRIPE_TEAM_MONTHLY_PRICE_ID) priceMap[process.env.STRIPE_TEAM_MONTHLY_PRICE_ID] = 'team';
  if (process.env.STRIPE_TEAM_ANNUAL_PRICE_ID) priceMap[process.env.STRIPE_TEAM_ANNUAL_PRICE_ID] = 'team';
  if (process.env.STRIPE_TEAM_PRO_MONTHLY_PRICE_ID) priceMap[process.env.STRIPE_TEAM_PRO_MONTHLY_PRICE_ID] = 'team_pro';
  if (process.env.STRIPE_TEAM_PRO_ANNUAL_PRICE_ID) priceMap[process.env.STRIPE_TEAM_PRO_ANNUAL_PRICE_ID] = 'team_pro';
  return priceMap[priceId] || 'trial';
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const item = subscription.items.data[0];
  const priceId = item?.price.id;
  const stripeStatus = subscription.status;

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
  const status = statusMap[stripeStatus] || 'active';

  // Plan: when the subscription is canceled, the user no longer has paid
  // access — set plan back to 'trial' regardless of which price the
  // (now dead) subscription was on. Otherwise, derive plan from the
  // current price id.
  const plan = (status === 'canceled' || status === 'unpaid')
    ? 'trial'
    : mapSubscriptionPlan(priceId);

  // Stripe API 2025+ moved current_period_start/end from the subscription
  // root onto each subscription item. Read from the item, fall back to
  // the legacy root for older API versions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemAny = item as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subAny = subscription as any;
  const periodStart = itemAny?.current_period_start ?? subAny.current_period_start;
  const periodEnd = itemAny?.current_period_end ?? subAny.current_period_end;

  // When a subscription transitions back to active/trialing, any
  // refund-in-flight metadata from a *previous* (refunded) sub on the
  // same customer is stale. Clear it so /account doesn't render
  // "tu reembolso de €X está en camino" on a healthy paid sub, and so
  // a future cancel of this new sub doesn't surface the old refund's
  // amount. Invariant enforced: an active/trialing row has null refund
  // fields.
  const isActiveSub = status === 'active' || status === 'trialing';

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
      ...(isActiveSub ? {
        refunded_at: null,
        refund_amount_cents: null,
        refund_currency: null,
      } : {}),
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

  // Aimily Studio pack purchase (one-time payment, mode='payment', metadata.type='studio_pack')
  // Allocates the bundle of outputs into the project's studio_purchases pool.
  if (session.mode === 'payment' && session.metadata?.type === 'studio_pack') {
    const studioProjectId = session.metadata?.studio_project_id;
    const tier = session.metadata?.tier;
    const outputsRaw = session.metadata?.outputs;
    const outputs = outputsRaw ? parseInt(outputsRaw, 10) : 0;

    if (!studioProjectId || !tier || !outputs || outputs <= 0) {
      console.error('[Stripe webhook] Invalid studio_pack metadata:', session.metadata);
      return;
    }
    if (!['capsule', 'editorial', 'full_campaign'].includes(tier)) {
      console.error('[Stripe webhook] Invalid studio_pack tier:', tier);
      return;
    }

    // session.payment_intent is the PaymentIntent ID; use it as the idempotency key
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

    if (!paymentIntentId) {
      console.error('[Stripe webhook] No payment_intent on studio_pack session');
      return;
    }

    const amountCents = typeof session.amount_total === 'number' ? session.amount_total : null;

    const { error } = await supabaseAdmin.rpc('allocate_studio_outputs', {
      p_user_id: userId,
      p_studio_project_id: studioProjectId,
      p_pack_tier: tier,
      p_outputs_count: outputs,
      p_stripe_payment_intent_id: paymentIntentId,
      p_amount_eur_cents: amountCents,
    });

    if (error) {
      console.error('[Stripe webhook] Failed to allocate studio outputs:', error);
    } else {
      console.log(
        `[Stripe webhook] Allocated ${outputs} ${tier} outputs to studio_project ${studioProjectId} for user ${userId}`
      );
    }
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
  // and reset any stale refund metadata from a previous refunded sub.
  await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      plan: session.metadata?.plan || 'founder',
      status: 'active',
      refunded_at: null,
      refund_amount_cents: null,
      refund_currency: null,
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
