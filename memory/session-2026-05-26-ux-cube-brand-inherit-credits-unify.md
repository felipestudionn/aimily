---
name: Session 2026-05-26 — UX cube + brand inherit + credits unification
description: End-to-end session execution report. UX cube (free workspace landing + switcher to face hubs + in-season PDF re-link), Studio brand soft-link to a collection (live CIS inheritance), `/studio` cross-collection visibility, full credits unification (user_credits + credit_ledger, 7 imagery endpoints migrated, studio_purchases dropped).
type: project
---

# Session 2026-05-26 — UX cube + brand inherit + credits unification

> **State at start of session**: production stable post-Studio-Stripe-rebrand (2026-05-20) + In-Season feedback loop live (2026-05-20) + brand cleanup of legacy tables (2026-05-21). All 3 products LIVE but isolated — switcher existed but discreet, `/studio` only listed standalone projects, no brand-inherit, 3 concurrent credit systems coexisting (`imagery_credits` legacy + `studio_purchases` per-project + the new `CREDIT_COSTS` bucket without a canonical table).
>
> **State at end of session**: 9 commits on `main`, 3 migrations applied in prod (076 + 077 + 078). UX cube complete + brand soft-link working + credits unified into one ledger + 1 test collection deleted.

## What shipped (in commit order)

### 1. `bugfix/2026-05-26-in-season-pdf-view-link` (commit `7d25973`)
Card 04 of the In-Season tenant hub now routes to `/runs/<id>/pdf-view` for tenants with at least one PDF source (e.g. `big-brand-demo`). API/CSV tenants (`dtc-shopify-demo`) keep the regular list view. The `/pdf-view` route existed but was orphaned — typing the URL by hand was the only way to reach the canonical big-brand demo wedge. Also renamed the SS27 V26 run name in BD to drop the "dogfood" tag the customer-facing header was showing.

### 2. `bugfix/2026-05-26-unified-free-workspace` (commit `3bc7616`)
Felipe's "two-spaces" mental model:
- **Pre-workspace**: new `/(app)/home/page.tsx` (server component, 3 parallel queries) — unified landing with 3 sections (Colecciones · Studio · In-Season) and per-section "+ Nuevo" CTAs.
- **Workspace**: `/my-collections`, `/studio`, `/in-season` remain as per-face library hubs.
- All authenticated redirects (`/[locale]/page.tsx`, `/auth/callback`, `/welcome`, OnboardingFlow.onSkip) now point at `/home` instead of `/my-collections`.
- `StudioSwitcher` hardcoded to face hubs (no more `activeStudioId`/`active360Id`/`activeStrategyTenantSlug` — those fields are ignored). Clicking the Studio pill from inside `/collection/azur` lands you at `/studio` (face library), not at an unrelated active studio project.
- `/new-collection` retired its 3-pad intent screen ("¿Qué quieres hacer hoy?") — `view='pick-date'` is the only initial view now. `?direct=1` is a no-op but kept for back-compat.

### 3. `bugfix/2026-05-26-home-greeting-name` (commit `c78e07a`)
Trivial: `/home` was rendering "Tu workspace" instead of "Hola, Felipe" because `user_metadata.first_name` was empty. Falls back to `full_name.split(' ')[0]`.

### 4. `bugfix/2026-05-26-studio-cross-collection-visibility` (commit `867d737`)
`/studio` now renders two sections:
- "Proyectos Studio" — standalone `studio_projects` (unchanged behaviour for Studio-only subscribers).
- "Contenido de tus colecciones" — `collection_assets` with `asset_type IN ('editorial','lifestyle','still_life','video')` and `studio_project_id IS NULL`, grouped by collection, deep-linking to `/collection/<id>/marketing`.

Power users with active 360 collections now see ~16+ editorials per collection inside Studio. Pre-2026-05-26 those were invisible from the Studio face.

### 5. `feat(studio): soft-link brand source` (commit `bc1a34d`) — Paso 2 cubo 3 caras
Brand inheritance — Felipe chose the **soft-link** model (option A in his 2026-05-26 decision):

- **Migration 076** · `studio_projects.brand_source_collection_id uuid REFERENCES collection_plans(id) ON DELETE SET NULL` + partial index.
- **`src/lib/studio/effective-brand.ts`** · resolution helper. When `brand_source_collection_id IS NULL`, returns the local snapshot. When set, overlays `creative.identity.brand_name` + `creative.identity.colors` (with `creative.color.primary_palette` fallback) from the source collection's CIS, falling back to the local snapshot if the source collection is deleted (graceful degradation). `brand_logo_url` and `brand_fabric_refs` are NEVER inherited — Studio-local assets only.
- **`POST /api/studio/projects`** accepts `brand_source_collection_id`, verifies ownership before persisting.
- **`GET /api/user/collections`** · lightweight selector feed for the new project dropdown. Returns `id, name, season, brand_name` (CIS-resolved).
- **`/studio/new` NewProjectClient** · toggle "Brand nuevo" vs "Heredar de mi colección" + collection picker. The toggle is hidden when the user has no collections so Studio-only subscribers see the unchanged flow.
- **Studio-only persona**: the local `brand_name` + `brand_palette` flow is preserved untouched. Per Felipe's 2026-05-26 decision: no new `user_brand_kits` table — keep brand inside the Studio project for users who don't own a collection.

### 6. `bugfix/2026-05-26-cis-is-current-filter` (commit `06ce95a`)
Discovered live: my first cut of `/api/user/collections` ordered by `collection_decisions.created_at` — but that column doesn't exist (it's `decided_at` + `is_current` flag). Postgres returned an error silently consumed by the supabase client, so brand_name came back null and the dropdown showed "AZUR (SS27)" instead of "AZUR · Nudo (SS27)". Both `/api/user/collections` and `lib/studio/effective-brand.ts` now filter by `is_current=true`, which is what the rest of the CIS reads do.

### 7. `bugfix/2026-05-26-studio-workspace-brand-source-badge` (commit `c51c055`)
`/studio/[id]` header surfaces the inheritance — the eyebrow uses the effective brand name (from CIS, live) instead of the local snapshot, and renders a pill "Heredado de <collection>" that deep-links to `/collection/<id>`.

### 8. `feat(credits): canonical user_credits + credit_ledger` (commit `afc63cc`)
The crown of the session — the "3 concurrent credit systems" backlog item.

**Critical pre-check**: queried Supabase for live rows in `imagery_credits`, `imagery_credit_purchases`, `studio_purchases` → all three returned `0 users, NULL totals`. Zero paying users on the legacy systems = safe to restructure aggressively, no migration, no comms needed.

**Migration 077 (`unify_credits`)**:
- `imagery_credits` → `user_credits` (rename, same shape).
- `credit_ledger` created — append-only audit row per consume/refund/topup with `delta`, `consume_action` (the `CreditAction` key), `type`, `source`, `source_id`, `metadata`, `balance_after`. Unique index on `(source='stripe', source_id) WHERE type='topup'` enforces idempotency on Stripe webhook replays at the DB level.
- `imagery_credit_purchases` dropped (zero rows; ledger subsumes it).
- RPCs recreated: `consume_user_credits` / `refund_user_credits` / `add_user_credits`. Each one writes to `credit_ledger` inside the same transaction so the ledger never drifts. Legacy names (`consume_imagery_units` etc.) kept as SQL aliases for zero-downtime.

**TypeScript canon** (`src/lib/api-auth.ts`):
- `checkImageryUsage(userId, email, units, action?)` calls `consume_user_credits` directly.
- `consumeCredits(userId, email, action)` passes the `CreditAction` string so analytics group by product without joining `ai_usage`.
- `refundCredits(userId, planConsumed, packConsumed)` mirrors.

**AI endpoints migrated** (7 in this commit + 3 Studio endpoints in the next):
- `colorize-sketch`, `generate-sketch-options` → `'sketch'` (1)
- `freepik/still-life` → `'still_life'` (3)
- `freepik/tryon` → `'tryon'` (3)
- `freepik/editorial` → `'editorial'` (5)
- `freepik/video` → `'video_kling'` (30 — was hardcoded 5, aligned to canon now that no users were paying for video)
- `freepik/brand-model` → `'sketch'` (1)
- In-season run already used `consumeCredits('in_season_run', 10)`.

**Other migrations**:
- `src/lib/billing/load-subscription.ts` reads from `user_credits`.
- `src/app/api/webhooks/stripe/route.ts` calls `add_user_credits`.

### 9. `feat(credits): drop studio_purchases` (commit `89e7b84`) — same branch
Follow-up that completed the credit unification.

**Migration 078**: drop `studio_purchases` table + 3 obsolete RPCs (`allocate_studio_outputs`, `consume_studio_output`, `refund_studio_output`).

**`src/lib/studio/output-checker.ts`** rewritten as a thin `consumeCredits` / `refundCredits` wrapper. `consumeStudioOutput(userId, email, action)` now picks the right action by type (still_life / tryon / editorial / video_kling). Returns `planConsumed` / `packConsumed` for the refund path. `studioPoolEmptyResponse` copy updated to "compra un pack o sube de plan".

**4 Studio reader sites refactored** to consume the global `user_credits.balance`:
- `/api/studio/projects/route.ts` · `outputs_remaining` is now the user's global balance, same value on every project card.
- `/api/studio/projects/[id]/route.ts` · same shift, `purchases: []` kept in response shape for back-compat.
- `/studio/page.tsx` · dashboard shows the global balance per card.
- `/studio/[id]/page.tsx` · workspace header pulls from `user_credits`.

**3 Studio endpoints migrated**:
- `/api/studio/generate` — picks `still_life` / `tryon` / `editorial` based on `body.type`.
- `/api/studio/variation` — picks `still_life` (color, background) or `editorial` (model swap).
- `/api/studio/video` — `'video_kling'`.

**Async refund path** (`/api/studio/video/status`): asset metadata now stores `plan_consumed` + `pack_consumed` at start time so the status endpoint can refund exactly when an upstream Kling job ultimately fails.

**Stripe webhook**: `studio_pack` branch (Capsule / Editorial / Full Campaign) now calls `add_user_credits` with `pack='studio_<tier>'`. Idempotency via the unique `(source='stripe', source_id)` constraint on `credit_ledger`.

## Side cleanup

- `/home` test collection "Aimily Design — In-Season" (12 SKUs, 18 assets, created 2026-05-18, zero dependencies) hard-deleted via DELETE CASCADE in BD. Felipe explicit decision: "no me sirve de nada, cuanto más limpio mejor".

## Three personas — supported coherently

- **Power user (3 products)** · Felipe today. `/home` shows all 3 sections. `/studio` shows standalone projects + cross-collection editorials. Can soft-link Studio brand to AZUR or SS27 SLAIZ. Credits pool globally across products.
- **Studio-only subscriber** · No collections. `/home` shows only the Studio section. The "Heredar de mi colección" toggle is hidden. The standalone flow is preserved exactly as 2026-05-20.
- **In-Season-only subscriber** · No collections, no Studio. `/home` shows only the In-Season section. Switcher hides the inaccessible pills.

## What's NOT in this session (deferred to a follow-up sprint)

- Studio standalone → 360 collection upgrade path. Feature gap, scope new.
- In-Season seed → Studio direct generation. Feature gap, scope new.
- Multi-tenant for Collections + Studio (today only In-Season has the tenant model). Feature gap, scope mayor.
- Cleanup of dead code in `/new-collection` — the `view === 'intent'` branch ~50 lines that no longer renders. Repo hygiene only, zero user impact.
- Removing the deprecated legacy RPC aliases (`consume_imagery_units` etc.) and the `checkImageryUsage` deprecated export. Safe once a stale deploy is confirmed not to exist.

## Migrations applied this session (all on `sbweszownvspzjfejmfx`)

- **076** · `studio_brand_inherit`
- **077** · `unify_credits`
- **078** · `drop_studio_purchases`

## Files touched

```
src/app/(app)/home/page.tsx                                 (NEW)
src/app/(app)/in-season/[tenantSlug]/page.tsx
src/app/(app)/my-collections/page.tsx                       (no change — kept as per-face hub)
src/app/(app)/new-collection/page.tsx
src/app/(app)/studio/page.tsx
src/app/(app)/studio/new/NewProjectClient.tsx
src/app/(app)/studio/[id]/page.tsx
src/app/(app)/studio/[id]/ProjectWorkspaceClient.tsx
src/app/(app)/welcome/page.tsx
src/app/[locale]/page.tsx
src/app/api/ai/colorize-sketch/route.ts
src/app/api/ai/freepik/brand-model/route.ts
src/app/api/ai/freepik/editorial/route.ts
src/app/api/ai/freepik/still-life/route.ts
src/app/api/ai/freepik/tryon/route.ts
src/app/api/ai/freepik/video/route.ts
src/app/api/ai/generate-sketch-options/route.ts
src/app/api/auth/callback/route.ts
src/app/api/studio/generate/route.ts
src/app/api/studio/projects/route.ts
src/app/api/studio/projects/[id]/route.ts
src/app/api/studio/variation/route.ts
src/app/api/studio/video/route.ts
src/app/api/studio/video/status/route.ts
src/app/api/user/collections/route.ts                       (NEW)
src/app/api/webhooks/stripe/route.ts
src/components/layout/StudioSwitcher.tsx
src/components/onboarding/OnboardingFlow.tsx
src/lib/api-auth.ts
src/lib/billing/load-subscription.ts
src/lib/stripe.ts
src/lib/studio/effective-brand.ts                           (NEW)
src/lib/studio/output-checker.ts                            (rewritten)
supabase/migrations/076_studio_brand_inherit.sql            (NEW)
supabase/migrations/077_unify_credits.sql                   (NEW)
supabase/migrations/078_drop_studio_purchases.sql           (NEW)
memory/full-project-documentation.md                        (Bible updated)
```
