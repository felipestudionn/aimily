# aimily

Fashion collection management platform for planning, designing, and launching clothing/footwear collections.

## Tech Stack
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS 3.3 + Radix UI + Lucide icons
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
Card titles:      text-[11px] font-semibold tracking-[0.08em] uppercase text-carbon
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
