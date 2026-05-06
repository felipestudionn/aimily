# Credentials & Access — Reference Guide

**IMPORTANTE**: Todas las claves y tokens viven en `.env.local` del proyecto (NO se sube a git).
Para acceder a cualquier valor: `grep <VAR_NAME> .env.local`

## Supabase
- **Project ID**: `sbweszownvspzjfejmfx`
- **Project URL**: `https://sbweszownvspzjfejmfx.supabase.co`
- **Management API Token**: `.env.local` → `SUPABASE_MANAGEMENT_TOKEN`
- **API Base**: `https://api.supabase.com/v1`
- **Keys**: `.env.local` → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## Stripe (LIVE MODE — activated 2026-04-28)
- **Account**: `acct_1T9iqNQqcqw6tCU6` (StudioNN Agency S.L., ES, charges + payouts enabled)
- **Keys**: `.env.local` → `STRIPE_SECRET_KEY` (sk_live_...), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_live_...), `STRIPE_WEBHOOK_SECRET`
- **Price IDs (LIVE, set 2026-04-28)**:
  - Starter monthly €199: `price_1TRA8pQqcqw6tCU6tjljdtMF`
  - Starter annual €1908 (€159/mo): `price_1TRA8pQqcqw6tCU6eXhl0eSD`
  - Professional monthly €599: `price_1TRA8qQqcqw6tCU67911CwcE`
  - Professional annual €5748 (€479/mo): `price_1TRA8qQqcqw6tCU6tznebDLY`
- **Webhook URL**: `https://www.aimily.app/api/webhooks/stripe`
- **Webhook ID (LIVE)**: `we_1TRA8qQqcqw6tCU6WPkkXDDh`
- **Products (LIVE)**: Starter `prod_UQ09R4OSvQTdX3`, Professional `prod_UQ09QPoxGl1UDg`
- **Vercel production env**: synced 2026-04-28 (vercel env CLI). Re-deploy auto on next push.
- **Setup script**: `scripts/setup-stripe-live.ts` — DO NOT re-run, creates duplicate products.
- Old TEST products archived: `prod_U81vNsecStddmo` (Starter), `prod_U81vq1vfjKzrqA` (Professional)

## Resend (Email/SMTP)
- **Domain**: `aimily.app` (verified via IONOS DNS — SPF, DKIM, DMARC)
- **API Key**: `.env.local` → `RESEND_API_KEY`
- **SMTP**: configured in Supabase via Management API
- **Sender**: `aimily <noreply@aimily.app>`

## Google OAuth
- **Cloud Project**: Gemini API (ID: `936283260324`)
- **OAuth Client**: `aimily web`
- **Client ID**: `.env.local` → `GOOGLE_OAUTH_CLIENT_ID`
- **Client Secret**: configurado en Supabase + Google Cloud Console
- **JS Origins**: `https://www.aimily.app`, `http://localhost:3000`
- **Redirect URI**: `https://sbweszownvspzjfejmfx.supabase.co/auth/v1/callback`

## Cloudflare Turnstile (CAPTCHA) — DESACTIVADO
- **Status**: DESACTIVADO — eliminado del código y de Supabase Bot Detection (2026-03-11)
- Widget causaba problemas de carga, bloqueaba botones de login/signup/reset
- Keys siguen en `.env.local` pero no se usan

## AI APIs (todas en `.env.local`)
- `GEMINI_API_KEY` — Google AI Studio
- `GEMINI_MODEL` — modelo configurado
- `ANTHROPIC_API_KEY` — Anthropic Console
- `OPENAI_API_KEY` — OpenAI Platform
- `FAL_KEY` — Fal.ai Dashboard

## Pinterest API
- **Client ID**: `.env.local` → `NEXT_PUBLIC_PINTEREST_CLIENT_ID` (value: `1537827`)
- **Client Secret**: `.env.local` → `PINTEREST_CLIENT_SECRET`
- **Redirect URI (Production)**: `https://aimily.app/api/auth/pinterest/callback`
- **Redirect URI (Dev)**: `http://localhost:3000/api/auth/pinterest/callback`
- **Pinterest Developer App**: https://developers.pinterest.com/apps/ — updated 2026-03-11 (was olawave.ai)
- **Vercel env var**: `NEXT_PUBLIC_PINTEREST_REDIRECT_URI` — set per environment (production/preview/development)

## Otros (en `.env.local`)
- `APIFY_API_TOKEN` — Apify (web scraping para trends)
- `CRON_SECRET` — protege cron endpoints

## Vercel
- **Project**: `felipes-projects-ab46a8c8/aimily`
- **CLI**: `vercel` (autenticado)
- **Domain**: `www.aimily.app` + `aimily.app`
- **Comandos útiles**: `vercel env ls`, `vercel env add`, `vercel env pull`
- **Todas las env vars subidas** (ver [vercel-env-vars.md](vercel-env-vars.md))

## DNS (IONOS)
- **Domain**: `aimily.app`, Registrar: IONOS
- **API**: `https://api.hosting.ionos.com/dns/v1/`
- **API Key**: `.env.local` → `IONOS_DNS_API_KEY`
- **Zone ID**: `.env.local` → `IONOS_ZONE_ID_AIMILY`
- **Records configurados**:
  - A `aimily.app` → `76.76.21.21` (Vercel)
  - CNAME `www.aimily.app` → `cname.vercel-dns.com` (Vercel)
  - CNAME `_domainconnect` → `cname.vercel-dns.com`
  - TXT SPF, DKIM (resend + ionos), DMARC configurados

## Company
- **Legal**: StudioNN Agency S.L.
- **NIF**: B42978130, **VAT**: ESB42978130
- **Address**: Avinguda Del Doctor Gadea 1, 10E, 03003 Alicante, Spain
- **Phone**: +34 646 90 74 70
- **Email**: studionn.agency@gmail.com
