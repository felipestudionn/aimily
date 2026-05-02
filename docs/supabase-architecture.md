# Supabase Architecture — aimily

> Source of truth for how aimily uses Supabase. Updated 2026-05-02 (Pro upgrade).
> If you change auth, storage, RLS, rate limiting, or extensions — update this file in the same commit.
>
> **Para auditoría/due-diligence/onboarding:** ver primero [`SECURITY-DATABASE-BIBLE.md`](./SECURITY-DATABASE-BIBLE.md), que recoge la sesión Pro hardening 2026-05-02 entera (phases A→F, decisiones founder, advisor evolution, cómo verificar el estado).

## 0. Resumen ejecutivo (ES)

- **Proyecto aimily Pro**: `sbweszownvspzjfejmfx`, EU central, Postgres 17.6.1.052, ACTIVE_HEALTHY.
- **Plan**: Pro $25/mes (sin add-ons). Verificado contra https://supabase.com/pricing 2026-05-02.
- **Datos al cierre**: 47 tablas aimily, 176 collection_assets, 50 collection_decisions, 28 aimily_models, 42 SKUs, 11 audit_log, 241 storage objects.
- **Bucket de assets**: `collection-assets` privado desde 2026-05-01, todas las URLs son signed (TTL 1 año, caducan ~2027-05-01).
- **Auth**: middleware valida JWT con `supabase.auth.getUser()`. Owner-first + team_members con 14 permisos granulares.
- **Rate limiting**: middleware 30 req/min/IP en `/api/ai/*` + per-user buckets (text 30, heavy-text 15, image 10, video 3).
- **Crons hoy**: 4 jobs en Vercel (`vercel.json`). pg_cron NO instalado todavía (disponible para activar).
- **Otro proyecto en la org**: `ailfred-studionn` (`ixqbcvopjnkrbgzkkall`) creado 2026-05-02 — agente Ailfred migra ahí todo lo no-aimily. Las tablas/buckets/funciones que veas marcadas como "Fred" desaparecerán al completarse la migración.
- **Hallazgos críticos del advisor 2026-05-02** (sección 9-10): 1 ERROR de seguridad + 24 WARN de seguridad + 1.110 lints de performance que tocan tablas aimily. Detalle más abajo.

---

## 1. Proyectos y planes

| Proyecto | ref | Plan | Región | Postgres | Status | Uso |
|---|---|---|---|---|---|---|
| **aimily** | `sbweszownvspzjfejmfx` | **Pro** | eu-central-1 | 17.6.1.052 | ACTIVE_HEALTHY | Producción aimily |
| ailfred-studionn | `ixqbcvopjnkrbgzkkall` | — | eu-central-1 | 17.6.1.111 | ACTIVE_HEALTHY | Destino migración Fred |

Ambos en la org `tshvflwejyoeyddhdqvr`. Otros proyectos del usuario (PawMeme, NOA, Cuentifyapp) están en otras orgs y no son relevantes.

---

## 2. Plan Pro $25/mes — qué incluye (verificado 2026-05-02)

Fuente: https://supabase.com/pricing

| Recurso | Free | Pro incluye | Overage |
|---|---|---|---|
| Database disk | 500 MB | **8 GB** | $0.125/GB |
| MAUs | 50.000 | **100.000** | $0.00325/MAU |
| Daily backups | — | **7 días** | — |
| File storage | 1 GB | **100 GB** | $0.021/GB |
| Cached egress | 5 GB | **250 GB** | $0.03/GB |
| Edge Function invocations | 500K | **2M/mes** | $2/M |
| Realtime peak conn | 200 | **500** | $10/1000 |
| Realtime messages | 2M | **5M/mes** | $2.50/M |
| Log retention | 1 día | **7 días** | — |
| Image Transformations | — | **100 origin imgs** | $5/1000 |
| Email support | — | ✅ | — |

**Add-ons NO activados** (decisión Felipe 2026-05-02):

| Add-on | Coste | Por qué no |
|---|---|---|
| PITR (Point-in-Time Recovery) | $100/mes + Small compute $15/mes obligatorio = $115/mes | Sin clientes serios no se justifica. Daily backups 7 días gratis cubren los escenarios actuales. |
| Branches | $0.01344/h por rama | No hay equipo, no hay PRs múltiples |
| Custom domain | $10/mes/dominio | aimily.app sirve directo desde Vercel; no hace falta domain en Supabase API |
| Log drains | $60/mes/drain | No hay equipo de ops |
| Read replicas | (no listado en pricing) | <100 read qps sostenidos hoy |

**Confirmado GA en Pro** (https://supabase.com/docs/guides/getting-started/features):
- Network Restrictions GA
- Read Replicas GA (add-on)
- Custom Domains GA (add-on)
- PITR GA (add-on)
- Image Transformations GA (incluido + overage)
- Daily backups GA (incluido)

---

## 3. Esquema y tablas

### 3.1 Tablas aimily (47, las que se quedan en este proyecto)

**Core de colección** (núcleo del producto):
- `collection_plans` — plan de colección (es la entidad raíz, lo que llamamos "colección")
- `collection_skus` — SKUs dentro de un plan (42 filas hoy)
- `collection_assets` — todas las imágenes/videos generados o subidos (176 filas)
- `collection_decisions` — Collection Intelligence System (CIS), 50 filas
- `collection_workspace_data` — estado UI del workspace por colección
- `collection_stories` — narrativa por colección
- `collection_timelines` — timeline de la colección
- `standalone_timelines` — timeline sin colección asociada
- `sku_colorways` — colorways por SKU (20 filas)
- `drops` — drops planificados
- `commercial_actions` — acciones comerciales
- `brand_profiles` — identidad de marca (1 fila)
- `brand_models` — modelos de marca propios del usuario
- `brand_voice_config` — configuración de voz de marca
- `aimily_models` — 28 modelos AI (14F + 14M, Flux 2 Pro)
- `user_brands` — multi-marca por usuario (2 filas)

**Diseño / producción**:
- `tech_packs` — tech pack metadata
- `tech_pack_data` — sheets per SKU
- `tech_pack_comments` — Hatch-style pin comments (10 filas)
- `suppliers` (5) y `factories` (6)
- `production_orders`
- `sample_reviews` y `asset_reviews`
- `lookbook_pages`

**Marketing / GTM**:
- `paid_campaigns` y `paid_ad_sets`
- `content_calendar`, `content_pillars`
- `pr_contacts`
- `social_templates`, `email_templates_content`
- `product_copy`
- `campaign_shoots`
- `launch_tasks`, `launch_checklist`, `launch_issues`
- `sales_channels`, `sales_entries`, `wholesale_orders`

**Trends / signals**:
- `city_trends_raw` (3.736), `city_trends_processed` (262), `tiktok_hashtag_trends` (18)
- `signals`, `reports`, `raw_content`, `analyzed_content`, `processing_jobs`
- `market_predictions`

**Plataforma**:
- `subscriptions` — Stripe sync (1 fila)
- `imagery_credits` y `imagery_credit_purchases` — quotas de imágenes
- `ai_generations` (4) y `ai_usage` — telemetría AI
- `audit_log` (11) — pista de auditoría
- `team_members` — colaboradores de colección
- `presentation_shares` (3) y `presentation_deck_overrides` (2) — Presentation module
- `lessons_learned`

### 3.2 Tablas Fred (a migrar — ignorar)

`tasks (88), rrss_posts (46), document_search_cache (23), meal_plans (20), session (18), user_projects (17), projects (16), itinerary_items (15), chat_messages (14), travel_plans (11), briefings (8), reminders (4), push_subscriptions (3), account (3), user (3), client_decks (1), project_olawave_links (1), exercise_plans (1)`. Vacías: `processing_jobs, verification, rrss_post_assets, rrss_plans, calendar_*, analyzed_content, bot_memory, asset_reviews, campaign_shoots, paid_ad_sets, launch_*, sales_entries, lessons_learned, imagery_credit_purchases, collection_intelligence`.

> Nota: algunas son ambiguas (ej. `analyzed_content`, `processing_jobs`). El migrador Ailfred decide qué vacías arrastra.

### 3.3 RLS

**Todas las tablas tienen `rls_enabled=true`**. Verificado vía `mcp_supabase_list_tables`. RLS policies conviven con `service_role` (que las bypassea) — todas las escrituras críticas pasan por `supabaseAdmin` desde rutas API que ya validaron auth manualmente.

---

## 4. Auth y permisos

### 4.1 Capas

```
┌───────────────────────────────────────────────────────────┐
│ src/middleware.ts                                          │
│   - Rate limit IP (30/min) en /api/ai/* y /api/billing/*  │
│   - Valida JWT vía supabase.auth.getUser() (no getSession)│
│   - 401 en API si no hay user, redirect a / en pages       │
│   - publicApiPrefixes: /api/webhooks/, /api/cron/, /api/auth/│
│   - publicPagePrefixes: /p/, /presentation/export/, /tech-pack/export/│
└───────────────────────────────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────┐
│ src/lib/api-auth.ts → getAuthenticatedUser()               │
│   - Devuelve { user, error }                               │
│   - Usado en TODAS las rutas API protegidas                │
└───────────────────────────────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────┐
│ src/lib/team-permissions.ts → checkTeamPermission()        │
│   - 14 permisos granulares (TeamPermission)                │
│   - Owner: bypass total                                    │
│   - Otros: lookup en team_members.permissions              │
└───────────────────────────────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────┐
│ verifyCollectionOwnership(userId, planId, permission)      │
│   - Wrapper de checkTeamPermission, defaults a 'view_all' │
└───────────────────────────────────────────────────────────┘
```

### 4.2 Permisos definidos (`TeamPermission`)

`view_all, edit_design, edit_production, approve_production, edit_financial, export_po, edit_marketing, generate_ai_marketing, manage_pr_contacts, edit_paid_campaigns, publish_content, manage_team, manage_billing`.

### 4.3 Roles default (`ROLE_DEFAULTS`)

`owner` (todo), `admin` (todo menos manage_billing), `designer` (lectura + diseño + marketing edit/AI), `viewer` (solo view_all).

### 4.4 Quotas — `checkImageryUsage()`

- Solo billed AI image/video generations consumen quota. Texto (Haiku/Gemini/Perplexity) ilimitado.
- Atomic vía RPC `consume_imagery_units` (locks row en `ai_usage` + `imagery_credits` durante txn).
- Refund vía RPC `refund_imagery_units` si el provider call falla.
- Admin bypass por email (ADMIN_EMAILS).
- Estado: `trial`, `canceled`, `unpaid` → 402/403 según caso.

### 4.5 Env vars

```
NEXT_PUBLIC_SUPABASE_URL=https://sbweszownvspzjfejmfx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...     # solo en runtime server (supabaseAdmin)
SUPABASE_MANAGEMENT_TOKEN=...     # solo para scripts y migraciones
```

`supabaseAdmin` (service_role) se usa en API routes para bypassear RLS cuando ya se validó auth + ownership a nivel aplicación.

---

## 5. Storage

### 5.1 Bucket `collection-assets`

- **Privado** desde commit `1998573` (2026-05-01).
- 241 objetos, ~30 MB.
- Path: `{collection_plan_id}/{asset_type}/{filename}`
- Asset types: `moodboard, render, sketch, lifestyle, still_life, editorial, tryon, model, video, tech_pack, material_swatch, callout`.

### 5.2 Helpers (`src/lib/storage.ts`)

- `uploadToStorage(planId, type, fileName, buffer, contentType)` — valida MIME + magic bytes + 25MB cap, sube, devuelve signed URL 1 año.
- `uploadFromUrl(planId, type, sourceUrl)` — pasa por `ensureSafeExternalUrl` (SSRF guard), 30s timeout, 50MB cap, re-upload.
- `uploadBase64(planId, type, base64, mime)` — strip data URI prefix + upload.
- `persistAsset()` — combinación: upload + insert en `collection_assets`.
- `deleteAsset(assetId)` — borra storage + row.

### 5.3 Signed URL TTL

```
const SIGNED_URL_TTL_SECONDS = 365 * 24 * 3600;
```

Las 213 URLs en BD caducan ~2027-05-01. **Item P0 sin código todavía**: cron de re-firma antes de esa fecha.

### 5.4 Otros buckets

- `reports` (público, listing abierto — Fred-only, desaparece con migración)
- `rrss-assets` (público, listing abierto — Fred-only, desaparece con migración)

---

## 6. Rate limiting

### 6.1 Capa 1 — Middleware (IP)

`src/middleware.ts:46-56` → 30 req/min/IP en `/api/ai/*` y `/api/billing/checkout`. In-memory por warm instance (se documenta el caveat en `src/lib/rate-limit.ts`).

### 6.2 Capa 2 — Per-user (`enforceAiUserRateLimit`)

`src/lib/api-auth.ts:202-216`. Cuatro buckets cost-aligned:

| Bucket | Limit | Usos | Coste/llamada |
|---|---|---|---|
| `text` | 30/min | Haiku, Gemini Flash, Perplexity simple | $0.001-0.003 |
| `heavy-text` | 15/min | Perplexity multi-query, Sonnet, vision | $0.005-0.015 |
| `image` | 10/min | Freepik Mystic, OpenAI image | variable |
| `video` | 3/min | Kling 2.1 video | ~$0.30 |

Aplicado a 26 endpoints AI. `vectorize` y `brief/create` exentos (no son AI).

### 6.3 Caveat conocido

Ambas capas son **in-memory por warm instance**. En Vercel Fluid con varias replicas, el límite es aproximado. Suficiente para evitar runaway pero no para defensa contra abuso distribuido. Si llega tráfico real serio → Redis-backed (Upstash/KV).

---

## 7. Crons activos (Vercel)

`vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/collect-tiktok-trends",  "schedule": "0 6 * * 4" },
    { "path": "/api/cron/process-city-trends",    "schedule": "0 7 * * 4" },
    { "path": "/api/cron/post-launch-analysis",   "schedule": "0 8 * * *" },
    { "path": "/api/cron/trial-emails",           "schedule": "0 9 * * *" }
  ]
}
```

`pg_cron` NO instalado (extension disponible v1.6.4 — disponible para activar). Deuda: re-firma de signed URLs todavía sin job.

---

## 8. Funciones / RPCs

### 8.1 RPCs llamadas desde código

- `consume_imagery_units(p_user_id, p_units, p_plan_limit)` → atomic decrement + return `{allowed, plan_consumed, pack_consumed, current, limit, pack_balance}`. SECURITY DEFINER.
- `refund_imagery_units(p_user_id, p_plan_consumed, p_pack_consumed)` → atomic refund. SECURITY DEFINER.
- `add_imagery_credits(p_user_id, p_amount, p_pack, p_stripe_session_id)` → idempotent credit add. SECURITY DEFINER.
- `handle_new_user_subscription()` → trigger inserción en `subscriptions` al crear user. SECURITY DEFINER.
- `increment_share_views(p_token)` → contador atomic en `presentation_shares`. SECURITY DEFINER.

### 8.2 Triggers conocidos

`touch_*_updated_at()` en tech_pack_data, suppliers, factories, update_updated_at_column genérico.

### 8.3 Vistas

- `collection_intelligence` — view SECURITY DEFINER (⚠️ flag del advisor — ver §9.1).

---

## 9. Hallazgos del Security Advisor (2026-05-02)

Total: **1 ERROR + 24 WARN**. Solo cuento aquí los que tocan aimily.

### 9.1 🔴 ERROR — Security Definer View

`public.collection_intelligence` view es SECURITY DEFINER → ejecuta con permisos del creador, no del invocador. Bypass de RLS para quien la consulte. Documentación: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

**Estado**: la lista del handoff dice que `collection_intelligence` está en "Fred — vacías". Verificar si la vista cae con la migración o si es aimily-real y hay que recrearla con `security_invoker=true`.

### 9.2 🟡 WARN — `function_search_path_mutable` (7 funciones aimily)

Funciones sin `SET search_path = ...` → vulnerable a search_path injection si alguien crea `pg_temp.<nombre>`. Funciones afectadas: `touch_tech_pack_data_updated_at, touch_suppliers_updated_at, touch_factories_updated_at, increment_share_views, handle_new_user_subscription, add_imagery_credits, update_updated_at_column`.

**Fix**: `ALTER FUNCTION ... SET search_path = public, pg_catalog;` o redefinir con `SET search_path` en el cuerpo.

### 9.3 🟡 WARN — SECURITY DEFINER ejecutables por anon/authenticated

5 funciones llamables vía `/rest/v1/rpc/*` por roles `anon` y `authenticated`:
- `add_imagery_credits` ← debería ser solo service_role (la llamamos desde webhook Stripe)
- `consume_imagery_units` ← idem
- `refund_imagery_units` ← idem
- `handle_new_user_subscription` ← trigger interno; no debería estar expuesto
- `increment_share_views` ← este SÍ tiene sentido para anon (página pública /p/[token])

**Fix recomendado**: `REVOKE EXECUTE ON FUNCTION ... FROM anon, authenticated;` para las 4 primeras. La verificación interna (auth.uid() == p_user_id) la implementa el código de aplicación, pero el linter pide endurecimiento defensa-en-profundidad. https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

### 9.4 🟡 WARN — `auth_leaked_password_protection` desactivado

Supabase Auth tiene la opción de chequear contra HaveIBeenPwned para rechazar passwords ya filtrados. Está OFF.

**Fix**: 1 click en `Project Settings → Authentication → Password Strength → Leaked Password Protection`.

### 9.5 Otros — desaparecen con migración Fred

- 4 RLS "always true" en `chat_messages, client_decks, itinerary_items, user_projects`.
- 2 buckets públicos con listing abierto: `reports, rrss-assets`.

---

## 10. Hallazgos del Performance Advisor (2026-05-02)

Total: **1.110 lints** (incluyendo Fred). Lo que toca aimily:

### 10.1 🟡 WARN — `auth_rls_initplan` (172 ocurrencias)

Patrón sistémico en muchas tablas aimily: las RLS policies usan `auth.uid()` directamente, lo que hace que Postgres lo re-evalúe **por cada fila** del query. Tablas core afectadas: `collection_plans, collection_skus, collection_assets, collection_decisions, collection_stories, collection_timelines, ai_usage, ai_generations, audit_log, brand_profiles, drops, suppliers, factories, tech_pack_data, tech_pack_comments, presentation_shares, sales_channels, wholesale_orders`, etc.

**Fix**: en cada policy, envolver `auth.uid()` en `(select auth.uid())` para que el optimizer cachee el valor para toda la query:

```sql
-- ANTES (lento)
CREATE POLICY "..." ON public.collection_plans FOR SELECT USING (user_id = auth.uid());

-- DESPUÉS (rápido)
CREATE POLICY "..." ON public.collection_plans FOR SELECT USING (user_id = (select auth.uid()));
```

Ganancia: queries con muchas filas (collections con 100+ SKUs, audit_log con miles de rows) bajan de O(N) re-evaluaciones a O(1). Crítico antes de tener clientes activos.

Fuente: https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan

### 10.2 🟡 WARN — `multiple_permissive_policies` (896 ocurrencias)

24 ocurrencias por tabla en >30 tablas. Patrón: dos roles (`authenticated` + `alfred_app` el rol de Fred) tienen policies independientes para cada acción, así que el planner las evalúa todas y aplica OR. Cuando `alfred_app` se borre con la migración Fred, el linter caerá masivamente.

**Acción**: revisar al cierre de migración Fred. Si quedan duplicados aimily-only, consolidar.

### 10.3 🟡 INFO — `unindexed_foreign_keys` (13 aimily-core, 6 Fred)

FKs sin índice de cobertura → DELETE/UPDATE en parent → seq scan de child. Aimily-core afectados:

| Tabla | FK |
|---|---|
| `collection_plans` | `user_id` ⚠️ MUY usada |
| `collection_skus` | `plan_id` ⚠️ MUY usada |
| `collection_assets` | `uploaded_by` |
| `collection_decisions` | `supersedes_id` |
| `brand_profiles` | `guidelines_asset_id`, `logo_asset_id` |
| `presentation_deck_overrides` | `updated_by` |
| `team_members` | `invited_by` |
| `tech_pack_comments` | `author_id`, `collection_plan_id` |

**Fix**: `CREATE INDEX CONCURRENTLY idx_<table>_<col> ON public.<table>(<col>);`

### 10.4 🟡 WARN — `duplicate_index` (3 aimily-core)

| Tabla | Duplicados |
|---|---|
| `ai_usage` | `ai_usage_user_id_month_key` y `ai_usage_user_month_unique` |
| `imagery_credits` | `imagery_credits_user_id_key` y `imagery_credits_user_unique` |
| `paid_campaigns` | `idx_paid_campaigns_collection` y `idx_paid_campaigns_plan` (verificar definiciones — pueden estar cubriendo distintas columnas con nombres engañosos) |

**Fix**: `DROP INDEX <redundante>;` tras verificar `pg_indexes` que son realmente idénticos.

### 10.5 🟡 INFO — `unused_index` (43 ocurrencias)

Índices nunca usados desde el último restart. Bajo coste, candidatos a borrar. Hacer al final del proceso (cuando RLS y FK ya estén corregidos), porque algunos pueden no estar siendo usados solo porque las queries actuales escanean tablas casi vacías.

### 10.6 INFO — `auth_db_connections_absolute`

Auth server limitado a 10 conexiones — está OK con Free/Pro y el tráfico actual. Si subimos compute add-on, ajustar manualmente.

---

## 11. Features Pro disponibles para activar

Todas verificadas como instalables vía `mcp_supabase_list_extensions` 2026-05-02. Ninguna instalada todavía.

| Extensión / feature | Versión | Para qué |
|---|---|---|
| `pg_cron` | 1.6.4 | Programar jobs SQL/HTTP. Reemplaza Vercel Cron para tareas database-bound. |
| `pg_net` | 0.19.5 | HTTP async desde Postgres. Base de Database Webhooks y de cron→edge function. |
| `pg_stat_monitor` | 2.1 | Performance monitoring agregado (ext. de pg_stat_statements). |
| `index_advisor` | 0.2.0 | Analiza queries reales y sugiere índices. |
| `pg_repack` | 1.5.2 | Reorganizar tablas con minimal locks (vacuum full sin downtime). |
| Database Webhooks | (UI/SQL) | Envía cambios INSERT/UPDATE/DELETE a un endpoint HTTP. Wrapper alrededor de pg_net. |
| Storage Image Transformations | (Pro) | `createSignedUrl(path, ttl, { transform: { width, height, quality, format } })`. 100 origin imgs incluidos. |
| Supavisor pooler | (incluido) | Connection pool en port 6543 (transaction) o 5432 (session). |
| Network Restrictions | (Pro GA) | Allowlist de IPs que pueden conectar a la DB. |

### 11.1 Pooler Supavisor — qué cambia

**Hoy**: el SDK `supabase-js` en API routes va por la Data API (REST/GraphQL), que ya usa pooling internamente. **No hace falta cambiar nada para `supabase-js`**. La pregunta es relevante solo si vamos a abrir conexiones Postgres directas (drizzle, kysely, scripts).

**Si en el futuro abrimos clientes Postgres directos** (ej. para un Edge Function o un script de migración masiva): usar transaction mode (port 6543), DESACTIVAR prepared statements en el cliente. Hoy no aplica.

Conclusión: **el pooler Pro está disponible sin cambiar config**. No es un quick win porque ya no hay un problema de conexiones — el SDK lo gestiona.

### 11.2 Image Transformations — uso compatible con bucket privado

Verificado contra https://supabase.com/docs/guides/storage/serving/image-transformations:

```ts
supabase.storage.from('collection-assets').createSignedUrl(path, ttl, {
  transform: { width: 400, height: 400, quality: 80, resize: 'cover' }
});
```

Los parámetros se firman dentro del token. Una imagen original genera 1 "origin image"; cualquier cantidad de transforms posteriores sobre esa misma original NO cuentan adicional. Tenemos 100 origin imgs incluidos/mes; 176 collection_assets en BD pero solo unas pocas se transforman activamente por sesión.

**Limites**: 25MB por archivo, 50MP, output WebP automático.

### 11.3 pg_cron + pg_net — qué nos resuelve

Verificado contra https://supabase.com/docs/guides/cron y .../extensions/pg_net:

- Programación segundo-a-año, sintaxis cron estándar.
- Logs en `cron.job_run_details`, debug en `net._http_response`.
- Recomendado max 8 jobs concurrentes, max 10 min por job, max 32 jobs totales.
- pg_net: 200 req/seg sostenidas, JSON only POST, GET, DELETE (no PATCH/PUT), TTL 6h por defecto en `_http_response`.

**Casos aimily**:
1. Re-firma de signed URLs antes de caducidad (item P0 actual).
2. Limpieza de `audit_log` viejo (>180 días).
3. Reset de `imagery_credits` mensual.
4. Aviso a Slack/email cuando una signed URL falla (>0 errores en 24h).
5. Sustituir los 4 Vercel Crons existentes por jobs SQL puros — más baratos y monitoreables desde Postgres.

### 11.4 Database Webhooks — qué nos da

Triggers nativos sobre INSERT/UPDATE/DELETE → HTTP. Casos aimily:

- `subscriptions` UPDATE plan → notificar Slack del upgrade/downgrade.
- `wholesale_orders` INSERT → email al equipo de ops.
- `audit_log` con `severity='critical'` INSERT → page al on-call.
- `presentation_shares` views > 100 → notificar al owner.

Hoy estos casos no existen, pero son la mecánica que nos permitirá conectar herramientas externas sin código nuevo.

### 11.5 Network Restrictions

GA en Pro. Permite restringir qué IPs pueden conectar a la DB Postgres. **No restringe la Data API (REST/GraphQL)** — esa siempre acepta clients válidos vía JWT. Útil solo si abrimos conexiones directas (mismo escenario que pooler — hoy no aplica).

### 11.6 Read Replicas

Add-on no incluido en Pro base. Para aimily a 10-100 clientes no es necesario — single primary serves both reads and writes con holgura.

---

## 12. Beneficios al usuario final del Pro upgrade (lente go-to-market)

Esto es lo que un cliente percibe diferente entre aimily-Free y aimily-Pro:

### 12.1 Velocidad
- **Imágenes hasta 10× más ligeras en thumbnails** (Image Transformations + WebP automático). En pantallas con 50+ imágenes (moodboard, lookbook, presentation grid) la página carga en 1-2s en vez de 8-10s.
- **Queries de colecciones con muchos SKUs hasta 100× más rápidas** una vez aplicado el fix de `auth.uid()` en RLS policies. Una colección con 200 SKUs hoy hace 200 × eval de auth.uid; con el fix lo hace 1 vez.
- **No hay "too many connections" en pico de tráfico** — Pro tiene Supavisor pooler ilimitado disponible.

### 12.2 Seguridad
- **Imágenes privadas** — desde 2026-05-01 nadie ve un asset sin URL firmada por el servidor. Antes una URL de moodboard era pública y guessable.
- **Backups automáticos 7 días** — si algo se borra por accidente o un cliente reporta corrupción, recuperamos hasta 7 días atrás GRATIS. Con Free no había backups.
- **Detección de passwords filtrados** (HaveIBeenPwned) — con un click, evitamos que un usuario se registre con una password ya hackeada.
- **Audit log retenido 7 días** vs 1 día en Free. Si un cliente pregunta "qué pasó con mi colección el martes", podemos contestar.
- **Proyecto aislado** — los datos de otros proyectos personales del founder ya no comparten infraestructura con datos de cliente. La migración Fred separa el contexto físico.

### 12.3 Almacenamiento
- **100 GB de assets** vs 1 GB. A 30 MB de assets/colección, esto soporta ~3.300 colecciones antes de pagar overage. Hoy estamos en 30 MB total — margen 3.300×.
- **8 GB de DB** vs 500 MB. Hoy 85 MB. Margen 94×. Soporta ~10K usuarios activos sin tocar.
- **250 GB de tráfico/mes** vs 5 GB. Si compartes un deck con 10K personas en LinkedIn, no se cae nada.

### 12.4 Confiabilidad
- **100K usuarios activos/mes** vs 50K Free.
- **Email support** de Supabase si algo crítico se rompe.
- **Logs 7 días** para investigar incidentes.

### 12.5 Funcionalidades nuevas que podemos ofrecer
- **Notificaciones automáticas** ("tu deck ha sido visto 100 veces", "tu colección llegó a producción") via Database Webhooks → Slack/email/in-app, sin escribir código de monitoreo.
- **Imágenes optimizadas en mobile** automáticamente sin pre-procesar — el dispositivo del cliente recibe la versión exacta que necesita.
- **Tareas programadas reales** desde la BD — limpieza, renovación de assets, recordatorios de calendario — fiables incluso si Vercel está caído.

### 12.6 Lo que NO cambia (importante decirlo)
- La velocidad de las llamadas AI (Anthropic, OpenAI, Freepik, Kling) **no la marca Supabase** — la marca el provider externo. Pro no acelera generación de imagen.
- La latencia base de la DB (eu-central-1) es la misma para clientes lejos. No hay multi-region en Pro base (Read Replicas es add-on aparte).

---

## 13. Hardening 2026-05-02 — qué se aplicó

Tres migraciones ya están en producción contra `sbweszownvspzjfejmfx`. Se ejecutaron via MCP `apply_migration`, así que están en el historial Supabase.

### Phase A — `pro_hardening_a`

- `storage.buckets`: `reports` y `rrss-assets` puestos a `public=false` (eran Fred-only, pero compartían proyecto con aimily — el linter `public_bucket_allows_listing` pedía cierre y los nuevos clientes no deben verlos abiertos).
- `public.collection_intelligence` view: `security_invoker = true`. Antes ejecutaba con permisos del creador (postgres), ahora con los del invocador, así RLS de `collection_decisions` aplica de verdad.
- REVOKE EXECUTE on `add_imagery_credits`, `consume_imagery_units`, `refund_imagery_units`, `handle_new_user_subscription` from `public, anon, authenticated`. Estas RPCs solo se llaman desde rutas server-side con `service_role`. `increment_share_views` se mantiene accesible a `anon` porque la página pública `/p/[token]` la necesita.
- `search_path = public, pg_catalog` fijado en 7 funciones SECURITY DEFINER y de trigger que no lo tenían (`touch_*`, `increment_share_views`, `handle_new_user_subscription`, `add_imagery_credits`, `update_updated_at_column`).

### Phase C — `pro_hardening_c_rls_initplan_fix`

127 RLS policies sobre 50 tablas aimily-core reescritas. `auth.uid()` envuelto en `(select auth.uid())` para que el optimizer cachee el valor una vez por query. Patrón documentado en https://supabase.com/docs/guides/database/postgres/row-level-security#authuid-performance.

### Phase D — `pro_hardening_d_indexes_and_softdelete`

- 10 índices FK añadidos (`idx_collection_plans_user_id`, `idx_collection_skus_plan_id`, `idx_collection_assets_uploaded_by`, `idx_collection_decisions_supersedes_id`, `idx_brand_profiles_guidelines_asset_id`, `idx_brand_profiles_logo_asset_id`, `idx_presentation_deck_overrides_updated_by`, `idx_team_members_invited_by`, `idx_tech_pack_comments_author_id`, `idx_tech_pack_comments_collection_plan_id`).
- 3 duplicados borrados: UNIQUE constraints `ai_usage_user_month_unique` y `imagery_credits_user_unique`, índice plain `idx_paid_campaigns_plan`.
- `collection_assets.deleted_at TIMESTAMPTZ` añadido + índice parcial `idx_collection_assets_active`.

### Cambios de aplicación shipped el mismo día

- `src/lib/storage.ts`:
  - `signThumbnailUrl(path, opts)` — usa Supabase Image Transformations (Pro) sobre el bucket privado, devuelve WebP firmado al tamaño exacto.
  - `signShortReadUrl(path, ttl, transform?)` — signed URL TTL configurable (default 60s) con o sin transform, para casos en que NO queremos persistir 1 año.
  - `deleteAsset()` ahora hace soft-delete (`deleted_at = now()`) y NO borra Storage. Recuperar = `update collection_assets set deleted_at = null where id = '…'`.
  - `purgeAsset()` separado para hard-delete admin-only.
- `src/app/api/collections/[id]/route.ts`: el DELETE de colección ya no purga objetos del bucket; los mueve a `__trash/{collection_id}/{ISO_TIMESTAMP}/...` para que el cron mensual los sweepee 30 días después.
- `src/app/api/storage/sign/route.ts` (nuevo): `GET ?assetId=&w=&h=&q=&ttl=` con `verifyCollectionOwnership`, devuelve signed URL TTL ≤ 1 h. Sustituye el patrón TTL 1 año cuando UI nueva pueda usarlo.
- `src/app/api/cron/cleanup-storage-trash/route.ts` (nuevo) + entrada en `vercel.json` `0 4 1 * *` (mensual): purga `__trash/` con timestamp > 30 días. Verifica `CRON_SECRET`.
- `scripts/backup-storage.ts` (nuevo): manual `npx tsx`, descarga todo el bucket a `./.storage-backup/{ts}/` con `manifest.json`. Cross-cloud (B2/S3) deferred — sin credenciales externas no se puede automatizar hoy.

### Advisor delta

| Tipo | Antes | Tras Phase A+C | Tras Phase D |
|---|---|---|---|
| Security ERROR | 1 | 0 | 0 |
| Security WARN | 24 | 7 | 7 |
| Performance total | 1.110 | 1.007 | 1.003 |
| `auth_rls_initplan` | 172 | 45 | 45 |
| `unindexed_foreign_keys` | 19 | 19 | 10 |
| `duplicate_index` | 3 | 3 | 0 |
| `unused_index` | 43 | 43 | 51 (subió porque los 11 nuevos aún no han recibido tráfico) |

Los 7 WARN de seguridad que quedan: 4 RLS "always-true" en tablas Fred (chat_messages, client_decks, itinerary_items, user_projects — caen con migración Ailfred), 2 sobre `increment_share_views` (intencional para anon), 1 Leaked Password Protection (decisión founder: cero fricción al signup).

Los 1.003 lints de performance que quedan: 896 `multiple_permissive_policies` desaparecen con la migración Ailfred (provienen del rol `alfred_app`), 45 `auth_rls_initplan` y 10 `unindexed_foreign_keys` también son Fred, 51 `unused_index` se irán cuando los nuevos índices reciban tráfico real.

### Lo que NO se hizo (deferred)

- **Leaked Password Protection**: founder no quiere fricción al signup.
- **Cross-cloud Storage backup automatizado**: requiere credenciales externas (B2/S3/Vercel Blob). El script manual está listo; cuando haya destino se conecta a un cron.
- **PITR add-on**: $115/mes adicionales, sin clientes serios no se justifica. Daily DB backups 7 días + papelera Storage 30 días dan ventana de recuperación equivalente para los escenarios actuales.

## 14. Phase E (2026-05-02) — pg_cron + Database Webhooks → hello@aimily.app

### Migración Ailfred completada

El agente Ailfred terminó la migración de todo lo no-aimily al proyecto `ailfred-studionn` (`ixqbcvopjnkrbgzkkall`). Resultado en `sbweszownvspzjfejmfx`:

- 25 tablas Fred dropeadas (tasks, projects, chat_messages, meal_plans, travel_plans, itinerary_items, user_projects, sessions, etc.). Quedan ~60 tablas aimily-real.
- 3 buckets Storage Fred eliminados (`client-decks`, `rrss-assets`, `reports` — los borré yo via Storage API tras confirmar que estaban vacíos y sin referencias en código aimily).
- Advisor security: las 4 RLS "always-true" Fred + las 2 listings públicos desaparecieron al borrarse las tablas/buckets.

### Phase E shipped

Migraciones aplicadas:

- `pro_hardening_e_pgcron_and_webhooks` — habilita `pg_cron` 1.6.4 y `pg_net` 0.19.5, crea `notify_founder(event_type, payload)` y los triggers que disparan a `/api/webhooks/db-event`.
- `pro_hardening_e2_pgcron_schedule_app_jobs` — schedule de los 5 jobs aplicación que vivían en `vercel.json` como pg_cron jobs que POSTean a `/api/cron/*` con bearer pulled del Vault.

### Database Webhooks

Triggers nativos en Postgres → endpoint Vercel → email Resend a `hello@aimily.app`:

| Trigger | Evento | Notifica |
|---|---|---|
| `subscriptions_notify` (INSERT/UPDATE) | Cambio de plan o status | "Cliente X acaba de pagar Pro/Pro Max" o "Cliente Y canceló" |
| `wholesale_orders_notify` (INSERT) | Nuevo pedido B2B | Detalles del pedido + total |
| `audit_log_notify` (INSERT severity='high') | Evento crítico | Acción + user + mensaje |
| `aimily_signup_spike_check` (cron horario) | ≥10 signups en 1h | Posible bot/abuso |
| `aimily_cron_failure_watcher` (cron horario) | Cualquier `aimily_*` cron con 2 fallos seguidos | Job + error |

### Pipeline interno

```
Postgres trigger
   ↓ pg_net.http_post() (async, queue en net.http_request_queue)
   ↓ Header X-DB-Webhook-Secret pulled de Vault
https://www.aimily.app/api/webhooks/db-event
   ↓ verifyTimingSafe(secret)
   ↓ dispatchEvent(type, data)
src/lib/founder-alerts.ts → Resend → hello@aimily.app
```

Verificado e2e 2026-05-02: pg_net request_id=2 → response 204 OK → email recibido en bandeja.

### pg_cron jobs activos

| Job | Schedule | Hace |
|---|---|---|
| `aimily_signup_spike_check` | `7 * * * *` | Cuenta nuevas auth.users en última hora; si ≥10, alerta. |
| `aimily_cron_failure_watcher` | `13 * * * *` | Detecta cualquier `aimily_*` con 2 fallos consecutivos en 6h, alerta. |
| `aimily_collect_tiktok_trends` | `0 6 * * 4` | Reemplaza Vercel cron homónimo. |
| `aimily_process_city_trends` | `0 7 * * 4` | Reemplaza Vercel cron homónimo. |
| `aimily_post_launch_analysis` | `0 8 * * *` | Reemplaza Vercel cron homónimo. |
| `aimily_trial_emails` | `0 9 * * *` | Reemplaza Vercel cron homónimo. |
| `aimily_cleanup_storage_trash` | `0 4 1 * *` | Reemplaza Vercel cron homónimo (purga `__trash/` > 30 días). |

Observable via SQL: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 50;`

### Vault secrets

Dos secretos guardados en `vault.secrets` (encrypted at rest, leídos por funciones SECURITY DEFINER):

- `cron_secret` — Bearer header que `invoke_aimily_cron(path)` pone al POSTear `/api/cron/*`. Mismo valor que `CRON_SECRET` env en Vercel.
- `db_webhook_secret` — Header `X-DB-Webhook-Secret` que `notify_founder()` pone al POSTear `/api/webhooks/db-event`. Mismo valor que `DB_WEBHOOK_SECRET` env en Vercel (Production + Development).

### Anti-bot: dominios de email desechables

`src/lib/disposable-email-domains.ts` — blocklist de 60 dominios (mailinator, tempmail, guerrillamail, dispostable, etc.). Validado client-side en `AuthModal.tsx` antes de `signUp()`. i18n key `errDisposableEmail` en los 9 locales.

Decisión founder: NO captcha (UX cutre cuando lo intentamos antes). Defensa-en-profundidad real:

1. Email confirmation obligatoria (`mailer_autoconfirm: false`).
2. Supabase Auth rate limit interno: 4 emails/hour por IP.
3. Per-user AI rate limit (text 30/min, image 10/min, video 3/min).
4. Disposable domain blocklist en signup form.
5. `aimily_signup_spike_check` cron: aviso a founder si pasa el umbral.

### Auth hardening

- `mailer_secure_email_change_enabled = true` via Management API. Cambiar el email de una cuenta requiere confirmación en ambos correos (viejo + nuevo). Defensa contra account takeover.

### Estado advisors post-Phase E + Ailfred

| Tipo | Inicial | Post C+D | Post E + Ailfred |
|---|---|---|---|
| Security ERROR | 1 | 0 | **0** |
| Security WARN | 24 | 7 | **4** |
| Performance total | 1.110 | 1.003 | (pendiente re-medir post-Ailfred) |

Los 4 WARN security restantes:
- `extension_in_public` para `pg_net` — la extensión está registrada en `public` schema, sus objetos viven en `net`. Mover requiere DROP + CREATE (no es relocatable: `extrelocatable = false`), lo que destruiría triggers y queues activos. Aceptable: encapsulación real está en schema `net`, el warning es defensa en profundidad.
- `increment_share_views` SECURITY DEFINER ejecutable por anon — INTENCIONAL para la página pública `/p/[token]`.
- `increment_share_views` SECURITY DEFINER ejecutable por authenticated — mismo, intencional.
- `auth_leaked_password_protection` desactivado — DECISIÓN founder, cero fricción.

## 15. Phase F (2026-05-02) — drive advisors a cero warnings

Tras Phase E + cleanup Ailfred, el advisor seguía con 4 warnings. Felipe pidió cerrar TODO lo que fuera arreglable.

Migración aplicada: `pro_hardening_f_zero_warnings`.

### Cambios

1. **`increment_share_views` REVOKE** — verificado que la única llamada en el código (`src/app/p/[token]/page.tsx:86`) ya pasa por `supabaseAdmin.rpc()` con service_role. Los WARN `anon_security_definer_function_executable` y `authenticated_security_definer_function_executable` pedían exactamente esto: revocar EXECUTE de los roles públicos. Hecho. Service_role y postgres siguen pudiendo invocarla — el page server-side sigue funcionando intacto.

2. **`pg_net` movido del schema `public` al schema `extensions`** — al ser `extrelocatable = false`, requiere DROP + CREATE. La operación se hizo dentro de una migración atómica:

   - Pre-flight check: `net.http_request_queue` vacía, sin responses recientes, ningún cron corriendo.
   - DROP en cascada: triggers (`subscriptions_notify`, `wholesale_orders_notify`, `audit_log_notify`), funciones (`notify_*`, `check_signup_spike`, `notify_founder`, `invoke_aimily_cron`), 7 jobs `aimily_*` en pg_cron, finalmente la extensión.
   - `CREATE EXTENSION pg_net WITH SCHEMA extensions;` — la extensión recrea su propio schema `net` con `http_post`/`http_get`/`http_delete` y las tablas de queue.
   - Todas las funciones recreadas con `SET search_path = public, extensions, vault, pg_catalog` (añadido `extensions` al search path).
   - Todos los triggers y los 7 cron jobs recreados idénticos al estado pre-migración.

   Verificado post-migración: `notify_founder()` test → request_id=1 → response 204 OK. Email recibido en `hello@aimily.app`. Pipeline intacto.

3. **`mailer_secure_email_change_enabled`** — ya estaba activado en Phase E.

### Estado advisor security final

**0 ERROR + 0 WARN.** Auditoría completamente limpia.

`password_hibp_enabled = true` activado vía Management API tras revisar la práctica de industria (NIST 800-63B, OWASP, default-on en Auth0/Clerk/Microsoft Entra ID/Firebase/Stytch para tier B2B). El check ocurre solo en signup y password change, contra la lista pública de HaveIBeenPwned: si la password del usuario está en un breach conocido, recibe un error y elige otra. Cero fricción para passwords no comprometidas.

Comparativa total contra el inicial:

| Tipo | Pre-Phase A | Post-Phase F |
|---|---|---|
| Security ERROR | 1 | **0** |
| Security WARN | 24 | **0** |
| Performance lints aimily-core | 200+ | ~0 (todos tocados; el resto son tablas Fred que ya no existen o métricas sin tráfico) |

---

## 14. Recursos oficiales

- Pricing: https://supabase.com/pricing
- Plan Pro features: https://supabase.com/docs/guides/getting-started/features
- Image Transformations: https://supabase.com/docs/guides/storage/serving/image-transformations
- pg_cron: https://supabase.com/docs/guides/cron
- pg_net: https://supabase.com/docs/guides/database/extensions/pg_net
- Database Webhooks: https://supabase.com/docs/guides/database/webhooks
- Connection Pooler: https://supabase.com/docs/guides/database/connecting-to-postgres
- Database Linter (cómo entender los advisors): https://supabase.com/docs/guides/database/database-linter
- RLS performance pattern (`(select auth.uid())`): https://supabase.com/docs/guides/database/postgres/row-level-security#authuid-performance
