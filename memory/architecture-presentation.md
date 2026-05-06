---
name: Presentation Module Architecture
description: Complete reference for aimily's Presentation mode (the Rubik's cube's third face). 21 slides, 10 themes, CIS auto-fill, PDF export, public share, inline edit with deck overrides + promote-to-CIS. Read this before touching anything in src/components/presentation, src/lib/presentation, or src/app/presentation.
type: project
originSessionId: ba6ccf9c-993f-42d3-8691-65a3d0ab2a49
---
# Presentation Module — Architecture Reference

The third face of the Rubik's cube (Work / Calendar / Presentation). Built end-to-end over one session (2026-04-15). Ships 21 slides × 10 themes, CIS auto-fill, server-side PDF export, public share links, and inline editing with deck-level overrides + optional CIS write-back ("Promote to Workspace").

## Core mental model

- **Workspace** = where you BUILD the collection (CIS is source of truth).
- **Calendar** = where you PLAN the collection (timeline view of same spine).
- **Presentation** = where you PRESENT the collection. Slides are a **view** of the CIS data, with optional deck-level overrides for audience-specific polish.

All three modes share the same `<aside>` element that morphs width (380px ↔ 100vw) via CSS transition (1.2s ease-out-expo). They read from the same spine: **Overview + 4 blocks × 5 mini-blocks = 21 entries**.

## File map

### `src/lib/presentation/`
- **types.ts** — `ThemeId`, `TemplateId`, `Theme`, `MicroBlockSlide`, `DeckMeta`. ThemeId comments keep brand references for internal credit (Hermès, Supreme, etc.) — never rendered to UI.
- **themes.ts** — 10 brand-archetype token sets. `themeStyle(theme)` emits CSS variables (`--p-bg`, `--p-fg`, `--p-display-font`, `--p-display-case`, etc.). `caseToTextTransform()` maps the `displayCase` token to CSS `text-transform`. All 10 are `status: 'wired'`.
- **spine.ts** — the 20 mini-block slides in order. Mirrors `SIDEBAR_BLOCKS` from `WizardSidebar.tsx` 1:1 by position. When sidebar changes, update this in the same commit.
- **load-presentation-data.ts** — server-side data loader. Wraps `loadFullContext()` (🔒 locked) + reads `collection_timelines` (for launch_date + milestones) + reads `collection_skus` + reads `presentation_deck_overrides`. Returns `PresentationData` shape: `{ cover, narratives, stats, grids, timelines, overrides, hasAnyData }`.
  - `cleanMarkdown()` + `extractLeadBody()` — helpers that strip markdown and split CIS strings into lead + body sentences.
  - Override merge: narratives use flat keys (`lead`, `body`, `attribution`); grids/timelines use dot-notation (`tiles.N.label`, `milestones.N.label`).
- **export-token.ts** — HMAC-SHA256 signed JWT with `{ collectionId, userId, themeId, exp }`, 5-min TTL. Used by the export Function to authenticate headless Chrome against the internal `/presentation/export/[id]` route.
- **share-token.ts** — 32-byte URL-safe random token. Opaque; state lives in `presentation_shares`.

### `src/components/presentation/`
- **PresentationDeck.tsx** — main deck (client). Owns: index state, themeId (controlled), drafts map (during edit), share dropdown state, promote confirm state. Top bar: X/aimily wordmark · Edit/Done+Save · Promote · Share · PDF · Theme picker · Counter. Canvas (16:9 letterboxed). Bottom: prev/next + 21-tick progress (cover + 20 blocks grouped). Keyboard: ←/→/Space/Home/End/Esc. `readOnly` prop for shared decks (hides Edit/Share/ThemePicker, X → aimily link).
- **SharedDeck.tsx** — thin client wrapper for `/p/[token]`. Reuses PresentationDeck in `readOnly` mode with its own index state.
- **SlideRenderer.tsx** — dispatches to template by `slide.template`. Forwards `editing: EditingContext` to templates that support edit (narrative-portrait, grid-tile, timeline-strip).
- **EditableText.tsx** — click-to-edit wrapper. `editMode=false` = plain render; `editMode=on + !editing` = dashed hover affordance + Revert chip on overridden fields; `editMode=on + editing` = autosizing textarea with Esc/Cmd+Enter keybindings. Forwards `style` + `className` so templates keep theme-token control.
- **ThemePicker.tsx** — top-bar dropdown. Shows "STYLE" eyebrow + theme name + rotating ChevronDown. Panel lists all 10 themes with 3-color swatches (bg/fg/accent).
- **PresentationFonts.tsx** — single `<link>` loading 11 Google Fonts (Playfair Display, EB Garamond, Cormorant Garamond, Fraunces, Inter, Space Grotesk, Archivo Narrow, Archivo Black, Anton, Oswald, JetBrains Mono). Mounted in 3 contexts: export layout, share layout, PresentationDeck. React dedupes.
- **templates/** — 7 templates:
  - `CoverTemplate.tsx` — brand-hero slide 0. Uses meta.brandName / season / launchDate. Not editable.
  - `HeroTemplate.tsx` — block-closer title (4 slides). Not editable.
  - `EditorialStatTemplate.tsx` — big KPI + narrative bridge (4 slides). CIS not wired yet (F5.4 candidate). Shows SAMPLE chip.
  - `NarrativePortraitTemplate.tsx` — image + paragraph story (5 slides). EDITABLE (lead + body).
  - `GridTileTemplate.tsx` — 3×2 tile grid (4 slides). EDITABLE (per-tile label).
  - `TimelineStripTemplate.tsx` — horizontal milestone timeline (3 slides). EDITABLE (lead + per-milestone label).
  - `PlaceholderTemplate.tsx` — fallback skeleton.

### `src/app/api/presentation/`
- **data/route.ts** — `GET ?collectionId=X` returns `PresentationData`. Auth + ownership gated.
- **export/route.ts** — `POST` body `{ collectionId, themeId, coverSubtitle }`. Runs `puppeteer-core` + `@sparticuz/chromium-min` to render `/presentation/export/[id]?token=...` then `page.pdf({ format: 'A4', landscape, printBackground })`. Awaits `document.fonts.ready` before snapshot. Returns blob with `Content-Disposition: attachment`.
- **share/route.ts** — POST creates a share token, GET lists an owner's shares, DELETE revokes. Upserts into `presentation_shares`.
- **override/route.ts** — POST merges `fields` into `presentation_deck_overrides.field_overrides` (upsert; empty string removes a field; empty row gets deleted). DELETE with `?field=X` removes one field or the entire row if `field` omitted.
- **promote/route.ts** — POST `{ collectionId, slideId }`. Maps slide to CIS triple (see SLIDE_PROMOTE_MAP below), combines lead+body, calls `recordDecision()` (imported from `@/lib/collection-intelligence`), deletes the deck override row. Only supports consumer / brand-identity / communications for now.

### `src/app/presentation/export/[id]/`
Internal print route hit by headless Chrome during PDF export.
- **page.tsx** — server component. Validates `?token=...` via `verifyExportToken()`, loads data, renders all 21 slides (cover + SPINE) stacked vertically with `page-break-after: always`. Each slide has `width: 1600px; aspect-ratio: 297/210` (A4 landscape). `@page { size: A4 landscape; margin: 0 }` for print.
- **layout.tsx** — strips global chrome for clean print. Mounts `<PresentationFonts />`.

### `src/app/p/[token]/`
Public read-only share route.
- **page.tsx** — server component. Looks up share by token via `supabaseAdmin` (bypasses RLS). Validates not expired → 404 otherwise. Loads presentation data. Fire-and-forget `increment_share_views(p_token)` RPC to bump views_count. Hands off to `<SharedDeck>` client component.
- **layout.tsx** — full-viewport, zero margin. Mounts `<PresentationFonts />`.

### `src/hooks/`
- **usePresentationData.ts** — in-memory CACHE per collectionId. `refetch()` drops cache + bumps version to re-fire useEffect. Returns `{ data, loading, error, refetch }`.

### `src/middleware.ts`
`publicPagePrefixes: ['/p/', '/presentation/export/']` — share route accessible to anon viewers; export route accessible to the Function's headless Chrome (signed-JWT validated inside page).

## Supabase tables (created 2026-04-15)

### `presentation_shares`
```sql
token TEXT PK, collection_plan_id UUID FK, theme_id TEXT, cover_subtitle TEXT,
expires_at TIMESTAMPTZ, password_hash TEXT, views_count INT, last_viewed_at TIMESTAMPTZ,
created_by UUID FK, created_at TIMESTAMPTZ
```
RLS: owner-only CRUD. Anon viewers reach via `supabaseAdmin`. Indexes on collection + created_by.

### `presentation_deck_overrides`
```sql
id UUID PK, collection_plan_id UUID FK, slide_id TEXT, field_overrides JSONB,
updated_at TIMESTAMPTZ, updated_by UUID FK
UNIQUE(collection_plan_id, slide_id)
```
One row per (collection, slide). `field_overrides` is a flat map: for narratives `{ lead, body, attribution }`; for grids `{ "tiles.N.label" }`; for timelines `{ lead, "milestones.N.label" }`. RLS: owner-only.

### `increment_share_views(p_token TEXT)` RPC
SECURITY DEFINER function. Atomically bumps `views_count` and `last_viewed_at`. Granted to `service_role` only.

## The 21 slides

Index 0: **Cover** (no mini-block — DeckMeta only).
Indices 1..20: `SPINE[i - 1]`. Each SPINE entry has `{ id, block, blockIndex, microIndex, template, titleKey, eyebrow }`.

| # | Slide id | Template | CIS wired | Editable | Promotable |
|---|----------|----------|-----------|----------|------------|
| 0 | — (Cover) | cover | meta only | no | no |
| 1 | consumer | narrative-portrait | ✅ | ✅ | ✅ |
| 2 | moodboard | grid-tile | ✅ (trends+keywords) | ✅ tiles | no |
| 3 | market-research | editorial-stat | ❌ (placeholder) | no (F5.4) | no |
| 4 | brand-identity | narrative-portrait | ✅ | ✅ | ✅ |
| 5 | creative-overview | hero | meta only | no | no |
| 6 | buying-strategy | narrative-portrait | ✅ (drops+target) | ✅ | no |
| 7 | assortment-pricing | grid-tile | ✅ (SKUs by family) | ✅ tiles | no |
| 8 | distribution | editorial-stat | ❌ | no | no |
| 9 | financial-plan | editorial-stat | ❌ | no | no |
| 10 | collection-builder | hero | meta only | no | no |
| 11 | sketch-color | grid-tile | ✅ (top 6 SKUs) | ✅ tiles | no |
| 12 | tech-pack | narrative-portrait | ✅ (category+SKUs) | ✅ | no |
| 13 | prototyping | timeline-strip | ✅ (milestones dd-7..dd-10) | ✅ | no |
| 14 | production | timeline-strip | ✅ (milestones dd-11..dd-15) | ✅ | no |
| 15 | final-selection | hero | meta only | no | no |
| 16 | gtm-launch | timeline-strip | ✅ (drops) | ✅ | no |
| 17 | content-studio | grid-tile | ✅ (contentPillars) | ✅ tiles | no |
| 18 | communications | narrative-portrait | ✅ (brandVoice) | ✅ | ✅ |
| 19 | sales-dashboard | editorial-stat | ❌ | no | no |
| 20 | point-of-sale | hero | meta only | no | no |

## Theme tokens

Each theme in `themes.ts` declares:
```ts
{ bg, surface, fg, mute, accent, accent2, border,
  displayFont, bodyFont, monoFont,
  displayCase ('normal' | 'upper' | 'small-caps'),
  displayWeight, displayTracking, bodyTracking,
  radius, density, photoTreatment }
```

All 10 themes are `status: 'wired'`:
1. **Editorial Heritage** — Playfair Display + EB Garamond, ivory/black/gold, normal case
2. **Streetwear Drop** — Archivo Black + Inter, black/white/red, UPPERCASE
3. **Romantic Feminine** — EB Garamond italic, blush/cream, normal
4. **Minimal Architect** — Inter, white/black/grey, normal
5. **Performance Tech** — Space Grotesk + Inter, dark/neon-lime, UPPERCASE
6. **Avant-Garde Concept** — Times New Roman + Inter, white/black/red, normal
7. **Sustainable Craft** — Fraunces + Garamond, tan/brown/terracotta, normal
8. **Y2K Digital Native** — JetBrains Mono + Inter, dark navy/magenta/cyan, UPPERCASE
9. **Workwear Heritage** — Archivo Narrow + Mono, sand/indigo, UPPERCASE
10. **Resort Luxe** — Garamond + Inter, cream/cobalt/terracotta, normal

**User-facing archetype strings contain ZERO brand names**. Brand references live only in code comments ("Hermès, Bottega, The Row, Loewe" etc.) for internal designer credit. See `feedback_no-brand-names-in-ui.md` for the legal rationale.

## Editing flow

1. Owner clicks **Edit** (pencil, top bar) → `editMode` true.
2. Editable fields gain dashed hover outline + become contentEditable via `EditableText`.
3. Click field → textarea autofocuses. Esc cancels. Cmd+Enter commits to local draft state.
4. **Save edits** (citronella button) → POSTs each draft to `/api/presentation/override` → rows in DB → `refetch()` → screen reflects the committed overrides.
5. **Done** exits edit mode, discarding any unsaved drafts.
6. Edited fields show outline + a hover **Revert** chip → `DELETE ?field=X` → CIS-derived value returns.
7. On promotable slides (consumer, brand-identity, communications) with an override, the top bar shows a citronella **Promote** pill → confirmation modal → `POST /api/presentation/promote` writes to CIS via `recordDecision()` → deletes the override row.
8. Sidebar shows a **citronella gold dot** on each slide that has a saved override (not drafts — committed only).

## Promote map (slide → CIS key)

```ts
SLIDE_PROMOTE_MAP = {
  consumer:         (creative, target, demographics),
  'brand-identity': (creative, identity, visual_direction),
  communications:   (marketing, voice, tone),
}
```
These triples are exactly what `buildPromptContext` reads via `get(domain, subdomain, key)`. So after promote, the AI prompts + Workspace UI see the new text on next render.

Other slides intentionally have no Promote — their mapping is lossy or structural. Edits stay deck-only.

## PDF export stack

- `puppeteer-core ^24.41` (serverless client)
- `@sparticuz/chromium-min ^147` (binary pulled from GitHub tarball at cold start; CHROMIUM_TARBALL_URL env var to pin)
- Vercel Function runtime `nodejs`, `maxDuration: 60`
- Dynamic imports so Chromium binary (~40MB) isn't pulled into other bundles
- `page.setViewport({ width: 1600, height: 1131 })` — A4 landscape @ ~137dpi
- `page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 })`
- `page.evaluate(() => document.fonts.ready)` before `page.pdf()` — required for Google Fonts to embed

**getBaseUrl priority**: `req.nextUrl.origin` (the public domain — guaranteed unprotected) → `NEXT_PUBLIC_SITE_URL` → `VERCEL_URL` (last resort, may have Deployment Protection). This was a bug the first test surfaced — VERCEL_URL pointed at the protected internal `*.vercel.app`.

## Share link flow

- Owner clicks **Share** → POST `/api/presentation/share` → generates 32-byte URL-safe token → saves in `presentation_shares` with frozen theme + subtitle → returns URL.
- Modal shows the URL + Copy button. Expiry/password reserved for future.
- Public viewer opens `/p/[token]` → page looks up via `supabaseAdmin`, validates expiry, loads data, hands to `<SharedDeck>` (PresentationDeck with `readOnly=true`).
- Middleware: `/p/` prefix whitelisted, anon viewers pass through.
- In read-only mode: aimily wordmark replaces X, Theme picker + Share + Edit all hidden, PDF stays enabled.
- `increment_share_views(p_token)` RPC fires fire-and-forget on each public view.

## What's intentionally NOT wired

- **EditorialStat CIS auto-fill** (4 slides: market-research, distribution, financial-plan, sales-dashboard). Kept on editorial placeholders with SAMPLE chip. Most lack real CIS data pre-launch anyway (sales data, etc.).
- **Cover + Hero edit**. Cover uses meta only (brandName, season, launchDate) — future: editable brand tagline. Hero slides are block-closers, just titles.
- **Grid eyebrow + value editing, Timeline date/status editing**. Structural fields, deliberately out of F5.3 scope.
- **Promote for buying-strategy / tech-pack / grids / timelines**. No clean single-field CIS target. Edits stay deck-only.
- **Share link expiry UI + password protection**. Columns exist in DB, UI is future work.

## Respecting the AI architecture lock

Per CLAUDE.md: never modify `load-full-context.ts`, `prompt-foundations.ts`, `prompt-context.ts`, `collection-intelligence.ts`, or any `src/app/api/ai/*/route.ts`.

What we CAN do (and did):
- **Read** from those files to understand schema (prompt-context.ts).
- **Import + call** their exported functions (`loadFullContext`, `recordDecision`).
- **Write to the underlying Supabase tables** that those functions read from (collection_decisions via recordDecision, collection_workspace_data via workspace saves).
- **Create new files** in `src/lib/presentation/` and new API routes under `src/app/api/presentation/` that wrap the locked functions.

## Commits shipped today (2026-04-15)

In order:
1. `fix(sidebar+i18n)` — unlock mini-blocks + i18n calendar UI
2. `fix(calendar)` — tactile bar affordance + hover-only plus icon
3. `fix(calendar)` — show milestone/phase name in English
4. `feat(presentation)` F1.1 — third face of the cube with 10-theme architecture
5. `fix(presentation)` — split-pane persistent spine + deck canvas
6. `fix(cube)` — symmetric exit choreography + spine alignment + coord numbering
7. `fix(presentation)` — pixel-perfect spine alignment vs nav
8. `fix(presentation)` — pill height matches nav (44px)
9. `feat(presentation)` F1.2 — 4 real templates
10. `feat(cube)` — Overview top-level + cover slide + ThemePicker label
11. `refactor(sidebar)` — collection name as hero, drop Overview icon
12. `style(sidebar)` — 17px bold + dot → dot removed, rounded-full pill
13. `feat(presentation)` F2.1 — CIS auto-fill, end-to-end pipeline
14. `feat(presentation)` F2.5 — grids + timelines + parser polish
15. `feat(presentation)` — SAMPLE chip for placeholder slides
16. `refactor(presentation)` — drop redundant eyebrow + meta in top bar
17. `feat(presentation)` F4.1 — server-side PDF export via headless Chrome
18. `feat(presentation)` F4.2 — public share links + schema fixes
19. `fix(presentation)` — PDF export hits public domain
20. `feat(presentation)` — embed theme fonts (Google Fonts)
21. `legal(presentation)` — strip brand names from UI archetypes
22. `feat(presentation)` F3 — all 10 themes wired, displayCase honored
23. `feat(presentation)` F5.1 — inline editing with deck overrides
24. `feat(presentation)` F5.3 — grid + timeline edit
25. `feat(presentation)` F5.2 — Promote to Workspace (CIS write-back)

## Live at launch

https://www.aimily.app/collection/[id]/presentation

Test collection: SS27 SLAIZ — `60652ef7-1b06-4be4-9a61-31357be0be65`.
