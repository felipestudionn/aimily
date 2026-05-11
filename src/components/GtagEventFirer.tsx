'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Fires Google Ads conversion events based on URL query params.
 *
 * - `?signup=1`         → `sign_up` (set by auth/callback after email confirm)
 * - `?billing=success`  → `purchase` (set by Stripe success_url)
 *
 * For Aimily, "trial_start" is identical to "sign_up" because the 30-day
 * trial begins at signup without a card. We expose both event names so
 * Google Ads can use either as its conversion action.
 *
 * Value attribution: `?value=` and `?currency=` params on `billing=success`
 * (set in /api/billing/checkout) feed the conversion value.
 */
export function GtagEventFirer() {
  const params = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof gtag !== 'function') return;

    if (params.get('signup') === '1') {
      gtag('event', 'sign_up');
      gtag('event', 'trial_start');
    }

    if (params.get('billing') === 'success') {
      const value = Number(params.get('value') ?? 0);
      const currency = params.get('currency') ?? 'EUR';
      gtag('event', 'purchase', {
        value: Number.isFinite(value) && value > 0 ? value : undefined,
        currency,
      });
    }
  }, [params]);

  return null;
}
