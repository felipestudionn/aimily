# aimily — Full Project Documentation

> **Last updated**: 2026-05-06 — Ecom Block (sections 22+24) + SEO Research module (section 23) + pricing v5 rebrand (section 9) + Vercel Pro + Cloudflare aimily.shop (sections 4.6/4.7) + middleware multi-tenant rewrite + 12 themes editorial complete + per-subdomain SSL via Vercel API. **Marketing copy "Web · DTC + integración" + "SEO · research · on-page" en PoweredBy.tsx ahora 100% honesto.**
>
> **This is the master reference (the Bible)** for ALL infrastructure, frontend, backend, usability, consumer journey, and implementation details. Read this first before touching anything.
>
> **Living docs that pair with this Bible**:
> - `architecture-ecom.md` — DTC storefront generator (zoom into section 22)
> - `architecture-presentation.md` — Presentation deck module (21 slides × 10 themes)
> - `architecture-tree-rubik-cube.md` — Block × Mini-block × Micro-block tree across Work/Calendar/Presentation modes
> - `architecture-block-3.md` — Design & Development block deep map
> - `design-components-canonical.md` — MANDATORY component inventory (no inventing)
> - `changelog.md` — Running log of UI changes per session
> - `credentials.md` + `credentials_cloudflare-aimily-shop.md` — service credentials

---

## 1. PROJECT OVERVIEW

**aimily** is an AI-native fashion collection management platform for planning, designing, and launching clothing/footwear collections. It guides teams through the entire collection lifecycle — from creative vision to market launch — using a 4-block workflow with AI assistance at every step.

- **URL**: https://www.aimily.app (also https://aimily.app)
- **Company**: StudioNN Agency S.L. (NIF: B42978130, VAT: ESB42978130)
- **Address**: Avinguda Del Doctor Gadea 1, 10E, 03003 Alicante, Spain

---

## 2. TECH STACK

| Layer | Technology | Details |
|-------|-----------|---------|
| Framework | Next.js 16 | App Router, React 19, TypeScript |
| Styling | Tailwind CSS 3.3 | + Radix UI + Lucide icons |
| Auth & DB | Supabase | PostgreSQL, Auth (SSR cookies), RLS |
| Payments | Stripe | Checkout, Webhooks, Customer Portal, Tax |
| Email | Resend | SMTP via Supabase, custom HTML templates |
| AI | Gemini 2.5 Flash Lite | Text generation (cheap, fast) |
| AI | Claude Sonnet | SketchFlow (sketches), long-form content |
| AI | OpenAI gpt-image-1.5 | Design-phase colorization + 3D render (photoreal) |
| AI | Freepik Nano Banana (Gemini 2.5 Flash Image) | Marketing Still Life / Brand Model / Try-On |
| AI | Freepik Kling 2.1 Pro/Std | Marketing video generation (5s/10s, image-to-video) |
| AI | Freepik Flux Dev | Technical flat sketches |
| Hosting | Vercel | Auto-deploy from GitHub main branch |
| DNS | IONOS | aimily.app domain, API-managed |
| Analytics | Vercel Analytics | `@vercel/analytics/react` in layout |
| OAuth | Google | "Continue with Google" sign-in |
| Scraping | Apify | Trend analysis |
| Social | Pinterest API | Pin/board integration |

---

## 3. CONSUMER JOURNEY (End-to-End)

### 3.1 Discovery → Sign Up
1. User lands on `/` (the consolidated public landing — minimalist portada → DWP narrative + AZUR · SS27 walkthrough → 4 Stripe-LIVE plans → final CTA)
2. Sees pricing inline at `#pricing` anchor, CTA buttons ("Start Free Trial" in current locale)
3. Clicks → AuthModal opens (sign up with email or Google)
4. Confirmation email sent (Resend SMTP, branded template)
5. User confirms email → redirected to `/my-collections`
6. Auto-trial subscription created (14 days, full Professional access)

### 3.2 First Collection
1. User clicks "New Collection" → `/new-collection`
2. Multi-step wizard: name, season, category (clothing/footwear/accessories), distribution channels
3. Dynamic questions per phase — YES/NO marks milestones as already done
4. Creates `collection_plans` + `collection_timelines` records with 45 default milestones
5. Redirected to `/collection/[id]` (overview)

### 3.3 Collection Workflow (4 Blocks)
User navigates via CollectionSidebar through 4 blocks, each with workspaces:

```
BLOCK 1: Creative & Brand
  → Product & Creative (merchandising, SKU planning, Collection Builder)
  → Brand & Identity (naming, voice, colors, typography, packaging)

BLOCK 2: Range Planning & Strategy
  → (Integrated into Product workspace — budget, channels, families)

BLOCK 3: Design & Development
  → Design (lasts/forms, design review, colorways, patterns)
  → Prototyping (proto tracker, tech sheets)
  → Sampling (color samples, fitting review, final approval)
  → Production (orders, QC, logistics)

BLOCK 4: Marketing & Digital
  → Marketing Creation (sales dashboard, content studio, communications, point of sale)
  → Marketing Distribution (GTM, content calendar, paid & growth, launch)
```

### 3.4 Workspace Unlock Logic
Workspaces unlock progressively based on milestone completion:
- Product, Brand → **always available** (no dependencies)
- Design → unlocks when `rp-6` (GTM planning) completed
- Prototyping → unlocks when `dd-6` (colorways done) completed
- Sampling → unlocks when `dd-10` (tech sheets done) completed
- Production → unlocks when `dd-14` (sampling done) completed
- Marketing Creation → unlocks when `rp-6` (Range Plan done) completed
- Marketing Distribution → unlocks when `gm-5` (creation done) completed

### 3.5 First Entry to Each Workspace
- WorkspaceGate pattern: if `setup_data.workspace_config.{workspace}.configured === false`, shows MiniWizard
- User answers quick config questions → marked as configured → workspace renders
- Exception: Marketing Creation/Distribution render directly (no gate after Phase 10 cleanup)

### 3.6 AI Assistance Throughout
Every card/workspace offers 3 modes (UX universal rule):
| Mode | Label | Behavior |
|------|-------|----------|
| 1 | **Libre** | User inputs everything manually |
| 2 | **Asistido** | User gives direction → AI complements |
| 3 | **Propuesta IA** | Minimal input → AI generates full proposal |

### 3.7 Billing Journey
1. Trial: 14 days, full Professional access, 250 AI generations
2. Trial expires → read-only mode
3. User upgrades via `/pricing` or UpgradePrompt → Stripe Checkout
4. Subscription managed via Stripe Customer Portal

### 3.8 Standalone Tools (No Collection Required)
- `/sketch-flow` — AI sketch generation + tech packs (upload image → flat sketch → tech pack PDF)
- `/creative-space` — Moodboard builder + trend research (Pinterest integration, Shoreditch trend data)
- `/collection-calendar` — Standalone Gantt timeline (not tied to collection)
- `/trends` — Trend explorer

---

## 4. INFRASTRUCTURE & SERVICES

### 4.1 Supabase
- **Project ID**: `sbweszownvspzjfejmfx`
- **Project URL**: `https://sbweszownvspzjfejmfx.supabase.co`
- **Management API**: `https://api.supabase.com/v1` — token in `.env.local` → `SUPABASE_MANAGEMENT_TOKEN`
- **Auth config** (set via Management API):
  - Password: min 8 chars, letters + digits required
  - Reauthentication required for password change
  - Password change notification enabled
  - Confirm email: enabled
  - MFA: enabled on admin account
  - Rate limits: 30/hr email, 150/hr token refresh
  - `password_hibp_enabled`: requires Supabase Pro (pending)
- **SMTP**: Resend (`smtp.resend.com:465`, user: `resend`, sender: `aimily <noreply@aimily.app>`)
- **Site URL**: `https://www.aimily.app`
- **Redirect URLs**: `https://www.aimily.app/**`, `http://localhost:3000/**`
- **Google OAuth**: enabled (client ID in `.env.local`)
- **Redirect URI for OAuth**: `https://sbweszownvspzjfejmfx.supabase.co/auth/v1/callback`

### 4.2 Stripe (TEST MODE)
- **Account ID**: `acct_1T9iqZQxnvnXDeja`
- **Statement descriptor**: AIMILY APP / AIMILY
- **Currency**: EUR (euros)
- **Stripe Tax**: activated (automatic VAT calculation)
  - B2B with valid VAT → reverse charge (0%)
  - B2C in EU → customer's country VAT
  - Outside EU → 0%
- **Products**:
  - Starter: `prod_U81vNsecStddmo`
  - Professional: `prod_U81vq1vfjKzrqA`
  - Old products (Pro, Business, Enterprise) archived
- **Webhook**:
  - ID: `we_1T9iwQQxnvnXDejamI2db1V0`
  - URL: `https://www.aimily.app/api/webhooks/stripe`
  - Events: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_failed`, `charge.dispute.created/closed`, `invoice.payment_action_required`
  - Secret: `.env.local` → `STRIPE_WEBHOOK_SECRET`
- **Keys**: `.env.local` → `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Price IDs**: `.env.local` → `STRIPE_STARTER_MONTHLY_PRICE_ID`, `STRIPE_STARTER_ANNUAL_PRICE_ID`, `STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID`, `STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID`

### 4.3 Resend (Email)
- **Domain**: `aimily.app` (verified — SPF, DKIM, DMARC via IONOS DNS)
- **API Key**: `.env.local` → `RESEND_API_KEY`
- **Configured in Supabase** via Management API (not Dashboard)

### 4.4 Google OAuth
- **Cloud Project**: Gemini API (ID: `936283260324`)
- **OAuth Client**: `aimily web`
- **Client ID**: `.env.local` → `GOOGLE_OAUTH_CLIENT_ID`
- **JS Origins**: `https://www.aimily.app`, `http://localhost:3000`
- **Redirect URI**: `https://sbweszownvspzjfejmfx.supabase.co/auth/v1/callback`

### 4.5 DNS (IONOS)
- **Domain**: `aimily.app`
- **API**: `https://api.hosting.ionos.com/dns/v1/`
- **API Key**: `.env.local` → `IONOS_DNS_API_KEY`
- **Zone ID**: `.env.local` → `IONOS_ZONE_ID_AIMILY`
- **Key records**:
  - `A aimily.app → 76.76.21.21` (Vercel)
  - `CNAME www.aimily.app → cname.vercel-dns.com` (Vercel)
  - `CNAME _domainconnect → cname.vercel-dns.com`
  - `TXT SPF` (ionos + resend/amazonses)
  - `CNAME DKIM` (resend._domainkey, s1-ionos._domainkey, s2-ionos._domainkey)
  - `CNAME _dmarc → dmarc.ionos.es`

### 4.6 Vercel
- **Project**: `felipes-projects-ab46a8c8/aimily`
- **Plan**: **Pro** (upgraded 2026-05-05 for wildcard support and ToS commercial use)
- **Team ID**: `team_kieSXcYQ6bbTv4a94IR2DN1e`
- **Domains**:
  - `www.aimily.app` + `aimily.app` — main app
  - `*.aimily.shop` — Ecom storefront wildcard (added 2026-05-05)
  - Per-subdomain SSL via Vercel API on each storefront publish (Let's Encrypt 50/week per registered domain)
- **Analytics**: enabled on main app + on every storefront layout (privacy-friendly, no cookies, GDPR-default)
- **Auto-deploy**: from GitHub `main` branch
- **All env vars uploaded** (see section 13). Notable: `VERCEL_API_TOKEN` (used by /api/ecom/publish to register storefront domains)

### 4.7 Cloudflare (NEW 2026-05-05) · Ecom storefront DNS

- **Domain**: `aimily.shop` registered via Cloudflare Registrar (~$30/year)
- **Account ID**: `77123e1e9e30bb61364a9f9009c498cc`
- **Zone ID**: `58392d7347415328aae1d8ae6c7ff338`
- **DNS**: single wildcard record `* CNAME → cname.vercel-dns.com` (DNS only, no proxy — Cloudflare Free can't proxy wildcards)
- **API Token**: User Token in `.env.local` (`CLOUDFLARE_API_TOKEN`), scope `Zone:DNS:Edit + Account:Registrar:Edit` on `aimily.shop` only, no expiry
- **Why Cloudflare for Ecom DNS** (despite Cloudflare Registrar locking NS for 60 days post-purchase, blocking the originally-planned wildcard SSL via Vercel DNS):
  - Cheapest .shop registrar at cost (~$30 vs $35-45 at IONOS/Namecheap)
  - Free wildcard SSL handled at Vercel level (per-subdomain via API on publish)
  - DDoS protection + future CDN headroom
  - Migration path: after **2026-07-04** (60-day ICANN window), can transfer to Vercel Domains for native wildcard SSL
- **Reference**: `memory/credentials_cloudflare-aimily-shop.md` + `memory/architecture-ecom.md`

---

## 5. FRONTEND ARCHITECTURE

### 5.1 Root Layout (`src/app/layout.tsx`)
```
<html>
  <body>
    <AuthProvider>          ← Supabase auth state
      <SubscriptionProvider> ← Stripe billing/plan state
        <ServiceWorkerRegistrar /> ← PWA support
        <main>{children}</main>
        <CookieConsent />    ← GDPR cookie banner
        <Analytics />        ← Vercel Analytics
      </SubscriptionProvider>
    </AuthProvider>
  </body>
</html>
```
- Theme color: `#282A29` (carbon)
- PWA manifest + Apple icon

### 5.2 Navigation

**Navbar** (`src/components/layout/navbar.tsx`) — 3 variants:
| Variant | Used On | Style | Logo Links To |
|---------|---------|-------|---------------|
| `default` | Public pages, auth | `bg-crema/80 backdrop-blur-sm` | `/` |
| `workspace` | Collection hub | `bg-white/80` | `/my-collections` |
| `workspace-dark` | Dark themed views | transparent, white logo | `/my-collections` |

- Logged out: "Log in" + "Start Free Trial" buttons
- Logged in: Pricing link, NotificationBell, user avatar, Sign Out
- Mobile: hamburger + dropdown

**CollectionSidebar** (`src/components/collection/CollectionSidebar.tsx`):
- Fixed left sidebar (w-64, collapsible to w-16)
- Top items: Overview + Calendar
- 4 block groups with workspace sub-items:
  - Creative & Brand → Product, Brand
  - Range Planning → (header only, no workspaces)
  - Design & Development → Design, Prototyping, Sampling, Production
  - Marketing & Digital → Marketing Creation, Marketing Distribution
- Per-workspace progress % from milestones
- Block-colored icons

### 5.3 Collection Hub Layout
```
CollectionHubLayout (server) — fetches plans, timelines, SKU count
  └─ CollectionHubShell (client) — passes props down
     └─ SubscriptionGate — validates active subscription
        └─ WizardLayout — sidebar + content area
           └─ CollectionSidebar (fixed left)
           └─ {children} (workspace page content)
```

### 5.4 Design System
- **Tailwind CSS** + Radix UI primitives
- **Colors**: crema (cream bg), carbon (dark), texto, gris, error
- **Typography**: font-light headlines, tracking-tight, italic emphasis, uppercase labels
- **No rounded corners** — clean/minimal aesthetic
- **UI Components** (`src/components/ui/`): button, card, tabs, label, input, textarea, select, badge, colored-svg, svg-icon, animate-on-scroll

---

## 6. ALL PAGES & ROUTES

### 6.1 Public Pages (No Auth)
**Restructured 2026-04-28**: 4 marketing routes consolidated into the home. The home is now the single canonical landing.

| Route | Description |
|-------|-------------|
| `/` | The consolidated landing — minimalist portada (logo + tagline) → MEET AIMILY hero with DWP angle → Emily↔aimily silogism → "the problem" → 4-block journey overview → 4 detailed blocks with AZUR · SS27 walkthrough → enterprise artifacts → StudioNN origin → pricing (4 plans, packs, imagery table) → "That's all." final CTA → shared SiteFooter. All copy i18n-driven via `src/i18n/home.ts` across 9 locales. |
| `/contact` | Contact + StudioNN team |
| `/trust` | Privacy/security pillars + AI provider transparency |
| `/terms` | Terms of Service |
| `/privacy` | Privacy Policy |
| `/cookies` | Cookie Policy |
| `/video-reel` | Demo/portfolio video page |

**Retired routes (308 redirects via `next.config.js`)**:
| Old route | Redirects to |
|-----------|--------------|
| `/meet-aimily` | `/` |
| `/how-it-works` | `/` |
| `/discover` | `/` |
| `/pricing` | `/#pricing` (anchor inside the home) |

### 6.2 Auth Pages
| Route | Description |
|-------|-------------|
| `/auth/callback` | PKCE code exchange + smart redirect (recovery→reset, signup→collections) |
| `/auth/forgot-password` | Email input → sends reset email |
| `/auth/reset-password` | New password form (8+ chars, 1+ digit) |
| `/auth/confirm` | Email verification callback |
| `/auth/confirm-status` | Confirmation status display |

### 6.3 Protected Pages (Auth Required)
| Route | Description |
|-------|-------------|
| `/my-collections` | Collections dashboard (grid + progress bars + deadlines) |
| `/account` | Account settings, subscription, AI usage, GDPR export/delete |
| `/new-collection` | Multi-step collection creation wizard |
| `/sketch-flow` | AI sketch generation → tech pack export (4-step flow) |
| `/creative-space` | Moodboard builder + trend research (Pinterest + Shoreditch data) |
| `/trends` | Trend explorer |
| `/collection-calendar` | Standalone Gantt timeline |
| `/collection-calendar/[id]` | Collection-linked Gantt timeline |
| `/analytics` | Collection insights & trends dashboard |
| `/color-palettes` | Color palette management tool |

### 6.4 Collection Workspaces (`/collection/[id]/...`)
| Route | Component | Purpose |
|-------|-----------|---------|
| `/collection/[id]` | CollectionOverview | Dashboard: progress, milestones, SKU count |
| `/collection/[id]/calendar` | CollectionCalendarClient | Embedded Gantt (drag/resize, inline edit) |
| `/collection/[id]/product` | PlannerDashboard | Collection Builder, SKU table, families, pricing, budget |
| `/collection/[id]/brand` | BrandWorkspace | Brand profile, visual identity, packaging |
| `/collection/[id]/design` | DesignWorkspace | Lasts/forms, design review, colorways, patterns |
| `/collection/[id]/prototyping` | PrototypingWorkspace | Proto tracker, tech sheets |
| `/collection/[id]/sampling` | SamplingWorkspace | Color samples, fitting review, final approval |
| `/collection/[id]/production` | ProductionWorkspace | Orders, QC, logistics |
| `/collection/[id]/creative` | CreativePage | 3-step flow: Vision (4 mini-blocks) → Research (4) → Synthesis |
| `/collection/[id]/merchandising` | MerchandisingPage | 4 cards: Families → Pricing → Channels → Budget → Collection Builder |
| `/collection/[id]/development` | DevelopmentPage | Navigation hub for 4 design/dev phases |
| `/collection/[id]/go-to-market` | GoToMarketDashboard | Drops, commercial actions, AI market validation |
| `/collection/[id]/marketing/creation` | MarketingCreationScreen | 4 cards: Sales Dashboard, Content Studio, Communications, Point of Sale |
| `/collection/[id]/marketing/distribution` | MarketingDistributionScreen | 4 cards: GTM, Content Calendar, Paid & Growth, Launch |

---

## 7. WORKSPACE DETAILS

### 7.0a Creative & Brand (`/collection/[id]/creative`)
- **No Gate** — renders directly
- **Component**: CreativePage (inline, 1,173 lines)
- **Flow**: 3 sequential steps with expand/collapse 2x2 grid
- **Step 1 — Creative Vision** (4 mini-blocks): Consumer Definition, Collection Vibe, Moodboard, Brand DNA
- **Step 2 — Market Research** (4 mini-blocks): Global Trends, Deep Dive, Live Signals, Competitors
- **Step 3 — Creative Synthesis**: Placeholder (consolidation not implemented)
- **AI**: `/api/ai/creative-generate` — 10 generation types
- **3 Modes**: Libre/Asistido/Propuesta IA in all mini-blocks
- **⚠️ Gaps**: No DB persistence (state in memory), Pinterest placeholder, Synthesis empty

### 7.0b Merchandising (`/collection/[id]/merchandising`)
- **No Gate** — renders directly
- **Component**: MerchandisingPage (inline, 883 lines)
- **Flow**: 4 cards with expand/collapse, then Collection Builder CTA
- **Cards**: 1. Product Families → 2. Pricing (locked until 1✓) → 3. Channels & Markets → 4. Budget & Financials
- **AI**: `/api/ai/merch-generate` — 8 generation types
- **3 Modes**: Libre/Asistido/Propuesta IA in all cards
- **Collection Builder CTA**: Navigates to `/collection/{id}/product` when all 4 validated
- **⚠️ Gaps**: No DB persistence (state in memory)

### 7.1 Product & Creative (`/collection/[id]/product`)
- **Gate**: ProductWorkspaceGate + ProductMiniWizard
- **Component**: PlannerDashboard
- **Tabs**: Constructor, Strategic Dashboard, Historical
- **Features**:
  - Collection Builder (SKU table, drag-and-drop)
  - Collection Framework Summary (expected SKUs, drops, margins, sales targets)
  - Monthly Distribution (seasonality 12-month spread)
  - Families Snapshot (product families %)
  - Product Types Mix (IMAGEN/REVENUE/ENTRY pyramid)
  - Price Segments
  - Distribution Pyramid visualization
- **Hooks**: useSkus, useDrops
- **Milestones**: rp-1 through rp-6

### 7.2 Brand & Identity (`/collection/[id]/brand`)
- **Gate**: BrandWorkspaceGate + BrandMiniWizard
- **Component**: BrandWorkspace
- **Tabs**: Brand Profile, Visual Identity, Packaging
- **Features**:
  - Brand Naming (options, name, tagline)
  - Brand Story, Brand Voice, Target Audience
  - Competitor Map
  - Color Palette (primary/secondary), Typography
  - Packaging Notes
  - Milestones Checklist
- **Hooks**: useBrandProfile
- **Milestones**: br-1 through br-4

### 7.3 Design (`/collection/[id]/design`)
- **Gate**: WorkspaceGate + DesignMiniWizard
- **Component**: DesignWorkspace
- **Tabs**: Lasts & Forms, Design Review, Colorways, Patterns
- **Features**:
  - SKU form specs (last type, code, factory link, notes)
  - Design files per SKU (draft/review/approved/rejected)
  - Colorway Manager from DB
  - Pattern files per SKU
  - Auto-saves to localStorage (500ms debounce)
- **Hooks**: useSkus, useColorways
- **Milestones**: dd-1 through dd-6

### 7.4 Prototyping (`/collection/[id]/prototyping`)
- **Gate**: WorkspaceGate + PrototypingMiniWizard
- **Component**: PrototypingWorkspace
- **Tabs**: Proto Tracker, Tech Sheets
- **Features**:
  - Sample review management (white_proto type)
  - Technical documentation
- **Hooks**: useSkus, useSampleReviews(collectionId, 'white_proto')
- **Milestones**: dd-7 through dd-10

### 7.5 Sampling (`/collection/[id]/sampling`)
- **Gate**: WorkspaceGate + SamplingMiniWizard
- **Component**: SamplingWorkspace
- **Tabs**: Color Samples, Fitting Review, Final Approval
- **Features**:
  - ColorSampleReview (filtered by `color_sample`)
  - FittingReview (filtered by `fitting_sample`)
  - FinalApproval (all reviews)
- **Hooks**: useSkus, useColorways, useSampleReviews
- **Milestones**: dd-11 through dd-14

### 7.6 Production (`/collection/[id]/production`)
- **Gate**: WorkspaceGate + ProductionMiniWizard
- **Component**: ProductionWorkspace
- **Tabs**: Production Orders, Quality Control, Logistics
- **Features**:
  - OrderTracker (create/edit/delete POs)
  - QcTracker (quality control status)
  - LogisticsTracker (shipment tracking)
- **Hooks**: useProductionOrders, useSkus
- **Milestones**: dd-15 through dd-18

### 7.7 Go-To-Market (`/collection/[id]/go-to-market`)
- **Gate**: GtmWorkspaceGate + GtmMiniWizard
- **Component**: GoToMarketDashboard
- **Features**:
  - Total Sales Target display
  - Channel filter (ALL, DTC, WHOLESALE)
  - Visual Timeline (drops as circles, commercial actions as dots)
  - Drops Section (create/edit drops, organize SKUs by drop)
  - Commercial Actions (SALE, COLLAB, CAMPAIGN, SEEDING, EVENT)
  - AI Market Validation (Gemini prediction vs planned sales)
  - Planned Sales by Month calculation
- **Hooks**: useDrops, useCommercialActions, useSkus

### 7.8 Marketing Creation (`/collection/[id]/marketing/creation`) — REDESIGNED 2026-05-05
- **No Gate** — renders directly
- **Component**: MarketingCreationScreen (sidebar-driven, ?block= param)
- **Sub-blocks** (5):
  1. **GtmLaunchHub** (`?block=gtm`) — Pre-launch timing, press kit, content calendar, launch countdown
  2. **ContentStudioCard** (`?block=content`) — Per-SKU 4-level visual pipeline + 28-model roster + editorial casting
  3. **CommunicationsCard** (`?block=comms`) — Copy, social templates, email, brand voice, SEO copy
  4. **SalesDashboardCard** (`?block=sales`) — KPIs, Recharts revenue curve, drop calendar
  5. **EcomCard** (`?block=ecom`) — **Storefront generator** — see section 22 for full reference. Renders 3 sub-sections:
     - `EcomHub` — publish flow (subdomain, 12 themes, payment connect)
     - `SeoResearchHub` — 4 tabs (keywords, on-page, competitors, audit)
     - `OverridesEditor` — inline copy edits per page (saves to `storefront_overrides`)
- **Renamed 2026-05-05**: card `04.5 Point of Sale` → `04.4 Ecom`. Wholesale Orders CRUD moved to Block 2 Merchandising > Channels > `wholesale` (see section 22 + `architecture-ecom.md`).
- **Hooks**: useStories, useLookbookPages, useAiGenerations, useBrandModels, useAimilyModels, useContentPillars, useBrandVoiceConfig, useProductCopy, useSocialTemplates, useEmailTemplates, useCollectionIntelligence
- **Milestones**: gm-3, gm-4, gm-5

### 7.9 Marketing Distribution (`/collection/[id]/marketing/distribution`)
- **No Gate** — renders directly
- **Component**: MarketingDistributionScreen
- **Layout**: 2×2 card grid
- **Cards**:
  1. **GoToMarketCard** — GTM strategy, positioning, PR contacts management
  2. **ContentCalendarCard** — Content scheduling & publishing calendar
  3. **PaidGrowthCard** — Paid ads, budget allocation, ROAS tracking
  4. **LaunchCard** — Launch checklist (pre-launch, launch-day, post-launch tasks)
- **Hooks**: usePrContacts, useContentCalendar, usePaidCampaigns, useLaunchTasks
- **Milestones**: gm-1, gm-2, gm-6 through gm-15

---

## 8. AUTH SYSTEM

### 8.1 Architecture
- **SSR cookie-based** auth via `@supabase/ssr`
- **Browser client**: `createClient()` from `src/lib/supabase/client.ts`
- **Server client**: `createClient()` from `src/lib/supabase/server.ts` (reads cookies)
- **Admin client**: `supabaseAdmin` from `src/lib/supabase-admin.ts` (service role)

### 8.2 Auth Context (`src/contexts/AuthContext.tsx`)
```
user, session, loading
signUp(email, password), signIn(email, password)
signInWithGoogle(), signOut()
resetPassword(email), updatePassword(newPassword)
```

### 8.3 Auth UI
- `AuthModal.tsx` — Tabs: Sign In / Sign Up, email+password, Google OAuth
- "Forgot password?" → `/auth/forgot-password`
- Post-signup → "Check your email" message

### 8.4 Middleware (`src/middleware.ts`)
- Refreshes tokens on every request
- **Public routes**: `/`, `/contact`, `/trust`, `/terms`, `/privacy`, `/cookies`, `/auth/*`, `/video-reel`
- **Skipped paths**: `/api/webhooks/`, `/api/cron/`, `/api/auth/`
- **Retired routes** (308 redirects in `next.config.js`, processed before middleware): `/meet-aimily`, `/how-it-works`, `/discover`, `/pricing`
- **Protected routes**: everything else → redirects unauthenticated to `/`

### 8.5 Email Templates (`supabase/email-templates/`)
- `signup-confirmation.html`, `password-reset.html`, `magic-link.html`, `email-change.html`
- Design: dark editorial (#282A29 bg, #FAEFE0 text, aimily logo white)

---

## 9. BILLING SYSTEM

### 9.1 Pricing v5 (May 2026 rebrand · LIVE)
Renamed by ICP (target organization size) so customers self-identify:

| Plan ID | Name | Monthly | Annual/mo (-20%) | Aimily Credits/mo | Users | Storefronts | Notes |
|---------|------|---------|-------------------|---------------------|-------|-------------|-------|
| `student` | Student | Free 12 mo | — | 100 | 1 | 1 | Auto-verified via institutional email (167 schools whitelist) |
| `founder` | Founder | €99 | €79 | 100 | 1 | 1 | Indie default · all AI tools |
| `team` | Team | €599 | €479 | 1.000 | 10 | 5 | + collab, roles, multi-brand |
| `team_pro` | Team Pro | €999 | €799 | 5.000 | 25 | 25 | + advanced analytics |
| `enterprise` | Enterprise | from €3.000 | — | ∞ | ∞ | ∞ | + SSO, API, dedicated support |
| `trial` | Trial | Free 30 days · no card | — | 100 | 1 | 1 | `payment_method_collection: 'if_required'` |

**Storefront quota** (Sprint 1 Ecom · `subscriptions.storefront_quota`): 1/5/25/∞ per plan, enforced via `can_publish_storefront(user_id)` RPC.

**Aimily Credits** = imagery generations (UI rename · DB still tracks as `imagery_credits.balance`).

### 9.1b Promo strategy
- **Public launch promo retired** (was 100×50% for 12mo). Felipe decided after launch that with Student gratis + Founder €99 the promo was double-discounting.
- **Private STUDIONN50 coupon** in Stripe (50% off · 12mo · repeating) for selective outreach. Customers type code at checkout (`allow_promotion_codes: true`).

### 9.2 Feature Gates
| Feature | Trial | Student | Founder | Team | Team Pro | Enterprise |
|---------|-------|---------|---------|------|----------|------------|
| All AI tools | Yes | Yes | Yes | Yes | Yes | Yes |
| Trend Alerts | Yes | Yes | Yes | Yes | Yes | Yes |
| Storefront publish | 1 | 1 | 1 | 5 | 25 | ∞ |
| Collaboration | Yes | No | No | Yes | Yes | Yes |
| Roles & Permissions | Yes | No | No | Yes | Yes | Yes |
| Multi-brand | No | No | No | Yes | Yes | Yes |
| SSO | No | No | No | No | No | Yes |
| API access | No | No | No | No | No | Yes |

### 9.3 Payment Flow
1. User clicks plan → `checkoutPlan()` in SubscriptionContext
2. POST `/api/billing/checkout` → creates Stripe Customer + Checkout Session
3. Redirect to Stripe Checkout (hosted)
4. Payment → webhook to `/api/webhooks/stripe`
5. Webhook updates `subscriptions` table
6. Redirect to `/my-collections?billing=success`
7. SubscriptionContext auto-refreshes via Supabase realtime

### 9.4 Subscription Context (`src/contexts/SubscriptionContext.tsx`)
```
subscription, loading
isStarter, isProfessional, isEnterprise, isPaid, isTrial
isTrialExpired, trialDaysLeft
canUseAI, aiUsagePercent
refresh(), checkoutPlan(plan, annual?), openPortal(), trackAIUsage()
```

---

## 10. API ROUTES (115+ total · last updated 2026-05-06)

> **NEW since April audit**: `/api/ecom/*` (6 routes) + `/api/ai/seo-*` (5 routes) + cron `/api/cron/expire-student-verifications` + `/api/student/verify` + `/api/academic-domains/list` + `/api/promo/counter`. See sections 22 + 23 for Ecom + SEO routes detail.

### 10.1 Auth & Account (4 routes)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/account/delete` | POST | Delete account + cascade all data (GDPR) |
| `/api/account/export` | GET | Export all user data as JSON (GDPR) |
| `/api/auth/pinterest/callback` | GET | Pinterest OAuth callback |
| `/api/auth/pinterest/signout` | GET/POST | Disconnect Pinterest |

### 10.2 Billing (4 routes)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/billing/checkout` | POST | Create Stripe Checkout session |
| `/api/billing/portal` | POST | Stripe Customer Portal redirect |
| `/api/billing/subscription` | GET | Current plan, status, limits, trial |
| `/api/billing/usage` | POST | Increment AI usage + limit check (429 if exceeded) |

### 10.3 Collections & Planning (8 routes)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/planner/create` | POST | Create new collection plan |
| `/api/planner/[id]` | PATCH | Update plan metadata |
| `/api/planner/[id]/workspace-config` | PATCH | Configure workspace settings |
| `/api/collection-plans/[id]/save` | POST | Save plan config |
| `/api/collection-timelines` | GET/POST | Get or upsert timeline with milestones |
| `/api/standalone-timelines` | GET/POST | Manage timelines not tied to collections |
| `/api/reports` | GET | Generate collection reports |
| `/api/signals` | GET | Trend signals |

### 10.4 Product & Merchandising (11 routes)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/skus` | GET/POST | List and create SKUs |
| `/api/skus/[id]` | GET/PATCH/DELETE | CRUD individual SKU |
| `/api/skus/carry-over` | GET/POST | Carry over SKUs from previous collection |
| `/api/drops` | GET/POST | List and create drops |
| `/api/drops/[id]` | GET/PATCH/DELETE | CRUD drop |
| `/api/colorways` | GET/POST | SKU colorway variants |
| `/api/colorways/[id]` | PATCH/DELETE | Update/delete colorway |
| `/api/production-orders` | GET/POST | Production POs |
| `/api/production-orders/[id]` | PATCH/DELETE | Update/cancel PO |
| `/api/sample-reviews` | GET/POST | Sample reviews |
| `/api/sample-reviews/[id]` | PATCH/DELETE | Update/delete review |

### 10.5 Brand & Creative (6 routes)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/brand-profiles` | GET/PATCH | Brand identity |
| `/api/brand-voice-config` | GET/POST | Brand voice guidelines |
| `/api/brand-models` | GET/POST | AI brand reference models |
| `/api/brand-models/[id]` | PATCH/DELETE | Update/delete model |
| `/api/stories` | GET/POST | Collection stories/narratives |
| `/api/stories/[id]` | PATCH/DELETE | Update/delete story |

### 10.6 AI Generation (24 routes)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/ai-generations` | GET/POST | AI generation records |
| `/api/ai-generations/[id]` | PATCH/DELETE | Update/delete generation |
| `/api/ai/analyze-moodboard` | POST | Gemini Vision: extract colors, trends, brands from moodboard |
| `/api/ai/analyze-text` | POST | Gemini: extract fashion data from text |
| `/api/ai/explore-trends` | POST | Deep trend analysis (runway, celebrities, retail) |
| `/api/ai/market-trends` | GET | Current market trends (SS26/Pre-Fall 2026) |
| `/api/ai/market-prediction` | POST | Demand weights + sales predictions from commercial plan |
| `/api/ai/generate-plan` | POST | Merchandising plan from consumer/season/category inputs |
| `/api/ai/generate-skus` | POST | SKU list with pricing to match sales targets |
| `/api/ai/generate-sketch-options` | POST | OpenAI: flat sketches from reference photos |
| `/api/ai/generate-techpack` | POST | Claude + Gemini fallback: tech pack (front/back SVG sketches) |
| `/api/ai/propose-comments` | POST | Claude: tech comments and measurements on sketches |
| `/api/ai/creative-generate` | POST | Creative block: 10 types (consumer, vibe, brand, trends) |
| `/api/ai/merch-generate` | POST | Merch block: 8 types (families, pricing, channels, budget) |
| `/api/ai/design-generate` | POST | Design block: 4 types (sketch, color, materials, catalog) ⚠️ no UI |
| `/api/ai/content-strategy/generate` | POST | Content pillars, brand voice, tones (multi-mode) |
| `/api/ai/copy/generate` | POST | Product copy, brand story, SEO, email/social templates |
| `/api/ai/stories/generate` | POST | Collection stories (assist or full proposal mode) |
| `/api/ai/gtm/generate` | POST | GTM plan with drops + commercial actions |
| `/api/ai/launch/generate` | POST | Launch checklist (pre/during/post) |
| `/api/ai/paid/generate` | POST | Paid media campaigns + ROAS allocations |
| `/api/ai/content-calendar/generate` | POST | Editorial content calendar aligned with drops |
| `/api/ai/colorize-sketch` | POST | OpenAI gpt-image-1.5: flat colorization + photoreal 3D render (is_3d_render flag). Also the "Product Render" source for marketing. |
| `/api/ai/freepik/sketch` | POST | Freepik Flux Dev: technical flat sketches |
| `/api/ai/freepik/still-life` | POST | Freepik Nano Banana: editorial still life with reference_images |
| `/api/ai/freepik/video` | POST | Freepik Kling 2.1 Pro/Std: image-to-video (5s/10s) |
| `/api/ai/freepik/brand-model` | POST | Freepik Nano Banana: brand model roster (editorial portraits) |
| `/api/ai/freepik/tryon` | POST | Freepik Nano Banana multi-reference: virtual try-on |
| `/api/ai/freepik/editorial` | POST | Freepik Nano Banana: editorial on-model narrative (3 refs: product + face-blurred style ref + model headshot) |

### 10.7 Marketing & Content (20 routes)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/content-calendar` | GET/POST | Content calendar entries |
| `/api/content-calendar/[id]` | PATCH/DELETE | Update/delete entry |
| `/api/content-pillars` | GET/POST | Brand content pillars |
| `/api/content-pillars/[id]` | PATCH/DELETE | Update/delete pillar |
| `/api/product-copy` | GET/POST | Product copy variants |
| `/api/product-copy/[id]` | PATCH/DELETE | Update/delete copy |
| `/api/social-templates` | GET/POST | Social media templates |
| `/api/social-templates/[id]` | PATCH/DELETE | Update/delete template |
| `/api/email-templates` | GET/POST | Email campaign templates |
| `/api/email-templates/[id]` | PATCH/DELETE | Update/delete template |
| `/api/paid-campaigns` | GET/POST | Paid media campaigns |
| `/api/paid-campaigns/[id]` | PATCH/DELETE | Update/delete campaign |
| `/api/launch-tasks` | GET/POST | Launch tasks |
| `/api/launch-tasks/[id]` | PATCH/DELETE | Update/delete task |
| `/api/pr-contacts` | GET/POST | PR contacts/influencers |
| `/api/pr-contacts/[id]` | PATCH/DELETE | Update/delete contact |
| `/api/lookbook-pages` | GET/POST | Lookbook page designs |
| `/api/lookbook-pages/[id]` | PATCH/DELETE | Update/delete page |
| `/api/commercial-actions` | GET/POST | Commercial actions (SALE, COLLAB, etc.) |
| `/api/commercial-actions/[id]` | PATCH/DELETE | Update/delete action |

### 10.8 Models, Intelligence & Sales (3 routes)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/aimily-models` | GET | 28 aimily AI model roster (filterable by gender) |
| `/api/collection-intelligence` | GET/POST | CIS — read/write collection decisions (domain, subdomain, key, JSONB value, tags, version, rationale) |
| `/api/wholesale-orders` | GET/POST | Wholesale order CRUD (buyer, order_lines JSONB, status, total_units, total_value) |

### 10.9 Pinterest (2 routes)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/pinterest/boards` | GET | User's Pinterest boards |
| `/api/pinterest/boards/[boardId]/pins` | GET | Pins from board |

### 10.10 Timeline & Milestones (1 route)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/alfred-milestones` | GET | All milestones, summaries, next actions, overdue alerts |

### 10.11 Data, Crons & Other (10 routes)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/city-trends` | GET | Fashion trends by city |
| `/api/cron/collect-instagram` | GET | Background: Instagram trend data |
| `/api/cron/collect-instagram-2` | GET | Background: Instagram secondary |
| `/api/cron/collect-instagram-3` | GET | Background: Instagram tertiary |
| `/api/cron/collect-tiktok` | GET | Background: TikTok trends |
| `/api/cron/collect-tiktok-trends` | GET | Background: TikTok enhanced |
| `/api/cron/collect-reddit` | GET | Background: Reddit fashion |
| `/api/cron/collect-social-data` | GET | Background: aggregate social |
| `/api/cron/process-city-trends` | GET | Background: process city trends |
| `/api/notifications` | GET | User notifications |
| `/api/proxy-image` | POST | Image proxy for CDN |

### 10.12 Webhooks (1 route)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/webhooks/stripe` | POST | Stripe subscription events |

---

## 11. DATABASE

### 11.1 Key Tables

**Auth & Billing**:
- `subscriptions` — user_id, stripe_customer_id, plan (trial/starter/professional/enterprise), status, current_period_start/end, trial_ends_at, is_admin
- `ai_usage` — user_id, month (YYYY-MM), generation_count

**Collections** (all reference `collection_plan_id`):
- `collection_plans` — user_id, name, brand, season, setup_data (JSONB with workspace_config)
- `collection_skus` — SKU data (name, category, family, type, pvp, cost, origin, size_run, sku_role, source_sku_id)
- `collection_timelines` — milestones (JSONB array of 45 milestones), launch_date
- `drops` — drop_number, name, launch_date, weeks_active, story, channels
- `commercial_actions` — action_type (SALE/COLLAB/CAMPAIGN/SEEDING/EVENT), dates, boosts
- `market_predictions` — weekly_predictions, insights, gaps, recommendations
- `sku_colorways` — sku_id, hex colors, pantone, material_swatch, status
- `brand_profiles` — brand_name, tagline, story, voice, audience, competitors, colors, typography
- `brand_models` — AI reference models (gender, body type, style)
- `ai_generations` — generation_type, prompt, input/output data, provider_request_id, model_used, cost, status
- `stories` — collection narratives
- `lookbook_pages` — page designs (layout, content items, background, story_id)
- `content_calendar` — title, content_type, platform, scheduled_date, status, caption, hashtags
- `pr_contacts` — name, type (influencer/media/stylist), platform, followers, status
- `content_pillars` — name, description, examples, stories_alignment
- `brand_voice_config` — personality, tone, do/don't rules, vocabulary
- `social_templates` — platform, type, caption, hashtags, cta
- `email_templates` — email_type, subject, body, cta
- `product_copy` — copy_type, content, metadata, status
- `production_orders` — order_number, factory, status, line_items, qc_issues, documents
- `sample_reviews` — sku_id, review_type, status, fit/construction/material notes, measurements, photos, issues
- `tech_packs` — garment_type, sketches (SVG), construction_notes, measurements
- `paid_campaigns` — name, platform, objective, budget, ad_sets
- `launch_tasks` — title, category, due_date, status, priority, depends_on
- `campaign_shoots` — shoot_type, date, location, team, shot_list, deliverables
- `aimily_models` — 28 AI models (name, gender, headshot_url, complexion, hair_style, hair_color, ethnicity, age_range, body_type, description)
- `collection_decisions` — CIS (collection_plan_id, domain, subdomain, key, value JSONB, tags[], version, rationale, source)
- `sales_channels` — collection_plan_id, channel_type (shopify/woocommerce/wholesale), config JSONB, status
- `wholesale_orders` — collection_plan_id, buyer, order_lines JSONB, status, total_units, total_value, notes

**Standalone**:
- `standalone_timelines` — user_id (not tied to a collection)

**Public Data**:
- `raw_content` — trend data (public, read-only)
- `reports` — trend reports
- `signals` — trend signals

### 11.2 RLS (Row Level Security)
- **All tables have RLS enabled**
- Collection tables: `collection_plan_id IN (SELECT id FROM collection_plans WHERE user_id = auth.uid())`
- Direct user tables: `WHERE user_id = auth.uid()`
- Service role has full access
- Applied in migrations 006 (13 tables) + security_hardening (22 tables)

### 11.3 Migrations
1. `001` — Initial schema
2. `002` — collection_skus
3. `003` — drops, commercial_actions, market_predictions
4. `004` — collection_plans user_id + RLS
5. `005` — subscriptions, ai_usage
6. `006` — RLS hardening (13 tables)
7. `security_hardening_rls_and_functions` — RLS (22 tables) + 3 functions
8. `010` — Fix subscription plan enum (trial/starter/professional/enterprise)
9. `011` — Auto-trial on signup (trigger function)
10. `012` — SKU merchandising fields (origin, size_run, sku_role, source_sku_id)
11. `013` — Collection assets storage bucket
12. `014` — Service role policies
13. `015` — Team members + marketing permissions
14. `016` — Rename fal_request_id → provider_request_id
15. `017` — Stories enrichment
16. `018` — Email sequences
17. `019` — AI generations types enum update
18. `020` — aimily_models table (28 AI models roster)
19. `021` — collection_decisions (CIS — Collection Intelligence System)
20. `022` — sales_channels + wholesale_orders

---

## 12. CUSTOM HOOKS (`src/hooks/`)

All hooks follow the pattern: fetch from REST API, return `{ data[], loading, error, CRUD methods, refetch() }`.

| Hook | Table/API | Key Returns |
|------|-----------|-------------|
| `useSkus` | collection_skus | skus[], addSku, updateSku, deleteSku |
| `useDrops` | drops | drops[], addDrop, updateDrop, deleteDrop, reorderDrops |
| `useColorways` | sku_colorways | colorways[], add/update/delete |
| `useSampleReviews` | sample_reviews | reviews[] (filtered by reviewType), add/update/delete |
| `useProductionOrders` | production_orders | orders[], add/update/delete |
| `useCommercialActions` | commercial_actions | actions[] (sorted by start_date) |
| `useBrandProfile` | brand_profiles | profile, updateProfile (800ms debounce) |
| `useBrandModels` | brand_models | models[], add/update/delete |
| `useAiGenerations` | ai_generations | generations[] (filtered by type), toggleFavorite |
| `useStories` | stories | stories[], bulkSaveStories, assignSku |
| `useLookbookPages` | lookbook_pages | pages[] (filtered by lookbookName/storyId) |
| `useContentCalendar` | content_calendar | entries[], add/update/delete |
| `useContentPillars` | content_pillars | pillars[], bulkSavePillars |
| `useBrandVoiceConfig` | brand_voice_config | config, saveConfig |
| `useProductCopy` | product_copy | copies[] (filtered by copyType) |
| `useSocialTemplates` | social_templates | templates[], bulkSaveTemplates |
| `useEmailTemplates` | email_templates | templates[], bulkSaveTemplates |
| `usePrContacts` | pr_contacts | contacts[], add/update/delete |
| `usePaidCampaigns` | paid_campaigns | campaigns[], add/update/delete |
| `useLaunchTasks` | launch_tasks | tasks[], add/update/delete |
| `useTechPacks` | tech_packs | techPacks[] (direct Supabase client) |
| `useCollectionTimeline` | collection_timelines | timeline, updateMilestone (1000ms debounce) |
| `useNotifications` | /api/notifications | notifications[], unreadCount, dismiss |
| `useAimilyModels` | aimily_models | models[] (28 AI model roster, filterable by gender) |
| `useCollectionIntelligence` | collection_decisions | decisions[], recordDecision, getIntelligence |
| `useWholesaleOrders` | wholesale_orders | orders[], addOrder, updateOrder, deleteOrder |
| `useWizardState` | (computed) | phases[], overallProgress, isPhaseAccessible |

---

## 13. TYPE DEFINITIONS (`src/types/`)

| File | Key Types |
|------|-----------|
| `timeline.ts` | TimelinePhase, MilestoneStatus, TimelineMilestone, CollectionTimeline |
| `brand.ts` | BrandProfile, BrandColor, BrandVoice, TargetAudience, Competitor, BrandTypography |
| `creative.ts` | MoodImage, PinterestPin/Board, MoodboardAnalysis, MarketTrends, CreativeBriefData |
| `design.ts` | SkuColorway, FormSpec, DesignIteration, PatternFile |
| `digital.ts` | CopyType, ProductCopy, ContentPillar, BrandVoiceConfig, SocialTemplate, EmailTemplateContent |
| `marketing.ts` | ContentCalendarEntry, PrContact, AdCampaign, AdSet |
| `production.ts` | ProductionOrder, LineItem, QcIssue, OrderDocument |
| `prototyping.ts` | SampleReview, ReviewType, ReviewStatus, MeasurementRow |
| `studio.ts` | AiGeneration, BrandModel, LookbookPage, CampaignShoot, GenerationType, AimilyModel |
| `tech-pack.ts` | TechPack, GarmentDetails, SketchOption, ConstructionNote, FlowStep |

---

## 14. TIMELINE SYSTEM (4-Block Calendar)

### 14.1 Blocks & Milestones (45 total)

**Creative & Brand (6 milestones: cr-1 to cr-6)**:
Consumer definition, trend research, brand naming, logo, guidelines, packaging

**Range Planning (6 milestones: rp-1 to rp-6)**:
Consumer/market analysis, channel strategy, budget, range framework, SKU definition, GTM

**Design & Development (18 milestones: dd-1 to dd-18)**:
Design shots, patterns, colorways, white proto, color samples, tech sheets, fitting, final approval, production order, QC, logistics

**Go-to-Market (15 milestones: gm-1 to gm-15)**:
Website, e-commerce, photography, copywriting, lookbook, social setup, content calendar, influencer outreach, email flows, paid ads, PR seeding, launch campaign, execution, post-launch

### 14.2 Key Config (`src/lib/timeline-template.ts`)
- `PHASES` — 4 blocks with names (EN/ES), colors, icons
- `DEFAULT_MILESTONES` — 45 milestones with startWeeksBefore, durationWeeks, responsible (US/FACTORY/ALL)
- `migrateLegacyMilestones()` — Converts old IDs to new 4-block system
- `getMilestoneDate()` / `getMilestoneEndDate()` — Date math from launch date

### 14.3 Wizard Phases (`src/lib/wizard-phases.ts`)
- 8 workspace definitions with unlock dependencies
- `computeWizardState()` — Maps milestones → phase states (locked/available/in-progress/completed)

### 14.4 Gantt Chart (`src/components/timeline/GanttChart.tsx`)
- Interactive drag & resize
- Inline editing of dates
- Excel export via ExcelJS (`src/lib/export-timeline-excel.ts`)

---

## 15. SECURITY

### 15.1 Auth Security
- Password: 8+ chars, letters + digits
- Reauthentication for password changes
- Email confirmation required
- MFA on admin account

### 15.2 Authorization
- All routes protected via middleware
- API routes use Supabase server client (cookie session)
- Webhooks skip auth (verified via Stripe signature)
- RLS on all database tables
- Service role only in webhooks/admin ops

### 15.3 GDPR Compliance
- **Right of Access**: `/api/account/export` — JSON download
- **Right to Erasure**: `/api/account/delete` — Stripe cancel + data delete + auth user delete
- **Privacy Policy**: `/privacy`, **Terms**: `/terms`, **Cookies**: `/cookies`
- Cookie consent banner: `src/components/CookieConsent.tsx`
- Data controller: StudioNN Agency S.L.

---

## 16. ENVIRONMENT VARIABLES

### All in `.env.local` (gitignored)

**Supabase**: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_MANAGEMENT_TOKEN

**Stripe**: STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_STARTER_MONTHLY_PRICE_ID, STRIPE_STARTER_ANNUAL_PRICE_ID, STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID, STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID

**Google OAuth**: GOOGLE_OAUTH_CLIENT_ID

**AI APIs**: GEMINI_API_KEY, GEMINI_MODEL, ANTHROPIC_API_KEY, OPENAI_API_KEY, FREEPIK_API_KEY _(FAL_KEY removed 2026-04-10 — fal.ai no longer used)_

**Other**: APIFY_API_TOKEN, CRON_SECRET, NEXT_PUBLIC_PINTEREST_CLIENT_ID, PINTEREST_CLIENT_SECRET, NEXT_PUBLIC_PINTEREST_REDIRECT_URI, RESEND_API_KEY, IONOS_DNS_API_KEY, IONOS_ZONE_ID_AIMILY

**In Vercel**: All except SUPABASE_MANAGEMENT_TOKEN, IONOS_DNS_API_KEY, IONOS_ZONE_ID_AIMILY, RESEND_API_KEY (management-only).

---

## 17. KEY FILE INDEX

### Core Infrastructure
| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout: AuthProvider, SubscriptionProvider, CookieConsent, Analytics |
| `src/middleware.ts` | Token refresh, route protection |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server Supabase client |
| `src/lib/supabase-admin.ts` | Admin Supabase client (service role) |
| `src/lib/stripe.ts` | Stripe server init + PLANS config |
| `src/lib/stripe-client.ts` | Client-side Stripe.js loader |
| `src/lib/timeline-template.ts` | 4-block timeline: phases, milestones, date math |
| `src/lib/wizard-phases.ts` | Workspace unlock logic + phase progression |
| `src/lib/export-timeline-excel.ts` | Gantt → Excel export |

### Auth
| File | Purpose |
|------|---------|
| `src/contexts/AuthContext.tsx` | Auth state + methods |
| `src/components/auth/AuthModal.tsx` | Sign in/up modal |
| `src/app/auth/callback/route.ts` | PKCE exchange + smart redirects |
| `src/app/auth/forgot-password/page.tsx` | Password reset request |
| `src/app/auth/reset-password/page.tsx` | New password form |

### Billing
| File | Purpose |
|------|---------|
| `src/contexts/SubscriptionContext.tsx` | Subscription state + checkout + portal + usage |
| `src/app/api/billing/checkout/route.ts` | Stripe Checkout session |
| `src/app/api/webhooks/stripe/route.ts` | Stripe webhook handler |
| `src/components/billing/UpgradePrompt.tsx` | Upgrade prompt + usage badge |

### Collection Hub
| File | Purpose |
|------|---------|
| `src/app/collection/[id]/layout.tsx` | Hub layout (fetches plan, timeline, SKUs) |
| `src/app/collection/[id]/CollectionHubShell.tsx` | Client shell (SubscriptionGate + WizardLayout) |
| `src/components/collection/CollectionSidebar.tsx` | 4-block sidebar navigation |
| `src/components/wizard/WorkspaceGate.tsx` | Generic first-entry wizard gate |
| `src/components/wizard/WizardLayout.tsx` | Workspace layout wrapper |

### Workspace Components
| File | Purpose |
|------|---------|
| `src/components/planner/PlannerDashboard.tsx` | Product workspace |
| `src/components/brand/BrandWorkspace.tsx` | Brand workspace |
| `src/components/design/DesignWorkspace.tsx` | Design workspace |
| `src/components/prototyping/PrototypingWorkspace.tsx` | Prototyping workspace |
| `src/components/sampling/SamplingWorkspace.tsx` | Sampling workspace |
| `src/components/production/ProductionWorkspace.tsx` | Production workspace |
| `src/components/gtm/GoToMarketDashboard.tsx` | GTM workspace |
| `src/components/marketing/MarketingCreationScreen.tsx` | Marketing Screen 1 (4 cards) |
| `src/components/marketing/MarketingDistributionScreen.tsx` | Marketing Screen 2 (4 cards) |

### Marketing Cards (Creation — Block 4)
| File | Purpose |
|------|---------|
| `src/components/marketing/SalesDashboardCard.tsx` | KPIs + Recharts revenue curve + stories commercial + drop calendar |
| `src/components/marketing/ContentStudioCard.tsx` | Per-SKU visual pipeline + ContentEvolutionStrip |
| `src/components/marketing/ContentEvolutionStrip.tsx` | 4-level visual pipeline (Still Life → Editorial → Campaign → Video) |
| `src/components/marketing/ModelRosterPicker.tsx` | 28 aimily model headshot grid for editorial casting |
| `src/components/marketing/CommunicationsCard.tsx` | Copy, social, email, brand voice, SEO — wraps ContentStrategyCard |
| `src/components/marketing/PointOfSaleCard.tsx` | Wholesale order CRUD + web store placeholder |
| `src/components/marketing/ContentStrategyCard.tsx` | Content pillars + copy (wrapped by CommunicationsCard) |
| `src/components/marketing/CampaignVideoCard.tsx` | Video campaigns |

### Marketing Cards (Distribution — Block 4)
| File | Purpose |
|------|---------|
| `src/components/marketing/GoToMarketCard.tsx` | GTM strategy + PR |
| `src/components/marketing/ContentCalendarCard.tsx` | Content scheduling |
| `src/components/marketing/PaidGrowthCard.tsx` | Paid ads + growth |
| `src/components/marketing/LaunchCard.tsx` | Launch execution |

### AI Pipeline & Intelligence
| File | Purpose |
|------|---------|
| `src/lib/collection-intelligence.ts` | CIS core — recordDecision, getIntelligence, compilePromptContext (11 presets) |
| `src/lib/face-blur.ts` | Face blur preprocessing for editorial style references |
| `src/lib/prompts/prompt-context.ts` | buildPromptContext() — reads from CIS instead of empty setup_data paths |

---

## 18. ENTERPRISE READY PLAN — ALL PHASES COMPLETED

| Phase | Name | Status |
|-------|------|--------|
| 0 | Limpieza (OlaWave → aimily + RLS audit) | COMPLETED |
| 1 | Auth SSR + Middleware | COMPLETED |
| 2 | Auth Flows (password reset, email confirm, PKCE) | COMPLETED |
| 3 | SMTP + Email Templates (Resend + 4 branded templates) | COMPLETED |
| 4 | Google Sign-In (OAuth) | COMPLETED |
| 5 | Account + GDPR (export, deletion, privacy, terms) | COMPLETED |
| 6 | Security (RLS hardening, cookie consent) | COMPLETED |
| 7 | Deploy + Env Vars (Vercel config, DNS, analytics) | COMPLETED |

---

## 19. MARKETING BLOCK REDESIGN — V2 COMPLETE (2026-04-12)

Marketing Creation restructured from the original 4-card layout (Stories, Product Visuals, Campaign & Video, Content Strategy) to a new 4-card structure:

| Card | Component | Purpose |
|------|-----------|---------|
| Sales Dashboard | SalesDashboardCard | KPIs, Recharts revenue curve, stories commercial, drop calendar |
| Content Studio | ContentStudioCard | Per-SKU 4-level visual pipeline + 28 aimily model roster picker |
| Communications | CommunicationsCard | Copy, social, email, brand voice, SEO — wraps ContentStrategyCard |
| Point of Sale | PointOfSaleCard | Web store placeholder + wholesale order CRUD |

Marketing Distribution remains unchanged (GTM, Content Calendar, Paid & Growth, Launch).

Final routes: `/marketing/creation` and `/marketing/distribution`

---

## 19b. COLLECTION INTELLIGENCE SYSTEM (CIS) — UPDATED 2026-04-14

### 🚨 ARCHITECTURE LOCK — DO NOT MODIFY WITHOUT EXPLICIT APPROVAL

The CIS is the backbone of aimily's AI quality. It captures decisions made throughout the collection workflow and feeds them into EVERY AI prompt server-side. This is the #1 competitive advantage of the platform — the "wow moment" when AI proposes perfect results because it has full context.

### Core Components

| Component | Path | Purpose |
|-----------|------|---------|
| **CIS Core** | `src/lib/collection-intelligence.ts` | `recordDecision()`, `getIntelligence()`, `compilePromptContext()` with 11 presets |
| **Prompt Context Builder** | `src/lib/prompts/prompt-context.ts` | `buildPromptContext()` — reads from 11 DB tables + CIS decisions in parallel |
| **Full Context Loader** | `src/lib/ai/load-full-context.ts` | `loadFullContext()` — CIS + Creative workspace + Brief answers + Collection plan |
| **Inherited Context** | `src/lib/ai/prompt-foundations.ts` | `buildInheritedContext()` — formats context fields into prompt text |
| **API** | `GET/POST /api/collection-intelligence` | Direct CIS read/write |
| **Hook** | `useCollectionIntelligence` | Client-side CIS access |
| **DB Table** | `collection_decisions` | domain, subdomain, key, value JSONB, tags[], version, rationale, source |

### Data Flow: How AI Gets Context

```
User makes decisions in UI (Block 1-4)
        ↓
recordDecision() → collection_decisions table (versioned, never overwritten)
        ↓
User clicks "AI Proposal" / "Generate" / "Regenerate"
        ↓
Frontend sends collectionPlanId to API endpoint
        ↓
loadFullContext(collectionPlanId) runs SERVER-SIDE:
  1. buildPromptContext() → CIS (11 DB tables + collection_decisions)
  2. Creative workspace → consumer proposals, vibe narrative, brandDNA, trends, moodboard, synthesis
  3. Collection plan → name, season, productCategory (with SKU fallback)
  4. Brief answers → user's original input that started the collection
        ↓
mergeContextWithInput() → server data fills gaps, frontend data preserved
        ↓
buildInheritedContext() → formats into prompt text blocks:
  - PRODUCT CATEGORY (with constraint)
  - TARGET CONSUMER
  - COLLECTION VIBE
  - BRAND DNA
  - SELECTED TRENDS
  - MOODBOARD & VISUAL RESEARCH
  - CREATIVE SYNTHESIS
  - ORIGINAL BRIEF
  - EXISTING SKUs
  - PRODUCT FAMILIES
  - PRICING ARCHITECTURE
  - DISTRIBUTION CHANNELS
  - TARGET MARKETS
        ↓
AI receives MAXIMUM context → generates contextually perfect results
```

### Endpoint Coverage (13/13 critical endpoints)

| Endpoint | Block | Context Source |
|----------|-------|---------------|
| `creative-generate` | Block 1 | `loadFullContext` |
| `merch-generate` | Block 2 | `loadFullContext` |
| `design-generate` | Block 3 | `loadFullContext` |
| `stories/generate` | Block 4 | `buildPromptContext` (original) |
| `content-strategy/generate` | Block 4 | `loadFullContext` |
| `copy/generate` | Block 4 | `loadFullContext` |
| `gtm/generate` | Block 4 | `loadFullContext` |
| `launch/generate` | Block 4 | `buildPromptContext` (original) |
| `post-launch/generate` | Block 4 | `buildPromptContext` (original) |
| `content-calendar/generate` | Block 4 | `loadFullContext` |
| `paid/generate` | Block 4 | `loadFullContext` |
| `generate-skus` | Builder | `loadFullContext` |
| `freepik/editorial` | Images | `loadFullContext` |
| `freepik/still-life` | Images | `loadFullContext` |
| `freepik/tryon` | Images | `loadFullContext` |
| `market-prediction` | Analytics | `loadFullContext` |

### Endpoints that DO NOT need CIS (21 utility endpoints)

`brief/*` (4), `analyze-moodboard`, `analyze-text`, `detect-zones`, `explore-trends`, `market-trends`, `freepik/sketch`, `freepik/video`, `freepik/brand-model`, `colorize-sketch`, `generate-sketch-options`, `generate-techpack`, `propose-comments`, `generate-plan`, `vectorize` (deprecated)

### 🔒 RULES — NEVER BREAK THESE

1. **Context is ALWAYS server-side.** No AI endpoint may depend solely on frontend-sent context. The frontend sends `collectionPlanId` and optional user input (direction, preferences). The server loads everything else from the DB.

2. **`loadFullContext()` is the single entry point.** All new AI endpoints MUST use `loadFullContext` from `src/lib/ai/load-full-context.ts`. Do NOT create endpoint-specific context loaders.

3. **`mergeContextWithInput()` preserves frontend data.** Server context only fills empty fields. If the frontend explicitly sends a value, it wins. This ensures backwards compatibility.

4. **Frontend changes NEVER touch context loading.** UI/design changes must not modify how AI endpoints receive context. If you're changing a component's layout, you should NOT be touching `loadFullContext`, `buildPromptContext`, `buildInheritedContext`, or any API route.

5. **New context fields go through `buildInheritedContext`.** If a new data type needs to reach AI prompts, add it to: (a) `loadFullContext` extraction, (b) `buildInheritedContext` formatting, (c) the relevant prompt template. All three. Never skip one.

6. **CIS decisions are versioned, never deleted.** `recordDecision()` marks old versions as `is_current=false` and inserts a new version. Full history is preserved.

7. **12 capture points** exist across Creative, Merchandising, Design, and Marketing blocks. Each one calls `recordDecision()` when the user confirms a decision. Adding new blocks must include CIS capture.

### CIS Presets (compilePromptContext)

| Preset | Domains/Tags | Used By |
|--------|-------------|---------|
| `editorial_prompt` | `affects_photography` | Editorial, Still Life |
| `still_life_prompt` | `affects_photography` | Still Life |
| `copy_prompt` | `affects_content` | Copy, SEO |
| `seo_prompt` | `affects_seo` | SEO |
| `story_generation` | creative, merchandising, design | Stories |
| `sales_forecast` | merchandising, sales, finance | Sales Dashboard |
| `web_design` | `affects_web` | POS |
| `wholesale_pitch` | creative, merchandising, design, sales | Wholesale |
| `content_calendar` | `affects_content` | Calendar |
| `launch_strategy` | creative, merchandising, marketing, sales | Launch |
| `paid_campaign` | marketing, merchandising | Paid Ads |
| `full` | (everything) | Default |

## 19c. EDITORIAL AI PIPELINE UPDATES (2026-04-12)

- **Editorial endpoint** (`/api/ai/freepik/editorial`) supports 3 reference images:
  1. Product render (preserve exactly)
  2. Style reference (face-blurred via `src/lib/face-blur.ts` for pose/lighting/composition only)
  3. Model headshot (28 aimily model roster — face identity)
- **Model casting selectors**: complexion, age, hair in editorial prompt
- **Face blur preprocessing**: `src/lib/face-blur.ts` — blurs face in style reference so Nano Banana uses only the aimily model's headshot for face identity
- **28 aimily models**: stored in `aimily_models` table (migration 020), rendered via `ModelRosterPicker` component
- **3 visual categories = 3 endpoints** (architecture lock):
  - `/api/ai/freepik/still-life` — object, no humans
  - `/api/ai/freepik/editorial` — on-model narrative
  - `/api/ai/freepik/tryon` — brand-model catalog

---

## 20. GOING LIVE CHECKLIST (When Stripe verified)

1. Create Starter + Professional products/prices in Stripe LIVE mode
2. Swap test keys → live keys (`sk_live_`, `pk_live_`)
3. Create new webhook endpoint with live secret
4. Update all STRIPE_* env vars in `.env.local` and Vercel
5. Enable Stripe Tax in live mode
6. Configure Customer Portal branding in Stripe Dashboard
7. Wire feature gating into actual AI routes (`trackAIUsage` exists but not called yet)
8. Implement collection count limit enforcement
9. Implement user count limit enforcement
10. Implement trial expiry logic (14-day countdown)

---

## 21. NOT YET IMPLEMENTED (audit refreshed 2026-05-06)

### ✅ Resolved since 2026-04-12 audit
- ✅ Stripe LIVE mode (April 2026) — all plans verified, branded checkout, refund flow
- ✅ Customer Portal configured (April 2026)
- ✅ Trial 30-day no-card flow (May 2026 pricing rebrand)
- ✅ Pricing v5 LIVE — Founder/Team/Team Pro/Student tiers (May 2026)
- ✅ Imagery quota atomic via `consume_imagery_units` RPC + per-user rate limit (April 2026)
- ✅ Web (Ecom Storefront) + SEO Research module SHIPPED (May 2026 · sections 22+23)
- ✅ Wholesale moved to Block 2 (May 2026 · section 24)
- ✅ Vercel Analytics on storefronts (per-host event tagging, GDPR-default)

### Billing & Limits (still pending)
- Feature gating not wired into actual AI routes for collaboration/multi-brand limits
- No collection count limit enforcement (Founder/Team plan caps)
- No user count limit enforcement (Team plan: 10 users)
- Storefront quota IS enforced via `can_publish_storefront` RPC (Sprint 1 Ecom)

### Creative Block Gaps
- Creative Synthesis step is placeholder (no consolidation logic)
- Pinterest integration: button exists, no backend
- No DB persistence for Creative block data (in-memory only, lost on navigation)
- Moodboard images use blob URLs (not persisted to Supabase)

### Merchandising Block Gaps
- No DB persistence for Merchandising card data (in-memory only)

### Design & Dev Block Gaps (workspaces funcionales, consolidación pendiente)
- Design workspace: Lasts/Forms, Design Review, Patterns use localStorage (3/4 secciones sin DB; Colorways sí usa DB)
- `/api/ai/design-generate` endpoint exists (4 types) but NO UI buttons call it
- Prototyping (641 LOC), Sampling (904 LOC), Production (1,201 LOC) are **fully functional with DB hooks** (useSampleReviews, useProductionOrders, useColorways)
- Each workspace tracks its own milestones correctly (Design: dd-1→dd-6, Proto: dd-7→dd-10, Sampling: dd-11→dd-14, Production: dd-15→dd-18)
- Plan to consolidate all 4 as Collection Builder layers NOT executed — remain as separate workspace routes
- No image upload (URL paste only in Design Review)

### Other
- `password_hibp_enabled` requires Supabase Pro plan

---

## 22. ECOM BLOCK · DTC STOREFRONT GENERATOR (NEW · 2026-05-05)

**Status**: ✅ SHIPPED end-to-end · 12 PRs · Sprints 1-10. Marketing copy "Web · landing · DTC + integración" + "SEO · research · on-page" en `PoweredBy.tsx` ahora 100% honesto.

### 22.1 Quick reference
- **Card location**: `04.4 Ecom` inside Marketing & Sales (renamed from Point of Sale)
- **Public route**: `<sub>.aimily.shop` per brand (custom domain V2)
- **Hosting**: Vercel Pro wildcard CNAME · per-subdomain SSL via Vercel API on publish
- **12 themes** (all working): editorial-heritage · minimal-architect · streetwear-drop · romantic-feminine · resort-luxe · sustainable-craft · workwear-heritage · performance-tech · y2k-digital-native · avant-garde-concept · drop-lookbook (single-page) · linkinbio-plus (single-page mobile-first)
- **Payment providers**: Stripe Buy Button · Shopify Buy SDK · Lookbook-only (default). Aimily NEVER touches money.

### 22.2 DB tables (migration 046_ecom_storefronts.sql)
```
storefronts             1 row per published collection · UNIQUE(collection_plan_id) · subdomain UNIQUE
storefront_overrides    copy edits per page (page_id + field_overrides JSONB) · clone of presentation_deck_overrides pattern
storefront_publishes    audit trail (publish/unpublish/rebuild/domain_change/theme_change)
subscriptions.storefront_quota   ALTER · 1/5/25/999 per plan
can_publish_storefront(uuid)     RPC · enforced by /api/ecom/publish
storefronts_unpublish_on_collection_delete   trigger · cascades soft-delete
```

### 22.3 SSR pipeline
```
Visitor https://slaiz.aimily.shop/shop/sku123
  → DNS *.aimily.shop → Vercel
    → middleware: extractStorefrontHost(host) → rewrite /storefront/<encoded-host>/shop/sku123
      → layout.tsx: loadStorefrontByHost (decodes URL) + loadTheme + injects CSS tokens
        → page.tsx: loadStorefrontData (CIS canonical, throws StorefrontDataMissingError if missing)
          → applyOverrides → theme.pages.pdp(data, skuId)
            → BuyButton renders <stripe-buy-button> | Shopify Buy SDK | Coming Soon
```

### 22.4 CIS-canonical loader (NO fallbacks · throws on missing data)
```
creative.identity.brand_name        → brand.name
creative.identity.collection_vibe   → tagline (1st line) + manifesto (full)
creative.identity.typography        → parsed display + body fonts (regex)
creative.color.primary_palette      → hex extraction from "#XXXXXX (note)" array
marketing.voice.tone                → brand.voice.tone
marketing.voice.personality         → brand.voice.keywords
creative.inspiration.competitors    → brand.voice.values
brand.contact.{email,instagram,address}  → opt-in (not fallbacks)
```

When required field is missing → `StorefrontDataMissingError` lists missing fields, publish endpoint surfaces "complete Block 1 Creative & Brand" message, SSR returns 404. **NO defaults silently mask incomplete CIS** (rule from `feedback_no-fallbacks-arreglar-origen.md`).

### 22.5 EcomCard sub-sections (3, all DTC-pure)
```
src/components/marketing/EcomCard.tsx (47 LOC, cleaned Sprint 10)
├── EcomHub          publish flow: subdomain input · 12 themes picker · payment connect (Stripe/Shopify wizards) · publish button · live preview iframe
├── SeoResearchHub   4 tabs: Keywords · On-page meta · Competitors · Audit (see section 23)
└── OverridesEditor  inline edit · 6 fields (hero.title, collection.narrative, brand.manifesto, contact.{email,instagram,address}) · save+republish in seconds
```

### 22.6 Per-subdomain SSL strategy (why not wildcard)
- Cloudflare Free does NOT allow proxied wildcard records (Business+ only)
- Vercel can't emit wildcard SSL without DNS-01 challenge access (Cloudflare DNS doesn't expose this externally)
- Cloudflare Registrar locks NS to Cloudflare nameservers for 60 days post-registration (2026-05-05 → 2026-07-04)
- **Solution**: per-subdomain SSL via Vercel API on publish. Same pattern as Linktree/Substack/Notion custom domains. Let's Encrypt 50 certs/week per registered domain (sufficient for 100s of brands publishing/republishing weekly).
- **Migration path** (post 2026-07-04): can transfer aimily.shop to Vercel Domains for native wildcard SSL. The publish endpoint changes (Vercel API per-domain registration) become unnecessary at that point.

### 22.7 Endpoints (new under `/api/ecom/`)
```
POST /api/ecom/publish                      upsert + Vercel registerStorefrontDomain + audit + revalidateTag
POST /api/ecom/unpublish                    set published_at NULL + Vercel unregisterStorefrontDomain
GET  /api/ecom/check-subdomain              live availability (regex + reserved + DB uniqueness)
GET/PATCH /api/ecom/storefront/[id]         theme/payment/SEO edits (NOT subdomain — use /publish)
GET  /api/ecom/storefront-by-collection/[planId]   hub UI hydration
GET/POST /api/ecom/override                  per-page copy overrides upsert
```

### 22.8 Public storefront routes
```
src/app/(storefront)/storefront/[host]/
├── layout.tsx                               theme tokens + Google Fonts + GdprBanner + Vercel Analytics
├── page.tsx                                 Home + JSON-LD Organization
├── shop/page.tsx                            PLP
├── shop/[sku]/page.tsx                      PDP + JSON-LD Product
├── lookbook/page.tsx
├── about/page.tsx
├── contact/page.tsx
├── sitemap.xml/route.ts                     dynamic per-host XML
├── robots.txt/route.ts                      allow + sitemap pointer
├── og.png/route.tsx                         dynamic next/og 1200×630 with brand palette
└── not-found.tsx
```

### 22.9 Theme system (factory pattern)
- 5 themes use `createAllPages(visualConfig)` factory from `src/lib/storefront/shared/page-templates.tsx` (~70 LOC each)
- 1 theme (editorial-heritage) has bespoke pages with custom Header/Footer/ProductCard
- 2 themes (drop-lookbook, linkinbio-plus) are single-page bespoke layouts
- Total: 12 themes in ~1100 LOC (vs ~5000 if each had its own pages)

### 22.10 Reference docs
- `memory/architecture-ecom.md` — full living doc (file map, decisions log, future migration)
- `memory/credentials_cloudflare-aimily-shop.md` — Cloudflare token reference
- `memory/feedback_no-fallbacks-arreglar-origen.md` — the rule that drove the CIS-canonical loader

---

## 23. SEO RESEARCH MODULE (NEW · 2026-05-06 · Sprint 7)

**5 endpoints + SeoResearchHub UI** — backs the "SEO ~€100/mo replaced" claim in PoweredBy.tsx.

### 23.1 Endpoints (under `/api/ai/seo-*`)
| Endpoint | Body | Returns |
|---|---|---|
| `/seo-keywords`    | `{collectionPlanId}` | 18 keywords (6 transactional + 6 informational + 6 brand) with intent + difficulty_hint + rationale |
| `/seo-onpage`      | `{collectionPlanId, page, skuId?}` | meta_title, meta_description, og_title, og_description, h1, image_alt_pattern (page-specific from CIS) |
| `/seo-competitors` | `{collectionPlanId}` | 5-7 ranking brands with keywords sample + content_strengths + gaps_for_us |
| `/seo-audit`       | `{storefrontId}` | fetches live storefront HTML + 12 heuristic checks (title, meta, OG, Twitter card, h1, JSON-LD, lang, viewport, sitemap, robots) → score + recommendations |
| `/seo-copy`        | `{collectionPlanId, skuId}` | SEO-optimized 60-90w product description + primary/secondary keywords + suggested meta |

All endpoints use `generateJSON` via Claude Haiku/Gemini fallback with rate limit per user.
Throw `data_incomplete` if Brand DNA (creative.identity.brand_name) missing — same NO FALLBACKS rule as the storefront loader.

### 23.2 UI · SeoResearchHub
`src/components/ecom/SeoResearchHub.tsx` (~280 LOC) — 4 tabs (Keywords · On-page · Competitors · Audit) with editorial pill nav, per-tab generate button + loading + error inline. Lives inside EcomCard below EcomHub.

### 23.3 Prompts library
`src/lib/ai/seo/prompts.ts` — 4 prompt builders, all return JSON shape. Single-source; reused across endpoints.

---

## 24. WHOLESALE ORDERS (moved 2026-05-06 · Sprint 10)

Was inside EcomCard (Marketing 04.4). Moved to **Block 2 Merchandising > `?block=wholesale`** (semantically B2B distribution, not DTC ecom).

- Component: `src/components/merchandising/WholesaleOrdersCard.tsx` (self-contained: hooks + state + UI)
- Page route: `/collection/[id]/merchandising?block=wholesale` renders dedicated workspace with hero header
- Sidebar: new sub-block `wholesale` between `channels` and `budget` in Block 2
- i18n: `wholesale: 'Wholesale'` key in 9 locales
