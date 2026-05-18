# Next-session handoff · aimily In-Season · 2026-05-18

> This document is the **starting brief for the next context window**. Reading it cold should let any new session pick up without rediscovery. Copy/paste this as the first message in the new chat.

---

## Project at a glance

**Repo**: `~/aimily` · branch `main` (working tree clean, all changes pushed). Vercel auto-deploys from main.

**Product**: aimily In-Season — a per-SKU decision-support engine for fashion buying-merchandising-sales. Emits a verdict pack per SKU (kill / markdown_accelerate / replenish / amplify_distribution / amplify_in_season / amplify_next_season / extend_colors / carryover / etc.) on top of a retailer's in-season data (Zara RNK PDF, Shopify CSV, Mango WSSI, generic fast-fashion feed).

**Pilot target**: Zara/Inditex. Demo audience: **Director de Tecnología (CTO)** at Inditex. Felipe has direct contacts there. Mango pitch infrastructure preserved but back-burnered.

**Cardinal rules** (read these feedback memories FIRST, in order):
- `feedback_aimily-output-unit-is-sku.md` — output unit = SKU, never style
- `feedback_aimily-vocabulary-style-vs-sku.md` — use "estilo" not "lineage" in user-facing copy
- `feedback_aimily-discipline-buy-in-merch-and-sales.md` — discipline = buying + commercial planning + sales (NOT product mgmt, NOT visual merch)
- `feedback_aimily-scope-no-inter-store-transfer.md` — scope OUT: inter-store TRANSFER, PUSH_ALLOCATION between stores. Scope IN: AMPLIFY_DISTRIBUTION (warehouse → more stores)
- `feedback_aimily-zara-pilot-daily-cadence-no-acronym.md` — Zara is pilot, daily cadence (not Monday weekly), no invented acronyms
- `feedback_aimily-zara-daily-trading-meeting-cto-audience.md` — Zara's ritual = "Daily Trading Meeting" (canonical name), audience = CTO not buyer
- `feedback_aimily-graceful-degradation-tenant-input-or-synthetic.md` — every input: (1) tenant explicit, (2) synthetic from retailer profile, (3) never silent failure

**Spec source of truth**: `memory/product-spec_aimily-in-season-2026-05-17.md` — the complete spec v1 (13 verbs, 5 headline KPIs, graceful degradation, Spanish vocab, per-tenant cadence, etc.). Read this BEFORE implementing anything new.

---

## What shipped in the previous session (2026-05-17 night → 2026-05-18 morning)

15 commits on main. Branch `spec/in-season-v1-execution-2026-05-17` was merged into main and pushed. Each commit is type-check clean with full context comments. Highlights:

1. **P0 bug fixes** — color-scope appender filter by SKU color (bug 8.1) + identity graph rebuild (32→44 lineages on V26 corpus).
2. **13-verb taxonomy** — `SkuVerdictAction` enum extended with `amplify_distribution`, `pull_forward_intake`, `promote_push`, `amplify_in_season`, `amplify_next_season`, `investigate_root_cause`. Legacy aliases (`investigate`, `amplify_winner`) retained for back-compat.
3. **Six Right + owner fields** — every verdict carries `six_right` (Kincade & Gibson) + `owner` (Jackson & Shaw) via `enrichVerdict<V>` at the API output boundary. UI renders both as pills.
4. **markdown_risk_score reframed** — from `stock_days/90` (wrong unit) to `FWOC / season_weeks_remaining` (Caro & Gallien 2012 canon). Trace fields added.
5. **MARKDOWN 3-step ladder rationale** — `-25/-30 → -40/-60 → -70+` per Donnellan ch.12 with never-increase ratchet language and next-stage escalation hint.
6. **5 headline KPIs** — GMROI, STR vs plan curve, FWOC/LT ratio, S/S ratio, maintained markup %. New module `src/lib/strategy/headline-kpis.ts`. Surfaced as top row of the SKU detail.
7. **amplify_winner split** — emits `amplify_in_season` always (Reorder + Distort NOW) + conditionally `amplify_next_season` when `days_in_store >= 28` (Fisher-Raman 1996 4-week validation gate).
8. **Accordion UI** — replaced drawer takeover with inline expand/collapse per SKU row (chevron rotates 90°). Multiple SKUs can be open simultaneously. **Action stack now leads the inline detail** (KPIs second) so the rationale is the first thing the buyer sees.
9. **Color taxonomy validated by vision** — built `scripts/extract-zara-color-mapping.ts` that streams the entire V26 RNK PDF through Claude Sonnet 4.5 vision and produces (model_ref, color_code, observed_color_name_es, hex, confidence). 113 SKU observations, 43 unique codes. **41 of 43 codes diverged from the v1.0.0 seed I had fabricated.** Applied to aimily-internal tenant as v1.1.0-vision-validated.
10. **Color code origin traced** — researched via parallel agent + my own searches. Verdict: Zara uses an NRF/GS1-inspired CHASSIS (3-digit, hundreds buckets, sub-shades) but with significant internal deviations (notably code 800 = negro with 18 unanimous obs, contradicting NRF 800 = orange). Decision: trust observation over external standard for Zara; NRF is reference, not seed.
11. **Shopify color taxonomy researched** — Shopify maintains an open-source standard taxonomy with 19 canonical color values (Beige, Black, Blue, Bronze, Brown, Clear, Gold, Gray, Green, Multicolor, Navy, Orange, Pink, Purple, Red, Rose gold, Silver, White, Yellow). NO hex codes in the official taxonomy. Variant-level color is stored as FREE TEXT — will need a fuzzy-matcher. Script `scripts/apply-shopify-color-taxonomy.ts` ready for any future Shopify tenant. Raw 19-color JSON at `memory/shopify-colors-raw.json`.
12. **Two "SKU 1 visible bugs"** fixed:
    - "No clear signal for this SKU" warning was preserved on high-confidence verdicts (G.2 logic). Now only preserved when surviving action's confidence < 0.6.
    - Color rationale was claiming names from a wrong seed taxonomy. Now surfaces the COLOR CODE as canonical + name as parenthetical hint + "verifica contra la foto" caveat. After applying the validated taxonomy, the name is also correct (401 = azul_noche, not blanco).

---

## State of the world (verified live)

### Branch
- `main` is clean, all pushed. Latest commit: ~`fb00062` (Shopify research) + the most recent (Shopify apply script).
- Vercel deploys from main on push.

### Database (production aimily-internal tenant, ID `60105796-ea66-4355-b904-e10296436ff9`)
- Active color taxonomy: **v1.1.0-vision-validated** (43 codes, applied 2026-05-18 morning).
- Verified live: 401 → azul_noche, 250 → crudo, 800 → negro, 407 → azul_noche, 427 → denim_medio. v1.0.0 deactivated.
- V26 RNK run (`0c2ed3e9-cef4-4107-abea-c01535d885e3`): 48 SKU scores, 86 candidates, 3 scenarios. Identity graph rebuilt to 44 lineages.

### Demo
- `/strategy/[tenantSlug]/runs/[runId]/pdf-view` is the live demo URL. SKU 1 (4786 166 401) renders with `amplify_in_season` at 93% confidence + `extend_colors` at 80% (color 401 winner of style). Accordion expand shows action rationale FIRST, then 5 KPIs, then operational stats, then modulator notes.

---

## What's still pending (from the spec — 7 items, all deferred with explicit "why")

| # | Item | Why deferred | Effort |
|---|---|---|---|
| 1 | REPLENISH distort metadata (top-3 stores/sizes/colors) | V26 corpus has aggregate velocity only, no per-store breakdown. Need parser extension OR a tenant that supplies per-store data. | 2-3h once data available |
| 2 | 3 new appenders: `amplify_distribution`, `pull_forward_intake`, `promote_push` | Each needs data inputs V26 doesn't carry (stores_addressable, supplier_flex_buffer_days, marketing_calendar_flags). Verbs defined in taxonomy + display order but no appender materializes them yet. | 4-6h once schema extended |
| 3 | Graceful degradation helper module refactor | Pattern is proven inline in `headline-kpis.ts` via `source: 'tenant' \| 'synthetic'` tags. Needs to be factored into a reusable `resolveInput<T>` helper + retailer-profile module. | 2-3h |
| 4 | Per-tenant cadence config (daily/weekly) + tenant settings UI | No demo impact yet — UI defaults work for both Zara daily and Mango weekly. The full schema + settings page is meaningful infra but not visible in V26 demo. | 3-4h |
| 5 | `stores_addressable` column on `strategy_product_facts` + parser logic | Required for AMPLIFY_DISTRIBUTION trigger. V26 parser doesn't extract it. | 1-2h schema + parser |
| 6 | i18n cleanup across 9 locales | ES labels currently hardcoded inline in `PdfOverlayViewer.tsx`. Works for the demo today (ES locale renders correctly). Other 8 locales not on demo path. Refactor is hygiene. | 2-4h |
| 7 | P2 lineage→style user-facing rename | Cosmetic. Doesn't affect engine correctness; gradual cleanup as files are touched. Some rationale strings already updated. DB column rename deferred to a larger refactor pass. | 1-2h user-facing + future DB pass |
| 8 | P3 backtest engine | Blocked on 2-period data (audit H.1). Without a prior-period run of the same tenant's SKUs, no precision/recall computable. Could be unblocked by (a) real 2-period dataset from Mango/Zara, or (b) synthetic split of V26 into "first half" + "second half". | 4-6h once data available |
| 9 | **Shopify fuzzy-matcher** — variant.option1.value (free text) → canonical Shopify handle | Required for any Shopify tenant ingest. Canonical 19-color taxonomy script ready (`scripts/apply-shopify-color-taxonomy.ts`) but free-text normalization is new architecture. | 4-8h |
| 10 | **Mango taxonomy** — vision-validate when Mango catalog accessible | Need a Mango PDF or product feed. Same script (`scripts/extract-zara-color-mapping.ts`) works for any retailer's PDF; just point it at the Mango source. | ~100s of vision processing + 30 min to apply |

---

## Strategic context (read for non-obvious decisions)

### Discipline & framing
- **NOT product management. NOT visual merchandising.** We are buy-in merchandising + sales (buying / commercial planning / category management).
- **Cadence is per-tenant**: Zara = daily (Daily Trading Meeting), Mango / mass-market = weekly Monday Trade Meeting.
- **NO invented acronyms** in product copy. "aimily In-Season" is the product name. Description is operational, not buzzword.

### Pitch context
- **Pilot target = Zara** (Inditex). NOT Mango. Mango infrastructure preserved but back-burnered.
- **Audience = Director de Tecnología (CTO)** of Inditex.
- **3 wedges identified vs Caro & Gallien's existing Zara optimization**:
  1. Creative-direction bridge: in-season heroes → next-season sequel briefs
  2. Proactive moodboard-aligned color extension (vs Zara's reactive "make more of what sold")
  3. SKU-level rationale with Six Rights anchoring for commercial review
- **Demo dataset** = the Zara RNK V26 run we already have (48 SKUs, 113 SKU photos). Literally their own data.
- **NEVER pitch directly via**: Toni Ruiz (too senior), Jonathan Andic (under criminal investigation), Daniel López (not a buyer despite Modaes confusion).
- **DO pitch via**: IESE warm-intro (Canals on Mango board + Nueno's Zara HBS case authorship), Casacuberta (Mango CPO+SO if back to Mango), José Luis Nueno directly for Zara introduction.

### Color taxonomy architecture
- **Per-tenant strategy_taxonomies** is the right place for these mappings. Each tenant has its own active taxonomy version.
- **For Zara-like proprietary retailers**: use vision extractor (script ready) to build the per-tenant taxonomy from PDF / catalog photos. Trust observation over external standard.
- **For Shopify-like merchant-driven retailers**: seed with the 19 canonical values + add a fuzzy-matcher layer that normalizes free-text variants. Script ready; fuzzy-matcher is TODO.
- **NRF/GS1 standard** is documented in `memory/zara-color-code-origin-research.md` as reference but NOT used as seed (Zara deviates significantly on 800/600 blocks).

### Cardinal rule for any UI/UX decision
**The buyer's question when they open aimily is "what should I do and why?"** — answer that first, then anchor with KPIs, then operational stats. The accordion refactor made this explicit. Any new view should follow the same priority.

---

## Recommended next-session priorities

In order of value to the demo + product strategy:

**Highest impact, mid effort**:
1. **Add `stores_addressable` schema field + extend Zara RNK parser to populate it**. Unblocks the 3 new appenders (especially `amplify_distribution`). ~2-3h.
2. **Build the 3 new appenders** once data is available. ~4-6h. These complete the 13-verb taxonomy in practice (not just on paper).
3. **REPLENISH distort metadata**. Requires per-store velocity data — check if Zara RNK has it (current parser extracts aggregate; the source PDF may have per-store breakdowns we're discarding). ~2-3h.

**Medium impact, lower effort**:
4. **Graceful degradation helper module**. Factor the pattern out of `headline-kpis.ts` into reusable `resolveInput<T>` + retailer-profile module. ~2-3h.
5. **i18n cleanup ES**. Move hardcoded labels in `PdfOverlayViewer.tsx` to `src/i18n/es.ts`. Improves architecture, doesn't change demo. ~1-2h.
6. **P2 lineage→style** user-facing strings. Hygiene. ~1-2h.

**High value but architecturally bigger**:
7. **Shopify fuzzy-matcher** — needed for first non-Zara tenant. The canonical 19-color seed script is ready (`apply-shopify-color-taxonomy.ts`); next step is the ingest-time normalization layer. ~4-8h.
8. **P3 backtest engine** — needs 2-period data first. Build the infrastructure + a synthetic V26-split demo when ready. ~4-6h.

**Quick wins**:
9. **Live verification on Vercel** — open the deployed demo, click through 3-4 SKUs, confirm: SKU 1 shows `azul_noche` (not blanco), warning is gone, accordion works, KPIs render. If anything is broken, fix immediately.

---

## Workflow established (do NOT deviate)

- **All commits to `main`** — Felipe sees changes via Vercel deploy. No more feature branches for iterative work.
- **Each commit followed by `git push`** (per CLAUDE.md rule).
- **Type check before commit** (`npx tsc --noEmit`). All commits should pass.
- **Atomic commits**: one logical change per commit, with full context comments + spec source attribution.
- **Visible work first**: when iterating, put the buyer's question first. Don't bury the rationale under stats.
- **Don't reinvent**: read the spec + relevant feedback memories before implementing. They exist for a reason.

---

## Files / paths cheat sheet

```
src/lib/strategy/
  sku-verdict-resolver.ts       # The 13-verb enum, ACTION_DISPLAY_ORDER,
                                # VERDICT_SIX_RIGHT, VERDICT_OWNER,
                                # enrichVerdict, appenders for amplify_winner,
                                # amplify_next_season, extend_colors, drop_color
  sku-verdict-modulator.ts      # Archetype/budget/brief modulation
  sku-verdict-rationale.ts      # Per-verb Spanish rationale templates
                                # (includes MARKDOWN 3-step ladder logic)
  classifiers/index.ts          # 10 classifiers including markdown_risk_score
                                # (now FWOC/season_weeks_remaining)
  recommend.ts                  # Candidate generation (the older ActionType enum)
  identity-graph.ts             # 2-token canonicalPrefix for lineage grouping
  headline-kpis.ts              # 5 buyer KPIs + retailer profile defaults
  parsers/zara-rnk-pdf.ts       # Zara PDF parser (uses Claude Vision)
  parsers/shopify-csv.ts        # Shopify CSV parser
  parsers/types.ts              # Parser output schema

src/app/api/strategy/runs/[runId]/skus/route.ts
  # The route that serves the demo. Calls resolver, applies modulator,
  # appends amplify+extend_colors+drop_color, enriches with Six Right/owner,
  # computes headline KPIs, returns SkuRow[].

src/app/(app)/strategy/[tenantSlug]/runs/[runId]/pdf-view/PdfOverlayViewer.tsx
  # The accordion UI. SkuPanel = the list. SkuDetailInline = the expanded
  # detail block (action stack first, KPIs second, stats third).

scripts/
  rebuild-identity-and-reexecute.ts        # Rebuild identity graph + re-run orchestrator
  reexecute-strategy-run.ts                # Just re-run orchestrator
  extract-zara-color-mapping.ts            # Vision-validate color taxonomy
  apply-validated-zara-color-taxonomy.ts   # Apply validated taxonomy to a tenant
  apply-shopify-color-taxonomy.ts          # Apply Shopify canonical to a tenant
  strategy-e2e-test.ts                     # E2E test

memory/
  product-spec_aimily-in-season-2026-05-17.md       # THE spec, source of truth
  session-2026-05-17-night-execution-report.md      # Prior session's execution log
  research_synthesis-in-season-grounding-2026-05-17.md   # Round 1 research (thresholds + Mango)
  research_synthesis-round-2-operational-craft-2026-05-17.md  # Round 2 (operational craft + IESE channel)
  zara-color-taxonomy-observations.json             # 113 raw vision observations
  zara-color-taxonomy-proposed.json                 # Validated 43-code mapping
  zara-color-taxonomy-report.md                     # Vision validation report
  zara-color-code-origin-research.md                # NRF/GS1 chassis research
  shopify-color-taxonomy-research.md                # Shopify standard research
  shopify-colors-raw.json                           # 19 Shopify canonical colors
  framework_retailer-agnostic-in-season-engine.md   # Multi-retailer architecture

supabase/migrations/
  059_aimily_strategy_foundation.sql                # Base schema
  059d_strategy_storage_and_seed.sql                # Original (broken) color seed
```

---

## Suggested opening message for the new session

> "Working on aimily In-Season — fashion buying decision-support engine. Pilot target is Zara, audience is Inditex CTO, demo dataset is the V26 RNK corpus we already have on aimily-internal tenant. Branch `main` is current state; Vercel auto-deploys. Spec source of truth: `memory/product-spec_aimily-in-season-2026-05-17.md`. Session handoff brief: `memory/next-session-handoff-2026-05-18.md` — read this first, then the cardinal-rules feedback memories listed at the top. We're picking up from a stable state with the 13-verb taxonomy + 5 KPIs + Six Right/owner + accordion UI + vision-validated Zara color taxonomy all shipped. The 9 deferred items are listed in the handoff with effort estimates. Priorities go in this order: (1) live-verify the demo on Vercel, (2) extend schema for stores_addressable, (3) build the 3 missing appenders, (4) refactor graceful degradation into a reusable module. Workflow: all commits to main with `git push` after each. Don't deviate."

Paste that as the first message of the new chat. It contains enough to bootstrap the context and points to the docs for deeper detail.
