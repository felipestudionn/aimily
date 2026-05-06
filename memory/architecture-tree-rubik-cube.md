---
name: aimily Architecture Tree — The Rubik's Cube (LIVING DOC)
description: Canonical tree of every Block → Mini-block → Micro-block, unified across Work / Calendar / Presentation modes. Update immediately when anything changes. This is the single source of truth Felipe uses to reason about the app.
type: project
originSessionId: 7899b878-b2e3-48ac-ae79-33a0cba1aa39
---
# aimily Architecture — The Rubik's Cube

## 🎲 The Vision (Felipe's mental model)

**The sidebar NEVER changes visually. Only the right-hand content area adapts.**

The app is **one spine**: `4 Blocks × 5 Mini-blocks = 20 slots`, always in the same order, same styles, same position. The sidebar `WizardSidebar` is **static across all 3 modes** — it doesn't morph, unfold, or transform. What changes is only what gets rendered in the right-hand body.

The design goal: the right-hand area must look like **a continuation of the sidebar**, not a separate canvas. Pixel-aligned rows. Same typography system. Same spacing.

| Mode | Entry | Sidebar (left) | Right-hand body |
|---|---|---|---|
| **Work mode** | `/collection/{id}` or `/{id}/{route}` | Static 4×5 spine | Workspace (input · output · work-zone) or sub-dashboard of 5 mini-block cards |
| **Calendar mode** | `/collection/{id}/calendar` | Static 4×5 spine | The **same 20 rows horizontally extended** as timeline tracks. Pixel-perfect vertical alignment with sidebar rows. Each mini-block row = one time-track with milestone bars. Feels like the sidebar continues rightward. |
| **Presentation mode** | `/collection/{id}/presentation` | Static 4×5 spine — used as chapter index | Slide canvas. Click a **block** (01, 02, 03, 04) → that block's **cover slide**. Click a **mini-block** (1.1, 1.2…) → that mini-block's slide deck (slide count varies with number of micro-blocks it has). Empty / no-input slides = grey placeholder. |

**Design system for ALL 3 modes**: the current gold standard locked in `design-components-canonical.md`:
- `bg-white rounded-[20px]`, title `text-[24-28px] font-semibold tracking-[-0.03em]`, body `text-[14px] text-carbon/50 leading-[1.7]`
- Ghost numbers `text-[72px] font-bold text-carbon/[0.05]`
- CTA `rounded-full bg-carbon text-white`
- Workspace bg `#F3F2F0` (`bg-shade`), sidebar bg `#EBEAE6`
- All rounded, zero square corners

**Accent palette** (declared 2026-04-15, see `design-accent-palette.md`): Sea Foam (#B6C8C7) · Linen (#F1EFED) · Moss (#808368) · Citronella (#FFF4CE) · Midnight (#001519). Phase mapping: Creative → Sea Foam · Merchandising → Moss · Design → Midnight · Marketing → Citronella. Use for color-coding across Calendar rows, Presentation covers, chart accents.

**Non-negotiable rules**:
1. The 20 slots are the same in all 3 modes. Same order, same labels, same IDs.
2. The PIL-segmented switch (Blocks / Calendar / Presentation) at the top of the Overview is the mode-switcher. The sidebar stays identical.
3. Adding a new mini-block means updating: Sidebar + CollectionOverview + Calendar rows + Presentation chapters. **All four must stay 1:1 aligned.** If only one changes, the cube is broken.
4. Removing a mini-block is forbidden without updating all 4 surfaces simultaneously.
5. Row IDs are stable: they are the canonical keys used across CIS (`collection_decisions`), progress tracking (`SUB_TO_PHASE`), and timeline milestones (`cr-*`, `br-*`, `rp-*`, `dd-*`, `gm-*`).
6. Sidebar row vertical height must match Calendar row vertical height pixel-perfect. The alignment IS the UX — break it and the "extension" metaphor breaks.

## 🌳 The Tree — 4 × 5 = 20 slots

> **Legend**: ● = micro-mode (Free / Assisted / AI Proposal) · 🧩 = micro-block (inner tab/hub) · 🛠️ = per-SKU workspace · 📤 = output/consolidation step · 🆕 = added/moved in 2026-04-15 refactor

---

### BLOCK 1 · Creative Direction & Brand
- **Sidebar label**: `Creative Direction`
- **Route**: `creative`
- **Wizard phases**: `product`, `brand`
- **Page file**: `src/app/collection/[id]/creative/page.tsx`
- **CIS domain**: `creative`
- **Milestone ids**: `cr-1`, `cr-2`, `br-1`, `br-2`, `br-3`, `br-4`

| # | Mini-block | Sidebar label | Route | Component / container | Micro-structure | CIS key | AI endpoint |
|---|---|---|---|---|---|---|---|
| 1.1 | Consumer | `consumer` | `creative?block=consumer` | `ConsumerContent` | ● Free · ● Assisted · ● AI Proposal | `creative.consumer` | `/api/ai/creative-generate` |
| 1.2 | Moodboard | `moodboard` | `creative?block=moodboard` | `MoodboardContent` | Upload + Pinterest ingest | `creative.moodboard` | (image analysis) |
| 1.3 | Market Research 🆕 | `marketResearch` | `creative?block=research` | `ResearchBlockContent` (hub-of-cards) | 🧩 Global Trends · 🧩 Deep Dive · 🧩 Live Signals · 🧩 Competitors (each with ● Free/Assisted/AI) | `creative.{global-trends, deep-dive, live-signals, competitors}` | `/api/ai/creative-generate` |
| 1.4 | Brand Identity | `brandIdentity` | `creative?block=brand-dna` | `BrandBoardCanvas` (bento board) | Logo · Palette · Voice · Typography · Visual Identity · Mockups · Applications | `creative.brand-dna` | `/api/ai/creative-generate` |
| 1.5 | Creative Overview 📤 | `creativeOverview` | `creative?block=synthesis` | `CreativeSynthesisView` | Consolidates 1.1–1.4 into the creative brief | (reads only) | — |

**Note**: a micro-block `vibe` (`creative?block=vibe`) still exists in the code (`VibeContent`) but is NOT in the sidebar — it was planned to fuse into Moodboard; kept reachable by URL for now (Felipe's call 2026-04-15).

---

### BLOCK 2 · Merchandising & Planning
- **Sidebar label**: `Merchandising and Planning`
- **Route**: `merchandising`
- **Wizard phase**: `merchandising`
- **Page file**: `src/app/collection/[id]/merchandising/page.tsx`
- **CIS domain**: `merchandising`
- **Milestone ids**: `rp-1` through `rp-6`

| # | Mini-block | Sidebar label | Route | Component / container | Micro-structure | CIS key | AI endpoint |
|---|---|---|---|---|---|---|---|
| 2.1 | Buying Strategy 🆕 | `buyingStrategy` | `merchandising?block=scenarios` | `ScenariosContent` (2 AnchorCards + 3 ScenarioCards A/B/C) | ● Free · ● Assisted · ● AI Proposal | `merchandising.range_plan.scenario_selected` | `/api/ai/merch-generate` |
| 2.2 | Assortment & Pricing | `assortmentPricing` | `merchandising?block=families` | `FamiliesContent` + `PricingContent` (merged view, Family Card grid) | ● Free · ● Assisted · ● AI Proposal | `merchandising.families` + `merchandising.pricing` | `/api/ai/merch-generate` |
| 2.3 | Distribution | `distribution` | `merchandising?block=channels` | `ChannelsContent` | ● Free · ● Assisted · ● AI Proposal (DTC/Wholesale × Digital/Physical × Markets) | `merchandising.channels` | `/api/ai/merch-generate` |
| 2.3b | Wholesale Orders 🆕 (2026-05-06) | `wholesale` | `merchandising?block=wholesale` | `WholesaleOrdersCard` (B2B order CRUD: buyer, lines, status pills) | — (CRUD only) | (reads `wholesale_orders` table) | — |
| 2.4 | Financial Plan | `financialPlan` | `merchandising?block=budget` | `BudgetContent` | ● Free · ● Assisted · ● AI Proposal (salesTarget, margin, discount, typeSegmentation) | `merchandising.budget` | `/api/ai/merch-generate` |
| 2.5 | Collection Builder 📤 | `collectionBuilder` | `product` (hops to Block 3) | `PlannerDashboard` → `CollectionBuilder` | Output of 2.1–2.4. Materializes SKU grid. | (reads CIS + writes `collection_skus`) | `/api/generate-skus` |

---

### BLOCK 3 · Design & Development
- **Sidebar label**: `Design and Development`
- **Route**: `product`
- **Wizard phases**: `design`, `prototyping`, `sampling`, `production`
- **Page file**: `src/app/collection/[id]/product/page.tsx`
- **CIS domain**: `design`
- **Milestone ids**: `dd-1` through `dd-18`

**2026-04-17 redesign**: every sub-block now has its own dedicated workspace (hub-of-cards) following the Tech Pack pattern. No more monolithic `PlannerDashboard` behind phase filters — `product/page.tsx` dispatches per-phase to the matching workspace, keeping `PlannerDashboard` only as the fallback for the default `/product` (no phase) route. Each workspace still opens the per-SKU `SkuDetailView` modal on click for deep editing via the 6-step `EvolutionStrip`: Concept → Sketch → Color & Materials → 3D Render → Prototype → Production.

| # | Mini-block | Sidebar label | Route | Component / container | Micro-structure | CIS key | AI endpoint |
|---|---|---|---|---|---|---|---|
| 3.1 | Sketch & Color 🆕 | `sketchColor` | `product?phase=sketch` | `SketchColorWorkspace` (dedicated hub, opens `SkuDetailView.SketchPhase` modal) | 🧩 Sketch thumb + top view · 🧩 Colorway dots (from `useColorways`) · 🧩 Material zones · readiness states empty/sketching/coloring/ready | `design.sketch` (per SKU) | `/api/ai/design-generate`, `/api/ai/render`, `/api/ai/colorize-sketch` |
| 3.2 | Tech Pack | `techPack` | `product?phase=techpack` | `TechPackWorkspace` (hub-of-cards) | 🧩 Specs & Measurements · 🧩 BOM · 🧩 Materials/Suppliers · 🧩 Factories | `design.tech_pack` (per SKU, via `tech_packs` table) | `/api/generate-techpack` |
| 3.3 | Prototyping 🆕 | `prototyping` | `product?phase=prototyping` | `PrototypingWorkspace` (dedicated hub, opens `SkuDetailView.PrototypingPhase` modal) | 🧩 Latest iteration photo · 🧩 Status pill (pending/issues/approved/rejected/noproto) · 🧩 Iteration count · 🧩 Red-flag chip when >21d (footwear) / >14d (apparel) in pending · 🧩 Factory from `sourcing_data` · kanban filter pills | `design.prototyping` | — |
| 3.4 | Production 🆕 | `production` | `product?phase=production` | `ProductionWorkspace` (dedicated hub, opens `SkuDetailView.ProductionPhase` modal) | 🧩 Derived PO status (draft → sent → in-production → shipped → approved) from `production_data` · 🧩 Factory + region · 🧩 Qty · 🧩 Unit cost vs target (red flag on overrun with delta) · 🧩 ETA vs `target_delivery_date` (amber <14d, red overdue) · inline Approve CTA · summary strip with open POs / total PO value / cost overruns / ETA slips | `design.production` | — |
| 3.5 | Final Selection 🆕 📤 | `finalSelection` | `product?phase=selection` | `FinalSelectionWorkspace` + `MerchBalanceSidebar` | 🧩 Approve/Reject on card writes `production_approved` · 🧩 Live merch balance: family mix (actual vs target %), tier split (REVENUE/IMAGEN/ENTRY), drop split · 🧩 `Lock the collection` CTA bumps approved SKUs to `design_phase=completed` and records CIS `merchandising.final_selection.locked_at` | `merchandising.final_selection` | — (CIS write on lock) |

---

### BLOCK 4 · Marketing & Sales
- **Sidebar label**: `Marketing and Sales`
- **Route**: `marketing/creation`
- **Wizard phases**: `marketing-creation`, `marketing-distribution`
- **Page file**: `src/app/collection/[id]/marketing/creation/page.tsx` → `MarketingCreationScreen`
- **CIS domain**: `marketing`
- **Milestone ids**: `gm-1` through `gm-15`

| # | Mini-block | Sidebar label | Route | Component / container | Micro-structure | CIS key | AI endpoint |
|---|---|---|---|---|---|---|---|
| 4.1 | GTM & Launch Plan 🆕 | `gtmLaunchPlan` | `marketing/creation?block=gtm` | `GtmLaunchHub` (4-card hub) | 🧩 Go-to-Market · 🧩 Launch · 🧩 Content Calendar · 🧩 Paid Growth | `marketing.gtm`, `.launch`, `.calendar`, `.paid` | `/api/ai/gtm`, `/api/ai/launch`, `/api/ai/content-calendar`, `/api/ai/paid` |
| 4.2 | Content Studio | `contentStudio` | `marketing/creation?block=content` | `ContentStudioCard` | 🛠️ Per-SKU 4-level visual pipeline: E-commerce → Still Life → Editorial → Campaign · ModelRosterPicker (28 aimily models) | `marketing.visuals` (per SKU) | `/api/ai/freepik/{still-life, editorial, tryon}`, Kling 2.1 |
| 4.3 | Communications | `communications` | `marketing/creation?block=comms` | `CommunicationsCard` (wraps `ContentStrategyCard`) | Copy · Social templates · Email sequences · Brand voice · SEO | `marketing.comms` | `/api/ai/content-strategy/generate`, `/api/ai/copy` |
| 4.4 | Sales Dashboard | `salesDashboard` | `marketing/creation?block=sales` | `SalesDashboardCard` | 8 real-time KPIs · Recharts revenue curve · Stories overview · Drop calendar · Post-launch performance tab | (reads `collection_skus`, `drops`, `stories`) | `/api/ai/post-launch`, `/api/ai/market-prediction` |
| 4.5 | Ecom 📤 (renamed 2026-05-06) | `ecom` | `marketing/creation?block=ecom` | `EcomCard` (3 sub-sections, all DTC-pure) | 🧩 `EcomHub` — publish flow (subdomain · 12 themes picker · payment connect Stripe/Shopify) · 🧩 `SeoResearchHub` — 4 tabs (keywords/onpage/competitors/audit) · 🧩 `OverridesEditor` — inline copy edits per page | (writes `storefronts`, `storefront_overrides`, `storefront_publishes`) | `/api/ecom/publish`, `/api/ecom/override`, `/api/ai/seo-{keywords,onpage,competitors,audit,copy}` |

---

## 🔗 How the 4 surfaces stay aligned

| Surface | File | What it holds |
|---|---|---|
| **Sidebar (Work mode spine)** | `src/components/wizard/WizardSidebar.tsx` → `SIDEBAR_BLOCKS` | 4 blocks × 5 sub-items. Source of truth for the spine. |
| **Overview (Sub-dashboard)** | `src/app/collection/[id]/CollectionOverview.tsx` → `BLOCK_DEFS` | Same 20 slots rendered as cards. Must mirror sidebar 1:1. |
| **Calendar** | `src/app/collection/[id]/calendar/...` + `src/lib/timeline-template.ts` | Same 20 rows, with milestone bars on each. `SUB_TO_PHASE` in CollectionOverview maps sub-block IDs → milestone IDs. |
| **Presentation** | `src/app/collection/[id]/presentation/page.tsx` | Same 20 chapters/pages. Empty ones render grey placeholder. |

**Naming convention** (kept identical across all 4):

| Slot | Stable ID | Sidebar label (EN) | Overview label | Milestone prefix |
|---|---|---|---|---|
| 1.1 | `consumer` | Consumer | Consumer Definition | `cr-1` |
| 1.2 | `moodboard` | Moodboard | Moodboard | `cr-2` |
| 1.3 | `research` | Market Research | Market Research | `cr-2` |
| 1.4 | `brand-identity` | Brand Identity | Brand Identity | `br-1` to `br-4` |
| 1.5 | `creative-overview` 📤 | Creative Overview | Creative Overview | — |
| 2.1 | `scenarios` | Buying Strategy | Buying Strategy | `rp-1` |
| 2.2 | `families-pricing` | Assortment & Pricing | Assortment & Pricing | `rp-3`, `rp-4` |
| 2.3 | `channels` | Distribution | Distribution | `rp-2` |
| 2.4 | `budget` | Financial Plan | Financial Plan | `rp-3` |
| 2.5 | `builder-merch` 📤 | Collection Builder | Collection Builder | `rp-5`, `rp-6` |
| 3.1 | `sketch` | Sketch & Color | Sketch & Color | `dd-1` to `dd-6` |
| 3.2 | `tech-pack` | Tech Pack | Tech Pack | `dd-10` |
| 3.3 | `prototyping` | Prototyping | Prototyping | `dd-7` to `dd-10` |
| 3.4 | `production` | Production | Production | `dd-15` to `dd-18` |
| 3.5 | `final-selection` 📤 | Final Selection | Final Selection | `dd-11` to `dd-14` |
| 4.1 | `gtm-launch` | GTM & Launch Plan | GTM & Launch Plan | `gm-1`, `gm-2`, `gm-6-8` |
| 4.2 | `content-studio` | Content Studio | Content Studio | `gm-3`, `gm-4` |
| 4.3 | `communications` | Communications | Communications | `gm-5` |
| 4.4 | `sales` | Sales Dashboard | Sales Dashboard | `gm-10`, `gm-11` |
| 4.5 | `ecom` 📤 (renamed 2026-05-06) | Ecom | Ecom | `gm-1`, `gm-2` |

---

## 🔀 Mode switching semantics

The PIL switch in Overview currently lives in `CollectionOverview.tsx`:
```tsx
<SegmentedPill options={[{id: 'blocks'}, {id: 'calendar'}, {id: 'presentation'}]} />
```

**Current behavior** (2026-04-15):
- `blocks` → renders the 4 block cards + (on drill) 5 sub-block cards. PIL switch (Blocks/Calendar/Presentation) was REMOVED from Overview (commit `96e2e02`) — mode switching happens via sidebar utility links only. Collection-name and block-name big titles also removed (sidebar shows them).
- `calendar` → Rubik **pass 4 SHIPPED** (`b100b59`): CalendarSpine merged INTO WizardSidebar — there is now ONE component for both nav and calendar modes. URL-driven: `usePathname()` returns `'calendar'` when path ends with `/calendar`, else `'nav'`. Calendar branch renders via Portal to document.body (escapes WorkspaceShell's ViewPort stacking context) as full-viewport. Each row iterates `SIDEBAR_BLOCKS.subItems` and renders `<div class="flex">` with label (sticky left 340) + track (bars from `MILESTONE_TO_MINI_BLOCK[sub.id]`). Labels use the same `labelOf(sub.labelKey)`, `getSubItemState()`, SKU badges, active/locked/completed styles. Utility bar links highlight the active mode (nav/calendar/presentation). /calendar page.tsx returns null — sidebar owns the render. All calendar interactivity (drag/resize/status cycle/modal edit/delete/HOY+LAUNCH/auto-save/export) preserved. CalendarSpine.tsx deleted.
- `presentation` → **SHIPPED end-to-end (2026-04-15)**. Click Presentation → same aside morphs to 100vw with 1.2s ease-out-expo, identical to calendar. LEFT: persistent spine (logo + switcher + Overview pill + 4 blocks × 5 sub-items with 1.1/1.2/… coords + gold-dot indicators). RIGHT: dark deck canvas with top-bar controls (X/aimily · Edit · Promote · Share · PDF · Style · 01/21), 16:9 letterboxed slide, bottom prev/next + 21-tick progress. See **[architecture-presentation.md](architecture-presentation.md)** for the full module reference.

---

## 🎬 Presentation mode — SHIPPED (2026-04-15)

Full reference: [architecture-presentation.md](architecture-presentation.md).

**21 slides** (Cover + 20 mini-blocks) × **10 themes** (Editorial Heritage / Streetwear Drop / Romantic Feminine / Minimal Architect / Performance Tech / Avant-Garde Concept / Sustainable Craft / Y2K Digital / Workwear Heritage / Resort Luxe — all wired, brand names stripped from UI).

**5 templates** dispatched by `slide.template`:
- **hero** (4 block closers) — Creative Overview, Collection Builder, Final Selection, Point of Sale
- **editorial-stat** (4 big-KPI slides) — Market Research, Distribution, Financial Plan, Sales Dashboard (editorial placeholders — CIS wiring pending)
- **narrative-portrait** (5 story slides) — Consumer, Brand Identity, Buying Strategy, Tech Pack, Communications (EDITABLE)
- **grid-tile** (4 multi-tile slides) — Moodboard, Assortment & Pricing, Sketch & Color, Content Studio (EDITABLE per tile)
- **timeline-strip** (3 roadmap slides) — Prototyping, Production, GTM & Launch Plan (EDITABLE lead + per-milestone)

**CIS auto-fill**: 16/21 slides render real SS27 data via `loadPresentationData()` (wraps `loadFullContext()` + reads timelines / SKUs / decisions / workspace_data / overrides). `SAMPLE` citronella chip shows when rendering placeholder content.

**Enterprise export**:
- PDF: `POST /api/presentation/export` → `puppeteer-core` + `@sparticuz/chromium-min` renders the internal `/presentation/export/[id]` route → 21-page A4 landscape with embedded Google Fonts.
- Share: `POST /api/presentation/share` → 32-byte token → public `/p/[token]` with read-only deck, view counter RPC. Middleware whitelists `/p/` and `/presentation/export/`.

**Inline editing**:
- `EditableText` wrapper handles click-to-edit with Esc/Cmd+Enter keybindings.
- Narrative → field_overrides = { lead, body, attribution }. Grid → dot-notation `tiles.N.label`. Timeline → `lead` + `milestones.N.label`.
- Save writes to `presentation_deck_overrides` (RLS owner-only). Revert deletes a field or whole row. Sidebar **gold dot** marks slides with saved overrides.

**Promote to Workspace** (escape hatch for non-destructive → destructive):
- 3 slides supported: consumer, brand-identity, communications. Map to `(creative, target, demographics)` / `(creative, identity, visual_direction)` / `(marketing, voice, tone)` — the same triples `buildPromptContext` reads.
- Click the citronella **Promote** pill → modal → `POST /api/presentation/promote` calls `recordDecision()` (imported from `@/lib/collection-intelligence`) → deletes deck override → AI prompts and Workspace now see the promoted text.

**New Supabase tables**: `presentation_shares`, `presentation_deck_overrides`, and `increment_share_views(p_token)` RPC.

**Architecture lock respected** — never modified `load-full-context.ts`, `prompt-foundations.ts`, `prompt-context.ts`, `collection-intelligence.ts`, or any `src/app/api/ai/*/route.ts`. Imported + called their exported functions; wrote to the Supabase tables they read from.

**Not shipped (known limits)**: EditorialStat CIS wiring (4 slides, pending collection data), Cover/Hero inline edit, Promote beyond the 3 narrative slides, share-link expiry/password UI, grid eyebrow/value + timeline date/status edit.

Implementation steps:
1. Add `mode === 'presentation'` branch in WizardSidebar (parallel to calendar branch).
2. Create `PresentationSlideCanvas` component (props: `miniBlockId`).
3. Create `presentation-slides/` with one component per mini-block (20 files).
4. Empty state placeholder.
5. Restore `/presentation` to `isCovered` in WorkspaceShell.

## 🗓️ Calendar interactivity plan (Piece 2, pending)

Make the calendar a navigation surface, not just a display:
- **Hover on bar**: existing tooltip + add "Open in workspace →" CTA.
- **Click on bar**: exit calendar (setMode('nav') + router.push to the workspace of the mini-block that bar belongs to). Same sequential choreography (aside contract → main fade-in on the workspace).
- **Click on sticky-left label**: same — open workspace for that mini-block.
- **Click on block-header tinted band**: exit calendar → navigate to that block's sub-dashboard.

Bars know their mini-block via `MILESTONE_TO_MINI_BLOCK[m.id]`. The mini-block's workspace route comes from `SIDEBAR_BLOCKS` lookup.

**Target behavior** (the Rubik's cube vision — sidebar is always static, only the right-hand body adapts):
- **blocks**: sidebar = nav. Body = sub-dashboard cards (at `/collection/{id}?block={phase}`) or a specific workspace (at `/{route}?block={sub}`).
- **calendar**: sidebar = nav (still clickable, still highlights active row). Body = the same 20 rows rendered **horizontally** as timeline tracks, pixel-aligned vertically with the sidebar rows so it reads as one continuous surface. Each mini-block row shows its milestone bars over the time axis. Hovering / clicking a sidebar row highlights the same row in the body and vice-versa.
- **presentation**: sidebar = nav, but in chapter-picker mode. Body = slide canvas.
  - Click a **block header** in the sidebar → shows that block's **cover slide** (portada).
  - Click a **mini-block** in the sidebar → shows that mini-block's slide deck. Slide count = number of micro-blocks it contains (e.g. Market Research = 4 slides: Global Trends, Deep Dive, Live Signals, Competitors · Consumer = 1 slide · Content Studio = N slides per SKU).
  - Empty / no-input slides = grey placeholder with "Nothing generated yet" state using the canonical design tokens.
- Motion: no sidebar morph — only the right-side body crossfades / transitions. Sidebar row positions are stable reference points used to anchor the visual continuation.

---

## 🛑 Prohibited — will break the cube

- Add a mini-block to the sidebar without adding it to CollectionOverview · Calendar · Presentation.
- Reorder one surface without reordering the other three.
- Introduce a 21st slot without Felipe's authorization.
- Fork a mini-block into multiple (e.g. "Content Studio Still Life" as a separate slot) — keep sub-structure as MICRO-blocks inside the same slot.
- Use a different stable ID across surfaces (sidebar uses `market-research`, overview uses `research` → must pick one).

---

## 📎 When this doc must be updated

**Any** of these changes = update this file IMMEDIATELY, same commit:
- Adding / removing / renaming a mini-block.
- Changing a route, query param, or component file for a mini-block.
- Adding / removing micro-blocks (inner tabs, modes).
- Connecting a new AI endpoint or CIS capture point to a mini-block.
- Retiring an output mini-block or converting a regular mini-block into an output.

Out-of-sync between code and this doc = bug. Fix the doc, not the code, if the code is correct — then propagate to the 4 surfaces.
