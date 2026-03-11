# aimily — Enterprise Ready Plan

Plan de implementacion para dejar aimily listo para produccion profesional.
Ejecutar fase por fase, en orden.

---

## FASE 0: Limpieza — Renombrar a aimily + auditar tablas
> Eliminar toda referencia legacy a "OlaWave" y dejar el proyecto limpio.

### 0.1 Renombrar referencias "OlaWave" en codigo
- [x] `localStorage` keys: ya no existen refs a olawave en src/
- [x] Phase ID en timeline: ya renombrado a `"aimily"` en timeline-template.ts
- [x] Milestone IDs: `ow-1`..`ow-5` se mantienen (renombrarlos romperia timelines existentes en Supabase)

### 0.2 Limpiar documentacion legacy
- [x] Eliminados: `MASTER_PLAN.md`, `ANALYSIS_COMPLETE.md`, `DEPLOYMENT_GUIDE.md`, `IMPLEMENTATION_SUMMARY.md`, `REDESIGN_PROPOSAL.md`, `NAVIGATION_AUDIT.md`
- [x] Actualizado `ALFRED.md` — todas las refs cambiadas a aimily
- [x] Actualizado `PINTEREST_SETUP.md` — URLs cambiadas a aimily.app
- [x] Eliminado `netlify.toml`

### 0.3 Auditar tablas de Supabase
Las 26 tablas referenciadas en codigo son:

| # | Tabla | Migracion | RLS | Estado |
|---|-------|-----------|-----|--------|
| 1 | `collection_plans` | 004 (parcial) | Si | Falta migracion base |
| 2 | `collection_timelines` | (ninguna) | ? | Falta migracion base |
| 3 | `collection_skus` | 002 | Si | OK |
| 4 | `drops` | 003 | ? | Verificar RLS |
| 5 | `commercial_actions` | 003 | ? | Verificar RLS |
| 6 | `market_predictions` | 003 | ? | Verificar RLS |
| 7 | `subscriptions` | 005 | Si | OK |
| 8 | `ai_usage` | 005 | Si | OK |
| 9 | `ai_generations` | (ninguna) | ? | Crear migracion |
| 10 | `brand_models` | (ninguna) | ? | Crear migracion |
| 11 | `brand_profiles` | (ninguna) | ? | Crear migracion |
| 12 | `city_trends_processed` | (ninguna) | ? | Verificar |
| 13 | `city_trends_raw` | (ninguna) | ? | Verificar |
| 14 | `content_calendar` | (ninguna) | ? | Crear migracion |
| 15 | `lookbook_pages` | (ninguna) | ? | Crear migracion |
| 16 | `pr_contacts` | (ninguna) | ? | Crear migracion |
| 17 | `product_copy` | (ninguna) | ? | Crear migracion |
| 18 | `production_orders` | (ninguna) | ? | Crear migracion |
| 19 | `raw_content` | (ninguna) | ? | Crear migracion |
| 20 | `reports` | (ninguna) | ? | Crear migracion |
| 21 | `sample_reviews` | (ninguna) | ? | Crear migracion |
| 22 | `signals` | (ninguna) | ? | Verificar |
| 23 | `sku_colorways` | (ninguna) | ? | Crear migracion |
| 24 | `standalone_timelines` | (ninguna) | ? | Crear migracion |
| 25 | `tech_packs` | (ninguna) | ? | Crear migracion |
| 26 | `tiktok_hashtag_trends` | (ninguna) | ? | Verificar |

**Acciones:**
- [x] Obtener schema actual de Supabase — encontradas 49 tablas (26 aimily + 23 otro proyecto)
- [x] Crear migracion `006_schema_audit_rls.sql` — aplicada exitosamente
- [x] Corregidas 13 tablas con policies inseguras (`true` o solo `authenticated`)
- [x] Activado RLS en `raw_content`, `reports`, `signals`
- [x] Todas las tablas aimily ahora verifican `user_id` via `collection_plan_id`
- [x] Service role access añadido para que API routes sigan funcionando

---

## FASE 1: Auth SSR + Middleware (seguridad base)
> Migrar de auth client-only a server-side auth con @supabase/ssr

### 1.1 Instalar dependencias
- [x] `npm install @supabase/ssr`

### 1.2 Crear clientes Supabase SSR
- [x] `src/lib/supabase/client.ts` — createBrowserClient (reemplaza `src/lib/supabase.ts`)
- [x] `src/lib/supabase/server.ts` — createServerClient (para Server Components + API routes)
- [x] Mantener `src/lib/supabase-admin.ts` — service role (sin cambios)

### 1.3 Crear middleware.ts
- [x] `src/middleware.ts` — Refresh de tokens en cada request
- [x] Usar `supabase.auth.getUser()` (NO `getSession()`)
- [x] Configurar `matcher` para excluir assets estaticos, `_next`, API webhooks
- [x] Proteger rutas autenticadas: redirigir a `/` si no hay sesion
- [x] Permitir rutas publicas: `/`, `/discover`, `/contact`, `/pricing`, `/terms`, `/privacy`, `/cookies`

### 1.4 Actualizar AuthContext
- [x] Migrar a `createBrowserClient` de `@supabase/ssr`
- [x] Usar cookies para sesion (no solo memoria)
- [x] Anadir `resetPassword(email)` al context
- [x] Anadir `updatePassword(newPassword)` al context

### 1.5 Migrar API routes
- [x] Actualizar 4 billing API routes (subscription, checkout, portal, usage) a `createServerClient`
- [x] `/api/webhooks/stripe` y `/api/cron/*` excluidos del middleware
- [x] SubscriptionContext migrado: ya no envia Authorization headers (usa cookies)

---

## FASE 2: Flujos de Auth completos
> Password reset, email confirmation, auth callback

### 2.1 Auth callback route (PKCE)
- [x] `src/app/auth/callback/route.ts` — Intercambia code por sesion
- [x] Maneja: signup confirmation, password reset, OAuth callback, magic link
- [x] Redirige segun `type` param: signup → `/my-collections`, recovery → `/auth/reset-password`

### 2.2 Password Reset
- [x] `src/app/auth/forgot-password/page.tsx` — Formulario "introduce tu email"
- [x] `src/app/auth/reset-password/page.tsx` — Formulario "nueva contrasena"
- [x] Anadir link "Forgot password?" en AuthModal
- [x] Flow: email → click link → callback route → reset-password page → updateUser()

### 2.3 Email Confirmation
- [x] `src/app/auth/confirm/page.tsx` — Pagina "verificando tu email..."
- [ ] Activar "Confirm email" en Supabase Dashboard
- [x] Actualizar AuthModal signup flow: mostrar "Revisa tu email" despues de registrarse
- [x] Manejar reenvio de email de confirmacion

### 2.4 Actualizar AuthModal
- [x] Anadir link "Forgot password?" que abre `/auth/forgot-password`
- [x] Mostrar mensaje post-signup: "Check your email to confirm your account"
- [x] Mejorar mensajes de error (email ya existe, password debil, etc.)
- [x] Validacion de password: minimo 8 chars, al menos 1 numero

---

## FASE 3: SMTP + Email Templates
> Emails profesionales con branding aimily

### 3.1 Configurar Resend (SMTP)
- [x] Crear cuenta en resend.com
- [x] Verificar dominio `aimily.app` (DNS: SPF, DKIM, DMARC) — IONOS, verified
- [x] Obtener SMTP credentials — API key creada
- [x] Configurar en Supabase via Management API:
  - Host: `smtp.resend.com`
  - Port: `465` (SSL)
  - Username: `resend`
  - Password: API key de Resend
  - Sender: `aimily <noreply@aimily.app>`

### 3.2 Personalizar Email Templates
Templates HTML creados en `supabase/email-templates/` — pegar en Supabase Dashboard > Authentication > Email Templates:

- [x] **Signup Confirmation** — `signup-confirmation.html` — Subject: "Welcome to aimily — confirm your email"
- [x] **Password Reset** — `password-reset.html` — Subject: "Reset your aimily password"
- [x] **Magic Link** — `magic-link.html` — Subject: "Sign in to aimily"
- [x] **Email Change** — `email-change.html` — Subject: "Confirm your new email address"

Cada template incluye:
- [x] Logo aimily (hosted en aimily.app/images/aimily-logo-black.png)
- [x] Colores de marca: fondo `#fff6dc`, texto `#282A29`, botones `#282A29`
- [x] Footer: "aimily is a product by StudioNN Agency S.L."
- [x] Usa `{{ .ConfirmationURL }}` para los links
- [x] Guia de setup: `supabase/email-templates/SETUP.md`

### 3.3 Actualizar Supabase URL Configuration
En Supabase Dashboard > Authentication > URL Configuration:
- [x] Site URL: `https://www.aimily.app`
- [x] Redirect URLs: `https://www.aimily.app/**`, `http://localhost:3000/**`

---

## FASE 4: Google Sign-In
> Reducir friccion de registro con OAuth

### 4.1 Google Cloud Console
- [x] Crear proyecto en Google Cloud Console (proyecto Gemini API 936283260324)
- [x] Configurar OAuth Consent Screen (app: aimily, externo)
- [x] Crear OAuth Client ID (Web application): `aimily web`
  - JS origins: `https://www.aimily.app`, `http://localhost:3000`
  - Redirect URI: `https://sbweszownvspzjfejmfx.supabase.co/auth/v1/callback`
  - Client ID: `936283260324-ou20mchmn6j7oq54i1f7j1t4tmo4rfop.apps.googleusercontent.com`

### 4.2 Configurar en Supabase
- [x] Google provider activado via Management API
- [x] Client ID + Client Secret configurados

### 4.3 Implementar en UI
- [x] Boton "Continue with Google" en AuthModal
- [x] `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`
- [x] Asegurar que callback route maneja OAuth

---

## FASE 5: Cuenta de usuario + GDPR
> Pagina de perfil, gestion de cuenta, cumplimiento legal

### 5.1 Pagina de Account/Profile
- [x] `src/app/account/page.tsx` — Pagina de cuenta del usuario
- [x] Mostrar: email, plan actual, uso de AI, fecha de registro, auth method
- [x] Boton "Change password" → `supabase.auth.updateUser({ password })` (solo email users)
- [x] Boton "Manage subscription" → Stripe Portal
- [x] Link a cuenta desde navbar (avatar clickable → /account)
- [x] Link "Account" en menu movil

### 5.2 Borrado de cuenta (GDPR Right to Erasure)
- [x] `src/app/api/account/delete/route.ts` — API para borrar cuenta
- [x] Flow: Cancel Stripe sub → Delete Stripe customer → Delete all user data → Delete auth user
- [x] Boton "Delete my account" en pagina de cuenta (triple confirmacion)

### 5.3 Exportar datos (GDPR Right of Access)
- [x] `src/app/api/account/export/route.ts` — Exportar datos del usuario en JSON
- [x] Incluir: colecciones, SKUs, timelines, subscriptions, AI usage, todo

### 5.4 Actualizaciones legales
- [x] Actualizar `/privacy` — sub-processors (Supabase, Stripe, Google, Anthropic, Resend, Vercel), GDPR rights, data controller
- [x] Actualizar `/terms` — suscripcion/pricing, cancelacion, account deletion
- [x] Cookie consent banner (implementado en Fase 6)

---

## FASE 6: Seguridad + Hardening
> Rate limiting, CAPTCHA, seguridad avanzada

### 6.1 CAPTCHA — Cloudflare Turnstile
- [x] Integrar `@marsidev/react-turnstile` en AuthModal (signup + signin)
- [x] Integrar en forgot-password page
- [x] AuthContext actualizado: `signUp`, `signIn`, `resetPassword` aceptan `captchaToken`
- [x] Widget solo aparece si `NEXT_PUBLIC_TURNSTILE_SITE_KEY` esta configurado (graceful fallback)
- [ ] **MANUAL**: Crear sitio en Cloudflare Turnstile (https://dash.cloudflare.com → Turnstile)
- [ ] **MANUAL**: Activar captcha en Supabase Dashboard > Authentication > Bot Detection (provider: Turnstile, pegar secret key)
- [ ] **MANUAL**: Anadir env vars a Vercel: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

### 6.2 Rate Limits
- [x] Revisados rate limits via Management API — valores por defecto OK para SaaS:
  - Email sent: 30/hour, OTP: 30/hour, Token refresh: 150/hour, Verify: 30/hour

### 6.3 Security Hardening
- [x] Ejecutado Security Advisor — todos los issues corregidos
- [x] RLS activado en TODAS las 22 tablas restantes sin RLS (migracion `security_hardening_rls_and_functions`)
- [x] Policies `service_role_full_access` añadidas para que backend siga funcionando
- [x] 3 funciones con `search_path` mutable corregidas (`update_drops_updated_at`, `update_updated_at_column`, `prune_bot_memory`)
- [x] `password_min_length` subido a 8 (server-side, coincide con frontend)
- [x] `password_required_characters` configurado: letras + digitos obligatorios
- [x] `security_update_password_require_reauthentication` activado
- [x] `mailer_notifications_password_changed_enabled` activado
- [ ] `password_hibp_enabled` — requiere Supabase Pro plan (pendiente cuando se upgrade)
- [ ] **MANUAL**: Activar MFA en cuenta de Supabase organization

### 6.4 Cookie Consent + Monitoreo
- [x] Cookie consent banner creado (`src/components/CookieConsent.tsx`)
- [x] Integrado en layout global — aparece 1 vez, respeta la eleccion del usuario via localStorage
- [x] Enlace a `/cookies` policy, botones Accept/Decline, estilo editorial dark
- [ ] **MANUAL**: Configurar alertas de Stripe (Dashboard > Settings > Alerts: pagos fallidos, disputas)
- [ ] **MANUAL**: Activar Vercel Analytics (Dashboard > Analytics > Enable)

---

## FASE 7: Deploy + Env Vars en Vercel
> Desplegar todo a produccion

### 7.1 Variables de entorno en Vercel
Auditadas contra el codigo fuente — 21 env vars requeridas:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Stripe (test por ahora, live cuando Stripe este verificado)
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_STARTER_MONTHLY_PRICE_ID
STRIPE_STARTER_ANNUAL_PRICE_ID
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID
STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID

# Cloudflare Turnstile (CAPTCHA)
NEXT_PUBLIC_TURNSTILE_SITE_KEY

# AI APIs
GEMINI_API_KEY
GEMINI_MODEL (opcional, default en codigo)
ANTHROPIC_API_KEY
OPENAI_API_KEY
FAL_KEY

# Pinterest
NEXT_PUBLIC_PINTEREST_CLIENT_ID
PINTEREST_CLIENT_SECRET
NEXT_PUBLIC_PINTEREST_REDIRECT_URI (actualizar a aimily.app)

# Apify
APIFY_API_TOKEN

# Cron
CRON_SECRET
```

### 7.2 Env vars auditadas
- [x] Comparadas env vars del codigo (23) vs `.env.local` (24) — todas presentes
- [x] Corregidos price IDs en plan: `STRIPE_STARTER_*` y `STRIPE_PROFESSIONAL_*` (no Pro/Business/Enterprise)
- [x] Eliminado `HUGGING_FACE_ACCESS_TOKEN` del plan (no se usa en codigo)
- [x] Añadido `GEMINI_MODEL` al plan (usado en 7+ API routes)
- [ ] **MANUAL**: Subir env vars a Vercel Dashboard > Settings > Environment Variables
- [ ] **MANUAL**: Verificar que `NEXT_PUBLIC_PINTEREST_REDIRECT_URI` apunta a `aimily.app` (no localhost)

### 7.3 Verificar deploy
- [ ] Push a main y verificar build exitoso en Vercel
- [ ] Auth funciona: signup, signin, signout, password reset
- [ ] Stripe checkout funciona en test mode
- [ ] Webhook recibe eventos correctamente
- [ ] Emails llegan via Resend SMTP
- [ ] Google Sign-In funciona

---

## Resumen de prioridades

| Fase | Que | Impacto | Esfuerzo |
|------|-----|---------|----------|
| 0 | Limpieza + renombrar | Base limpia | Bajo |
| 1 | Auth SSR + Middleware | Seguridad critica | Medio |
| 2 | Password reset + email confirm | Funcionalidad basica | Medio |
| 3 | SMTP + Email templates | Emails llegan a usuarios | Bajo (config) |
| 4 | Google Sign-In | Reducir friccion 50%+ | Bajo |
| 5 | Cuenta + GDPR | Compliance legal EU | Medio |
| 6 | Seguridad + CAPTCHA | Proteccion abuse | Bajo |
| 7 | Deploy final | Todo en produccion | Bajo |

---

*Creado: 2026-03-11*
*Proyecto: aimily by StudioNN Agency S.L.*
