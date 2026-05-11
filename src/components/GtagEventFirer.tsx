'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Fires Google Ads conversion events based on URL query params.
 *
 * - `?signup=1`         → fires Sign Up + Trial Start conversions
 *                          (set by auth/callback after email confirm)
 * - `?billing=success`  → fires Purchase conversion with value + currency
 *                          (set by Stripe success_url in /api/billing/checkout)
 *
 * For Aimily, "trial_start" is identical to "sign_up" because the 30-day
 * trial begins at signup without a card. Both fire on the same event so
 * Google Ads can use either as its primary conversion action.
 *
 * Conversion labels point to the conversion actions created in the Aimily
 * Google Ads account (customer 9058278352). If a label rotates after a
 * conversion-action delete + recreate, update the constants here.
 */

const CONV = {
  SIGN_UP: 'AW-18155964844/AK7mCLittascEKyTuNFD',
  TRIAL_START: 'AW-18155964844/Ec6DCLuttascEKyTuNFD',
  PURCHASE: 'AW-18155964844/aAUhCL6ttascEKyTuNFD',
};

export function GtagEventFirer() {
  const params = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const wantsSignup = params.get('signup') === '1';
    const wantsPurchase = params.get('billing') === 'success';
    if (!wantsSignup && !wantsPurchase) return;

    const value = Number(params.get('value') ?? 0);
    const currency = params.get('currency') ?? 'EUR';

    const fire = (gtag: (...args: unknown[]) => void) => {
      if (wantsSignup) {
        gtag('event', 'conversion', { send_to: CONV.SIGN_UP, value: 0, currency: 'EUR' });
        gtag('event', 'conversion', { send_to: CONV.TRIAL_START, value: 0, currency: 'EUR' });
      }
      if (wantsPurchase) {
        gtag('event', 'conversion', {
          send_to: CONV.PURCHASE,
          value: Number.isFinite(value) && value > 0 ? value : undefined,
          currency,
        });
      }
    };

    // The Google Ads <Script strategy="afterInteractive"> can finish loading
    // AFTER this effect first runs — most often on slow mobile networks,
    // which is exactly the cold-traffic profile Google Ads sends. Without
    // a retry, the conversion is silently lost. Poll every 200ms up to 5s
    // until window.gtag becomes a function, then fire. Bail if the
    // component unmounts before gtag arrives.
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 25; // 25 × 200ms = 5s
    const tryFire = () => {
      if (cancelled) return;
      const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
      if (typeof gtag === 'function') {
        fire(gtag);
        return;
      }
      attempts += 1;
      if (attempts >= maxAttempts) return;
      window.setTimeout(tryFire, 200);
    };
    tryFire();

    return () => {
      cancelled = true;
    };
  }, [params]);

  return null;
}
