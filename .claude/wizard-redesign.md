# Wizard Redesign — New Collection Flow (v2)

## Status: READY FOR IMPLEMENTATION
Date: 2026-03-10

## Architecture: Two-Level Wizard System

### Level 1: Main Wizard (`/new-collection`)
Creates the collection, generates the calendar with milestones, and sets up the overall workspace.
One-time flow that results in a collection_plan + collection_timeline in Supabase.

### Level 2: Block Mini-Wizards (per workspace)
When the user enters a workspace for the FIRST TIME, a mini-wizard guides them through
the configuration inputs needed to generate that workspace. Once configured, the workspace
shows its normal editable view. Each mini-wizard collects the same inputs that already existed
as forms — just reorganized into guided step-by-step screens.

## Design Principles
- Many steps, little content per screen — prefer 30 light screens over 5 heavy ones
- No gradients, no clutter — crema/carbon/gris palette only
- Auto-advance on selection (cards, yes/no), manual advance on inputs
- Progress bar at top (thin line)
- Each screen: one question, one action
- Bilingual: all text has EN + ES

---

# LEVEL 1: MAIN WIZARD

## Block 1: Setup Basics (6 steps)

1. **Name** — "Name your collection" — text input, centered, big
2. **Season** — "Which season?" — dynamically generated from current date (+2 years), auto-advance
3. **Category** — "What are you making?" — 4 cards (Clothing, Footwear, Accessories, Mixed), auto-advance
   - IMPORTANT: This selection affects terminology in Block 2 questions AND milestone names
   - Footwear: "lasts", "white proto", "sole attachment"
   - Clothing: "base patterns", "first sample/toile", "seam construction"
   - Accessories: simplified prototyping flow
4. **Collection Size** — "How big is your collection?" — 3 cards (Capsule 5-15 SKUs / Medium 15-30 / Full 30+), auto-advance
5. **Distribution** — "How will you sell?" — 3 cards (DTC Only / Wholesale Only / Both), auto-advance
6. **Launch Date** — "When do you launch?" — date picker, auto-suggested from season
   - Show: "X weeks from today" + "Work starts around [earliest date]"

## Block 2: Phase Context Questions (~18-20 steps)

For each phase, 1-4 contextual YES/NO questions.
YES → mark related milestones as "completed" (already done).
NO → milestones stay "pending" (work to do in the workspace).

Questions adapt terminology based on Category selected in Block 1.

### Product & Merchandising (phase: olawave)
- Q: "Do you have a product range plan?" → YES: mark ow-1, ow-2 completed
- Q: "Do you have SKU definitions?" → YES: mark ow-3 completed
- Q: "Do you have technical sketches?" → YES: mark ow-5 completed
- Q: "Do you have a go-to-market strategy?" → YES: mark ow-4 completed

### Brand & Identity (phase: brand)
- Q: "Do you already have a brand?" → YES: mark br-1, br-2, br-3 completed
- Q: "Do you have packaging design?" → YES: mark br-4 completed

### Design & Development (phase: design)
- Q (Footwear only): "Do you have lasts/forms defined?" → YES: mark ds-1 completed
- Q (Clothing only): "Do you have base patterns/blocks defined?" → YES: mark ds-1 completed
- Q (Accessories): skip ds-1 entirely
- Q: "Have you completed design rounds?" → YES: mark ds-2, ds-3, ds-4 completed
- Q: "Are colorways developed?" → YES: mark ds-5 completed

### Prototyping (phase: prototyping)
- Q (Footwear): "Have white protos been developed?" → YES: mark pt-1, pt-2 completed
- Q (Clothing): "Have first samples/toiles been made?" → YES: mark pt-1, pt-2 completed
- Q: "Are tech sheets complete?" → YES: mark pt-3, pt-4 completed

### Sampling (phase: sampling)
- Q: "Do you have approved color samples?" → YES: mark sm-1 completed
- Q: "Do you have approved fitting samples?" → YES: mark sm-2, sm-3, sm-4 completed

### Digital Presence (phase: digital)
- Q: "Do you have a website?" → YES: mark dg-1, dg-2 completed
- Q: "Do you have product photography?" → YES: mark dg-3 completed
- Q: "Do you have your brand copy written?" → YES: mark dg-5 completed (SEPARATE from photography)
- Q: "Do you have a lookbook?" → YES: mark dg-4 completed

### Marketing (phase: marketing)
- Q: "Do you have social media set up?" → YES: mark mk-1 completed
- Q: "Do you have a content calendar?" → YES: mark mk-2 completed
- Q: "Do you have influencer/PR relationships?" → YES: mark mk-3, mk-6 completed
- Q: "Do you have email marketing set up?" → YES: mark mk-4 completed

### Production (phase: production)
- Q: "Have production orders been placed?" → YES: mark pd-1 completed
- Q: "Is production underway?" → YES: mark pd-2 completed
- NOTE: Production origin (long/medium/short distance) is configured in the Production workspace mini-wizard, NOT here.

### Launch (phase: launch)
- No questions — launch milestones always stay pending (event-specific)

## Block 3: Calendar Confirmation (1-2 steps)

- **Summary screen**: shows all 9 phases with pending milestone count and date ranges
  - Phases with ALL milestones completed show as "Done" (green)
  - Phases with some pending show milestone count
  - Shows collection start date (earliest milestone) prominently
  - User can expand any phase to toggle individual milestones
- **Confirm & Create** button

## Block 4: Post-Creation

- Redirect to `/collection/[id]` (Overview)
- WizardSidebar shows phases with correct states (completed/available/locked)
- When user enters a workspace for the first time → Level 2 mini-wizard activates

---

# LEVEL 2: BLOCK MINI-WIZARDS

Each workspace has a "first-time setup" wizard that collects configuration inputs.
After completing the mini-wizard, the workspace shows its normal view with data pre-populated.
A flag `workspace_configured: boolean` per phase (stored in collection_plan.setup_data or localStorage)
controls whether to show the mini-wizard or the workspace.

## Block 1: Product & Merchandising Mini-Wizard

The existing AI Advisor flow (5 steps) + Budget Setup. These inputs ALREADY EXIST and work.
We reorganize them into the mini-wizard format.

### Steps:

1. **Creative Input (Optional)**
   - "Want to start with inspiration?" — YES opens moodboard/Pinterest tools, NO skips
   - If YES: moodboard upload, Pinterest board connect, key colors, trends, items
   - Stored in localStorage as `olawave_creative_data`
   - This feeds context to the AI Advisor in step 7

2. **Target Consumer**
   - 4 preset cards: Gen Z, Millennials, Gen X, Baby Boomers + custom textarea
   - Auto-advance on preset selection

3. **Season / Selling Period**
   - 4 presets + custom (may be pre-filled from Level 1 wizard)
   - Auto-advance

4. **Number of SKUs**
   - 4 range cards: 10-20, 21-50, 51-100, 100+ + custom number
   - Auto-advance (may be pre-filled from collection size in Level 1)

5. **Price Range**
   - Min € + Max € number inputs
   - Optional: strategy notes textarea

6. **Product Categories**
   - Multi-select checkboxes: Tops, Bottoms, Dresses, Outerwear, Footwear, Accessories, Activewear, Denim
   - + custom category input with Add button

7. **AI Generates Framework**
   - Loading screen while Gemini processes
   - Shows: expected SKUs, drops, target margin, total sales, avg price, families, price segments
   - User reviews and can adjust

8. **Budget Confirmation**
   - Total Sales Target € (with AI suggestion)
   - Target Margin % (with AI suggestion)
   - "Confirm & Generate SKUs" or "Skip & Build Manually"

### Output:
- `setup_data` saved to collection_plan
- SKUs auto-generated via Gemini
- Workspace shows: SKU Constructor (editable table), Strategic Dashboard, Financial Overview

### Existing code to reuse:
- `src/app/ai-advisor/page.tsx` — the 5-step form
- `src/components/planner/PlannerDashboard.tsx` — budget setup + SKU builder
- `src/components/planner/CollectionBuilder.tsx` — SKU table + detail modal

---

## Block 2: Brand & Identity Mini-Wizard

The existing Brand workspace has 8 form sections with auto-save. We reorganize them into
8 wizard screens. All inputs ALREADY EXIST.

### Steps:

1. **Brand Naming**
   - Brand name (text input)
   - Tagline (text input)
   - Naming options (dynamic array — add ideas, star to select)

2. **Brand Story**
   - Brand story (textarea, 6 rows, with word count)

3. **Brand Voice**
   - Tone (text input, e.g. "Bold, authentic, playful")
   - Personality (text input)
   - Keywords (dynamic array with tags)
   - Don'ts (dynamic array with tags)

4. **Target Audience**
   - Demographics (textarea)
   - Psychographics (textarea)
   - Lifestyle (textarea)

5. **Competitor Mapping**
   - Dynamic table: brand name + positioning + price range
   - Add/remove rows

6. **Color Palette**
   - Primary colors: hex picker + name + pantone (array)
   - Secondary colors: same structure

7. **Typography**
   - Primary font: family + weight (with 15 popular suggestions)
   - Secondary font: family + weight

8. **Packaging**
   - Packaging notes (textarea)

### Output:
- `brand_profiles` record in Supabase
- All fields auto-saved with 800ms debounce
- Feeds into: Digital copywriting (brand context), Studio (prompt context)

### Existing code to reuse:
- All section components in `src/components/brand/sections/`
- `src/hooks/useBrandProfile.ts`

---

## Block 3: Go-to-Market Mini-Wizard

The existing GTM dashboard has drop + action creation. We reorganize into wizard format.

### Steps:

1. **Drop Planning**
   - "How many drops?" — number selector or cards (1 / 2 / 3 / 4+)
   - Auto-creates drop shells with dates spaced from launch date
   - Pre-fills from SKU drop_numbers if available

2. **Drop Details**
   - Per drop: name + launch date + weeks active (8 default)
   - Shows SKU count per drop

3. **SKU Assignment**
   - Drag/dropdown to assign SKUs to drops
   - Visual: drop cards with SKU list

4. **Commercial Actions**
   - "Any commercial actions planned?" — YES opens form, NO skips
   - Per action: name + type (SALE/COLLAB/CAMPAIGN/SEEDING/EVENT) + date + category

5. **AI Validation (Optional)**
   - "Validate with AI?" — runs market prediction
   - Shows gaps + recommendations

### Output:
- `drops` + `commercial_actions` in Supabase
- 6-month timeline visualization
- Sales forecasting from SKU data

### Existing code to reuse:
- `src/components/gtm/GoToMarketDashboard.tsx`
- `src/hooks/useDrops.ts`, `src/hooks/useCommercialActions.ts`

---

## Block 4: Design & Development Mini-Wizard

Operational workspace — needs 2-3 config questions before showing full workspace.

### Steps:

1. **Design Rounds**
   - "How many design rounds do you plan?" — 3 cards (1 / 2 / 3)
   - Pre-creates iteration slots in Design Review

2. **Forms/Lasts** (Footwear only, skip for Clothing/Accessories)
   - "Do you have a last supplier?" — YES: factory name + link / NO: skip

3. **Colorways**
   - "How many colorways per style?" — 3 cards (1-3 / 3-5 / 5+)
   - Pre-creates colorway slots per SKU

### Output:
- Pre-configured Design workspace with slots ready to fill
- Data stored in localStorage (design) + Supabase (colorways)

### Existing code to reuse:
- All components in `src/components/design/`

---

## Block 5: Prototyping Mini-Wizard

### Steps:

1. **Factory Info**
   - "Which factory produces your prototypes?" — name + contact/email
   - Pre-fills in proto tracker

2. **Turnaround**
   - "Expected proto turnaround time?" — 3 cards (2-4 weeks / 4-8 weeks / 8+ weeks)
   - Adjusts milestone durations for pt-1, pt-2

### Output:
- Pre-configured Proto Tracker with factory info
- Adjusted timeline if turnaround differs from default

### Existing code to reuse:
- `src/components/prototyping/PrototypingWorkspace.tsx`

---

## Block 6: Sampling Mini-Wizard

### Steps:

1. **Factory**
   - "Same factory as protos?" — YES (auto-fill) / NO (new factory name + contact)

2. **Fitting Rounds**
   - "How many fitting rounds do you expect?" — 3 cards (1 / 2 / 3)

### Output:
- Pre-configured Sampling workspace with factory info

### Existing code to reuse:
- `src/components/sampling/SamplingWorkspace.tsx`

---

## Block 7: AI Creative Studio Mini-Wizard

### Steps:

1. **Content Needs**
   - "What content do you need?" — multi-select cards:
     - Product renders (studio shots)
     - On-model try-on
     - Lifestyle shots
     - Video content
     - Lookbook
   - Enables/disables relevant tabs

2. **Reference Check**
   - "Do your SKUs have reference images?" — shows count with/without images
   - If missing: prompt to add in Product workspace first

### Output:
- Studio workspace with relevant tabs active
- Warning if reference images missing

### Existing code to reuse:
- All components in `src/components/studio/`

---

## Block 8: Digital Presence Mini-Wizard

### Steps:

1. **Website**
   - "Do you have a website?" — YES / NO
   - If YES: platform (Shopify/WooCommerce/Squarespace/Custom/Other) + domain + URL
   - If NO: skip website tracker section

2. **Copy Needs**
   - "What product copy do you need?" — multi-select:
     - Product descriptions
     - Brand story
     - SEO meta
     - Email templates
     - Social captions

### Output:
- Website tracker pre-configured (or hidden)
- Copywriting Studio with relevant sub-tabs active

### Existing code to reuse:
- `src/components/digital/DigitalWorkspace.tsx`

---

## Block 9: Marketing Mini-Wizard

### Steps:

1. **Platforms**
   - "Which platforms will you use?" — multi-select cards:
     - Instagram, TikTok, LinkedIn, Facebook, YouTube, Pinterest, Email, Blog
   - Pre-configures content calendar platform options

2. **Influencer/PR**
   - "Plan influencer or PR outreach?" — YES / NO
   - If YES: enables Influencer CRM tab

3. **Paid Ads**
   - "Plan paid advertising?" — YES / NO
   - If YES: enables Paid Ads tab

4. **Email Marketing**
   - "Plan email marketing?" — YES / NO
   - If YES: enables Email tab + platform URL input

### Output:
- Marketing workspace with relevant tabs enabled
- Platform list pre-configured for Content Calendar

### Existing code to reuse:
- `src/components/marketing/MarketingWorkspace.tsx`

---

## Block 10: Production Mini-Wizard

### Steps:

1. **Production Origin**
   - "Where will you produce?" — 3 cards:
     - Short distance (local / your country) — shorter timelines
     - Medium distance (Europe / regional) — medium timelines
     - Long distance (China / Asia) — longer timelines
   - Adjusts pd-1 to pd-4 milestone durations
   - Can be set per SKU group later in the workspace

2. **Factory**
   - "Primary factory?" — name + contact
   - Pre-fills in Order Tracker

3. **Currency**
   - "Production currency?" — 5 cards (EUR / USD / GBP / JPY / CNY)
   - Pre-selects in order forms

### Output:
- Adjusted production timeline based on origin distance
- Pre-configured Order Tracker with factory + currency
- Origin can be refined per SKU/group in the workspace

### Existing code to reuse:
- `src/components/production/ProductionWorkspace.tsx`

---

## Block 11: Launch Mini-Wizard

### Steps:

1. **Launch Channels**
   - "Where will you launch?" — multi-select cards:
     - Online store
     - Physical retail
     - Pop-up
     - Wholesale showroom
     - Marketplace (Amazon, etc.)

2. **Launch Event**
   - "Planning a launch event?" — YES / NO
   - If YES: type (Party, Presentation, Digital event) + expected date

### Output:
- Pre-configured Launch workspace with relevant sections
- Launch Day dashboard with channel quick links pre-set

### Existing code to reuse:
- `src/components/launch/LaunchWorkspace.tsx`

---

# TECHNICAL IMPLEMENTATION

## Shared Mini-Wizard Component

Create a reusable `<BlockWizard>` component:
```tsx
<BlockWizard
  steps={[...]}
  onComplete={(data) => markConfigured(phaseId, data)}
  phaseId="product"
/>
```

Each step renders one of:
- `TextStep` — single text input
- `SelectStep` — card grid, auto-advance
- `MultiSelectStep` — checkbox cards
- `YesNoStep` — two big cards
- `FormStep` — grouped inputs (for steps with 2-3 related fields)

## Configuration State

```typescript
// In collection_plan.setup_data or separate table
workspace_config: {
  [phaseId]: {
    configured: boolean;
    config_data: Record<string, any>;
    configured_at: string;
  }
}
```

## API Contract (Level 1 — already working)

```json
POST /api/planner/create
{
  "name": "Summer Essentials 2027",
  "season": "SS27",
  "setup_data": {
    "productCategory": "footwear",
    "collectionSize": "medium",
    "distribution": "both"
  },
  "user_id": "...",
  "launch_date": "2027-02-01",
  "milestones": [
    { "id": "ow-1", "phase": "olawave", "name": "...", "status": "completed", ... },
    { "id": "ow-2", "phase": "olawave", "name": "...", "status": "pending", ... }
  ]
}
```

## Key UX Patterns

- YES/NO questions: two big cards, auto-advance on click
- Text inputs: centered, big font, Enter to advance
- Selection cards: grid, auto-advance on click
- Multi-select: checkbox cards, manual Next button
- Phase intro: phase name + icon, then questions
- Calendar summary: expandable phases, toggle individual milestones
- Progress bar: thin line at top, proportional to total steps
- Mini-wizard overlay: slides in from right or modal, same crema/carbon style

## Files to Create/Modify

### New:
- `src/components/wizard/BlockWizard.tsx` — reusable mini-wizard shell
- `src/components/wizard/steps/TextStep.tsx`
- `src/components/wizard/steps/SelectStep.tsx`
- `src/components/wizard/steps/MultiSelectStep.tsx`
- `src/components/wizard/steps/YesNoStep.tsx`
- `src/components/wizard/steps/FormStep.tsx`

### Modify:
- `src/app/new-collection/page.tsx` — rebuild Level 1 with dynamic seasons, category-aware questions, collection size, distribution
- `src/app/collection/[id]/product/page.tsx` — integrate Product mini-wizard on first entry
- Each workspace page.tsx — add mini-wizard gate (check `configured` flag)

### Keep as-is:
- All workspace components (PlannerDashboard, BrandWorkspace, etc.) — they remain the "post-wizard" view
- All hooks (useSkus, useBrandProfile, etc.)
- All API routes
- Timeline template + wizard phases

---

# IMPLEMENTATION PHASES

## Phase 1: Foundation + Level 1 Wizard
**Goal**: Rebuild `/new-collection` with the complete Level 1 flow

Tasks:
- [ ] Create `<BlockWizard>` reusable component + step components (TextStep, SelectStep, MultiSelectStep, YesNoStep, FormStep)
- [ ] Rebuild `/new-collection/page.tsx` with:
  - Dynamic season generation (current date + 2 years)
  - Collection Size step (Capsule/Medium/Full)
  - Distribution step (DTC/Wholesale/Both)
  - Category-aware question terminology (footwear vs clothing vs accessories)
  - Fix dg-5 mapping (separate Copywriting question from Photography)
  - Calendar summary with start date + expandable phases
- [ ] Update API contract to pass `collectionSize` + `distribution` in setup_data
- [ ] Add `workspace_config` structure to setup_data

**Commit after**: Level 1 wizard fully functional, creates collection with correct milestones

## Phase 2: Product Mini-Wizard
**Goal**: Integrate existing AI Advisor + Budget Setup as the Product workspace mini-wizard

Tasks:
- [ ] Move AI Advisor flow (5 steps) into BlockWizard format inside Product workspace
- [ ] Add Creative Input as optional step 1 (moodboard/Pinterest)
- [ ] Add Budget Confirmation as final step
- [ ] Gate: show mini-wizard on first entry, workspace after configured
- [ ] Ensure SKU generation + constructor work exactly as before post-wizard
- [ ] Remove standalone `/ai-advisor` page (functionality now inside Product workspace)

**Commit after**: Product workspace has mini-wizard → generates SKUs → shows constructor

## Phase 3: Brand Mini-Wizard
**Goal**: Reorganize Brand workspace forms into 8-step mini-wizard

Tasks:
- [ ] Create Brand mini-wizard (8 steps: naming, story, voice, audience, competitors, colors, typography, packaging)
- [ ] Reuse existing section components as step content
- [ ] Gate: show mini-wizard on first entry, full workspace after
- [ ] Ensure auto-save (800ms debounce) works within wizard steps

**Commit after**: Brand workspace has mini-wizard → saves profile → shows full workspace

## Phase 4: GTM Mini-Wizard
**Goal**: Reorganize GTM dashboard into guided setup

Tasks:
- [ ] Create GTM mini-wizard (5 steps: drop count, drop details, SKU assignment, commercial actions, AI validation)
- [ ] Reuse existing GoToMarketDashboard logic
- [ ] Gate on first entry

**Commit after**: GTM has mini-wizard → creates drops + actions → shows dashboard

## Phase 5: Design + Prototyping + Sampling Mini-Wizards
**Goal**: Add config questions to the three operational workspaces

Tasks:
- [ ] Design mini-wizard (3 steps: design rounds, forms/lasts conditional, colorways per style)
- [ ] Prototyping mini-wizard (2 steps: factory info, turnaround time)
- [ ] Sampling mini-wizard (2 steps: factory, fitting rounds)
- [ ] Gate each on first entry

**Commit after**: All three workspaces have setup wizards

## Phase 6: Studio + Digital + Marketing Mini-Wizards
**Goal**: Add config questions to content/marketing workspaces

Tasks:
- [ ] Studio mini-wizard (2 steps: content needs multi-select, reference image check)
- [ ] Digital mini-wizard (2 steps: website config, copy needs)
- [ ] Marketing mini-wizard (4 steps: platforms, influencer, paid ads, email)
- [ ] Gate each on first entry

**Commit after**: All three content workspaces have setup wizards

## Phase 7: Production + Launch Mini-Wizards
**Goal**: Add config questions to final workspaces

Tasks:
- [ ] Production mini-wizard (3 steps: origin distance with timeline adjustment, factory, currency)
- [ ] Launch mini-wizard (2 steps: launch channels, launch event)
- [ ] Production origin affects pd-1 to pd-4 durations:
  - Short: pd-2 = 3 weeks (was 6)
  - Medium: pd-2 = 5 weeks
  - Long: pd-2 = 6 weeks (default, China)
- [ ] Gate each on first entry

**Commit after**: Complete wizard system — all 11 blocks have mini-wizards

## Phase 8: Polish + Testing
**Goal**: End-to-end flow validation and UX polish

Tasks:
- [ ] Full flow test: create collection → enter each workspace → complete mini-wizard → verify workspace state
- [ ] Verify all existing functionality preserved post-wizard
- [ ] Add "Reconfigure" option to re-run any mini-wizard
- [ ] Ensure bilingual (EN/ES) across all wizard steps
- [ ] Mobile responsiveness for wizard screens
- [ ] Edge cases: back navigation, browser refresh mid-wizard, re-entering configured workspace
