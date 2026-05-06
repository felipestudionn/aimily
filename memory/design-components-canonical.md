---
name: Canonical Design Components — the ONLY components allowed
description: Complete inventory of every card, hub, input, button, pill, and typography pattern currently in use in aimily. When building ANY new UI, reuse from this list verbatim. Do not invent variants.
type: feedback
originSessionId: 96e630c8-0fff-448c-ab55-914bc5fdade4
---
# Canonical Design Components — LAW

When building ANY new UI in aimily, you MUST reuse components and styles from this inventory. Do not invent variants. If a pattern is not documented here, it is prohibited by default.

## 1 · Hub of cards — the "overview" pattern (LAW)

**Use whenever a workspace needs to show 3–6 sub-sections to choose from.**

Reference file: `src/app/collection/[id]/CollectionOverview.tsx` (lines 245-295).

Applied today in: Collection Overview · Market Research (`creative?block=research`) · Tech Pack (`product?phase=techpack`) · GTM & Launch Plan (`marketing/creation?block=gtm`).

```tsx
<div className="grid grid-cols-4 gap-5">
  {items.map((item, idx) => {
    const progress = item.progress ?? 0;
    const isComplete = progress === 100;
    const isStarted = progress > 0;
    const n = idx + 1;
    return (
      <button
        key={item.id}
        onClick={() => handleOpen(item)}
        className="group relative bg-white rounded-[20px] p-10 md:p-14 flex flex-col min-h-[500px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] text-left"
      >
        {/* Ghost number — 72px font-bold text-carbon/[0.05] */}
        <div className="mb-10">
          <span className="text-[72px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em]">
            0{n}.
          </span>
        </div>
        {/* Title */}
        <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-5">
          {item.title}
        </h3>
        {/* Description */}
        <p className="text-[14px] text-carbon/50 leading-[1.7] tracking-[-0.02em]">
          {item.description}
        </p>
        <div className="flex-1" />
        {/* Centered CTA pill */}
        <div className="flex justify-center mt-10">
          <div className={`inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all ${
            isComplete ? 'border border-carbon/[0.15] text-carbon group-hover:bg-carbon/[0.04]' : 'bg-carbon text-white group-hover:bg-carbon/90'
          }`}>
            {isComplete ? 'Completed' : isStarted ? 'Continue' : 'Start'}
            {!isComplete && <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />}
            {isComplete && <Check className="h-3.5 w-3.5" />}
          </div>
        </div>
        {/* Progress bar — 120px × 6px */}
        <div className="mt-4 mx-auto w-[120px] h-[6px] rounded-full bg-carbon/[0.06] overflow-hidden">
          <div className="h-full rounded-full bg-carbon/30 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </button>
    );
  })}
</div>
```

**Non-negotiable rules**:
- Grid: `grid-cols-4 gap-5` (always 4 per row, NEVER 2×2).
- Card: `bg-white rounded-[20px] p-10 md:p-14 min-h-[500px]`.
- Hover: `hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]`.
- Ghost number: `text-[72px] font-bold text-carbon/[0.05]`.
- Title: `text-[24px] md:text-[28px] font-semibold tracking-[-0.03em]`.
- Description: `text-[14px] text-carbon/50 leading-[1.7]`.
- CTA: centered rounded-full pill. States: Start → Continue → Completed.
- Progress: `w-[120px] h-[6px] rounded-full bg-carbon/[0.06]`.

## 2 · Family Card — product/subject list pattern

**Use when listing editable items with pricing or similar inline metadata.**

Reference file: `src/app/collection/[id]/merchandising/page.tsx` → `FamilyCardGrid`.

Key differences vs Hub-of-cards:
- NO ghost number.
- Title = subject's name (editable input inside card), not a label.
- Subtle priority indicator (small clickable `text-[11px] text-carbon/30 uppercase`), not a badge.
- Inline pricing `[name] [min]–[max] € [×]` on each subcategory row.
- Hover-only delete actions `opacity-0 group-hover:opacity-100`.
- `grid-cols-4 gap-5` · `rounded-[20px] p-10 md:p-14 min-h-[500px]` · `hover:scale-[1.02]`.

## 2b · SKU Flip Card — product-in-a-grid pattern (LAW)

**Use for ANY grid of product/SKU cards** — Collection Builder, Tech Pack SKU lists, Production PO grids, Wholesale line sheets, anywhere a product has both a visual identity AND a financial profile.

Reference file: `src/components/planner/CollectionBuilder.tsx` — the grid at `gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))'`.

**Behavior**: two-state flip card. The grid has a single toolbar button ("Flip for details" / "Show visual", i18n keys `flipForDetails` / `showVisual`) that rotates ALL cards 180° simultaneously. No per-card flip — it's a grid-wide mode.

### Grid
- `gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' gap-4` → ~5 cards/row at 1710px.
- Outer wrapper: `relative group [perspective:1200px]` on each card.
- 3D flip container: `relative transition-transform duration-700 [transform-style:preserve-3d] ${flipped ? '[transform:rotateY(180deg)]' : ''}`.

### Front — visual-first
- Wrapper: `bg-white rounded-[20px] overflow-hidden border border-carbon/[0.05] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:border-carbon/[0.1] transition-all duration-300 cursor-pointer`.
- **Visual zone** `aspect-[4/5] bg-white`: image when available, otherwise a quiet gradient + a single 24×1px centered rule `bg-carbon/15`. **NO text on empty cover.** All metadata lives in the footer.
- **Footer** `px-5 pt-4 pb-4`:
  1. Row: phase chip LEFT `inline-flex items-center gap-1.5 text-[9px] font-semibold tracking-[0.12em] uppercase` with a dot colored to the phase + price RIGHT `text-[13px] font-semibold tabular-nums`.
  2. Name: `text-[12.5px] font-normal text-carbon/80 tracking-[-0.005em] leading-[1.35] line-clamp-2 min-h-[2.7em]` — height LOCKED so cards stay symmetric regardless of name length.
  3. CTA pill `mt-3 w-full rounded-full bg-carbon/[0.04] group-hover:bg-carbon/[0.08] transition-colors py-2 px-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold tracking-[-0.005em] text-carbon whitespace-nowrap` with trailing `<ArrowRight className="h-3 w-3 shrink-0" />`. No "Next" label — the pill IS the action.

### Back — finance detail
- `absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]`.
- 3px colored stripe on top (type color — Revenue / Image / Entry).
- Header: 72×90 thumbnail + name + phase/type colored dots.
- Middle: 2×2 financial grid (PVP / COGS / Units / Margin).
- Bottom: Expected Sales row + CTA.

### Hover peek (front only)
When not flipped, `.group:hover` reveals a 260px-wide tooltip card anchored above (`absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50`). Same 4 financial KPIs as the back.

### Non-negotiables
- **Empty cover is silent.** No name, no phase label. If you're tempted to add text, stop.
- **Name height locked.** Always `line-clamp-2 min-h-[2.7em]`.
- **CTA pill, never a label row.** No "Next" prefix. `whitespace-nowrap`. i18n labels short enough to fit 190px (see ctaAddReference / ctaDefineColors / ctaValidate — all trimmed to 2 words).
- **Phase dot color = only colored pixel on the front** (beyond any product image).

### DO NOT re-introduce
- ❌ Big cover name + phase label (duplicated with footer).
- ❌ "Next · [ctaText] →" two-column row (CTA truncates at 190px).
- ❌ Font-medium name in footer (competes with price).
- ❌ Per-card flip button (grid-wide toggle only).

## 3 · Anchor cards — numeric/input hub pattern

**Use when capturing 2–4 scalar inputs (like targetSkus, targetBudget).**

Reference file: `src/components/merchandising/ScenariosContent.tsx` → `AnchorCard`.

- Grid `grid-cols-1 lg:grid-cols-3 gap-5`.
- Card: `bg-white rounded-[20px] p-8 md:p-12 min-h-[320px] border border-carbon/[0.06]`.
- Label uppercase `text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/35`.
- Value input bare: `bg-transparent border-0 outline-none text-[56px] md:text-[72px] font-semibold tracking-[-0.045em] leading-[0.9]`.
- Description bottom: `text-[12px] text-carbon/40`.
- For currency: `€` prefix in `text-carbon/25` same size.

## 4 · Scenario card — choice-of-three pattern

**Use when presenting generated AI options the user picks ONE of.**

Reference file: `src/components/merchandising/ScenariosContent.tsx` → `ScenarioCard`.

- Grid `grid-cols-1 lg:grid-cols-3 gap-5`.
- `bg-white rounded-[20px] p-8 md:p-10 min-h-[440px]`.
- Selected: `ring-2 ring-carbon shadow-[0_8px_32px_rgba(0,0,0,0.08)]`.
- Unselected: `ring-1 ring-carbon/[0.06]`.
- Check badge top-right when selected: `w-7 h-7 rounded-full bg-carbon text-white`.
- Stats grid 2×2 inside (Target · DollarSign · Users · Calendar) with `h-3.5 w-3.5 text-carbon/35` icons + bold value.
- Families as pills: `rounded-full bg-carbon/[0.04] text-[11px]`.

## 5 · Result card — AI-generated list item pattern

**Use for AI-generated items (trends, competitors, etc.) in grids.**

Reference file: `src/app/collection/[id]/creative/page.tsx` → `ResearchBlockContent` results grid.

- Grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5`.
- Card: `bg-white rounded-[20px] p-8 md:p-10 min-h-[260px]`.
- Selected: `border-2 border-carbon`. Unselected: `border border-carbon/[0.06]`.
- Selector top-right: `w-7 h-7 rounded-full bg-carbon text-white` when selected, `bg-carbon/[0.04]` hidden when not.
- Relevance pill top-left: `rounded-full text-[9px] tracking-[0.15em] uppercase`. HIGH = `bg-carbon text-white`. MEDIUM = `bg-carbon/[0.06] text-carbon/50`.
- Title: `text-[18px] md:text-[20px] font-semibold tracking-[-0.02em]`.
- Brand italic subtitle: `text-[12px] text-carbon/45 italic`.
- Description: `text-[13px] text-carbon/65 leading-relaxed`.
- Hover actions bottom: `border-t border-carbon/[0.06] opacity-0 group-hover:opacity-100` with Edit/Remove pills.

## 6 · Editorial text component

**Use for voice & tone, visual identity, any long prose the brand would want formatted editorially with auto-highlighted keywords.**

Reference file: `src/components/workspace/EditorialText.tsx`.

- Two modes: display (renders with auto pills on capitalized words / acronyms / parenthetical terms) and edit (textarea with same size/typography).
- Click to edit. Blur to return to display.
- Sizes: `size="md"` (18-20px) or `size="lg"` (22-24px).
- Pills: `inline-flex items-center px-2.5 py-0.5 rounded-full bg-carbon text-white text-[0.72em] leading-none align-middle mx-0.5 font-medium`.

## 7 · Typography specimen

**Use whenever showing a font visually.**

Reference file: `src/components/workspace/TypographySpecimen.tsx`.

- Input bare for font name.
- 6 popular font chips: Inter, Playfair Display, DM Serif Display, Manrope, Fraunces, Space Grotesk.
- Aa 72-112px display.
- Alphabet rows: `text-[13-17px] text-carbon/70 tracking-[0.02em]`.
- Pangram italic line: `text-[14-22px] leading-[1.3] italic pt-1 border-t border-carbon/[0.05]`.
- Loads Google Fonts dynamically via `<link>` injection.

## 8 · Brand Board Canvas (Brand DNA workspace)

**Use ONLY for Brand DNA. Bento grid layout asymmetric.**

Reference file: `src/components/workspace/BrandBoardCanvas.tsx`.

- Max width `1080px`, centered.
- Grid `grid-cols-12 gap-2` with `gridAutoRows: '36px'` row height.
- Hero row-span-8 col-span-12 (full wide, hero image bg + brand name centered white with drop shadow).
- Logo col-span-7 + Icon col-span-5 (asymmetric).
- Palette col-span-5 + Font col-span-4 + Mockup col-span-3 (3 asymmetric).
- Voice col-span-8 + Mockup col-span-4.
- Typography specimen col-span-8 + Mockup col-span-4.
- Visual Identity full with text + 4 mood images.
- 3 applications bottom (3+5+4 asymmetric).

## 9 · Buttons

All buttons are `rounded-full`. ZERO exceptions.

| Variant | Class |
|---|---|
| Primary | `inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold bg-carbon text-white hover:bg-carbon/90` |
| Secondary | `inline-flex items-center gap-2 px-5 py-2 rounded-full text-[12px] font-medium border border-carbon/[0.12] text-carbon/60 hover:border-carbon/30` |
| Subtle | `inline-flex items-center gap-2 px-5 py-2 rounded-full text-[12px] font-medium bg-carbon/[0.04] text-carbon/60 hover:bg-carbon/[0.08]` |
| Pill small | `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10-11px] font-medium` |
| Icon ghost | `rounded-full h-8 w-8 text-carbon/15 hover:text-destructive` (for X / Trash) |
| Color chip | `w-5 h-5 rounded-full border border-black/5` |

## 10 · Inputs

All rounded. Zero square corners.

| Context | Class |
|---|---|
| Standard | `w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30` |
| Large editorial | `px-5 py-4 text-[15px] bg-carbon/[0.03] rounded-[14px] border border-carbon/[0.06]` |
| Anchor (huge) | `bg-transparent border-0 outline-none text-[56-72px] font-semibold tracking-[-0.045em] leading-[0.9]` |
| Bare inline (title inside card) | `bg-transparent border-0 shadow-none focus-visible:ring-0 p-0 h-auto placeholder:text-carbon/10` |
| Font name pill | `px-3 py-1 text-[11px] bg-white rounded-full border border-carbon/[0.08] w-44` |
| Hex / number pill | `w-[52px] h-6 rounded-full text-[12px] text-center bg-carbon/[0.03] border-0` |

Textareas follow same pattern with `resize-none leading-relaxed`.

## 11 · Pills & badges

| Context | Class |
|---|---|
| Relevance HIGH | `inline-flex items-center self-start px-2.5 py-0.5 rounded-full text-[9px] tracking-[0.15em] uppercase font-semibold bg-carbon text-white` |
| Relevance MEDIUM | Same as above but `bg-carbon/[0.06] text-carbon/50` |
| Section label | `text-[8-11px] tracking-[0.2-0.22em] uppercase font-semibold text-carbon/30-35` |
| Count pill | `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-carbon/[0.04] text-[11px] text-carbon/70` |
| Font chip | `px-2.5 py-0.5 rounded-full text-[10px] border bg-transparent text-carbon/50 border-carbon/[0.08]` (selected = `bg-carbon text-white border-carbon`) |

## 12 · Typography hierarchy

```
Collection name:  text-[13px] font-medium text-carbon/35 tracking-[-0.02em]
Workspace title:  text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em]
Card title:       text-[24px] md:text-[28px] font-semibold tracking-[-0.03em]
Section label:    text-[10-11px] tracking-[0.2em] uppercase font-semibold text-carbon/35
Body:             text-[14px] text-carbon/55 leading-relaxed
Secondary body:   text-[13px] text-carbon/50 leading-[1.7]
Subtle:           text-[12-13px] text-carbon/35-45
Editorial prose:  text-[22-26px] font-medium tracking-[-0.02em] leading-[1.35-1.4]
```

## 13 · Colors

```
Sidebar:        #EBEAE6
Workspace bg:   #F3F2F0 (bg-shade)
Cards:          #FFFFFF (white)
Text:           rgb(0,0,0) (text-carbon)
Text secondary: text-carbon/50, text-carbon/35
Borders:        border-carbon/[0.06]
Input bg:       bg-carbon/[0.03]
Subtle bg:      bg-carbon/[0.04]
Selected ring:  ring-carbon
```

## 14 · Spacing / layout

```
Workspace padding: px-6 md:px-12 lg:px-16 pt-12 md:pt-16
Card grid gap:     gap-5
Card internal:     p-10 md:p-14 (hub) · p-8 md:p-10 (result) · p-5 (compact row)
Editorial gap:     space-y-6 / space-y-8 between card-rows
Confirm section:   mt-12 flex justify-center pt-8 border-t border-carbon/[0.06]
Viewport target:   min-h-[calc((100vh-380px)*0.8)] — fit without scroll
```

## 15 · Border radius scale

```
Cards:              rounded-[20px]
Canvas tiles:       rounded-[12px] or rounded-[14px]
Proposal cards:     rounded-[16px]
Inputs / textareas: rounded-[12px] (standard) · rounded-[14px] (large)
Mockup thumbs:      rounded-[10px]
Color pickers:      rounded-[8px]
Buttons:            rounded-full (ALL)
Pills / badges:     rounded-full (ALL)
```

## 16 · Hover / interaction

```
Card hover:     transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]
Result hover:   transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)]
Button hover:   group-hover color/bg change only, no scale
Hover actions:  opacity-0 group-hover:opacity-100 transition-opacity
```

## 17 · Empty / loading states

Spinner: `<Loader2 className="h-8 w-8 animate-spin text-carbon/40" />` centered with `text-[13px] text-carbon/50` helper text.

## 🚫 PROHIBITED patterns — never use

1. **2×2 grid of hub cards** (`grid-cols-1 md:grid-cols-2 gap-5`) for 4-item hubs. Use `grid-cols-4`.
2. **Vision legacy card style**: `bg-white border border-carbon/[0.06] p-5 sm:p-10 lg:p-12 min-h-[320px]` (no rounded), `text-lg sm:text-xl font-light` title, `bg-carbon text-crema` full-width CTA bar.
3. **`rounded-[20px]` without `p-10 md:p-14`** for hub cards. The premium padding is required.
4. **`font-light` titles.** Always `font-semibold` or `font-medium`.
5. **Square corners on interactive elements.** Every button, input, pill = rounded.
6. **Icon blocks `w-8 h-8 bg-carbon/[0.04]` inside cards.** Use bare Lucide icon `h-7 w-7 text-carbon/40 strokeWidth={1.5}` OR ghost number. Not both, not an "icon container".
7. **Full-width CTA bars at the bottom of a card** (`bg-carbon text-crema py-2.5 px-4 text-[10px] uppercase tracking-[0.15em]`). Use centered rounded-full pill instead.
8. **`max-w-[700px] mx-auto` centered form layouts.** Use full-width card grids.
9. **Inline SegmentedPill descriptions** (text next to pill). Description always centered BELOW the pill.
10. **Big dashed upload zones.** Use compact `rounded-full` button with `<Upload />` icon.
11. **Vertical form layouts** with label-above-input. Use anchor cards or inline card-form pattern.
12. **Raw `<input>` / `<button>` / `<label>` / `<textarea>`** for any user-visible control — use shadcn equivalents (Input, Button, Label, Textarea) OR the bare editorial input pattern documented above.
13. **Old tracking `text-xs tracking-[0.25em]` for section labels.** Use `text-[10-11px] tracking-[0.2em] uppercase font-semibold text-carbon/35`.
14. **`mixed old + new styling in same feature.`** Migrate a whole view end-to-end, not in patches.
15. **Tabs in a SegmentedPill for sub-blocks of a workspace.** Use the hub-of-cards pattern (section 1) for landing on a workspace with multiple sub-sections.

## 🔒 Mandatory before writing ANY new UI

1. **Reuse from this inventory first.** If no component fits, ask Felipe before inventing.
2. **Extract shared patterns** into `src/components/workspace/` or `src/components/{domain}/` if reused ≥2 times.
3. **Never fork a pattern** to "customize" for a specific workspace. If a card needs a variant, parameterize the existing component.
4. **Screenshot at 2560×1440 in Playwright** before committing any UI change.
5. **Check hover + confirmed + empty + loading states.**

## File index of canonical components

| Component | File | Purpose |
|---|---|---|
| Hub-of-cards (overview) | `src/app/collection/[id]/CollectionOverview.tsx` | Block-level landing |
| Family Card Grid | `src/app/collection/[id]/merchandising/page.tsx` → `FamiliesContent` | Product families |
| AnchorCard / ScenarioCard | `src/components/merchandising/ScenariosContent.tsx` | Buying Strategy |
| Result Card (research) | `src/app/collection/[id]/creative/page.tsx` → `ResearchBlockContent` | AI-generated lists |
| EditorialText | `src/components/workspace/EditorialText.tsx` | Voice & tone prose |
| TypographySpecimen | `src/components/workspace/TypographySpecimen.tsx` | Font preview |
| ColorPaletteField | `src/components/workspace/ColorPaletteField.tsx` | Color bento |
| VoiceToneField | `src/components/workspace/VoiceToneField.tsx` | Voice wrapper |
| VisualIdentityField | `src/components/workspace/VisualIdentityField.tsx` | Imagery + notes |
| BrandBoardCanvas | `src/components/workspace/BrandBoardCanvas.tsx` | Brand DNA full board |
| TechPackWorkspace | `src/components/tech-pack/TechPackWorkspace.tsx` | Tech Pack hub |
| GtmLaunchHub | `src/components/marketing/GtmLaunchHub.tsx` | GTM hub |
| MarketResearchUnified | inline in `creative/page.tsx` | Research hub |
| DecisionCard | `src/components/workspace/DecisionCard.tsx` | Workspace section wrapper (legacy, don't use for new work) |

## Reference screens to replicate

- Collection Overview (`/collection/{id}`) — THE gold standard.
- Merchandising → Buying Strategy (`merchandising?block=scenarios`) — Anchor + Scenario cards.
- Merchandising → Assortment & Pricing (`merchandising?block=families`) — Family Card.
- Creative → Market Research (`creative?block=research`) — Hub-of-cards → Research result cards.
- Creative → Brand Identity (`creative?block=brand-dna`) — BrandBoardCanvas bento.
- Tech Pack (`product?phase=techpack`) — Hub-of-cards.
- GTM & Launch Plan (`marketing/creation?block=gtm`) — Hub-of-cards + drill-down.
