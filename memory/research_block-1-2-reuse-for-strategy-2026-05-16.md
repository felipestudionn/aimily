---
name: Block 1 + Block 2 end-to-end audit — what Strategy can reuse
description: Felipe asked for a real audit (not assumptions) of how Block 1 → Block 2 actually works in the codebase today, so Paso 2 of Strategy can reuse maximally instead of reinventing. Maps every AI endpoint, what model it calls, what prompt it uses, what context it loads — and identifies the seam points where Strategy plugs in.
type: project
---

# Block 1 → Block 2 end-to-end · reuse map for Aimily Strategy

**Date**: 2026-05-16
**Triggered by**: Felipe direction to NOT assume Perplexity is the right tool for everything — audit the real flow first.

## 0. TL;DR

| Task | Block 1 does it via | Block 2 does it via | Strategy reuses |
|---|---|---|---|
| Brand DNA research | `/api/ai/brand-from-external` → `researchBrand()` (Perplexity SEARCH) + `scrapeBrandContent()` + Claude Sonnet | n/a | Reuse `researchBrand()` for tenant brand profile |
| Trends / market research | `/api/ai/creative-generate` (subtypes `trends-*`) → `researchTrends()` (Perplexity SONAR) | n/a | Reuse `researchTrends()` for current trend lookup |
| Vibe / moodboard proposals | `/api/ai/creative-generate` (subtype `vibe-proposals`) → `buildCreativePrompt()` + Claude | n/a | Reuse `buildCreativePrompt('vibe-proposals')` for creative direction synthesis |
| Pricing benchmarks for families | n/a | `/api/ai/merch-generate` → `researchBrandPricing()` (Perplexity) | Reuse for price ladder validation in scenarios |
| Families / pricing / budget / financials | n/a | `/api/ai/merch-generate` (9 subtypes) | NOT needed in Strategy v1 — we score existing performance, not greenfield-generate |
| SKU concrete generation | n/a | `/api/ai/generate-skus` → `generateJSON()` with custom prompt | **YES** — reuse the prompt pattern for `new_sku_proposal` |
| Scenario brainstorming | n/a | `/api/ai/scenarios-prefill-editor` + `scenarios-deepen` | NOT needed — Strategy has its own deterministic scenario assembler |
| LLM client | Both | Both | Reuse `generateJSON()` from `src/lib/ai/llm-client.ts` |
| Context loading | n/a | `loadFullContext(collectionPlanId)` reads CIS + creative workspace + brief | NEEDS a Strategy-side equivalent: `loadStrategyTenantContext(tenantId)` |
| Rate limit + usage guard | Both | Both | Reuse `enforceAiUserRateLimit(user.id, 'text')` + `checkAuthOnly()` |
| Auth | `getAuthenticatedUser()` + `verifyCollectionOwnership()` | Same | Strategy has its own: `requireStrategyAccess({ tenantSlug, minRole })` |

**Conclusion**: ~80% of Paso 2 functionality can be built by composing **existing functions** with a new tenant-context loader and Strategy-specific prompt shells. NO duplication of Perplexity, NO duplication of LLM client, NO duplication of prompt scaffolding.

---

## 1. Block 1 · creative + brand flow (the why)

The customer enters aimily and has to define WHO they are (brand DNA), WHO they sell to (consumer), and WHAT'S HAPPENING in the market (trends). The creative output is then frozen as a moodboard + brand DNA package that gets passed to Block 2.

### 1.1 `/api/ai/brand-from-external` — Brand DNA from external signals

Inputs: brand name + optional website + optional Instagram handle + optional PDF brand book.

Flow:
1. `researchBrand(brandName, website, instagram)` from `perplexity-client.ts`
   - Calls Perplexity **Search API** ($5 / 1K requests) with 2 prompts:
     - `"${brand}" fashion brand identity visual style colors typography aesthetic`
     - `"${brand}" brand positioning tone of voice campaigns photography`
   - Returns raw search results
2. `scrapeBrandContent(website, instagram)` extracts on-page text + meta
3. `buildCreativePrompt('brand-from-external-synthesis', { perplexityRaw, scraped, pdfBase64, language })`
   - Builds a Claude system + user prompt
   - System: brand strategist persona
   - User: ingest the 3 inputs (Perplexity + scrape + PDF) and emit a `BrandIdentityProposal`
4. Anthropic Claude Sonnet 4 with PDF document upload if provided
5. Output: structured `BrandIdentityProposal` JSON
   ```json
   {
     "brand_archetype": "minimalist-architect",
     "brand_values": ["timeless", "considered", "honest"],
     "tone_of_voice": "...",
     "visual_anchors": { "colors": [...], "typography": [...], "photography_style": "..." },
     "target_consumer_hint": "...",
     "positioning": "..."
   }
   ```

### 1.2 `/api/ai/creative-generate` — Vibe + trends + moodboard

Subtypes:
- `vibe-proposals` — given consumer + brand, propose 3-5 collection vibes
- `trends-global` — broad season trends via Perplexity Sonar
- `trends-deep-dive` — drill into one theme/category/color/material
- `trends-live-signals` — street style + social + retail + cultural moments
- `trends-competitors` — what comparable brands are doing

For `trends-*` subtypes:
1. `researchTrends(query, season, type, collectionContext, excludeTitles, language, targetDimension, existingInDimension)` from `perplexity-client.ts`
   - Calls Perplexity **Sonar API** (~$0.01 / request) which is AI + search combined
   - Returns structured JSON directly with `TrendResult[]` (no Claude post-processing needed)
   - Each result has: title, brands, desc, relevance, dimension (theme/category/color/material/...), optional hex color
2. UI displays results as cards the user can select / edit / remove

For `vibe-proposals` subtype:
1. `buildCreativePrompt('vibe-proposals', { consumer, brand, season, ... })`
2. Claude Sonnet generates 3-5 vibes with name + mood + adjacent_brands + signature_archetype

### 1.3 `/api/ai/analyze-moodboard` — vision over user-uploaded images

Inputs: array of image URLs from the user's moodboard.
Flow: Claude Sonnet vision → extract dominant colors, mood adjectives, style hints, archetype suggestions.

### 1.4 `/api/ai/consumer-suggest-input` — consumer definition assistant

Reads brand DNA + market context + asks Claude to propose consumer segment descriptions.

---

## 2. Block 1 → Block 2 handoff (the seam)

When the customer finishes Block 1, the CIS (Collection Intelligence Store) holds:

- `creative.brand_dna` (the BrandIdentityProposal)
- `creative.consumer_segment` (named consumer)
- `creative.moodboard.images` (URLs + tags)
- `creative.vibe` (chosen vibe with description)
- `creative.color_palette` (chosen palette)
- `creative.archetypes` (chosen archetypes)
- `creative.trends` (curated trend cards)

`loadFullContext(collectionPlanId)` (in `src/lib/ai/load-full-context.ts`, 262 LOC) reads this CIS plus the creative workspace tables and merges them into a `serverCtx` map. Every Block 2 endpoint calls this at the top so the prompts have access to the creative direction WITHOUT relying on what the client sent.

This is the canonical Block 1 → Block 2 pipe.

---

## 3. Block 2 · merchandising flow (the planning)

### 3.1 `/api/ai/merch-generate` — families, pricing, channels, budget, financial narrative

9 subtypes (`families-assisted`, `families-proposals`, `pricing-assisted`, `pricing-proposals`, `channels-assisted`, `channels-proposals`, `budget-assisted`, `budget-proposals`, `financial-plan-narrative`).

`-assisted` variants take user input + creative context → propose refinements.
`-proposals` variants take only creative context → propose from scratch.

Pricing-assisted optionally calls `researchBrandPricing(brands, families)` (Perplexity) to fetch competitor price ladders before Claude synthesises pricing strategy.

### 3.2 `/api/ai/generate-skus` — the SKU concretion endpoint

This is the key one for Strategy. The flow:

1. Inputs: `setupData` (target SKU count, target margin, families with counts) + `creativeContext` (vibe + brandDNA + consumer + trends from CIS) + `count` + `language` + `collectionPlanId`
2. `loadFullContext(collectionPlanId)` enriches the creative context (no trust in client-supplied values)
3. Build prompt:
   - System: merchPlanner persona
   - User: "Generate EXACTLY {count} SKUs distributed proportionally across families. COGS must hit {target}% margin. salesWeight must sum to 100."
4. `generateJSON<unknown[]>({ system, user, temperature: 0.7, language })`
   - Underneath: `llm-client.ts::generateJSON()` calls Claude Haiku as primary + Gemini as fallback
5. **Post-processing** (deterministic):
   - Force exact SKU count: pad with variants if short, truncate if long
   - Normalize salesWeight to sum to 100
   - Re-derive margins if any drift

Each SKU emitted has: `name`, `family`, `subcategory`, `pvp`, `cogs`, `salesWeight`, `description`, `keyFeatures[]`, `silhouette`, `targetCustomer`, `priceJustification`.

### 3.3 `/api/ai/design-generate` — sketch directions per SKU

`buildDesignPrompt('sketch-suggest', { productType, family, subcategory, concept, priceRange })` → 3 sketch direction proposals with silhouette, key design details, construction, proportions, design tension. Claude Sonnet.

### 3.4 `/api/ai/scenarios-prefill-editor` + `scenarios-deepen`

Block 2 scenario builder (not Strategy's). Greenfield scenario brainstorming for the user's collection plan. NOT what Strategy's deterministic scenario assembler does — these are different products.

---

## 4. LLM client primitives (the shared layer)

`src/lib/ai/llm-client.ts`:

- `generateJSON<T>({ system, user, temperature, language })` → calls Claude Haiku primary, Gemini fallback. Returns `{ data: T, model, fallback }`. Extracts JSON robustly even if model adds markdown.
- `generateText(...)` → same but plain text
- `extractJSON<T>(text)` → robust JSON parsing helper

Both Block 1 and Block 2 use `generateJSON()` for all structured outputs. Strategy already uses Anthropic SDK directly in some places (`parsers/zara-rnk-pdf.ts`, `narrative.ts`). The new Paso 2 endpoints should standardize on `generateJSON()` to stay consistent.

`src/lib/ai/error-messages.ts`: `normalizeAiError(error)` → user-friendly error strings.

---

## 5. Auth + rate limit + usage primitives

Block 1 + Block 2 endpoints all use:

```ts
const { user, error: authError } = await getAuthenticatedUser();
if (authError) return authError;

const rateLimited = enforceAiUserRateLimit(user.id, 'text');
if (rateLimited) return rateLimited;

const usage = await checkAuthOnly(user.id, user.email!);
if (!usage.allowed) return usageDeniedResponse(usage);
```

Strategy already uses `requireStrategyAccess({ tenantSlug | tenantId, minRole })` which fetches the user, resolves the tenant, and verifies membership. For Paso 2 endpoints, the pattern is:

```ts
const access = await requireStrategyAccess({ tenantId, minRole: 'analyst' });
if (!access.ok) return access.response;
const rateLimited = enforceAiUserRateLimit(access.userId, 'text');
if (rateLimited) return rateLimited;
```

Reuse the rate limit + usage guard verbatim.

---

## 6. Strategy · what we need to BUILD for Paso 2

### 6.1 New entities (DB)

- `strategy_tenants.tenant_brand_profile JSONB` — stores brand DNA shape for tenants that DON'T have Block 1 (the standalone case). When Block 1 is available, we mirror the CIS values into this field at onboarding.
- `strategy_recommended_palettes` table — lightweight, scoped to a run, stores recommended color palette per family
  ```
  id, tenant_id, run_id, family_code, palette (jsonb: { colors[] with hex + name + confidence + source_winner_ref }), created_at
  ```

### 6.2 New lib: `src/lib/strategy/context-loader.ts`

`loadStrategyTenantContext(tenantId)` returns the equivalent of Block 1's CIS for Strategy:
- Tenant brand profile
- Most-recent active creative brief (if any)
- Top families from the most-recent completed run
- Top carryover survivors from the most-recent completed run
- Identity graph snapshot (count + sample lineages)

This is what the new LLM endpoints will pass into prompts.

### 6.3 New lib: `src/lib/strategy/creative-discovery.ts`

`discoverCreativeBrief({ tenantId, runId? })`:
1. Load `strategyContext` via `loadStrategyTenantContext()`
2. If brand profile is empty: call `researchBrand(brandName, website, instagram)` to populate
3. Call `researchTrends(query, season, 'global', { collectionName, consumer })` to get current trends
4. Call `buildCreativePrompt('vibe-proposals', { brandDNA, consumer, season, trends })` + `generateJSON()` to synthesize a draft brief: color_story, archetypes_focus, family_pivot, creative_narrative
5. Return `DraftCreativeBrief` for the user to accept / edit / replace

### 6.4 New lib: `src/lib/strategy/proposers.ts`

Three functions, each producing candidates that get persisted via the orchestrator's regular candidate pipeline:

`proposeNewSKUs({ runId, brief })`:
1. Load top carryover survivors + peak SKUs from the run's `strategy_sku_scores`
2. Load active brief (or auto-discover via 6.3)
3. Build a prompt similar to `/api/ai/generate-skus` but framed as "Extend these winners":
   - System: merchPlanner persona
   - User: "Given these proven silhouettes [{ winners }] and this creative direction [{ brief }], propose {N} NEW SKUs that extend them. For each: source_lineage_ref, target_color, target_archetype, projected_pvp, projected_demand_pct_of_source, rationale."
4. `generateJSON()` → array of new SKU proposals
5. Convert to `RecommendationCandidate` with `action_type: 'new_sku_proposal'` and `scope: 'sku'` (the scope_ref is the source_lineage_id)

`proposeFamilyExtensions({ runId, brief })`:
1. Find families where `family_roi > 1.5 OR hero_count >= 2`
2. Filter to families the brief pivots POSITIVELY into (`family_pivot[code] > 0`)
3. Build a prompt: "Family X is winning + creative pivots into it. Propose {3-5} new archetype concepts within this family that fit the creative direction."
4. Convert to `RecommendationCandidate` with `action_type: 'family_extension'` and `scope: 'family'`

`recommendPalette({ runId, familyCode })`:
1. Pull all SKUs in that family from the run, sort by `effective_margin × demand_score`
2. Extract their color codes + names (via active color taxonomy)
3. Call `researchTrends(query='SS27 color trends ${family}', type='deep-dive', targetDimension='color')` to get current color signals
4. Synthesize via `generateJSON()`: 5-7 colors with hex + name + confidence + bridges (which winning SKU could carry this color forward) + tension (which color may misalign with brand DNA)
5. Persist in `strategy_recommended_palettes`

### 6.5 New API endpoints

- `POST /api/strategy/briefs/discover`
  - Body: `{ tenant_slug }` (analyst+ role)
  - Calls `discoverCreativeBrief()`
  - Returns a draft brief JSON (NOT persisted; user clicks "Accept" to create a real `strategy_creative_briefs` row)

- `POST /api/strategy/runs/[runId]/propose-skus`
  - Body: `{ count: 5..20 }` (defaults to 8)
  - Calls `proposeNewSKUs()`
  - Persists candidates with action_type='new_sku_proposal' to `strategy_recommendation_candidates`
  - Returns the new candidate IDs

- `POST /api/strategy/runs/[runId]/propose-extensions`
  - Body: `{ familyCode? }` (optional filter, otherwise all eligible families)
  - Calls `proposeFamilyExtensions()`
  - Persists candidates with action_type='family_extension'

- `POST /api/strategy/runs/[runId]/recommend-palette`
  - Body: `{ familyCode }` (required)
  - Calls `recommendPalette()`
  - Persists in `strategy_recommended_palettes` + emits a UI-visible payload

### 6.6 UI updates

- Brief editor (`/strategy/[slug]/briefs/new`):
  - Add "Discover with AI" button at top of form
  - On click: POST to `/api/strategy/briefs/discover` → fill form fields with draft

- Run detail (`/strategy/[slug]/runs/[id]`):
  - When run is complete and a brief exists, show 3 new CTAs:
    - "Propose new SKUs"
    - "Propose family extensions"
    - "Recommend palette per family"
  - On click: POST to corresponding endpoint → page refreshes with new candidates visible
  - Render `new_sku_proposal` and `family_extension` candidates with their distinctive evidence (projected_pvp, source_lineage_ref, target_archetype)

- Decision pack (`/strategy/[slug]/runs/[id]/decision-pack`):
  - Add a "Generative recommendations" section between scenarios and family scoreboard
  - Lists new_sku_proposal + family_extension cards with rationale

### 6.7 What we deliberately are NOT building in Paso 2

- A new SKU IMAGE generator (DALL-E / Imagen / Freepik render). Defer to Paso 4 with the image ingestion work. UI shows the thumbnail slot empty.
- A full pricing optimizer. Existing `researchBrandPricing()` is used as a context provider, not a generator.
- A trend forecaster. We surface trends FROM Perplexity, we don't predict them.

---

## 7. Sequence to execute

1. **Migration 062**: add `tenant_brand_profile` to `strategy_tenants` + create `strategy_recommended_palettes` table
2. **`context-loader.ts`**: `loadStrategyTenantContext(tenantId)` — the equivalent of `loadFullContext` for Strategy tenants
3. **`creative-discovery.ts`**: `discoverCreativeBrief(...)` reusing `researchBrand`, `researchTrends`, `buildCreativePrompt('vibe-proposals')`, `generateJSON()`
4. **`proposers.ts`**: `proposeNewSKUs`, `proposeFamilyExtensions`, `recommendPalette`
5. **API endpoints** (4 routes)
6. **UI**:
   - Discover button on brief editor
   - 3 CTAs on run detail
   - Card rendering for new_sku_proposal + family_extension
   - Decision pack section

7. **TS build + commit + push**

Estimated scope: ~1,200 LOC + 1 migration.

---

## 8. Open questions for Felipe (only after seeing this)

1. For the standalone customer (no Block 1), should `tenant_brand_profile` be:
   - A. A simple JSONB field the customer fills at onboarding via a one-page form?
   - B. An auto-discovery flow (we call `researchBrand()` on tenant_name and propose, customer accepts)?
   - C. Both — start with auto-discovery, present results, customer edits

2. When `discoverCreativeBrief` is called WITH an existing brief, should it:
   - A. Refuse (the brief is already set)?
   - B. Propose a refresh (refresh trends, refresh draft, present alongside the existing)?
   - C. Overwrite (replace the existing)?

3. For `proposeNewSKUs`, should the projected demand be:
   - A. A simple multiplier of the source lineage's demand (e.g. 0.6×)?
   - B. A confidence-weighted projection (low if creative_fit conflict, high if alignment)?
   - C. Hand-tuned by the merchandiser before the run goes into the scenario assembler?

I'd default to: 1B, 2B, 3B. Will proceed under these defaults unless Felipe overrides.
