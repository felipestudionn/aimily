-- 051 · sketch_back_url for the new BACK view in /api/ai/generate-sketch-options
--
-- Felipe (2026-05-13): every SKU must surface a back-view sketch alongside
-- the existing side/top (footwear) or front (apparel). If the reference
-- photo doesn't show the back, the AI infers it from common construction
-- conventions and the brand style. Column is nullable so legacy rows keep
-- working untouched.
ALTER TABLE collection_skus
  ADD COLUMN IF NOT EXISTS sketch_back_url TEXT;

COMMENT ON COLUMN collection_skus.sketch_back_url IS
  'Persisted URL of the BACK-view flat sketch. Populated by /api/ai/generate-sketch-options (or manual upload). Nullable: legacy SKUs that pre-date this column simply hide the back panel.';
