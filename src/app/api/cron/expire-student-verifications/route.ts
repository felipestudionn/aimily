import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Daily cron — expires student verifications past their 12-month window
 * and downgrades the corresponding subscription rows back to `trial`.
 *
 * Wraps the SQL function `expire_student_verifications()` defined in
 * migration 045. Returns the count of expired rows.
 *
 * Verifies CRON_SECRET to block public invocation.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.rpc('expire_student_verifications');

  if (error) {
    console.error('expire_student_verifications RPC failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const expiredCount = typeof data === 'number' ? data : 0;
  return NextResponse.json({
    ok: true,
    expired: expiredCount,
    timestamp: new Date().toISOString(),
  });
}
