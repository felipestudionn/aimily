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

    // Find the latest paid invoice for this customer
    const invoices = await stripe.invoices.list({
      customer: sub.stripe_customer_id,
      limit: 1,
      status: 'paid',
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

    // Resolve the charge to refund. Modern Stripe puts the charge id on
    // the invoice via expand, but we read it from latest_invoice.charge.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoiceAny = invoice as any;
    const chargeId: string | null = invoiceAny.charge || invoiceAny.payment_intent || null;
    if (!chargeId) {
      // Fall back to expanding the invoice
      const fullInvoice = await stripe.invoices.retrieve(invoice.id!, {
        expand: ['charge', 'payment_intent'],
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fi = fullInvoice as any;
      const fallback = (typeof fi.charge === 'string' ? fi.charge : fi.charge?.id)
        || (typeof fi.payment_intent === 'string' ? fi.payment_intent : fi.payment_intent?.id);
      if (!fallback) {
        return NextResponse.json(
          { error: 'no_charge_found', message: 'Could not locate the charge for refund.' },
          { status: 500 },
        );
      }
      // Create refund via payment_intent if charge is missing
      await stripe.refunds.create(
        typeof fallback === 'string' && fallback.startsWith('pi_')
          ? { payment_intent: fallback, reason: 'requested_by_customer' }
          : { charge: fallback, reason: 'requested_by_customer' }
      );
    } else {
      await stripe.refunds.create({
        charge: chargeId,
        reason: 'requested_by_customer',
      });
    }

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
