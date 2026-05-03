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

Both templates use Supabase's `{{ .ConfirmationURL }}` and `{{ .Email }}`
variables and follow the same structure as the in-app transactional emails.

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

## Future templates to override

- **Magic link** — when we add passwordless login
- **Email change** — when a user changes their address
- **Reauthentication** — for sensitive operations
- **Invite** — if we ship team invites by email

Same shell, same Felipe voice. Reuse the existing files as a starting point.
