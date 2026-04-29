import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * POST /api/billing/refund
 *
 * Self-service 7-day money-back guarantee.
 *
 * Flow:
 *   1. Authenticated user only.
 *   2. Read their subscription + Stripe customer.
 *   3. Pull the latest paid invoice from Stripe.
 *   4. If invoice was paid within the last 7 days, refund the underlying
 *      charge and cancel the subscription immediately. Otherwise 403.
 *   5. Update the local subscription row to status='canceled'.
 *
 * After this runs, the user is logged out / immediately downgraded to
 * trial (the SubscriptionContext refresh will pick it up). The Stripe
 * webhook customer.subscription.deleted will arrive a moment later and
 * keep the row in sync.
 */
const REFUND_WINDOW_DAYS = 7;

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch subscription
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, plan, status, is_admin')
      .eq('user_id', user.id)
      .single();

    if (sub?.is_admin) {
      return NextResponse.json(
        { error: 'admin_account', message: 'Administrative accounts cannot request refunds.' },
        { status: 400 },
      );
    }

    if (!sub?.stripe_customer_id || !sub?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'no_active_subscription', message: 'You do not have an active paid subscription.' },
        { status: 400 },
      );
    }

    // Find the latest paid invoice for this customer.
    // Expand `payments` so the modern API shape (post-2024 invoice payments)
    // gives us a payment_intent we can refund against.
    const invoices = await stripe.invoices.list({
      customer: sub.stripe_customer_id,
      limit: 1,
      status: 'paid',
      expand: ['data.payments'],
    });

    const invoice = invoices.data[0];
    if (!invoice) {
      return NextResponse.json(
        { error: 'no_paid_invoice', message: 'No paid invoice found.' },
        { status: 400 },
      );
    }

    // 7-day window check
    const ageMs = Date.now() - (invoice.created * 1000);
    const windowMs = REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    if (ageMs > windowMs) {
      const daysAgo = Math.floor(ageMs / (24 * 60 * 60 * 1000));
      return NextResponse.json(
        {
          error: 'window_expired',
          message: `Self-service refund is only available within ${REFUND_WINDOW_DAYS} days of your first payment. Your invoice was paid ${daysAgo} days ago. You can still cancel your subscription anytime via "Manage Subscription".`,
          daysAgo,
        },
        { status: 403 },
      );
    }

    // Resolve the payment to refund. Stripe API shapes (newest → oldest):
    //   1. invoice.payments[0].payment.payment_intent  (modern, 2024+)
    //   2. invoice.payment_intent                      (legacy)
    //   3. invoice.charge                              (very legacy)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoiceAny = invoice as any;
    let paymentIntentId: string | null = null;
    let chargeId: string | null = null;

    const payments = invoiceAny.payments?.data || [];
    if (payments.length > 0) {
      const p = payments[0];
      const pi = p?.payment?.payment_intent;
      if (typeof pi === 'string') paymentIntentId = pi;
      else if (pi?.id) paymentIntentId = pi.id;
    }
    if (!paymentIntentId) {
      const legacyPi = invoiceAny.payment_intent;
      if (typeof legacyPi === 'string') paymentIntentId = legacyPi;
      else if (legacyPi?.id) paymentIntentId = legacyPi.id;
    }
    if (!paymentIntentId) {
      const legacyCharge = invoiceAny.charge;
      if (typeof legacyCharge === 'string') chargeId = legacyCharge;
      else if (legacyCharge?.id) chargeId = legacyCharge.id;
    }

    if (!paymentIntentId && !chargeId) {
      return NextResponse.json(
        { error: 'no_charge_found', message: 'Could not locate the charge for refund. Please contact hello@aimily.app.' },
        { status: 500 },
      );
    }

    await stripe.refunds.create(
      paymentIntentId
        ? { payment_intent: paymentIntentId, reason: 'requested_by_customer' }
        : { charge: chargeId!, reason: 'requested_by_customer' }
    );

    // Cancel subscription immediately (not at_period_end — they got their
    // money back, no reason to leave them with paid access).
    await stripe.subscriptions.cancel(sub.stripe_subscription_id, {
      invoice_now: false,
      prorate: false,
    });

    // Mirror locally so the UI updates without waiting for the webhook
    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'canceled',
        plan: 'trial',
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return NextResponse.json({
      ok: true,
      refunded: invoice.amount_paid,
      currency: invoice.currency,
    });
  } catch (error) {
    console.error('Refund error:', error);
    const message = error instanceof Error ? error.message : 'Refund failed';
    return NextResponse.json({ error: 'refund_failed', message }, { status: 500 });
  }
}
