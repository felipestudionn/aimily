import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/billing/refund-eligibility
 *
 * Reports whether the user is within the 7-day money-back window for
 * their latest paid invoice. The /account page uses this to decide
 * whether to render the "Request refund" button.
 */
const REFUND_WINDOW_DAYS = 7;

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ eligible: false, reason: 'unauthenticated' }, { status: 401 });
  }

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id, stripe_subscription_id, plan, status, is_admin')
    .eq('user_id', user.id)
    .single();

  if (sub?.is_admin) {
    return NextResponse.json({ eligible: false, reason: 'admin' });
  }
  if (!sub?.stripe_customer_id || !sub?.stripe_subscription_id) {
    return NextResponse.json({ eligible: false, reason: 'no_subscription' });
  }
  if (sub.status === 'canceled' || sub.status === 'unpaid') {
    return NextResponse.json({ eligible: false, reason: 'subscription_inactive' });
  }

  try {
    const invoices = await stripe.invoices.list({
      customer: sub.stripe_customer_id,
      limit: 1,
      status: 'paid',
    });
    const invoice = invoices.data[0];
    if (!invoice) {
      return NextResponse.json({ eligible: false, reason: 'no_paid_invoice' });
    }

    const paidAt = invoice.created * 1000;
    const ageMs = Date.now() - paidAt;
    const windowMs = REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const eligible = ageMs <= windowMs;
    const daysRemaining = Math.max(0, Math.ceil((windowMs - ageMs) / (24 * 60 * 60 * 1000)));

    return NextResponse.json({
      eligible,
      reason: eligible ? 'within_window' : 'window_expired',
      daysRemaining,
      paidAt: new Date(paidAt).toISOString(),
      amount: invoice.amount_paid,
      currency: invoice.currency,
    });
  } catch (error) {
    console.error('Refund eligibility error:', error);
    return NextResponse.json({ eligible: false, reason: 'error' }, { status: 500 });
  }
}
