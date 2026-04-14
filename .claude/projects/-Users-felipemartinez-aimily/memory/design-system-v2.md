---
name: Design System V2 — Navigation & Workspace Redesign
description: Complete design system overhaul decided 2026-04-13. New navigation, dashboard, workspace architecture. Reference: Daniel Cross Framer template.
type: project
---

# Design System V2 — Decided 2026-04-13

## Reference
- **Primary**: Daniel Cross Framer template (danielcross.framer.website)
- **Repo**: `references/daniel-cross-react/` — React export with all CSS/components
- **Framer MCP**: Connected via unframer.co SSE (config in `.claude.json`)
- **Design tokens extracted**: `references/daniel-cross-design-tokens.md`

## Colors (FINAL — Felipe approved)
```
Sidebar surface:    #EBEAE6
Workspace bg:       #F3F2F0  (also --background CSS var)
Card surfaces:      #FFFFFF  (white)
Text primary:       rgb(0, 0, 0) — black, not carbon
Text secondary:     rgb(117, 117, 117) — grey
Borders:            rgba(0, 0, 0, 0.1)
```

## Typography (from Daniel Cross extraction)
- Font: Helvetica Neue (our equivalent of Inter Display)
- ALL text uses NEGATIVE letter-spacing (-0.02em to -0.04em)
- Only UPPERCASE section headers use +0.08em tracking
- Weight: 500 (Medium) for everything
- Scale: 46px → 40px → 36px → 24px → 20px → 18px → 16px → 14px → 10px
- CSS classes: `.type-h1` through `.type-text-14`, `.type-section`, `.type-small`

## Navigation Architecture (BUILT & APPROVED)

### Sidebar (340px expanded, 72px collapsed)
- **4 blocks**, each with **4 mini-blocks** — symmetrical
- Block headers: 15px font-bold, pill with bg-carbon/[0.04], chevron to expand/collapse
- Block title click → navigates to sub-dashboard (`?block=` param)
- Chevron click → toggle expand/collapse
- Sub-items: 14px, with connector line (border-l)
- **Active state**: bg-carbon text-white rounded-[10px] pill
- Collapse button: black circle with white chevron, bottom-right
- Collapsed: aimily logo rotated -90°, block icons (Feather, ClipboardList, Ruler, Megaphone)

### Block Structure (4 × 4)
```
Creative Direction (sidebar label)  /  Creative Direction & Brand (dashboard label)
  1. Consumer Definition        → /creative?block=consumer
  2. Moodboard & Research       → /creative?block=moodboard
  3. Brand Identity             → /brand
  4. Creative Overview          → /creative (output, isOutput=true)

Merchandising & Planning
  1. Families & Pricing         → /merchandising
  2. Channels & Markets         → /merchandising
  3. Budget & Financials        → /merchandising
  4. Collection Builder         → /product (output, isOutput=true, shared with Design)

Design & Development
  1. Sketch & Color             → /product?phase=sketch (Builder filtered)
  2. Prototyping                → /product?phase=prototyping
  3. Production                 → /product?phase=production
  4. Final Selection            → /product?phase=selection
  SKU count badges shown per phase

Marketing & Sales
  1. Sales & Performance        → /marketing/creation
  2. Content Creation           → /marketing/creation
  3. Communications & Brand Voice → /marketing/creation
  4. Distribution & Retail      → /marketing/creation
```

### Dashboard (CollectionOverview)
- Collection name centered, 46px
- View switch: Blocks / Calendar / Presentation (SegmentedPill)
- **4 block cards in horizontal row** (grid-cols-4)
  - Ghost number (01. 02. 03. 04.) at 72px, carbon/[0.05]
  - Title 28px font-semibold
  - Description 14px carbon/50
  - CTA pill: Start → / Continue → / Completed ✏
  - Progress pill: 120px × 6px bar below CTA
  - Hover: scale 1.02 + shadow
  - Min-height: 500px, padding: p-10/p-14, rounded-[20px]

### Sub-dashboards
- Click block card → animation (other cards fade, clicked scales up)
- Title transitions: collection name shrinks to 14px, block name appears at 46px
- **4 sub-block cards** with same visual language
  - Numbering: 01.1, 01.2, 01.3, 01.4
  - Same CTA system (Start/Continue/Completed/Open)
  - Output items (Creative Overview, Collection Builder) always show "Open →"
  - Progress pill for non-output items
- Back button: "← All blocks"
- Click sub-card → animation (selected scales up, others fade) → navigate to workspace

## Workspace Layout (NEW — to be built with WorkspaceShell)
- Title centered, 46px — same position as dashboard
- Mode selector (Free/Assisted/AI) centered below title
- Content centered, max-width ~700-900px
- Confirm CTA centered at bottom
- NO "← OVERVIEW" buttons (sidebar handles navigation)
- NO step tab bars (sidebar handles this)
- NO redundant headers

## NEXT: WorkspaceShell Architecture

### The Problem
Currently, navigating from sub-dashboard to workspace causes a page change (URL navigation) which creates a visual flash. The dashboard-to-sub-dashboard transition is smooth (state-based animation), but sub-dashboard-to-workspace is not.

### The Solution: WorkspaceShell
Replace the current navigation-based workspace loading with a state-based view system:

```
WorkspaceShell (replaces CollectionHubShell + WizardLayout)
  ├── Sidebar (unchanged)
  ├── TopBar (unchanged)
  └── ViewPort (animated view container)
        State: 'dashboard' | 'sub-dashboard' | 'workspace'
        
        dashboard → sub-dashboard: animation (already works)
        sub-dashboard → workspace: animation (TO BUILD)
        workspace → sub-dashboard: animation (TO BUILD)
        
        Workspaces loaded as React.lazy components
        URL synced via router.replace (deep-linking, no navigation)
```

### Key Files to Modify
- `src/app/collection/[id]/CollectionHubShell.tsx` → becomes WorkspaceShell
- `src/components/wizard/WizardLayout.tsx` → merges into WorkspaceShell
- `src/app/collection/[id]/CollectionOverview.tsx` → dashboard + sub-dashboard views inside shell
- `src/app/collection/[id]/layout.tsx` → simplified, uses WorkspaceShell

### Builder Exception
Collection Builder (`/product`) needs full-width layout for SKU grid. The WorkspaceShell should support a `fullWidth` mode for this workspace.

### Design Phase Filters
Already implemented: `?phase=sketch|prototyping|production|selection` filters the Builder. Uses `useSearchParams()` in CollectionBuilder.tsx.

## What NOT to touch
- All existing functionality (AI generation, data hooks, Supabase persistence)
- The sidebar component (WizardSidebar.tsx) — it's done
- The dashboard cards design — it's approved
- The sub-dashboard design — it's approved
- The Daniel Cross reference repo (references/daniel-cross-react/)

## Legacy to Clean Up
- Old `bg-crema` references in components → should be `bg-shade` or no bg
- `text-[11px]` overrides in globals.css → eventually migrate to `.type-*` classes
- Old step tab navigation inside workspace pages → remove when WorkspaceShell handles it
- `CollectionSidebar.tsx` → delete (replaced by WizardSidebar)
- Font Instrument Serif in layout.tsx → can remove if not used (Felipe rejected it for sidebar)
