---
name: Ecom (Storefront) Architecture
description: Living doc for the Ecom block — DTC storefront generator with 12 editorial themes hosted on *.aimily.shop. Reference for everything that touches storefronts, themes, payment providers, custom domains.
type: project
---

# Ecom — Storefront Module Architecture

> **Status (2026-05-05)**: PLANNED · planning docs in `.planning/ecom/` · sprint 0 pending Felipe go-ahead.
> **Update this file in the same commit** whenever anything changes in storefronts: adding a theme, changing data flow, new payment provider, schema change, route change. Out-of-sync = bug.

## Quick reference

- **Card location**: Block 4 Marketing > `04.4 Ecom` (renombrado de `04.4 Point of Sale`)
- **Wholesale Orders** (lo que estaba en Point of Sale) movido a Block 2 Merchandising > Channels
- **Public route**: `*.aimily.shop` (subdomain por brand) + custom domain opcional V1
- **Hosting**: Vercel Pro wildcard SSL · €0 marginal por brand · €21/mes total fijo
- **Themes**: 12 editoriales fijos · Editorial Heritage · Streetwear Drop · Romantic Feminine · Minimal Architect · Performance Tech · Avant-Garde Concept · Sustainable Craft · Y2K Digital Native · Workwear Heritage · Resort Luxe · Drop Lookbook · Linkinbio Plus
- **Payment providers**: Stripe Buy Button · Shopify Buy SDK · lookbook_only (no payment)
- **Aimily NUNCA toca dinero**: cero MoR, cero PCI, cero webhooks de pago entrantes

## Planning docs (canonical source)

Todos en `.planning/ecom/`:
- `00-OVERVIEW.md` — vision, scope, decisiones, coste
- `01-ARCHITECTURE.md` — multi-tenant routing, wildcard, themes, data flow
- `02-SCHEMA.md` — tablas SQL + RLS + migraciones
- `03-THEMES.md` — los 12 themes editoriales con tokens y anchor brands
- `04-PAYMENT-PROVIDERS.md` — integración Stripe + Shopify paso a paso
- `05-SPRINTS.md` — roadmap 6 semanas día a día
- `06-FILE-MAP.md` — inventario completo de archivos

## Tablas Supabase

- `storefronts` — 1 row por collection publicada · UNIQUE(collection_plan_id) · subdomain UNIQUE
- `storefront_overrides` — copy edits del usuario (clon del patrón presentation_deck_overrides)
- `storefront_publishes` — audit trail publish/unpublish/rebuild
- `subscriptions.storefront_quota` — columna nueva · 1/5/25/∞ por plan

## Flujo macro

```
DNS *.aimily.shop → Vercel
  → middleware detecta host
    → rewrite a /(storefront)/_storefront/[host]/...
      → resuelve storefront row
        → loadStorefrontData(collectionId)
          → reusa CIS (brand DNA) + collection_skus + sku_visuals + lookbook stories
            → applyOverrides()
              → renderiza theme.pages.HomeTemplate (o PLP, PDP, etc.)
                → BuyButton renderiza Stripe Buy Button / Shopify SDK / Coming Soon
```

## Reusos importantes

- `compilePromptContext('brand-identity')` — brand DNA (colors, voice, typography)
- `getIntelligence('brand-palette')` — paleta del usuario
- `loadFullContext()` — read-only, NO se modifica
- Patrón `presentation_deck_overrides` → `storefront_overrides`
- Patrón `presentation_shares` → `storefronts` (subdomain en vez de token)
- ContentStudioCard outputs (sku_visuals) → imágenes editorial/still-life/campaign

## Lo que NO toca (locks heredados)

- `src/lib/ai/load-full-context.ts` (read-only)
- `src/lib/ai/cis-prefix.ts`
- `src/lib/collection-intelligence.ts` (read-only)
- Cualquier endpoint `src/app/api/ai/*`

## Decisiones clave (no revisitar sin motivo nuevo)

1. **No Hydrogen/Oxygen** — rompería stack Next 16 + Vercel
2. **Hosting propio en *.aimily.shop**, no static export — updates llegan a todos
3. **12 themes fijos**, no generación AI libre — coherencia editorial
4. **Stripe Buy Button + Shopify Buy SDK** únicos — cero responsabilidad MoR
5. **Card Ecom dentro de Block 4**, no Block 5 nuevo — sidebar 4×5 se mantiene
6. **Wholesale movido a Merchandising > Channels** — semánticamente correcto
7. **Mailto/WhatsApp button retirado** (decisión Felipe 2026-05-05) — antiguo

## Open questions activas

- ¿Cloudflare delante en MVP o V1? (recomendación: V1, no bloqueante)
- ¿Qué hace el storefront cuando el user downgrades al plan trial? (unpublish auto vs marca de agua)
- ¿Plausible vs Vercel Analytics para tracking de visitas? (decisión sprint 5)
- ¿GDPR banner inyectado por defecto o opt-in? (decisión sprint 4)

## Bugs conocidos / TODOs

(vacío hasta que arranque sprint 1)
