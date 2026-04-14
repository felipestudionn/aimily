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

### What's Built & Working
- **WorkspaceShell**: state-based navigation (no page flash), sidebar active state syncs
- **Dashboard**: 4 block cards → sub-dashboards (4 cards each) → workspace views
- **All routing**: Creative (4 blocks via ?block=), Merchandising (3 blocks via ?block=), Marketing (4 blocks via ?block=)
- **shadcn/ui**: Fully installed with Tailwind v4, Radix base. Components: Card, Button, Input, Label, Badge, Separator, Switch, Toggle, Slider, etc.
- **Tailwind v4.2**: @import tailwindcss, @theme block, @utility directives, PostCSS v4

### What Needs Work NOW

**The core problem**: Workspace content inside cards looks inconsistent. Some use shadcn, others still use raw HTML. The visual quality inside the cards doesn't match the dashboard card quality.

**Felipe's rules**:
1. **ALL workspace content must use the 4-card horizontal layout** — same style as the sub-dashboard cards (01.1, 01.2, 01.3, 01.4)
2. **Use shadcn/ui exclusively** — Card, CardHeader, CardTitle, CardContent, Input, Button, Badge, Label, Separator, Switch, Toggle, Slider
3. **NEVER use raw `<input>`, `<button>`, `<label>`, `<textarea>`** — always shadcn equivalents
4. **Anti-Excel**: shadcn Slider instead of number inputs for percentages, visual bars, big numbers
5. **NEVER touch the backend** — only frontend work

**Files that need the full shadcn treatment**:
- `src/app/collection/[id]/merchandising/page.tsx` — Families+Pricing unified (partially done, AI/Assisted modes still inconsistent), Channels, Budget segmentation
- `src/app/collection/[id]/creative/page.tsx` — Consumer, Moodboard, BrandDNA, Vibe, Research blocks
- All marketing cards in `src/components/marketing/`
- Design & Development block (not started)

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
