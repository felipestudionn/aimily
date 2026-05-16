---
name: Aimily Strategy · Roadmap Paso 2 + Paso 3
description: Post-MVP roadmap after E2E validation with real Zara PDF (commit 2814971). Locks the positioning Strategy as a standalone B2B product that connects with Block 1/Block 2 when available, with weekly real-time sales as the differentiating ultra-variable.
type: project
---

# Aimily Strategy · Roadmap Paso 2 + Paso 3

**Date**: 2026-05-16
**Anchor commits**:
- `2814971` — MVP shipped + E2E validated with real Zara RNK PDF (48 SKUs processed end-to-end in 334s)
- This commit (incoming) — visual identity on cards + tension_flag + seasonal_runway + roadmap

**Companion docs** (read in order):
1. `business-plan_aimily-strategy-2026-05-15.md`
2. `codex_contra-propuesta-aimily-strategy-2026-05-15.md`
3. `audit_block-2-for-aimily-strategy-2026-05-15.md`
4. `research_aimily-strategy-competitive-landscape-2026-05-15.md`
5. **This file**

---

## 0. Positioning lock (Felipe direction · 2026-05-16)

Strategy is **a standalone B2B product** that can be sold without the rest of aimily. The recurring weekly process it serves: `sales analysis → creative direction (supplied or AI-discovered) → budget-constrained decisions`.

The **ultra-variable** Strategy contributes that nobody else has in the aimily family:
> **Near-real-time weekly sales** cross-referenced with shifting creative direction. Block 2 was greenfield (no time-series). Strategy is the live retail mirror.

Three customer modes:

| Mode | Customer profile | Strategy's role |
|---|---|---|
| **Standalone** | Tier-1 megabrands (Inditex/H&M) with their own data + buyers + creative team | Ingest weekly → forensic intelligence → decision pack → emit plan to THEIR systems via API. No aimily 360 dependency. |
| **Partial 360** | DTC mid-market with aimily Block 1 (brand DNA + moodboard) | Strategy reuses Block 1 brand DNA as creative brief, no duplicate input. Plan emission to their own ERP. |
| **Full 360** | Greenfield brands using aimily end-to-end | Forensic loop: Block 1 → Block 2 → ventas → Strategy → Block 2 next season. Closed-loop merch planning. |

---

## 1. Paso 1 · SHIPPED in this commit

### 1.1 Visual identity on recommendation cards
- `resolveCandidateIdentity()` helper in run detail page
- Cards now show: thumbnail slot · `product_name` headline · `model_ref · color_name · €pvp` sub-line · `family_code` chip
- Lineage scope: `display_name` from identity graph + canonical_id sub
- Color scope: lineage display + color_name (from color taxonomy)
- Thumbnail placeholder for when `image_url` lands on product_facts (deferred — see §3.4)

### 1.2 `tension_flag` action type
New first-class recommendation that surfaces strategic conflict between sales-driven verdicts and the creative brief:
- **`cut_in_growing_family`** — engine wants to kill/resize_down a SKU but Bucket B pivots INTO that family. Suggestion: replace, don't remove.
- **`scale_in_shrinking_family`** — engine wants to scale a SKU but Bucket B pivots AWAY from its family. Suggestion: ride the winner one season + complement with bridge SKUs.
- **`winner_off_palette`** — color winner detected on a color OUTSIDE the brief's color_story. Suggestion: bridge season, then transition.

Generated AFTER Bucket B modulation, layered on top of base candidates. The merchandiser sees both the underlying recommendation AND the tension explicitly.

### 1.3 `seasonal_runway_days` classifier
Per-SKU: days remaining in the natural sell window from observation_date forward. Parses Spanish (V/I) and English (SS/FW/AW) season tags + compound carryovers ("I26+V26" → uses latest). Caps at 240 days, normalizes to 0-1 score.

- V26 SKU observed in March 2026 → ~210 days runway → score 1.0
- V26 SKU observed in May 2026 → ~120 days runway → score 0.67
- V26 SKU observed in late August → ~30 days runway → score 0.17
- F/W ends Mar 31 of year+1

Persisted on `strategy_sku_scores.seasonal_runway_days` + `seasonal_runway_score` (migration 061). Feeds the replenishment allocator in Paso 3.

### 1.4 Migration 061
- `tension_flag`, `new_sku_proposal`, `family_extension` added to `strategy_action_type` enum
- `seasonal_runway_days` + `seasonal_runway_score` added to `strategy_sku_scores`

---

## 2. Paso 2 · Creative direction enrichment (3-5 days)

### 2.1 AI creative direction discovery

When a tenant launches a run **without a creative brief**, Strategy can auto-generate one by:
1. Reading the tenant's brand DNA (from Block 1 if available, otherwise from an enterprise-supplied `tenant_brand_profile` JSON).
2. Looking up current trend signals via Perplexity API (the same provider integration Block 1 already uses for market research).
3. Synthesising a draft creative direction: color story, archetype focus, family pivot.
4. Surfacing as an **"AI-discovered brief"** that the merchandiser can accept, edit, or replace.

Endpoint: `POST /api/strategy/briefs/discover` → returns a draft brief from the latest sales data + Perplexity-derived trend research, gated behind `tenant_brand_profile` for grounding.

Block 1 reuse:
- `src/lib/prompts/prompt-context.ts` → moodboard generation prompts
- `src/lib/ai/load-full-context.ts` → brand DNA reader
- The Block 4 archetype taxonomy (already seeded in Strategy)

### 2.2 New SKU proposer

Generate concrete SKU proposals (not just labels) for the next collection by combining:
- Winning silhouettes from the current analysis (`carryover_survivor` + `peak` + `mature` SKUs)
- Active creative brief (color story + archetypes + family pivot)
- Tenant taxonomy (family + archetype mapping)

Output: `new_sku_proposal` candidates with:
- Proposed product_name (LLM-generated)
- Source_lineage_ref (the winning silhouette being extended)
- Target color (from color_story)
- Target archetype
- Projected price (from family price ladder)
- Projected demand (extrapolated from source lineage)

Endpoint: `POST /api/strategy/runs/[runId]/propose-skus`

### 2.3 Family extension proposer

When a family has high ROI + the brief pivots INTO it, propose new concepts within that family (e.g. "Sastrería is winning + brief pivots to sartorial elevated → propose 4 new archetypes: blazer alamares oversized, pantalón pleated wide cropped, falda midi A-line, chaleco sin mangas").

Output: `family_extension` candidates.

### 2.4 Color palette recommender

If brief specifies family pivot but NO color_story, derive one by:
- Researching color trends per archetype (Perplexity)
- Cross-referencing winning colors in the current portfolio
- Producing a 5-7-color palette with confidence per color

Stored as a new entity: `strategy_recommended_palettes` (lighter than taxonomies, scoped to a run).

---

## 3. Paso 3 · Replenishment allocator + lead-time intelligence (5-7 days)

### 3.1 Budget allocator

Given a tenant's `target_buy_budget` and the SKU candidates with action `replenish`, distribute budget across SKUs optimizing:

```
ranking_score = demand_score × seasonal_runway_score × (1 - return_risk_score) × creative_alignment_score
```

Where `creative_alignment_score`:
- 1.0 if no brief
- 0.0–1.0 from `confidence_creative_fit` if brief present

Output: a `replenishment_allocation` table per scenario:
- `product_fact_id` → recommended_buy_units
- Justification chain (which scores contributed)
- Total budget consumed vs target

### 3.2 Lead-time variable per SKU

Add `supplier_lead_time_days` field to `strategy_product_facts` (optional, ingested when customer provides supplier data). When present, the allocator considers:

```
deliverable_days = seasonal_runway_days - supplier_lead_time_days
```

A SKU with 60-day lead time and only 30 days of runway → `deliverable_days = -30` → exclude from replenishment, recommend `tension_flag: late_to_market` instead.

### 3.3 Mid-season vs pre-season modes

A run can specify `run_mode: 'mid_season' | 'pre_season'`:
- **Mid-season**: prioritize replenishment + markdown + redistribute; backtest against previous mid-season snapshots if available
- **Pre-season**: prioritize carryover + new SKU + family extension + kill

Mode affects scenario assembly + LLM narrative tone.

### 3.4 Image ingestion (low priority)

Pull product images from:
- A. Inditex internal feed (when customer provides URL pattern + auth)
- B. Public Zara catalog scrape per `model_ref` (legal review required)
- C. Customer-provided image bundle alongside data feed

Store in `strategy-uploads/<tenant_id>/images/<product_fact_id>.webp`. UI thumbnail slot already prepared.

---

## 4. Paso 4 · v3 plan emission to Block 2 (after Paso 3)

The bridge endpoint `POST /api/strategy/emit-to-collection-plan` writes:
- `collection_plans.budget` ← from selected scenario `total_predicted_buy_budget`
- `families` ← from family scores + new family extensions
- `skus` ← from candidates + new SKU proposals
- `collection_plan_strategy_links` ← full provenance record

The customer transitions from Strategy decision pack → Block 2 plan with one click. Block 2 surface is unchanged.

---

## 5. Paso 5 · Standalone product hardening (cuando vayamos a tier-1)

- App-path RLS: migrate read paths from `supabaseAdmin` to user-scoped client where possible. Procurement reviews will demand this.
- Dedicated tenant Supabase project for tier-1 customers (BP §4.8). Migration tooling: script that clones a tenant's data to a fresh project + repoints API config.
- VPC / on-prem option (BYOC) for tier-1 mega (Inditex/H&M scale).
- Deterministic PDF parser fallback (the Anthropic LLM parser is the demo path; production needs a regex-grammar fallback for procurement audits).
- SSO integration (Okta, Azure AD, SAML).
- API key system for headless ingest (CRON-driven weekly uploads from customer ETL).

---

## 6. Cumulative architecture diagram (textual)

```
                ┌──────────────────────────────────────────────────────────┐
                │  CUSTOMER                                                │
                │  (Tier-1 brand: Mango, Tendam, Inditex, H&M)             │
                │                                                          │
                │   Weekly sales feed         Creative team (optional)     │
                │   ───────────────►          ────────────────►            │
                └────────┬──────────────────────────┬───────────────────────┘
                         │                          │
                         ▼                          ▼
┌────────────────────────────────────┐  ┌──────────────────────────────────────┐
│  AIMILY STRATEGY (the new product) │  │  AIMILY 360 (block 1 reuse, optional)│
│                                    │  │                                      │
│  Ingest                            │  │  brand DNA + moodboard + archetypes  │
│   PDF / CSV / API                  │  │   ↑ feeds creative brief             │
│   ↓                                │  │                                      │
│  Fact tables (time-series)         │◄─┘                                      │
│   product / inventory / sales      │
│   / efficiency × week              │
│   ↓                                │
│  Identity graph (lineage)          │
│   ↓                                │
│  10+ classifiers (deterministic)   │
│   ↓                                │
│  Candidates × Bucket A constraints │
│   × Bucket B modulation            │
│   × tension flags                  │
│   ↓                                │
│  Scenarios (2-4 postures)          │
│   ↓                                │
│  LLM narrator (no calculator role) │
│   ↓                                │
│  Decision pack PDF + run detail UI │
│                                    │
│   ↓ (optional, v3)                 │
│  Bridge → Block 2 Collection Plan  │──────────┐
└────────────────────────────────────┘          │
                                                 ▼
                                       ┌──────────────────────────┐
                                       │  AIMILY 360 BLOCK 2      │
                                       │  (collection plan,       │
                                       │   families, SKUs,        │
                                       │   drops, financials)     │
                                       └──────────────────────────┘
```

---

## 7. KPIs that close the loop

For each customer, weekly:
- # runs executed
- # tensions surfaced + resolved (accepted / overridden in decision workshop)
- Replenishment allocation accuracy (predicted vs actual sell-through next snapshot)
- Backtest precision improvement over algorithm versions
- Customer NPS post-decision-workshop
- Time-to-decision-pack (target ≤ 24h per category)

---

## 8. Open questions deferred

1. Should `new_sku_proposal` candidates carry an LLM-generated image (DALL-E / Imagen) for the decision pack? Cost vs value.
2. Multi-week trends: Strategy's "ultra-variable" is weekly sales — do we want a `strategy_weekly_snapshot` view that aggregates the past N weeks per SKU? Or stay flat (one snapshot per source)?
3. Real-time mode: customer streams sales daily, Strategy continuously updates scores. Vs batch (weekly).
4. Pricing model adjustment given the standalone positioning: should the pilot tier be split into "Standalone" vs "360-integrated"?

---

## 9. Status

**Paso 1: ✓ shipped** in this commit. Visual identity, tension flags, seasonal runway.

**Paso 2: planned**. Awaiting Felipe's go to start the AI creative direction discovery work.

**Paso 3: planned**. Replenishment allocator + lead times.

**Paso 4: deferred** until at least one pilot customer is using Paso 1-3 in production.

**Paso 5: deferred** until tier-1 procurement signal.
