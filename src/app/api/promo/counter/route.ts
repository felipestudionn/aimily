import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Public endpoint — returns current launch promo counter state for the
 * pricing page UI ("X / 100 spots left at -50%").
 *
 * Cached for 60s (Vercel CDN) since the value changes slowly enough that
 * showing a slightly stale number is fine, and we don't want to hammer
 * the DB on every page view.
 */
export const revalidate = 60;

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('launch_promo_counter')
      .select('promo_code, total_slots, claimed_slots, active')
      .eq('id', 1)
      .single();

    if (error || !data) {
      return NextResponse.json({
        active: false,
        total_slots: 100,
        claimed_slots: 0,
        slots_left: 100,
      });
    }

    const slotsLeft = Math.max(0, data.total_slots - data.claimed_slots);

    return NextResponse.json({
      active: data.active && slotsLeft > 0,
      promo_code: data.promo_code,
      total_slots: data.total_slots,
      claimed_slots: data.claimed_slots,
      slots_left: slotsLeft,
    });
  } catch (err) {
    console.error('Promo counter error:', err);
    return NextResponse.json({
      active: false,
      total_slots: 100,
      claimed_slots: 0,
      slots_left: 100,
    });
  }
}
