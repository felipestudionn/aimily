---
name: Block 3 — Design & Development Architecture
description: Reference map of routes, phases, components, AI endpoints, and DB tables for Block 3. Updated immediately when any of these change.
type: project
---

# Block 3 — Design & Development Architecture

> **Living doc.** Update in the same commit when adding/renaming a route, phase, component, AI endpoint, or DB table. Out-of-sync = bug.

> **Companion to** `architecture-tree-rubik-cube.md`. This doc zooms in on Block 3 only.

> **PLM parity context:** the master plan `.planning/plm-parity-plan.md` (gitignored, not in repo) drives the 6-phase roadmap to bring Block 3 to feature-parity with Centric / FlexPLM. The audit `.research/block-3-codebase-audit.md` (R2 post-Codex review) is the live snapshot of what's already built.

---

## 1. Phase model — 4 DB phases × 6 visual evolution steps

| DB `design_phase` | Evolution step(s) shown | Component rendered | Sub-stepper |
|---|---|---|---|
| `range_plan` | `concept` | `RangePlanPhase` | — |
| `sketch` | `sketch`, `colorways`, `render3d` | `SketchPhase` | Drawing → Colorways → Materials → Tech Pack |
| `prototyping` | `prototype` | `PrototypingPhase` | Sourcing → Proto Tracking |
| `production` | `production` | `ProductionPhase` | Real Sample Validation → Fit & Size Run → Production Sample → Final Sign-off |
| `completed` | (locked) | (read-only summary) | — |

EvolutionStrip auto-derives state from SKU columns (no separate state machine):
- `concept` ✅ when `name + pvp > 0 && design_phase !== 'range_plan'`
- `sketch` ✅ when `sketch_url` exists
- `colorways` ✅ when `render_url` exists
- `render3d` ✅ when `render_urls['3d']` exists
- `prototype` ✅ when `proto_iterations[0].images[0]` exists
- `production` ✅ when `production_sample_url` exists

---

## 2. Routes (sub-pages of Block 3)

| Route | Component | Purpose |
|---|---|---|
| `/collection/[id]/product/` | `CollectionBuilder` (grid) | Range-plan SKU list + Collection Builder cards |
| `/collection/[id]/techpack/[skuId]` | `TechPackSheet` standalone | Full tech pack view per SKU outside the modal |
| `/collection/[id]/factories` | `FactoryDirectory` | Factories registry (per user) |
| `/collection/[id]/suppliers` | `SupplierDirectory` | Suppliers registry with categories: fabric / leather / trim / hardware |

The full lifecycle UI (the SKU modal with EvolutionStrip + 4 phase components) is rendered by `SkuDetailView` invoked from any place that opens a SKU detail.

---

## 3. Top-level components

```
src/components/planner/
├── PlannerDashboard.tsx        — Range Plan overview
├── CollectionBuilder.tsx       — SKU grid with Family Card flip pattern
├── SkuDetailView.tsx           — modal wrapper, EvolutionStrip + footer
└── sku-phases/
    ├── EvolutionStrip.tsx           — 6-card rail, auto-derive state
    ├── RangePlanPhase.tsx           — Concept (name, pvp, reference, notes)
    ├── SketchPhase.tsx              — Sketch + Colorways + Materials + Tech Pack
    ├── PrototypingPhase.tsx         — Sourcing + Proto Tracking
    ├── ProductionPhase.tsx          — 4 sub-steps + PO generation
    ├── SkuLifecycleContext.tsx      — Provider for colorways, sample reviews, designData, orders
    └── shared.tsx                   — ImageUploadArea, MetricCell, SizeRunEditor, StatusBadge

src/components/tech-pack/
├── TechPackWorkspace.tsx       — wrapper for tech pack standalone route
├── TechPackSheet.tsx           — main editable tech pack (1397 lines)
├── TechPackExportSheet.tsx     — read-only export-friendly version
├── SupplierDirectory.tsx       — suppliers categories + certifications
└── FactoryDirectory.tsx        — factories with specialties

src/components/design-dev/
└── FinalSelectionWorkspace.tsx — Final Selection lineup (writes to CIS + bumps approved SKUs to completed)
```

---

## 4. DB tables

| Table | Purpose | Key columns |
|---|---|---|
| `collection_skus` | Main SKU row | `design_phase`, `sketch_url`, `sketch_top_url`, `reference_image_url`, `render_url`, `render_urls jsonb`, `material_zones jsonb`, `proto_iterations jsonb`, `production_sample_url`, `production_approved`, `production_data jsonb`, `sourcing_data jsonb`, `size_run jsonb`, `validated_steps jsonb`, `cost`, `pvp`, `margin` |
| `tech_pack_data` | One per SKU | `header jsonb`, `drawings jsonb` (`viewA`, `viewB`, `callouts[]`), `measurements jsonb` (`rows[]`, `notes`), `bom jsonb` (`lines[]`), `materials jsonb` (`zones[]`), `factory_notes jsonb`, `grading jsonb` |
| `tech_pack_comments` | Pin-anchored comments | `block` (header/drawings/measurements/bom/grading/factory/general/**materials** ← migration 032), `drawing_slot`, `pin_x`, `pin_y` (normalized 0-1), `body`, `author_*` |
| `sku_colorways` | Multiple colorways per SKU | `name`, `hex_primary/secondary/accent`, `pantone_primary/secondary` (free text today), `material_swatch_url`, `zones jsonb`, `status`, `position` |
| `sample_reviews` | Phase 4 sample tracking | **HUÉRFANO HOY** — exists with full schema (review_type IN white_proto / color_sample / fitting_sample / production_sample, status IN pending / issues_found / approved / rejected, photos jsonb, issues jsonb, rectification_notes, fit/construction/material/color notes, measurements_ok, overall_rating 1-5) but not wired into SkuDetailView |
| `collection_assets` | Asset records (storage) | `phase`, `asset_type`, `version` (integer, default 1), `status`, `deleted_at` (soft delete 30d), `metadata jsonb`. CREATE TABLE in migration 033 (baseline backfilled Phase 0). Bucket policies in 013. |
| `production_orders` | Formal PO records | `order_number`, `factory_name`, `status`, dates, `total_units`, `total_cost`, `currency`, `line_items jsonb`, `qc_issues jsonb`, `documents jsonb` |
| `suppliers` | User-scoped suppliers | `supplier_type`, `region`, `moq`, `lead_time_days`, `cost_note`, `certifications ARRAY` (ready for OEKO-TEX / GOTS / etc.) |
| `factories` | User-scoped factories | `region`, `specialties ARRAY`, `moq`, `lead_time_days`, `past_collabs` |

---

## 5. AI endpoints touching Block 3

| Endpoint | Purpose | Engine |
|---|---|---|
| `/api/ai/generate-sketch-options` | Reference photo → flat sketch (1 view ROPA, 2 views CALZADO) with IP-protection clauses | gpt-image-1 |
| `/api/ai/colorize-sketch` | B&W sketch → colorized OR 3D photorealistic render | gpt-image-1.5 (input_fidelity high) |
| `/api/ai/zones/detect` | Sketch + product → semantic zone list (identity / structural / accent / neutral / hardware) | Claude (JSON mode) |
| `/api/ai/design-generate` | Multi-purpose D&D AI: `sketch-suggest`, `color-suggest`, `materials-suggest`, `catalog-description`, `sourcing-suggest` | Claude |
| `/api/ai/tech-pack/generate` | Generate measurements / BOM / both | Claude Haiku |
| `/api/ai/freepik/still-life` | Product alone editorial | Freepik Nano Banana |
| `/api/ai/freepik/editorial` | On-model editorial photo | Freepik Nano Banana / GPT Image 1.5 |
| `/api/ai/freepik/tryon` | Brand-model catalog photo | Freepik Nano Banana |

All endpoints load CIS server-side via `loadFullContext()`. Frontend never calls AI direct.

---

## 6. Tech Pack API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/tech-pack?skuId=X` | Fetch tech pack data + comments |
| PATCH | `/api/tech-pack` | Upsert one section (drawings / measurements / bom / materials / factory_notes / header / grading) — currently overwrites whole JSON section. Phase 3 will introduce revisions table. |
| POST | `/api/tech-pack/export` | Render PDF via puppeteer-core + @sparticuz/chromium-min on Vercel Fluid (3-5s) |
| POST | `/api/ai/tech-pack/generate` | AI fill measurements + BOM |

---

## 7. Other Block 3-related APIs

| Path | Purpose |
|---|---|
| `/api/skus/[id]` | CRUD SKU; logs audit on `design_phase` advance and on factory_name/contact set |
| `/api/skus/carry-over` | Import SKUs from previous collection, preserving `source_sku_id` linkage |
| `/api/sample-reviews` | CRUD sample_reviews (orphan today, wired in Phase 4) |
| `/api/collection-plans/[id]/lock-selection` | Lock Final Selection — bumps approved SKUs to `design_phase = 'completed'` |
| `/api/purchase-order?skuId=X` | Excel PO export |

---

## 8. Workflow validation

- `validated_steps jsonb` (collection_skus) — flat record of step confirmations
- `production_data.confirmed_steps[]` — production phase per-step
- `production_approved boolean` — final approval flag
- Phase advance with warnings before missing data; user can override
- Phase revert (sketch → range_plan, prototyping → sketch) with confirm dialog
- Undo current step with destructive confirmation (clears step data + reverts phase)

Audit trail: `audit_log` table captures `DESIGN_PHASE_ADVANCED` events with from/to.

---

## 9. PLM parity gaps (as of Phase 0 close)

Tracked in `.planning/plm-parity-plan.md` (gitignored). Live snapshot in `.research/block-3-codebase-audit.md` (R2). Summary:

- **Phase 1**: Materials & Trims Library curated (~700 entries) + Pantone TCX/TPX integration + Hardware library + `<MaterialCombobox>` replacing free-text inputs across SketchPhase Materials sub-step, TechPackSheet material swatches, BOM rows
- **Phase 2**: BOM-driven costing engine (`cost_breakdown jsonb` derived from BOM) + AI Margin Protection (substitution suggestions on margin violation)
- **Phase 3**: Tech pack version control with diff (revisions table replaces JSON overwrite) + multi-stage approval workflow + e-signatures
- **Phase 4**: Wire `sample_reviews` table into SkuDetailView + chain UI (white_proto → color_sample → fitting_sample → production_sample → BULK) + AI photo comparison vs sketch+render
- **Phase 5**: Compliance Hub (RSL/REACH + Certificate management + Higg MSI) + Vendor Portal (read-only with AI auto-translation)
- **Phase 6**: Print/Graphic library + Multi-view drawings (7 slots) + Construction details structured

---

## 10. Hidden couplings to keep in mind

- **Materials live in 3 places**: `sku.material_zones`, `tech_pack_data.materials.zones`, `tech_pack_data.bom.lines.material`. A Materials Library refactor must update all three.
- **`sku.cost` has 10+ consumers**: Range Plan, Production financial recap, PO totals, collection-export, sales dashboards, marketing forecasts. The Phase 2 costing engine must preserve `sku.cost` as the canonical numeric field; `cost_breakdown` is a derived companion.
- **Two cost concepts in Production**: `sku.cost` (target) vs `production_data.unit_cost_final` (actual). Landed-cost engine must declare the source of truth.
- **Pantone touches 3 locations**: `sku_colorways.pantone_primary`, `sku_colorways.zones[].pantone`, `tech_pack_data.materials.zones[].pantone`. Phase 1 must add Pantone code IDs while preserving free-text fallback.
- **`tech_pack_data` PATCH overwrites whole JSON sections**. Phase 3 version control must intercept at the API layer, not the UI.
- **`designData.patterns`** in `SkuLifecycleContext` is reserved for Phase 6 Pattern Library. Phase 0 cleared the spurious read in SketchPhase that used it as Materials state.
