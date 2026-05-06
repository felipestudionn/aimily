---
name: Brand Design Guidelines — Complete Reference
description: aimily visual design system. THE definitive reference for all UI. Based on the consolidated home landing + Creative Synthesis (best workspace page). Must be followed for EVERY new component.
type: feedback
originSessionId: eba9d5f6-9ffd-41a5-96e9-50a54f10146b
---
# aimily Brand Design Guidelines

**Gold standard pages**: `/` (the consolidated public landing — DWP narrative + AZUR walkthrough + 4-plan pricing), Creative Synthesis (Step 3 of creative workspace)
**Why:** Felipe confirmed both as best-designed surfaces. All new UI must match.

> Note: `/discover` was retired 2026-04-28 and now 308-redirects to `/`. The new `/` carries the editorial portada + everything `/discover` used to do (and more). When this doc references "/discover" in older sections, treat it as a synonym for "the landing".

## 1. Typography System

### Headlines (editorial)
- `font-light tracking-tight leading-[1.15]`
- Sizes: `text-2xl sm:text-3xl md:text-4xl` (workspace), `text-3xl sm:text-4xl md:text-5xl` (landing)
- **Italic for emphasis**: `<span className="italic">word</span>` — THE signature move
- Example: `Merchandising & <span className="italic">Planning</span>`

### Section Headers (within cards/blocks)
- `text-lg font-light text-carbon tracking-tight` — NOT bold, NOT medium
- Or: `text-base font-light text-carbon`

### Labels / Eyebrows
- `text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35`
- Or: `text-[11px] font-medium tracking-[0.08em] uppercase text-carbon/40`
- Always ABOVE content with `mb-2` to `mb-3`

### Body Text
- `text-sm text-carbon/60 leading-relaxed` (workspace content)
- `text-xs text-carbon/50 leading-relaxed` (secondary descriptions)

### Interactive Labels (buttons/pills)
- `text-[10px] font-medium tracking-[0.08em] uppercase` (small actions)
- `text-[11px] font-medium tracking-[0.1em] uppercase` (buttons)

## 2. Color System

### Core Palette (NO other colors)
- `carbon` (#282A29) — primary dark, text, backgrounds
- `crema` (#FAEFE0) — primary warm light, page bg
- `texto` (#191919) — text black
- `gris` (#D8D8D8) — neutral gray

### On Light Background (bg-crema / bg-white)
- Primary: `text-carbon`
- Secondary: `text-carbon/60`
- Tertiary: `text-carbon/40`
- Very muted: `text-carbon/25` or `text-carbon/20`
- Borders: `border-carbon/[0.06]` (cards), `border-carbon/[0.08]` (inputs)

### On Dark Background (bg-carbon)
- Primary: `text-white` or `text-crema`
- Secondary: `text-white/60`
- Muted: `text-white/40`, `text-white/25`
- Borders: `border-white/[0.06]` to `border-white/[0.08]`

### Accent Colors (ONLY for specific data)
- Warm sand: `bg-[#f5f0e8] text-[#8b7355]` — DTC/commerce labels
- Cool slate: `bg-[#eef0f3] text-[#5a6b7d]` — wholesale labels
- Green (on-target): `#2d6a4f` — ONLY for metric gauges
- Amber (off-target): `#c77000` — ONLY for metric warnings
- NEVER red/green for UI decoration — monochromatic always

## 3. Buttons

### Primary CTA
- `bg-carbon text-crema px-6 py-3 text-[11px] font-medium tracking-[0.15em] uppercase hover:bg-carbon/90`

### Secondary / Outline
- `border border-carbon/[0.08] text-carbon/50 px-4 py-2 text-[11px] font-medium tracking-[0.1em] uppercase hover:border-carbon/20`

### Small Action
- `px-3 py-1.5 text-[10px] font-medium tracking-[0.08em] uppercase border border-carbon/[0.1]`

### Pill Toggle (active/inactive)
- Active: `border-carbon bg-carbon text-crema`
- Inactive: `border-carbon/[0.08] text-carbon/50 hover:border-carbon/20`

## 4. Cards & Sections

### Content Card
- `bg-white border border-carbon/[0.06] p-5` (compact)
- `bg-white border border-carbon/[0.06] p-8` (spacious)
- Subtle rounding: `rounded-sm` (2px) globally via `--radius: 2px`. Modern but editorial.

### Section within card
- Divider: `border-t border-carbon/[0.05] pt-4 mt-4`
- Section label above: `text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35 mb-2`

### Highlighted block (thesis/rationale)
- `p-4 bg-carbon/[0.03] border border-carbon/[0.08]`

## 5. Spacing Patterns

### Page-level
- `px-4 sm:px-8 md:px-12 lg:px-16 py-8 sm:py-12`
- Main sections: `space-y-6`

### Within cards
- Header to content: `mb-4` to `mb-6`
- Between sections: `space-y-4` or `space-y-5`
- Label to value: `mb-1` to `mb-2`

### Grid gaps
- Card grids: `gap-3` to `gap-5`
- Metric grids: `gap-4`

## 6. Interactive Patterns (from Creative Synthesis)

### Editable fields (inline)
- Transparent bg, border appears on hover/focus:
- `bg-transparent border border-transparent hover:border-carbon/[0.08] focus:border-carbon/[0.12] focus:outline-none`

### Selection cards (choose one)
- `border border-carbon/[0.08] p-5 hover:border-carbon/30 transition-all`
- Selected: `border-carbon bg-carbon/[0.03]`

### Priority / Status badges
- `px-2.5 py-1 text-[10px] font-semibold tracking-[0.05em] uppercase`
- Dark: `bg-carbon text-crema` / Medium: `bg-carbon/[0.15] text-carbon` / Light: `bg-carbon/[0.06] text-carbon/50`

### Celebration overlay
- `fixed inset-0 z-[100] bg-carbon/95`
- Staggered animations: fadeIn, slideUp, scaleIn with 0.3-1.8s delays
- Check icon in bordered square, not a circle

## 7. Animations
```css
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes slideUp { from { opacity: 0; transform: translateY(40px) } to { opacity: 1; transform: translateY(0) } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.5) } to { opacity: 1; transform: scale(1) } }
```
- Standard: `animation: fadeIn 0.6s ease-out forwards`
- Staggered: increment delay by 0.2-0.3s per element

## 8. Key Rules (NEVER break these)

1. **font-light is default** — NEVER font-bold for headlines (only font-semibold for tiny labels)
2. **italic for emphasis** — the signature typographic move
3. **Monochromatic ONLY** — no decorative colors. Carbon + crema + opacity variations
4. **Modern rounding (6px)** — `rounded-md` everywhere via `--radius: 6px`. Modern editorial. Pills (`rounded-full`) for tags/badges.
5. **Generous whitespace** — let content breathe, don't cram
6. **Uppercase + wide tracking for labels** — editorial magazine feel
7. **Borders are whispers** — carbon/[0.06] max for cards, barely visible
8. **Text hierarchy through opacity** — not through size or weight changes
9. **Creative Synthesis is the benchmark** — when in doubt, copy that page's patterns
