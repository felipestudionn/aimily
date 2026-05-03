-- Phase 7 — backfill cost_breakdown for SKUs that existed before the
-- Phase 2 costing engine landed. Stub shape uses source_of_truth='manual'
-- so the existing sku.cost stays canonical and the CostingPanel reads
-- consistent numbers. BOM rolled-up stays 0 until the BOM gets filled.
-- Target margin defaults to 65%.

UPDATE public.collection_skus
SET cost_breakdown = jsonb_build_object(
  'materials', jsonb_build_object(
    'bom_rolled_up', 0,
    'manual_override', COALESCE(cost, 0),
    'source_of_truth', 'manual',
    'effective', COALESCE(cost, 0)
  ),
  'labor', jsonb_build_object('factory_rate', 0, 'hours', 0, 'total', 0),
  'overhead_pct', 0,
  'overhead_total', 0,
  'freight', jsonb_build_object('origin', '', 'destination', '', 'method', 'sea', 'total', 0),
  'duties_pct', 0,
  'duties_total', 0,
  'total_landed', COALESCE(cost, 0),
  'target_margin_pct', 65,
  'current_margin_pct',
    CASE WHEN COALESCE(pvp,0) > 0 THEN ROUND((((pvp - COALESCE(cost,0)) / pvp) * 100)::numeric, 1) ELSE 0 END,
  'variance_pct',
    CASE WHEN COALESCE(pvp,0) > 0 THEN ROUND((((pvp - COALESCE(cost,0)) / pvp) * 100 - 65)::numeric, 1) ELSE -65 END,
  'last_recalc_at', now()::text,
  'ai_suggestions', '[]'::jsonb
)
WHERE cost_breakdown IS NULL OR cost_breakdown = '{}'::jsonb;
