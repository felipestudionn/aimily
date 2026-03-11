# Email Templates Setup — Fase 3

## Step 1: Create Resend Account
1. Go to https://resend.com and create an account
2. Verify domain `aimily.app`:
   - Add DNS records (SPF, DKIM, DMARC) provided by Resend
   - Wait for verification (usually < 5 minutes)
3. Create an API key (Settings > API Keys)

## Step 2: Configure SMTP in Supabase
Dashboard > Authentication > SMTP Settings > Enable Custom SMTP

SMTP is already configured via Supabase Management API. See `.env.local` for credentials.

## Step 3: Paste Email Templates
Dashboard > Authentication > Email Templates

For each template, copy the HTML from this directory:

| Template | File | Subject line |
|---|---|---|
| Confirm signup | `signup-confirmation.html` | `Welcome to aimily — confirm your email` |
| Reset password | `password-reset.html` | `Reset your aimily password` |
| Magic link | `magic-link.html` | `Sign in to aimily` |
| Change email | `email-change.html` | `Confirm your new email address` |

## Step 4: URL Configuration
Dashboard > Authentication > URL Configuration

| Field | Value |
|---|---|
| Site URL | `https://www.aimily.app` |
| Redirect URLs | `https://www.aimily.app/**`, `http://localhost:3000/**` |

## Step 5: Test
1. Sign up with a new email
2. Check that the email arrives with aimily branding
3. Click the confirmation link — should redirect to `/my-collections`
4. Test password reset from `/auth/forgot-password`

## Design Specs
- Background: `#fff6dc` (crema)
- Text: `#282A29` (carbon)
- Button: `#282A29` bg, `#fff6dc` text
- Logo: `https://www.aimily.app/images/aimily-logo-black.png`
- Footer: "aimily is a product by StudioNN Agency S.L."
- Variable: `{{ .ConfirmationURL }}` for all action links
