/**
 * Pure FX conversion helpers — used by CostingPanel and the BOM
 * editor when the factory quotes prices in a non-EUR currency.
 *
 * The shape mirrors what /api/fx-rates returns. eur_rate is "how
 * many of <currency> you get for 1 EUR", so:
 *   amount_eur = amount_local / fx_rates[currency].eur_rate
 *   amount_local = amount_eur * fx_rates[currency].eur_rate
 *
 * Functions are pure — easy to unit-test and reuse anywhere.
 */

export interface FxRate {
  currency: string;
  eur_rate: number;
  rate_date: string;
}

/** Top currencies fashion factories quote in. */
export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'CNY', 'VND', 'TRY', 'INR', 'BRL', 'JPY', 'KRW', 'MXN'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Convert an amount in `from` to EUR. Returns the original amount if
 * `from` is EUR or if no FX rate is found (defensive: we never want
 * to silently 0-out a cost number on a missing rate).
 */
export function toEur(amount: number, from: string, rates: FxRate[]): number {
  if (!Number.isFinite(amount)) return 0;
  if (from === 'EUR' || !from) return amount;
  const r = rates.find((x) => x.currency === from);
  if (!r || r.eur_rate <= 0) return amount;
  return amount / r.eur_rate;
}

/** Convert an EUR amount to `to`. Inverse of toEur. */
export function fromEur(amountEur: number, to: string, rates: FxRate[]): number {
  if (!Number.isFinite(amountEur)) return 0;
  if (to === 'EUR' || !to) return amountEur;
  const r = rates.find((x) => x.currency === to);
  if (!r || r.eur_rate <= 0) return amountEur;
  return amountEur * r.eur_rate;
}

/** Format a number with the proper grouping for a currency display. */
export function formatCurrency(amount: number, currency: string, locale = 'en-EU'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
