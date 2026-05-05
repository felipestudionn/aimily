-- Ecom Block · Storefront generator (May 2026)
--
-- Adds tables to support DTC storefronts published at *.aimily.shop:
--   • storefronts            — 1 row per published collection (subdomain, theme, payment provider)
--   • storefront_overrides   — copy edits per page (clones presentation_deck_overrides pattern)
--   • storefront_publishes   — audit trail (publish/unpublish/rebuild)
--   • subscriptions.storefront_quota — per-plan max published storefronts
--
-- Aimily NEVER processes payments. payment_provider is just config metadata
-- so the public render layer can embed Stripe Buy Button or Shopify Buy SDK
-- with the user's own credentials.
--
-- Plan reference: .planning/ecom/02-SCHEMA.md
-- Architecture reference: .planning/ecom/01-ARCHITECTURE.md

-- ─── 1. storefronts ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS storefronts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_plan_id       UUID NOT NULL REFERENCES collection_plans(id) ON DELETE CASCADE,

  -- Public identity
  subdomain                TEXT NOT NULL UNIQUE
                           CHECK (subdomain ~ '^[a-z][a-z0-9-]{2,30}[a-z0-9]$'),
  custom_domain            TEXT UNIQUE,
  custom_domain_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  custom_domain_dns_target TEXT,
  custom_domain_txt_record TEXT,

  -- Visual
  theme_id                 TEXT NOT NULL DEFAULT 'editorial-heritage'
                           CHECK (theme_id IN (
                             'editorial-heritage','streetwear-drop','romantic-feminine',
                             'minimal-architect','performance-tech','avant-garde-concept',
                             'sustainable-craft','y2k-digital-native','workwear-heritage',
                             'resort-luxe','drop-lookbook','linkinbio-plus'
                           )),

  -- Payment (config only — aimily NEVER processes payments)
  payment_provider         TEXT NOT NULL DEFAULT 'lookbook_only'
                           CHECK (payment_provider IN (
                             'stripe_buy_button','shopify_buy','lookbook_only'
                           )),
  payment_config           JSONB NOT NULL DEFAULT '{}'::JSONB,
  -- stripe_buy_button: { publishableKey: 'pk_live_...' }
  -- shopify_buy:       { shopDomain: '...myshopify.com', storefrontAccessToken: '...' }
  sku_payment_map          JSONB NOT NULL DEFAULT '{}'::JSONB,
  -- per-SKU IDs: { 'sku_id': { buttonId | shopifyHandle } }

  -- SEO
  seo_title                TEXT,
  seo_description          TEXT,
  seo_og_image_url         TEXT,
  seo_keywords             TEXT[],

  -- Lifecycle
  published_at             TIMESTAMPTZ,
  unpublished_at           TIMESTAMPTZ,
  last_built_at            TIMESTAMPTZ,

  -- View counters (denormalized)
  view_count_total         BIGINT NOT NULL DEFAULT 0,
  view_count_30d           BIGINT NOT NULL DEFAULT 0,
  view_count_30d_resetat   TIMESTAMPTZ,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS storefronts_collection_unique ON storefronts(collection_plan_id);
CREATE INDEX IF NOT EXISTS storefronts_user_id_idx           ON storefronts(user_id);
CREATE INDEX IF NOT EXISTS storefronts_subdomain_idx
  ON storefronts(subdomain) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS storefronts_custom_domain_idx
  ON storefronts(custom_domain) WHERE custom_domain IS NOT NULL;

-- ─── 2. storefront_overrides ────────────────────────────────────────────────
-- One row per (storefront, page). field_overrides JSONB holds path→value pairs.
-- Mirrors presentation_deck_overrides pattern (slide_id + field_overrides).
CREATE TABLE IF NOT EXISTS storefront_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id   UUID NOT NULL REFERENCES storefronts(id) ON DELETE CASCADE,
  page_id         TEXT NOT NULL CHECK (page_id IN (
                    'home','plp','pdp','lookbook','about','contact','global'
                  )),
  field_overrides JSONB NOT NULL DEFAULT '{}'::JSONB,
  -- e.g. { "hero.title": "Custom hero", "about.body": "Custom about" }
  -- For PDP page, keys can be SKU-scoped: { "sku_xyz.description": "..." }
  updated_by      UUID NOT NULL REFERENCES auth.users(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS storefront_overrides_storefront_page_unique
  ON storefront_overrides(storefront_id, page_id);
CREATE INDEX IF NOT EXISTS storefront_overrides_storefront_idx
  ON storefront_overrides(storefront_id);

-- ─── 3. storefront_publishes (audit trail) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS storefront_publishes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id    UUID NOT NULL REFERENCES storefronts(id) ON DELETE CASCADE,
  action           TEXT NOT NULL CHECK (action IN ('publish','unpublish','rebuild','domain_change','theme_change')),
  triggered_by     UUID REFERENCES auth.users(id),
  reason           TEXT,
  payload_snapshot JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS storefront_publishes_storefront_idx
  ON storefront_publishes(storefront_id, created_at DESC);

-- ─── 4. subscriptions.storefront_quota ──────────────────────────────────────
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS storefront_quota INT NOT NULL DEFAULT 1;

-- Backfill quotas by plan (idempotent)
UPDATE subscriptions SET storefront_quota = 1   WHERE plan IN ('trial','student','founder','free','starter');
UPDATE subscriptions SET storefront_quota = 5   WHERE plan IN ('team','professional','pro');
UPDATE subscriptions SET storefront_quota = 25  WHERE plan IN ('team_pro','professional_max','business');
UPDATE subscriptions SET storefront_quota = 999 WHERE plan = 'enterprise';

-- ─── 5. can_publish_storefront helper ───────────────────────────────────────
CREATE OR REPLACE FUNCTION can_publish_storefront(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_quota INT;
  v_used  INT;
BEGIN
  SELECT storefront_quota INTO v_quota
  FROM subscriptions
  WHERE user_id = p_user_id AND status IN ('active','trialing')
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_quota IS NULL THEN RETURN FALSE; END IF;

  SELECT COUNT(*) INTO v_used
  FROM storefronts
  WHERE user_id = p_user_id AND published_at IS NOT NULL;

  RETURN v_used < v_quota;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_publish_storefront(UUID) TO authenticated;

-- ─── 6. updated_at triggers ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION storefronts_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS storefronts_updated_at ON storefronts;
CREATE TRIGGER storefronts_updated_at
  BEFORE UPDATE ON storefronts
  FOR EACH ROW EXECUTE FUNCTION storefronts_set_updated_at();

DROP TRIGGER IF EXISTS storefront_overrides_updated_at ON storefront_overrides;
CREATE TRIGGER storefront_overrides_updated_at
  BEFORE UPDATE ON storefront_overrides
  FOR EACH ROW EXECUTE FUNCTION storefronts_set_updated_at();

-- ─── 7. RLS policies ────────────────────────────────────────────────────────
ALTER TABLE storefronts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE storefront_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE storefront_publishes ENABLE ROW LEVEL SECURITY;

-- storefronts: owner can do everything on their rows
DROP POLICY IF EXISTS "Owner manages own storefronts" ON storefronts;
CREATE POLICY "Owner manages own storefronts" ON storefronts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- storefronts: anonymous public can SELECT only published rows (used by SSR via service role,
-- this policy is defensive in case anon context is ever used directly)
DROP POLICY IF EXISTS "Public can read published storefronts" ON storefronts;
CREATE POLICY "Public can read published storefronts" ON storefronts
  FOR SELECT
  USING (published_at IS NOT NULL);

-- service role has full access
DROP POLICY IF EXISTS "Service role manages all storefronts" ON storefronts;
CREATE POLICY "Service role manages all storefronts" ON storefronts
  FOR ALL
  USING (auth.role() = 'service_role');

-- storefront_overrides: owner of the parent storefront
DROP POLICY IF EXISTS "Owner manages own storefront overrides" ON storefront_overrides;
CREATE POLICY "Owner manages own storefront overrides" ON storefront_overrides
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM storefronts s
            WHERE s.id = storefront_overrides.storefront_id AND s.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM storefronts s
            WHERE s.id = storefront_overrides.storefront_id AND s.user_id = auth.uid())
  );

-- public read: only overrides of published storefronts
DROP POLICY IF EXISTS "Public can read overrides of published storefronts" ON storefront_overrides;
CREATE POLICY "Public can read overrides of published storefronts" ON storefront_overrides
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM storefronts s
            WHERE s.id = storefront_overrides.storefront_id AND s.published_at IS NOT NULL)
  );

DROP POLICY IF EXISTS "Service role manages all storefront overrides" ON storefront_overrides;
CREATE POLICY "Service role manages all storefront overrides" ON storefront_overrides
  FOR ALL
  USING (auth.role() = 'service_role');

-- storefront_publishes: owner can read their audit trail; only service writes
DROP POLICY IF EXISTS "Owner reads own storefront publishes" ON storefront_publishes;
CREATE POLICY "Owner reads own storefront publishes" ON storefront_publishes
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM storefronts s
            WHERE s.id = storefront_publishes.storefront_id AND s.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Service role manages all storefront publishes" ON storefront_publishes;
CREATE POLICY "Service role manages all storefront publishes" ON storefront_publishes
  FOR ALL
  USING (auth.role() = 'service_role');

-- ─── 8. Soft-delete propagation: when collection_plans is soft-deleted, unpublish storefront ─
-- (collection_plans uses deleted_at TIMESTAMPTZ for soft delete with 30-day trash)
CREATE OR REPLACE FUNCTION storefronts_unpublish_on_collection_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE storefronts
    SET published_at = NULL,
        unpublished_at = NOW()
    WHERE collection_plan_id = NEW.id AND published_at IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS storefronts_unpublish_trigger ON collection_plans;
CREATE TRIGGER storefronts_unpublish_trigger
  AFTER UPDATE OF deleted_at ON collection_plans
  FOR EACH ROW EXECUTE FUNCTION storefronts_unpublish_on_collection_delete();
