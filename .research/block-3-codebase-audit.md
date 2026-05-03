# Block 3 — Design & Development — Codebase Audit

**Date:** 2026-05-03 (revision 2 — post Codex independent review + DB verification)
**Method:** Direct file read + Codex independent review + Supabase MCP schema verification.
**Files audited:** SketchPhase.tsx (1450), SkuDetailView.tsx (527), EvolutionStrip.tsx (210), PrototypingPhase.tsx (446), ProductionPhase.tsx (510), TechPackSheet.tsx (1397, partial), shared.tsx (276), product-zones.ts, useSkus.ts (87+ lines SKU type), types/prototyping.ts (sample_reviews shapes), types/design.ts, design-prompts.ts (5 AI types), SkuLifecycleContext.tsx, FinalSelectionWorkspace.tsx, SupplierDirectory.tsx, FactoryDirectory.tsx, /api/tech-pack/route.ts, /api/skus/[id]/route.ts, /api/sample-reviews/route.ts, /api/skus/carry-over/route.ts, /api/collection-plans/[id]/lock-selection/route.ts, /api/cron/cleanup-deleted-collections.
**DB schemas inspected via MCP:** `collection_skus`, `tech_pack_data`, `tech_pack_comments`, `sku_colorways`, `collection_assets`, `production_orders`, `suppliers`, `factories`, `sample_reviews` (added in r2).

---

## ⚠️ CORRECTIONS APPLIED IN R2 (post Codex review)

| Claim in r1 | Reality (verified) | Action |
|---|---|---|
| ✅ "Sketch upload supports Side + Top for CALZADO independently" | **🐛 BUG** — top-down upload at [SketchPhase.tsx:468-470](src/components/planner/sku-phases/SketchPhase.tsx#L468-L470) writes to `sketch_url` (lateral view), pisando la vista Side. UI muestra slot Top pero no persiste en `sketch_top_url`. **Real bug en código actual** — debe arreglarse antes de cualquier flujo de diseñador real. | Add to plan as Phase 0 hotfix (5min) |
| ❌ "Sample tracking — only proto_iterations exists" | **`sample_reviews` table EXISTS in BD** (verified via MCP). CHECKs: `review_type IN ('white_proto','color_sample','fitting_sample','production_sample')`, `status IN ('pending','issues_found','approved','rejected')`. Schema rich: photos jsonb, issues jsonb, rectification_notes, fit/construction/material/color notes, measurements_ok, overall_rating 1-5, reviewed_by, reviewed_at. **API exists** (`/api/sample-reviews/route.ts`), **hook exists** (`useSampleReviews.ts`), **types exist** (`types/prototyping.ts`). **PERO completamente HUÉRFANO** del SkuDetailView — proto_iterations is the only chain visible to user. | Phase 4 plan: enchufar lo huérfano + extender + AI comparison |
| ❌ "tech_pack_comments.block includes 'materials'" | **Schema drift confirmed via MCP**: `tech_pack_comments_block_check` permits only `header / drawings / measurements / bom / grading / factory / general`. Code uses `'materials'` ([TechPackSheet.tsx:38](src/components/tech-pack/TechPackSheet.tsx#L38)) which would FAIL the constraint. Production cannot save material comments today. | Phase 0 hotfix: migration adds 'materials' to CHECK |
| Implied "collection_assets.version verified" | Migration 013 adds policies/indexes only — no CREATE TABLE in repo. Drift histórico: tabla existe en BD pero create-table migration está fuera del repo. Risk: nuevo developer no puede recrear schema desde migrations. | Phase 0 forensics: dump live schema → write reconciliation migration |
| ❌ "Pattern library doesn't exist at all" | Matizado: no DB table, but `designData.patterns` workspace state exists ([SkuLifecycleContext.tsx:11](src/components/planner/sku-phases/SkuLifecycleContext.tsx#L11)) with `PatternFile` type. **PEOR**: SketchPhase abuse semántico — usa `designData.patterns[sku.id]` como state de "Materials confirmation" ([SketchPhase.tsx:58](src/components/planner/sku-phases/SketchPhase.tsx#L58)). Hay que limpiar antes de meter Materials Library. | Phase 1 prereq: refactor SketchPhase materials state to its own field |
| Mentioned only "sourcing-suggest" AI | Real: 5 types in `design-prompts.ts` — `sketch-suggest`, `color-suggest`, **`materials-suggest`** (already exists!), `catalog-description`, `sourcing-suggest`. The Materials Library Combobox can leverage `materials-suggest` for ranking. | Update Phase 1 spec |
| Audit gaps | Codex flagged 9 features audit missed entirely (see §AUDIT GAPS in Codex output): dedicated Block 3 routes, useSkus.ts surface, carry-over with `source_sku_id`, tech-pack GET/PATCH API per section, tech-pack PDF export via tokenized headless Chromium, supplier categories typed (fabric/leather/trim/hardware), Final Selection lock writes to CIS + bumps to completed | Documented in §3 below |

---

---

## 1. Workspace structure

### Phase model — 4 DB phases × 6 visual evolution steps

| DB `design_phase` | Evolution step(s) shown | Component rendered |
|---|---|---|
| `range_plan` | `concept` | `RangePlanPhase` |
| `sketch` | `sketch`, `colorways`, `render3d` | `SketchPhase` (with internal stepper) |
| `prototyping` | `prototype` | `PrototypingPhase` |
| `production` | `production` | `ProductionPhase` |
| `completed` | (locked) | (read-only summary) |

### `EvolutionStrip` (gold-standard 6-card rail) — `EvolutionStrip.tsx`

- 6 cards: Concept · Sketch · Color & Materials · 3D Render · Prototype · Production
- Auto-derives state from SKU data ([EvolutionStrip.tsx:122-209](src/components/planner/sku-phases/EvolutionStrip.tsx#L122-L209)):
  - `concept` ✅ when `name + pvp > 0 && design_phase !== 'range_plan'`
  - `sketch` ✅ when `sketch_url` exists
  - `colorways` ✅ when `render_url` exists
  - `render3d` ✅ when `render_urls['3d']` exists
  - `prototype` ✅ when `proto_iterations[0].images[0]` exists
  - `production` ✅ when `production_sample_url` exists
- Reachability gating: locked steps dim 35% grayscale, can't click.

### Sub-stepper inside `SketchPhase` ([SketchPhase.tsx:22-27](src/components/planner/sku-phases/SketchPhase.tsx#L22-L27))

`Drawing` → `Colorways` → `Materials` → `Tech Pack`

### Mode pill — `Manual | AI` per sub-step ([SketchPhase.tsx:69](src/components/planner/sku-phases/SketchPhase.tsx#L69))

### Routes (sub-pages of Block 3)

- `/collection/[id]/product/` — SKU list page (CollectionBuilder grid)
- `/collection/[id]/techpack/[skuId]` — Standalone tech pack view per SKU
- `/collection/[id]/factories/page.tsx` — Factory directory
- `/collection/[id]/suppliers/page.tsx` — Supplier directory

---

## 2. Data model (DB)

### `collection_skus` — main SKU row, D&D-relevant columns

| Column | Type | Purpose |
|---|---|---|
| `design_phase` | text | range_plan / sketch / prototyping / production / completed |
| `sketch_url` | text | Main sketch image (front for ROPA, side for CALZADO) |
| `sketch_top_url` | text | Top-down sketch (CALZADO only) |
| `reference_image_url` | text | Designer's input photo (alimenta AI sketch generator) |
| `render_url` | text | Single colorized sketch (LEGACY) |
| `render_urls` | jsonb | Multiple renders e.g. `{ '3d': url }` |
| `material_zones` | jsonb | Materials per zone (free-text inputs) |
| `validated_steps` | jsonb | Per-step workflow audit |
| `proto_iterations` | jsonb | Array of `{id, images[], notes, status, created_at}` |
| `production_sample_url` | text | Final production sample photo |
| `production_approved` | boolean | Approval flag |
| `production_data` | jsonb | Factory + financial + validation status |
| `sourcing_data` | jsonb | Factory, origin, contact, notes |
| `size_run` | jsonb | Size distribution per category |

### `tech_pack_data` — separate row per SKU ([TechPackSheet.tsx:47-64](src/components/tech-pack/TechPackSheet.tsx#L47-L64))

```
header: jsonb           // style metadata
drawings: jsonb         // { viewA, viewB, callouts[] }
measurements: jsonb     // { rows: [{point, xs, s, m, l, xl}], notes }
bom: jsonb              // { lines: [{type, material, qty, unit, supplier, cost}] }
grading: jsonb          // (empty in practice)
factory_notes: jsonb    // { body }
materials: jsonb        // { zones: [{name, pantone, supplier, swatchUrl, notes}] }
```

### `tech_pack_comments` — pin-anchored + block-anchored comments

```
block: text             // header / drawings / measurements / bom / grading / factory / general / materials
body: text
author_id, author_name
drawing_slot: text      // viewA | viewB
pin_x, pin_y: numeric   // normalized 0-1 coords
```

### `sku_colorways` — multiple colorways per SKU

```
name, hex_primary, hex_secondary, hex_accent
pantone_primary, pantone_secondary    -- text fields, no library link
material_swatch_url                   -- single swatch image
zones: jsonb                          -- per-zone hex assignments
status, position
```

### `collection_assets` — uploaded files (sketches, renders, photos, etc.)

```
phase, asset_type, name, description, url, thumbnail_url
file_size, metadata: jsonb
version: integer       -- ✅ VERSION TRACKING EXISTS at asset level
status, uploaded_by, deleted_at  -- ✅ soft-delete + audit
```

### `production_orders` — formal PO records

```
order_number, factory_name, factory_contact, status
order_date, estimated_delivery, actual_delivery
total_units, total_cost, currency, shipping_method, tracking_number
line_items: jsonb
qc_issues: jsonb       -- ✅ QC ISSUES tracking exists
quality_notes
documents: jsonb
```

### `suppliers`

```
name, supplier_type, region, moq, lead_time_days, cost_note
certifications: ARRAY  -- ✅ CERTIFICATIONS field ready (e.g. OEKO-TEX, GOTS)
contact_*, website, notes
```

### `factories`

```
name, region, specialties: ARRAY
moq, lead_time_days, cost_note, past_collabs
contact_*, website, notes
```

---

## 3. Feature inventory — answers to A-R questions

### A. Sketch upload by designer — ✅ EXISTS

- [SketchPhase.tsx:443-446](src/components/planner/sku-phases/SketchPhase.tsx#L443-L446) (CALZADO side), [490-498](src/components/planner/sku-phases/SketchPhase.tsx#L490-L498) (ROPA single)
- Uses `<ImageUploadArea>` from [shared.tsx:7-52](src/components/planner/sku-phases/shared.tsx#L7-L52)
- Accepts any `image/*`, posts to storage upload endpoint
- Hover-overlay "Replace" on existing sketch ([SketchPhase.tsx:434-440](src/components/planner/sku-phases/SketchPhase.tsx#L434-L440))
- Stored in `collection_skus.sketch_url` (text, public URL)

### B. Multi-view drawings — ⚠️ PARTIAL (2 views max)

- CALZADO: 2 views (Side Profile + Top Down) → `sketch_url` + `sketch_top_url`
- ROPA/ACCESORIOS: 1 view → `sketch_url`
- Tech Pack drawings: 2 slots `viewA` + `viewB` (Front/Back for ROPA, Side/Top for CALZADO) — can override the SKU sketches
- ❌ Missing: 3/4 view, interior, exploded, detail-zoom, multi-zoom callouts beyond simple Callout array

### C. Version control — ❌ MOSTLY MISSING

- Version chip displayed in tech pack header but hardcoded "v1.0" ([TechPackSheet.tsx:469-471](src/components/tech-pack/TechPackSheet.tsx#L469-L471))
- `collection_assets.version` (integer) field exists at asset level ✅ but no UI to view history or compare versions
- ❌ No revision history for tech packs (each PATCH overwrites)
- ❌ No diff view, no rollback, no "see what changed since last approval"
- Best aimily has: `validated_steps` jsonb keeps a flat record of step confirmations

### D. Annotations / pin comments — ✅ EXISTS in tech pack only

- Tech pack: `tech_pack_comments` table with `block` + `drawing_slot` + `pin_x`/`pin_y` normalized
- Pin mode UI ([TechPackSheet.tsx:509](src/components/tech-pack/TechPackSheet.tsx#L509)) — click drawing → drop pin → write comment
- Inline edit + delete + Cmd+Enter to send
- ❌ Sketches BEFORE tech pack don't have pins
- ❌ Colorways don't have pins (only proto iterations have notes)

### E. Pattern / block / sloper library — ❌ DOESN'T EXIST

- No `patterns` or `blocks` table
- No UI for digital pattern files (.dxf, .pat, etc.)
- No integration with CLO3D / Browzwear / Optitex / Lectra Modaris

### F. Print / graphic / artwork library — ❌ DOESN'T EXIST

- No artwork repository
- No AOP (all-over print) management
- No scaling / placement rules
- Designers would have to upload artwork as a sketch or callout

### G. Embroidery library — ❌ DOESN'T EXIST

- No embroidery files (.dst, .emb)
- No thread color library (Madeira, Robison-Anton)
- No integration with Tajima / Wilcom

### H. Pantone library — ⚠️ PARTIAL (text fields only, no library)

- `sku_colorways.pantone_primary` + `pantone_secondary` — TEXT fields ([sku_colorways DB schema])
- `tech_pack_data.materials.zones[].pantone` — TEXT field ([TechPackSheet.tsx:44](src/components/tech-pack/TechPackSheet.tsx#L44))
- Designer types "PMS 18-1764 TCX" manually — no preview, no search, no validation
- Sanzo Wada palette IS integrated in colorways UI ([SketchPhase.tsx:102](src/components/planner/sku-phases/SketchPhase.tsx#L102)) — but that's historical color references, not Pantone TCX/TPX
- ❌ Missing: full Pantone TCX/TPX library with hex preview, name search, family browser
- ❌ Missing: NCS, RAL, HKS color systems
- ❌ Missing: hex → Pantone conversion (closest match)

### I. Sample tracking — ⚠️ PARTIAL (proto only, no fit/SMS/bulk distinction)

- `proto_iterations` jsonb ([PrototypingPhase.tsx:31](src/components/planner/sku-phases/PrototypingPhase.tsx#L31)) — list of iterations with images, notes, status (pending/issues/approved/rejected), date
- ❌ No formal sample-type taxonomy: PROTO, FIT SAMPLE, SMS (Sales Sample), TOP (Top of Production), BULK
- ❌ No sample-status timeline view
- ❌ No sample shipping tracking, ETA, factory submission date
- Production phase has separate validation flow (color_status + fit_status) but it's about validating the FINAL production sample, not tracking through the chain

### J. Vendor / factory portal — ❌ DOESN'T EXIST

- `suppliers` and `factories` tables exist with all the contact metadata
- Internal pages exist: `/collection/[id]/factories`, `/collection/[id]/suppliers`
- ❌ No vendor self-service portal: factories cannot log in to read tech packs they're producing
- ❌ No vendor sample submission flow
- ❌ No vendor read-only view of BOM / measurements / colorways

### K. BOM — ✅ EXISTS, ⚠️ no costing engine

- `tech_pack_data.bom.lines: [{type, material, qty, unit, supplier, cost}]` ([TechPackSheet.tsx:43](src/components/tech-pack/TechPackSheet.tsx#L43))
- Default 3 lines: Upper, Lining, Sole ([TechPackSheet.tsx:89-93](src/components/tech-pack/TechPackSheet.tsx#L89-L93))
- AI generate: `/api/ai/tech-pack/generate?scope=bom` — Claude Haiku produces realistic line items grounded on COGS target
- Editable inline, can add/remove rows
- ❌ `qty` and `cost` fields exist but the `sku.cost` (manual COGS) is NOT auto-calculated from BOM lines × cost — they're decoupled
- ❌ No "landed cost" engine (material + labor + overhead + freight + duties)

### L. Hardware library — ❌ DOESN'T EXIST

- Hardware appears as a zone (Body / Hardware / Lining / Strap) in product-zones for ACCESORIOS
- ❌ But no library of buttons / zippers / snaps / hooks / D-rings with images, specs, sizes, finishes
- A designer who specifies "YKK Vislon 5" has to type it as free text

### M. Construction details — ⚠️ FREE-FORM ONLY

- `tech_pack_data.factory_notes` (jsonb) — single textarea
- ❌ No structured fields for: stitching type, SPI (stitches per inch), seam allowance, seam type, pressing temperature, finishing details, edge treatment, lining attachment
- These would all be written as prose in factory_notes today

### N. Measurements & grading — ✅ EXISTS, partial

- `tech_pack_data.measurements.rows: [{point, xs, s, m, l, xl}]` ([TechPackSheet.tsx:42](src/components/tech-pack/TechPackSheet.tsx#L42))
- 5-size grid (XS/S/M/L/XL) — XXS, XXL, 3XL, even-numbered footwear NOT in the table
- AI generate: `/api/ai/tech-pack/generate?scope=measurements` — produces 5-8 POMs with grading + tolerance note
- Manual override after AI gen
- ❌ No tolerance column (currently in note text only)
- ❌ No formal grading rules (incremental math: "+1cm waist per size")
- ❌ Size run distribution lives separately in `collection_skus.size_run` jsonb (production phase)

### O. Costing — ❌ NO BOM-DRIVEN ENGINE

- `sku.cost` (numeric) — manual COGS field, never recalculated
- BOM has per-line cost field but never rolls up into sku.cost
- ❌ No landed cost calculator (material + cut/sew + overhead + freight + duties)
- ❌ No multi-currency support beyond `production_orders.currency`

### P. 3D rendering — ⚠️ STATIC IMAGE ONLY

- `/api/ai/colorize-sketch` with `is_3d_render=true` → photorealistic still image (gpt-image-1.5 high quality + input_fidelity high, ~$0.133)
- Stored in `render_urls['3d']`
- ❌ No interactive 3D model
- ❌ No CLO3D / Browzwear / Optitex integration
- ❌ No 3D pattern / mesh import-export
- ❌ No virtual fit on 3D avatar

### Q. Approvals / sign-offs — ⚠️ PARTIAL, no workflow

- `production_approved` boolean exists
- `production_data.confirmed_steps` array tracks per-step confirmations
- 5-item validation checklist before final approval ([ProductionPhase.tsx:362-376](src/components/planner/sku-phases/ProductionPhase.tsx#L362-L376))
- ❌ No multi-stage approval (designer → senior → manager → director)
- ❌ No e-signature
- ❌ No approval delegation, no role-based gates
- ❌ No formal sign-off audit trail (who approved when)

### R. Phase workspaces — ✅ documented in section 1

---

## 4. AI endpoints touching D&D

| Endpoint | Purpose | Engine |
|---|---|---|
| `/api/ai/generate-sketch-options` | Reference photo → flat sketch (single for ROPA, side+top for CALZADO) | gpt-image-1 (1024×1024) |
| `/api/ai/colorize-sketch` | B&W sketch → colorized OR 3D render | gpt-image-1.5 (input_fidelity=high) |
| `/api/ai/zones/detect` | Sketch + product info → semantic zone list (identity/structural/accent/neutral/hardware) | Claude (JSON mode) |
| `/api/ai/design-generate` | Multi-purpose endpoint for various design AI tasks (sourcing-suggest etc.) | Claude |
| `/api/ai/tech-pack/generate` | Generate measurements / BOM / both | Claude Haiku |
| `/api/ai/vectorize` | DEPRECATED — vectorization is now client-side via imagetracerjs | (stub) |
| `/api/ai/freepik/still-life` | Product alone editorial photo | Freepik Nano Banana |
| `/api/ai/freepik/editorial` | On-model editorial photo | Freepik Nano Banana / GPT Image 1.5 |
| `/api/ai/freepik/tryon` | Brand-model catalog photo | Freepik Nano Banana |

All endpoints load CIS context via `loadFullContext()` server-side.

---

## 5. Strengths I observed (things aimily already does well or exceeds PLM)

1. **AI sketch from reference** — drop a fashion photo, get a tech-pack-ready flat sketch with IP protection clauses (no Nike swoosh, etc.). Centric/FlexPLM don't have this natively.
2. **Multi-engine AI stack** — gpt-image-1 for sketch generation, gpt-image-1.5 (input_fidelity high) for colorization+3D render, Claude Haiku for measurements+BOM, Freepik Nano Banana for editorial. Each chosen for its strength.
3. **Semantic zone detection** — `/api/ai/zones/detect` returns zones with semantic role (identity / structural / accent / neutral / hardware), not just zone names. Useful for color-management AI.
4. **Sanzo Wada palette integration** — historical color reference baked into colorways UI.
5. **EvolutionStrip auto-derived state** — visual progress driven entirely by SKU data (no separate state machine to keep in sync).
6. **Pin comments on technical drawings** — Hatch-style annotation with normalized coords + block-anchored comments. Already on parity with Centric.
7. **AI sourcing recommendations** — given product specs + COGS target, suggests factory type, regions with MOQ/lead time/COGS range, trade shows, sourcing tips.
8. **Side-by-side compare** — sketch vs proto iteration in PrototypingPhase.
9. **Phase advance with validation warnings + revert** — data integrity in workflow transitions.
10. **Per-SKU undo with destructive confirmation** — clean rollback.
11. **PDF export of tech pack** + Excel PO export — factory-ready output.
12. **Auto-save with optimistic updates** — UX is fluid, no manual save buttons.

---

## 6. Gaps observed — by severity

### BLOCKING (without these aimily isn't a real PLM)

| Gap | Why blocking | Where it goes |
|---|---|---|
| **Materials & Trims library curated** (deterministic, by category × subtype × zone × tier × aesthetic, with certifications and supplier links) | Free-text material input is a non-starter for any serious brand. Every PLM has this. | Block 3.3 Color & Materials |
| **BOM-driven landed cost engine** (material qty × material cost + labor + overhead + freight + duties → auto-recalc `sku.cost`) | Decoupled BOM and COGS = financial planning is fiction | Block 2.3 Budget + Block 3.5 Tech Pack |
| **Pantone TCX/TPX library** with hex preview, name search, browse families, hex → closest-Pantone | Free-text Pantone is unprofessional; designers expect a picker | Block 3.3 |
| **Hardware library** (buttons/zippers/snaps/hooks/D-rings with images, specs, finishes, suppliers) | Designers can't fully spec a tech pack without it | Block 3.3 (related to materials) |
| **Sample tracking workflow** with formal sample types: PROTO → FIT → SMS → TOP → BULK with status, ship dates, factory dates, ETAs | Current proto_iterations is just photo+notes. Real PLM has a full chain | Block 3.4 Prototyping (extend) |

### IMPORTANT (parity with PLM mid-market)

| Gap | Notes |
|---|---|
| **Tech pack version control with diff** | Designers need history: "what changed since approved v2.1?" |
| **Multi-stage approval workflow + e-signature** | Designer → senior → manager → director chain with audit trail |
| **Construction details structured** | Stitching type, SPI, seam allowance, finishing — not free text |
| **Grading rules formal** | Incremental math (waist +1cm per size), not just static columns |
| **Compliance / Certificate management** | OEKO-TEX, GOTS, BCI renewals/expirations linked to materials |
| **Vendor self-service portal** (read-only access to tech packs for factories) | Factories should not be on email; they should log in and see their tech packs |
| **Pattern / Block / Sloper library** | Digital pattern files with grading — the operational backbone of repeat patternmaking |

### NICE-TO-HAVE (full enterprise PLM)

| Gap | Notes |
|---|---|
| **Print / Graphic / Artwork library** | AOP management, scaling rules, placement libraries |
| **Embroidery library** | DST file management, thread color library (Madeira, Robison-Anton) |
| **Multi-view drawings beyond 2** | 3/4 view, interior, exploded, detail-zoom |
| **3D virtual sampling integration** (CLO3D, Browzwear, Optitex) | The new frontier. Centric and FlexPLM have it; aimily doesn't |
| **QC / inspection workflow** | Defect tracking, AQL sampling, reject rates by factory |
| **Sustainability scoring** (Higg MSI rolled up to SKU and collection) | ESG reports for marketing and compliance |
| **RSL / chemical compliance check** (REACH SVHC list) | Auto-flag if material contains restricted substances |

---

## 7. Stats summary

| Status | Count |
|---|---|
| ✅ Exists (well-built) | ~30 features |
| ⚠️ Partial / shallow | ~12 features |
| ❌ Missing | ~22 features |

---

## 8. Top 5 critical gaps for the PLM-parity master plan

1. **Materials & Trims library curated** — deterministic, by category × subtype × zone × tier × aesthetic, with certifications + supplier links + Pantone reference. Foundation of everything else.
2. **BOM-driven landed cost engine** — material qty × cost + labor + overhead + freight + duties → auto-recalc COGS.
3. **Pantone TCX/TPX library** with hex preview + search + family browser.
4. **Sample tracking workflow** with formal types (PROTO/FIT/SMS/TOP/BULK), status chain, factory submission dates, ETAs.
5. **Tech pack version control + diff** — every PATCH should write a revision; designer can compare and rollback.

These five unblock parity with Centric/FlexPLM at mid-market level. The rest can come in P2/P3.
