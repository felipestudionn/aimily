# aimily

Fashion collection management platform for planning, designing, and launching clothing/footwear collections.

## Tech Stack
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS 4.2 + shadcn/ui (radix-nova) + Lucide icons
- **UI Library**: shadcn/ui — Card, Button, Input, Label, Badge, Separator, Switch, Toggle, Slider, Accordion, Collapsible, Progress, Tooltip
- **Backend**: Supabase (PostgreSQL + Auth), project ID `sbweszownvspzjfejmfx`
- **AI**: Google Gemini 2.5 Flash Lite, Anthropic Claude Sonnet (SketchFlow)
- **Deployment**: Vercel

## Security
- ALL API routes MUST use `getAuthenticatedUser()` from `@/lib/auth-guard`
- Verify collection ownership before data access: `user_id === collection.user_id`
- Never use `supabaseAdmin` where user-scoped access is sufficient

## Git Rules
- Every `git commit` MUST be followed by `git push`. No exceptions.

## 🚨 AI CONTEXT ARCHITECTURE — DO NOT TOUCH
All 16 AI endpoints load context SERVER-SIDE via `loadFullContext()` from `src/lib/ai/load-full-context.ts`. This reads CIS + Creative workspace + Brief answers + Collection plan. The 3 brief endpoints (`analyze`, `scenarios`, `generate`) accept `collectionPlanId` OPTIONALLY — if present they prepend CIS context via `formatCisPrefix()` from `src/lib/ai/cis-prefix.ts`. Frontend-only changes MUST NOT modify:
- `src/lib/ai/load-full-context.ts`
- `src/lib/ai/cis-prefix.ts`
- `src/lib/ai/prompt-foundations.ts`
- `src/lib/prompts/prompt-context.ts`
- `src/lib/collection-intelligence.ts`
- Any `src/app/api/ai/*/route.ts` file

---

## 🥇 GOLD STANDARD: Family Card (Merchandising > Families) — REPLICATE EVERYWHERE

The Family Card design in `src/app/collection/[id]/merchandising/page.tsx` (FamilyCardGrid) is the canonical reference. Every workspace card MUST follow this exact pattern:

- `grid grid-cols-4 gap-5` (always 4 cols, never 3)
- Card: `bg-white rounded-[20px] p-10 md:p-14 min-h-[500px]` + `hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]`
- Title = subject's name in 24-28px semibold (NEVER add "KEY xxx" labels above)
- NO ghost numbers (01., 02.) — Felipe explicitly removed
- Pricing inline with subcategory name (NOT below): `[name] [min]–[max] € [×]`
- Pricing pills: `rounded-full bg-carbon/[0.03]`, placeholder text "min"/"max" inside the input
- Subtle metadata: `text-[11px] text-carbon/30 uppercase`, NEVER loud Badge
- Hover-only actions: `opacity-0 group-hover:opacity-100`

---

## 🚨 DESIGN SYSTEM V2 — MANDATORY FOR ALL UI WORK

**Read this section BEFORE writing ANY UI code. These are non-negotiable rules.**

### Colors
```
Sidebar:        #EBEAE6
Workspace bg:   #F3F2F0 (bg-shade)
Cards:          #FFFFFF (white)
Text:           rgb(0,0,0) (text-carbon)
Text secondary: text-carbon/50, text-carbon/35
Borders:        border-carbon/[0.06]
Input bg:       bg-carbon/[0.03]
```

### Border Radius — EVERYTHING ROUNDED, ZERO SQUARE CORNERS
```
Cards:              rounded-[20px]
Inputs/textareas:   rounded-[12px]
Buttons:            rounded-full (ALWAYS)
Pills/badges:       rounded-full
Proposal cards:     rounded-[16px]
Thumbnails:         rounded-[10px]
Color pickers:      rounded-[8px]
```

### Typography
```
Collection name:  text-[13px] font-medium text-carbon/35 tracking-[-0.02em]
Workspace title:  text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em]
Card titles:      text-[20px] font-semibold tracking-[-0.03em] text-carbon leading-tight (normal case, NOT uppercase)
Body:             text-[14px] or text-sm
Subtle:           text-[13px] text-carbon/35
```

### Workspace Layout (Gold Standard = Consumer Definition Assisted)
```
Header:     centered (collection name + title + SegmentedPill + description below pill)
Card Grid:  grid grid-cols-1 lg:grid-cols-3 gap-5
            min-h-[calc((100vh-380px)*0.8)]
Left col:   small cards stacked vertically (selectors, short inputs)
Right 2col: tall card for text-heavy content
Confirm:    centered button below cards, always visible without scroll
```

### Buttons — ALL rounded-full
```
Primary:   px-5 py-2.5 rounded-full text-[13px] font-semibold bg-carbon text-white
Secondary: px-5 py-2 rounded-full text-[12px] font-medium border border-carbon/[0.12] text-carbon/60
Subtle:    px-5 py-2 rounded-full text-[12px] font-medium bg-carbon/[0.04] text-carbon/60
```

### Inputs
```
px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30
```

### What NOT to Do
- ❌ Square corners on ANY element
- ❌ Old label styles (text-xs tracking-[0.25em])
- ❌ max-w-[700px] centered layouts — use full-width card grids
- ❌ Inline SegmentedPill descriptions — always centered below
- ❌ Big dashed upload areas — use compact rounded-full buttons
- ❌ Vertical form layouts — always card grid with puzzle-piece logic
- ❌ Mixing old component styles with new DecisionCard template

### Component: DecisionCard
Use `<DecisionCard>` from `@/components/workspace/DecisionCard` for ALL workspace content cards. Props: `title`, `description`, `pill`, `pillVariant`, `span={1|2|3}`, `className`.

### Routing: Creative Direction Block
All sub-blocks route through `creative/page.tsx` with `?block=` param:
- `creative?block=consumer` — Consumer Definition
- `creative?block=moodboard` — Moodboard & Research
- `creative?block=brand-dna` — Brand Identity
- `creative` — Creative Overview (output)

---

## 🎯 CURRENT STATE & NEXT SESSION CONTEXT

### What's Built & Working (as of 2026-04-14)
- **Family Card design GOLD STANDARD** in Merchandising > Families & Pricing — replicate everywhere
- **CIS server-side** for ALL 13 AI endpoints via `loadFullContext()`
- **WizardSidebar i18n** complete (23 keys × 9 languages)
- **Playwright MCP** active for visual iteration on `localhost:3000` at 2560×1440
- **WorkspaceShell**: state-based navigation, sidebar active state syncs
- **shadcn/ui**: Fully installed with Tailwind v4.2

### What Still Needs the Template Treatment
Apply the Family Card gold standard pattern to:
- `src/app/collection/[id]/merchandising/page.tsx` — Channels & Markets, Budget & Financials
- `src/app/collection/[id]/creative/page.tsx` — Consumer, Moodboard & Research, Brand Identity, Creative Overview
- All marketing cards in `src/components/marketing/` (Sales Dashboard, Content Studio, Communications, Point of Sale)
- Design & Development sub-blocks

### Visual Iteration Workflow (Playwright MCP)
- Dev server: `npm run dev` on `localhost:3000`
- Felipe's test collection: `60652ef7-1b06-4be4-9a61-31357be0be65` (SS27 SLAIZ, English locked)
- Use `mcp__playwright__browser_navigate` + `browser_take_screenshot` for verification
- See `feedback_visual-iteration-with-playwright.md`

### Felipe's Rules (HARD)
1. **ALL workspace content uses the 4-card grid** — gold standard = Merchandising > Families
2. **Use shadcn/ui exclusively** — Card, CardHeader, CardTitle, CardContent, Input, Button, Badge, Label, Separator, Switch, Toggle, Slider
3. **NEVER raw `<input>`, `<button>`, `<label>`, `<textarea>`** — always shadcn
4. **Anti-Excel**: shadcn Slider instead of number inputs for percentages, visual bars, big numbers
5. **i18n MANDATORY** — zero hardcoded strings, all 9 languages
6. **AI context architecture LOCKED** — never modify during frontend work
7. **Effort=High + Thinking=ON** always

### shadcn Component Reference (installed & ready)
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Slider } from '@/components/ui/slider'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
```

### Design Reference: Sub-Dashboard Cards (THE GOLD STANDARD)
The 4 sub-block cards in CollectionOverview (01.1, 01.2, etc.) define the visual standard:
- White bg, rounded-[20px], p-10 md:p-14
- Ghost number (72px, carbon/[0.05])
- Title: 24-28px, font-semibold, tracking-[-0.03em]
- Description: 14px, carbon/50
- CTA pill: rounded-full, bg-carbon text-white
- Progress bar: 120px × 6px, rounded-full
- Min-height: 500px
- Hover: scale-[1.02] + shadow

**Every workspace card should feel like it belongs in the same family as these dashboard cards.**

### Key Architecture
- `WorkspaceShell` → `ViewPort` → lazy-loaded workspace components
- Sidebar reads active workspace from context (not just pathname)
- URL updated via `history.replaceState` for deep-linking
- Optimal viewport: `calc((100vh-380px)*0.8)` — design to fit without scroll
