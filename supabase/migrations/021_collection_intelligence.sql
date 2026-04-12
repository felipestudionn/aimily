-- Migration 021: Collection Intelligence System (CIS)
-- See src/lib/collection-intelligence.ts for the full system documentation.
-- Applied via mcp__supabase__apply_migration on 2026-04-12.

BEGIN;

CREATE TABLE IF NOT EXISTS collection_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_plan_id UUID NOT NULL REFERENCES collection_plans(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  subdomain TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'text',
  rationale TEXT,
  confidence TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (confidence IN ('suggested', 'draft', 'confirmed', 'approved', 'locked')),
  source TEXT NOT NULL DEFAULT 'user_input'
    CHECK (source IN ('user_input', 'ai_recommendation', 'import', 'calculation', 'inherited')),
  source_phase TEXT NOT NULL,
  source_component TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  supersedes_id UUID REFERENCES collection_decisions(id),
  is_current BOOLEAN NOT NULL DEFAULT true,
  decided_by UUID,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tags TEXT[] DEFAULT '{}',
  UNIQUE (collection_plan_id, domain, subdomain, key, version)
);

CREATE INDEX IF NOT EXISTS idx_cis_plan_current ON collection_decisions (collection_plan_id) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_cis_plan_domain ON collection_decisions (collection_plan_id, domain) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_cis_tags ON collection_decisions USING GIN (tags) WHERE is_current = true;

COMMIT;
