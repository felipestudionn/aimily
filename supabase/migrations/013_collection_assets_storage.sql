-- ============================================================
-- Migration 013: Collection Assets Storage Bucket + Policies
-- ============================================================

-- 1. Create storage bucket for collection assets (images, videos, sketches)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'collection-assets',
  'collection-assets',
  true,
  52428800, -- 50MB max (videos can be large)
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS policies for collection-assets bucket

-- Users can read assets from their collections
CREATE POLICY "Users read collection assets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'collection-assets'
  AND (
    auth.role() = 'service_role'
    OR (storage.foldername(name))[1] IN (
      SELECT id::text FROM collection_plans WHERE user_id = auth.uid()
    )
  )
);

-- Service role can upload (API routes use supabaseAdmin)
CREATE POLICY "Service role uploads collection assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'collection-assets'
  AND auth.role() = 'service_role'
);

-- Authenticated users can upload to their own collection folders
CREATE POLICY "Users upload to own collection folders"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'collection-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM collection_plans WHERE user_id = auth.uid()
  )
);

-- Service role can delete
CREATE POLICY "Service role deletes collection assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'collection-assets'
  AND auth.role() = 'service_role'
);

-- Users can delete from their own collection folders
CREATE POLICY "Users delete own collection assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'collection-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM collection_plans WHERE user_id = auth.uid()
  )
);

-- 3. Add service_role policy to collection_assets table (missing!)
CREATE POLICY "Service role manages collection assets"
ON public.collection_assets FOR ALL
USING (auth.role() = 'service_role');

-- 4. Add index for asset_type queries (common filter)
CREATE INDEX IF NOT EXISTS idx_collection_assets_type
ON public.collection_assets (collection_plan_id, asset_type);

-- 5. Add updated_at trigger if missing
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_collection_assets'
  ) THEN
    CREATE TRIGGER set_updated_at_collection_assets
    BEFORE UPDATE ON public.collection_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
