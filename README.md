# aimily

AI-native operating system for fashion brands. Plan, design, and launch collections — and close the loop with real sales data through aimily In-Season.

- **App**: https://www.aimily.app
- **Storefront wildcard**: `*.aimily.shop`
- **Company**: StudioNN Agency S.L. · NIF B42978130

aimily ships as three coupled products that share one account, brand identity, and Aimily Credits bucket:

1. **aimily 360** — collection lifecycle workspace. 4 blocks × 5 mini-blocks with AI assistance at every step, backed by the Collection Intelligence System (CIS).
2. **Aimily Studio** — standalone AI image + video studio (`/studio`). Editorial, still-life, try-on, video.
3. **aimily In-Season** — daily in-season sales management for fashion buyers and commercials. Shopify OAuth or PDF/CSV intake; 13 decision verbs (REPLENISH / KILL / RESIZE / RECOLOR / CARRY_OVER / MARKDOWN / INVESTIGATE / AMPLIFY_DISTRIBUTION / EXTEND_COLORS / AMPLIFY_NEXT_SEASON / PROMOTE_PUSH / PULL_FORWARD_INTAKE / WAIT); seeds feed back into the next collection.

## Tech stack

- **Framework**: Next.js 16 (App Router) · React 19 · TypeScript 5.8
- **Styling**: Tailwind CSS 4.2 + shadcn/ui (Radix) + Lucide icons
- **i18n**: next-intl · 9 locales (en, es, fr, it, de, pt, nl, no, sv)
- **Auth & DB**: Supabase (PostgreSQL + RLS + Vault for encrypted tokens)
- **Payments**: Stripe (LIVE) · Aimily Credits bucket model
- **Text AI**: Claude Haiku 4.5 primary · Gemini 2.5 Flash fallback · Claude Sonnet 4.5 for heavy text · Perplexity Sonar for live search
- **Image AI**: OpenAI gpt-image-1.5 (design renders) · Freepik Nano Banana (still life / try-on / editorial) · Freepik Mystic (28-model brand roster)
- **Video AI**: Freepik Kling 2.1 Pro/Std (async polling)
- **Hosting**: Vercel (Pro, Fluid Compute) · auto-deploy from `main`
- **Observability**: PostHog (funnel) · Sentry (errors + perf) · Vercel Analytics (Web Vitals)

## Getting started

```bash
git clone git@github.com:felipestudionn/aimily.git
cd aimily
npm install

# Copy the env template and request the secrets from Felipe
cp .env.local.example .env.local

# Run the dev server on http://localhost:3000
npm run dev
```

Run the test suite:

```bash
npm run test         # one-shot
npm run test:watch   # watch mode
```

Production build:

```bash
npm run build
```

## Project layout

```
src/
├── app/
│   ├── [locale]/      # public marketing (next-intl) — 9 locales
│   ├── (app)/         # authenticated dashboard
│   ├── (storefront)/  # *.aimily.shop SSR storefronts
│   └── api/           # 212 route handlers
├── components/        # workspace cards + 14 shadcn primitives
├── contexts/          # AuthContext · SubscriptionContext · LanguageContext
├── hooks/             # 14 typed hooks (REST → CRUD pattern)
├── i18n/              # 9 locale dictionaries + next-intl config
├── lib/
│   ├── ai/            # loadFullContext (CIS spine) · llm-client · prompts
│   ├── in-season/     # 13-verb engine + Shopify/Stripe/PDF parsers
│   ├── storefront/    # 12 themes + Vercel-domains client + validator
│   ├── studio/        # video pipeline + format export
│   └── stripe.ts      # PLANS + CREDIT_COSTS (single source of truth)
├── messages/          # next-intl stub files (content lives in src/i18n/)
├── styles/            # Tailwind globals
└── types/             # 13 type files (one per domain)

supabase/
└── migrations/        # 75 SQL migrations, in sync with the Supabase project
```

## Source of truth

**`memory/full-project-documentation.md`** — the Bible. Every infrastructure, frontend, backend, and AI architecture decision is documented and code-verified there. Read it before touching anything.

Companion docs (deep specs) under `memory/`:

- `architecture_in-season-feedback-loop.md` · `architecture-ecom.md` · `architecture-presentation.md`
- `architecture-tree-rubik-cube.md` · `architecture-block-3.md`
- `design-components-canonical.md` (MANDATORY component inventory)
- `ai-generation-bible.md` (per-endpoint AI provider map)
- `shopify-partner-app-oauth.md` · `product-spec_aimily-in-season-2026-05-17.md`

## License

Proprietary · © StudioNN Agency S.L.
