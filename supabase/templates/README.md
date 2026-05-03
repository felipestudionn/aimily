# Supabase Auth Email Templates

Editorial dark redesign of the auth-flow emails sent by Supabase. Same visual
language as `src/lib/transactional-emails.ts` (carbon background, crema text,
serif headlines, pill CTA, Felipe sign-off) so the user experience never
breaks the brand.

## What's here

| File | Supabase template | When it fires |
|------|------------------|---------------|
| `confirm-signup.html` | Confirm signup | First email after signup, before they hit `/welcome` |
| `recovery.html` | Reset password | When the user requests a password reset |
| `magic-link.html` | Magic link | Passwordless sign-in flow |
| `email-change.html` | Email change | When a user changes their account email |
| `reauthentication.html` | Reauthentication | Code-based confirmation for sensitive actions |
| `invite.html` | Invite user | Team/workspace invitations sent from `inviteUserByEmail` |

Each template uses the relevant Supabase variables (`{{ .ConfirmationURL }}`,
`{{ .Email }}`, `{{ .NewEmail }}`, `{{ .Token }}`) and shares the editorial
dark shell with the in-app transactional emails in `src/lib/transactional-emails.ts`.

## How to apply

### Via the dashboard (one-time, no automation)

1. Go to https://supabase.com/dashboard/project/sbweszownvspzjfejmfx/auth/templates
2. Pick the template (Confirm signup / Reset password)
3. Paste the file contents into the **Message body** field
4. Update the **Subject** field:
   - Confirm signup → `Confirm your aimily address`
   - Reset password → `Reset your aimily password`
5. Save. The change is live immediately.

### Via the script (preferred — versioned + reproducible)

```bash
# Requires SUPABASE_ACCESS_TOKEN in .env.local — a Personal Access Token
# from https://supabase.com/dashboard/account/tokens (NOT the anon/service key).
npx tsx scripts/update-supabase-auth-templates.ts
```

The script reads the HTML files in this directory and PATCHes the Auth config
on the production project. Idempotent — running it twice is harmless.

## Why we override

Supabase's default templates are functional but disconnected from the brand:
sans-serif on white, generic copy, no signoff. The first email a new user
ever receives from aimily is the signup confirmation — letting it look like
a SaaS template fights against everything we put into `/welcome` and the
trial funnel emails.

## Variables

| Variable | What Supabase substitutes |
|----------|---------------------------|
| `{{ .Email }}` | The user's email address |
| `{{ .ConfirmationURL }}` | Pre-signed URL with the action token |
| `{{ .Token }}` | Raw OTP / token (not used here, link-only flows) |
| `{{ .SiteURL }}` | The site URL configured in Auth settings |

## Optional: i18n via Send Email Hook

The static templates above ship in English only because the Supabase
dashboard doesn't support per-locale template selection. If you want the
trial-funnel quality of i18n on these too — recovery, magic link, email
change, reauth, invite all delivered in `user.user_metadata.language` —
flip the **Send Email Hook**:

1. **Generate a webhook secret**
   In Supabase Dashboard → Auth → Hooks → Send Email, click "Enable Send
   Email Hook" and pick **HTTP**. Copy the generated `v1,whsec_...` secret.

2. **Add it to Vercel + .env.local**
   ```
   SUPABASE_AUTH_HOOK_SECRET=v1,whsec_xxx...
   ```
   Make sure `RESEND_API_KEY` is also present.

3. **Set the hook URL**
   `https://www.aimily.app/api/auth-email-hook`

4. **Save**. Supabase now POSTs to our endpoint every time it would have
   sent an Auth email. We render the localized editorial email via
   `src/lib/auth-email-renderer.ts` (using `getEmailDict(locale)` from
   `src/lib/email-i18n.ts`) and ship through Resend. Same shell, same
   Felipe voice, locale picked from `user.user_metadata.language`.

If the env var is missing or the signature fails, the hook returns 500
and Supabase falls back to the static templates above (still editorial,
still EN). Either way the user gets an email.

**Confirm signup** is the one exception worth knowing: the user hasn't
picked a language yet at signup time, so even with the hook live, that
specific email lands in EN. Recovery, magic link, email change, reauth
and invite all respect the user's language because they fire AFTER
`/welcome` set `user_metadata.language`.
