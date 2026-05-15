---
name: Aimily Strategy · Data Schema Mapping (Zara PDF → CIS → Collection Plan)
description: How the historical SKU performance input format (Zara RNK TOTAL WOMAN style + future Shopify CSV) maps to aimily's canonical Block 2 schema, what time-series storage we need to build, what aggregations the learnings engine produces, and how Bucket B creative direction layers on top.
type: project
---

# Aimily Strategy · Data Schema Mapping

**Date**: 2026-05-15
**Status**: Draft research · companion to `audit_block-2-for-aimily-strategy-2026-05-15.md` and `research_aimily-strategy-competitive-landscape-2026-05-15.md`
**Source PDF analyzed**: Zara RNK TOTAL WOMAN · 2026-05-14 ranking · 121 SKUs, V26 + I26+V26 carryover, women's apparel

This document maps the enterprise input data (per-SKU performance ranking) to aimily's existing canonical schema, identifies what's missing, and specifies the output shape that becomes the user-facing Collection Plan recommendation in Block 2.

---

## 1. Source data formats (phase 1 + phase 2)

### Phase 1 · Zara-style internal ranking (THE PDF)

Per SKU/color row, the source exposes (verbatim from Zara RNK TOTAL):

| Group | Fields | Notes |
|---|---|---|
| **Identity** | reference `XXXX YYY ZZZ` (model · color · subcolor), product description, season tag (`V26` or `I26+V26` for carryover), family code (e.g. `WOMAN - W.A FLUIDOS LARGO - 1500`), activation date `F.(DD/MM)`, cluster size `(N)` | Reference is composite — model + color are independent dimensions. Same model with different colors appears as separate rows. Carryover is signaled by `I26+V26` |
| **Pricing** | PVP current, PVP comparison (crossed if discounted), Mk% markup (135-252% range observed), promo flag | `cost = pvp / (1 + Mk/100)`. Margin% = `Mk / (100 + Mk)` |
| **Stock state** | Tienda, Almacén, Almacén Disp., Tránsito, Pendiente (+ expected date), Ajustado, Tejido Almacén/Pend., Bloq/B Rfid T st, Días en tienda, Nº T st / St Act, Alm+Td+Tr+Pte (pipeline total), St Dis CD2 | Multi-location stock view. `Bloq/B Rfid` flags units physically present but unsellable |
| **Velocity** | Último día (units, COM bruta, Part @ vta neta, Importe €), Penúl. día (same 4), Últimos 7d (same 4), Días -8 a -14 (same 4), Mx Vta L-D, Mx Vta NP L-D, T c/ Venta ayer (# stores with sale yesterday), Rot 7d per location, Rot 1d per location, Rot.Td.+Tr+Aj 7D, Rot.Td.+Tr 7D, Tasa Vaciado, Tas.Vac.Dis | Four time buckets. `Días -8 a -14` zero = new launch. NP = no-promo (clean velocity signal) |
| **Pipeline efficiency** | Comprado, Vendido, Enviado, Éxito Enviado %, Éxito Comp %, % Devo cli (returns) | `Éxito Comp = Vendido / Comprado` = lifetime sell-through. `Éxito Enviado = Vendido / Enviado` = field sell-through |

**Per-day granularity** is exposed (último día + penúltimo día) plus 7d rollups. We can infer 14-day series with extraction across snapshots.

**Per-color granularity**: the same model appears as multiple rows (e.g. 4786/166/401, 4786/166/250, 4786/166/305 — same `ZW - GRANDAD COLLAR SHIRT WITH KNOT` in 3 colorways). Each row is independent → enables intra-model color-winner analysis directly.

### Phase 2 · Shopify CSV export (smaller mature brands)

Shopify's `Sales by product variant` report exposes:
- Variant SKU, product title, variant title (color/size), vendor, type, tags
- Net sales, gross sales, returns, discounts, taxes, total sales
- Units sold, units returned
- Time bucket configurable (day/week/month)

What Shopify **lacks vs Zara** (and we must reconstruct or accept as gap):
- ❌ Stock pipeline (pendiente, tránsito, ajustado) — Shopify has `Inventory Levels` separately, joinable
- ❌ Per-store granularity below the shop level — multi-location available but flatter
- ❌ `Days in store` / `# stores with stock`  — needs derivation from Inventory + first-sold timestamp
- ❌ Returns reason / `Devo` quality signal — Shopify exposes returns count but not the structured `% Devo cli` per SKU/period directly
- ✅ Margin if cost is set per variant (often missing in practice)

**Implication**: phase 2 ETL needs to **join 3 Shopify reports** (Sales by variant + Inventory + Returns) and derive the missing fields. Phase 1 (Zara) gets a richer feature set; phase 2 (Shopify) gets a normalized subset.

---

## 2. Canonical SKU schema in aimily today (Block 2)

From `aimily` migrations and existing Block 2 code (per MEMORY.md handoff state · to be verified by codebase audit agent):

**`skus` table** (canonical, current state per AZUR 28-SKU plan):
- `id`, `collection_id`, `family_id`
- `sku_code` (free-text), `name`, `description`
- `pvp_min`, `pvp_max`, `price_current`
- `margin_target`, `margin_current`
- `cost_estimate`, `cost_actual`
- `size_run` (added in migration 048)
- `material_zones[]`
- `buy_units` (planned buy quantity)
- `colorways[]` (free-text array)
- `tech_pack_id` (link to design dev)
- `is_carryover` (bool, recent)
- `lifecycle_status` (planning/development/production/launched/discontinued)

**`families` table**:
- `id`, `collection_id`, `name`, `display_order`
- `target_sku_count`, `target_revenue_share`, `target_margin`
- `pvp_range_min`, `pvp_range_max`
- `description`

**CIS keys** (Collection Intelligence Store · ~60 active for AZUR per MEMORY.md):
- Block 2 owns: `pricing_strategy`, `price_anchors`, `families_count`, `families_share`, `budget_total`, `target_margin`, `channels_mix`, `drops_schedule`, `wholesale_targets`, `skus_avg_pvp`, `total_revenue_forecast`
- Block 1 owns (feeds Block 2): `brand_values`, `brand_voice`, `consumer_segment`, `moodboard_*`, `creative_direction`, `color_palette_primary`, `archetypes[]`

**What aimily today does NOT have** (the missing piece for Strategy):
- ❌ No time-series performance store. SKUs are canonical (planned) entities, not measured entities.
- ❌ No `sku_lineage` linking same model across seasons (no concept of "this V26 SKU is the next iteration of the V25 SKU that worked").
- ❌ No multi-tenant historical archive. Each collection is greenfield.
- ❌ No `collection_history` / `season_summary` aggregations.

---

## 3. New schema required for Strategy (delta vs Block 2 today)

Strategy needs three new entity groups. None of them should touch existing Block 2 tables — they live in their own namespace and emit *into* `collection_plans` / `skus` / `families` as the final step.

### 3.1 `strategy_observations` (time-series SKU performance · the raw ingest)

```sql
strategy_observations (
  id uuid pk,
  tenant_id uuid fk,           -- enterprise tenant
  observation_date date,        -- snapshot date (15/05/2026 in the PDF)
  source_ref text,              -- e.g. "4786 166 401"
  source_format text,           -- 'zara_rnk' | 'shopify_csv' | 'custom_csv'
  -- identity
  product_name text,
  family_code text,             -- "W.A FLUIDOS LARGO - 1500"
  season_tag text,              -- "V26" | "I26+V26"
  activation_date date,
  -- pricing
  pvp numeric, pvp_compare numeric, markup_pct numeric, on_promo bool,
  -- stock
  stock_store int, stock_warehouse int, stock_available int,
  stock_in_transit int, stock_pending int, stock_pending_date date,
  stock_adjusted int, stock_blocked int, stock_rfid_per_store numeric,
  days_in_store int, stores_with_stock int, stores_active int,
  pipeline_total int,
  -- velocity (yesterday, day-before, last-7d, last-8-to-14d × {units, gross_commission, share_net_sales, importe})
  vel_d1 jsonb, vel_d2 jsonb, vel_7d jsonb, vel_8_14d jsonb,
  max_sale_ld int, max_sale_np_ld int,
  stores_with_sale_yesterday int,
  rotation jsonb,               -- per location, 1d + 7d
  emptying_rate numeric, emptying_rate_available numeric,
  -- pipeline efficiency
  total_bought int, total_sold int, total_shipped int,
  sell_through_shipped_pct numeric, sell_through_bought_pct numeric,
  returns_pct numeric,
  -- raw
  raw_record jsonb              -- preserve original for re-derivation
);
```

This is the **anti-corruption layer**: source-format-specific fields preserved, normalized into a stable shape downstream.

### 3.2 `strategy_sku_lineage` (cross-season identity)

```sql
strategy_sku_lineage (
  id uuid pk,
  tenant_id uuid fk,
  lineage_key text,             -- canonical model id, e.g. "4786/166" (drop color)
  variant_color_codes text[],   -- ["401", "250", "305"]
  observations_ids uuid[],      -- back-refs
  first_seen date,
  last_seen date,
  seasons_present text[]        -- ["I26", "V26"]
);
```

Enables: "this model has been carried forward 3 seasons, color 250 wins each time" type insights.

### 3.3 `strategy_learnings` (computed patterns · refreshed periodically)

```sql
strategy_learnings (
  id uuid pk,
  tenant_id uuid fk,
  computed_at timestamptz,
  scope text,                   -- 'sku' | 'family' | 'color' | 'archetype' | 'cross-season'
  scope_ref text,               -- sku_code or family_code
  pattern_type text,            -- 'hero' | 'dog' | 'climber' | 'decay' | 'color_winner' | 'carryover_survivor' | 'returns_risk'
  confidence numeric,           -- 0-1
  metrics jsonb,                -- the numbers backing the pattern
  narrative text                -- LLM-generated one-liner explaining the pattern
);
```

This is what powers the recommendation engine. **Deterministic classifiers run first, LLM narrative on top.**

### 3.4 `strategy_directions` (the user's inputs — Buckets A + B)

```sql
strategy_directions (
  id uuid pk,
  tenant_id uuid fk,
  collection_id uuid fk,        -- target collection being planned
  -- Bucket A: numerical / strategic
  target_total_skus int,
  target_buy_budget numeric,
  target_avg_margin numeric,
  family_share_overrides jsonb, -- {"vestidos": 0.30, "sastreria": 0.15}
  price_ladder_overrides jsonb,
  positioning_tier text,        -- 'premium' | 'mid' | 'value'
  -- Bucket B: creative (optional)
  moodboard_id uuid,            -- reuse Block 1 moodboard entity
  color_story text[],
  archetypes_focus text[],
  family_pivot jsonb,           -- {"romántico": "+15%", "deportivo": "-10%"}
  creative_narrative text,
  -- meta
  created_at timestamptz,
  generated_recommendation_id uuid fk strategy_recommendations(id)
);
```

### 3.5 `strategy_recommendations` (the output)

```sql
strategy_recommendations (
  id uuid pk,
  tenant_id uuid fk,
  collection_id uuid fk,        -- emits into this Block 2 collection
  direction_id uuid fk,
  generated_at timestamptz,
  -- the plan (shape mirrors collection_plans / families / skus)
  families jsonb,               -- [{name, target_skus, target_share, target_margin, pvp_range, rationale}]
  sku_proposals jsonb,          -- [{family, archetype, pvp, margin, buy_units, colorways[], rationale, learnings_refs[]}]
  budget_envelope jsonb,
  drops_schedule jsonb,
  -- explanations
  learnings_narrative text,     -- "Based on V25 performance, the Sastrería family showed..."
  creative_application text,    -- "Your moodboard's romantic direction was applied to..."
  confidence_metrics jsonb,
  -- emission
  emitted_to_collection bool default false,
  emitted_at timestamptz
);
```

When the user accepts: copy `families` → `families` table, `sku_proposals` → `skus` table, write CIS keys, mark `emitted_to_collection = true`. From this point, the enterprise customer is in Block 2 normally with a pre-populated, justified plan.

---

## 4. Aggregations the learnings engine computes (deterministic before LLM)

Run on every ingest or on-demand. These are pure SQL/analytics — no model calls — and they produce the rows that populate `strategy_learnings`.

| Pattern | Detector |
|---|---|
| **Hero SKU** | `sell_through_bought_pct >= P75` AND `markup_pct >= median` AND `returns_pct <= P25` AND `stores_active / stores_with_stock >= 0.7` |
| **Dog SKU** | `sell_through_bought_pct <= P25` AND `stock_pending > 0` AND `vel_7d slope < 0` |
| **Climber** | `vel_7d / vel_8_14d >= 1.25` AND `stock_available > 7 × vel_7d/7` (i.e. accelerating with runway) |
| **Decay** | `vel_7d / vel_8_14d <= 0.75` AND `stock_pipeline_total / vel_7d >= 30` (slow + overstocked) |
| **Color winner** | Within `lineage_key`: rank colorways by `sell_through_bought_pct × markup_pct`, top 1-2 |
| **Carryover survivor** | `season_tag` contains 2+ seasons AND `sell_through_bought_pct >= P50` in current period |
| **Returns risk** | `returns_pct >= P75` per family → quality/fit issue at family level |
| **Family ROI** | `Σ(units_sold × pvp × margin) / Σ(units_bought × cost)` per family, ranked |
| **Family share-of-wallet** | `Σ(importe per family) / Σ(importe total)` per period, trended over time |
| **Velocity ceiling** | `Mx Vta NP L-D` (max non-promo daily sale) as upper-bound capacity signal per SKU |

**Example outputs from the Zara PDF I analyzed**:
- 4786/166/401 (ZW GRANDAD COLLAR SHIRT, white) → **Carryover survivor** (I26+V26) + **Hero candidate** (12.6K sold, 178% Mk, 3.0% returns)
- 4786/166/305 (same shirt, tan) → **Dog candidate** (3.5K sold, days-in-store 20, 26.7% returns)
- 4786/30/620 vs 4786/30/250 (same SET_173 linen shirt, two colors) → both carryover but 250 wins on units sold this week → **Color winner = 250**
- W.A.SASTRE family (sastrería) → mixed: pos 14 cropped blazer 7.2K sold strong, but pos 78 PANTALÓN MAXI 113K sold over lifetime → **Hero family, but specific archetypes (cropped > maxi pants)**
- W.E FAMILIAS LARGO (formal events) → multiple new launches with `Días -8 a -14 = 0` → **New family bet, too early to classify**

These patterns drive the recommendation: "Re-buy color 250 of the GRANDAD COLLAR shirt at 2× volume, deprioritize color 305, keep cropped blazer architecture in Sastrería next season, deprioritize maxi pleated trousers despite lifetime volume."

---

## 5. Output mapping · `strategy_recommendations` → Block 2 schema

The recommendation must emit cleanly into the existing Block 2 surface so the enterprise customer continues in the standard aimily UI. Mapping:

| Strategy output | Block 2 destination | CIS key impact |
|---|---|---|
| `families[]` | `families` table rows | `families_count`, `families_share`, `target_margin` |
| `sku_proposals[]` | `skus` table rows (lifecycle_status = 'planning') | `skus_avg_pvp`, `total_revenue_forecast` |
| `budget_envelope` | `collection_plans.budget` | `budget_total`, `target_margin` |
| `drops_schedule` | `drops` table rows (Path B) | `drops_schedule` |
| `pricing_strategy` derived | `collection_plans.pricing_strategy` | `pricing_strategy`, `price_anchors` |
| `learnings_narrative` | New: `collection_plans.strategy_narrative` (additive column) | New CIS key: `strategy_learnings_narrative` |
| `creative_application` | New: same column or separate | New CIS key: `strategy_creative_application` |

**One additive migration** required on existing Block 2: two TEXT columns on `collection_plans` for the narratives. Everything else slots in.

---

## 6. Bucket B layer · how creative direction modulates the output

The creative direction does NOT override the data. It **filters and modulates**. Three concrete modulation patterns:

### Pattern 1 · Family pivot
User input: `family_pivot = {"romántico": "+15%", "sastrería": "-10%"}`
Data says: romántico = dog family historically, sastrería = mixed
Engine output: rebalance share, but for romántico use the *one archetype* with positive carryover signal (if any) and propose new bets in that subspace, not blind doubling. For sastrería: keep the cropped winners, cut the maxi losers — net -10% by deprioritizing dogs, not heroes.

### Pattern 2 · Color story
User input: `color_story = ["ocre", "crema", "tabaco"]`
Engine output: across all families, filter color winners to those palettes. If the historical hero shirt was navy, propose the same architecture in tabaco. Reweight `buy_units` by `historical_color_winner_velocity × moodboard_color_alignment`.

### Pattern 3 · Archetype focus
User input: `archetypes_focus = ["resort-luxe", "minimal-architect"]`
Engine output: re-tag historical SKUs against these archetypes (LLM step), then surface heroes/climbers within those archetypes specifically, not the global ranking.

**Without Bucket B**: engine outputs pure data-driven recommendation (top heroes, drop dogs, re-buy color winners, family ROI rebalance).

**With Bucket B**: same machinery but the candidate pool is filtered/reweighted by creative direction. The `creative_application` narrative documents how the moodboard changed the recommendation vs the pure-data baseline.

---

## 7. Open questions for next iteration

1. **Snapshot cadence**: do we ingest a single end-of-season snapshot per SKU, or weekly snapshots throughout the season? Weekly enables velocity decay detection (the most predictive signal in the Zara PDF) but 10× the storage. Recommendation: weekly snapshots, retain rolling 24 months.

2. **Color taxonomy**: Zara uses 3-digit color codes. Internal mapping to color names is proprietary. For LLM narrative we need color name resolution → either ask the customer to provide a color dictionary at onboarding, or infer from product description text + image (if customer provides image links).

3. **Family taxonomy alignment**: Zara families (`W.A FLUIDOS LARGO`, `W.A.SASTRE FABRIC`, `W.COLL D C.CORT`, etc.) don't match aimily's family naming convention. Need a tenant-specific mapping table OR canonical family hierarchy at onboarding.

4. **Tenant isolation**: enterprise customers will demand strict data isolation. Recommendation: separate schema per tenant (Postgres `CREATE SCHEMA tenant_xxx`) or row-level security with strict `tenant_id` enforcement on every query. Lean toward RLS + dedicated Supabase project per high-value tenant.

5. **EU AI Act**: buying recommendations affecting sourcing/employment may be high-risk classification. Need legal review at MVP gate. Conservative: position as "recommendation, human-in-the-loop required" with audit trail of every recommendation accepted/rejected.

---

## 8. Next docs

- `audit_block-2-for-aimily-strategy-2026-05-15.md` (Explore agent · in flight) — what's in the Block 2 codebase, where to inject, what's reusable verbatim
- `research_aimily-strategy-competitive-landscape-2026-05-15.md` (general-purpose agent · in flight) — who else plays here, where's the gap
- `business-plan_aimily-strategy-2026-05-15.md` (next, after agents land) — synthesizing all three into the wedge tesis
