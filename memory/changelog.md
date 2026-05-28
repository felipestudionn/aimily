---
name: UI Redesign Changelog
description: Running log of all UI changes — what was done, why, current state. Updated after every commit. Read this first for context.
type: project
originSessionId: f99254a8-8360-4858-a287-eacb00c4229e
---
# UI Redesign Changelog

> Post-2026-04-12 sessions live in their own `SESSION-YYYY-MM-DD-*.md` files. This changelog is the historical record up to and including 2026-04-12. See Session History in `MEMORY.md` for every day after.

## Session 2026-05-27 / 2026-05-28 — Investor / Zara pitch deck · merged to main

Two surfaces, one narrative: the public-shareable web deck at `/pitch` and the canonical Keynote master at `docs/aimily-pitch.key`.

**Branch**: `pitch/investor-zara-deck` → merged to `main` 2026-05-28 (fast-forward, rebased to drop the duplicate protocol commit).

**Commits on main**:
- `283f95b` — deck shell + 5 slides (cover · relay race · cost · question · CIS intro) + `/pitch` whitelisted in middleware. Cherry-picked from original `cbbfa51`.
- `bede8d7` — slide refinements + canonical `docs/aimily-pitch.key`. Cleaned from original `cb7a5d5`: 22 intermediate `.key` drafts (17× AZUR, v2, es, COLORS-FULL, COLORTEST, PRECOLOR) **dropped from main** per Felipe's "solo aimily-pitch" rule.

**What shipped**:
1. `src/app/(pitch)/layout.tsx` — minimal shell, no app chrome, `robots: noindex,nofollow`.
2. `src/app/(pitch)/pitch/page.tsx` — soft gate via `?key=<PITCH_KEY>`, `?s=N` deep-link.
3. `src/components/pitch/PitchDeck.tsx` — keyboard nav (←/→/space/PgUp/PgDn/Home/End/F), URL sync, fullscreen toggle, `mix-blend-difference` chrome that adapts to dark/light slides.
4. `src/components/pitch/SlideShell.tsx` — light/dark variant + eyebrow + accent color block.
5. 5 slide components (Cover · RelayRace · TheCost · TheQuestion · CISIntro).
6. `src/middleware.ts` — `/pitch` added to `publicPagePrefixes`.
7. `docs/aimily-pitch.key` — canonical Keynote master (4.4 MB).

**Architecture doc**: `memory/architecture-pitch-deck.md` — single source of truth for the deck. Read before any future deck change.

**Hard rules locked**:
- Only `docs/aimily-pitch.key` lives on `main`. Intermediate drafts stay local.
- aimily protege, **NUNCA sustituye** — voice rule enforced across all 5 slides.
- Spanish peninsular, weight contrast (no italic), gold-standard card pattern reused (slides 03 + 05).
- `/pitch` never linked from any public surface; gate is soft (anti-crawler), not real auth.

## Session 2026-05-05 / 2026-05-06 — Ecom Block · 12 PRs · zero to shipped

End-to-end DTC storefront generator for aimily. 12 commits, ~5,500 LOC ecom-related, 0 fallbacks (Felipe rule respected through entire code path), 12 editorial themes, 9 endpoints (5 SEO + 4 storefront management), Vercel Pro + Cloudflare aimily.shop infra.

**Marketing copy "Web · DTC + integración" + "SEO ~€100 replaced" en `PoweredBy.tsx` ahora 100% honesto.**

Commits (`9ca93ec` → `d8078d8` on `main`):

| PR | Hash | Sprint | Summary |
|---|---|---|---|
| #1 | `9ca93ec` | Sprint 1 D1 | DB schema (3 tables + RLS + quota fn) + TS types + arch docs |
| #2 | `86dee9e` | Sprint 1 D2 | Multi-tenant middleware + storefront route group hello-world |
| #3 | `ef856c7` | Sprint 1 D3 | Card rename `Point of Sale` → `Ecom` + i18n in 9 locales |
| #4 | `f34fa29` | Sprint 1 D4-5 | Publish flow + 3 endpoints + EcomHub stub |
| #5 | `c87f354` | Sprint 2 SSL | Per-subdomain SSL via Vercel API (Cloudflare Free + Registrar lock-in workaround) |
| #6 | `83ad5ea` | Sprint 2 | Theme infra + editorial-heritage + CIS-only loader (NO fallbacks rule) |
| #7 | `b9b969f` | Sprint 3 | BuyButton component (Stripe + Shopify + Lookbook only) + EcomHub V2 redesign |
| #8 | `a488e1d` | Sprint 4 | 4 themes batch B (minimal-architect, streetwear-drop, romantic-feminine, resort-luxe) |
| #9 | `e8e79cf` | Sprint 5 | 7 themes batch C — all 12 themes complete |
| #10 | `c7d382d` | Sprint 6 | SEO basics (sitemap, robots, og.png, JSON-LD) + GDPR banner + smoke verde end-to-end |
| #11 | `4a2b5f4` | Sprint 7 | SEO Research module · 5 AI endpoints + SeoResearchHub UI (4 tabs) |
| #12 | `d8078d8` | Sprints 8+9+10 | Inline edit UI + Vercel Analytics + WholesaleOrders move to Block 2 |

**Key architectural decisions** (logged in `architecture-ecom.md`):
1. NO Hydrogen/Oxygen — would break Next.js + Vercel stack
2. Hosting in `*.aimily.shop` (Cloudflare Registrar, ~$30/yr)
3. 12 editorial themes fixed (NOT AI-generated)
4. Stripe Buy Button + Shopify Buy SDK only · cero responsabilidad MoR
5. Card Ecom inside Block 4 Marketing (sidebar 4×5 stays)
6. Wholesale moved to Block 2 Merch > Channels (semantic correctness)
7. Per-subdomain SSL via Vercel API (Cloudflare Free no proxy wildcards + Registrar locks NS 60d)
8. Route group `storefront/` not `_storefront/` (Next.js doesn't route underscore-prefixed)
9. CIS canonical for storefront brand DNA. brand_profiles is legacy/empty for SLAIZ
10. Render filter relaxed to `price > 0` (SKUs without imagery still render with name)

**Smoke test verde** (verified 2026-05-05 with Host header simulation against dev server):
9/9 routes return 200 with SLAIZ data: home, /shop, /lookbook, /about, /contact, /shop/{sku}, /sitemap.xml, /robots.txt, /og.png.

**Migration path** (post 2026-07-04): can transfer `aimily.shop` to Vercel Domains for native wildcard SSL after ICANN 60-day window. The publish endpoint changes (per-domain registration) become unnecessary at that point.

Full architecture reference → [architecture-ecom.md](architecture-ecom.md).

## Session 2026-04-23 — Collection Builder SKU cards + /my-collections editorial home

14 commits `9585bf0` → `eeeaaf2`. Full redesign of the Collection Builder grid into a two-state **SKU Flip Card** (visual-first front · finance-detail back). `/my-collections` home cleaned up to match. Card pattern now documented as gold standard in `design-components-canonical.md` section 2b. Felipe: "me encanta, me encanta, me encanta, me encanta."

Full writeup → [SESSION-2026-04-23-collection-builder-cards.md](SESSION-2026-04-23-collection-builder-cards.md).

## Session 2026-04-17 — Phase workspaces redesign

4 commits `14833d1` → `1cecac8`. Split Sketch & Color, Prototyping, Production, Final Selection into dedicated hub-of-cards workspaces. See [SESSION-2026-04-17-phase-workspaces.md](SESSION-2026-04-17-phase-workspaces.md).

## Session 2026-04-16 — Financial Plan + Tech Pack enterprise + D&D block redesign

26 commits `dcfb7bc` → `14833d1`. Massive single-day push. See [SESSION-2026-04-16-full-day.md](SESSION-2026-04-16-full-day.md) and [SESSION-2026-04-16-fp-plus-deferred.md](SESSION-2026-04-16-fp-plus-deferred.md).

## Session 2026-04-15 — Presentation Cube end-to-end

25 commits. 21 slides × 10 themes + PDF export + share links + inline edit + Promote-to-Workspace. See [SESSION-2026-04-15-presentation-cube.md](SESSION-2026-04-15-presentation-cube.md).

## Session 2026-04-14 — Gold standard Family Card + CIS server-side + i18n

See [SESSION-2026-04-14-cis-design-i18n.md](SESSION-2026-04-14-cis-design-i18n.md).

---

## Session 2026-04-12 — CIS + Block 4 Restructure + Model Roster + GPT Editorial

Major architectural session. Four pillars shipped:

### 1. Collection Intelligence System (CIS)
- `collection_decisions` table — captures EVERY decision across all 4 blocks
- `src/lib/collection-intelligence.ts` — recordDecision, getIntelligence, compilePromptContext (11 presets)
- `GET/POST /api/collection-intelligence`
- 12 capture points wired across API routes (brand profiles, voice, stories, drops, SKUs, content pillars, moodboard, creative synthesis, merch AI, planner setup, wholesale orders)
- `buildPromptContext()` updated: reads from CIS instead of empty `setup_data` paths — the 93 {{placeholders}} in marketing-prompts.ts now receive real data
- Commits: `e2c8aba`, `9fb7ab7`

### 2. Marketing Block 4 Restructured (4 new cards)
| Card | Replaces | Commit |
|------|----------|--------|
| **Sales Dashboard** | Stories card | `fa99410` |
| **Content Studio** | Product Visuals card | `7645e96` |
| **Communications** | Content Strategy card (wrapper) | `b116a7c` |
| **Point of Sale** | *(new)* Campaign & Video card | `b116a7c` |

New components: SalesDashboardCard (KPIs + Recharts), ContentStudioCard (SKU list + EvolutionStrip), ContentEvolutionStrip (4 levels), ModelRosterPicker (28 models), CommunicationsCard, PointOfSaleCard (wholesale CRUD).

New tables: `sales_channels`, `wholesale_orders` (migration 022).
New hooks: `useAimilyModels`, `useCollectionIntelligence`, `useWholesaleOrders`.

### 3. Aimily Model Roster (28 AI models)
- 14 female + 14 male models generated with Flux 2 Pro via Freepik
- `aimily_models` table in Supabase (migration 020)
- `GET /api/aimily-models` API
- Editorial endpoint accepts `model_id` — passes headshot as 3rd reference image
- Face blur preprocessing (`src/lib/face-blur.ts`) for style references
- Editorial two-picker UI: product + style reference + model casting selectors (complexion, age, hair)
- Commits: `88bb94c`, `344a081`, `83fbabd`, `b8a461e`

### 4. GPT Image 1.5 for Editorial (face fidelity breakthrough)
- 6 iterations of Nano Banana face identity strategies all failed:
  face blur, enlarged blur, heuristic composite, Claude Vision composite,
  prompt priority hierarchy — Nano Banana has no character reference channel
- Switched to **GPT Image 1.5** with `input_fidelity: "high"` + per-image
  prompt indexing: "Image 1 = product, Image 2 = model, Image 3 = style"
- **Works on first try**: Zhara's face, hair (platinum bob), skin tone
  all correctly preserved while maintaining editorial composition
- Nano Banana kept for still life / editorial-without-model / tryon
- Content Studio Editorial level now has full inline generation flow:
  ModelRosterPicker → style ref upload → art direction → generate
- Commits: `ca6e4dd`, `bd4f026`, `1c9e4eb`, `dbbcf82`, `de36ae1`, `b779331`, `6d43e14`

### 5. Earlier in the session (pre-restructure)
- Email sequence visual grouping in ContentStrategyCard (`84c9548`)
- CampaignVideoCard migrated to enterprise error contract (`84c9548`)
- Editorial/Video source images show SKU 3D renders + Upload Photo works (`07ce9da`)
- Auto-select first source image (`38e5117`)
- Editorial style ref — face changes, everything else stays (`f80d1bd`)
- Footwear on feet (never in hand) + style ref model variation (`5b6e955`)

### Stats
- i18n: 2137 → 2220 keys (83 new across 9 languages)
- 3 new DB tables (aimily_models, collection_decisions, wholesale_orders + sales_channels)
- ~22 commits from `84c9548` to `6d43e14`
- Editorial engine: GPT Image 1.5 (model selected) / Nano Banana (no model)

---

## Session 2026-04-11 — Marketing Resilience (full-day consolidated)

Canonical handoff: **[SESSION-2026-04-11-marketing-resilience.md](SESSION-2026-04-11-marketing-resilience.md)**
— read that for the full file index, architecture decisions locked,
and pending items.

Shipped the Marketing Story Mode and then hardened the entire marketing
surface so it can't silently fail again before the 2026-05-01 launch.
14 commits in `main`, every one a structural fix (no patches).

### Commit trail (`ae51fe1..0d78bb2` in `main`)

| Hash | Title |
|---|---|
| `ae51fe1` | React #310 in StoriesCard — hoist editForm useState above early return |
| `5af7903` | Marketing Story Mode — presentation deck + auto-email retrospective |
| `2748332` | /api/ai/stories/generate 500 — admin client + real error propagation |
| `ad18236` | llm-client surfaces provider errors instead of swallowing them |
| `e7312a6` | guard stories/generate against empty SKU collections |
| `244c3af` | JSON parse failure in stories/generate (truncated output repair) |
| `2805c3c` | story↔SKU assignment robust against LLM hallucination |
| `fed0e9d` | ai-generations POST hardening + Still Life/Try-On require 3D render |
| `9bbbe80` | SKU thumbnails prefer 3D render + disable buttons without it |
| `4b37ed1` | **refactor: enterprise error contract across all 21 hooks** |
| `0329190` | **migration 019** ai_generations generation_type CHECK constraint |
| `17042dc` | Still Life prompt = product alone, zero humans in frame |
| `9e464dd` | /api/ai/freepik/editorial dedicated endpoint (on-model narrative) |
| `0d78bb2` | Still Life = 8 signed editorial looks (Hereu / Khaite / Jacquemus) |
| `84c9548` | close 2026-04-11 pending items — email sequence grouping + Campaign & Video error contract |

### What shipped, by layer

**1. Marketing Story Mode (`5af7903`)**
10 conditional slides between Product Grid and Timeline. Full web +
PPTX parity via `src/lib/presentation-data.ts` (data helper) and
`src/lib/presentation-pptx-slides.ts` (PPTX builder). Auto-emailed
post-launch retrospective deck via Resend (`src/lib/retrospective-email.ts`).
New: `LookbookPageRenderer.tsx` for all 6 layout types. Two new audit
actions: `MARKETING_PRESENTATION_EXPORT`, `MARKETING_RETROSPECTIVE_EMAILED`.

**2. Enterprise error contract (`4b37ed1`)**
Every hook in `src/hooks/` followed a silent-fail anti-pattern. Refactor:
new `src/hooks/hook-errors.ts#backendError` helper; 21 hooks updated
uniformly; write ops now throw structured errors, read ops degrade
gracefully. JSDoc contract at top of every hook prevents regression.
ProductVisualsCard + StoriesCard wrapped all their write calls in
try/catch and surface errors via red banner.

**3. Schema drift fix (`0329190` — migration 019)**
`ai_generations.generation_type` CHECK constraint still had the legacy
values (`'lifestyle'`) from before the 2026-04-10 fal cleanup. Every
Still Life persist failed with 23514 until the enterprise error refactor
exposed the real Supabase error. Migration drops/recreates the constraint
with the 8 current enum values. Applied via Supabase MCP, verified with
`pg_get_constraintdef`. Rule: TS enum changes ship with matching
migration in the same commit.

**4. Still Life / Editorial split (`17042dc` + `9e464dd`)**
Shared `/api/ai/freepik/still-life` served two opposite categories.
Split into two real endpoints:
- `/api/ai/freepik/still-life` → product alone, NO humans (Product Visuals)
- `/api/ai/freepik/editorial` → on-model narrative scene (Campaign & Video)
- `/api/ai/freepik/tryon` already existed (brand-model catalog)

`src/lib/storage.ts` AssetType union extended with `still_life` and
`editorial`; header JSDoc now enumerates all 9 asset types with their
producer route.

**5. Still Life = 8 signed editorial looks (`0d78bb2`)**
Old scene selector was generic labels → Nano Banana defaulted to
e-commerce cutout. New `STILL_LIFE_LOOKS` map in the still-life route
holds 8 full director-of-photography looks (SURFACE + LIGHTING +
PALETTE + PROPS + COMPOSITION + REFERENCE). Brands anchored to Hereu /
Khaite / Jacquemus / Bottega / Loewe / Jil Sander. UI picker is now a
4×2 grid of pill cards with label + hint instead of a tight select.
`SCENE_OPTIONS` typed with `{ id, label, labelEs, hint, hintEs }`.

**6. Plus fallout fixes (`ae51fe1`, `2748332..9bbbe80`)**
- React #310 hoist in StoriesCard (latent bug, first triggered on
  2026-04-11 when the expanded view was first opened).
- `prompt-context.ts` now uses `supabaseAdmin` (was using the browser
  client in a server route by mistake).
- `llm-client` surfaces the real provider error on fallback failure.
- Stories generate guards empty-SKU collections with a 400 + clear msg.
- JSON parse in `extractJSON` can repair a truncated response by
  closing open braces/brackets; maxTokens bumped to 8192 for the
  stories prompt which was routinely exceeding 4096.
- Story→SKU assignment pre-fetches real SKU ids and drops hallucinated
  ones; orphan sweep assigns unmatched SKUs to the first story so none
  are silently lost.
- SKU thumbnails in ProductVisualsCard now prefer `render_urls['3d']`
  (was hardcoded to `reference_image_url`). Still Life + Try-On
  buttons disabled upfront when the 3D render is missing.

### Architecture locks (enforced by JSDoc + commit messages)

1. **Hook error contract** (`4b37ed1`) — write ops throw via
   `backendError(res)`; read ops catch internally.
2. **Schema/enum sync** (`0329190`) — TS enum changes ship with
   matching SQL migration in the same commit.
3. **Three visual categories, three endpoints** (`9e464dd`) —
   still-life / editorial / tryon never merge.
4. **Still Life is editorial, not catalog** (`0d78bb2`) — adding a
   scene preset requires a full `STILL_LIFE_LOOKS` entry.
5. **3D render mandatory** (`9bbbe80` + `fed0e9d`) — Still Life and
   Try-On hard-require `sku.render_urls['3d']`, never fall back to
   `reference_image_url`.

### Environment
- `RESEND_API_KEY` registered in Vercel (production + preview + dev)
  via `vercel env add`.
- `RESEND_FROM_ADDRESS` not set — defaults to `aimily <hello@aimily.app>`.
  Domain must be verified in Resend before the first cron retrospective.
- Migration 019 applied to production Supabase.

### Pending for next session (not bugs)
1. Visually validate the 8 Still Life looks. Validation started 2026-04-11
   on Brisa Laser Slate: `window_light` confirmed on-brand. 7 looks
   remain (`sun_on_stone` is the next priority — naming ambiguity risk).
2. Verify `hello@aimily.app` in Resend before the first post-launch cron.
3. ~~Campaign & Video block deep audit~~ — **CLOSED 2026-04-11 in `84c9548`.**
   Full audit + migration to enterprise error contract shipped (errorMessage
   state + 4 handlers + 4 safe wrappers). F12 durationSeconds type lie fixed
   (5|10 now acknowledged in the type). 3 hardcoded strings replaced with
   i18n keys.
4. Vercel Workflow migration for polling routes (deferred from
   2026-04-10, still deferred).
5. ~~Email sequence preview visual grouping in ContentStrategyCard~~ —
   **CLOSED 2026-04-11 in `84c9548`.** New EmailSequenceGroup sub-component
   renders clustered drip campaigns with shared header (name, type, trigger,
   target metrics) and ordered member emails with delay context.

### Follow-up patch session (`84c9548`)

Same-day follow-up after the canonical 2026-04-11 session closed at
`0d78bb2`. Addressed the last two pending items that were bounded in
scope and structural-fix friendly:

- **ContentStrategyCard** — email tab now partitions filtered templates
  by `sequence_id` into `sequences` (clustered cards via new
  EmailSequenceGroup sub-component) + `singles` (flat rows). Section
  headings only render when both kinds coexist. `EmailTemplateRow`
  reused unchanged — editing/deleting/updating still work per-row.
- **CampaignVideoCard** — migrated to the enterprise error contract
  from `4b37ed1`. This card was never touched by that refactor; every
  write op (editorial / video / shotlist / lookbook compose + 5 hook
  writes) was silently eating errors into `console.error`. Now:
  `errorMessage` state + amber banner mirroring ProductVisualsCard,
  4 handlers refactored to use `backendError(res)`, 4 safe wrappers
  (`handleUpdateLookbookPage` / `handleDeleteLookbookPage` /
  `handleToggleFavorite` / `handleDeleteGeneration`) threaded into
  LookbookTab + EditorialTab + VideoTab. Zero unhandled rejections
  possible from UI event handlers.
- **F12 durationSeconds type lie** — `/api/ai/content-strategy/generate`
  declared `durationSeconds?: 15 | 30` but CampaignVideoCard was
  casting `5 | 10` values through it. Type widened to `5 | 10 | 15 | 30`;
  card cast now reflects reality; default bumped 15 → 10 (Kling 2.1 Pro
  max).
- **i18n** — 13 new keys across 9 dictionaries (2137 → 2150), zero
  English leakage: sequence grouping labels, editorial badge, lookbook
  count labels.

---

## Session 2026-04-10 — Fase A + B + C complete (expert audit execution)

After the fal.ai cleanup finished, same session continued end-to-end with the
full expert audit plan. Every item from HANDOFF-marketing-block-fases-abc.md
(minus the annulled A1) is now shipped.

### Commit trail (post-cleanup)
- **7b4468a** — Prompt registry for A2/A3/A4/B1/B3/B5/B6/C1/C2/C3/C4/C5.
  New `src/lib/prompts/content-guides.ts` (HOOK_FORMULAS_GUIDE,
  COPYWRITING_PRINCIPLES, ORB_FRAMEWORK_GUIDE) + new
  `src/lib/marketing-validators.ts` (PLATFORM_LIMITS, enforceHookDiversity,
  validateSocialPost, validateEmailFields, validatePaidCreative,
  trimIntelligent). 13 prompts in `marketing-prompts.ts` either rewritten
  or added: social_templates, calendar_generate, paid_plan (C1 full),
  gtm_plan, launch_checklist (C3), pillars_generate (C4), seo_generate
  (C5), product_copy (A4 self-audit + B2 contexts), stories_generate,
  stories_assist, email_sequence_generate (new), calendar_atom_repurpose
  (new), video_ad_structured (new), lookbook_compose (new).
- **ad944ba** — content-strategy route new modes (email_sequence,
  video_shotlist) + copyContext / sequenceType / hookType / buyerStage
  params + B4 hook diversity retry loop. Stories route accepts
  consumerSignals. Migration 017 applied (stories enrichment columns).
  StoriesCard new "consumer voice" textarea and backward-compatible
  content_direction normalizer. 9 locales updated.
- **157faf1** — B1 email sequences end-to-end: migration 018 applied
  (email_templates_content gets sequence_id + 11 sequence fields +
  index), types/digital.ts extended, ContentStrategyCard Email tab gets
  Single/Sequence toggle + sequence type picker + handleGenerateSequence
  with client-side sequence_id. B2 copy_context selector in Product
  Copy tab with 6 context values. B4 persists social hook_type into
  SocialTemplate. 9 locales updated.
- **4077fd7** — B5 video shotlist UI: state + handler that hits
  content-strategy mode video_shotlist, 4-beat preview above the
  Generate Video button, captions + rationale, hook type picker.
  B6 AI lookbook compose: content-strategy gets lookbook_compose mode +
  targetPages/availableVisuals/copySnippets params, useLookbookPages
  gets bulkAddPages, CampaignVideoCard handleAiComposeLookbook wires
  favorite visuals → bulk page creation with type-safe content items.
  9 locales updated.
- **2f2a72f** — C2 atom repurpose: content-calendar route new
  atom_repurpose mode, ContentCalendarCard "Repurpose" pill + form.
  C6 post-launch retrospective: new /api/ai/post-launch/generate route
  (persists to collection_plans.setup_data.post_launch_analysis) +
  new /api/cron/post-launch-analysis cron (daily 08:00 UTC, 7+ days
  after launch, vercel.json updated), LaunchCard retrospective block
  with wins/areas/recommendations rendering. C7 performance feedback:
  new src/lib/performance-context.ts (favorites proxy → winning
  pattern detector) wired into paid/social/email_sequence/calendar
  prompts as a trailing context block. Paid route now passes
  total_favorites as previous_conversions_count so the C1 bid-strategy
  rule fires correctly. 9 locales updated.

### Verification after the full expert audit run
- `npx tsc --noEmit` exit 0
- `npm run build` success, all new routes present:
  - /api/ai/content-strategy/generate (now 8 modes)
  - /api/ai/content-calendar/generate (now 3 modes)
  - /api/ai/post-launch/generate (new)
  - /api/cron/post-launch-analysis (new)
  - /api/ai/freepik/{sketch,still-life,video,brand-model,tryon} (from cleanup)
- Migrations applied to Supabase:
  - 016_rename_fal_request_id_to_provider_request_id (cleanup)
  - 017_stories_enrichment (B3)
  - 018_email_sequences (B1)
- Vercel cron schedule added: post-launch-analysis daily at 08:00 UTC

### What's NOT done (deferred)
- Vercel Workflow migration for the polling Freepik routes (still-life,
  video, brand-model, tryon, freepik/sketch). Still use the 3s/6s poll
  pattern inside the function. Works within the 300s maxDuration,
  follow-up ticket exists in `freepik-integration.md`.
- Email sequence preview UI in the card (current flow persists the
  bulk insert and the user sees them as individual emails in the list).
  Next iteration could group them by sequence_id visually.
- B5 shotlist-to-video linking: the shotlist currently lives in
  component state only. If the user generates a video after, the
  shotlist is not passed through — the video model receives the motion
  preset + story context like before. Next iteration could stitch
  shotlist visual_direction into the video prompt.

---

## Session 2026-04-10 — fal.ai full cleanup (7 commits)

### Context
Felipe detected that I was refactoring fal.ai routes as part of Fase A (item A1).
He had marked fal.ai as deprecated weeks earlier and I never internalized it.
Full stop, reset of the in-progress A1 commit, and execute a clean migration
off fal.ai onto the providers aimily actually uses.

### What the cleanup resolved
- Product Render (marketing) was duplicated: one flow in the design phase
  using `gpt-image-1.5` (correct), another flow in ProductVisualsCard going
  through `fal/product-render` with a completely different model
  (`flux-2-pro`). The two could diverge. Now both use the design-phase
  endpoint — the 3D render the user sees in marketing is the one from design.
- Still Life / Editorial used `fal/lifestyle` (Flux 2 Pro, text-to-image
  from reference). No product identity preservation — the product got
  reinterpreted every generation.
- Video used `fal/kling-video/v3/standard` with no Pro tier, no duration
  control.
- Brand Model + Try-On used fal endpoints (flux-2-pro, FASHN v1.6) that
  had no relation to the rest of the stack.

### Final architecture
- **Design phase (unchanged)**: OpenAI gpt-image-1.5 via /api/ai/colorize-sketch
  (colorization with is_3d_render:false, photoreal 3D with is_3d_render:true
  + input_fidelity:high).
- **Marketing phase (new)**: Freepik for everything.
  - Still Life / Editorial → Nano Banana (Gemini 2.5 Flash Image Preview)
    with reference_images for product identity preservation
  - Video → Kling 2.1 Pro (default) + Std draft mode, 5s/10s durations
  - Brand Model → Nano Banana portrait generation
  - Virtual Try-On → Nano Banana multi-reference (model + product)
  - Sketches (already) → Flux Dev

### 7-commit trail
1. **eada71a** — purge dead fal routes (sketch/status/model-create, no callsites),
   migration 016 renaming `ai_generations.fal_request_id` →
   `provider_request_id`, type hardening in studio.ts
2. **e0e420f** — Product Render rewired in ProductVisualsCard: reads
   `sku.render_urls['3d']` if exists, otherwise posts to colorize-sketch
   with is_3d_render:true (exact same flow as design phase)
3. **e4f16ed** — New route `freepik/still-life` (Nano Banana). UI rewire:
   lifestyle button → still-life, editorial button → still-life. i18n
   rename across 9 locales (lifestyle → stillLife). Delete fal/lifestyle
   and fal/product-render. Collateral bug fix in prompt-context.ts
   render_count filter (was comparing to 'product-render' instead of
   'product_render').
4. **9a35558** — New route `freepik/video` (Kling 2.1 Pro default + Std
   alt + 5s/10s durations) with `export const maxDuration = 300`. New
   VideoTab controls (tier + duration segmented pills). 9 locales with
   new keys. Delete fal/video.
5. **b580013** — New routes `freepik/brand-model` (Nano Banana portrait)
   and `freepik/tryon` (Nano Banana multi-reference). Rewire tryon
   callsite. Delete fal/tryon. `npm uninstall @fal-ai/client`.
6. **(this commit)** — Memory cleanup: rewrote `freepik-integration.md`
   as the canonical provider map, patched ai-image-pipeline-v3.md,
   MEMORY.md, marketing-block-redesign.md, marketing-expert-audit.md,
   design-dev-block-redesign.md, HANDOFF-marketing-block-fases-abc.md,
   full-project-documentation.md, security-ai-privacy.md, and this
   changelog entry. The HANDOFF's item A1 is explicitly annulled.
7. **(pending)** — Final verification: grep + tsc + build.

### Verification after commit 5
- `grep -rn "FAL_KEY|@fal-ai|fal.subscribe|fal.config" src/` → 0 matches
- `npx tsc --noEmit` → exit 0
- `src/app/api/ai/fal/` directory does not exist
- `@fal-ai/client` not in package.json

### Next
- A2 of the expert audit (HOOK_FORMULAS_GUIDE + PLATFORM_LIMITS + hook
  diversity enforcer) is now the FIRST item of Fase A. A1 is annulled.
- Follow-up ticket: migrate all Freepik polling routes to Vercel Workflow
  for durable execution with pause/resume/retry/crash-safety.

---

## Session 2026-04-10 — Fase 4.3: Enterprise Security Layer (single-user clean)

### Context
Fase 4.3 del plan de bloque 4 marketing. Objetivo original: audit_log en rutas
AI + team roles check en 8 tarjetas. Durante la ejecución, Felipe recalibró
el scope: la app es 99% single-user, los permisos son un nice-to-have para
cuando algún cliente pida team seats. El owner nunca debe ver gates.

### Final shape (after scope recalibration)

**Server-side only**:
- `src/lib/team-permissions.ts` (nuevo): helper `checkTeamPermission()` con
  fast path para owner. Primer check: `plan.user_id === userId` → allow
  instantly. Segundo check: `team_members` row con permission flag. Tercer:
  deny. Para el flujo owner actual es coste cero y transparente.
- `src/lib/audit-log.ts`: añadidas 15 acciones marketing (AI generation,
  PII events, financial events, content publishing). `logAudit()` ya existía.
- `src/lib/api-auth.ts`: `verifyCollectionOwnership()` extendido con segundo
  parámetro `permission?: TeamPermission` (default `view_all`). Drop-in para
  todas las llamadas legacy.
- Migración SQL `015_team_members_marketing_permissions.sql` aplicada en
  Supabase: extiende default de `team_members.permissions` con 7 claves
  marketing. 0 filas a backfillear (tabla vacía).

**25+ rutas instrumentadas** (todas transparentes para el owner):
- 7 rutas AI marketing: stories, gtm, content-calendar, paid, launch, copy,
  content-strategy → permission check + logAudit
- 5 rutas ai/fal: lifestyle, model-create, product-render, tryon, video →
  permission check (se invocan desde marketing block)
- 13 rutas CRUD marketing: stories, drops, commercial-actions,
  content-calendar, launch-tasks, content-pillars, brand-voice-config,
  social-templates, email-templates, lookbook-pages, product-copy,
  pr-contacts, paid-campaigns → permission check + audit en las sensibles

**3 vulnerabilidades reales arregladas de paso**:
- `content-pillars/route.ts` (GET + POST) no tenía ningún check de auth →
  cualquier user conocido el planId podía leer/escribir. Ahora protegido.
- `content-pillars/[id]/route.ts` (PATCH + DELETE) mismo problema. Arreglado.
- `brand-voice-config/route.ts` (GET + POST) mismo problema. Arreglado.

**Client-side: deliberadamente intacto**
- NO hay hook cliente de permisos.
- NO hay disabled/badges condicionales en los botones.
- NO hay render gating para el owner actual.
- Las 8 tarjetas marketing son exactamente como antes (excepto el refactor
  i18n de la fase anterior). `collectionPlanId` ya se pasa al server, el
  server resuelve owner → allow instantáneamente.

### Why this shape
Filosofía single-user:
- Owner = full acceso siempre. Sin fricciones, sin preguntas, sin UI extra.
- Team members (feature futura): UX binaria por bloque. Si un secundario
  no tiene acceso al bloque X, el bloque X simplemente no aparece en el
  sidebar. Punto. Nada de disabled buttons ni read-only badges.
- La infraestructura server-side instalada hoy soporta exactamente ese
  modelo futuro sin tener que tocar ningún call site.

### Verification
- npx tsc --noEmit clean (exit 0)
- 0 refs a `canGenerateAI`/`canEditMarketing`/`useCollectionPermissions` en
  el código cliente (revertidos durante scope recalibration)
- Migración aplicada y verificada en Supabase proyecto sbweszownvspzjfejmfx
- Defaults permisivos: todas las `permissions` JSONB inicializan con los 13
  flags en `true`

---

## Session 2026-04-10 — Marketing Block i18n Hardening (Fase 4.1 + 4.2 + 4.1-b)

### Fase 4.1-b — Marketing enums full i18n

**Eliminación total de deuda técnica i18n en enums de marketing.** Antes
`src/types/marketing.ts` hardcodeaba labels bilingües (`label` + `labelEs`)
solo para 2 idiomas. Incumplía la regla de 9 idiomas.

**Nuevo diseño:**
- `src/types/marketing.ts` ahora contiene solo type definitions, stable id lists
  y metadata no-textual (colores hex, emojis). Cero labels. EMAIL_FLOW_TEMPLATES
  eliminado (código muerto).
- Nuevo fichero `src/lib/marketing-labels.ts` con helpers i18n-aware:
  `getContentTypeLabel`, `getPlatformLabel`, `getContentStatusLabel`,
  `getContactTypeLabel`, `getContactStatusLabel`, `getPaidPlatformLabel`,
  `getCampaignStatusLabel`, `getAdObjectiveLabel`. Reciben `t` (Dictionary) +
  id tipado, hacen switch exhaustivo (TypeScript fuerza cobertura total).
- Nuevos types fuertes: `PaidPlatform`, `CampaignStatus`, `AdObjective` (antes
  strings sueltos o constantes locales hardcoded en PaidGrowthCard).

**ContentCalendarCard refactorizado:**
- Imports: `CONTENT_TYPE_IDS`, `PLATFORM_IDS`, `CONTENT_STATUS_IDS`,
  `CONTACT_TYPE_IDS`, `CONTACT_STATUS_IDS` + color/emoji records + helpers i18n
- Reemplazados 11 call sites (filters, selects, status overview, list view,
  contact table) para usar helpers i18n
- `MONTH_NAMES` y `WEEKDAY_LABELS` hardcoded en inglés → reemplazados por
  `Intl.DateTimeFormat` con locale del usuario (9 idiomas sin mantener arrays).
  Mapeo `INTL_LOCALE_MAP` (en→en-US, es→es-ES, no→nb-NO, sv→sv-SE, etc.)
- Eliminadas las líneas `Outreach: / Ship: / Post:` hardcoded → i18n con claves
  cortas `outreachShort/shipShort/postShort`

**PaidGrowthCard refactorizado:**
- Constantes locales `PAID_PLATFORMS` y `CAMPAIGN_STATUSES` eliminadas
- Helpers locales `getPlatformColor/Label/getStatusColor` reemplazados por
  funciones tipo-guard `platformColorFor/platformLabelFor/statusColorFor/
  statusLabelFor/adObjectiveLabelFor` que usan el type guard de runtime
  (`isPaidPlatform`, `isCampaignStatus`, `isAdObjective`) + helpers i18n
- Default form value `objective: 'Conversions'` → `'conversions'` (id enum)
- `ad set/ad sets` pluralización → i18n (`adSetSingular/adSetPlural`)
- `Ad Set N` default name → i18n (`adSetDefaultName`)
- Fallback `'Unassigned'` → `t.marketingPage.unassigned` (ya existía)

### i18n expansion
- ~60 claves más añadidas a `marketingPage` en los 9 idiomas:
  - Content types (7): post/story/reel/email/blog/ad/pr
  - Platforms (7): instagram/tiktok/email/website/pinterest/facebook/google_ads
  - Content statuses (6): idea/draft/review/approved/scheduled/published
  - Contact types (5): influencer/media/stylist/buyer/celebrity
  - Contact statuses (6): prospect/contacted/confirmed/shipped/posted/declined
  - Paid platforms (5): meta/tiktok/google/pinterest/other
  - Campaign statuses (5): draft/planned/active/paused/completed
  - Ad objectives (8): brand_awareness/reach/traffic/engagement/video_views/
    lead_generation/conversions/catalog_sales
  - PR date shorts (3): outreach/ship/post
  - Ad set labels (3): singular/plural/default name

### Verification
- 9 idiomas sincronizados (diff = 0 keys)
- `npx tsc --noEmit` clean (exit 0)
- Todos los labels user-facing en marketing ahora pasan por i18n
- **Deuda técnica i18n: 0**

---

## Session 2026-04-10 — Marketing Block i18n Hardening (Fase 4.1 + 4.2)

### Context
Audit del Bloque 4 (Marketing) antes de empezar la fase GTM. Detectados 29 hardcoded strings
en 3 tarjetas: ContentStrategyCard, ContentCalendarCard, GoToMarketCard. Violación directa
de `feedback_i18n-mandatory.md`.

### Changes

**ContentStrategyCard.tsx** (14+ hardcoded removidos)
- Constante `EMAIL_TYPES` con labels eliminada → `EMAIL_TYPE_IDS` + helper `emailTypeLabel(id)`
  que mapea a i18n en render time
- Headings hardcoded → i18n: "Brand Voice", "Personality", "Tone", "Do", "Don't", "Vocabulary",
  "Example Caption", "Content Pillars", "Story (optional)", "All stories", "SKU", "Story",
  "General", "Email Type", "Subject", "General (no story)"
- Button labels → i18n: "Generate Copy", "Generate 5 Templates", "Generate Email",
  "Generate SEO", "Generate Pillars & Voice"
- Empty states → i18n: "No product copy yet...", "No brand voice configured...",
  "No {platform} templates yet", "No {type} templates yet", "No SEO metadata yet..."
- Tab descriptions → i18n: productCopyDesc, socialTemplatesDesc, emailTemplatesDesc, seoDesc,
  pillarsVoiceDesc
- Sub-components ProductCopyRow/SocialTemplateRow/EmailTemplateRow/SeoRow: "Unknown SKU",
  "CTA:", "Best with:", "Alt:", "OG:", "Subject" → i18n
- Collapsed card: "Voice: ...", "N social", "N email" → i18n

**ContentCalendarCard.tsx** (6 hardcoded removidos)
- Detail panel labels: "Hashtags", "Campaign", "Notes" → i18n
- Contact form: "Email" → `t.common.email`, "Notes" → `t.marketingPage.notes`
- Table column: "Followers" → `t.marketingPage.followersLabel`

**GoToMarketCard.tsx** (9 hardcoded removidos + fix bilingüe)
- Commercial action types (Sale/Collab/Campaign/Seeding/Event) → i18n
- Categories bilingüe español-mezclado-en-inglés (Visibilidad/Posicionamiento/Ventas/Notoriedad)
  → i18n proper: actionCategoryVisibility/Positioning/Sales/Awareness
  (los values enum DB se mantienen en mayúsculas español: VISIBILIDAD etc., solo cambian labels)

### i18n
- **50+ claves nuevas** añadidas a `marketingPage` en los 9 idiomas:
  en, es, fr, de, it, pt, nl, no, sv
- Diff de claves verificado: 0 missing across all langs
- `emailTypeLabels` nested → aplanado a 4 claves (emailTypeLaunch/Welcome/CartAbandonment/PostPurchase)
  para no romper el cast `Record<string, Record<string, string>>` que usan varias pages

### Known follow-up (deuda Fase 4.1-b)
- `src/types/marketing.ts` CONTENT_TYPES, CONTENT_STATUSES, CONTACT_TYPES, CONTACT_STATUSES,
  PLATFORMS aún usan `label` + `labelEs` hardcoded (solo 2 idiomas). Refactor requiere tocar
  4 componentes — diferido.

### Verification
- `npx tsc --noEmit` — clean (exit 0)
- 9 idiomas sincronizados, 0 claves huérfanas
- Grep de hardcoded JSX text en /components/marketing/ — clean

---

## Session 2026-04-09 — EvolutionStrip, Legal Framework, Production Workflow, Visual Audit

### SESSION SUMMARY (20+ commits)

Major session: unified navigation (EvolutionStrip), enterprise legal framework, full production/PO workflow, Collection Builder visual audit + legibility overhaul.

---

### 1. EVOLUTION STRIP — Unified SKU Navigation

**EvolutionStrip** replaces the old 4-phase breadcrumb. 6-step visual journey:
`Concept → Sketch → Color & Materials → 3D Render → Prototype → Production`

- `computeEvolutionState()` derives all state from SKU data + `design_phase`
- Thumbnails: reference image, sketch, colored sketch, 3D render, proto photo, production sample
- Active/completed/reachable states with visual indicators
- SKU detail now opens on the **next actionable step** (not always concept)

**Footer navigation — 3 actions:**
- Navigate (view only) — click any completed step
- Validate & Continue — advances step, triggers `advancePhase()` at DB boundaries
- Undo & Go Back — destructive with confirmation, clears step data + reverts `design_phase`

**Sub-step validation in Color & Materials:**
- Footer shows "Continue: Materials" → "Continue: Tech Pack" → "Validate & Continue"
- Prevents skipping Materials or Tech Pack when validating colorways

**Undo fix:** Changed `undefined` to `null` in undoMap — `JSON.stringify` was dropping `undefined` properties, so Supabase never received the clear instruction.

---

### 2. IP PROTECTION IN AI PROMPTS

All sketch generation, colorization, and 3D render prompts now include:
- Brand logo replacement (Nike swoosh, Adidas stripes, etc. → neutral elements)
- Silhouette ~90% faithful to reference but with subtle original variations
- No trademarked outsole patterns, cushioning shapes, or closure systems
- Covers sketch gen (gpt-image-1), colorization (gpt-image-1.5), 3D render (gpt-image-1.5)

---

### 3. ENTERPRISE LEGAL FRAMEWORK

**Terms of Service** — 19 sections, 9 languages:
- Section 6: AI-Generated Content disclaimers (aimily is tool, not co-designer)
- Section 8: User warranties (sole responsibility for IP clearance)
- Section 9: Indemnification (user indemnifies platform)
- Section 10: Limitation of liability (12-month cap, no consequential damages)
- Section 15: Triple jurisdiction (EU/Alicante, US/jury waiver, LATAM)

**Privacy Policy** — 14 sections, 9 languages:
- OpenAI + Perplexity as sub-processors
- CCPA/CPRA for California, LGPD for Brazil, LATAM coverage
- AI data processing section (no training on user content)
- International transfers with SCCs

**ToS Acceptance Gate:**
- Full-screen modal blocking usage until accepted
- Checkbox + "Accept & Continue"
- Stored in `user_metadata` (versioned: `tos_accepted_v2`)
- Versioned key allows re-prompting on material ToS updates

---

### 4. COLLECTION BUILDER VISUAL AUDIT

**Duplicate removal:**
- Removed duplicate "SS27 SLAIZ Collection" header (navbar breadcrumb is enough)
- Merged analytics into carbon bar (single block with "Details" toggle)
- Removed "What's Next" + "Confirm Draft Range Plan" bottom section

**Legibility overhaul:**
- All text min /50 opacity (was /20-/30)
- Labels 10-11px font-medium (was 8-9px font-light)
- Card data values 14px font-medium (was 13px font-light)
- Carbon bar metrics text-xl font-normal (was text-lg font-light)
- "Details" button as visible pill with border
- "Range Plan" title 13px font-semibold (was italic script)

**Unified button styles:**
- All buttons rounded-full (toolbar, view toggles, family filters, group headers)
- Consistent border opacity and hover states

**Family names fix:**
- `availableFamilies` now derived from actual SKU data (not setupData)
- Fixes 0% Family Mix and Spanish names in English UI

**Performance:**
- Removed `refetch()` on SKU detail close (local state already synced)
- Exit confirmation restored but with faster animation (150ms)

---

### 5. PROTOTYPE PHASE REDESIGN

Replaced accordion UI with pill sub-steps matching SketchPhase/ProductionPhase:
- `Sourcing → Proto Tracking` with consistent navigation
- All text boosted to new legibility standards
- Manual sourcing fields + AI sourcing suggestion preserved
- Proto iteration tracking with photos + status + comparison view

---

### 6. PRODUCTION WORKFLOW + PURCHASE ORDER SYSTEM

**Production Phase enhanced with factory order details:**
- 11 new fields in `production_data` JSONB: factory_name, factory_contact, factory_origin, target_delivery_date, order_quantity, unit_cost_final, payment_terms, shipping_method, special_instructions, po_number, po_generated_at
- Factory Order Details form in Production Sample step (pre-fills from sourcing_data)
- Order Summary card in Final Sign-off
- PO number auto-generation: `PO-{FAM}-{NAME}-{TIMESTAMP}`
- Generate PO + Download PO + Approve for Production buttons

**Purchase Order Excel API:**
- `GET /api/purchase-order?skuId=xxx` — single SKU
- `GET /api/purchase-order?planId=xxx` — all approved SKUs
- `GET /api/purchase-order?planId=xxx&factory=yyy` — by factory
- Sheet 1: PO header, factory details, SKU line items, totals, terms
- Sheet 2: Technical specs (BOM per SKU + size run)

**Orders View in Collection Builder:**
- New view mode alongside Pipeline/List/Cards
- Shows only `production_approved` SKUs grouped by factory
- Summary bar: total approved, factories, units, cost
- "Export PO" per factory + "Export All POs"

---

### 7. ENTERPRISE SECURITY

**Audit Log** — DB table `audit_log`:
- Tracks: PO downloads, production approvals, phase advances, factory updates, SKU deletions, collection exports
- Includes user_id, entity_id, metadata JSONB, IP address
- Fire-and-forget (never blocks main flow)
- RLS: users see only own audit entries

**Team Roles** — DB table `team_members`:
- Roles: owner, admin, designer, viewer
- Granular permissions: view_all, edit_design, edit_financial, edit_production, export_po, approve_production
- Default: owner with full access
- Ready for future sub-user access control

---

### 8. OTHER FIXES
- AVIF/WEBP/HEIC → PNG conversion via sharp before OpenAI API calls
- gpt-image-1 for sketch generation (gpt-image-1.5 caused 500 errors)
- Category i18n mapping (CALZADO→Footwear, ROPA→Apparel) in all 9 languages
- Sketch containers: aspect-[4/5] with max-w/h-[92%] for breathing room
- Tech Pack: removed Product Visualization block (moved to 3D Render step)

---

## Session 2026-03-31 — Complete Design Workflow Overhaul

### SESSION SUMMARY (massive session — 30+ commits)

This session completely reworked the SKU Design phase (Sketch → Colorways → Materials → Tech Pack):

---

### 1. NAVIGATION UX — Confirmation Dialogs + Phase Rename

**New components:**
- `src/components/ui/toast.tsx` — ToastProvider + useToast. 4 types (success/error/warning/info), bottom-center.
- `src/components/ui/confirm-dialog.tsx` — ConfirmDialog with danger/warning/neutral variants.

**Confirmations added:**
- Exit SKU editor → "Your progress is saved. This SKU stays in {phase} phase."
- Delete SKU → red confirmation with SKU name
- Clear step → "This will delete all data for this step"
- Revert phase → "The SKU phase will be changed. Data preserved."

**Other navigation fixes:**
- Phase advance validation (checks reference image + pricing before advancing)
- Mobile phase breadcrumb (dropdown)
- Toasts replacing all alert() calls
- Actions bar moved to top (Row 2 under breadcrumb): ← Back to Phase | 🗑 Delete
- Footer cleaned: only the main CTA button (Next/Advance)

**Phase rename:** "Range Plan" → "Concept/Concepto" in all 9 languages + code.

---

### 2. SANZO WADA COLOR SYSTEM

**`src/lib/sanzo-colors.ts`** — 348 palettes from "A Dictionary of Color Combinations" (1934):
- Indexed by contrast (lightness range), temperature (warm/cool/mixed), mood (bold/dramatic/earthy/serene/muted/balanced)
- `formatPalettesForPrompt()` — injects 8 random high-contrast palettes into every color-suggest prompt
- `selectProductPalettes()` — selects palettes with good contrast for product design
- `NEUTRAL_ZONES` — neutral colors for structural zones (outsole, midsole, hardware, laces)
- 60-30-10 rule: dominant (upper 60%) + secondary (midsole 30%) + accent (details 10%)
- Wada's principles: warm/cool tension, saturation contrast, poetic naming

**Integration in `design-prompts.ts` color-suggest:**
- 8 Sanzo Wada reference palettes as foundation for every proposal
- Zone structure enforced: Color 1 (upper) + Color 2 (midsole/contrast) + Color 3 (accents)
- 4 moods required: warm/earthy + cool/modern + bold/statement + neutral/versatile
- Anti-monochrome rules, midsole must contrast with upper

---

### 3. AI COLORIZED SKETCH PROPOSALS

**`/api/ai/colorize-sketch`** — New API route:
- Model: `gpt-image-1` (full, not mini) + quality `medium` ($0.044/image)
- Context-aware 3-step prompt: Identify product → Locate zones → Apply colors
- Passes category, product_name, family for full context
- `is_3d_render` mode with photorealistic conversion prompt (quality `high`, $0.169)
- Prompt emphasizes pixel-perfect fidelity: "DO NOT ALTER THE SKETCH"

**Colorway proposal flow (Step 2 AI mode):**
1. Claude Haiku generates 4 colorway proposals inspired by Sanzo Wada (~$0.001)
2. Cards show immediately with "Colorizing..." spinners
3. gpt-image-1 colorizes sketch for each proposal in parallel ($0.044 × 4 = $0.176)
4. Each image fills in as it completes
5. Accept saves ColorwayZone[] + colorized image as render_url

**Cost comparison:**
- Before (Freepik Mystic × 4): $0.232/session
- After (gpt-image-1 medium × 4): $0.176/session (24% cheaper + more faithful)

---

### 4. UNIFIED WORKSPACE LAYOUT

**Step 1 (Drawing) — unified for Manual/AI:**
- Reference photo always compact on top (both modes)
- Sketch boxes (side + top-down for footwear) same visual layout
- Manual: upload boxes with hover-to-replace
- AI: "Generate Flat Sketch" button (always visible, can regenerate)
- Design notes textarea removed (not needed)

**Step 2 (Colorways) — unified for Manual/AI:**
- Sketch preview prominent (180px left column)
- Manual: textarea "describe your colors" → AI generates 4 colorized proposals based on description
- AI: "Propose Colorways" → 4 colorized proposals (Sanzo Wada)
- Same 2×2 grid of colorized sketch cards in both modes
- Accepted colorways with expandable zone editor (advanced) below

**Step 3 (Materials) — simplified:**
- Table reduced from 5 columns to 3: Zone + Material + Finish
- AI mode: single "Suggest Materials" button auto-fills entire table
- Same layout both modes (sketch sidebar + table)
- No more individual material proposal cards

**Step 4 (Tech Pack):**
- Side profile uses colorized sketch (render_url) instead of B&W
- Numbered callouts removed (never positioned correctly)
- Product Visualization section: colored sketch + 3D render side-by-side
- 3D render on-demand via Freepik Mystic (structure_reference = colorized sketch)

---

### 5. WHAT WAS TRIED AND DISCARDED

- ~~Fabric.js Zone Editor~~ — vectorization quality too poor
- ~~imagetracerjs/potrace/vtracer~~ — all failed on Vercel or produced bad results
- ~~Canvas flood fill (Paint bucket)~~ — complex, fragile, wrong UX
- ~~CSS multiply blend tinting~~ — too crude, no zone intelligence
- ~~Canvas-based SketchColorPreview~~ — CORS issues with data URIs
- ~~gpt-image-1-mini~~ — lost sketch detail, too creative
- ~~gpt-image-1 for 3D renders~~ — not faithful enough, Freepik Mystic is better
- ~~Claude Vision zone detection~~ — unnecessary, user defines zones via colorway
- ~~AI vectorize + detect-zones pipeline~~ — over-engineered for the actual need

---

### 6. FILES CHANGED/CREATED

**New files:**
- `src/components/ui/toast.tsx` — Toast notification system
- `src/components/ui/confirm-dialog.tsx` — Confirmation dialog
- `src/lib/sanzo-colors.ts` — Sanzo Wada color system
- `src/app/api/ai/colorize-sketch/route.ts` — Sketch colorization via gpt-image-1
- `src/app/api/ai/vectorize/route.ts` — Stub (vectorization moved client-side, then removed)
- `src/app/api/ai/detect-zones/route.ts` — Zone detection (used briefly, then replaced)
- `src/lib/zone-detection.ts` — Zone detection helpers (server-side)

**Deleted files:**
- `src/components/planner/sku-phases/ZoneEditor.tsx` — Paint bucket editor
- `src/components/planner/sku-phases/useCanvasHistory.ts` — Undo/redo hook
- `src/components/planner/sku-phases/SketchColorPreview.tsx` — CSS tint component
- `src/lib/canvas-utils.ts` — Flood fill helpers
- `src/types/imagetracerjs.d.ts` — Type declarations

**Major modifications:**
- `src/components/planner/sku-phases/SketchPhase.tsx` — Complete rewrite of Steps 1-4
- `src/components/planner/SkuDetailView.tsx` — Navigation, confirmations, mobile breadcrumb
- `src/lib/ai/design-prompts.ts` — Sanzo Wada integration in color-suggest
- `src/app/api/ai/freepik/render/route.ts` — structure_strength tuning
- `src/app/layout.tsx` — ToastProvider
- All 9 i18n files — new keys for confirmations, zone editor, colorization

**Dependencies:**
- Added: `q-floodfill` (removed same day), `potrace` (removed same day), `fabric` (removed same day), `imagetracerjs` (removed same day)
- Net change: none — all experimental deps were added and removed

---

### 7. CURRENT STATE (end of session)

```
Step 1 (Drawing):
  Manual: upload side + top-down sketches
  AI: generate from reference photo via gpt-image-1
  Unified layout, reference photo always visible

Step 2 (Colorways):
  Manual: describe colors → 4 AI-colorized proposals ($0.044/ea)
  AI: Sanzo Wada proposals → 4 AI-colorized proposals ($0.044/ea)
  Accept saves ColorwayZone[] + colorized image

Step 3 (Materials):
  Manual: fill Zone + Material + Finish table
  AI: one-click auto-fill entire table
  Simplified from 5 columns to 3

Step 4 (Tech Pack):
  Header with financials + notes
  Side profile (colorized) + top-down (B&W)
  BOM table (zones × materials)
  3D render on-demand via Freepik Mystic (€0.058)

Navigation:
  Top bar: Exit + SKU name + phase breadcrumb + actions
  Footer: only CTA button
  Confirmations on all destructive actions
  Mobile breadcrumb dropdown
```

---

---

## Session 2026-03-30 — Zone Design System + Dual-View Sketches + Tech Pack + Render Pipeline
- Click "Back" now shows dialog: "Exit SKU editor? Your progress is saved automatically. This SKU will remain in the {phase} phase."
- Two options: "Exit" / "Keep editing"

**Delete SKU confirmation:**
- Now requires confirmation: "Delete this SKU? This will permanently delete {name} and all its design data, colorways, and renders."
- Danger variant with red styling

**Clear step confirmation (SketchPhase):**
- Clear Sketch/Colorways/Materials now shows: "Clear {step}? This will delete all data for this step."
- Prevents accidental data loss from tiny X button

**Revert phase confirmation:**
- "Back to {phase}" now shows warning: "The SKU phase will be changed. Your data will be preserved."

**Phase advance validation:**
- Advancing from Concept checks: reference image, pricing (PVP)
- Shows warning with option to "Advance anyway" or "Stay and complete"

**Mobile phase breadcrumb:**
- Dropdown menu on mobile (md:hidden) showing all phases with checkmarks
- Users on mobile can now navigate between phases

**Toast notifications replacing alert():**
- Sketch generation failures → toast error
- Render generation failures → toast error
- Phase advanced → toast success
- Step cleared → toast info

### Phase Rename: Range Plan → Concept

- `skuPhases.rangePlan` → "Concept" (EN), "Concepto" (ES), "Konzept" (DE), "Concetto" (IT), "Concept" (FR/NL), "Conceito" (PT), "Konsept" (NO), "Koncept" (SV)
- `rangePlan.label` → same translations in all 9 languages
- CollectionBuilder pipeline fallback: 'Concept'
- Excel export: 'Concept' in DESIGN_PHASE_LABELS
- Added `concept` key as alias in skuPhases

**New i18n keys (all 9 languages):**
- exitTitle, exitDescription, exitConfirm, exitCancel
- deleteTitle, deleteDescription, deleteConfirm
- revertTitle, revertDescription, revertConfirm, revertedTo
- phaseAdvanced, advanceIncomplete, advanceAnywayDesc, advanceAnyway, stayAndComplete
- warnNoReference, warnNoPricing, completedLabel, backTo
- clearStepTitle, clearStepDesc, clearConfirm, stepCleared, sketchFailed
- drawing, modeFree

**Files modified:** SkuDetailView.tsx, SketchPhase.tsx, CollectionBuilder.tsx, collection-export/route.ts, layout.tsx, + 9 i18n files
**Files created:** toast.tsx, confirm-dialog.tsx

---

## Session 2026-03-30 — Zone Design System + Dual-View Sketches + Tech Pack + Render Pipeline

### MASSIVE SESSION — Full Design Workflow Overhaul

**Dual-View Footwear Sketches:**
- From Reference: OpenAI gpt-image-1 edits × 2 in parallel (side profile + top-down)
- Same reference photo, different angle prompts. Cost: 2x OpenAI calls
- Side profile = exterior lateral pointing right. Top-down = bird's eye
- Both views persist: `sketch_url` (side) + `sketch_top_url` (top-down)
- Layout: reference thumbnail left, two sketch boxes right (grid-cols-2)

**Professional Tech Pack (Step 4 — complete rewrite):**
- Factory spec sheet layout with white bg, border, sections
- Header: SKU name, family, drop, category, PVP/COGS, margin
- Two sketch views side-by-side with numbered callouts (①②③) on zone positions
- BOM table: #, color swatch, zone, Pantone, material, composition, weight, finish
- Callout numbers match table rows

**Zone-Based Color-Up Sheet (Step 2) + BOM (Step 3):**
- Colorways expand to show zones with native color picker per zone
- Default zones per category: CALZADO (9), ROPA (8), ACCESORIOS (6)
- material_zones JSONB on collection_skus
- zones JSONB on sku_colorways

**Render Pipeline Upgrades:**
- Multi-angle support: front/3-4/side/back with auto structure_strength
- Engine magnific_sharpy, creative_detailing 50, styling.colors from hex
- Zone-specific prompts: "Upper: black nubuck (tumbled)" instead of "premium materials"
- Default angle: three_quarter for all categories (classic e-commerce shot)

**UX Fixes:**
- SKU detail via createPortal (fixes z-index/backdrop-filter issues)
- Pill toggle (Sketch/AI) always visible on cards
- Revert phase: back from Design→Range Plan or Proto→Design
- Clear step (X) to undo confirmed steps within SketchPhase
- Phase transitions: no overlay, direct navigation (overlay only for "Completed")
- First colorway auto-expanded to show zone editor
- SKU categories corrected: sneakers now CALZADO not ROPA

**DB migrations:** render_urls, render_urls, sketch_top_url, material_zones, zones (sku_colorways)
**New file:** src/lib/product-zones.ts
**i18n:** render/angle + zone/BOM keys in all 9 languages

---

## Session 2026-03-30 — Zone-Based Color-Up Sheet + BOM + Multi-Angle Renders

### af1cdb2 — feat: zone-based Color-Up Sheet and BOM for professional design workflow

**Color-Up Sheet (Step 2 — complete rewrite):**
- Expandable colorway cards with zone-by-zone color assignment
- Native `<input type="color">` picker per zone — click swatch to open
- Default zones per category: CALZADO (Upper, Tongue, Lining, Midsole, Outsole, Laces, Heel Counter, Eyelets, Branding), ROPA (Body, Lining, Collar, Cuffs, Closures, Stitching, Trim, Branding), ACCESORIOS (Body, Hardware, Lining, Strap, Trim, Branding)
- Zones editable (rename), removable (X), custom zones addable
- Pantone reference + notes per zone
- Backward compat: hex_primary/secondary/accent auto-synced from first 3 zones
- Color strip preview in collapsed colorway header

**BOM / Materials (Step 3 — complete rewrite):**
- Zone-based material table matching colorway zones
- Fields: material, composition, weight/thickness, finish
- Color dot from colorway shown alongside each zone
- Empty zones = "factory discretion" note
- Data stored in `material_zones` JSONB on `collection_skus`

**Tech Pack (Step 4 — enhanced):**
- Unified Color-Up + BOM table: color swatch + zone name + Pantone + material + finish
- Fallback to legacy materials if no zone data

**Render AI prompt upgrade:**
- Passes `colorZones` and `materialZones` to build rich per-component descriptions
- e.g. "Upper: black nubuck (tumbled), Midsole: white EVA foam" instead of "premium materials"

**DB:** `zones` JSONB on `sku_colorways`, `material_zones` JSONB on `collection_skus`
**New file:** `src/lib/product-zones.ts` — zone templates by category
**i18n:** 11 zone/BOM keys in all 9 languages

---

## Session 2026-03-30 — Multi-Angle Renders + Mystic Optimizations + Sliding Pill

### 1c4e530 — feat: multi-angle renders with Mystic optimizations + sliding pill toggle

**Render API Upgrade (`/api/ai/freepik/render`):**
- New `angle` param: `front` (strength 85), `three_quarter` (70), `side` (50), `back` (40)
- Engine: `magnific_sharpy` for max texture detail on materials/stitching
- `creative_detailing: 50` (up from default 33) for better fabric/construction detail
- `styling.colors`: injects actual colorway hex codes to influence color accuracy
- Still 1 image per call (~€0.058/render 1K) — not 4x batch

**SketchPhase UI — Angle Selector:**
- 4 angle buttons (Front / 3/4 / Side / Back) with green dot indicator for generated angles
- Thumbnail gallery when multiple angles exist
- Saves to `render_urls` (JSONB) + backward-compat `render_url`

**CollectionBuilder Cards — Sliding Pill:**
- Replaced confusing "AI 3D" / "ORIGINAL" button with `SkuCardPill` component
- Sliding indicator pill (Sketch ↔ AI) matching SegmentedPill design system
- Appears on hover if no render, always visible if render exists
- Sparkles icon + spinner during generation

**DB:** `render_urls` JSONB column added to `collection_skus`
**i18n:** 11 render/angle keys added to all 9 languages

---

## Session 2026-03-30 — Design Unification + Freepik Migration + SKU Render Pipeline

### SESSION SUMMARY
Massive session covering design unification, navigation architecture, SKU workflow improvements, and AI provider migration from Fal.ai to Freepik.

**Design System Unification:**
- Navbar: cleaned for logged-in users (removed Precios, logout), logo bigger (h-10), avatar rounded-full, h-16 height
- My Collections: hero carbon with stats → simplified to data-only. "Nueva Colección" opens modal with two workflow options (step-by-step / brief AI). Deadlines removed (redundant).
- Builder 4 Blocks: cards compacted (no min-h, p-8), CTA inline centered, grid max-w-5xl
- SegmentedPill view slider (Bloques/Calendario/Presentación) replaces old tab buttons
- Calendar: header removed, maximized screen space
- Sidebar: goes to top-0, navbar shifts right with sidebarWidth prop
- Collection name editable inline in navbar breadcrumb (click to rename)

**SKU Workflow Improvements:**
- Simplified modes: 3 modes (Free/Assisted/AI) → 2 modes (Manual/AI). AI mode combines reference upload + AI proposal.
- Sourcing regions now selectable (click to select, saves to SKU)
- Completed SKUs now open Production view instead of blank page
- SKU detail modal: full-screen z-70, scrollable content
- Size run: gender selector (Women/Men/Unisex), auto-fill with industry curves, footwear sizes 35-46
- render_url column added to collection_skus table

**AI Provider Migration — Fal.ai → Freepik:**
- Fal.ai renders were unusable (tested Flux 2 Pro, Kontext, ControlNet Canny, ControlNet Lineart — none preserved sketch silhouette)
- Freepik Mystic API with structure_reference + structure_strength:80 produces excellent results
- New routes: /api/ai/freepik/render (Mystic, €0.058/img 1K) and /api/ai/freepik/sketch (Flux Dev, €0.01/img)
- Fal.ai kept as legacy code but no longer called from active flows
- FREEPIK_API_KEY added to .env.local and Vercel
- Freepik MCP server configured in .mcp.json for direct API testing
- Cost per collection (20 SKUs): €1.36 total (sketches €0.20 + renders €1.16)

**Presentation Fixes:**
- Colors render correctly (extractHex function)
- Brand Identity gets own slide
- Consumer slide handles long profiles
- Product Portfolio paginated (10 SKUs/slide)
- PDF print hides sidebar/navbar
- PPTX uses base64 for edge compatibility

**Translation:**
- SS27 SLAIZ collection fully translated ES→EN in Supabase (creative, merchandising, SKUs)

**Files modified (30+):** globals.css, tailwind.config.js, navbar.tsx, my-collections/page.tsx, CollectionOverview.tsx, merchandising/page.tsx, brief-to-collection/page.tsx, pricing/page.tsx, account/page.tsx, SketchPhase.tsx, PrototypingPhase.tsx, SkuDetailView.tsx, CollectionBuilder.tsx, shared.tsx, InlineTimeline.tsx, presentation/page.tsx, WizardSidebar.tsx, WizardLayout.tsx, design-prompts.ts, product-render/route.ts, + 8 brand section files, + 9 i18n files, + 2 new Freepik routes

---

## Session 2026-03-26 — Design System Unification (Creative Synthesis as Gold Standard)

### SESSION SUMMARY
Major visual unification across the entire app. Creative Synthesis confirmed as the gold standard. 8 phases executed:

**Phase 0 — Design Tokens:** `--radius` 4px→6px, `--success`/`--warning` CSS vars added, font minimum raised (text-[9px]/text-[10px] now render at 14px), `success`/`warning` added to Tailwind config.

**Phase 1 — My Collections:** Complete redesign. Stats + deadlines now in a hero `bg-carbon` section (Creative Synthesis pattern). Collection cards: compact with `shadow-sm`, `border-carbon/[0.06]`, entire card is a link. CTA buttons changed from full-width `bg-carbon` to whole-card clickable. Status badges now `rounded-full`.

**Phase 2 — Builder 4 Blocks:** Cards: removed `min-h-[420px]`, reduced padding from `p-12` to `p-8`. CTA: `inline-flex` centered instead of full-width. Grid centered with `max-w-5xl`. Progress indicator simplified to text percentage.

**Phase 3 — Merchandising Overview:** Same treatment — compact cards (removed `min-h-[320px]`), inline CTA buttons, `shadow-sm` + `hover:shadow-md`. Expanded card padding reduced.

**Phase 4 — Brand Workspace:** Rewrote all 8 section files in `src/components/brand/sections/`. Replaced 102 gray/teal class occurrences with design system tokens (gray-100→carbon/[0.06], teal-500→carbon/40, etc.).

**Phase 5 — Brief-to-Collection:** Added `<Navbar variant="workspace-dark" />` + sub-bar with "← Collections" back link + step indicators. User now sees aimily logo/nav throughout the flow. Padding adjusted for dual-bar.

**Phase 6 — Pricing:** Replaced all hardcoded `#282A29` with `text-carbon`/`bg-carbon`. Changed `rounded-2xl` → `rounded-md`, `border-2` → `border`. Headlines from `font-bold` to `font-light tracking-tight`.

**Phase 7 — Fixes:** Account page borders (gris→carbon), Navbar workspace variant (bg-white→bg-crema), SKU shared.tsx hardcoded colors (#c77000→warning, #2d6a4f→success, #A0463C→error).

**Files modified:** globals.css, tailwind.config.js, my-collections/page.tsx, CollectionOverview.tsx, merchandising/page.tsx, brief-to-collection/page.tsx, pricing/page.tsx, account/page.tsx, navbar.tsx, shared.tsx, + 8 brand section files.

---

## Session 2026-03-26 — Excel Export: Collection Builder Mirror + Collection Overview Sheet

### SESSION SUMMARY
Complete rewrite of the Excel export (`/api/collection-export/route.ts`) to mirror the Collection Builder's actual UI. Three major changes: (1) Range Plan sheet now replicates the Builder's List View exactly — grouped by family with header rows, columns in Builder order (Product/Type/COGS/PVP/Units/Sales/Margin), type badges with color, AutoFilter enabled. (2) Cards View + Collection Summary merged into a single "Collection Overview" sheet — now the FIRST tab. Top section has collection name/season/launch, then Families table (left) alongside Financial Overview (right), then SKU cards below grouped by family. (3) Card borders applied AFTER mergeCells to fix ExcelJS bug where merges wiped borders.

---

### 1f88be5 — fix: card borders applied AFTER mergeCells
**Problem:** ExcelJS silently drops border styles when `mergeCells()` runs after border assignment.
**Fix:** Moved the border loop to execute after all cell content, fills, and merges are complete. Borders now use `thin` style with `#D0D0D0`.

### 1bbb12b — feat: merge Collection Summary + Cards into "Collection Overview"
**Sheet order changed:** Collection Overview → Range Plan → Calendar (was: Range Plan → Calendar → Summary → Cards)
**Layout of Collection Overview sheet:**
- Column A empty + Row 1 empty (breathing room)
- Row 2: Collection name (large, bold)
- Row 3: Season + Launch date
- Row 5: Side-by-side — FAMILIES table (left cols B-G) | FINANCIAL OVERVIEW (right cols I-N)
  - Families: Family name, SKU count, Avg PVP, Avg Margin, Revenue + total row
  - Financials: Revenue Target, Total Units, Avg Price, Target Margin, Total COGS, Gross Profit
- Below: Cards grouped by family, 4 per row, 3 cols per card
  - Each card: image area (5 rows) → phase badge (CONCEPT/SKETCH/PROTO) → SKU name → PVP/COGS/Units → Margin/Sales → Type badge
- Removed separate "Collection Summary" sheet (content merged into Overview)

### cff352d — feat: Excel export mirrors Collection Builder list + cards views
**Range Plan sheet (List View):**
- Grouped by family with header rows (family name + count + total revenue)
- Columns match Builder's List View order: Product → Type → COGS → PVP → Units → Sales → Margin
- Extra Excel-useful columns: Family, Channel, Drop, Phase, Notes
- Type badges with color (REVENUE=#9c7c4c, IMAGE=#7d5a8c, ENTRY=#4c7c6c)
- AutoFilter enabled on all columns for Excel filtering
- Grand total row at bottom

**Cards View sheet:**
- 6 cards per row (later changed to 4)
- Grouped by family with header (name + SKU count + revenue)
- Phase badge colors matching Builder
- Added `sketch_url`, `reference_image_url`, `production_sample_url` to SkuRow type

### 3396a02 — feat: Refresh Creative button + Cards View Excel sheet (previous session)

---

## Session 2026-03-19 — SKU Lifecycle Consolidation: All Workspace Features Inside Modal

### SESSION SUMMARY
Massive consolidation of Design & Development. The 4 separate workspace pages (Design, Prototyping, Sampling, Production) are now fully embedded inside the SKU modal in the Collection Builder. Each SKU lives its complete design-to-production lifecycle within the modal. The plan from `ethereal-doodling-cook.md` was executed. SketchPhase rebuilt as a 4-step creative flow with AI-generated flat sketches. Dashboard rebuilt as 3-col analytical layout. SKU cards redesigned with dynamic phase progress and contextual CTAs.

---

### Step 0: SkuLifecycleContext + Shared Components (3ea7c1b)

**New architecture:** CollectionBuilder calls all hooks at collection level, wraps the modal in `<SkuLifecycleProvider>`. Modal phases consume the context and filter by `sku.id`. No N+1 fetches.

**Files created:**
- `src/components/planner/sku-phases/SkuLifecycleContext.tsx` (60 lines) — bundles colorways, reviews, designData, orders
- `src/components/planner/sku-phases/PhaseAccordion.tsx` (42 lines) — reusable collapsible section
- `src/components/planner/sku-phases/shared.tsx` (184 lines) — ImageUploadArea, MetricCell, SizeRunEditor
- `src/components/planner/sku-phases/AiGenerateButton.tsx` (50 lines) — calls `/api/ai/design-generate`
- `src/components/planner/sku-phases/RangePlanPhase.tsx` (123 lines) — reference image + financials + attributes

**CollectionBuilder.tsx modified:**
- Added hooks: `useColorways`, `useSampleReviews`, `useWorkspaceData('design')`, `useProductionOrders`
- Wraps `<SkuDetailView>` with `<SkuLifecycleProvider value={...}>`

**SkuDetailView.tsx** restructured as thin shell (207 lines):
- Header with SKU name, family, type badge
- Phase timeline stepper: Range Plan → Sketch → Prototyping → Production → Completed
- Scrollable content area delegates to phase sub-components
- Footer: Delete SKU + "Advance to [next phase]" CTA
- Phase advance saves `design_phase` to DB

---

### Step 1: SketchPhase — 4-Step Creative Flow (924461b → 6b16a39 → 7c60701)

**New file:** `src/components/planner/sku-phases/SketchPhase.tsx` (419 lines)

**4-step horizontal stepper** (all steps on same screen, content changes on right):
1. **Sketch** — Free upload / Assisted (AI suggestions + upload) / AI Proposal
2. **Colorways** — Free (manual hex) / Assisted / AI Proposal (generates 4 named colorways)
3. **Materials** — Free (text input) / Assisted / AI Proposal (generates material BOM)
4. **Tech Pack** — Summary of all confirmed steps, ready for prototyping

**3 input modes per step** (Free / Assisted / AI Proposal):
- **Free**: Manual input (upload, hex pickers, text fields)
- **Assisted**: AI generates suggestions, user edits before confirming
- **AI Proposal**: One-click, AI generates everything based on SKU context

**AI Proposal for Sketch** (c888b09):
- Calls `/api/ai/design-generate` type `sketch-directions`
- Then calls **fal.ai Flux 2 Pro** (`fal-ai/flux-pro/v1.1-ultra`) to generate a visual flat sketch
- Prompt: professional fashion flat sketch, technical illustration, front view, clean white background
- Result: AI-generated flat sketch image displayed in the modal
- User can confirm or regenerate

**AI Proposal for Colorways**:
- Calls `/api/ai/design-generate` type `colorway-ideas`
- Returns 4 named colorways with hex codes, descriptions, commercial roles
- Each shows color swatches, user can edit hex values before confirming

**AI Proposal for Materials**:
- Calls `/api/ai/design-generate` type `material-suggestions`
- Returns material recommendations based on product type and price point

**Confirmed steps** tracked via local state, auto-confirmed if data exists (e.g., `sku.sketch_url` confirms step 0).

---

### Step 2: PrototypingPhase — Sourcing + Proto Review (abf9608 → 74fd0c7)

**New file:** `src/components/planner/sku-phases/PrototypingPhase.tsx` (450 lines)

**2-step accordion flow:**
1. **Sourcing** — Free (manual factory details) / Assisted / AI (auto-suggest factories)
   - Factory name, location, lead time, contact, notes
   - Sketch reference shown as banner at top
2. **Proto Tracking** — Unlimited iterations
   - Photo upload per iteration
   - Status: pending → issues → approved → rejected
   - 4 note fields: fit, construction, material, rectification
   - Star rating (1-5)
   - Issues list with severity and resolved checkbox

**Data**: `sku.proto_iterations` (JSONB array on `collection_skus`)

---

### Step 3: ProductionPhase — Color + Fit Validation + Sign-off (abf9608)

**New file:** `src/components/planner/sku-phases/ProductionPhase.tsx` (337 lines)

**4-step accordion flow:**
1. **Color Validation** — Compare production colors with approved colorways, approve/issues status
2. **Fit Validation** — Measurement table (5 points: chest, waist, hip, length, sleeve), spec/actual/tolerance/pass, fit notes
3. **Production Sample** — Photo upload + size run editor + financial recap (MetricCell grid)
4. **Final Sign-off** — Requires both color + fit approved. Approval gate.

**Data**: Uses `SkuLifecycleContext` for colorways, local state for validation status (to be migrated to `sample_reviews` DB).

---

### Step 4: Dashboard Rebuild — 3-Column Analytics (85c1818)

**Collection Builder dashboard** restructured as 3-column analytical layout:

1. **Financial Overview** (dark carbon card, 10 KPIs in grid): Revenue, COGS, Gross Profit, WS Value, DTC Margin, WS Margin, Avg Price, SKUs, Families, Total Units
2. **"How Aimily built your collection"** (white card, 3-col grid):
   - **Family Mix**: horizontal progress bars with percentages
   - **Segmentation Mix**: SVG donut chart (Revenue gold, Image plum, Entry sage) with legend + target comparison
   - **Design Progress**: horizontal bars showing SKUs per phase (Concept, Sketch, Proto, Production, Complete) — NEW

---

### Step 5: SKU Cards Redesign (multiple commits)

**Visual redesign of SKU cards in cards view:**

- **Image area**: `aspect-[4/5]` (taller), white bg, `object-contain p-2` (sketches display nicely, not cropped)
- **Phase progress bar**: bottom overlay on image area, colored by phase (gold→plum→sage→carbon), with phase label
- **Metrics**: 3 rows of 2 columns (PVP, COGS | Units, Margin | Sales + type badge), bigger text (`text-sm`)
- **Dynamic CTA**: rounded-full pill at bottom, text changes per phase:
  - Range Plan (no image): "Add Reference Image"
  - Range Plan (has image): "Start Sketch"
  - Sketch (no sketch): "Upload Sketch"
  - Sketch (has sketch): "Define Colorways"
  - Prototyping: "Review Proto"
  - Production: "Validate Sample"
  - Completed: "View Details"
- **Grid**: `grid-cols-2 md:3 lg:4 xl:5 2xl:6`
- **Display image logic**: shows most advanced phase image (production_sample > last proto > sketch > reference)

**i18n keys added** for all CTA labels: `ctaAddReference`, `ctaStartSketch`, `ctaUploadSketch`, `ctaDefineColors`, `ctaReviewProto`, `ctaValidate`, `ctaCompleted` — all 9 languages.

---

### Step 6: Layout & Sidebar Fixes (6458707 → 6d23fce → c31fb48)

- **Sidebar collapsed by default** (`useState(true)`) — content gets full width on load
- **No max-w-6xl** on content container — full-width layout
- **Logo fully hidden** when collapsed (was showing clipped image)
- **WizardSidebar width**: still w-48 expanded / w-[52px] collapsed

---

### Files Summary

| Action | File | Lines |
|--------|------|-------|
| New | `sku-phases/SkuLifecycleContext.tsx` | 60 |
| New | `sku-phases/PhaseAccordion.tsx` | 42 |
| New | `sku-phases/shared.tsx` | 184 |
| New | `sku-phases/AiGenerateButton.tsx` | 50 |
| New | `sku-phases/RangePlanPhase.tsx` | 123 |
| New | `sku-phases/SketchPhase.tsx` | 419 |
| New | `sku-phases/PrototypingPhase.tsx` | 450 |
| New | `sku-phases/ProductionPhase.tsx` | 337 |
| Modified | `SkuDetailView.tsx` (thin shell) | 207 |
| Modified | `CollectionBuilder.tsx` (hooks + provider + dashboard + cards) | 1,274 |
| Modified | `WizardSidebar.tsx` (collapsed default) | 355 |
| Modified | `PlannerDashboard.tsx` (minor) | — |
| Modified | All 9 i18n files (+7 CTA keys each) | — |

**Total new code in sku-phases/**: 1,665 lines

---

### Architecture Decisions Made

1. **SkuLifecycleContext pattern**: Collection-level data fetched once, filtered per-SKU in modal. Prevents N+1 queries.
2. **Thin shell SkuDetailView**: Only 207 lines. All phase complexity delegated to sub-components.
3. **3 input modes** (Free/Assisted/AI): Every creative step offers manual, guided, or fully-automatic path.
4. **fal.ai for sketch generation**: Flux 2 Pro model generates flat fashion sketches from text prompts.
5. **Phase progress on cards**: Users see at a glance where each SKU is in the lifecycle.
6. **Dynamic CTA**: Cards tell users exactly what action to take next for each SKU.
7. **Sidebar collapsed by default**: Maximizes content area, especially important for the dense dashboard.

---

### Pending / Known Issues from this Session

- **PrototypingPhase sourcing**: AI factory suggestions not yet connected to a real data source
- **ProductionPhase validation**: Color + fit status stored in local state, not yet persisted to `sample_reviews` DB
- **Tech Pack step**: Currently a summary view, no PDF generation yet
- **Batch workspace pages still exist**: `/collection/[id]/design`, `/prototyping`, `/sampling`, `/production` — still functional as "batch views", not yet deprecated
- **One uncommitted change**: CollectionBuilder.tsx — SKU card image area `aspect-[4/5]` + white bg + uniform `object-contain p-2`

---

## Session 2026-03-18 (late) — SKU Design Lifecycle + Pipeline View + Confirm Unlock

### Confirm Draft Range Plan → Unlocks Design Block (654fcc8)
- `handleConfirmDraft()` now marks `rp-5` + `rp-6` milestones as completed via `useTimeline()`
- `rp-6` is the `unlockWhen` dependency for Design block → sidebar recalculates and Design unlocks
- Creative block progress fixed: 67% → 100% by mapping `br-2` (Logo) and `br-4` (Packaging) to `brand-dna` and `vibe` blocks in sync-progress
- Sidebar logo: h-5 → h-7 (20px → 28px)
- All PlannerDashboard strings moved to i18n (`rangePlan` section, 9 languages)

### SKU Design Lifecycle — 4-Phase Pipeline (09eb523)

**New data model**: DB migration added 5 columns to `collection_skus`:
- `design_phase` (text): `range_plan → sketch → prototyping → production → completed`
- `sketch_url` (text): design sketch image
- `proto_iterations` (jsonb): array of `{id, images[], notes, status, created_at}`
- `production_sample_url` (text): final production sample photo
- `production_approved` (boolean): approval flag

**SkuDetailView** (`src/components/planner/SkuDetailView.tsx`) — replaces old modal:
- Full-width slide-over panel (~80% width) with `slideInRight` animation
- Visual phase timeline at top: Range Plan → Sketch → Proto → Production → Completed
- Active phase highlighted, completed phases show checkmarks, current phase pulses
- "Advance to [next phase]" CTA in footer advances SKU through lifecycle
- "Delete SKU" action in footer

**4 phase-specific content areas:**
- **Range Plan**: Reference image upload + financial summary (PVP, COGS, margin, units, etc.) + attributes (channel, origin, role) + notes
- **Sketch**: Side-by-side sketch upload + reference comparison + design notes
- **Prototyping**: Sketch reference + unlimited proto iterations (photos, notes, status: pending/issues/approved/rejected) + add iteration form
- **Production**: Production sample upload + size run editor (final quantities, warns if != planned) + financial recap + approval state

**Pipeline View** in Collection Builder:
- New "Pipeline" toggle (Kanban icon) alongside List/Cards
- 5 columns: Range Plan → Sketch → Prototyping → Production → Completed
- Each column shows SKU cards with the most relevant image for that phase
- Type badges (REV/IMG/ENT), family, price

**Sub-components**: `ImageUploadArea`, `MetricCell`, `ProtoStatusBadge`, `ProtoIterationCard`, `SizeRunEditor`, `PipelineView`

**i18n**: `skuPhases` section with 49 keys across 9 languages

### Files Created
- `src/components/planner/SkuDetailView.tsx` — 500+ lines, 4-phase SKU detail

### Files Modified
- `src/components/planner/CollectionBuilder.tsx` — replaced modal, added Pipeline view
- `src/hooks/useSkus.ts` — added `DesignPhase`, `ProtoIteration` types + new SKU fields
- `src/app/api/collection-timelines/sync-progress/route.ts` — added br-2, br-4 mappings
- `src/components/planner/PlannerDashboard.tsx` — confirm unlocks design via timeline context
- `src/components/wizard/WizardSidebar.tsx` — logo h-7
- `src/styles/globals.css` — `slideInRight` animation
- All 9 i18n files — `rangePlan` + `skuPhases` sections

---

## Session 2026-03-18 — COMPLETE: Merchandising Overhaul + Collection Builder + Range Plan

### SESSION SUMMARY
Full overhaul of Block 2 (Merchandising), creation of the data bridge to Collection Builder, auto-generation of SKUs with creative context, and complete redesign of the Collection Builder into a Range Plan tool with industry-standard COGS pricing. Ended with educational onboarding flow guiding users from Range Plan → Design & Development.

---

### Merchandising Block (Bloque 2) — Complete overhaul

**Families card:**
- AI Proposal mode: zero-input, reads creative brief, proposes families by market opportunity
- Priority badges: Key Family / Strategic / Nice to have (clickable to cycle)
- Max 5 families from AI, unlimited manual add
- Same output format as Assisted (real family names, not abstract strategies)

**Pricing card:**
- Reference Brands field (optional) — Perplexity researches real retail prices
- Pricing Thesis: AI explains positioning logic before generating prices ("Positioning between ALD and RL premium, target ASP €180-450")
- Rationale per subcategory visible under each price row
- AI Proposal infers tier from brand DNA + consumer + competitors (no hardcoded benchmarks)

**Channels & Markets card:**
- DTC/Wholesale with Digital/Physical sub-toggles (2-column grid)
- Market cards with color-coded entry points:
  - DTC E-commerce: warm sand (#f0ebe3)
  - Social Commerce: golden caramel (#f2ede8)
  - Wholesale/Key Accounts: cool slate (#eef0f3)
  - Showroom/Flagship: soft lavender (#eeecf2)
- Entry points as card layout (label badge on top, detail below)
- Selectable markets with checkbox + counter
- AI filters recommendations by digital/physical config

**Budget & Financials card:**
- 10 growth model scenarios (researched from real brands):
  DTC-First Bootstrap (Axel Arigato), Wholesale-Led (Jacquemus), Community-Driven (Holzweiler/Ganni), Quiet Luxury (COS/The Row), Collab & Hype (ALD), Digital Native (Pangaia), Accessible Premium (Sandro/Maje), Artisan Craft (HEREU), Marketplace (SSENSE/Farfetch), Investor-Backed Blitz
- Cards with accent bar, revenue badge, metric pills in warm palette
- AI Proposal auto-selects best model with risks/advantages/fine-tuning

**Celebration overlay** when all 4 cards validated

**AI Proposal copy** consistent across all 4 cards: "Aimily will analyze [inputs] to [output]"

**i18n**: All strings in 9 languages. Hook configured to check before push.

---

### Collection Builder → Range Plan

**Data Bridge** (`product/page.tsx`):
- Server-side `bridgeMerchToSetup()` reads merchandising workspace data
- Transforms into SetupData: salesTarget, families, pricing, margins, type segments, seasonal distribution
- Persists to `collection_plans.setup_data` on first load

**Auto-generation (wow moment):**
- When user enters with 0 SKUs, animated overlay with educational context
- "What happens next" section explains: Review → Confirm Draft → Design collaborates
- AI generates ALL SKUs in batches of 20 via `/api/ai/generate-skus`
- Each batch gets proportional share of sales target
- Batch insert via `/api/skus/batch` endpoint
- Creative context passed: vibe, brand DNA, consumer profiles, trends
- Result: SKU names reflect the collection ("Montserrat Camp Collar Shirt", "Calella Woven Leather Loafer", "Tossa Terracotta Linen Shorts")

**Industry-standard COGS pricing:**
- `cost` field = COGS (production cost: materials + labor + packaging)
- Formula: COGS ≈ PVP / 5.5 (markup chain: COGS ×2.5 = Wholesale ×2.2 = PVP)
- Example: PVP €185 → COGS €34 → Wholesale €85
- Financial Overview shows: Revenue, COGS, WS Value, DTC Margin (~82%), WS Margin (~60%)

**Financial Overview** — dark carbon background:
- 7 metrics: Revenue, COGS, WS Value, DTC Margin, WS Margin, Avg Price, SKUs

**"How Aimily built your collection":**
- Family Mix: horizontal bars with full names + percentages
- Segmentation Mix: single donut chart (Revenue/Image/Entry) with legend
- Colors: Revenue #9c7c4c (gold), Image #7d5a8c (plum), Entry #4c7c6c (sage)

**Range Plan** (renamed from "SKU List"):
- Editorial header: "Range *Plan*" with Add SKU button + List/Cards toggle
- Both views grouped by family with rounded pill headers
- Family filter pills in list view
- List view: clean table per family (Product, Type, COGS, PVP, Units, Sales, Margin)
- Cards view: name centered in image area, type badge top-right, image icon bottom-right, metrics below (PVP, COGS, Units, Margin, Expected Sales)

**"What's Next?" section:**
- 3-step guide: Confirm draft → Design develops → Refine together
- Motivational copy: "You've built the foundation. Design will bring it to life."
- CTA: "Confirm Draft Range Plan →"

**Celebration overlay** on confirm:
- "Draft range plan *confirmed*."
- Educational: "Design and strategy work as one. Every decision flows both ways."
- CTA: "Start Design & Development →"

---

### Sidebar Redesign
- Width: w-72 (288px) → w-48 (192px). Content gains 96px.
- Logo: PNG image restored (h-5)
- Circular progress with % inside (replaces horizontal bar)
- Collection name capitalized + season in one compact row
- Time remaining: "46w 2d left" format
- Block labels shortened with icons: Palette (Creative), ShoppingBag (Merch), PenTool (Design), Megaphone (Marketing)
- Tighter spacing throughout

---

### Design System Updates (saved to memory)
- Brand Design Guidelines completely rewritten with Creative Synthesis as reference
- 8 key rules documented: font-light default, italic emphasis, monochromatic only, no rounded corners, generous whitespace, uppercase labels, whisper borders, opacity-based hierarchy
- Segment colors: Revenue #9c7c4c, Image #7d5a8c, Entry #4c7c6c
- i18n mandatory feedback rule: zero hardcoded strings, all 9 languages, check before push
- Pre-push hook: `scripts/check-i18n.sh` validates key counts across language files

---

### Architecture Decisions
- Range Plan is a LIVING document, not validate-and-move-on
- "Confirm Draft Range Plan" sends theoretical structure to Design (not final)
- Bidirectional flow: Design changes feed back to Range Plan
- COGS is the base cost, margin calculated against COGS (not wholesale)
- AI generation uses creative context for naming (vibe, brand DNA, trends)

---

### Files Created/Modified (key ones)
- `src/app/collection/[id]/merchandising/page.tsx` — complete overhaul
- `src/lib/ai/merch-prompts.ts` — all 8 prompts rewritten
- `src/lib/ai/perplexity-client.ts` — `researchBrandPricing()` added
- `src/app/api/ai/merch-generate/route.ts` — Perplexity integration for pricing
- `src/app/collection/[id]/product/page.tsx` — bridge merch → setup_data
- `src/app/api/ai/generate-skus/route.ts` — COGS pricing, creative context
- `src/app/api/skus/batch/route.ts` — NEW: batch SKU insert
- `src/components/planner/CollectionBuilder.tsx` — complete redesign
- `src/components/planner/PlannerDashboard.tsx` — single page, no tabs
- `src/components/wizard/WizardSidebar.tsx` — w-48, circular progress
- `src/components/wizard/WizardLayout.tsx` — ml-48
- `scripts/check-i18n.sh` — NEW: pre-push i18n validator
- `.claude/settings.json` — NEW: PreToolUse hook for i18n check
- All 9 i18n files updated with ~30 new keys each

---

## Session 2026-03-18 (early) — Merchandising Block Improvements (735b6e6)

### Merchandising Block (Bloque 2) — Complete overhaul
- **Families AI Proposal**: Zero-input, reads creative brief, proposes families by market opportunity. Priority badges (Key Family/Strategic/Nice to have).
- **Pricing**: Reference brands field + Perplexity researches real retail prices. Pricing thesis (AI explains positioning logic). Rationale per subcategory.
- **Channels**: DTC/Wholesale with Digital/Physical sub-toggles. Market cards with color-coded entry points (DTC=warm, Wholesale=slate, Social=golden, Showroom=lavender). Selectable markets.
- **Budget**: 10 growth model scenarios (Axel Arigato, Jacquemus, Holzweiler, COS, ALD, etc.). AI Proposal auto-selects best model with risks/advantages.
- **Celebration overlay**: Full-screen when all 4 cards validated.
- **All strings i18n**: 9 languages, i18n hook configured as mandatory.

### Collection Builder — Bridge + Auto-generation
- **Data bridge**: Merchandising workspace data auto-populates setup_data (sales target, margins, families, pricing, type segments, seasonal distribution).
- **Auto-gen wow moment**: When user enters Collection Builder, animated overlay while AI generates all SKUs in batches of 20.
- **Creative context in SKUs**: AI uses vibe ("Vacation Archaeology"), brand DNA (HEREU/Catalan references), trends, consumer profiles for naming. Result: "Montserrat Camp Collar Shirt", "Calella Woven Leather Loafer", "Tossa Terracotta Linen Shorts".
- **Margin fix**: totalCost now uses sold units (60% sell-through) matching expected_sales.

### Sidebar Redesign
- Width: w-72 (288px) → w-48 (192px). Content gains 96px.
- Circular progress with % inside (replaces horizontal bar).
- Collection name capitalized + season in one row.
- Time remaining: "46w 2d left" format.
- Block labels shortened with icons: Palette, ShoppingBag, PenTool, Megaphone.

### Collection Builder UI
- Default view: Cards (was List). Grid: 5 cols xl, 4 lg, 3 md.
- Add New SKU: collapsible form + button in SKU List header.
- "How Aimily built your collection": 4 circular SVG gauges (Margin, Avg Price, SKUs, Revenue). Family/Type mix as progress bars. Replaces blue "Framework Validation".

---

## Session 2026-03-18 (early) — Merchandising Block Improvements (735b6e6)

### Changes
1. **Celebration overlay** — Full-screen carbon overlay with staggered animations when all 4 merch cards validated. CTAs: "Open Collection Builder →" + "Back to Dashboard" + dismiss.
2. **Families AI Proposal → zero-input** — Removed "Minimal Reference" field. Now one-click: AI analyzes full creative brief (consumer, vibe, brand DNA, trends, season) and proposes 3 family structures ranked by market opportunity. Prompt rewritten to reference specific brief elements.
3. **Channels: entryStrategy visible** — Market results now show "Entry: ..." line with the AI's recommended entry strategy per market.
4. **Budget: rationale editable** — Financial rationale text converted from static `<p>` to inline-editable textarea.

### Files Modified
- `src/app/collection/[id]/merchandising/page.tsx` — celebration overlay, zero-input AI mode, entryStrategy display, editable rationale
- `src/lib/ai/merch-prompts.ts` — families-proposals prompt rewritten for proactive market-opportunity analysis

---

## Session 2026-03-17 — Creative Block Overhaul + Perplexity Integration

### Summary
Complete overhaul of the Creative & Brand block (Block 1). Integrated Perplexity as web research engine. Rebuilt all AI prompts for quality. Built Creative Synthesis as fully editable visual board with celebration transition. Fixed Critical handover gap to Merchandising.

---

### 1. Brand DNA — Perplexity + Smart Scraping (be6128f → 408d141 → f47d63b)

**Problem**: Brand DNA extraction scraped CSS colors from e-commerce templates and broken Instagram scraping. Results were inaccurate and generic (e.g., HEREU returned wrong name "HEREUS Studio" with template colors).

**Solution — 3-source parallel pipeline**:
1. **Perplexity Search API** ($0.005/req) — searches fashion press, reviews, articles about the brand
2. **Smart web scraper** — rewrote `brand-scraper.ts` to scrape CONTENT (copy, headings, about page, product descriptions) instead of CSS colors. Auto-discovers /about, /story, /our-story pages.
3. **Claude Haiku** — cross-references both sources to produce expert Brand DNA

**Prompt rewrite**: System prompt tells Claude to cross-reference web research with website content. Must quote specific phrases from brand's actual copy. Every sentence must be true ONLY of that brand.

**Files**: `perplexity-client.ts` (new), `brand-scraper.ts` (rewritten), `creative-generate/route.ts`, `creative-prompts.ts`

---

### 2. Perplexity Sonar for Trends — Direct, No Claude (ac1dbce)

**Problem**: Trends used Claude alone, which invented data from training. Two API calls (Perplexity Search → Claude) was slow and unnecessary.

**Solution**: Trends now use **Perplexity Sonar directly** — single API call that searches web + returns structured JSON. No Claude needed (Claude fallback if Sonar fails).

**4 trend types, each with tailored Sonar prompt**:
| Type | What it searches | Recency |
|------|-----------------|---------|
| **Global Trends** | Vogue, Tag Walk, The Impression, Harper's Bazaar runway coverage | Year |
| **Deep Dive** | Product-specific micro-trends from runway + press | Year |
| **Live Signals** | Street style from 15+ fashion neighborhoods, TikTok, Instagram, Reddit, retail sell-outs | 3 months |
| **Competitors** | Brand analysis with real pricing in €, positioning, gaps | Year |

**Season intelligence**: `expandSeason()` converts "SS27" → "Spring Summer 2027". Detects future seasons (SS27 shows haven't happened) → searches previous equivalent season (SS26) as primary reference + any SS27 forecasts.

**Live Signals neighborhoods**: Hackney/Shoreditch (London), Williamsburg/SoHo (NYC), Le Marais/Saint-Germain (Paris), Daikanyama/Harajuku (Tokyo), Södermalm (Stockholm), Born/Gràcia (Barcelona), Nørrebro/Vesterbro (Copenhagen), Brera/Navigli (Milan).

**Result cleanup**: Strips Perplexity citation references `[1][2]` from text. Fixes concatenated brand names ("CelineLoewePrada" → "Celine, Loewe, Prada") via PascalCase split.

**Files**: `perplexity-client.ts` (Sonar + Search APIs), `creative-generate/route.ts` (Sonar direct for trends)

---

### 3. Trend Prompt Quality — Vogue Not Sci-Fi (ec25339)

**Problem**: Trends returned names like "Digital Enlightenment", "Regenerative Authenticity", "Neo-Sensory Paradigm". Felt like sci-fi, not fashion.

**Solution**: All 4 trend prompts rewritten with strict rules:
- Names must be Vogue headline style: "Quiet Luxury", "Sheer Everything", "The New Prep"
- BANNED: abstract concepts, philosophical language, compound buzzwords
- Every trend must pass: "Could I point to this in a Zara window?"
- 6-8 results instead of 4-5 for more options
- Each result includes **reference brands** (3-5) shown in italic below title
- Focus field works: "footwear" → ALL trends about footwear only

**Files**: `creative-prompts.ts` (all 4 trend prompts), `perplexity-client.ts` (search queries)

---

### 4. Research Blocks UX — No Mode Pills (ecc1618 → 3d89542)

**Problem**: Free/Assisted/AI Proposal pills made no sense for research blocks. Global Trends already had the season context — why ask for mandatory input?

**Solution**:
- **Removed mode pills** from all 4 research blocks (grid cards + expanded view)
- **Global Trends + Live Signals**: One-click button, optional focus field
- **Deep Dive + Competitors**: Required input (what area / which brands)
- **Load More** button: adds 4 new results, excludes existing titles
- **Replace N Unselected** button: keeps selected results, regenerates the rest

**Files**: `creative/page.tsx` (ResearchBlockContent, hideModePills)

---

### 5. Creative Synthesis — Visual Board (ba461d4 → 478e2f9 → e8efe0f → dac2f99)

**Problem**: Step 3 "Creative Synthesis" was a placeholder with a checkmark icon.

**Solution — Full visual creative brief with editable sections**:

| Section | Content | Editable? |
|---------|---------|-----------|
| **Validate Button** | Big CTA at top, toggles lock/unlock | Click to validate or un-validate |
| **Hero** | Collection name + season + vibe title + narrative + keywords as pills | Via Step 1 |
| **Moodboard** | 8-col compact grid, X to remove, + to add photos | ✅ Remove, add, show all/less |
| **Brand DNA** | Color swatches + tone + typography + visual identity | ✅ Edit button → inline editing |
| **Target Consumer** | Selected profiles (title + desc) | ✅ Edit, remove, add manual |
| **Trend Direction** | 3-col grid of selected trends from all research | ✅ Edit, remove, add manual |
| **Competitive Landscape** | 2-col grid of competitor insights | ✅ Edit, remove, add manual |

All edits save to DB in real-time via `updateBlockData`.

**Files**: `creative/page.tsx` (CreativeSynthesisView ~400 lines)

---

### 6. Celebration Overlay (78225f2 → b5394bc)

**What**: Full-screen carbon overlay with staggered animations when validating:
1. Check icon scales in (0.6s)
2. "Preppy Elevated · SS27" fades in
3. "Your creative direction is *validated*." slides up
4. Editorial copy: "Your collection has a soul now. Time to give it structure."
5. Two CTAs: **"Start Merchandising →"** (primary) + **"Back to Dashboard"**
6. **"Stay here and keep editing"** dismiss link

Animations: `fadeIn`, `slideUp`, `scaleIn` with staggered delays (0.3-1.8s) in `globals.css`.

Validated state is toggleable — click "Validated — click to edit" to unlock.

**Files**: `creative/page.tsx`, `globals.css`

---

### 7. Sidebar Content Expansion (8df29a0)

**What**: Content area now dynamically adjusts left margin when sidebar collapses: `ml-72` → `ml-[52px]`. Sidebar notifies layout via `onCollapsedChange` callback.

**Files**: `WizardLayout.tsx`, `WizardSidebar.tsx`

---

### 8. Creative → Merchandising Handover Fix (0b6e179)

**CRITICAL BUG FIXED**: Merchandising AI prompts expected `consumer`, `vibe`, `brandDNA`, `trends` as inherited context, but the page only loaded `name` and `season` from `collection_plans`. All creative data was lost in the handover.

**Fix**: Merchandising page now fetches creative workspace data from `collection_workspace_data` (workspace='creative') and extracts:
- Consumer profiles (liked ones, formatted as text)
- Vibe (title + narrative + keywords)
- Brand DNA (name + colors + tone + typography + style)
- Selected trends (from global-trends, deep-dive, live-signals)

All merch AI prompts now receive the complete creative direction via `buildInheritedContext()`.

**Files**: `merchandising/page.tsx`

---

### Perplexity API Integration Summary

| Feature | API Used | Cost | Flow |
|---------|----------|------|------|
| Brand DNA | Search API | $0.005/req | Search → scrape website → Claude analyzes both |
| Global Trends | Sonar | ~$0.01/req | Sonar searches + returns JSON directly |
| Deep Dive | Sonar | ~$0.01/req | Sonar searches + returns JSON directly |
| Live Signals | Sonar | ~$0.01/req | Sonar searches (3-month window) + returns JSON |
| Competitors | Sonar | ~$0.01/req | Sonar searches + returns JSON directly |

**Env var**: `PERPLEXITY_API_KEY` — in `.env.local` + Vercel production.

---

### New Files Created
- `src/lib/ai/perplexity-client.ts` — Perplexity Search + Sonar client (~300 lines)

### Files Significantly Modified
- `src/app/collection/[id]/creative/page.tsx` — ~600 lines added (Synthesis, research UX, celebration)
- `src/lib/ai/creative-prompts.ts` — All 5 research prompts rewritten (brand-extract + 4 trends)
- `src/app/api/ai/creative-generate/route.ts` — Perplexity integration, Sonar direct for trends
- `src/lib/brand-scraper.ts` — Complete rewrite (content-focused, multi-page)
- `src/app/collection/[id]/merchandising/page.tsx` — Creative context loading
- `src/components/wizard/WizardLayout.tsx` — Dynamic sidebar margin
- `src/components/wizard/WizardSidebar.tsx` — onCollapsedChange callback
- `src/styles/globals.css` — Celebration animations

---

## Pending / Known Issues
- **Pinterest integration**: Button exists in Moodboard but no backend.
- **Creative Synthesis**: Could add AI-generated summary paragraph consolidating all inputs.
- **Vibe hero editing**: Vibe section in synthesis is read-only (editable in Step 1). Could add inline edit.
- **Overview toggle**: 3 views live (Bloques/Calendario/Mapa).

---

## Previous State (as of 2026-03-13)

### Collection Overview (`/collection/[id]`)
- **Sidebar** (w-72, carbon bg): editorial font-light, collection name (xl), season label, single progress bar with %, launch date. Phase nav as flat links (13px font-light) with dot/check/lock indicators.
- **Mobile-first sidebar**: hidden off-screen on mobile. Hamburger toggle. Collapse toggle desktop only.
- **Overview page**: crema background, editorial header, 4 white PhaseCard components.
- **Layout**: `bg-crema` on root div, `ml-0` on mobile, `ml-72` on md+.

### Design System
- Reference: `/discover` page
- Headlines: font-light, tracking-tight, italic for emphasis
- Labels: text-xs, tracking-[0.25em], uppercase, muted
- No rounded corners, monochromatic only, generous spacing

---

## Pre-March 2026 Commit Log

### ba521ec — Redesign Brand DNA — remove mode pills, two clear paths
### b581daa — Prevent AI refusals + maxTokens 8192 on all prompts
### 8c3ea0f — Start/Continue/Edit labels + mobile responsiveness
### 2bb2823 — Select + edit flow for Research blocks and Families proposals
### 6ca4eb2 — Interactive vibe selection — pick one, edit title/narrative/keywords
### 0d3cea7 — Interactive consumer proposal flow with select/edit/regenerate
### d45cb01 — Meet Aimily interactive showcase page + GTM launch plan
### 5af7b19 — Marketing block redesign phase 4: Campaign & Video card
### b8e3df5 — Marketing block redesign phase 3: Product Visuals card
### 12dc816 — Marketing block redesign phase 2: Collection Stories card
### bc8c916 — Marketing block redesign phase 1: sidebar blocks, screen layouts, mini-wizard
### c4e3b19 — Sidebar legibility + neural-network decision map + editorial colors
### 8eca130 — 3-view workspace toggle + sidebar legibility
### 504c8de — Editorial design language across all workspace pages
### f0ad12c — Sidebar editorial redesign
### f6aa12f — Editorial design language from /discover
### 7edd477 — Near-white sidebar + simplified navbar
### 6973702 — White team blocks + sidebar contrast boost
### 31c5803 — Move collection info to sidebar, eliminate hero
### b370b60 — Calendar from 9 phases to 4 blocks
