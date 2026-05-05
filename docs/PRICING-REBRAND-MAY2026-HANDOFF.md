# Pricing Rebrand May 2026 — Handoff for Aimily Agent

**Status**: live in production · 5 may 2026
**Author**: StudioNN agent (marketing) · ready for Aimily agent (product/eng) to continue
**Repo state**: main @ commit `f4dd6a2` and forward

---

## What's done (live in prod)

### 1 · Pricing tiers (full rebrand)

Renamed by ICP (target organization size) so customers self-identify:

| Plan ID | Name | Price | Annual (-20%) | Imagery / mo | Users | Stripe price ID monthly | Stripe price ID annual |
|---|---|---|---|---|---|---|---|
| `student` | Student | Free 12 mo | — | 100 | 1 | (no Stripe) | (no Stripe) |
| `founder` | Founder | €99/mo | €79/mo | 100 | 1 | `price_1TTirBQqcqw6tCU6QAaQh6ep` | `price_1TTirCQqcqw6tCU6PPv4E0yP` |
| `team` | Team | €599/mo | €479/mo | 1.000 | **10** | `price_1TTirEQqcqw6tCU6xU2ti2DS` | `price_1TTirEQqcqw6tCU6NxNrL483` |
| `team_pro` | Team Pro | €999/mo | €799/mo | 5.000 | 25 | `price_1TTjqJQqcqw6tCU6zuSp8WoO` | `price_1TTjqJQqcqw6tCU6QXLqRiSI` |
| `enterprise` | Enterprise | from €3.000/mo | — | ∞ | ∞ | (custom invoicing) | — |

**Internal plan IDs in `src/lib/stripe.ts`**: `trial · student · founder · team · team_pro · enterprise`. Legacy IDs (`starter · professional · professional_max`) stay in the CHECK constraint of `subscriptions.plan` for backward compat — no live paying subs use them.

### 2 · Trial = 30 days, no credit card

`src/app/api/billing/checkout/route.ts`:
- `trial_period_days: 30`
- `payment_method_collection: 'if_required'` (Stripe doesn't ask for a card during trial)
- Payment methods enabled: `['card', 'paypal']` (Apple Pay + Google Pay come automatic with card after domain verification)

### 3 · Student tier auto-verification

Free for 12 months, auto-verified via institutional email domain.

- DB tables: `academic_domains` (167 domains, 124 schools, 27 countries) · `student_verifications` (status + expires_at)
- Endpoint `POST /api/student/verify` — checks user's email domain against whitelist
- Endpoint `GET /api/academic-domains/list` — public, cached 1h, used by `/student` page
- Cron `/api/cron/expire-student-verifications` — daily 03:00 UTC, calls SQL fn `expire_student_verifications()` which downgrades to `trial` after 12 months
- Page `/student` lists all 124 schools grouped by country with search
- Migration: `supabase/migrations/045_pricing_rebrand_student_promo.sql`

### 4 · Public launch promo retired (deliberate)

Originally launched with "first 100 -50% for 12 months" but retired after Felipe decided that with Student gratis + new prices already aggressive, the promo was double-discounting and pulling brand toward "Notion $10" instead of "premium fashion".

- Banner removed from `PricingDetail.tsx`
- `claim_launch_promo_slot` removed from checkout
- Coupons `LAUNCH-FOUNDER-M`, `LAUNCH-TEAM-M`, `LAUNCH-TEAM-PRO-M` archived in Stripe
- `launch_promo_counter.active = FALSE` in Supabase (reversible if you need to reactivate)

### 5 · Private outreach coupon

For manual outreach to brands ICP that StudioNN wants to selectively capture without public urgency:

- Coupon `STUDIONN50` in Stripe (50% off · repeating · 12 months)
- Promotion code `STUDIONN50` (the actual string customers type at checkout)
- Customers type the code in Stripe Checkout's "Add promotion code" field (`allow_promotion_codes: true`)
- Felipe distributes the code manually (LinkedIn outreach, IG DMs, email pitches)
- Not visible anywhere on the public site

## ✅ DONE — Web (Ecom Storefront) shipped 2026-05-05

The Powered by comparison block (live in production) shows Web as
*included*. **As of 2026-05-05 this is HONEST**: the Ecom Block is
shipped end-to-end (PR #1-#10) with 12 editorial themes, multi-tenant
wildcard at `*.aimily.shop`, per-subdomain SSL via Vercel API, full
SSR pipeline reading CIS canonical brand DNA, BuyButton with Stripe
Buy Button + Shopify Buy SDK + Lookbook-only modes, EcomHub hub UI in
the marketing 04.4 card, sitemap.xml/robots.txt/og.png/JSON-LD/GDPR
banner per-storefront. See `memory/architecture-ecom.md` for the
complete reference.

**SEO research/on-page** still pending — the Powered by row claims
"~€100 SEO replaced" but the dedicated SEO Research module (5
endpoints under `/api/ai/seo-*` per the original plan) is NOT yet
shipped. Sprint backlog item.

Original "what needs to ship" list (pre-2026-05-05) — kept for history:

What needs to ship before this is honest:

### A · Block 5: Storefront / Web pages templates
- Goal: from brand DNA + collection data, generate landing page + DTC
  product detail templates that the user can deploy to their own site
  or directly to a hosted subdomain.
- Suggested architecture:
  - New workspace block alongside existing 4 (Brand DNA, Range plan, Tech
    packs, Marketing). Could be "Storefront" or extend Block 4.
  - `/api/ai/storefront-generate` endpoint: input `collection_id` +
    brand DNA → output HTML/CSS or React components.
  - Storage in Supabase (reuse `presentation` infra).
  - Export options: download zip · publish to Vercel · embed snippet ·
    deploy to user's Shopify.

### B · SEO research + on-page optimization
- Goal: keyword research per drop, on-page audit, SEO copy generation,
  competitor monitoring.
- Suggested architecture:
  - Use Perplexity Sonar (already integrated in `src/lib/ai/perplexity-client.ts`)
    for live keyword research.
  - Use Claude Sonnet 4.5 for SEO copy generation.
  - Optional: integrate DataForSEO API for keyword volume (cheaper than
    Ahrefs API B2B tier).
  - New endpoints under `/api/ai/seo-*` paralleling `/api/ai/market-trends`.

### Marketing copy that depends on this

Once the features ship, the cost comparison block on `aimily.app/es#pricing`
becomes 100% honest. Currently the line items "Web · landing · DTC + integración
~€400" and "SEO · research · on-page ~€100" claim to be replaced — make them
real.

---

### 6 · Powered by section (between Meet aimily and Pricing)

`src/components/landing/PoweredBy.tsx` — transparency block showing the AI providers aimily orchestrates + cost comparison vs DIY stack.

**Provider grid (verified in code, no fabricated names):**
- Anthropic Claude — Sonnet 4.5 · Haiku 4.5
- OpenAI — gpt-image-1.5 · text-embedding-3
- Google Gemini — 2.5 Flash · 2.5 Flash Image
- Perplexity — Sonar
- Kling AI — Kling 2.1 Pro
- Freepik — Mystic

**Cost comparison block (creator ICP):**
- Suscripciones IA web chat (Claude Pro, ChatGPT, Gemini, Perplexity, Midjourney, Freepik, Kling): €136
- Productividad / creative / SKUs (Adobe CC, Pantone, Canva, Office 365, Airtable Pro): €112
- Web pages / e-commerce templates (Webflow / Framer / Squarespace): €30
- SEO research / on-page (SEMrush / Ahrefs / Surfer): €100
- 1 photoshoot/mes (photographer + studio + model): €500
- **Total DIY: ~€878/mes**
- aimily Founder = €99/mo → ~9× cheaper

⚠️ **Honesty note**: web pages templates and SEO tools are listed as "what aimily replaces" but they are **NOT YET IMPLEMENTED**. See "Pending" section below.

### 7 · Aimily Credits

Renamed `Imagery` → `Aimily Credits` everywhere (UI labels, top-up packs, FAQ "what counts as one"). Internally still tracked as `imagery_credits.balance` and `imageryGenerations` limits in the codebase (no DB rename) — purely a UI/UX rename to feel more like a unit of value.

### 8 · Typography

`€` symbol rendered separately from digits (22px, mr-1.5) so prices read cleanly as `€ 99` not as a 3-digit number `€99`.

---

## Pending — for Aimily agent to implement

Felipe wants the Powered by comparison to be honest about what aimily replaces. Right now it lists web + SEO as "replaced" but the product doesn't actually do those things yet. Two implementations needed:

### A · Web pages / e-commerce templates

**What it should do**: generate brand-coherent landing pages and basic e-commerce templates from the brand DNA + collection data. Output: deployable HTML/CSS or a hosted page (TBD architecture).

Specifically:
- A landing page for the collection (hero + product grid + about + lookbook)
- A DTC product detail page template (shopify-like layout, but rendered from collection SKU data)
- About / contact / lookbook secondary pages
- Brand DNA → CSS variables (colors, typography, voice copy)
- Optional: connect to Shopify / Stripe Checkout for actual selling (or just generate static templates the user deploys themselves)

**Why**: replaces Webflow / Framer / Squarespace (~€30/mo) in the DIY stack.

**How (high-level architecture suggestion — to refine):**
- New Block in the workspace UI alongside the existing 4 (Brand DNA / Range plan / Tech packs / Marketing). Could be a 5th block "Storefront" or extension of Block 4.
- New `/api/ai/storefront-generate` endpoint that takes `collection_id` + brand DNA and outputs page templates
- Storage of generated templates in Supabase (reuse `presentation` infrastructure?)
- Export options: download HTML/CSS zip · publish to Vercel · embed code · deploy to user's Shopify

### B · SEO research + on-page optimization

**What it should do**: keyword research for the collection / drop, on-page recommendations, SEO copy generation, competitor monitoring.

Specifically:
- Keyword research: "what fashion-related queries are trending for [brand category]?" → search volume + competition
- On-page optimization: given a generated page (Block A) or external URL, audit headings / meta / alt text / internal links and recommend improvements
- SEO copy generation: meta descriptions, title tags, OpenGraph copy from collection data
- Competitor SEO snapshot: top fashion brands ranking for similar terms

**Why**: replaces SEMrush / Ahrefs / Surfer SEO (~€100/mo) in the DIY stack.

**How (high-level architecture suggestion):**
- Use Perplexity Sonar (already integrated) for live keyword research
- Use Claude Sonnet 4.5 (already integrated) for SEO copy generation
- Optionally integrate a third-party keyword volume API (Ahrefs API has a B2B tier, or DataForSEO is cheaper)
- New endpoints under `/api/ai/seo-*` paralleling the existing `/api/ai/market-trends` pattern

---

## Files modified in this rebrand

### Backend
- `supabase/migrations/045_pricing_rebrand_student_promo.sql` — new migration
- `src/lib/stripe.ts` — PLANS rebrand + LAUNCH_PROMO_COUPONS map (now unused — promo retired)
- `src/app/api/billing/checkout/route.ts` — autom_payment_methods, trial 30d, removed promo logic, allow_promotion_codes for STUDIONN50
- `src/app/api/webhooks/stripe/route.ts` — priceMap legacy + new IDs
- `src/app/api/student/verify/route.ts` — new
- `src/app/api/promo/counter/route.ts` — kept (returns active:false now), reusable for future promos
- `src/app/api/academic-domains/list/route.ts` — new (public, cached 1h)
- `src/app/api/cron/expire-student-verifications/route.ts` — new (daily 03:00)
- `src/contexts/SubscriptionContext.tsx` — flags isStudent / isFounder / isTeam / isTeamPro
- `src/middleware.ts` — added `/student` to MARKETING_PREFIXES + `/api/promo/` and `/api/academic-domains/` to publicApiPrefixes
- `src/app/(app)/account/page.tsx` — PLAN_LABELS for new IDs

### Frontend
- `src/components/landing/PricingDetail.tsx` — full rewrite (4 cards, no toggle, no badge, no promo, € separated)
- `src/components/landing/PoweredBy.tsx` — new
- `src/app/[locale]/student/page.tsx` — new
- `src/app/[locale]/page.tsx` — added `<PoweredBy />` between MeetAimily and PricingDetail
- `src/i18n/home.ts` — full pricing schema rewrite + poweredBy block in 9 locales (EN+ES translated, FR/IT/DE/PT/NL/NO/SV use EN with `// TODO: translate` markers)

### SEO/GEO
- `src/app/llms.txt/route.ts` — pricing block updated
- `src/app/llms-full.txt/route.ts` — same
- `src/lib/schema/aimily.ts` — Schema.org Offer with new prices

### Scripts
- `scripts/seed-academic-domains.ts` — load 167 domains from JSON whitelist
- `scripts/setup-stripe-launch-promo.ts` — idempotent (used originally to create products + LAUNCH coupons; coupons now archived but products remain valid)

### Config
- `vercel.json` — added cron `/api/cron/expire-student-verifications` daily 03:00
- Env vars in Vercel (production + preview + development): `STRIPE_FOUNDER_MONTHLY_PRICE_ID` · `STRIPE_FOUNDER_ANNUAL_PRICE_ID` · `STRIPE_TEAM_MONTHLY_PRICE_ID` · `STRIPE_TEAM_ANNUAL_PRICE_ID` · `STRIPE_TEAM_PRO_MONTHLY_PRICE_ID` · `STRIPE_TEAM_PRO_ANNUAL_PRICE_ID`

---

## Where the source-of-truth data lives

- **Whitelist of academic domains**: `clients/aimily-marketing/data/academic-domains-whitelist.json` (in the **studionn-agency** repo, NOT in aimily). Loaded into Supabase via `scripts/seed-academic-domains.ts`. If you need to add schools, edit the JSON in studionn-agency and re-run the seed.
- **Pricing copy in 9 locales**: `src/i18n/home.ts` `pricing` and `poweredBy` blocks
- **Cost comparison numbers** (€136 + €112 + €30 + €100 + €500 = €878): hardcoded in `src/components/landing/PoweredBy.tsx`. If you change the categories or numbers, update the hardcoded total too.

---

## Decisions log (why these choices)

1. **No public promo banner**: Felipe decided after launch that the promo was double-discount (already lowered Founder to €99 + Team Pro to €999) and pulled the brand toward mass market. Student gratis already anchors "each tier pays its reality".
2. **Private STUDIONN50 coupon**: replaces public promo for selective outreach. Felipe distributes manually.
3. **Trial 30d, no card**: zero friction. Industry move 2025-2026 is away from credit-card-required trials.
4. **Aimily Credits naming**: more like a unit of value than a generic "imagery quota".
5. **Plan ID rename in DB**: zero live paying subs at the time of rebrand (verified in Stripe LIVE: 2 customers, both Felipe testing UAT). Safe to rename.
6. **No "Recommended" badge**: Felipe decided no plan is universally recommended — depends on ICP.
7. **Student tier same as Founder limits (100 Aimily Credits, 1 user)**: zero scope cuts for students. Rationale: build advocacy + future paying customers.
8. **€ rendered smaller and separated from digits**: typographic feedback from Felipe — `€99` reads as 3-digit number, `€ 99` reads as currency + value.
9. **Powered by lists 6 providers**: Anthropic, OpenAI, Google, Perplexity, Kling, Freepik. All verified in code (`src/lib/ai/`, `src/app/api/ai/`). No fabricated names.

---

## Quick references

- **Live URL**: https://www.aimily.app
- **Pricing**: https://www.aimily.app/es#pricing · https://www.aimily.app/en#pricing
- **Student page**: https://www.aimily.app/es/student · https://www.aimily.app/en/student
- **Powered by**: same page as pricing, scroll up
- **Stripe Dashboard products**: search by metadata `aimily_plan: founder | team | team_pro`
- **Supabase project**: `sbweszownvspzjfejmfx` (eu-central-1)
- **MCP tool to query Supabase**: `mcp__supabase__list_tables`, `mcp__supabase__execute_sql` with project_id above

---

Anything else needed, ping StudioNN agent or check the conversation log in `clients/aimily-marketing/` of the studionn-agency repo.
