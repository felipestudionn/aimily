---
name: Ecom (Storefront) Architecture
description: Living doc for the Ecom block — DTC storefront generator with 12 editorial themes hosted on *.aimily.shop. Reference for everything that touches storefronts, themes, payment providers, custom domains.
type: project
---

# Ecom — Storefront Module Architecture

> **Status (2026-05-05)**: ✅ SHIPPED end-to-end. Sprints 1-6 complete in 10 PRs.
> **Update this file in the same commit** whenever anything changes in storefronts.

## Quick reference

- **Card location**: `04.4 Ecom` inside Marketing card (renamed from Point of Sale)
- **Public route**: `*.aimily.shop` (subdomain per brand) · custom domain V2
- **Hosting**: Vercel Pro wildcard CNAME · per-subdomain SSL via Vercel API on publish
- **Themes**: 12 editorial worlds, all working
- **Payment**: Stripe Buy Button · Shopify Buy SDK · Lookbook-only (default). Aimily NEVER touches money.

## Live infrastructure

```
DNS               *.aimily.shop CNAME → cname.vercel-dns.com
                  Cloudflare DNS only (Cloudflare Free can't proxy wildcards)
SSL               Per-subdomain via Vercel /v10/projects/aimily/domains POST
                  Triggered by /api/ecom/publish, ~30-90s emission
                  Let's Encrypt 50 certs/week per registered domain (sufficient)
Cloudflare token  cfut_... in .env.local (CLOUDFLARE_API_TOKEN, scope DNS:Edit + Registrar:Edit)
Vercel token      In .env.local + Vercel project envs (VERCEL_API_TOKEN)
```

## DB tables

- `storefronts` — 1 row per published collection · UNIQUE(collection_plan_id) · subdomain UNIQUE
- `storefront_overrides` — copy edits per page (page_id + field_overrides JSONB)
- `storefront_publishes` — audit trail
- `subscriptions.storefront_quota` — 1/5/25/∞ per plan

## File map

```
.planning/ecom/
├── 00-OVERVIEW.md ... 06-FILE-MAP.md          (planning, gitignored)

src/types/storefront.ts                          (DB row + ThemeId + PaymentProvider types)

src/lib/storefront/
├── host.ts                                      (extractStorefrontHost + extractSubdomain)
├── reserved-subdomains.ts                       (80+ blocked names)
├── subdomain-validator.ts                       (regex + reserved + uniqueness)
├── load-storefront.ts                           (loadStorefrontByHost · decodes URL)
├── load-storefront-data.ts                      (CIS-canonical, NO fallbacks, throws StorefrontDataMissingError)
├── apply-overrides.ts                           (path-based copy edits merge)
├── theme-registry.ts                            (dynamic import of all 12 themes)
├── seo.ts                                       (Product + Organization JSON-LD)
├── vercel-domains.ts                            (registerStorefrontDomain on publish)
├── types.ts                                     (StorefrontData + ThemeManifest + ThemeModule)
├── shared/                                      (cross-theme components)
│   ├── Header.tsx                               (split | stacked | left layouts)
│   ├── Footer.tsx                               (dark | light tone)
│   ├── ProductCard.tsx                          (editorial | minimal | centered)
│   └── page-templates.tsx                       (createAllPages factory · 6 templates)
└── themes/                                      (12 themes, each ~70-150 LOC)
    ├── editorial-heritage/  (manifest + tokens + components/* + pages/*)
    ├── minimal-architect/   (uses createAllPages)
    ├── streetwear-drop/     (uses createAllPages)
    ├── romantic-feminine/
    ├── resort-luxe/
    ├── sustainable-craft/
    ├── workwear-heritage/
    ├── performance-tech/
    ├── y2k-digital-native/
    ├── avant-garde-concept/
    ├── drop-lookbook/       (single-page custom)
    └── linkinbio-plus/      (single-page mobile-first custom)

src/components/ecom/
├── EcomHub.tsx                                  (publish hub UI inside aimily app)
└── shared/
    ├── BuyButton.tsx                            (Stripe Buy Button + Shopify Buy SDK + Coming Soon)
    ├── JsonLd.tsx                               (server-rendered <script type="application/ld+json">)
    └── GdprBanner.tsx                           (auto-injected cookie consent)

src/app/(storefront)/storefront/[host]/          (route group · multi-tenant SSR)
├── layout.tsx                                   (theme tokens + Google Fonts + GdprBanner)
├── page.tsx                                     (Home + JSON-LD Organization)
├── shop/page.tsx                                (PLP)
├── shop/[sku]/page.tsx                          (PDP + JSON-LD Product)
├── lookbook/page.tsx
├── about/page.tsx
├── contact/page.tsx
├── sitemap.xml/route.ts                         (dynamic per-host)
├── robots.txt/route.ts
├── og.png/route.tsx                             (next/og dynamic image)
└── not-found.tsx

src/app/api/ecom/
├── publish/route.ts                             (upsert + Vercel registerDomain)
├── unpublish/route.ts                           (set published_at NULL + Vercel unregisterDomain)
├── check-subdomain/route.ts                     (live availability)
├── storefront/[id]/route.ts                     (GET + PATCH for theme/payment/SEO edits)
└── storefront-by-collection/[planId]/route.ts   (lookup for hub UI hydration)

src/middleware.ts                                (extractStorefrontHost rewrite to /storefront/[encoded-host]/...)
```

## Flow macro

```
Visitor https://slaiz.aimily.shop/shop/sku123
  → DNS: *.aimily.shop → Vercel
    → middleware: extractStorefrontHost → rewrite /storefront/<encoded-host>/shop/sku123
      → layout.tsx: loadStorefrontByHost → decodes host → loadTheme + injects tokens
        → page.tsx: loadStorefrontData (CIS canonical) → applyOverrides → theme.pages.pdp
          → renders SLAIZ data with editorial-heritage theme tokens
            → BuyButton renders stripe-buy-button or shopify Buy SDK
```

## CIS keys (canonical · no fallbacks)

```
creative.identity.brand_name        → brand.name
creative.identity.collection_vibe   → tagline (1st line) + manifesto (full)
creative.identity.typography        → parsed display + body fonts (regex)
creative.color.primary_palette      → array of "#XXXXXX (...)" parsed for hex
marketing.voice.tone                → brand.voice.tone
marketing.voice.personality         → brand.voice.keywords
creative.inspiration.competitors    → brand.voice.values
brand.contact.{email,instagram,address}  → opt-in (not fallbacks)

Missing required field → throws StorefrontDataMissingError (publish endpoint
surfaces "complete Block 1 Creative & Brand" message; SSR 404s).
```

## Smoke test (verified 2026-05-05)

```
9/9 routes 200 with Host header simulation:
  /                 200 (home with theme rendered)
  /shop             200 (PLP grid)
  /lookbook         200
  /about            200
  /contact          200
  /sitemap.xml      200 (dynamic XML with all skus)
  /robots.txt       200
  /og.png           200 (dynamic next/og image with brand palette)
  /shop/{sku}       200 (PDP with JSON-LD)
```

## Decisions log (no revisitar sin motivo nuevo)

1. **No Hydrogen/Oxygen** — would require Remix + Vercel-paralel infra
2. **Hosting propio en *.aimily.shop**, no static export
3. **12 themes fijos**, no AI generation
4. **Stripe Buy Button + Shopify Buy SDK únicos** — cero MoR
5. **Card Ecom dentro de Block 4** — sidebar 4×5 stays
6. **Wholesale orders movido a Block 2 Channels** (Sprint 2 deferred — still in EcomCard for now)
7. **Per-subdomain SSL via Vercel API**, no wildcard:
   - Cloudflare Free no proxy wildcards (Business+ only)
   - Vercel can't emit wildcard SSL without DNS-01 access
   - Cloudflare Registrar locks NS for 60 days post-registration
   - Linktree/Substack pattern · works enterprise-grade
8. **Route group named `storefront/` not `_storefront/`** — Next.js doesn't route underscore-prefixed paths. Direct access from aimily.app blocked by middleware check.
9. **CIS is canonical** for storefront brand DNA. brand_profiles is legacy/empty for SLAIZ; loader reads CIS only and throws if data incomplete.
10. **Host param URL-encoded in path** (`%3A` for ports). Decoded in loadStorefrontByHost.
11. **Render filter relaxed** (`price > 0` only) so SKUs without imagery still render with name fallback in PLP card.

## Future migration path

After **4 July 2026** (60-day ICANN transfer window post `aimily.shop` registration), the domain can be transferred to Vercel Domains. Vercel would then control the DNS and emit wildcard SSL natively. The publish endpoint changes (Vercel API per-domain registration) become unnecessary at that point and are reversible.

## Bugs known / TODOs

- WholesaleOrders move from EcomCard → Merchandising > Channels (Sprint 2 deferred · code still inside EcomCard)
- SEO Research module (5 endpoints `/api/ai/seo-*`) still pending — currently PoweredBy says "SEO ~€100 replaced" which is NOT yet honest
- Inline-edit UI in EcomHub for storefront_overrides (writes already exist via PATCH endpoint, UI not yet) — Sprint 7
- Plausible/Vercel Analytics on storefronts (mentioned in plan, not yet wired)
