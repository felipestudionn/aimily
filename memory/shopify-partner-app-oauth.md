---
name: Shopify Partner App OAuth · aimily In-Season setup canónico
description: Setup completo del Partner App "aimily In-Season" (StudioNN Agency · client_id 9428e755…) que permite que cualquier merchant Shopify instale aimily en su tienda. Documenta dónde vive cada cosa (Partner Dashboard URLs, Vercel envs, código), qué scopes pide, el flujo OAuth implementado y cómo replicar el setup desde cero.
type: reference
---

# Shopify Partner App OAuth · aimily In-Season

**Shipped 2026-05-20** vía Playwright desde aimily — todo el setup (creación de app + scopes + redirect URL + Protected Customer Data Access + envs + e2e test) se hizo en ~30 min sin que Felipe tocara la GUI de Shopify. Reproducible.

---

## Datos de la app en producción

| Campo | Valor |
|---|---|
| Partner organization | StudioNN Agency · org id `4373888` (legacy partners) / `173616624` (dev dashboard) |
| App name | `aimily In-Season` |
| App id | `366942912513` |
| Client ID (público) | `9428e755ff23ab69e2a55affc7182c8b` |
| Client secret | `shpss_…` — en `.env.local` + Vercel envs (no en repo, no en memory) |
| App URL | `https://www.aimily.app/in-season` |
| Redirect URL | `https://www.aimily.app/api/in-season/oauth/shopify/callback` |
| Embed app in Shopify admin | **OFF** (somos external, no embedded; merchant vuelve a aimily.app tras grant) |
| Use legacy install flow | **ON** (OAuth code grant tradicional — nuestro `/install` y `/callback` lo implementan) |
| Active version | `aimily-in-season-3` |
| Webhooks API version | `2026-04` |

### Dashboards relevantes

- App overview (legacy): https://partners.shopify.com/4373888/apps/366942912513
- API access requests + Protected Customer Data: https://partners.shopify.com/4373888/apps/366942912513/api_access
- Versions list (Dev Dashboard): https://dev.shopify.com/dashboard/173616624/apps/366942912513/versions
- Credentials (Dev Dashboard): https://dev.shopify.com/dashboard/173616624/apps/366942912513/settings

---

## Scopes solicitados (9 read scopes)

Vienen del array `SHOPIFY_OAUTH_SCOPES` en `src/lib/shopify/oauth-state.ts` — fuente única de verdad, debe espejar el `Scopes` field de la app version en Dev Dashboard.

```ts
'read_products',
'read_orders',
'read_returns',        // necesario porque el parser hace returns(first: 5) en cada order
'read_inventory',
'read_locations',
'read_customers',
'read_price_rules',
'read_discounts',
'read_publications',
```

NO se pide `read_all_orders` (acceso a >60 días) — eso es restricted scope que requiere App Store review. MVP funciona con 60 días.

### Protected Customer Data Access

Para acceder al objeto `Order` Shopify exige aprobar Protected Customer Data Access en Partner Dashboard → API access requests → "Request access" → seleccionar reasons en Step 1:

- ✅ Store management
- ✅ App functionality
- ✅ Analytics
- ❌ Customer service / Personalization / Marketing or advertising — no aplican

Para dev stores no hace falta submit para review; al guardar reasons ya se desbloquea el acceso.

Si en algún momento queremos los fields específicos del customer (Name, Email, Phone, Address) dentro del Order, tocar la sección "Protected customer fields (optional)" en la misma página. Por ahora el parser solo lee orderId + lineItems + totalPrice + returns, así que basta con el toggle base.

---

## Env vars (Vercel + .env.local)

3 vars × 3 targets (production + preview + development) = 9 entradas en Vercel envs:

| Var | Propósito |
|---|---|
| `SHOPIFY_PARTNER_APP_CLIENT_ID` | Público, va en el authorize URL |
| `SHOPIFY_PARTNER_APP_CLIENT_SECRET` | Server-only, firma HMAC del callback + token exchange |
| `SHOPIFY_OAUTH_STATE_SECRET` | ≥32 chars · HMAC-firma del state token que viaja por OAuth (generar con `openssl rand -hex 32`) |

Si añades env nuevo, recuerda redeploy production para que lo recoja (`git commit --allow-empty -m "..." && git push` basta).

---

## Flujo OAuth (código en repo)

### 1. Install kickoff
`GET /api/in-season/oauth/shopify/install?shop=<shop>.myshopify.com&tenant_slug=<slug>`
[`src/app/api/in-season/oauth/shopify/install/route.ts`](../src/app/api/in-season/oauth/shopify/install/route.ts)
- Verifica que el shop matchea `*.myshopify.com` (strict regex)
- Verifica que el user tiene rol `admin` en ese tenant
- Mints state token HMAC-firmado con `SHOPIFY_OAUTH_STATE_SECRET` (TTL 10 min)
- 302 redirect a `https://{shop}/admin/oauth/authorize?client_id=…&scope=…&redirect_uri=…&state=…`

### 2. Callback
`GET /api/in-season/oauth/shopify/callback?code=…&shop=…&state=…&hmac=…`
[`src/app/api/in-season/oauth/shopify/callback/route.ts`](../src/app/api/in-season/oauth/shopify/callback/route.ts)
- Verifica `hmac` con `SHOPIFY_PARTNER_APP_CLIENT_SECRET` (sorted query string, sin hmac/signature, sha256 hex)
- Verifica state token + match shop in state == shop in callback
- Token exchange: POST `https://{shop}/admin/oauth/access_token` con `client_id + client_secret + code`
- Delete existing shopify connection para el tenant (uniqueness)
- Insert fresh connection con scopes granted
- Store token en Vault vía `tenant_sales_connections_store_token` RPC
- 302 a `/in-season/<slug>/connections?oauth_success=shopify&shop=…`

### 3. Helpers
[`src/lib/shopify/oauth-state.ts`](../src/lib/shopify/oauth-state.ts) — state signing + HMAC verify + shop domain regex + scope list.

### 4. UI
[`src/app/(app)/in-season/[tenantSlug]/connections/ConnectionsClient.tsx`](../src/app/(app)/in-season/[tenantSlug]/connections/ConnectionsClient.tsx) tiene dos cards:
- **"Conectar Shopify · Recomendado"** — botón OAuth (el camino normal)
- **"Pegar token manual"** — para Stripe Connect o Shopify Custom App single-shop

---

## Bugs cazados durante el primer E2E (commits `0842499` + `7bbee37`)

1. **Migration 069 regression**: cuando dropé la columna `access_token` plaintext, la RPC `tenant_sales_connections_store_token` aún tenía `SET access_token = ''` → migration 072 lo quita.
2. **supabase-js `.rpc()` no throw**: el callback tenía `try { await rpc(...) } catch` pero `.rpc()` devuelve `{ error }` en lugar de throw. Fix: chequear `.error` explícitamente.
3. **`read_returns` faltaba en scopes**: el parser shopify-graphql siempre lo usó pero los OAuth scopes no lo pedían → `Access denied for returns field`. Añadido al array.

Lección: el callback hace rollback completo (delete connection) en cualquier failure path posterior a la creación de la row, pero ese rollback solo funciona si detectamos el error. Patrón a replicar.

---

## Cómo replicar el setup desde cero

Si tuvieras que crear una segunda app (otro tenant Partner, otra brand) sigue exactamente este orden:

1. **Partner Dashboard → Apps → Create app** (en dev.shopify.com/dashboard). Nombre + manual mode (no CLI scaffold — la CLI genera un proyecto Remix completo que no nos sirve porque aimily ya existe).
2. **Versions → Create version** con:
   - App URL: `https://www.aimily.app/in-season`
   - Embed: OFF
   - Scopes (comma-separated): los 9 read scopes
   - Use legacy install flow: ON
   - Redirect URLs: `https://www.aimily.app/api/in-season/oauth/shopify/callback`
   - Release.
3. **Settings → Credentials** → copy Client ID + reveal Secret.
4. **Set 3 env vars** en Vercel (production + preview + development) y `.env.local`:
   ```
   SHOPIFY_PARTNER_APP_CLIENT_ID=<client_id>
   SHOPIFY_PARTNER_APP_CLIENT_SECRET=<secret>
   SHOPIFY_OAUTH_STATE_SECRET=<openssl rand -hex 32>
   ```
5. **API access requests → Protected customer data access → Request access** → seleccionar reasons (Store management + App functionality + Analytics) → Save.
6. **Empty commit + push** para forzar redeploy de Vercel que recoja los envs.
7. **Test E2E**: ir a `/in-season/<tenant>/connections` → click "Conectar Shopify" → typear `<shop>.myshopify.com` → aprobar scope screen → debería volver con banner verde + sync de 58 records en ~8s.

---

## Estado de la conexión activa post-test

```sql
SELECT shop_domain, array_length(scopes,1) AS n, last_sync_records_count, last_sync_error
FROM tenant_sales_connections WHERE provider='shopify';
-- aimily-mlyel0nm.myshopify.com | 9 | 58 | null
```

Token en Vault, no en DB plaintext. Próximo sync automático mañana a las 07:00 UTC vía cron `/api/cron/strategy/sales-sync`.
