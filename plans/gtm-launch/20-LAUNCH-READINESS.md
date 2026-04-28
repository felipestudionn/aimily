# Launch readiness — what Felipe needs to do (manual steps)

Built in code: ✅ Sentry, rate-limit, welcome email, OG tags, trial-ending
cron, i18n pricing (9 langs), PostHog, smoke test, Aimily Credits.

These remaining items need accounts created or env vars set. **15 minutes
total.**

## 1. Sentry (5 min)

Create the Sentry project and copy the DSN.

1. Sign up at https://sentry.io (free tier covers up to 5k errors/month).
2. Create project: **Platform: Next.js** → name `aimily`.
3. Copy the DSN from project settings.
4. Add to Vercel production:
   ```bash
   echo 'https://xxx@xxx.ingest.sentry.io/xxx' | vercel env add NEXT_PUBLIC_SENTRY_DSN production
   echo 'https://xxx@xxx.ingest.sentry.io/xxx' | vercel env add SENTRY_DSN production
   echo '<your-org-slug>'                       | vercel env add SENTRY_ORG production
   echo 'aimily'                                | vercel env add SENTRY_PROJECT production
   ```
5. Optional: create a `SENTRY_AUTH_TOKEN` for source-map uploads (Sentry → Settings → Auth Tokens). Add as `SENTRY_AUTH_TOKEN` to Vercel.

## 2. PostHog (5 min)

Create the PostHog project and copy the key.

1. Sign up at https://eu.posthog.com (EU region — GDPR aligned).
2. Create project: **aimily** → **Browser & Mobile**.
3. Copy the project API key (`phc_xxx`).
4. Add to Vercel:
   ```bash
   echo 'phc_xxx'                               | vercel env add NEXT_PUBLIC_POSTHOG_KEY production
   echo 'https://eu.i.posthog.com'              | vercel env add NEXT_PUBLIC_POSTHOG_HOST production
   ```
5. In PostHog UI, create a funnel:
   - `landing_viewed` → `cta_clicked` → `auth_opened` → `signup_completed` → `collection_created` → `ai_generation_succeeded` → `subscription_activated`

## 3. Cron secret (1 min)

The trial-emails cron at `/api/cron/trial-emails` rejects calls without the
`CRON_SECRET` bearer. Vercel sets this automatically when you have crons in
`vercel.json` — verify it exists:

```bash
vercel env ls production | grep CRON_SECRET
```

If missing, generate one:
```bash
echo $(openssl rand -hex 32) | vercel env add CRON_SECRET production
```

## 4. Resend domain verified (already done)

`hello@aimily.app` is already verified in Resend (Google Workspace setup
confirmed). The welcome and trial-ending emails will fire as soon as
`RESEND_API_KEY` is set in Vercel — verify:

```bash
vercel env ls production | grep RESEND
```

## 5. Stripe Customer Portal branding (10 min)

See `plans/gtm-launch/19-STRIPE-PORTAL-BRANDING.md` — visual config in the
Stripe dashboard. Copy/paste from that doc.

## 6. Run the smoke test against production (1 min)

After the deploy lands:

```bash
npx tsx scripts/smoke-test.ts https://www.aimily.app
```

You should see `7/7 passed`. If anything fails, the test prints the failing
check + status code.

## 7. Final pre-launch checklist

| Item | How to verify |
|---|---|
| Sentry receiving events | Trigger a 5xx (e.g. `curl https://www.aimily.app/api/ai/freepik/editorial -X POST -d '{}'`) → check Sentry dashboard |
| PostHog receiving events | Visit `/meet-aimily` from incognito → check PostHog Live Events |
| Welcome email lands | Sign up with a real address → check inbox (also check spam) |
| Stripe checkout → webhook → DB | Buy a Starter plan with a real card → verify `subscriptions.plan = 'starter'` in Supabase |
| Aimily Credits checkout → balance updated | Buy +50 pack → verify `imagery_credits.balance = 50` in Supabase |
| Pricing page in 9 languages | Use `?lang=es`, `?lang=de`, etc. → verify all strings render |
| Mobile responsive | Test `/meet-aimily` and `/pricing` on real iPhone Safari |

---

## What's still pending (post-launch acceptable)

- Multi-brand UI (BD ya soporta, falta selector + CRUD page)
- Bulk PDF export (Pro Max diferenciador)
- Custom brand model fine-tuning (Enterprise diferenciador)
- API access (Enterprise) — when first Enterprise customer asks
- SSO (Enterprise) — when first Enterprise customer asks

---

## Day-of (1 May) operations

- **Monitor**: Sentry dashboard open, PostHog Live Events open.
- **Stripe dashboard**: enable email notifications for new payments.
- **Supabase logs**: open `/logs/postgres` and `/logs/auth` in another tab.
- **Vercel deployments**: don't deploy anything risky day-of unless emergency.
- **Email inbox**: hello@ + felipe@ — replies go straight to you.

*That's all.*
