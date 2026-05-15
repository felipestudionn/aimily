---
name: Block 2 Codebase Audit for Aimily Strategy
description: What Block 2 (Merchandising & Planning) gives us today, what Strategy can reuse verbatim, and what's missing to support enterprise historical-SKU ingest → Collection Plan output.
type: audit
date: 2026-05-15
---

# Block 2 Codebase Audit — Foundation for Aimily Strategy

Companion to `research_aimily-strategy-data-schema-mapping-2026-05-15.md` and `research_aimily-strategy-competitive-landscape-2026-05-15.md`. This is the codebase-grounded counterpart: every claim below is anchored to a real file path.

---

## 1. Block 2 surface inventory

**Single route file** for all four sub-blocks plus Wholesale:

- `src/app/(app)/collection/[id]/merchandising/page.tsx` (1452 LOC) — a switchboard on `?block=` that delegates into mini-block content components.
  - `?block=scenarios` (02.1 Buying Strategy) → `ScenariosContent` (line 1094)
  - `?block=families` (02.2 Assortment & Pricing) → `AssortmentContent` (line 1108)
  - `?block=channels` (02.3 Distribution) → `DistributionContent` (line 1118)
  - `?block=budget` (02.4 Financial Plan) → `FinancialPlanContentV2` (line 1128)
  - `?block=wholesale` → `WholesaleOrdersCard` (line 1014). Wholesale moved into Block 2 in Sprint 10 (legacy comment line 1015: "B2B distribution, semantically belongs to Merchandising").

**Mini-block content components** (in `src/components/merchandising/`):

| File | LOC | Owner block |
|---|---|---|
| `ScenariosContent.tsx` | 1308 | 02.1 — 4 archetypes A/B/C/D → editor with 5 axes (volume/pricing/families/drops/narrative) |
| `AssortmentContent.tsx` | 569 | 02.2 — refined families + per-subcategory pricing pills + global tier slider |
| `DistributionContent.tsx` | 919 | 02.3 — channel mix DTC/Wholesale + per-channel pricing + markets |
| `FinancialPlanContentV2.tsx` | 681 | 02.4 — deterministic financial calc + AI editorial narrative |
| `WholesaleOrdersCard.tsx` | 170 | Wholesale sub-page |

**02.5 Drops** lives separately — UI rendered by `src/components/planner/DropScheduleSection.tsx` (290 LOC) inside the Collection Builder. Drops are read from the `drops` table; materialization happens through `/api/drops/synthesize` (Path B structural drop creation) which is referenced in the spec `spec_block-4-sales-strategy-archetypes.md`.

**Key Block 2 API endpoints**:

- Confirms (CIS write-through): `/api/strategy-confirm`, `/api/families-confirm`, `/api/distribution-confirm`, `/api/financial-confirm`, `/api/sales-strategy-confirm`, `/api/research-confirm`, `/api/brand-confirm`
- Loads (CIS read with derivation): `/api/families-load`, `/api/distribution-load`, `/api/financial-load`, `/api/derived-setup-data`, `/api/financial-plan/sources`
- Generic CIS write (allow-listed): `/api/cis-update`
- Drops: `/api/drops` (CRUD), `/api/drops/[id]`, `/api/drops/synthesize`
- SKUs: `/api/skus`, `/api/skus/batch`, `/api/skus/[id]`, plus 5 bulk endpoints (`bulk-delete-family`, `bulk-rename-family`, `bulk-update-margin`, `bulk-scale-pvp`, `bulk-trim-lowest`, `carry-over`)
- Wholesale: `/api/wholesale-orders`

---

## 2. CIS + DB schema

**CIS lives in `collection_decisions`** (a generic decision store), accessed via `src/lib/collection-intelligence.ts`:

- `recordDecision(...)` / `recordDecisions(...)` — versioned writes (old row marked `is_current=false`, new version inserted). MUST be awaited; not fire-and-forget (lines 165-180).
- `getIntelligence(planId, filter)` — current decisions, filter by domain/subdomain/tags.
- `compilePromptContext(planId, preset)` — flattens to key→value with aliases. Presets include `editorial_prompt`, `seo_prompt`, `sales_forecast`, `launch_strategy`, `wholesale_pitch`, `full`.

**Block 2 CIS keys** (write side from confirm endpoints + read side from `compileCIS`):

| Subdomain | Keys (sample) | Tags |
|---|---|---|
| `merchandising.strategy.*` | `target_margin_pct`, `sales_target_y1`, `target_sku_count`, `investment`, `archetype_id`, `archetype_name`, `benchmark_brands` | `affects_pricing`, `affects_budget`, `affects_assortment`, `affects_drops`, `affects_content` |
| `merchandising.families.*` | `list`, `subcategory_prices` | `affects_assortment`, `affects_pricing`, `affects_design` |
| `merchandising.pricing.*` | `tiers` (entry/core/hero), `average_price` | `affects_pricing` |
| `merchandising.channels.*` | `mix`, `pricing_per_channel` | `affects_channels`, `affects_budget` |
| `merchandising.budget.*` | `total_sales_target` | (legacy alias read at `compilePromptContext` line 413) |
| `merchandising.structure.*` | `families_selected` (legacy) | `affects_content`, `affects_production` |

Full allow-list of the generic write endpoint is in `src/app/api/cis-update/route.ts` lines 43-54.

**Canonical Supabase tables backing Block 2**:

- `collection_plans` — top-level plan (id, name, season, location, status, user_id, setup_data jsonb [stale, do not write]). Source: `src/app/api/collection-plans/`.
- `collection_skus` (defined in `supabase/migrations/002_collection_skus.sql`, extended in `012/048/051/052/053`):
  - Identity: `id`, `collection_plan_id`, `name`, `family`, `category` (CALZADO/ROPA/ACCESORIOS), `drop_number`, `type` (IMAGEN/ENTRY/REVENUE), `channel` (DTC/WHOLESALE/BOTH)
  - Economics: `pvp`, `cost`, `discount`, `final_price`, `buy_units`, `sale_percentage`, `expected_sales`, `margin`
  - Lifecycle: `launch_date`, `design_phase`, `lifecycle_status`, `is_carryover`, `source_sku_id`, `sku_role`, `size_run`, `origin`, `notes`, `reference_image_url`
  - Recent additions: `colorways[]`, `material_zones[]`, `tech_pack_id`, `sketch_back_url`, `reference_palette`, `production_origin`
- `drops` — id, collection_plan_id, drop_number, name, launch_date, weeks_active, story_alignment, channels[], expected_sales_weight, position. (No standalone `families` table; family is a string column on `collection_skus` + the canonical list lives in CIS at `merchandising.families.list`.)
- `collection_workspace_data` — JSONB blob keyed by `workspace` (creative/merchandising/design/marketing). Short-term draft cache; **never the source of truth** for prompts (`load-full-context.ts` line 181 reads it only as a fallback for full-detail consumer/vibe/brand text).
- `collection_decisions` — the CIS table (see `recordDecision` above).
- `commercial_actions`, `wholesale_orders`, `production_orders` — supporting tables.

**Canonical SKU shape** as the AI sees it (from `src/lib/prompts/prompt-context.ts:17-30` `SkuContext`):
```ts
{ id, name, family, subcategory, pvp, colorways[], materials, type:'REVENUE'|'IMAGE'|'ENTRY', novelty:'NEWNESS'|'CARRY_OVER', proto_image_url?, catalog_image_url?, notes? }
```

---

## 3. Block 1 → Block 2 integration pipe (THE Strategy Bucket B reuse pipe)

Every Block 2 AI generator funnels through one server-side loader:

`src/lib/ai/load-full-context.ts :: loadFullContext(collectionPlanId)` (262 LOC). This is the single source of truth — the comment at line 6 reads "never depend on the frontend to send context." Pipe:

1. **CIS read** — calls `buildPromptContext()` from `src/lib/prompts/prompt-context.ts` which reads `collection_plans`, `collection_skus`, `collection_stories`, `content_pillars`, `brand_voice_config`, `drops`, `commercial_actions` in parallel (lines 165-242), then `compilePromptContext(planId, 'full')` for CIS aliases.
2. **Creative workspace overlay** — reads `collection_workspace_data WHERE workspace='creative'` for full proposal/vibe/brand-DNA narratives (lines 181-241).
3. **Derived setup data** — `loadDerivedSetupData(planId)` reads live merchandising state, never `setup_data` cache.

Output is a flat `Record<string,string>` with these Block 1 → Block 2 fields (Bucket B candidates for Strategy):

| Key | Source |
|---|---|
| `brandDNA` | CIS `creative.identity.*` (name, tagline, palette, visual_identity, voice, reference brands) |
| `consumer` | CIS `creative.target.proposals[]` (preferred) + demographics/psychographics/lifestyle |
| `vibe` | CIS `creative.identity.collection_vibe` + workspace title/narrative/keywords |
| `trends` | CIS `creative.inspiration.trends_selected` + workspace per-block selected results |
| `moodboard` | CIS `creative.inspiration.moodboard_analysis` |
| `market_trends`, `market_deep_dive`, `market_live_signals`, `market_competitors` | Per-lens CIS keys at `creative.market.*` (4-lens market research) |
| `market_competitors_input` | Dim discriminator: `{competitors[], references[]}` — pricing prompts read `competitors[]` only |
| `creativeSynthesis` | Block 1 closure synthesis blob |
| `brandPalette` | Structured JSON of palette for color prompts |

This flat dict is then prepended to every Block 2 prompt via either:
- `formatCisPrefix(ctx)` (`src/lib/ai/cis-prefix.ts`) — wraps as `═══ EXISTING COLLECTION CONTEXT (CIS) ═══` block with a grounding directive (line 43).
- `buildInheritedContext(input)` (`src/lib/ai/prompt-foundations.ts:128`) — assembles `── INHERITED CONTEXT ──` block.

**The 8 expert personas** (`prompt-foundations.ts:13-29`) include `merchPlanner` and `financialStrategist` — the ones Strategy will lean on. Quality gates `merchSpecificity` (line 64) and `antiGeneric` (line 82) constrain Block 2 generations.

**Implication for Strategy**: Bucket B (creative) does NOT need any new code path. If Strategy persists creative inputs into the same `creative.*` CIS subdomains, `loadFullContext()` already projects them into every downstream Block 2 generator. The pipe is invisible to Strategy.

---

## 4. Block 2 AI generators

Every Block 2 AI endpoint uses the same template: `getAuthenticatedUser` → `verifyCollectionOwnership` → `loadFullContext` → `buildPrompt` → `generateJSON` → `recordDecision` (CIS capture).

| Endpoint | Sub-block | Reads (CIS / Block 1) | Writes (CIS) | Output shape |
|---|---|---|---|---|
| `/api/ai/scenarios-prefill-editor` | 02.1 | full creative + market lenses | `merchandising.strategy.*` (on confirm) | `PrefilledEditor` (sku_count, investment_split, pricing_tiers entry/core/hero, families[], drops, sales_target_y1, target_margin_pct) |
| `/api/ai/scenarios-deepen` | 02.1 | same + current editor state | (no — frontend persists) | Per-axis refinement (volume / pricing / families / drops / narrative) |
| `/api/ai/merch-generate` | 02.1-02.4 fallback | full context | `merchandising.{subdomain}.merch_{type}` | 8 types: families-assisted, families-proposals, pricing-assisted, pricing-proposals, channels-assisted, channels-proposals, budget-assisted, budget-proposals, financial-plan-narrative |
| `/api/ai/generate-skus` | (Collection Builder) | full + setupData | (none direct — SKUs written to table) | N SKUs with exact `expected_sales` summing to target |
| `/api/ai/distribution-propose` | 02.3 | full + strategy CIS + market lenses | `merchandising.channels.mix` etc. | Full `DistributionPlan` (mix DTC/Wholesale, per-channel pricing, markets) |
| `/api/financial-propose` | 02.4 | strategy + channels + pricing/families CIS | (none — UI confirms via `/api/financial-confirm`) | `{plan, narrative, inputs}` — math deterministic via `computeFinancialPlan()`, only narrative is AI |
| `/api/drops/synthesize` | 02.5 | strategy CIS + season | inserts into `drops` table | N drops backfilled |

Prompt builders live in `src/lib/ai/`: `scenarios-prompts.ts`, `merch-prompts.ts`, `distribution-prompts.ts`, `financial-narrative-prompts.ts`. All bind to `PERSONAS.merchPlanner` / `financialStrategist`.

---

## 5. Reusable verbatim for Strategy

Concrete files Strategy emits into rather than reinventing:

- **Family Card gold standard UI** — `src/app/(app)/collection/[id]/merchandising/page.tsx:214-297` (`FamilyCardGrid` component). Mandatory pattern per `CLAUDE.md` ("Family Cards become illegible at 63px wide otherwise").
- **CIS write-through routes** — call `/api/strategy-confirm` + `/api/families-confirm` + `/api/distribution-confirm` + `/api/financial-confirm` directly with Strategy-shaped payloads; no new write endpoints needed. Or for partial writes: `/api/cis-update` (allow-listed).
- **Bidirectional drift UI** — `src/components/planner/CollectionBuilder.tsx:220-607` (drift detection, baseline capture, debounced modal, 6 knobs, auto-balance via `/api/cis-update`). This is the canonical pattern when actuals diverge from CIS plan.
- **Deterministic financial calc** — `src/lib/financial-plan/calculate.ts` (`computeFinancialPlan`) + `src/lib/financial-plan/load-sources.ts` (`loadFinancialPlanSources`). Math is never AI — only narrative is.
- **Drop synthesis** — `src/lib/sales-strategy/synthesize-schedule.ts` (`synthesizeSchedule`) + `/api/drops/synthesize`. Idempotent.
- **CIS recording primitive** — `recordDecisions([...])` from `src/lib/collection-intelligence.ts`. Sequential, await-required (lines 165-180).
- **Auth boundary** — `getAuthenticatedUser` + `verifyCollectionOwnership(userId, planId)` from `src/lib/api-auth.ts:33,77`. Every Strategy route must wear both helmets.
- **Studio anex pattern** — `src/app/[locale]/studio/page.tsx` (public landing) + `src/app/(app)/studio/` (authenticated workspace) + `src/app/api/studio/*` (12 endpoints). Mirror this directory shape for `/strategy`.

---

## 6. Missing for Strategy

What aimily does not have today:

**(a) Time-series SKU performance store** — `collection_skus` is *canonical* (planned/target), not *measured*. There is no table that stores daily/weekly snapshots of velocity, sell-through, stock pipeline, returns. Strategy needs `strategy_observations` (per-SKU/per-date snapshot) plus a derived `strategy_sku_lifetime` aggregation. Schema sketched in `research_aimily-strategy-data-schema-mapping-2026-05-15.md §3.1-3.2`.

**(b) Multi-season SKU lineage** — `collection_skus.is_carryover` + `source_sku_id` exist (migration 048) but only link to the prior aimily-planned SKU, not to a stable model identity across years of Zara/H&M data. Need `strategy_models` (Zara-style model code 4-digit + canonical name) referenced by both `strategy_observations.model_id` and `collection_skus.strategy_model_id`. This is what enables "this V26 SKU is the next iteration of the V25 model that worked."

**(c) PDF/CSV ingestion pipeline** — no parser today. The Zara RNK PDF parser + Shopify CSV joiner need to live in `src/lib/strategy/ingest/`. Phase 1 (Zara): per-row parser → `strategy_observations`. Phase 2 (Shopify): join `Sales by variant` + `Inventory Levels` + `Returns` reports → normalized subset. Output of either ingest is the same canonical `strategy_observations` row.

**(d) Tenant isolation strict enough for enterprise** — current auth is `user_id` per row (`collection_plans.user_id` + RLS). For Inditex/H&M scale: need an `enterprise_tenants` table + `tenant_id` column on every strategy table + RLS keyed on `tenant_id` not `user_id`, plus team membership (`tenant_members` with roles: viewer, planner, admin). Studio's row-level user check is too thin for an enterprise contract.

**(e) Historical learnings/patterns table** — no aggregations exist today. Strategy needs `strategy_learnings` (per-tenant + optional cross-tenant anonymized) capturing patterns like "carryover I+V models in WA FLUIDOS LARGO family converted at 1.7× the rate of fresh SKUs over the last 3 seasons" — the actual recommendation engine output. This is the value-add over a raw Zara PDF dashboard. Computed via batch job, not real-time.

**Secondary gaps**:
- No batch SKU import endpoint that bypasses the AI generator (would let Strategy push 100+ recommended SKUs into `collection_skus` in one transaction with `source='strategy'`).
- No `strategy_recommendation_runs` audit row showing input → output traceability (regulatory-friendly for the enterprise legal team).
- No deduplication between `strategy_models` from multiple enterprises (cross-tenant data leak surface — must stay siloed by default).

---

## 7. Injection point recommendation

**Recommended: separate `/strategy` surface, like Studio. Hybrid is wrong; extending Block 2 is risky.**

Strategy lives at:
- `src/app/[locale]/strategy/page.tsx` — public landing (mirrors `studio/page.tsx`)
- `src/app/(app)/strategy/` — authenticated workspace (tenant-scoped, NOT `[id]`-scoped at first)
- `src/app/api/strategy/*` — ingest, learnings, recommendations
- `src/app/api/strategy/emit-to-collection-plan` — the one route that creates a new `collection_plans` row + populates CIS strategy/families/pricing/channels + inserts `collection_skus` in batch. Strategy hands the user a *seeded* Block 2 collection at the end of the wizard.

Three reasons this beats "extend Block 2 with a Learnings mode toggle":

1. **Enterprise data sensitivity** — historical SKU rankings from Inditex must NEVER co-mingle with the consumer-tier `collection_plans.user_id` model. A separate tenant store with stricter RLS is the only defensible architecture for the legal/security conversation with an enterprise procurement team. Mixing them inside the same Block 2 tables forces RLS gymnastics on every existing query and risks accidental leakage on a future `.select('*')`.

2. **Billing model divergence** — Studio proved the wedge precedent: Stripe products are separate (`prod_UW76*`), `getUserProducts(userId)` decides login redirect, top-bar switcher appears only if the user owns both. Strategy will be 5-figure ACV enterprise contracts with custom SLAs — sharing the same Stripe Pro/ProMax SKUs as consumer aimily would force compromise on both sides.

3. **Block 2 surface is mature and stable** — `architecture-block-2-collection-builder-bidirectional.md` documents Block 2 as closed end-to-end. Adding a "Learnings → Plan" toggle inside the existing flow means rewriting `ScenariosContent` to accept a third entry point (today: archetypes A/B/C/D from market lenses). That breaks the canonical pattern for every existing consumer customer.

The *integration point* — and this is what makes the architecture beautiful — is one endpoint: `/api/strategy/emit-to-collection-plan` calls `recordDecisions([...])` against `merchandising.strategy/*`/`families/*`/`pricing/*`/`channels/*` exactly like `/api/strategy-confirm` does today, then batch-inserts SKUs. From the moment that endpoint returns, the user is in canonical Block 2 — `loadFullContext()` projects Strategy's outputs into every downstream Block 3/4 AI generator without Strategy having to know they exist. Bucket B (creative direction in Strategy) writes to the same `creative.*` CIS subdomains the existing /welcome flow uses, so it flows through the same Block 1 → Block 2 pipe documented in §3. Zero pipe duplication.

Word count: ~1490.
