# OLAWAVE WIND — Master Plan v2.0

## Vision

Transform OlaWave into the **ultimate fashion brand operating system** — a visually stunning, AI-powered platform where every phase of creating a collection is an inspiring, creative experience. From moodboarding to AI-generated lookbooks, from brand identity to launch day — everything lives in one beautiful workspace.

**Core principles**:
1. **Every milestone = a real tool** in OlaWave. Calendar milestones auto-update as work gets done.
2. **Visual-first** — every module is designed to inspire. Moodboards, galleries, visual reviews, beautiful layouts.
3. **AI-native** — fal.ai powers image generation (FASHN for fashion, Flux 2 for editorial, Kling 3.0 for video). Claude/Gemini power text. AI is everywhere.
4. **One platform** — no need for Figma, Canva, Klaviyo, or spreadsheets. OlaWave does it all.

## AI Stack

| Service | Provider | Use Case | API |
|---|---|---|---|
| **Virtual Try-On** | FASHN v1.6 via fal.ai | Flat-lay → on-model photos | `fal-ai/fashn/tryon/v1.6` |
| **Model Creation** | FASHN via fal.ai | Generate custom AI models for the brand | `fal-ai/fashn/model-create` |
| **Product-to-Model** | FASHN via fal.ai | Put product on any model | `fal-ai/fashn/product-to-model` |
| **Editorial/Lifestyle** | Flux 2 Pro via fal.ai | Campaign shots, lifestyle scenes | `fal-ai/flux-2-pro` |
| **Image-to-Video** | Kling 3.0 via fal.ai | Transform photos into fashion videos | `fal-ai/kling-video/v3/standard` |
| **Text Generation** | Claude Sonnet | Brand stories, product copy, email flows | Anthropic API |
| **Analysis/Short-form** | Gemini 2.5 Flash | Trend analysis, captions, SEO | Google AI API |
| **Tech Sketches** | OpenAI gpt-image-1 | Technical fashion sketches (SketchFlow) | OpenAI API |

**Single dependency**: `@fal-ai/client` with existing `FAL_KEY` in `.env.local`.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    COLLECTION HUB                           │
│  /collection/[id] — single entry point per collection       │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Calendar  │  │ Overview │  │ Finances │  │ Settings │   │
│  │ (Gantt)   │  │ (Status) │  │ (P&L)    │  │ (Team)   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              PHASE MODULES (9 tabs)                  │   │
│  │  Product | Brand | Design | Proto | Sample |         │   │
│  │  Digital | Marketing | Production | Launch           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Each phase module contains:                                │
│  • Milestone checklist (auto-synced with calendar)          │
│  • Phase-specific tools (uploads, AI generators, trackers)  │
│  • File/asset library for that phase                        │
│  • Notes & communication thread                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Supabase Schema Expansion

### New Tables

```sql
-- 1. Central asset/file management
CREATE TABLE collection_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_plan_id uuid NOT NULL REFERENCES collection_plans(id) ON DELETE CASCADE,
  milestone_id text,                    -- links to timeline milestone (e.g. "br-2")
  phase text NOT NULL,                  -- e.g. 'brand', 'design', 'sampling'
  asset_type text NOT NULL,             -- 'image', 'pdf', 'svg', 'video', 'document', 'link'
  name text NOT NULL,
  description text,
  url text NOT NULL,                    -- Supabase Storage URL or external link
  thumbnail_url text,
  file_size integer,
  metadata jsonb DEFAULT '{}',          -- flexible: { width, height, pantone, version, etc. }
  version integer DEFAULT 1,
  status text DEFAULT 'draft',          -- 'draft', 'review', 'approved', 'rejected'
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Design review & feedback
CREATE TABLE asset_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES collection_assets(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL,          -- could be user or external name
  status text NOT NULL,                 -- 'approved', 'rejected', 'changes_requested'
  comments text,
  annotations jsonb,                    -- [{ x, y, width, height, text }] for image markup
  created_at timestamptz DEFAULT now()
);

-- 3. Brand identity module
CREATE TABLE brand_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_plan_id uuid UNIQUE NOT NULL REFERENCES collection_plans(id) ON DELETE CASCADE,
  brand_name text,
  tagline text,
  brand_story text,
  brand_voice jsonb,                    -- { tone, keywords[], personality, doNot[] }
  target_audience jsonb,                -- { demographics, psychographics, lifestyle }
  competitors jsonb,                    -- [{ name, positioning, priceRange }]
  naming_options jsonb,                 -- [{ name, available, notes }]
  logo_asset_id uuid REFERENCES collection_assets(id),
  primary_colors jsonb,                 -- [{ hex, pantone, name, usage }]
  secondary_colors jsonb,
  typography jsonb,                     -- { primary: { family, weight }, secondary: {...} }
  guidelines_asset_id uuid REFERENCES collection_assets(id),
  packaging_notes text,
  status text DEFAULT 'in-progress',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Colorway management per SKU
CREATE TABLE sku_colorways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id uuid NOT NULL REFERENCES collection_skus(id) ON DELETE CASCADE,
  name text NOT NULL,                   -- e.g. "Midnight Navy", "Sand"
  hex_primary text NOT NULL,
  hex_secondary text,
  hex_accent text,
  pantone_primary text,
  pantone_secondary text,
  material_swatch_url text,
  status text DEFAULT 'proposed',       -- 'proposed', 'sampled', 'approved', 'production'
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 5. Proto/Sample QA tracking
CREATE TABLE sample_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_plan_id uuid NOT NULL REFERENCES collection_plans(id) ON DELETE CASCADE,
  sku_id uuid REFERENCES collection_skus(id) ON DELETE SET NULL,
  milestone_id text,                    -- e.g. 'pt-3', 'sm-3'
  review_type text NOT NULL,            -- 'white_proto', 'color_sample', 'fitting_sample', 'production_sample'
  status text DEFAULT 'pending',        -- 'pending', 'issues_found', 'approved', 'rejected'
  overall_rating integer,               -- 1-5
  fit_notes text,
  construction_notes text,
  material_notes text,
  color_notes text,
  measurements_ok boolean,
  photos jsonb,                         -- [{ url, caption, issue_area? }]
  issues jsonb,                         -- [{ area, severity, description, photo_url? }]
  rectification_notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Content & marketing calendar
CREATE TABLE content_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_plan_id uuid NOT NULL REFERENCES collection_plans(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_type text NOT NULL,           -- 'post', 'story', 'reel', 'email', 'blog', 'ad', 'pr'
  platform text,                        -- 'instagram', 'tiktok', 'email', 'website', 'pinterest', 'facebook', 'google_ads'
  scheduled_date date NOT NULL,
  scheduled_time time,
  status text DEFAULT 'idea',           -- 'idea', 'draft', 'review', 'approved', 'scheduled', 'published'
  caption text,
  hashtags text[],
  asset_ids uuid[],                     -- references to collection_assets
  target_audience text,
  campaign text,                        -- groups content into campaigns (e.g. "teasing", "launch_week")
  performance jsonb,                    -- { impressions, reach, engagement, clicks, conversions } — post-publish
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. Influencer/PR contacts
CREATE TABLE pr_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_plan_id uuid NOT NULL REFERENCES collection_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,                   -- 'influencer', 'media', 'stylist', 'buyer', 'celebrity'
  platform text,                        -- primary platform
  handle text,
  followers integer,
  email text,
  phone text,
  agency text,
  rate_range text,                      -- e.g. "$500-1000"
  notes text,
  status text DEFAULT 'prospect',       -- 'prospect', 'contacted', 'confirmed', 'shipped', 'posted', 'declined'
  outreach_date date,
  ship_date date,
  post_date date,
  tracking_number text,
  post_url text,
  performance jsonb,                    -- { impressions, engagement, clicks }
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. Production orders
CREATE TABLE production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_plan_id uuid NOT NULL REFERENCES collection_plans(id) ON DELETE CASCADE,
  order_number text,
  factory_name text,
  factory_contact text,
  status text DEFAULT 'draft',          -- 'draft', 'sent', 'confirmed', 'in_production', 'qc', 'shipped', 'delivered'
  order_date date,
  estimated_delivery date,
  actual_delivery date,
  total_units integer,
  total_cost decimal(12,2),
  currency text DEFAULT 'EUR',
  shipping_method text,
  tracking_number text,
  line_items jsonb,                     -- [{ sku_id, sku_name, colorway, size_run: {}, units, unit_cost }]
  quality_notes text,
  documents jsonb,                      -- [{ name, url, type }] — PO PDF, invoices, packing lists
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 9. Lookbook / campaign shoots
CREATE TABLE campaign_shoots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_plan_id uuid NOT NULL REFERENCES collection_plans(id) ON DELETE CASCADE,
  name text NOT NULL,                   -- e.g. "SS27 Lookbook", "Campaign Video"
  shoot_type text NOT NULL,             -- 'lookbook', 'campaign', 'product', 'lifestyle', 'video'
  shoot_date date,
  location text,
  photographer text,
  stylist text,
  models text,
  mood_description text,
  shot_list jsonb,                      -- [{ description, sku_ids[], setup_notes }]
  status text DEFAULT 'planning',       -- 'planning', 'scheduled', 'shot', 'editing', 'delivered'
  deliverables jsonb,                   -- [{ type, format, quantity, due_date, status }]
  budget decimal(10,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 10. AI generation jobs (unified queue for all AI image/content generation)
CREATE TABLE ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_plan_id uuid REFERENCES collection_plans(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  generation_type text NOT NULL,        -- 'tryon', 'product_render', 'lifestyle', 'editorial', 'ad_creative', 'video', 'copy'
  prompt text NOT NULL,
  input_data jsonb,                     -- { reference_images[], sku_id, model_id, style, format, etc. }
  output_data jsonb,                    -- { images: [{ url, base64 }], video_url, text, variants[] }
  fal_request_id text,                  -- fal.ai request ID for status polling
  model_used text,                      -- 'fashn-tryon-v1.6', 'flux-2-pro', 'kling-3.0', 'claude', 'gemini'
  cost_credits decimal(8,4),            -- cost tracking
  status text DEFAULT 'pending',        -- 'pending', 'processing', 'completed', 'failed'
  is_favorite boolean DEFAULT false,    -- user marked as best
  error text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- 11. Brand AI models (persistent virtual models for the brand)
CREATE TABLE brand_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_plan_id uuid NOT NULL REFERENCES collection_plans(id) ON DELETE CASCADE,
  name text NOT NULL,                   -- e.g. "Main Female Model", "Street Style Male"
  gender text,                          -- 'female', 'male', 'non-binary'
  age_range text,                       -- e.g. '20-25', '30-35'
  ethnicity text,
  body_type text,
  hair_description text,
  style_vibe text,                      -- e.g. 'editorial', 'streetwear', 'classic'
  reference_image_url text,             -- base image for the model
  fal_model_id text,                    -- ID from FASHN model creation
  preview_images jsonb,                 -- [{ url, pose }] preview shots
  created_at timestamptz DEFAULT now()
);

-- 12. Lookbook pages (for the visual lookbook builder)
CREATE TABLE lookbook_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_plan_id uuid NOT NULL REFERENCES collection_plans(id) ON DELETE CASCADE,
  lookbook_name text NOT NULL DEFAULT 'Main Lookbook',
  page_number integer NOT NULL,
  layout_type text NOT NULL,            -- 'full_bleed', 'two_column', 'grid_4', 'text_image', 'cover', 'quote'
  content jsonb NOT NULL,               -- [{ type: 'image'|'text'|'product_info', asset_id?, text?, sku_id?, position, size }]
  background_color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Storage Buckets

```
supabase storage:
  collection-assets/          — all uploaded files (images, PDFs, swatches)
    {collection_plan_id}/
      brand/                  — logos, guidelines, packaging mockups
      design/                 — sketches, patterns, colorway swatches
      samples/                — proto photos, fitting photos
      campaign/               — lookbook shots, campaign images
      marketing/              — ad creatives, social content
      production/             — PO documents, invoices
  ai-renders/                 — AI-generated images
    {collection_plan_id}/
      product/                — product renders
      lookbook/               — AI lookbook images
      ads/                    — ad creatives
```

---

## Implementation Phases

### PHASE 1: Collection Hub & Calendar Association
**Goal**: Single entry point per collection with calendar auto-link

**New page**: `/collection/[id]` — Collection Hub with sidebar nav

**Tasks**:
1. Create Collection Hub layout (`/collection/[id]/layout.tsx`)
   - Sidebar: Calendar | Overview | Product | Brand | Design | Prototyping | Sampling | Digital | Marketing | Production | Launch
   - Each section maps to a timeline phase
   - Top bar: collection name, season, launch date, progress %

2. Calendar association flow:
   - When creating a new collection in `/my-collections`, auto-create a `collection_timelines` entry
   - Show "Choose Calendar Template" modal: default 48-week, or clone from existing standalone
   - Calendar is always linked to collection from day 1

3. Auto-status sync:
   - When milestone work is done in a phase module, mark the calendar milestone as completed
   - Add `linked_milestone_id` concept to relevant tables
   - Progress bar per phase calculated from milestone completion

4. Migrate existing planner + GTM into the hub:
   - `/collection/[id]/product` = current `/planner/[id]`
   - `/collection/[id]/go-to-market` = current `/go-to-market/[id]`
   - `/collection/[id]/calendar` = current `/collection-calendar/[id]`
   - Keep old routes as redirects

**Supabase migrations**:
- `collection_assets` table
- Supabase Storage bucket `collection-assets`

**Estimated scope**: ~15 files, 3 new components

---

### PHASE 2: Brand & Identity Module
**Goal**: Complete brand definition workspace

**New page**: `/collection/[id]/brand`

**Tasks**:
1. Brand Profile workspace:
   - Brand naming brainstorm board (add/vote/rank options)
   - Brand story editor (rich text with AI assist)
   - Brand voice definition (tone, personality, do/don't)
   - Target audience canvas
   - Competitor mapping

2. Visual Identity hub:
   - Logo upload with version history (`collection_assets` with `version`)
   - Color palette builder (primary + secondary + accent)
   - Pantone code assignment
   - Typography selector
   - Review/approve workflow

3. Brand Guidelines auto-generator:
   - Pull brand_name, colors, typography, logo from `brand_profiles`
   - Generate PDF guidelines using template
   - Save as `collection_assets` type='pdf'

4. Packaging Design tracker:
   - Upload packaging design versions
   - Feedback/annotation on designs
   - Approval workflow

**Supabase migrations**:
- `brand_profiles` table
- `asset_reviews` table

**AI integrations**:
- Brand story generation (Gemini/Claude)
- Naming suggestions (Gemini)
- Color palette harmony suggestions

**Calendar auto-sync**: br-1, br-2, br-3, br-4 → update based on `brand_profiles` completion

---

### PHASE 3: Design & Colorway Module
**Goal**: Full design development pipeline with colorway management

**New page**: `/collection/[id]/design`

**Tasks**:
1. Last/Form definition:
   - Form specification cards per SKU
   - Measurement table with standard sizes
   - Link to factory form catalog (external links)

2. Design Review Hub:
   - Upload design iterations (Shot 1, Shot 2)
   - Side-by-side comparison view
   - Annotation tool (click on image to leave feedback)
   - Version history per SKU
   - Approval routing (draft → review → approved)

3. Colorway Manager:
   - Per-SKU colorway cards
   - Color picker + Pantone lookup
   - Material swatch upload
   - Status tracking: proposed → sampled → approved → production
   - Bulk colorway view across collection

4. Pattern Management:
   - Upload pattern files (PDF/AI/DXF)
   - Grading notes
   - Link patterns to SKUs

**Supabase migrations**:
- `sku_colorways` table

**AI integrations**:
- AI color harmony suggestions from moodboard
- Colorway variation generator (image-based)

**Calendar auto-sync**: ds-1 through ds-5 → based on design assets + colorways status

---

### PHASE 4: Prototyping & Sampling QA
**Goal**: Proto/sample tracking with photo-based QA

**New page**: `/collection/[id]/prototyping` and `/collection/[id]/sampling`

**Tasks**:
1. Proto tracking dashboard:
   - Per-SKU proto status cards
   - Photo upload per proto (multiple angles)
   - Issue logger (area, severity, description, photo)
   - Rectification checklist
   - Side-by-side: design sketch vs actual proto

2. Sample review:
   - Color sample review per colorway
   - Fitting sample feedback form (fit, construction, material, color)
   - Measurement validation table (spec vs actual)
   - Overall rating (1-5 stars)
   - Approval workflow

3. Auto-generate tech sheets:
   - Pull from SketchFlow (sketches, construction notes)
   - Pull from SKU data (materials, colorways, measurements)
   - Compile into downloadable PDF tech pack
   - Update status when all tech sheets are complete

**Supabase migrations**:
- `sample_reviews` table

**Calendar auto-sync**: pt-1 to pt-4, sm-1 to sm-4

---

### PHASE 5: AI Creative Studio (fal.ai powered)
**Goal**: Full AI image & video generation hub — product renders, lookbooks, campaign visuals, video content

**New pages**:
- `/collection/[id]/studio` — Main creative studio
- `/collection/[id]/studio/lookbook` — Lookbook builder

**Dependency**: `npm install @fal-ai/client` (uses existing `FAL_KEY` from `.env.local`)

**Tasks**:

1. **Product Render Generator** (`/collection/[id]/studio`):
   - Visual gallery layout with SKU selector sidebar
   - Select SKU → see flat-lay/sketch from SketchFlow or uploaded photo
   - Choose generation mode:
     - **On-Model** (FASHN Try-On): pick model type (gender, ethnicity, body type, pose) → generates product on model
     - **Studio Shot** (Flux 2): choose background (white studio, marble, gradient, custom) → clean product photo
     - **Lifestyle** (Flux 2): choose scene (street, cafe, beach, office, runway) → editorial context shot
   - Each generation shows 2-4 variations to choose from
   - Favorite/approve the best → saved to `collection_assets`
   - **Batch mode**: select multiple SKUs → queue all generations → process in background
   - Beautiful masonry gallery of all generated images with filters (by SKU, by type, by status)

2. **AI Model Studio**:
   - Create persistent AI models for the brand using FASHN Model Create
   - Define: gender, age range, ethnicity, body type, hair, style vibe
   - Save as "brand models" — reuse across all product shoots for visual consistency
   - Model gallery with preview shots

3. **Lookbook Builder** (`/collection/[id]/studio/lookbook`):
   - Visual drag-and-drop page builder (magazine-style layout)
   - Page templates: full-bleed image, 2-column, grid, text+image, quote page
   - Drag images from the asset gallery (AI-generated or uploaded)
   - Add text blocks with brand fonts (from `brand_profiles`)
   - Add product info overlays (name, price, colorway from SKU data)
   - Cover page with collection name, season, brand logo
   - **AI-assist**: "Generate a lookbook spread for [SKU]" → picks best renders + writes copy
   - Preview as flipbook in-browser
   - Export as PDF lookbook (print-ready, 300dpi)
   - Share via public link (read-only)

4. **Campaign Creative Generator**:
   - Select product renders from gallery
   - Choose format presets:
     - Instagram Feed (1080x1080)
     - Instagram Story / Reel cover (1080x1920)
     - Facebook Ad (1200x628)
     - Pinterest Pin (1000x1500)
     - Google Display (various)
     - Email Header (600x200)
   - AI generates creative with product + background + optional text overlay
   - Text overlay editor: headline, subheadline, CTA, price badge
   - Brand colors/fonts auto-applied from `brand_profiles`
   - Export individual or batch all formats for one product

5. **Video Generator**:
   - Select any generated image → convert to video with Kling 3.0
   - Choose motion type: subtle movement, model walk, camera pan, zoom
   - 3-5 second clips perfect for Reels/TikTok/Stories
   - Preview + download MP4
   - Save to `collection_assets` as video

6. **Inspiration Gallery** (visual-first experience):
   - Full-screen masonry gallery of ALL generated content
   - Filter by: phase, SKU, type (product/lookbook/campaign/video), status
   - Mood board mode: drag images to create visual groupings
   - Side-by-side comparison tool
   - Full-screen lightbox with zoom
   - Bulk download as ZIP
   - This is the "wow" page — beautiful, Pinterest-like, inspires the user

7. **AI Generation Queue & History**:
   - Background job processing via `ai_generations` table
   - Real-time status updates (pending → processing → completed/failed)
   - Cost tracking (credits used per generation)
   - Re-generate with tweaked parameters
   - Generation history with all prompts saved

**API Routes**:
```
POST /api/ai/fal/tryon          — FASHN virtual try-on
POST /api/ai/fal/model-create   — Create AI model
POST /api/ai/fal/product-render — Flux 2 product shot
POST /api/ai/fal/lifestyle      — Flux 2 lifestyle/editorial
POST /api/ai/fal/video          — Kling 3.0 image-to-video
GET  /api/ai/fal/status/[id]    — Check generation status
```

All routes use the same pattern:
```typescript
import { fal } from '@fal-ai/client';
fal.config({ credentials: process.env.FAL_KEY });
const result = await fal.subscribe('fal-ai/fashn/tryon/v1.6', { input: {...} });
```

**Supabase migrations**:
- `ai_generations` table (with fal_request_id, model_used, cost_credits fields)
- `campaign_shoots` table
- `lookbook_pages` table (for the lookbook builder)

**Calendar auto-sync**: dg-3, dg-4, dg-5

---

### PHASE 6: Digital Presence & AI Copywriting
**Goal**: Website prep, e-commerce catalog, AI-powered brand copy, and visual content workspace

**New page**: `/collection/[id]/digital`

**Tasks**:

1. **Product Catalog Preview**:
   - Auto-generated from SKUs + best AI renders
   - Grid view: product image, name, price, colorways available
   - Click to expand: all photos, description, materials, sizes
   - Export as CSV (for Shopify/WooCommerce import)
   - Export as PDF catalog (with brand styling)
   - This is a live preview of what the e-commerce will look like

2. **AI Copywriting Studio** (visual workspace):
   - Split-screen: product image on left, AI-generated copy on right
   - **Brand Story**: AI generates founding story, brand manifesto, about page (from brand_profiles data)
   - **Product Descriptions**: Per-SKU copy that references materials, colorways, design inspiration
   - **SEO Copy**: Meta titles, descriptions, alt texts for all product images
   - **Email Templates**: Welcome series, launch announcement, cart abandonment, post-purchase
   - **Social Captions**: Per-platform copy (IG, TikTok, Pinterest) with hashtag suggestions
   - All copy auto-respects brand voice from `brand_profiles` (tone, keywords, personality)
   - Edit inline, regenerate with tweaks, save approved versions
   - Bulk generate: "Write descriptions for all 15 SKUs" → processes in background

3. **Website/E-commerce Tracker**:
   - Visual checklist for web development milestones
   - Domain, hosting, platform selection (Shopify/WooCommerce/custom)
   - Integration links to external tools
   - SEO audit checklist
   - Performance targets

**AI integrations**:
- Claude Sonnet for long-form (brand story, product descriptions, emails)
- Gemini Flash for short-form (captions, CTAs, subject lines, SEO)
- All copy generation includes brand_profiles context in system prompt

**Calendar auto-sync**: dg-1, dg-2, dg-4, dg-5

---

### PHASE 7: Marketing & Content Calendar
**Goal**: Full pre-launch marketing orchestration

**New page**: `/collection/[id]/marketing`

**Tasks**:
1. Content Calendar:
   - Visual calendar view (month/week/day)
   - Drag-and-drop content scheduling
   - Content types: post, story, reel, email, blog, ad, PR
   - Platform assignment (IG, TikTok, email, web, Pinterest, FB, Google Ads)
   - Status workflow: idea → draft → review → approved → scheduled → published
   - AI content suggestions based on campaign phase

2. Influencer & PR CRM:
   - Contact database with profiles
   - Outreach tracking (prospect → contacted → confirmed → shipped → posted)
   - Rate tracking
   - Performance analytics per influencer
   - Seeding shipment tracker (tracking numbers, delivery status)

3. Email Marketing setup:
   - Flow templates (welcome, launch, abandoned cart, post-purchase)
   - Email list building tracker
   - Integration guidance (Klaviyo/Mailchimp links)

4. Paid Ads planner:
   - Campaign structure planner (campaigns → ad sets → ads)
   - Budget allocation
   - Creative assignment (link to AI-generated ads)
   - Performance tracking post-launch

**Supabase migrations**:
- `content_calendar` table
- `pr_contacts` table

**Calendar auto-sync**: mk-1 to mk-6

---

### PHASE 8: Production & Logistics
**Goal**: Production order generation and tracking

**New page**: `/collection/[id]/production`

**Tasks**:
1. Production Order Generator:
   - Auto-populate from SKU data (styles, colorways, size runs, quantities)
   - Select factory from saved contacts
   - Generate PO document (PDF)
   - Email PO to factory
   - Track order status (draft → sent → confirmed → in_production → QC → shipped → delivered)

2. Quality Control tracker:
   - QC checklist per SKU
   - Defect reporting with photos
   - Acceptance/rejection workflow
   - Link to sample reviews for comparison

3. Logistics tracker:
   - Shipping method selection
   - Tracking number entry
   - Estimated vs actual delivery dates
   - Customs documentation links

**Supabase migrations**:
- `production_orders` table

**Calendar auto-sync**: pd-1 to pd-4

---

### PHASE 9: Launch Command Center
**Goal**: Launch execution dashboard and post-launch analytics

**New page**: `/collection/[id]/launch`

**Tasks**:
1. Pre-launch checklist:
   - Auto-generated from all pending milestones across phases
   - Go/No-Go status per phase
   - Critical path highlights

2. Launch Day dashboard:
   - Real-time status board
   - Quick links to all platforms (website, social, email)
   - Issue log
   - Team task assignments

3. Post-launch analytics:
   - Sales tracking (manual entry or Shopify integration later)
   - Content performance aggregation
   - Influencer ROI summary
   - Lessons learned log
   - Recommendations for next collection

**Calendar auto-sync**: ln-1 to ln-4

---

### PHASE 10: Polish & Alfred Integration
**Goal**: Seamless Alfred sync, notifications, and cross-collection insights

**Tasks**:
1. Alfred API v2:
   - Include phase-specific completion percentages
   - Include next-action recommendations
   - Include overdue alerts with context
   - Webhook for status change notifications

2. Cross-collection dashboard:
   - View all active collections at a glance
   - Aggregate progress across collections
   - Upcoming deadlines across all projects

3. Notification system:
   - In-app notifications for milestone deadlines
   - Email digest (weekly) of upcoming milestones
   - Slack webhook (optional)

---

## Priority Order & Dependencies

```
Phase 1: Collection Hub ──────────────────────► FOUNDATION (do first)
  │
  ├── Phase 2: Brand Module ──────────────────► needs asset system from Phase 1
  │     │
  │     └── Phase 6: Digital & Copy ──────────► needs brand voice from Phase 2
  │           │
  │           └── Phase 7: Marketing ─────────► needs copy + content from Phase 6
  │
  ├── Phase 3: Design & Colorways ────────────► needs SKU system (exists)
  │     │
  │     └── Phase 4: Proto & Sampling QA ─────► needs design data from Phase 3
  │           │
  │           └── Phase 8: Production ────────► needs approved samples from Phase 4
  │
  └── Phase 5: AI Image Generation ───────────► needs SKUs + colorways from Phase 3
        │
        └── Phase 6: Digital & Copy ──────────► needs renders from Phase 5
              │
              └── Phase 9: Launch ────────────► needs everything above

Phase 10: Polish ─────────────────────────────► after all phases
```

## Design Philosophy — Visual First

Every module should feel like a **creative tool**, not an admin panel. Guidelines:

- **Gallery views by default** — show images, renders, and visual assets as masonry grids, not tables
- **Large previews** — click any image for full-screen lightbox with zoom
- **Side-by-side comparisons** — design iterations, proto vs sketch, colorway options
- **Drag-and-drop everywhere** — reorder pages, assign images, build layouts
- **Inspiration mode** — every phase has a "mood board" area where users can collect reference images
- **Dark overlays on hover** — show metadata (SKU name, status, date) as elegant overlay on images
- **Smooth transitions** — fade in galleries, slide panels, skeleton loading for AI generations
- **Brand colors throughout** — use the collection's own brand palette as accent colors in the UI
- **Progress feels visual** — phase completion shown as visual progress rings, not just percentages

## Execution Notes

- Each phase should be its own git branch + PR
- Each phase should include: Supabase migration, API routes, hooks, UI components, calendar auto-sync
- Test each phase independently before merging
- Use consistent patterns: `useXxx` hook per table, `/api/xxx` route, same CRUD pattern
- All new pages follow existing convention: `'use client'`, `<Navbar />`, `bg-[#fff6dc]`, `pt-28`
- **fal.ai is the single AI image gateway** — all image/video generation goes through `@fal-ai/client` with the existing `FAL_KEY`
- Every phase module includes a "Phase Overview" card showing linked milestones and their status from the calendar
- Every phase module includes an "Inspiration Board" section for reference images

## Tech Decisions

- **AI Image/Video**: fal.ai as single gateway (`@fal-ai/client`, existing `FAL_KEY`)
  - FASHN (try-on, model create, product-to-model)
  - Flux 2 Pro (editorial, lifestyle, studio shots)
  - Kling 3.0 (image-to-video for reels/TikTok)
- **AI Text**: Claude Sonnet (long-form) + Gemini Flash (short-form, analysis)
- **AI Sketches**: OpenAI gpt-image-1 (existing SketchFlow)
- **Image storage**: Supabase Storage (upgrade to Pro for 100GB if needed)
- **PDF generation**: Extend existing html2canvas + jsPDF pattern from SketchFlow
- **Rich text**: Simple Markdown editor (no heavy WYSIWYG)
- **Drag & drop**: Keep existing mouse event pattern from GanttChart (no external lib)
- **Calendar view for content**: Simple CSS grid (month view) + list view
- **Lookbook builder**: CSS grid layout with drag-and-drop, export via html2canvas
- **Video preview**: Native HTML5 `<video>` element, MP4 from Kling
- **Gallery layouts**: Masonry grid (CSS columns) for Pinterest-like visual feel
