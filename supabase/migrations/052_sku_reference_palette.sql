-- 052 · reference_palette for the SKU's reference image
--
-- Felipe (2026-05-13): "one of the colorway proposals (the first) must use
-- the colors that come from the reference photo. If we extract them, save
-- them so we don't extract twice."
--
-- Stores 5-6 dominant hex colors extracted from sku.reference_image_url
-- by /api/ai/design-generate when type='color-suggest'. Re-extraction
-- happens automatically if the column is null AND a reference image
-- exists; otherwise we reuse the cached palette. When the reference
-- image is replaced, the column is wiped so the next color-suggest call
-- re-extracts.
ALTER TABLE collection_skus
  ADD COLUMN IF NOT EXISTS reference_palette JSONB;

COMMENT ON COLUMN collection_skus.reference_palette IS
  'Array of {hex, name?, share?} extracted from reference_image_url via sharp k-means clustering. Null until first extraction; cleared whenever reference_image_url changes. Reused as the seed for the first colorway proposal so that proposal always reads back the reference photo faithfully.';
