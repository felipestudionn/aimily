import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Student tier auto-verification.
 *
 * Called after signup (or manually from /account → "Activate Student").
 * Looks up the user's email domain in `academic_domains`. If matched and
 * active, creates a `student_verifications` row valid for 12 months and
 * upgrades `subscriptions.plan` to 'student'.
 *
 * Returns:
 *   { eligible: false, reason }                                — not whitelisted
 *   { eligible: true, school_name, expires_at, already_active } — success
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = user.email.toLowerCase().trim();
    const domain = email.split('@')[1];
    if (!domain) {
      return NextResponse.json({ eligible: false, reason: 'invalid_email' }, { status: 400 });
    }

    // Already verified?
    const { data: existing } = await supabaseAdmin
      .from('student_verifications')
      .select('id, status, expires_at, school_name')
      .eq('user_id', user.id)
      .single();

    if (existing && existing.status === 'active' && new Date(existing.expires_at) > new Date()) {
      return NextResponse.json({
        eligible: true,
        already_active: true,
        school_name: existing.school_name,
        expires_at: existing.expires_at,
      });
    }

    // Look up domain in whitelist
    const { data: domainRow } = await supabaseAdmin
      .from('academic_domains')
      .select('domain, school_name')
      .eq('domain', domain)
      .eq('active', true)
      .single();

    if (!domainRow) {
      return NextResponse.json({
        eligible: false,
        reason: 'domain_not_whitelisted',
        domain,
        message: 'Your email domain is not on our verified academic list. Ask your school to contact hello@aimily.app to be added.',
      }, { status: 200 });
    }

    // Block if user already has a paid subscription
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('plan, status, stripe_subscription_id')
      .eq('user_id', user.id)
      .single();

    if (sub?.stripe_subscription_id && ['active', 'trialing', 'past_due'].includes(sub.status as string)) {
      return NextResponse.json({
        eligible: false,
        reason: 'has_paid_subscription',
        message: 'You already have a paid subscription. Cancel it first to switch to Student.',
      }, { status: 409 });
    }

    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    // Upsert verification (handles re-verification for users whose previous
    // verification expired or was revoked)
    const { error: vErr } = await supabaseAdmin
      .from('student_verifications')
      .upsert({
        user_id: user.id,
        email,
        domain,
        school_name: domainRow.school_name,
        verification_method: 'email_domain',
        status: 'active',
        verified_at: new Date().toISOString(),
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (vErr) {
      console.error('Failed to insert student_verification:', vErr);
      return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }

    // Upgrade subscription row to 'student' plan
    const { error: sErr } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan: 'student',
        status: 'active',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (sErr) {
      console.error('Failed to upgrade subscription to student:', sErr);
      return NextResponse.json({ error: 'Subscription upgrade failed' }, { status: 500 });
    }

    return NextResponse.json({
      eligible: true,
      already_active: false,
      school_name: domainRow.school_name,
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error('Student verify error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
