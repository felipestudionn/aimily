
-- Private storage bucket for Strategy ingest uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'strategy-uploads',
  'strategy-uploads',
  false,
  104857600,  -- 100MB
  ARRAY[
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/json',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage.objects scoped to the strategy-uploads bucket.
-- Path convention: <tenant_id>/<source_id>/<filename>
CREATE POLICY strategy_uploads_read ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'strategy-uploads'
  AND strategy_user_is_tenant_member((string_to_array(name, '/'))[1]::uuid)
);

CREATE POLICY strategy_uploads_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'strategy-uploads'
  AND strategy_user_is_tenant_member((string_to_array(name, '/'))[1]::uuid, 'analyst'::strategy_tenant_role)
);

CREATE POLICY strategy_uploads_update ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'strategy-uploads'
  AND strategy_user_is_tenant_member((string_to_array(name, '/'))[1]::uuid, 'analyst'::strategy_tenant_role)
)
WITH CHECK (
  bucket_id = 'strategy-uploads'
  AND strategy_user_is_tenant_member((string_to_array(name, '/'))[1]::uuid, 'analyst'::strategy_tenant_role)
);

CREATE POLICY strategy_uploads_delete ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'strategy-uploads'
  AND strategy_user_is_tenant_member((string_to_array(name, '/'))[1]::uuid, 'admin'::strategy_tenant_role)
);

-- Seed a default tenant for Felipe so he can test end-to-end.
-- felipe.studionn@gmail.com = d70fcd1d-e480-4ac8-b75e-d37ab936ef84
DO $do$
DECLARE
  v_tenant_id uuid;
  v_user_id uuid := 'd70fcd1d-e480-4ac8-b75e-d37ab936ef84'::uuid;
BEGIN
  INSERT INTO strategy_tenants (
    slug, display_name, legal_name, country_code, tier, isolation_mode,
    reverse_logistics_cost_per_unit, default_currency, notes, created_by
  ) VALUES (
    'aimily-internal',
    'Aimily Internal (Dogfood)',
    'Aimily Internal',
    'ES',
    'tier2_mid',
    'shared_rls',
    6.00,
    'EUR',
    'Internal dogfood tenant for Felipe. Used for testing Strategy MVP end-to-end before first paying customer onboards.',
    v_user_id
  )
  ON CONFLICT (slug) DO UPDATE SET display_name = EXCLUDED.display_name
  RETURNING id INTO v_tenant_id;

  -- Felipe is owner of his own dogfood tenant
  INSERT INTO strategy_tenant_members (tenant_id, user_id, role, joined_at)
  VALUES (v_tenant_id, v_user_id, 'owner', now())
  ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Mango pitch tenant (placeholder, no members yet — slot for first prospect)
  INSERT INTO strategy_tenants (
    slug, display_name, legal_name, country_code, tier, isolation_mode,
    notes, created_by
  ) VALUES (
    'mango-pitch',
    'Mango (Pitch Sandbox)',
    'Punto Fa, S.L.',
    'ES',
    'tier1_fashion',
    'dedicated_project',
    'Sandbox for Mango pitch. Tier-1 fashion, dedicated isolation per BP §4.8. No live data until contract signed.',
    v_user_id
  )
  ON CONFLICT (slug) DO NOTHING;
END
$do$;

-- Seed starter taxonomies for the dogfood tenant
DO $do$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT id INTO v_tenant_id FROM strategy_tenants WHERE slug = 'aimily-internal';

  -- Family taxonomy v1 (mirrors Zara internal family hierarchy as starter)
  INSERT INTO strategy_taxonomies (tenant_id, taxonomy_kind, version, mapping, is_active, reviewer_notes)
  VALUES (
    v_tenant_id,
    'family',
    '1.0.0',
    jsonb_build_object(
      'mapping_rules', jsonb_build_array(
        jsonb_build_object('match', 'W.A FLUIDOS LARGO', 'canonical', 'tops_fluid_long'),
        jsonb_build_object('match', 'W.A FLUIDOS CORTO', 'canonical', 'tops_fluid_short'),
        jsonb_build_object('match', 'W.A FLUIDOS FABRIC', 'canonical', 'tops_fluid_fabric'),
        jsonb_build_object('match', 'W.A.SASTRE', 'canonical', 'sastreria'),
        jsonb_build_object('match', 'W.COLL D C.CORT', 'canonical', 'denim_short'),
        jsonb_build_object('match', 'W.COLL D.C LARG', 'canonical', 'denim_long'),
        jsonb_build_object('match', 'W.E FAMILIAS LARGO', 'canonical', 'events_long'),
        jsonb_build_object('match', 'W.E P.EXT LARGO', 'canonical', 'outerwear_long')
      ),
      'canonical_families', jsonb_build_object(
        'tops_fluid_long', jsonb_build_object('display_name', 'Tops Fluid Long', 'archetype', 'minimal-architect'),
        'tops_fluid_short', jsonb_build_object('display_name', 'Tops Fluid Short', 'archetype', 'minimal-architect'),
        'tops_fluid_fabric', jsonb_build_object('display_name', 'Tops Fluid Fabric', 'archetype', 'editorial-heritage'),
        'sastreria', jsonb_build_object('display_name', 'Sastrería', 'archetype', 'minimal-architect'),
        'denim_short', jsonb_build_object('display_name', 'Denim Short', 'archetype', 'workwear-heritage'),
        'denim_long', jsonb_build_object('display_name', 'Denim Long', 'archetype', 'workwear-heritage'),
        'events_long', jsonb_build_object('display_name', 'Events Long', 'archetype', 'romantic-feminine'),
        'outerwear_long', jsonb_build_object('display_name', 'Outerwear Long', 'archetype', 'editorial-heritage')
      )
    ),
    true,
    'Initial seed mirroring Zara internal family hierarchy from RNK TOTAL PDF analysis (2026-05-14).'
  )
  ON CONFLICT (tenant_id, taxonomy_kind, version) DO NOTHING;

  -- Color taxonomy starter
  INSERT INTO strategy_taxonomies (tenant_id, taxonomy_kind, version, mapping, is_active, reviewer_notes)
  VALUES (
    v_tenant_id,
    'color',
    '1.0.0',
    jsonb_build_object(
      'code_to_name', jsonb_build_object(
        '401', 'blanco',
        '250', 'negro',
        '710', 'beige',
        '300', 'amarillo_claro',
        '305', 'tabaco',
        '400', 'azul_medio',
        '407', 'azul_oscuro',
        '427', 'azul_claro',
        '406', 'denim_medio',
        '600', 'rojo',
        '610', 'burdeos',
        '620', 'cuero',
        '700', 'marron',
        '712', 'marron_claro',
        '716', 'marron_oscuro',
        '730', 'beige_tostado',
        '741', 'crema',
        '800', 'negro_carbon',
        '802', 'gris_oscuro',
        '932', 'gris',
        '942', 'gris_claro'
      )
    ),
    true,
    'Initial Zara 3-digit color code mapping (best-effort, will need customer-supplied dictionary at real onboarding).'
  )
  ON CONFLICT (tenant_id, taxonomy_kind, version) DO NOTHING;

  -- Archetype taxonomy (from aimily Block 4 / Studio gold-standard set)
  INSERT INTO strategy_taxonomies (tenant_id, taxonomy_kind, version, mapping, is_active, reviewer_notes)
  VALUES (
    v_tenant_id,
    'archetype',
    '1.0.0',
    jsonb_build_object(
      'archetypes', jsonb_build_array(
        'editorial-heritage',
        'minimal-architect',
        'streetwear-drop',
        'romantic-feminine',
        'resort-luxe',
        'sustainable-craft',
        'workwear-heritage',
        'performance-tech',
        'y2k-digital-native',
        'avant-garde-concept'
      )
    ),
    true,
    'aimily canonical archetype set, reused from Block 4 / Studio Style cards.'
  )
  ON CONFLICT (tenant_id, taxonomy_kind, version) DO NOTHING;
END
$do$;
