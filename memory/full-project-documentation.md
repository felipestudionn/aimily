# aimily — Full Project Documentation (The Bible)

> **Last verified**: 2026-05-21 — deep rewrite. Every claim cross-checked against code + recent git history. Replaces the 2026-05-06 version, which had drifted across 4+ feature waves (In-Season feedback loop, Studio rebrand, pricing v6, Aimily Assistant, landing redesign).
>
> **Source of truth rule**: when this document conflicts with code, code wins. Verify before quoting — and when you spot drift, update the Bible in the same PR that changes the code.
>
> **Companion docs** (each owns a deeper slice):
> - `architecture_in-season-feedback-loop.md` — In-Season pipeline (parsers, scoring, scenarios, OAuth)
> - `architecture-ecom.md` — DTC storefront generator on `*.aimily.shop`
> - `architecture-presentation.md` — Public presentation deck module
> - `architecture-tree-rubik-cube.md` — Block × mini-block × micro-block tree
> - `architecture-block-3.md` — Design & Development block deep map
> - `design-components-canonical.md` — MANDATORY component inventory (do not invent variants)
> - `ai-generation-bible.md` — Per-endpoint AI provider map + fallback chains
> - `shopify-partner-app-oauth.md` — Replicable Shopify OAuth Partner App setup
> - `product-spec_aimily-in-season-2026-05-17.md` — In-Season cardinal rules + 13 decision verbs
>
> Also in the repo: `memory/credentials.md` + `memory/credentials_cloudflare-aimily-shop.md`, `memory/changelog.md`, `memory/db-dropped-tables-backup-2026-05-21.md`, plus ~40 research / decision-map / handoff docs.
>
> A second tranche of canonical docs lives in the user memory directory (`~/.claude/projects/-Users-felipemartinez-aimily/memory/`), not in the repo: `state_aimily-studio-2026-05-16.md`, `framework_retailer-agnostic-in-season-engine.md`, `security-ai-privacy.md`, `vercel-env-vars.md`, `stripe-billing.md`. They are referenced by name; pointers in §20.

---

## 1. WHAT AIMILY IS

aimily is an **AI-native operating system for fashion brands**. It runs the entire lifecycle of a collection — creative direction, range plan, design, production, marketing, ecom — and then closes the loop with real sales data to inform the next collection.

The platform ships as **three coupled products** that share the same account, brand identity, and Aimily Credits bucket:

1. **aimily 360** — the collection workspace. 4 blocks × 5 mini-blocks each, with AI assistance at every step and a CIS (Collection Intelligence System) that captures every decision and threads it into every AI prompt.
2. **Aimily Studio** — standalone AI image/video studio (`/studio`). Lifestyle, editorial, still-life, try-on, video. Founder/Team customers use it from the unified credits bucket; non-subscribers can buy one-shot Studio packs (€49 / €99 / €199).
3. **aimily In-Season** — daily in-season sales management for fashion buyers and commercials. Connects Shopify (OAuth) or accepts PDF/CSV imports, classifies SKUs into 13 verbs (REPLENISH / KILL / RESIZE / RECOLOR / CARRY_OVER / MARKDOWN / INVESTIGATE / AMPLIFY_DISTRIBUTION / EXTEND_COLORS / AMPLIFY_NEXT_SEASON / PROMOTE_PUSH / PULL_FORWARD_INTAKE / WAIT), and feeds verdicts back into the next collection through the seeds gate.

| Fact | Value |
|---|---|
| Public URL | `https://www.aimily.app` (also `aimily.app`) |
| Public ecom wildcard | `*.aimily.shop` |
| Company | StudioNN Agency S.L. · NIF B42978130 · Avinguda Del Doctor Gadea 1, 10E, 03003 Alicante, Spain |
| Contact email | `hello@aimily.app` |
| Repo | `felipes-projects-ab46a8c8/aimily` on Vercel · GitHub main branch |
| Supabase | project `sbweszownvspzjfejmfx` |

---

## 2. TECH STACK (verified against package.json 2026-05-21)

| Layer | Technology | Version / notes |
|---|---|---|
| Framework | Next.js | 16.1.6 · App Router · React 19.2 · TypeScript 5.8 |
| Styling | Tailwind CSS | 4.2.2 (Tailwind v4 with `@tailwindcss/postcss`) |
| Components | shadcn/ui (Radix) + Lucide icons | `src/components/ui/` only — see `design-components-canonical.md` |
| Auth & DB | Supabase | `@supabase/ssr` 0.9 · `@supabase/supabase-js` 2.84 · cookies-based SSR |
| Payments | Stripe | server SDK 20.4 · API version `2026-02-25.clover` · LIVE mode |
| Email | Resend | SPF/DKIM/DMARC verified · sender `aimily <noreply@aimily.app>` |
| i18n | next-intl 4.11 | 9 locales: en, es, fr, it, de, pt, nl, no, sv (default `en`) |
| Text AI · primary | Anthropic Claude Haiku 4.5 | `claude-haiku-4-5-20251001` |
| Text AI · fallback | Google Gemini 2.5 Flash Lite | `models/gemini-2.5-flash-lite` |
| Text AI · heavy | Anthropic Claude Sonnet 4.5 | SEO research, long-form |
| Live search | Perplexity Sonar | brand DNA, trends, SEO competitors |
| Design renders | OpenAI gpt-image-1.5 | sketches + colorized + 3D render |
| Still life / try-on / editorial | Freepik Nano Banana (Gemini 2.5 Flash Image) | 1–3 reference images |
| Model headshots | Freepik Mystic | 28-model brand roster |
| Video | Freepik Kling 2.1 Pro / Std | image-to-video, async polling |
| OAuth | Google sign-in | Supabase-managed |
| Observability | PostHog · Sentry · Vercel Analytics | funnel + errors + Web Vitals |
| Hosting | Vercel | Pro plan · Fluid Compute · 5 cron jobs |
| Domain (app) | IONOS (`aimily.app`) | DNS-API managed |
| Domain (ecom) | Cloudflare (`aimily.shop`) | wildcard CNAME + per-subdomain SSL via Vercel API |

The full AI provider map per endpoint is in `ai-generation-bible.md`. `src/lib/ai/llm-client.ts` exports `generateJSON` / `generateText` which try Claude Haiku first and fall back to Gemini.

---

## 3. THREE PRODUCTS, ONE ACCOUNT

A single signup gives the user access to all three products. The header pill (`StudioSwitcher`) lets them toggle between them. The **Aimily Credits** bucket is shared across all three.

```
                        ┌──────────────────────┐
                        │   aimily account     │
                        │   (one Stripe sub)   │
                        └──────────┬───────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
        aimily 360            Aimily Studio        aimily In-Season
       /my-collections          /studio              /in-season
   collection lifecycle    standalone AI images   daily sales mgmt
       (4 blocks)          + video (€49/€99/€199    (13 verbs,
                            packs OR credits)       feedback loop)
              │                    │                    │
              └────────────────────┴────────────────────┘
                                   │
                          shared Aimily Credits bucket
                       (sketch=1, still_life=3, tryon=3,
                        editorial=5, video_kling=30,
                        in_season_run=10)
```

### 3.1 The Collection Loop (closes via In-Season → seeds)

```
   Block 1: Creative & Brand          Block 4: Marketing & Sales
   ┌─────────────────┐                ┌─────────────────────┐
   │ Consumer        │                │ GTM & Launch Plan   │
   │ Moodboard       │                │ Content Studio      │
   │ Market Research │                │ Communications      │
   │ Brand Identity  │                │ Sales Dashboard     │
   │ Creative Overv. │                │ Ecom (storefront)   │
   └────────┬────────┘                └──────────┬──────────┘
            │                                     │
            ▼                                     ▼
   Block 2: Merchandising            ┌─────────────────────┐
   ┌─────────────────┐               │  aimily In-Season   │
   │ Buying Strategy │               │   - sales sync      │
   │ Assortment &Pri.│               │   - 13-verb classif.│
   │ Distribution    │               │   - scenarios       │
   │ Financial Plan  │               │   - seeds pool      │
   │ Collection Bld. │◀──── seeds ───┤   - Aimily Design   │
   └────────┬────────┘    feed next  └──────────▲──────────┘
            │            collection             │
            ▼                                    │ pulls actuals
   Block 3: Design & Development                 │
   ┌─────────────────┐                          │
   │ Sketch & Color  │                          │
   │ Tech Pack       │                          │
   │ Prototyping     │                          │
   │ Production      │                          │
   │ Final Selection │                          │
   └────────┬────────┘                          │
            │                                    │
            └────────────────────────────────────┘
```

---

## 4. ROUTING & FOLDER LAYOUT

Top-level groups under `src/app/`:

| Group | Purpose | Auth |
|---|---|---|
| `[locale]/` | Public marketing pages (next-intl, 9 locales) | Public |
| `(app)/` | Authenticated dashboard | Required |
| `(storefront)/` | Wildcard `*.aimily.shop` SSR storefronts | Public (per-storefront) |
| `api/` | 212 route handlers | Per-route |

### 4.1 Public marketing (`src/app/[locale]/...`)

| Route | Component | Notes |
|---|---|---|
| `/[locale]` | `MarketingHomeClient` | Home with 5 blocks (Creative · Merch · Design · Marketing · In-Season) |
| `/[locale]/in-season` | dedicated landing | In-Season product page |
| `/[locale]/studio` | dedicated landing | Aimily Studio product page |
| `/[locale]/student` | student program | 12-mo free for institutional emails |
| `/[locale]/strategy` | legacy → redirects to `/in-season` (308 in `next.config.js`) | |
| `/[locale]/contact` · `/trust` · `/privacy` · `/terms` · `/cookies` | static | |
| `/[locale]/vs/[competitor]` | comparison pages | SEO long-tail |
| `/[locale]/workflows/[slug]` · `/how-to/[slug]` | MDX content | SEO long-tail |

Bare paths (`/contact`, `/privacy`, …) redirect to `/[locale]/<path>` via next-intl middleware. The middleware logic is in [`src/middleware.ts`](src/middleware.ts) (`MARKETING_BARE_PATHS`, `MARKETING_LOCALE_ONLY_PATHS`, `MARKETING_PREFIXES`).

### 4.2 Authenticated app (`src/app/(app)/...`)

| Route | Purpose |
|---|---|
| `/my-collections` | Collection hub (grid + progress + deadlines) |
| `/new-collection` | Intent selector (Empezar · Studio · In-Season). `?direct=1` skips selector |
| `/account` | Settings, subscription, GDPR export/delete |
| `/welcome` · `/welcome/tour` | First-run onboarding |
| `/studio` · `/studio/new` · `/studio/[id]` | Aimily Studio dashboard + project view |
| `/in-season` · `/in-season/[tenant]/{page,seeds,setup,upload,connections}` | In-Season multi-tenant hub |
| `/library/artworks` | Artwork library |
| `/planner/[id]` | Standalone collection planner |
| `/p/[token]` | Public share link viewer (presentation deck) |
| `/vendor/[token]` | Vendor portal (signed JWT, no auth) |
| `/video-reel` · `/auth/*` | Auth utility pages |
| `/presentation/export/[id]` · `/tech-pack/export/[skuId]` | Internal PDF export targets |

#### 4.2.1 Collection workspaces (`/collection/[id]/...`)

| Route | Component | Block |
|---|---|---|
| `/collection/[id]` | `CollectionOverview` | Hub — 4 block cards + In-Season banner |
| `/collection/[id]/calendar` | embedded Gantt | All blocks |
| `/collection/[id]/creative?block=…` | `CreativePage` | Block 1 (consumer · moodboard · research · brand-dna · synthesis) |
| `/collection/[id]/merchandising?block=…` | `MerchandisingPage` | Block 2 (scenarios · families · channels · wholesale · budget) |
| `/collection/[id]/product?phase=…` | `PlannerDashboard` | Block 3 phases (sketch · techpack · prototyping · production · selection) |
| `/collection/[id]/marketing/creation?block=…` | `MarketingCreationScreen` | Block 4 (gtm · content · comms · sales · ecom) |
| `/collection/[id]/presentation` | shared deck viewer | Cross-cut |
| `/collection/[id]/factories` · `/suppliers` · `/vendors` · `/compliance` · `/variance` | partner + compliance + variance dashboards | Block 3 |

### 4.3 Storefront SSR (`src/app/(storefront)/storefront/[host]/...`)

Wildcard `*.aimily.shop` → middleware rewrites to `/storefront/<encoded-host>`. Pages: `page.tsx` (home) · `shop/page.tsx` (PLP) · `shop/[sku]/page.tsx` (PDP) · `lookbook` · `about` · `contact` · dynamic `sitemap.xml`, `robots.txt`, `og.png`. Full reference: `architecture-ecom.md`.

---

## 5. THE 4-BLOCK ARCHITECTURE (verified against `CollectionOverview.tsx`)

```
BLOCK 1 · Creative & Brand
  consumer    Define target audience, build personas
  moodboard   Visual references + creative direction
  research    Trends, deep dive, signals, competitors
  brand       Brand DNA, voice, visual identity
  synthesis   Consolidated creative brief (output)

BLOCK 2 · Merchandising & Planning
  scenarios   Buying strategy A/B/C (SKU count + budget)
  families    Assortment & pricing architecture
  channels    Distribution (DTC + wholesale + markets)
  budget      Financial plan (target, margins, sell-through)
  builder     Collection Builder · SKU grid (output → /product)

BLOCK 3 · Design & Development
  sketch       Sketches + colorways + materials
  tech-pack    Specs + BOM + factory selection
  prototyping  Proto review + fit sessions
  production   Size runs + factory orders + logistics
  selection    Final line review (output)

BLOCK 4 · Marketing & Sales
  gtm        Pre-launch, press, content calendar, countdown
  content    Per-SKU visual pipeline (Studio inside the collection)
  comms      Copy + SEO + social + email + brand voice
  sales      Forecasting + drop planning + commercial KPIs
  ecom       DTC storefront publish (output → *.aimily.shop)
```

**The loop closes in `aimily In-Season`** — sales actuals from the published collection feed the next collection through SKU verdicts and seeds.

### 5.1 CIS — Collection Intelligence System

The CIS is the spine. Every meaningful decision is captured to `collection_decisions` (271 rows in prod across 6 collections) and read back on every AI generation server-side via `loadFullContext()`. **This is the platform's #1 competitive moat.**

```
src/lib/collection-intelligence.ts    recordDecision · getIntelligence · compilePromptContext
src/lib/ai/load-full-context.ts       loadFullContext(planId) — used by ALL AI endpoints
src/lib/ai/prompt-foundations.ts      buildInheritedContext — formats CIS into prompts
src/lib/prompts/prompt-context.ts     buildPromptContext — reads CIS + DB tables
public.collection_decisions           domain/subdomain/key/value JSONB/tags/version/rationale
```

**ARCHITECTURE LOCK (rule of the project)**: frontend changes must NEVER modify these 5 files. UI work sends `collectionPlanId` only; the server loads everything else from the DB. Any new AI endpoint must call `loadFullContext()` — no endpoint-specific loaders.

The 32 routes under `/api/ai/*` that currently consume CIS context are listed in §9.

---

## 6. AIMILY IN-SEASON (the 5th product · `/in-season`)

In-Season is the **6th and final block** of the aimily 360 flow conceptually, but it lives as its own surface so a brand can plug it in without owning a collection in aimily yet. Canonical product naming: **"In-Season Sales Management & Actions — daily in-season decisions backed by your own SKU data — what to replenish, kill, resize, recolor, carry over, mark down, or investigate."** Retired naming: "Forensic merchandising intelligence" (deprecated 2026-05-20).

### 6.1 Multi-tenant model

A user owns one or more `in_season_tenants`. Felipe's two demo tenants:
- `big-brand-demo` · *Big brand · Reporte interno* — PDF intake (Zara RNK style). 1 source, 1 completed run.
- `dtc-shopify-demo` · *DTC brand · Shopify live* — Shopify GraphQL Admin API via OAuth Partner App. 14 sources, 9 completed runs.

### 6.2 Data ingestion (multi-source)

| Connector | Parser | OAuth? |
|---|---|---|
| Shopify | [`shopify-graphql.ts`](src/lib/in-season/parsers/shopify-graphql.ts) + [`shopify-csv.ts`](src/lib/in-season/parsers/shopify-csv.ts) | Yes · Partner App live since 2026-05-20 |
| Stripe | [`stripe-api.ts`](src/lib/in-season/parsers/stripe-api.ts) | Yes |
| Big brand RNK PDF | [`zara-rnk-pdf.ts`](src/lib/in-season/parsers/zara-rnk-pdf.ts) | n/a (file upload) |
| Generic CSV | shopify-csv parser | n/a |

The triplet `parser + retailer profile + taxonomy` makes the engine retailer-agnostic. See [`framework_retailer-agnostic-in-season-engine.md`](memory/framework_retailer-agnostic-in-season-engine.md).

### 6.3 Pipeline tables (24 tables, all `in_season_*`)

```
in_season_tenants                 enterprise customer entity
in_season_tenant_members          access control per user
in_season_sources                 ingestion metadata
in_season_raw_records             original rows preserved for re-derivation
in_season_product_facts           normalized product identity per snapshot
in_season_inventory_facts         multi-location stock per snapshot
in_season_sales_windows           velocity per window (4656 rows in dogfood)
in_season_efficiency_facts        lifecycle: bought/sold/shipped/ST/returns
in_season_sku_identity_graph      confidence-weighted lineage (renames + ERP aliases)
in_season_taxonomies              per-tenant family/color/archetype mapping
in_season_constraints             hard/semi-hard commercial constraints (Bucket A)
in_season_creative_briefs         OPTIONAL creative direction (Bucket B · soft weights)
in_season_algorithm_versions      versioned classifier bundles
in_season_analysis_runs           one row per run
in_season_sku_scores              per SKU per run · 6 confidence dimensions
in_season_family_scores           ROI + saturation + cannibalization
in_season_recommendation_candidates  concrete actions pre-assembly
in_season_scenarios               assembled recommendation sets
in_season_replenishment_allocations  per-SKU buy units per scenario
in_season_user_sku_selections     chooser-UI locks per SKU
in_season_action_executions       Aimily Design output assets (variants/extensions)
in_season_inventory_snapshots     daily cron-populated price+stock history
in_season_tenant_connectors       per-tenant credentials (v2 needs pgsodium)
in_season_sku_seeds               verdicts that feed the next collection
in_season_recommended_palettes    per-family color recommendations
in_season_backtests               train-on-N-1 / test-on-N (required for paid pilot)
```

Migrations 065–072 own the In-Season schema and the security hardening (Vault-encrypted tokens, webhook idempotency + DLQ).

### 6.4 The 13 decision verbs

`REPLENISH · KILL · RESIZE · RECOLOR · CARRY_OVER · MARKDOWN · INVESTIGATE · AMPLIFY_DISTRIBUTION · EXTEND_COLORS · AMPLIFY_NEXT_SEASON · PROMOTE_PUSH · PULL_FORWARD_INTAKE · WAIT`

Scope decision (2026-05-17): **aimily does NOT do inter-store transfer.** It DOES do `AMPLIFY_DISTRIBUTION` (warehouse → more stores).

Each verdict carries a **6-dimension confidence score** (data quality, signal strength, sample size, recency, model agreement, business-rule consistency) — not a single number — because graceful degradation is mandatory. When tenant input is missing, the system uses synthetic estimates flagged in the UI with the confidence drop.

### 6.5 The feedback loop (5 sprints A→F+, all shipped 2026-05-20)

```
1. user-initiated seeds        verdict pill → "+ Añadir a semillas" or "Desarrollar ahora"
2. seeds pool                  /in-season/<tenant>/seeds (carbon palette SKU-card grid)
3. apply-to-moodboard          POST /api/collection-plans/[id]/seeds/apply-to-moodboard
4. new-collection gate         banner + picker modal in /new-collection
5. consumption tracking        consumed_in_collection_id links seed → collection
```

Banner CTA in `CollectionOverview` flips to "Abrir Moodboard" after `applied_to_moodboard_at` is set.

### 6.6 In-Season ↔ Aimily Design (shipped 2026-05-19)

Verdict pills `extend_colors` / `amplify_next_season` open Aimily Design — a Builder phase in the collection workspace that crops the source PDF photo and creates a new SKU in collection "Aimily Design — In-Season". Two modes: **Réplica fiel 1:1** and **Variación 85/15**. Full reference: [`aimily-design-architecture-2026-05-19.md`](memory/aimily-design-architecture-2026-05-19.md).

### 6.7 API surface (36 routes under `/api/in-season/*` + `/api/cron/in-season/*`)

| Route | Purpose |
|---|---|
| `POST /oauth/shopify/install` + `/callback` | HMAC-signed install flow; tokens stored in Supabase Vault |
| `GET/POST /sales-connections` + `/[id]/sync` | Per-tenant connector management |
| `POST /webhooks/shopify` + `/webhooks/stripe` | Idempotent (per-tenant Vault signing secrets) |
| `GET/POST /runs` + `/[runId]/{execute,narrate,backtest,sku-selections,skus,propose-extensions,propose-skus,recommend-palette}` | Full run lifecycle |
| `POST /runs/[runId]/scenarios/create-custom` + `/[scenarioId]/{allocate-replenishment,promote}` | Scenario manipulation |
| `GET/POST /seeds` + `/seeds/[id]` + `/seeds/summary` | Seeds CRUD |
| `POST /sku-actions/open-design` | Bridge to Aimily Design |
| `POST /sources/upload` + `/shopify-ingest` + `/[sourceId]/parse` | Manual ingestion |
| `GET/POST /briefs` + `/discover` + `/constraints` + `/moodboard/upload` + `/market-trends` + `/analyze-moodboard` | Bucket B creative side |

Daily crons (`vercel.json`): `/api/cron/in-season/inventory-snapshot` (06:00 UTC) + `/api/cron/in-season/sales-sync` (07:00 UTC).

### 6.8 Cardinal rules

Read [`product-spec_aimily-in-season-2026-05-17.md`](memory/product-spec_aimily-in-season-2026-05-17.md) for the canonical product spec — 8 input buckets, 5 header KPIs (GMROI, ST vs plan, FWOC/LT, S/S, MMU), 13 decision gates, stacking & filtering, graceful degradation rule.

---

## 7. AIMILY STUDIO (standalone product · `/studio`)

Aimily Studio is **the marketing AI pipeline of aimily 360, broken out as a standalone product** for brands that already have a catalog and just want photoshoots/video at scale.

### 7.1 Packs (one-shot Stripe Checkout, no subscription)

| Pack | Price | Includes |
|---|---|---|
| Capsule | €49 | Still life + try-on for up to 5 SKUs |
| Editorial | €99 | Above + editorial on-model |
| Full Campaign | €199 | Above + Kling 2.1 Pro video |

Subscribers (Founder / Team / Team Pro) generate from the unified Aimily Credits bucket and don't need to buy packs.

### 7.2 Stack

- **Image generation**: OpenAI gpt-image-1.5 (HD), Freepik Nano Banana (Gemini 2.5 Flash Image), Flux 2 Pro (headshots)
- **Video**: Freepik Kling 2.1 Pro/Std via async polling pipeline
- **Background removal**: [`src/lib/studio/background-removal.ts`](src/lib/studio/background-removal.ts)
- **Multi-format export**: [`src/lib/studio/multi-format.ts`](src/lib/studio/multi-format.ts) — Instagram square/story, e-com web, print

### 7.3 DB

```
studio_projects          one row per brand container per user (1 row in prod)
studio_purchases         Stripe payment record
studio_output_formats    per-format derivative URLs
```

### 7.4 API (16 routes under `/api/studio/*`)

`generate` · `variation` · `video` + `video/status` · `output-formats` · `download` · `download-zip` · `upload` · `projects` + `projects/[id]` · `style-memory` · `checkout`.

Full state of play: [`state_aimily-studio-2026-05-16.md`](memory/state_aimily-studio-2026-05-16.md).

---

## 8. PRICING & BILLING (v6 · LIVE since 2026-05-20)

Source of truth: [`src/lib/stripe.ts`](src/lib/stripe.ts).

### 8.1 Plans

| Plan | Monthly | Annual/mo | Aimily Credits/mo | Users | Storefronts | Notes |
|---|---|---|---|---|---|---|
| `trial` | Free 30d, no card | — | 100 | 1 | 1 | `payment_method_collection: if_required` |
| `student` | Free 12mo | — | 100 | 1 | 1 | Auto-verified via 167-school whitelist |
| `founder` | €99 | €79 | 100 | 1 | 1 | Indie default |
| `team` | €599 | €479 | 1.000 | 10 | 5 | + collab, roles, multi-brand |
| `team_pro` | €999 | €799 | 5.000 | 25 | 25 | + analytics (private — not on public pricing page) |
| `enterprise` | from €3.000 | custom | ∞ | ∞ | ∞ | SSO + API + dedicated support |

Public pricing page exposes Founder + Team (+ Enterprise contact). Team Pro is a soft-upsell tier visible only in code / checkout. The 3 legacy products (Starter / Professional / Pro Max) were archived in Stripe on 2026-05-20.

### 8.2 Aimily Credits (shared bucket)

`src/lib/stripe.ts#CREDIT_COSTS`:

| Action | Cost |
|---|---|
| sketch (single image: sketch · colorize · brand-board · brand-reference) | 1 |
| still_life | 3 |
| tryon | 3 |
| editorial | 5 |
| video_kling | 30 |
| in_season_run | 10 |

Top-up packs (one-time): +50 €29 · +250 €119 · +1.000 €399. Studio standalone packs (€49/€99/€199) coexist for customers without a subscription.

Active migration note: most AI endpoints still call `checkImageryUsage(units)` directly. `consumeCredits(userId, email, action)` in `src/lib/api-auth.ts` is the new canonical helper — In-Season runs already use it (`/api/in-season/runs/[id]/execute`). Pricing-page alignment with `CREDIT_COSTS` is a deliberate follow-up (don't change pricing on live users without comms).

### 8.3 Stripe surface

```
LIVE products            Aimily Founder · Aimily Team · Aimily Team Pro
                         + 3 Studio packs (Capsule/Editorial/Full Campaign)
                         + 3 Credit packs (50/250/1000)
ARCHIVED                 Starter, Professional, Pro Max (2026-05-20)
Webhook                  POST /api/webhooks/stripe — handles subscription
                         + studio purchase + credit pack events
Env vars (Vercel × 3 targets):
   STRIPE_FOUNDER_MONTHLY_PRICE_ID  + STRIPE_FOUNDER_ANNUAL_PRICE_ID
   STRIPE_TEAM_MONTHLY_PRICE_ID     + STRIPE_TEAM_ANNUAL_PRICE_ID
   STRIPE_TEAM_PRO_MONTHLY_PRICE_ID + STRIPE_TEAM_PRO_ANNUAL_PRICE_ID
   STRIPE_CREDITS_PACK_{50,250,1000}_PRICE_ID
   STRIPE_STUDIO_PACK_{CAPSULE,EDITORIAL,FULL_CAMPAIGN}_PRICE_ID
Promo                    Private STUDIONN50 coupon (50% × 12mo)
                         Public launch promo archived
```

### 8.4 Billing UI

- `CreditMeter` pill (top-right, hidden on `/new-collection`) — progress bar + costs table + "Buy more" / "Upgrade" CTAs
- `SubscriptionContext` exposes `subscription`, `isPaid`, `isTrial`, `canUseAI`, `aiUsagePercent`, `checkoutPlan(plan, annual?)`, `openPortal()`
- Refunds: `/api/billing/refund` + `/api/billing/refund-eligibility` (Studio purchases are refundable within 14 days)

---

## 9. AI ARCHITECTURE

### 9.1 Provider waterfall

```
generateJSON / generateText  (src/lib/ai/llm-client.ts)
  ├─► Claude Haiku 4.5    primary
  └─► Gemini 2.5 Flash    fallback (on Anthropic 429 / timeout)

Domain-specific:
  Claude Sonnet 4.5       SEO heavy text, complex narratives
  Perplexity Sonar        live web (brand DNA, trends, competitors)
  OpenAI gpt-image-1.5    design renders (sketches, colorize, 3D)
  Freepik Nano Banana     still life · try-on · editorial
  Freepik Mystic          aimily 28-model headshots
  Freepik Kling 2.1       image-to-video (async)
```

### 9.2 The 32 AI endpoints (`/api/ai/*`)

Sub-trees:
- **CIS-consuming (must use `loadFullContext()`)**: `creative-generate`, `merch-generate`, `design-generate`, `consumer-suggest-input`, `research-suggest-input`, `brand-propose`, `brand-from-external`, `generate-skus`, `scenarios-deepen`, `scenarios-prefill-editor`, `distribution-propose`, `sales-strategy-prefill-editor`, `seo-keywords`, `seo-onpage`, `seo-competitors`, `seo-copy`, `seo-audit`, `post-launch/generate`, `freepik/editorial`, `freepik/still-life`, `freepik/tryon`
- **Utility / standalone** (no CIS): `analyze-moodboard`, `explore-trends`, `translate`, `costing/suggest-substitutions`, `sample-review/compare`, `tech-pack/generate`, `colorize-sketch`, `generate-sketch-options`, `freepik/sketch` (deprecated), `freepik/brand-model`, `freepik/video`, `zones/detect`

### 9.3 Credit consumption per endpoint

| Endpoint | Helper | Cost |
|---|---|---|
| `colorize-sketch` · `generate-sketch-options` · `freepik/brand-model` | `checkImageryUsage(1)` | 1 |
| `freepik/still-life` · `freepik/tryon` | `checkImageryUsage(1)` | 3 |
| `freepik/editorial` | `checkImageryUsage(1)` | 5 |
| `freepik/video` | `checkImageryUsage(5)` | 30 |
| `in-season/runs/[id]/execute` | `consumeCredits(action='in_season_run')` | 10 |

Refund-on-failure pattern: `refundImageryUnits(...)` / `refundCredits(...)` is called when the upstream provider returns an error or the async job ultimately fails.

### 9.4 The 5 architecture locks

1. **`loadFullContext` is the single entry point.** New AI endpoints must call it; no endpoint-specific loaders.
2. **`mergeContextWithInput` preserves frontend data.** Server context fills empty fields only.
3. **Frontend changes never touch context loading.** UI work shouldn't modify `load-full-context.ts`, `prompt-foundations.ts`, `prompt-context.ts`, `collection-intelligence.ts`, or any `/api/ai/*` route.
4. **New context fields flow through all three layers**: `loadFullContext` extraction → `buildInheritedContext` formatting → prompt template. Never skip one.
5. **CIS decisions are versioned, never deleted.** `recordDecision()` flips `is_current=false` on the previous version and inserts a new row.

Full prompt details: `ai-generation-bible.md`.

---

## 10. DATABASE (83 tables, all with RLS enabled · verified via Supabase MCP)

### 10.1 By family

**Core auth & billing (5)**
`subscriptions` · `ai_usage` · `imagery_credits` · `imagery_credit_purchases` · `audit_log`

**Collections (16)**
`collection_plans` · `collection_skus` · `collection_timelines` · `collection_assets` · `collection_workspace_data` · `collection_stories` · `collection_decisions` (CIS · 271 rows) · `collection_plan_strategy_links` · `drops` · `sku_colorways` · `sales_actions` · `sales_channels` · `wholesale_orders` · `aimily_models` (28-model roster) · `brand_profiles` · `brand_voice_config`

**Design & dev (8)**
`tech_pack_data` · `tech_pack_revisions` (28 rows · PLM parity, partial unique on `(sku_id) WHERE is_current=true`) · `tech_pack_comments` · `sample_reviews` · `production_orders` · `suppliers` · `factories` · `artworks`

**Marketing & ecom (8)**
`ai_generations` · `presentation_shares` · `presentation_deck_overrides` · `storefronts` · `storefront_overrides` · `storefront_publishes` · `user_brands` · `certifications`

**Vendor & team (3)**
`vendor_invitations` · `team_members` · `student_verifications`

**In-Season (24)**
See §6.3 above — `in_season_*` family.

**Tenant sales (4)**
`tenant_sales_connections` · `tenant_sales_sync_runs` · `tenant_sales_webhook_events` · `tenant_sales_webhook_dead_letters`

**Studio (3)**
`studio_projects` · `studio_purchases` · `studio_output_formats`

**Aimily Assistant (3)**
`aimily_assistant_conversations` (24) · `aimily_assistant_messages` (46) · `aimily_assistant_user_usage`

**Reference / static (7)**
`materials_library` (956 rows) · `pantone_colors` (2317) · `fx_rates` (30) · `academic_domains` (167) · `faq_documents` (110) · `faq_chat_log` (8) · `launch_promo_counter`

**Public trend data (3)**
`city_trends_raw` (3736) · `city_trends_processed` (262) · `tiktok_hashtag_trends` (18) — collection cron retired; raw kept for re-derivation

**Standalone (1)**
`standalone_timelines`

### 10.2 Migrations of interest

The migrations folder lives in `supabase/migrations/`. Recent waves:
- **065–072** · In-Season feedback loop, OAuth Vault encryption, webhook hardening (idempotency + DLQ), seeds gate
- **2026-05-21 drops** · 25 tables removed in 4 waves (raw_content, signals, reports, tech_packs old, market_predictions, product_copy, social_templates, email_templates_content, brand_models, pr_contacts, commercial_actions, content_calendar, content_pillars, launch_tasks, lookbook_pages, paid_campaigns, campaign_shoots, paid_ad_sets, launch_checklist, launch_issues, lessons_learned, asset_reviews, analyzed_content, processing_jobs, sales_entries) — see [`db-dropped-tables-backup-2026-05-21.md`](memory/db-dropped-tables-backup-2026-05-21.md) for rationale + backup of the 3 signals demo rows.

### 10.3 RLS pattern

```sql
-- Collection-scoped tables
collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())
-- Direct user tables
user_id = auth.uid()
-- Tenant-scoped (In-Season)
tenant_id IN (SELECT id FROM in_season_tenants WHERE owner_user_id = auth.uid())
                                                OR id IN (SELECT tenant_id FROM in_season_tenant_members WHERE user_id = auth.uid())
```

Service role bypasses RLS — only used in webhooks, admin ops, and `supabaseAdmin` server contexts.

---

## 11. API ROUTE INVENTORY (212 routes · verified 2026-05-21)

Full list at `/tmp/all-routes.txt` (regenerable from `find src/app/api -name route.ts`). Grouped:

| Group | Count | Notable routes |
|---|---|---|
| `/api/ai/*` | 32 | CIS-consuming generators + standalone tools |
| `/api/in-season/*` | 36 | OAuth, sync, runs, scenarios, seeds, briefs |
| `/api/cron/*` | 9 | 5 active (Vercel) + 3 pg_cron (cleanup × 2, trial-emails) + 1 unscheduled (`post-launch-analysis`) |
| `/api/studio/*` | 12 | generate, variation, video, downloads, projects |
| `/api/ecom/*` | 8 | publish/unpublish/validate/override/storefront |
| `/api/tech-pack/*` | 7 | revisions, comments, diff, decide, submit, export |
| `/api/billing/*` | 5 | checkout, portal, subscription, refund, refund-eligibility |
| `/api/collection-plans/*` | 4 | save, lock-selection, seeds, apply-to-moodboard |
| `/api/skus/*` (incl bulk) | 9 | CRUD + bulk-rename/scale-pvp/trim-lowest/update-margin |
| `/api/webhooks/*` | 2 | stripe, db-event |
| `/api/auth/*` | 3 | pinterest callback/signout, auth-email-hook |
| `/api/presentation/*` | 5 | data, export, override, promote, share + share/unlock |
| `/api/vendor-*` | 4 | invitations + portal |
| Other | ~76 | account, brand-*, drops, factories, suppliers, materials, pantone, fx-rates, notifications, fonts, financial-plan, etc. |

**Active Vercel crons** (`vercel.json`):
```
0 9  * * *  /api/cron/cert-expiry-warnings     supplier cert renewal warnings
0 16 * * *  /api/cron/fx-rates                 daily FX snapshot
0 3  * * *  /api/cron/expire-student-verifications  12-mo student access expiry
0 6  * * *  /api/cron/in-season/inventory-snapshot  daily stock+price freeze
0 7  * * *  /api/cron/in-season/sales-sync     pull sales from all active connectors
```

Routes scheduled via `pg_cron` (Supabase, not Vercel): `trial-emails`, `cleanup-deleted-collections`, `cleanup-storage-trash`. Lesson learned 2026-05-21: do NOT also add these to `vercel.json` — they'd run twice.

---

## 12. HOOKS, TYPES, COMPONENTS

### 12.1 Hooks (14 · `src/hooks/`)

```
useSkus                  collection_skus · add/update/delete
useDrops                  via useWorkspaceData
useColorways             sku_colorways · add/update/delete
useSampleReviews         sample_reviews · filtered by reviewType
useProductionOrders      production_orders · add/update/delete
useAiGenerations         ai_generations · filtered by type · toggleFavorite
useStories               collection_stories · bulkSave · assignSku
useNotifications         /api/notifications · unread count · dismiss
useAimilyModels          aimily_models · 28-model roster (filterable by gender)
useCollectionTimeline    collection_timelines · updateMilestone (1000ms debounce)
usePresentationData      /api/presentation/data · shareable deck
useWholesaleOrders       wholesale_orders CRUD
useWorkspaceData         collection_workspace_data + workspaces unlock map
useWizardState           computed phases[] + accessibility from milestones
```

Error contract: all writes throw via `src/hooks/hook-errors.ts#backendError`. Reads set local `error` state. Never silent-fail. (Locked rule.)

### 12.2 Types (13 files · `src/types/`)

`brand.ts` · `creative.ts` · `design.ts` · `digital.ts` · `marketing.ts` · `planner.ts` · `production.ts` · `prototyping.ts` · `sales-strategy.ts` · `storefront.ts` · `studio.ts` · `tech-pack.ts` · `timeline.ts`

Single rule: TS enum changes ship with the matching SQL migration.

### 12.3 Component tree (`src/components/`)

```
aimily-assistant/    in-app AI assistant chat surface
auth/                AuthModal + GoogleButton + ResetForm
Bg/                  background visual treatments
billing/             CreditMeter · UpgradePrompt · PlanCard
collections/         collection cards + grids
creative/            CIS-bound creative workspace cards
design-dev/          design/proto/sampling/production workspace cards
ecom/                EcomHub · SeoResearchHub · OverridesEditor · ThemePicker
faq/                 FAQ surface (backed by faq_documents + faq_chat_log)
landing/             marketing page sections (5-block home)
layout/              StudioSwitcher · CreditMeter · GlobalNav · Footer
marketing/           Block 4 workspace cards
materials/           materials_library browsers + pickers
merchandising/       Block 2 workspace cards (Family Card gold standard)
new-collection/      intent selector + date-picker wizard + seeds gate
notifications/       NotificationBell + dropdown
onboarding/          welcome tour
planner/             PlannerDashboard for /collection/[id]/product
presentation/        21-slide × 10-theme deck
providers/           PostHogProvider · SentryProvider · etc.
pwa/                 service worker registrar + install prompt
strategy/            (legacy alias for in-season components)
tech-pack/           PLM editor + revisions diff
timeline/            Gantt + milestones editor
ui/                  shadcn primitives (24 components — see §13)
wizard/              WorkspaceGate + WizardLayout + MiniWizards
workspace/           DecisionCard + WorkspaceShell + ViewPort
```

### 12.4 shadcn/ui inventory (`src/components/ui/`)

`accordion` · `animate-on-scroll` · `badge` · `button` · `card` · `collapsible` · `colored-svg` · `confirm-dialog` · `input` · `label` · `progress` · `segmented-pill` · `select` · `separator` · `slider` · `svg-icon` · `switch` · `tabs` · `textarea` · `toast` · `toggle` · `toggle-group` · `tooltip` · `index.ts` (24 components)

**LAW**: never raw `<input>`, `<button>`, `<label>`, `<textarea>` — always shadcn. Full design rules in `design-components-canonical.md` and `CLAUDE.md` §🚨 DESIGN SYSTEM V2.

---

## 13. ECOM STOREFRONT (`*.aimily.shop`)

Companion doc: [`architecture-ecom.md`](memory/architecture-ecom.md). Quick reference:

| Aspect | Detail |
|---|---|
| Domain | `aimily.shop` registered with Cloudflare Registrar ($30/yr) |
| DNS | Wildcard CNAME `* → cname.vercel-dns.com` (DNS-only, no proxy) |
| SSL | Per-subdomain via Vercel API on publish (Let's Encrypt 50/wk per domain) |
| Themes | 12 (`editorial-heritage` is the canonical bespoke; 9 use the `createAllPages` factory; 2 are single-page bespoke) |
| Payment providers | `lookbook_only` (default) · `stripe_buy_button` · `shopify_buy` — aimily NEVER touches money |
| Data loader | [`src/lib/storefront/load-storefront-data.ts`](src/lib/storefront/load-storefront-data.ts) reads CIS canonically and throws `StorefrontDataMissingError` rather than silently masking with defaults |
| Validator | [`src/lib/storefront/validate.ts`](src/lib/storefront/validate.ts) — same util used by `/api/ecom/publish` (blocks on errors) and `/api/ecom/validate` (UX feedback) |
| Quota | `subscriptions.storefront_quota` (1/5/25/∞) enforced via `can_publish_storefront(user_id)` RPC |
| Card location | `04.5 Ecom` inside Block 4 Marketing & Sales |

---

## 14. AUTH, SECURITY, GDPR

### 14.1 Auth

- SSR cookie-based via `@supabase/ssr`
- Browser: `src/lib/supabase/client.ts`
- Server: `src/lib/supabase/server.ts` (reads cookies)
- Admin: `src/lib/supabase-admin.ts` (service role — bypass RLS)
- Google OAuth: Supabase-managed
- Middleware ([`src/middleware.ts`](src/middleware.ts)): token refresh on every request, marketing paths delegated to next-intl, app paths gated, storefront wildcard rewritten

### 14.2 Rate limiting

`src/lib/rate-limit.ts` — per-IP throttle on auth and write endpoints (configurable per-route).

### 14.3 RLS

All 83 tables have RLS enabled. See §10.3 for the standard predicates. Service role policies live in migration `014_service_role_policies` + recent in-season hardenings.

### 14.4 GDPR

- Right of Access: `GET /api/account/export` — JSON download (verified to NOT reference dropped tables, fixed 2026-05-21)
- Right to Erasure: `POST /api/account/delete` — Stripe cancel + cascade data delete + auth.user delete
- Public policy pages: `/privacy` · `/terms` · `/cookies`
- Cookie banner: `src/components/CookieConsent.tsx`
- Data controller: StudioNN Agency S.L.

### 14.5 Audit log

`audit_log` table — 11 rows in prod. Writes from `src/lib/audit-log.ts`. Currently covers admin overrides + manual data corrections.

### 14.6 In-Season webhook hardening

Migration 070: per-tenant Vault signing secrets, idempotency table (`tenant_sales_webhook_events` unique `(provider, event_id)`), DLQ (`tenant_sales_webhook_dead_letters`). Replay = 200 `duplicate`.

---

## 15. OBSERVABILITY

| Tool | Purpose | Config |
|---|---|---|
| **PostHog** | Product funnel | `NEXT_PUBLIC_POSTHOG_KEY` · init in `src/lib/observability-bootstrap.tsx` · events in `src/lib/posthog.ts` |
| **Sentry** | Errors + perf | `SENTRY_DSN` · `sentry.{client,server,edge}.config.ts` · 10% perf, 100% errors |
| **Vercel Analytics** | Web Vitals | `<Analytics />` in root layout + per-storefront layout (host-tagged events) |

Tracked funnel events: `LANDING_VIEWED · CTA_CLICKED · AUTH_OPENED · SIGNUP_COMPLETED · COLLECTION_CREATED · AI_GENERATION_STARTED/SUCCEEDED/FAILED · IMAGERY_LIMIT_REACHED · CHECKOUT_OPENED · CREDIT_PACK_OPENED · SUBSCRIPTION_ACTIVATED`.

---

## 16. INFRASTRUCTURE & SERVICES

### 16.1 Supabase
- Project: `sbweszownvspzjfejmfx`
- Auth: password ≥8 chars · letters+digits · email confirmation · MFA on admin · rate limits 30/hr email, 150/hr token refresh
- SMTP: Resend (`smtp.resend.com:465`, sender `aimily <noreply@aimily.app>`)
- Site URL: `https://www.aimily.app`
- Redirect URLs: `https://www.aimily.app/**`, `http://localhost:3000/**`
- Vault used for In-Season OAuth tokens (Shopify access tokens encrypted at rest; plaintext column dropped in migration 069)

### 16.2 Stripe (LIVE)
- Account `acct_1T9iqZQxnvnXDeja` · EUR · Statement descriptor `AIMILY APP`
- Stripe Tax active (B2B reverse-charge · B2C EU per-country · outside EU 0%)
- Customer Portal configured
- Refund flow handled by `/api/webhooks/stripe`

### 16.3 Resend (email)
- Domain `aimily.app` verified (SPF, DKIM, DMARC via IONOS DNS)
- Templates: `signup-confirmation.html` · `password-reset.html` · `magic-link.html` · `email-change.html` (dark editorial: `#282A29` bg, `#FAEFE0` text)

### 16.4 Google OAuth
- Cloud Project `Gemini API` (ID `936283260324`)
- Client `aimily web`
- JS origins: `https://www.aimily.app`, `http://localhost:3000`
- Redirect URI: `https://sbweszownvspzjfejmfx.supabase.co/auth/v1/callback`

### 16.5 DNS — IONOS (`aimily.app`)
- API: `https://api.hosting.ionos.com/dns/v1/` · env vars `IONOS_DNS_API_KEY` + `IONOS_ZONE_ID_AIMILY`
- Key records: `A aimily.app → 76.76.21.21` · `CNAME www → cname.vercel-dns.com` · SPF/DKIM/DMARC for Resend + IONOS

### 16.6 DNS — Cloudflare (`aimily.shop`)
- Account `77123e1e9e30bb61364a9f9009c498cc` · Zone `58392d7347415328aae1d8ae6c7ff338`
- Env vars: `CLOUDFLARE_API_TOKEN` · `CLOUDFLARE_ACCOUNT_ID` · `CLOUDFLARE_ZONE_ID_AIMILY_SHOP`
- Migration path: post 2026-07-04 (NS lock expiry) can transfer to Vercel Domains for native wildcard SSL

### 16.7 Vercel
- Pro plan · Fluid Compute · Team `team_kieSXcYQ6bbTv4a94IR2DN1e`
- Domains: `aimily.app` · `www.aimily.app` · `*.aimily.shop`
- Auto-deploy from GitHub `main`
- `VERCEL_API_TOKEN` used by `/api/ecom/publish` to register per-subdomain SSL

### 16.8 Shopify Partner App (live since 2026-05-20)
- App "aimily In-Season" registered (client_id `9428e755ff23ab69e2a55affc7182c8b`, partner_org `4373888`)
- 9 read scopes (incl `read_returns`); Protected Customer Data Access approved
- Setup doc: [`shopify-partner-app-oauth.md`](memory/shopify-partner-app-oauth.md)

### 16.9 AI providers (env vars confirmed in Vercel)
`ANTHROPIC_API_KEY` · `GEMINI_API_KEY` · `OPENAI_API_KEY` · `PERPLEXITY_API_KEY` · `FREEPIK_API_KEY` (Mystic + Nano Banana + Kling)

### 16.10 Google Search Console
- Property `sc-domain:aimily.app` · DNS TXT verified
- Sitemap `https://www.aimily.app/sitemap.xml` submitted 2026-05-05
- Owner `felipe.studionn@gmail.com`

---

## 17. ENV VARS

`.env.local` is gitignored. Vercel mirrors all of it except management-only vars.

**Required everywhere**:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
ANTHROPIC_API_KEY · GEMINI_API_KEY · GEMINI_MODEL
OPENAI_API_KEY · PERPLEXITY_API_KEY · FREEPIK_API_KEY
RESEND_API_KEY
GOOGLE_OAUTH_CLIENT_ID
CRON_SECRET
NEXT_PUBLIC_POSTHOG_KEY · SENTRY_DSN
SHOPIFY_CLIENT_ID · SHOPIFY_CLIENT_SECRET · SHOPIFY_REDIRECT_URI
```

**Stripe price IDs** (one per plan × billing period · plus credit & studio packs):
```
STRIPE_FOUNDER_{MONTHLY,ANNUAL}_PRICE_ID
STRIPE_TEAM_{MONTHLY,ANNUAL}_PRICE_ID
STRIPE_TEAM_PRO_{MONTHLY,ANNUAL}_PRICE_ID
STRIPE_CREDITS_PACK_{50,250,1000}_PRICE_ID
STRIPE_STUDIO_PACK_{CAPSULE,EDITORIAL,FULL_CAMPAIGN}_PRICE_ID
```

**Management-only (local + ops, NOT in Vercel)**:
```
SUPABASE_MANAGEMENT_TOKEN
IONOS_DNS_API_KEY · IONOS_ZONE_ID_AIMILY
CLOUDFLARE_API_TOKEN · CLOUDFLARE_ACCOUNT_ID · CLOUDFLARE_ZONE_ID_AIMILY_SHOP
VERCEL_API_TOKEN (per-subdomain SSL)
```

Full canonical registry: [`vercel-env-vars.md`](memory/vercel-env-vars.md).

---

## 18. KEY FILE INDEX (the files to know)

### 18.1 Core infrastructure
| File | Purpose |
|---|---|
| [`src/app/layout.tsx`](src/app/layout.tsx) | Root layout · AuthProvider · SubscriptionProvider · CookieConsent · Analytics |
| [`src/middleware.ts`](src/middleware.ts) | Token refresh · route protection · marketing redirect · storefront wildcard rewrite |
| [`src/lib/supabase/{client,server}.ts`](src/lib/supabase/) | SSR Supabase clients |
| [`src/lib/supabase-admin.ts`](src/lib/supabase-admin.ts) | Service-role client |
| [`src/lib/api-auth.ts`](src/lib/api-auth.ts) | `getAuthenticatedUser` · `checkImageryUsage` · `consumeCredits` · `verifyCollectionOwnership` |
| [`src/lib/stripe.ts`](src/lib/stripe.ts) | `PLANS` · `CREDIT_COSTS` · `AIMILY_CREDITS_PACKS` · `getStripeServer` |
| [`src/lib/rate-limit.ts`](src/lib/rate-limit.ts) | Per-IP throttle |

### 18.2 AI architecture (locked)
| File | Purpose |
|---|---|
| [`src/lib/ai/load-full-context.ts`](src/lib/ai/load-full-context.ts) | Server-side CIS + workspace + brief loader (the spine) |
| [`src/lib/ai/prompt-foundations.ts`](src/lib/ai/prompt-foundations.ts) | `buildInheritedContext` formats CIS into prompts |
| [`src/lib/ai/llm-client.ts`](src/lib/ai/llm-client.ts) | Haiku → Gemini fallback wrapper |
| [`src/lib/ai/cis-prefix.ts`](src/lib/ai/cis-prefix.ts) | Compact prefix for brief endpoints |
| [`src/lib/collection-intelligence.ts`](src/lib/collection-intelligence.ts) | `recordDecision` · `getIntelligence` · `compilePromptContext` (11 presets) |
| [`src/lib/prompts/prompt-context.ts`](src/lib/prompts/prompt-context.ts) | Multi-table aggregator on top of CIS |

### 18.3 Workspace components
| File | Purpose |
|---|---|
| [`src/app/(app)/collection/[id]/CollectionOverview.tsx`](src/app/(app)/collection/[id]/CollectionOverview.tsx) | 4-block hub (gold standard pattern · sub-block scaling rules) |
| `src/app/(app)/collection/[id]/{creative,merchandising,product,marketing/creation}/page.tsx` | Block 1–4 surfaces |
| `src/components/workspace/{DecisionCard,WorkspaceShell,ViewPort}.tsx` | Workspace primitives |
| `src/components/in-season/...` | In-Season visual layer |
| `src/components/aimily-assistant/...` | In-app AI assistant |

### 18.4 In-Season engine
| File | Purpose |
|---|---|
| [`src/lib/in-season/orchestrator.ts`](src/lib/in-season/orchestrator.ts) | Run lifecycle controller |
| [`src/lib/in-season/recommend.ts`](src/lib/in-season/recommend.ts) | 13-verb classifier |
| [`src/lib/in-season/identity-graph.ts`](src/lib/in-season/identity-graph.ts) | Confidence-weighted lineage |
| [`src/lib/in-season/parsers/`](src/lib/in-season/parsers/) | Shopify GraphQL/CSV · Stripe · Zara RNK PDF |
| [`src/lib/in-season/materialize-sku-seeds.ts`](src/lib/in-season/materialize-sku-seeds.ts) | Verdict → seed materialization |
| [`src/lib/in-season/sku-image-cropper.ts`](src/lib/in-season/sku-image-cropper.ts) | Aimily Design bridge — crop source-PDF photo |

### 18.5 Storefront
| File | Purpose |
|---|---|
| [`src/lib/storefront/load-storefront-data.ts`](src/lib/storefront/load-storefront-data.ts) | CIS-canonical loader (throws on missing) |
| [`src/lib/storefront/validate.ts`](src/lib/storefront/validate.ts) | Pre-publish validator (single source for `/publish` + `/validate`) |
| [`src/lib/storefront/theme-registry.ts`](src/lib/storefront/theme-registry.ts) | 12-theme dynamic-import registry |
| [`src/lib/storefront/host.ts`](src/lib/storefront/host.ts) | `extractStorefrontHost` · `encodeHost` |
| [`src/lib/storefront/vercel-domains.ts`](src/lib/storefront/vercel-domains.ts) | Vercel API client for SSL provisioning |

---

## 19. THE LOCKED RULES (don't violate)

1. **Reuse ONLY canonical components.** Before writing any UI, read `memory/design-components-canonical.md`. If a pattern isn't there, ask.
2. **All API routes use `getAuthenticatedUser()`** from `@/lib/auth-guard` (alias of `api-auth.ts`).
3. **Verify ownership before data access**: `user_id === collection.user_id`.
4. **Never use `supabaseAdmin` where user-scoped access works.**
5. **Every `git commit` is followed by `git push`.** No exceptions.
6. **AI context is server-side.** Frontend sends `collectionPlanId` only. Don't touch `load-full-context.ts`, `prompt-foundations.ts`, `prompt-context.ts`, `collection-intelligence.ts`, or any `/api/ai/*` during UI work.
7. **i18n is mandatory.** Zero hardcoded user-facing strings — 9 locales × ~2200 keys.
8. **Hook error contract**: writes throw via `hook-errors.ts#backendError`. Reads set local `error`. Never silent-fail.
9. **TS enum changes ship with the matching SQL migration.**
10. **3 visual categories = 3 endpoints**: `/api/ai/freepik/still-life` + `/editorial` + `/tryon`. Never merge.
11. **3D render mandatory** for Still Life / Try-On. Buttons disabled without it.
12. **Honest test E2E before saying ready.** API checks alone ≠ ready.
13. **No false doors.** Every link in the UI resolves to a working route — no dead pages, no zombie paths.
14. **Structural fix, not patch.** When something is broken, ship the migration-aware fix, not the case-only quick reset.

Full rules with rationale: see `MEMORY.md` → "🔒 Behavioral Rules".

---

## 20. THE LANDSCAPE OUTSIDE THIS DOC

What the Bible doesn't cover in depth — go to the companion doc:

| Topic | Companion doc |
|---|---|
| In-Season pipeline (parsers, scoring, scenarios, OAuth) | [`architecture_in-season-feedback-loop.md`](memory/architecture_in-season-feedback-loop.md) |
| In-Season product spec (cardinal rules, 13 verbs, 5 KPIs) | [`product-spec_aimily-in-season-2026-05-17.md`](memory/product-spec_aimily-in-season-2026-05-17.md) |
| Aimily Design module (In-Season → design phase bridge) | [`aimily-design-architecture-2026-05-19.md`](memory/aimily-design-architecture-2026-05-19.md) |
| Aimily Studio state | `state_aimily-studio-2026-05-16.md` (lives in user memory, not repo) |
| Ecom storefront generator | [`architecture-ecom.md`](memory/architecture-ecom.md) |
| Presentation deck (21 slides × 10 themes) | [`architecture-presentation.md`](memory/architecture-presentation.md) |
| Block × mini-block × micro-block tree | [`architecture-tree-rubik-cube.md`](memory/architecture-tree-rubik-cube.md) |
| Design & Development block (Block 3 deep map) | [`architecture-block-3.md`](memory/architecture-block-3.md) |
| Per-endpoint AI provider map | [`ai-generation-bible.md`](memory/ai-generation-bible.md) |
| Component canon | [`design-components-canonical.md`](memory/design-components-canonical.md) |
| Retailer-agnostic engine framework | `framework_retailer-agnostic-in-season-engine.md` (lives in user memory, not repo) |
| Shopify lane feasibility (13/13 verbs) | [`shopify-lane-feasibility-2026-05-19.md`](memory/shopify-lane-feasibility-2026-05-19.md) |
| Shopify Partner App OAuth setup | [`shopify-partner-app-oauth.md`](memory/shopify-partner-app-oauth.md) |
| 45-milestone calendar | [`calendar-4-blocks.md`](memory/calendar-4-blocks.md) |
| Security / AI / privacy audit | `security-ai-privacy.md` (lives in user memory, not repo) |
| Running UI changelog per session | [`changelog.md`](memory/changelog.md) |
| Service credentials (point to `.env.local`) | [`credentials.md`](memory/credentials.md) + [`credentials_cloudflare-aimily-shop.md`](memory/credentials_cloudflare-aimily-shop.md) |
| Vercel env var registry | `vercel-env-vars.md` (lives in user memory, not repo) |
| Stripe products/prices live state | `stripe-billing.md` (lives in user memory, not repo) |

---

## 21. HOW TO KEEP THIS DOC HONEST

The Bible drifted because nobody updated it on the way through 4 feature waves. To prevent that:

1. **When you change shipping code that contradicts a claim here, update that claim in the same PR.** It's a 30-second edit; doing it later means doing it never.
2. **When you ship a new feature, decide where it belongs**: a brand-new product gets a top-level section (like §6 In-Season, §7 Studio); a sub-feature of an existing product gets a companion doc with a one-line pointer in §20.
3. **Quote code, not memory.** When unsure if a fact is still true, grep — don't lean on the doc.
4. **Don't fold companion docs in.** The 4 architecture docs (in-season, ecom, presentation, tree-rubik) are deep specs; the Bible is the index. Keep them split.
5. **The version banner at the top is mandatory.** Every meaningful edit bumps the "Last verified" date and adds a one-line "what changed since" note.

---

*Last verified 2026-05-21 against branch `cleanup/bible-deep-rewrite-2026-05-21` · commit pending.*
