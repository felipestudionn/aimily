-- Add merchandising fields to collection_skus
-- Origin: manufacturing origin for purchase planning
-- Size run: units per size for depth calculation
-- SKU role: product strategy classification (new/bestseller/carryover/capsule)
-- Source SKU ID: reference for carry-over/reinvention from previous collection

ALTER TABLE collection_skus
  ADD COLUMN IF NOT EXISTS origin text,
  ADD COLUMN IF NOT EXISTS size_run jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sku_role text DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS source_sku_id uuid REFERENCES collection_skus(id) ON DELETE SET NULL;

-- Add check constraints
ALTER TABLE collection_skus
  ADD CONSTRAINT sku_origin_check CHECK (origin IS NULL OR origin IN ('LOCAL', 'CHINA', 'EUROPE', 'OTHER')),
  ADD CONSTRAINT sku_role_check CHECK (sku_role IS NULL OR sku_role IN ('NEW', 'BESTSELLER_REINVENTION', 'CARRYOVER', 'CAPSULE'));
