# Stripe Customer Portal — branding setup

The Stripe-hosted Customer Portal is what users land on when they click
*Manage subscription* from `/account` or the trial-ending email. By default
it's stripe-grey. Take 10 minutes to brand it so the upgrade-flow stays
consistent with aimily.

These steps are done **once in the Stripe LIVE dashboard** — no code change.

## 1. Branding (account-wide)

→ Stripe Dashboard → **Settings** → **Branding**

| Field | Value |
|---|---|
| Public business name | aimily |
| Brand color | `#282A29` (carbon) |
| Accent color | `#FFF6DC` (crema) |
| Icon | upload `public/favicon.png` (1024×1024) |
| Logo | upload `public/aimily-logo-dark.png` |

This automatically applies to checkout, customer portal, invoice PDFs, and
Stripe-hosted receipts.

## 2. Customer Portal configuration

→ Stripe Dashboard → **Settings** → **Billing** → **Customer portal**
→ click **Edit**

### Functionality

| Toggle | Setting |
|---|---|
| Customers can update their payment method | ✅ ON |
| Customers can update billing information | ✅ ON |
| Customers can view their invoice history | ✅ ON |
| Customers can switch plans | ✅ ON |
| Customers can cancel subscriptions | ✅ ON, prorated at end of period |
| Show plan switcher | Limit to **Starter, Professional, Professional Max** (NOT Enterprise) |
| Cancellation reasons | Enable, with these options:<br/>- Too expensive<br/>- Missing a feature<br/>- Switched to another tool<br/>- Quality not as expected<br/>- Temporary pause<br/>- Other |
| Cancellation reason: free-text follow-up | ✅ ON |

### Headline + business info

| Field | Value |
|---|---|
| Headline | "Manage your aimily subscription" |
| Privacy policy URL | https://www.aimily.app/privacy |
| Terms of service URL | https://www.aimily.app/terms |

### Plans available in portal

Add the 6 self-serve subscription prices (NOT the credit-pack one-time prices,
those are handled outside the portal):

- `STRIPE_STARTER_MONTHLY_PRICE_ID`
- `STRIPE_STARTER_ANNUAL_PRICE_ID`
- `STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID`
- `STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID`
- `STRIPE_PRO_MAX_MONTHLY_PRICE_ID`
- `STRIPE_PRO_MAX_ANNUAL_PRICE_ID`

(Felipe: actual price IDs are in `.env.local` and Vercel production env.)

### Invoice + receipt branding

→ Stripe Dashboard → **Settings** → **Emails** → **Receipts**

- Send receipts on successful payments: ✅
- Send receipts on refunds: ✅
- Custom message: *"That's all. — aimily team"*

## 3. Payment method types

→ Stripe Dashboard → **Settings** → **Payment methods**

Verify these are enabled for LIVE:
- ✅ Cards (Visa, MC, Amex)
- ✅ Apple Pay
- ✅ Google Pay
- ✅ SEPA Direct Debit (EU)
- ✅ Bancontact (BE)
- ✅ iDEAL (NL)
- Optional: Klarna, Afterpay (consumer-only)

## 4. Verification

After saving:

1. Click **Preview portal** in Stripe dashboard.
2. Open as a real test session: from a logged-in aimily account, click
   *Manage subscription* in `/account` and confirm the page shows the new
   logo, colours, and plan list.
3. Test plan switch: Starter → Professional should prorate correctly.
4. Test cancellation: ensure feedback survey appears.

---

*Setup time: 10–15 minutes. No code change needed.*
