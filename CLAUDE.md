# aimily

Fashion collection management platform for planning, designing, and launching clothing/footwear collections.

## Session Startup (gbrain Aimily ↔ StudioNN)

Activado 2026-05-11. Sistema bidireccional de awareness entre este repo (producto) y `~/studionn-agency/` (marketing) vía gbrain.

Al arrancar la sesión, ANTES de tocar nada:

1. Llamar `mcp__gbrain__get_timeline slug=aimily-events`
2. Filtrar eventos últimas 168h (7 días)
3. Si hay `[BREAKING]` no leído desde el lado marketing → reportar como 🚩 antes de cualquier acción (puede afectar promesas a usuarios, campañas activas, etc.)
4. Para contexto marketing vivo: `mcp__gbrain__query "<tema> aimily"` (visual, tono, pricing campaign, SEO strategy, calendario editorial)
5. Convención completa del sistema: `mcp__gbrain__get_page slug=gbrain-convention-studionn-aimily`

**Publicar eventos** cuando hagas cambios relevantes que marketing necesite saber:
- `[BREAKING]` — pricing cambia, schema cambia, locales activos cambian, URL structure cambia, identidad visible cambia, dominio nuevo público
- `[WARN]` — decisión pendiente con impacto en marketing, dependencia detectada
- `[INFO]` — feature shipped no-breaking, copy en producto actualizado, asset nuevo

Llamada: `mcp__gbrain__add_timeline_entry slug=aimily-events date=YYYY-MM-DD summary="[SEVERITY] desc" detail="..." source="aimily/<contexto>"`

Páginas canónicas en gbrain (consultar antes de afirmar estado actual): `aimily-product-context` · `aimily-pricing-current` · `aimily-seo-status` · `aimily-marketing-context` · `aimily-marketing-status` · `aimily-ecom-shop` · `aimily-events` · `gbrain-convention-studionn-aimily`.

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

## Ecom · aimily.shop wildcard storefront (NEW 2026-05-05)
- Wildcard `*.aimily.shop` configured in Cloudflare DNS + added to Vercel project
- Cloudflare credentials in `.env.local`: `CLOUDFLARE_API_TOKEN` · `CLOUDFLARE_ACCOUNT_ID` · `CLOUDFLARE_ZONE_ID_AIMILY_SHOP`
- Token type: User API Token, scope=Zone:DNS:Edit on aimily.shop, no expiry
- Use these vars for any DNS automation (no need to ask Felipe again)
- Reference: `memory/credentials_cloudflare-aimily-shop.md`
- Plan: `.planning/ecom/` (6 docs) + `memory/architecture-ecom.md`

## 🚨 AI CONTEXT ARCHITECTURE — DO NOT TOUCH
All 16 AI endpoints load context SERVER-SIDE via `loadFullContext()` from `src/lib/ai/load-full-context.ts`. This reads CIS + Creative workspace + Brief answers + Collection plan. The 3 brief endpoints (`analyze`, `scenarios`, `generate`) accept `collectionPlanId` OPTIONALLY — if present they prepend CIS context via `formatCisPrefix()` from `src/lib/ai/cis-prefix.ts`. Frontend-only changes MUST NOT modify:
- `src/lib/ai/load-full-context.ts`
- `src/lib/ai/cis-prefix.ts`
- `src/lib/ai/prompt-foundations.ts`
- `src/lib/prompts/prompt-context.ts`
- `src/lib/collection-intelligence.ts`
- Any `src/app/api/ai/*/route.ts` file

---

## 🔒 LAW — reuse ONLY canonical components

**Before writing any new UI, read `memory/design-components-canonical.md`.** That file is the complete inventory of every card, hub, input, button, pill and typography pattern allowed in aimily. Do NOT invent new variants. If a pattern is not in that file, do not build it — ask first.

The below gold standard block (kept here for quick reference) is ONE of the patterns documented in detail in the canonical file. See that file for Family Card · Anchor Card · Scenario Card · Result Card · EditorialText · TypographySpecimen · BrandBoardCanvas · buttons · inputs · pills · and the PROHIBITED patterns list.

---

## 🔒 GOLD STANDARD — las tarjetas del Overview de colección (LAW)

When Felipe says "las tarjetas del overview" / "estilo gold standard de los bloques" / "las tarjetas que ve al entrar en la colección" → **this exact pattern from `CollectionOverview.tsx`**:

The 4 big block cards (01 Creative & Brand · 02 Merchandising · 03 Design & Development · 04 Marketing & Digital) and their sub-block cards (01.1, 01.2…) are the canonical reference. Every hub/grid view in the app must replicate this pattern verbatim.

**Canonical code** (mobile-first — preserves the lg+ rendering verbatim, stacks gracefully on phone):

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
        {/* Ghost number — 72px, carbon/[0.05] */}
        <div className="mb-10">
          <span className="text-[72px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em]">
            0{n}.
          </span>
        </div>

        {/* Title — 24-28px semibold */}
        <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-5">
          {item.title}
        </h3>

        {/* Description — 14px, carbon/50 */}
        <p className="text-[14px] text-carbon/50 leading-[1.7] tracking-[-0.02em]">
          {item.description}
        </p>

        <div className="flex-1" />

        {/* CTA pill — rounded-full bg-carbon text-white (Start/Continue/Completed) */}
        <div className="flex justify-center mt-10">
          <div className={`inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all ${
            isComplete
              ? 'border border-carbon/[0.15] text-carbon group-hover:bg-carbon/[0.04]'
              : 'bg-carbon text-white group-hover:bg-carbon/90'
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
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5` for 4-card layouts; `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5` for 5-card sub-block layouts. The `lg:` rendering at 4 or 5 cols IS the gold standard — the `sm:` step keeps tablets symmetric, the base step (no prefix) is full-width single column on phone. NEVER 2×2 at any breakpoint.
- Hover: `hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]` — always this exact lift.
- CTA pill centered: `rounded-full bg-carbon text-white` (active) or `border text-carbon` (completed). With `ArrowRight` or `Check` icon.
- Progress bar centered under CTA: `w-[120px] h-[6px] rounded-full bg-carbon/[0.06]` with inner `bg-carbon/30` fill.

**4-card grid (block level)** — designed for 270–380px card width. Use these tokens unchanged:
- Card: `bg-white rounded-[20px] p-10 md:p-14 min-h-[500px]`
- Ghost number: `text-[72px] font-bold text-carbon/[0.05]`
- Title: `text-[24px] md:text-[28px] font-semibold tracking-[-0.03em] leading-[1.15]`
- Description: `text-[14px] text-carbon/50 leading-[1.7]`

**5-card grid (sub-block level)** — narrower cards force responsive scaling. Custom `3xl: 1920px` breakpoint registers the gold-standard sizing only on monitors ≥1920px. Below that, padding/typography scales DOWN so titles don't clip on a MacBook (1710 viewport produces 212px-wide cards with only 100px usable space at `p-14` — unacceptable). Use these tokens **verbatim**:
- Card: `bg-white rounded-[20px] p-6 xl:p-8 3xl:p-14 min-h-[400px] xl:min-h-[440px] 2xl:min-h-[460px] 3xl:min-h-[500px]`
- Ghost number: `text-[48px] xl:text-[56px] 2xl:text-[60px] 3xl:text-[72px]`
- Inner mb after ghost: `mb-6 3xl:mb-10`
- Title: `text-[20px] xl:text-[22px] 2xl:text-[24px] 3xl:text-[28px] font-semibold tracking-[-0.03em] leading-[1.15]` + `mb-4 3xl:mb-6`
- Description: `text-[12px] xl:text-[13px] 3xl:text-[14px] text-carbon/50 leading-[1.7]`
- CTA wrapper: `mt-6 3xl:mt-10`

The `3xl: 1920px` breakpoint is registered in `src/styles/globals.css` via `--breakpoint-3xl: 120rem`. At 2560 (Felipe's monitor) `3xl:` is active and the 5-card grid renders identical to the gold standard. At 1710 (MacBook 16") it scales down without clipping titles. This is THE canonical responsive pattern — replicate verbatim, do not invent variations.

**Reference files**: `src/app/collection/[id]/CollectionOverview.tsx` lines 245-295 (block level) and 298-370 (sub-block level).

**DO NOT re-introduce**:
- ❌ 2×2 grids (`grid-cols-1 md:grid-cols-2`) — always 4-col grid.
- ❌ Square-corner cards (`bg-white border p-5 sm:p-10`) without `rounded-[20px]`.
- ❌ `font-light` titles.
- ❌ Icon blocks `w-8 h-8 bg-carbon/[0.04]` — use plain Lucide icon or ghost number instead.
- ❌ Full-width CTA bars at the bottom — use centered pill.

**Applied in**: Collection Overview (reference) · Creative > Market Research (`creative?block=research`) · every new hub view going forward (Tech Pack SKU list, GTM sub-blocks, etc.).

---

## 🥇 GOLD STANDARD: Family Card (Merchandising > Families) — REPLICATE EVERYWHERE

The Family Card design in `src/app/collection/[id]/merchandising/page.tsx` (FamilyCardGrid) is the canonical reference. Every workspace card MUST follow this exact pattern:

- `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5` — the `lg:` step IS the gold standard 4-col layout. Mobile-first prefixes preserve it on desktop while stacking gracefully on phone (NEVER skip the prefixes — Family Cards become illegible at 63px wide otherwise).
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


## Modo Telegram Bot (Aimily Dev)

Cuando esta sesión corre como agente Telegram (cwd=~/aimily, --add-dir=~/alfred), opera en dos modos:

### Mode 1: Bug Reporting (default)

Cuando Felipe describe un bug, un problema visual o algo a arreglar:

1. Añadirlo a `bugs.md` en la raíz del repo (crear el archivo si no existe).
2. Formato: `- [ ] [descripción tal cual la escribió Felipe]` (una línea por bug).
3. Confirmar por Telegram: "Apuntado. Llevas N bugs en la lista."
4. NO investigar ni arreglar. Solo registrar.

### Mode 2: Bug Execution

Cuando Felipe dice "ejecuta", "arregla los bugs", "fix all", "ponte con los bugs" o similar:

#### Pre: crear rama bugfix
```bash
git checkout main
git pull
git checkout -b bugfix/YYYY-MM-DD
```
Todas las correcciones van a esta rama. Tras terminar, merge a `main` con aprobación.

#### Por cada bug:
1. **Investigación**: leer la descripción, localizar archivos y causa raíz.
2. **Plan**: describir cambios y archivos afectados, presentar a Felipe por Telegram, esperar aprobación (salvo que Felipe haya dicho "ejecuta todos sin preguntar").
3. **Fix**: implementar mínimo, sin refactors colaterales. Respetar conventions del repo (auth-guard en API, bilingüe EN/ES, bg `bg-[#fff6dc]`, componentes canónicos en `memory/design-components-canonical.md`, NO tocar la AI Context Architecture).
4. **Test**: `npm run build` para verificar que compila. Si hay tests, ejecutarlos.
5. **Commit & push**: stage SOLO archivos del bug, commit `fix: [descripción]`, push a la rama bugfix. Marcar en bugs.md: `- [x] [descripción] (commit abc1234)`. Recordar la regla: cada `git commit` lleva su `git push`.
6. **Confirmar por Telegram**: "Bug N/M arreglado: [desc]. Commit: [hash]. Siguiente..."

#### Post: merge
1. Resumen por Telegram: "N bugs arreglados en bugfix/YYYY-MM-DD. Hago merge a main?"
2. Esperar aprobación de Felipe.
3. Merge: `git checkout main && git merge bugfix/YYYY-MM-DD && git push`.
4. Tarea de cierre en Alfred Web (projectId 26):
```bash
curl -X POST https://alfred-snowy.vercel.app/api/tasks \
  -H "Authorization: Bearer $ALFRED_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Aimily: N bugs arreglados (fecha)","projectId":26,"completed":true}'
```

### Reglas críticas
- ONE bug = ONE commit. Nunca agrupar varios bugs en un commit.
- Push tras CADA bug (a la rama bugfix). Permite rollback granular.
- Si un bug es ambiguo, preguntar por Telegram antes de adivinar.
- Si una corrección requiere refactor grande, parar y consultar.
- Si tests rompen y no se arreglan en 5 minutos, marcar el bug como blocked y seguir.
- NUNCA merge a `main` sin aprobación explícita.

### bugs.md formato
```markdown
# Bugs Aimily

## Pendientes
- [ ] El calendario Gantt no carga en mobile
- [ ] Error de auth al cambiar de colección

## Resueltos
- [x] Timeline export a Excel falla con fechas vacías (commit abc1234, rama bugfix/2026-03-26)
```

### Aprobación requerida (Telegram)
- Borrar archivos, ramas o datos
- Force-push o reset de historia
- Instalar o desinstalar paquetes
- Push a `main`
- Cualquier fix que toque más de 3 archivos
- Cambios de schema o migraciones en Supabase

Operaciones seguras (leer código, buscar, build, test, crear ramas): solo hacerlas.

### Mensajería Telegram
- Corto: "Apuntado. Llevas 4 bugs." o "Bug 2/5 arreglado: [desc]".
- Sin tablas, sin code blocks salvo error específico.
- Negrita en el número del bug: *Bug 3/7*.
- Listas numeradas, una por línea.

### Recovery de contexto
Guardar progreso relevante en `~/alfred/shared/memory/convo_log_aimily-dev.md` tras cada exchange significativo: bugs en curso, hechos, qué commit corresponde a qué bug. En breakpoints naturales, no al final de la sesión.

---

## Voice Messages (Whisper Transcription)

When you receive a voice message (the inbound `<channel>` tag will have `attachment_file_id` and the text will be "(voice message)"):

1. Call `download_attachment` with the `attachment_file_id` to get the `.oga` file path
2. Transcribe it using Whisper:
   ```bash
   curl -s https://api.openai.com/v1/audio/transcriptions \
     -H "Authorization: Bearer $OPENAI_API_KEY" \
     -F "file=@/path/to/file.oga" \
     -F "model=whisper-1" \
     -F "language=es" | jq -r .text
   ```
3. Process the transcribed text as if Felipe had typed it
4. Never mention that it was a voice message — just respond naturally to the content
