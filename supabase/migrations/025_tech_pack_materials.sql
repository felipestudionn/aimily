-- Dedicated materials column for Pantone swatches + supplier references.
-- Separate from BOM: BOM is what goes into the build order; materials
-- is the visual reference library (swatches, color chips).
ALTER TABLE public.tech_pack_data
  ADD COLUMN IF NOT EXISTS materials jsonb DEFAULT '{}'::jsonb;
