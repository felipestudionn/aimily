-- Migration 020: aimily_models — AI-generated model roster for editorial casting
--
-- 28 synthetic models (14 female, 14 male) with full rights.
-- Each model has a headshot in Supabase Storage and metadata
-- (gender, complexion, hair, age range) used by the editorial
-- endpoint to compose on-model narrative scenes.
--
-- The model's headshot is passed as a reference image to Nano Banana
-- alongside the product 3D render and an optional style reference.
-- The face-blur preprocessing ensures the style reference's face
-- doesn't leak; the model headshot provides the face identity.

BEGIN;

CREATE TABLE IF NOT EXISTS aimily_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  gender TEXT NOT NULL CHECK (gender IN ('female', 'male')),
  headshot_url TEXT NOT NULL,
  complexion TEXT NOT NULL,
  hair_style TEXT NOT NULL,
  hair_color TEXT NOT NULL,
  age_range TEXT NOT NULL,
  ethnicity TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast roster queries filtered by gender
CREATE INDEX idx_aimily_models_gender_active ON aimily_models (gender, is_active);

COMMIT;
