-- Phase 8 — Currency support for non-EUR factories.
--
-- Stores the daily ECB Euro FX reference rates so the costing engine
-- can convert factory-quoted prices (USD, CNY, VND, TRY, GBP, …) into
-- EUR before recalculating margin. ECB publishes once a day around
-- 16:00 CET; the cron at /api/cron/fx-rates fetches and upserts here.
--
-- Schema kept minimal on purpose: one row per currency, last rate
-- wins. Historical rates aren't needed for the costing flow (we
-- always price at "today's" rate); if we ever need history we add a
-- separate fx_rates_history table.

CREATE TABLE IF NOT EXISTS public.fx_rates (
  currency    text PRIMARY KEY,
  eur_rate    numeric NOT NULL,        -- "1 EUR = N <currency>"
  rate_date   date NOT NULL,
  fetched_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fx_rates_read ON public.fx_rates;
CREATE POLICY fx_rates_read ON public.fx_rates
  FOR SELECT USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.fx_rates IS
  'ECB Euro FX reference rates, refreshed daily by /api/cron/fx-rates. eur_rate = how many of the target currency you get for 1 EUR.';
