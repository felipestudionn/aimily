---
name: Block 3 — Design & Development Architecture
description: Living source of truth for Block 3. Routes, components, DB tables, AI endpoints, CIS contract, costing engine, production timeline. Updated immediately when any of these change.
type: project
lastUpdated: 2026-05-10
---

# Block 3 — Design & Development · LIVING TRUTH

> **Living doc.** Updated 2026-05-10 after the cost-aware closure session. Update in the same commit when adding/renaming a route, phase, component, AI endpoint, DB table, CIS key, or rule.

> **Companion**: `architecture-tree-rubik-cube.md` (cross-block tree). This doc zooms into Block 3 only.

---

## 1. SKU lifecycle modal · 7-card EvolutionStrip

The canonical UI for Block 3 is the per-SKU lifecycle modal opened from any SKU card. It renders 7 ordered steps:

| # | Step (`evolutionStep`) | Component | Sub-flow |
|---|---|---|---|
| 1 | `concept` | `RangePlanPhase` | Concept fields + financials + reference image upload |
| 2 | `sketch` | `SketchPhase` (sub: drawing) | Auto-generate flat sketch from reference (anti-crop retry) · upload override |
| 3 | `colorways` | `SketchPhase` (sub: colorways → materials) | Brand DNA palette source + Sanzo Wada modulator · cost-aware materials with `materials_budget` constraint |
| 4 | `techpack` | `TechPackInline` (wraps `TechPackSheet`) | Inline full-bleed editor · 8 sections pre-populated from CIS + materials + sourcing |
| 5 | `render3d` | `SketchPhase` (sub: techpack render) | 3D render of colored sketch |
| 6 | `prototype` | `PrototypingPhase` | Sourcing canonical (cost-aware AI) · Sample Chain (Phase 4) · Quick Notes |
| 7 | `production` | `ProductionPhase` | ProductionTimelineCard header · 4 sub-steps (Real Sample Validation · Fit & Size Run · Production Sample · Final Sign-off) · insert `production_orders` on Approve |

The `EvolutionStrip` rail (lib/sku-phases/EvolutionStrip.tsx) auto-derives state from SKU columns + tables — never a separate state machine. Step is reachable when the previous step has data.

---

## 2. Routes

| Route | Component | Purpose |
|---|---|---|
| `/collection/[id]/product` (no phase) | `PlannerDashboard` | Range Plan SKU grid + Collection Builder cards |
| `/collection/[id]/product?phase=sketch` | `SketchColorWorkspace` | Hub view of all SKUs needing sketch (cross-SKU index) |
| `/collection/[id]/product?phase=techpack` | `TechPackWorkspace` | Hub of all tech packs |
| `/collection/[id]/product?phase=prototyping` | `PrototypingWorkspace` | Hub of protos |
| `/collection/[id]/product?phase=production` | `ProductionWorkspace` | Hub of production |
| `/collection/[id]/product?phase=selection` | `FinalSelectionWorkspace` | Final lineup curation grid + lock CTA |
| `/collection/[id]/techpack/[skuId]` | `TechPackSheet` standalone | Legacy full-page tech pack (pre-inline). Still works; new flow uses inline. |
| `/collection/[id]/factories` | `FactoryDirectory` | Factories registry |
| `/collection/[id]/suppliers` | `SupplierDirectory` | Suppliers registry |
| `/collection/[id]/calendar` | (page null + portal Gantt) | Macro calendar with `ProductionCalendarBanner` overlay |

The full SKU lifecycle UI is rendered by `SkuDetailView` invoked from any place that opens a SKU detail (`PlannerDashboard`, `SketchColorWorkspace`, `PrototypingWorkspace`, `ProductionWorkspace`, `FinalSelectionWorkspace`).

---

## 3. Top-level components

```
src/components/planner/
├── PlannerDashboard.tsx        — Range Plan overview
├── CollectionBuilder.tsx       — SKU grid (Family Card flip pattern)
├── SkuDetailView.tsx           — modal wrapper, EvolutionStrip + footer
└── sku-phases/
    ├── EvolutionStrip.tsx           — 7-card rail, auto-derive state
    ├── RangePlanPhase.tsx           — Concept (name, pvp, reference, notes)
    ├── SketchPhase.tsx              — Drawing + Colorways + Materials (cost-aware)
    ├── PrototypingPhase.tsx         — Sourcing canonical + SampleChain + Quick Notes
    ├── ProductionPhase.tsx          — 4 sub-steps + ProductionTimelineCard + insert PO
    ├── ProductionTimelineCard.tsx   — per-SKU production calendar (NEW 2026-05-10)
    ├── SkuLifecycleContext.tsx      — Provider for colorways, sample reviews, designData, orders
    ├── SampleChainView.tsx          — 4-stage factory sample review
    └── shared.tsx                   — ImageUploadArea, MetricCell, SizeRunEditor

src/components/tech-pack/
├── TechPackInline.tsx              — wraps TechPackSheet for inline modal use (NEW 2026-05-10)
├── TechPackSheet.tsx               — main editable tech pack (1397 lines)
├── TechPackExportSheet.tsx         — read-only export-friendly version
├── CostingPanel.tsx                — Phase 2 BOM-driven landed cost + auto-trigger margin protection
├── ConstructionDetailsSection.tsx  — Phase 6 stitching/pressing/finishing
├── CompliancePill.tsx              — Phase 5 compliance pill in header
├── RevisionPill.tsx                — Phase 3 revision tracker pill
├── RevisionHistoryDrawer.tsx       — version timeline + diff + approval flow
├── SupplierDirectory.tsx           — suppliers categories + certifications
└── FactoryDirectory.tsx            — factories with specialties

src/components/design-dev/
├── SketchColorWorkspace.tsx        — Sketch hub
├── PrototypingWorkspace.tsx        — Prototyping hub
├── ProductionWorkspace.tsx         — Production hub
└── FinalSelectionWorkspace.tsx     — Final Selection lineup (writes to CIS, soft-archive)

src/components/timeline/
└── ProductionCalendarBanner.tsx    — calendar macro overlay (NEW 2026-05-10)

src/lib/production/
└── timeline.ts                     — pure calculator: materials × volume × complexity × factoryTier × freight (NEW 2026-05-10)
```

---

## 4. DB tables

| Table | Purpose | Key columns |
|---|---|---|
| `collection_skus` | SKU canonical row | `design_phase`, `sketch_url`, `sketch_top_url`, `reference_image_url`, `render_url`, `render_urls jsonb`, `material_zones jsonb`, `proto_iterations jsonb`, `production_sample_url`, `production_approved`, `production_data jsonb`, `sourcing_data jsonb`, `size_run jsonb`, `validated_steps jsonb`, `cost`, `pvp`, `margin`, `cost_breakdown jsonb` |
| `tech_pack_data` | One per SKU | `header jsonb`, `drawings jsonb` (viewA-G + extraSlots + callouts), `measurements jsonb`, `bom jsonb` (lines with cost, qty, unit), `materials jsonb` (zones with hex + Pantone + supplier + swatchUrl + notes), `factory_notes jsonb`, `grading jsonb`, `construction_details jsonb` |
| `tech_pack_comments` | Pin-anchored | `block`, `drawing_slot`, `pin_x`, `pin_y` (0-1), `body`, `author_*` |
| `tech_pack_revisions` | Version control | `version`, `snapshot jsonb`, `submitted_at`, `decided_at`, `decision` (Phase 3) |
| `sku_colorways` | Multiple per SKU | `name`, `hex_primary/secondary/accent`, `pantone_primary/secondary`, `material_swatch_url`, `zones jsonb` (with hex + pantone per zone), `status`, `position` |
| `sample_reviews` | Phase 4 sample tracking | `review_type` (white_proto / color_sample / fitting_sample / production_sample), `status`, `photos jsonb`, `issues jsonb`, `rectification_notes`, `fit/construction/material/color notes`, `measurements_ok`, `overall_rating 1-5` |
| `collection_assets` | Asset records | `phase`, `asset_type`, `version`, `status`, `deleted_at` (soft delete 30d), `metadata jsonb` |
| `production_orders` | Formal PO records | `order_number`, `factory_name`, `status`, dates, `total_units`, `total_cost`, `currency`, `line_items jsonb`, `qc_issues jsonb`. Inserted on "Approve for Production" → drives `dd-15..dd-18` milestone status. |
| `vendor_invitations` | Phase 5 vendor portal | `token`, `invited_by`, `vendor_email`, `sku_ids[]`, `permissions jsonb`, `expires_at`, `revoked_at` |
| `suppliers` | User-scoped | `supplier_type`, `region`, `moq`, `lead_time_days`, `cost_note`, `certifications ARRAY` |
| `factories` | User-scoped | `region`, `specialties ARRAY`, `moq`, `lead_time_days`, `past_collabs` |
| `materials_library` (migration 041) | Curated catalog | L1/L2/L3 entries · `cogsHint` (price + unit + currency) · `priceTier` · `certifications` · `rslFlags` · `higgMsi` · L3 supplier metadata |
| `pantone_library` (migration 042) | TCX/TPX catalog | `code`, `name`, `family`, `lab` (for Lab ΔE2000 nearest-match) |

---

## 5. AI endpoints

| Endpoint | Purpose | Notes |
|---|---|---|
| `/api/ai/generate-sketch-options` | Reference photo → flat sketch (gpt-image-1) | Anti-crop retry (3 attempts with reinforced prompt). Footwear: side 1024x1024 + top-down 1024x1536 portrait. |
| `/api/ai/colorize-sketch` | B&W sketch → colorized OR 3D photorealistic render | Per-zone hex assignments |
| `/api/ai/zones/detect` | Sketch + product → zone list (identity / structural / accent / neutral / hardware) | Claude JSON mode |
| `/api/ai/design-generate` | Multi-purpose D&D AI: `sketch-suggest`, `color-suggest`, `color-rename`, `materials-suggest`, `catalog-description`, `sourcing-suggest` | Claude. **Cost-aware materials**: receives `targetCogs` + `targetPvp` + `targetMargin` + `materialsBudget` + zones; returns per-material cost. **Sourcing**: receives BOM materials; returns per-region cost-stack (`laborRate`, `laborHours`, `overheadPct`, `freightMethod`, `freightTotal`, `dutiesPct`, `originCompatibility`). |
| `/api/ai/tech-pack/generate` | Generate measurements / BOM | Claude Haiku. Auto-fired by TechPackInline on first open if measurements empty. |
| `/api/ai/costing/suggest-substitutions` | Margin protection — propose cheaper substitutions when variance > 5% | Claude. Auto-triggered by CostingPanel via signature-guarded useEffect (no spam). |
| `/api/ai/freepik/{still-life,editorial,tryon}` | Product imagery (Block 4 territory) | Freepik Nano Banana / GPT Image 1.5 |

All endpoints load CIS server-side via `loadFullContext()`. Materials prompt also receives explicit cost frame.

---

## 6. CIS contract · what Block 3 reads + writes

### Reads from Block 1+2 CIS

```
creative.identity.colors[]              Brand DNA palette (5 hex Nudo) — Materials/Colorways source
creative.identity.visual_direction      646-char design narrative
creative.identity.tagline               "Cada detalle cuenta"
creative.inspiration.moodboard_analysis 3155-char mood explanation
creative.target.{demographics, psycho}  4 personas
creative.market.trends                  47 selected trend cards
merchandising.strategy.target_margin_pct  62%
merchandising.strategy.sales_target_y1    €420K
merchandising.pricing.tiers             entry/core/hero anchors
merchandising.families.list[].subcategories[].evidence  silhouette guides
```

All flow into `/api/ai/design-generate` via `loadFullContext()` → `buildInheritedContext()`.

### Writes (table-based, NOT separate CIS keys)

Block 3 deliberately writes to dedicated tables (the milestone-sync-map reads these directly). NO redundant `design.*` CIS keys — would be noise.

| Action | Writes to | Triggers `dd-N` milestone via |
|---|---|---|
| Generate sketch | `collection_skus.sketch_url` + `sketch_top_url` | dd-1 |
| Confirm colorways | `sku_colorways` rows + `collection_skus.render_url` | dd-3, dd-6 |
| Confirm materials (cost-aware) | `collection_skus.material_zones[]` with cost_total | dd-1 (combined gate) |
| Tech Pack v1 | `tech_pack_data` row + `tech_pack_revisions` (v1) | dd-19 |
| Proto iteration | `proto_iterations[]` per SKU | dd-7, dd-8 |
| Sample review | `sample_reviews` row | dd-9, dd-11, dd-12, dd-13 |
| Tech Pack v2 (post-rectif) | `tech_pack_revisions` (v2+) | dd-10 |
| Sourcing region pick | `collection_skus.cost_breakdown` (labor/overhead/freight/duties) | (cost engine recalc) |
| Approve for Production | `production_orders` insert (NEW 2026-05-10) + `production_approved=true` + `design_phase='completed'` | dd-15, dd-16 |
| PO closed (factory ships) | `production_orders.closed_at` | dd-17, dd-18 |
| Lock Final Selection | `merchandising.final_selection.locked_at` (CIS) + bump approved SKUs | dd-14 |

---

## 7. Block 3 milestones (`dd-1..dd-19`)

All 19 covered in `milestone-sync-map.ts`. Decider reads tables (not CIS keys for design.*). Status flips automatically.

| ID | Milestone | Completed when |
|---|---|---|
| `dd-1` | SketchFlow / Technical Sketches | All SKUs have `sketch_url` |
| `dd-2` | Launch Last / Define Forms | `tech_pack_data` count >= SKU count |
| `dd-3` | Design Shot 1 | All SKUs have `render_url` |
| `dd-4` | Design Shot 2 | All SKUs have render + tech pack revs v2+ |
| `dd-5` | Paper Pattern Development | `tech_pack_data` count > 0 |
| `dd-6` | Colorways Development | All SKUs have ≥1 colorway |
| `dd-19` | Initial Tech Pack | tech_pack_revisions v1 OR tech_pack_data exists |
| `dd-7` | White Proto Development | proto_iterations count > 0 |
| `dd-8` | White Proto Delivery | proto_iterations count > 0 |
| `dd-9` | White Proto Rectification | sample_reviews count > 0 |
| `dd-10` | Tech Pack Finalization | tech_pack_revisions v2+ exists |
| `dd-11` | Color Samples Development | sample_reviews count > 0 |
| `dd-12` | Fitting Samples Development | sample_reviews count > 0 |
| `dd-13` | Fitting Samples Confirmation | sample_reviews + finalSelectionLockedAt |
| `dd-14` | Collection Completed | finalSelectionLockedAt timestamp |
| `dd-15` | Production Order | production_orders count > 0 |
| `dd-16` | Production Timeline (factory) | production_orders + first closed_at |
| `dd-17` | Quality Control | production_orders closed > 0 |
| `dd-18` | Production Delivery & Logistics | production_orders all closed |

---

## 8. Cost-aware design pattern (NEW 2026-05-10)

The defining feature of the closure session. Every cost decision is bound by the SKU's COGS budget.

### Pipeline

```
sku.cost (target COGS €60.83) × MATERIALS_RATIO (0.50 CALZADO)
                                                   │
                                                   ▼
                            materials_budget = €30.42 (hard constraint)
                                                   │
                                ┌──────────────────┘
                                ▼
                    materials-suggest AI receives:
                      • brand DNA palette
                      • zones detected
                      • targetCogs, targetPvp, targetMargin
                      • materialsBudget
                                │
                                ▼
            Returns per-material:
                {name, zone, type, description, sustainability,
                 consumption, cost_per_unit, cost_total, cost_currency}
            Constraint: SUM(cost_total) ≤ materials_budget ± 5%
                                │
                                ▼
            Frontend writes to sku.material_zones[] with cost_total
                                │
                                ▼
            TechPackInline reads material_zones[].cost_total → BOM lines.cost
            (no proportional split)
                                │
                                ▼
            sourcing-suggest AI receives:
                • BOM materials (chosen)
                • COGS - materials_used = labor+overhead+freight+duties_budget
                                │
                                ▼
            Returns per-region:
                {name, fit, moq, leadTime, cogsRange,
                 originCompatibility, laborRate, laborHours,
                 overheadPct, freightMethod, freightTotal, dutiesPct}
                                │
                                ▼
            User picks region → write cost_breakdown to sku.cost_breakdown
                                │
                                ▼
            recalculateCostBreakdown() → landed_cost vs sku.cost target
                                │
                                ▼
            If variance > 5%: AI Margin Protection auto-fires
            (signature-guarded — no spam, retriggers only on meaningful change)
```

### MATERIALS_RATIO_BY_CATEGORY

```
CALZADO    → 0.50  (50% of COGS for materials, rest for labor/overhead/freight/duties)
ROPA       → 0.55
ACCESORIOS → 0.45
```

---

## 9. Production timeline (NEW 2026-05-10)

`src/lib/production/timeline.ts` — pure function `computeProductionTimeline()`.

### Multipliers

```
volumeMultiplier(buyUnits):
  <200    → 0.65  (small batch, faster — skip queue)
  200-2000 → 1.0   (standard)
  2000-5000 → 1.25
  >5000   → 1.5   (large run, queue effect)

complexityMultiplier(category, family):
  bota/outerwear/sastrería/lingerie/encaje → 1.3
  sneaker/dress/shirt/pant/skirt           → 1.0
  t-shirt/scarf/simple-knit                → 0.75
  ACCESORIOS                                → 0.85

factoryTypeMultiplier:
  artisan         → 1.45
  semi-industrial → 1.0
  vertical        → 0.85  (in-house material supply)
  OEM             → 1.1   (other-brand queues)

material lead heuristic (max across BOM):
  leather/cuero            → 60d (Italian Walpier +15d, Spanish/Portuguese -10d)
  silk/wool/cashmere       → 45d
  linen/cotton/hemp        → 30d
  synthetics               → 15d
  trims/hardware           → 10d
  default fabric           → 25d

freight transit:
  sea CN→EU 35d · sea TR/MA→EU 12d
  road IT/PT/ES/FR/DE→EU 4d (best for nearshore)
  air 5d · rail CN 18d
  customs +5d
```

### Per-SKU surface
`ProductionTimelineCard` renders in ProductionPhase header:
- Phases breakdown (Materials × max BOM | Factory × multipliers | Freight + customs)
- Total + days available + slack vs `launch_date`
- Status badge: "En tiempo" / "Tiempo justo" / "Riesgo"
- Warnings (long material lead, tight slack)

### Macro surface
`ProductionCalendarBanner` portal at `/calendar`:
- Aggregates per-SKU lead, finds longest + tightest
- Compares vs template default (sum dd-15..dd-18 durationWeeks × 7)
- If overshoot > 7d or any SKU 'at-risk': shows banner top-center
- One-click "Aplicar al calendario" → PATCH adjusts `dd-15..dd-18` proportionally (durationWeeks + startWeeksBefore)
- Cero impacto en milestones template; user opts in.

---

## 10. Tech Pack inline (NEW 2026-05-10)

The `TechPackInline` component wraps `TechPackSheet` to render inside the SKU modal (no page navigation away).

### Pre-fill canonical · 8 sections

| Section | Source | Auto-filled |
|---|---|---|
| `header` | sku + collection + user | brand, season, drop, sku_code, name, family, category, pvp, cogs, units, designer |
| `drawings.viewA` | `sku.render_url` (preferred) ‖ `sku.sketch_url` | colored render or fallback flat sketch |
| `drawings.viewB` | `sku.sketch_top_url` | top-down view (uncropped via anti-crop retry) |
| `drawings.extraSlots` | category heuristic | CALZADO: Heel detail + Sole pattern · ROPA: Back view + Detail |
| `materials.zones[]` | `sku.material_zones[]` + active colorway hex map (fuzzy match) | name, pantone (closestPantone Lab ΔE2000), hex (visual swatch), notes (composition + finish) |
| `bom.lines[]` | `sku.material_zones[].cost_total` | type, material, qty, unit (parsed from consumption), supplier, cost (real, not split) |
| `measurements` | `/api/ai/tech-pack/generate` scope='measurements' auto-fired | rows + notes |
| `grading` | category template | CALZADO Unisex 36-45 · ROPA XXS-XXL · ACCESORIOS one-size |
| `construction_details` | extracted from `material_zones[].finish` | techniques: Blake stitch, vegetable-tanned, vulcanised rubber, French seam, Goodyear welt |
| `factory_notes` | `sku.sourcing_data` | factory, origin, contact, notes (when sourcing complete) |

### Stale detection
Every section has a "needed" predicate that triggers re-fill if upstream data changed (e.g., colorway re-generated → material_zones hex updated → BOM lines.cost out of sync → re-fill).

### Inline layout
- Modal compact header (back link + breadcrumb + mini-dot EvolutionStrip on right)
- Full-bleed content area (no max-w, no card padding) for techpack
- TechPackSheet renders inside with its own internal layout (1400px max-w)
- Print + Export PDF + **Compartir con fábrica** buttons in header
- ZERO navigation away — user stays in modal flow

---

## 11. Hidden couplings to keep in mind

- **Materials live in 3 places**: `sku.material_zones`, `tech_pack_data.materials.zones`, `tech_pack_data.bom.lines.material`. The `material_zones[].cost_total` is the source of truth for BOM cost; the other two mirror it.
- **`sku.cost`**: target COGS. `sku.cost_breakdown.total_landed`: actual derived cost. Variance = (landed - cost) / cost. **Never overwrite `sku.cost` from cost_breakdown** — they're different concepts.
- **Pantone in 4 locations**: `sku_colorways.pantone_primary`, `sku_colorways.zones[].pantone`, `tech_pack_data.materials.zones[].pantone`, `tech_pack_data.bom.lines[].material` (free text). Source of truth: `sku_colorways.zones[].hex` → `closestPantone()` → propagated to materials.zones[].pantone.
- **`tech_pack_data` PATCH** writes per-section. Phase 3 revisions intercept at API layer (creates revision row on each PATCH).
- **`designData.patterns`** in `SkuLifecycleContext` is reserved for Phase 6 Pattern Library. Never read it as Materials state.
- **`production_orders`** count is the milestone driver. UI changes (Approve button) MUST insert a row, not just flip `sku.production_approved`.
- **`vendor_invitations.token`** is the only public-facing path; `/vendor/[token]/...` is the only route an unauthenticated factory can hit.

---

## 12. Anti-leak rules (preserved from Felipe)

1. **`brand_name`** is the user-facing name (Nudo). **Never** echo `collection_plans.name` (= AZUR working title) in prompts.
2. **Sketches** use `creative.identity.colors[]` + `creative.identity.visual_direction`, NOT `creative.inspiration.reference_brands` (those are moodboard cousins, not aesthetic source).
3. **Tech-pack measurements** use `merchandising.families.list[].subcategories[].evidence`, never invent.
4. **Costing** uses `merchandising.pricing.tiers.{entry,core,hero}` as anchors, never hardcoded percentages.
5. **`sku.cost`**: target COGS, immutable from inside cost_breakdown.
6. **i18n always** — no English literals when adding new strings; use `t.skuPhases.*` / `t.techPack.*` / `t.calendar.*` × 9 locales.
7. **No Sparkles icon** — Felipe explicitly hates it. TrendingDown / Wand2 / Check / ArrowRight are the canonical icons.

---

## 13. Closure session changelog (2026-05-10)

| Sprint | What changed |
|---|---|
| Cost-aware materials | `design-prompts.ts materials-suggest` rewritten to receive cost frame + return per-material cost. Frontend `SketchPhase` autoFillMaterials + auto-fire useEffect updated. `MaterialZone` type extended with consumption/cost_per_unit/cost_total/cost_currency. |
| BOM real costs | TechPackInline reads `material_zones[].cost_total` → BOM lines.cost. Stale detection added. |
| Sourcing cost-stack | `sourcing-suggest` rewritten to return per-region labor/overhead/freight/duties. PrototypingPhase region pick → `sku.cost_breakdown` PATCH. SegmentedPill removed. Auto-fire on entry. |
| Compliance auto-derive | `/api/compliance/check` material_zones shape bug fixed. |
| Production timeline | New `src/lib/production/timeline.ts` with multipliers (volume × complexity × factoryTier). `ProductionTimelineCard` in ProductionPhase header. |
| Calendar overlay | `ProductionCalendarBanner` portal at `/calendar` — aggregate detection + one-click apply. |
| AI Margin Protection auto-trigger | `useEffect` in CostingPanel with signature guard (sku + variance_pct rounded to 0.1pp). |
| Vendor Portal exposure | "Compartir con fábrica" button in TechPackSheet header → POST `/api/vendor-invitations` → copy link to clipboard. |
| Production milestones auto-flip | "Approve for Production" inserts `production_orders` row → `dd-15..dd-18` flip. |
| Final Selection soft-archive | When isLocked + !approved: visual grayscale + "Fuera de lineup" badge. SKU stays in DB. |
| Tech Pack inline full-bleed | New `TechPackInline` wrapper. SkuDetailView renders it for `evolutionStep==='techpack'`. Header compact + EvolutionStrip mini-dots. |
| Pantone fuzzy mapping | Token-based zone matching (sole/heel/upper/interior/accent groups) → 9/9 zones map vs 1/9 with exact match. |
| Anti-crop sketch | `generateUncropped()` 3-attempt retry + `detectCrop()` Lab analysis + portrait 1024x1536 for footwear top-down. |
| Side view = render | TechPackInline preferredViewA = `sku.render_url` (colored) ‖ sketch_url. |
| Sparkles removed | CostingPanel margin alert: TrendingDown. Substitution CTA: Wand2. Copy → Spanish. |

---

## 14. Files of record

| File | Role |
|---|---|
| `src/lib/production/timeline.ts` | Pure timeline calculator |
| `src/components/planner/sku-phases/ProductionTimelineCard.tsx` | Per-SKU UI card |
| `src/components/timeline/ProductionCalendarBanner.tsx` | Macro calendar overlay |
| `src/components/tech-pack/TechPackInline.tsx` | Inline wrapper for SKU modal |
| `src/components/tech-pack/CostingPanel.tsx` | Costing engine UI + margin alert + auto-trigger |
| `src/lib/milestone-sync-map.ts` | Milestone status decider (covers all 19 dd-*) |
| `src/lib/ai/design-prompts.ts` | All design AI prompts (cost-aware materials + sourcing cost-stack) |
| `src/components/planner/sku-phases/SketchPhase.tsx` | Drawing + Colorways + Materials canonical |
| `src/components/planner/sku-phases/PrototypingPhase.tsx` | Sourcing canonical + SampleChain |
| `src/components/planner/sku-phases/ProductionPhase.tsx` | 4 sub-steps + timeline card + PO insert |
| `src/components/design-dev/FinalSelectionWorkspace.tsx` | Lineup + lock + soft-archive |

---

## 15. Block 3 → Block 4 contract (signals Marketing reads)

| Signal | Source | Used by |
|---|---|---|
| `dd-3/4 completed` | milestones | gm-3 still-life trigger |
| `dd-13 completed` | milestones | gm-5 editorial trigger |
| `dd-14 completed` | milestones | gm-12 launch lock |
| `dd-18 completed` | milestones | gm-1 storefront publish |
| `merchandising.final_selection.locked_at` | CIS | drop announcement timestamp |
| `production_orders.closed_at` per SKU | table | dispatch trigger for emails / countdown |
| `sku.production_approved=true` | table | filter del lineup oficial DTC/PoS |
| `sku.cost_breakdown.total_landed` | table | actual margin reporting |

Block 4 reads these; never queries Block 3 internal state directly.
