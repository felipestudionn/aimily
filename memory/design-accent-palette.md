---
name: Aimily Accent Palette — declared tokens & phase mapping
description: The 5 accent colors Felipe locked on 2026-04-15 for color-coding across calendar, presentation, charts, and block identifiers. Carbon stays dominant; accents are supporting. Declared in globals.css and tailwind.config.js.
type: project
originSessionId: 7899b878-b2e3-48ac-ae79-33a0cba1aa39
---
# Aimily Accent Palette (2026-04-15)

Felipe locked these 5 accent colors plus the existing carbon. Use when color-coding is needed (calendar rows, phase indicators, chart accents, presentation cover backgrounds). **Carbon remains the dominant UI color.** Accents should feel additive, not loud.

## The 5 accents + carbon

| Token | Hex | PMS | Use |
|---|---|---|---|
| `sea-foam` | `#B6C8C7` | PMS 5513 C | Creative phase, cool / creative contexts |
| `linen` | `#F1EFED` | PMS N/A | Warm surface, secondary backgrounds |
| `moss` | `#808368` | PMS 5773 C | Merchandising phase, earthy / strategic |
| `citronella` | `#FFF4CE` | PMS 600 C | Marketing phase, highlight / warmth |
| `midnight` | `#001519` | PMS 296 C | Design phase, deep / tangible |
| `carbon` | `#282A29` | — | Dominant text, buttons, active state (unchanged) |

## Phase → accent mapping (Calendar)

| Block | Accent | bgColor (phase row tint) |
|---|---|---|
| Creative Direction & Brand | Sea Foam `#B6C8C7` | `#EDF1F0` |
| Merchandising & Planning | Moss `#808368` | `#EDEEE7` |
| Design & Development | Midnight `#001519` | `#E6E9EA` |
| Marketing & Sales | Citronella `#FFF4CE` | `#FBF8EC` |

Applied in: `src/lib/timeline-template.ts` (PHASES constant + 49 milestone `color` fields).

## Where the tokens are declared

1. **Tailwind v4 @theme**: [src/styles/globals.css](src/styles/globals.css) — lines ~33-37 (`--color-sea-foam`, `--color-linen`, `--color-moss`, `--color-citronella`, `--color-midnight`).
2. **Tailwind config (v3 legacy support)**: [tailwind.config.js](tailwind.config.js) — `colors.sea-foam`, `colors.linen`, `colors.moss`, `colors.citronella`, `colors.midnight`.

Use as utilities: `bg-sea-foam`, `text-moss`, `border-midnight`, `fill-citronella`, etc.

## Text contrast rules

Bars / surfaces painted with pale accents (sea-foam, linen, citronella) → use dark text (`text-carbon`).
Bars / surfaces painted with dark accents (moss, midnight) → use light text (`text-white`).

Helper in GanttChart: `getBarTextColor(barColor)` switches automatically.

## What NOT to do

- Don't introduce a 6th accent without Felipe's authorization.
- Don't use accents as the dominant surface (carbon + shade + white remain dominant; accents are supporting).
- Don't use legacy hex values (`#5A8A7A`, `#9A7A60`, `#7A6A9A`, `#9A6070`) anywhere — retired 2026-04-15.
- Don't use emoji colors (blue/amber/green/purple/yellow from Tailwind defaults) for semantic state — replaced by monochrome carbon opacities.

## Future usage (Felipe will expand)

Likely places to apply accents next:
- Presentation mode cover slides (one accent per block)
- Chart primary colors in Sales Dashboard (Recharts)
- Block-level accent tints in the 4-block overview cards
- Status badges beyond the calendar
