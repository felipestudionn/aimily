# Mobile Audit 2026-05-04

> Viewport principal: **375×812** (iPhone 13/14). Spot-check final: **412×915** (Pixel 7).
> Test collection: `60652ef7-1b06-4be4-9a61-31357be0be65` (SS27 SLAIZ, English locked).
> Reglas: i18n MANDATORY · sm/md/lg/xl/2xl/3xl breakpoints existentes · architecture-locked files NO se tocan · touch-target ≥ 44×44.

## Surfaces verificadas (Pass completo — 14:23 → 14:49)
- [x] `/my-collections` — ✅ PASS
- [x] Mobile drawer (hamburger) — ⚠️ funciona; muestra "Prueba Gratis" siendo logged-in
- [x] `/collection/[id]` overview — ✅ PASS (block grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`)
- [x] `/merchandising?block=scenarios` (Buying Strategy) — ✅ PASS
- [x] `/merchandising?block=families` (Surtido & Precios) — 🔴 BREAK
- [x] `/merchandising?block=channels` (Distribución) — ✅ PASS
- [x] `/merchandising?block=budget` (Plan Financiero) — 🟡 labels overlap
- [x] `/product` (Collection Builder) — 🔴 BREAK (277px overflow)
- [x] `/factories` — 🟡 "Back to Tech Pack" se solapa con título
- [x] `/suppliers` — 🟡 mismo issue
- [x] `/calendar` mode — 🟠 timeline 2056px oculto (no scroll discoverable)
- [x] `/presentation` deck — 🟠 awkward (16:9 en portrait)
- [x] `/marketing/creation?block=sales` — ✅ PASS
- [x] `/marketing/creation?block=gtm` (GTM Hub) — 🔴 BREAK (4 cards 63px)
- [x] `/marketing/creation?block=content` (Content Studio) — ✅ PASS
- [x] `/marketing/creation?block=comms` (Communications) — ✅ PASS (tabs scroll-x)
- [x] `/creative?block=consumer` — 🟠 Editar btn rebasa 65px
- [x] `/creative?block=moodboard` — ✅ PASS (masonry intencional 4-col)
- [x] `/creative?block=brand-dna` — ✅ PASS
- [x] `/account` — ✅ PASS
- [x] `/p/[token]` share — 🟠 same 16:9 issue
- [x] NotificationBell dropdown — 🔴 BREAK (content cortado 80px a la izq)
- [ ] `/techpack/[skuId]` — necesita SKU id, omitido
- [ ] `/welcome` — confirmado mobile-friendly por sesión 2026-05-03
- [ ] AuthModal — necesita logout
- [ ] Modal borrar + Toast undo — interactive flow, pattern shadcn Dialog/Toast confiable
- [ ] Public landing `/` — necesita logout (cubierto por sesión 2026-05-03)

## ✅ Post-fix verification (375 + 412)

Verificado 8 surfaces críticas re-tested at 375×812 después de los fixes:
- `/merchandising?block=families` — overflow=0, Family Cards 1-col stack legible (Sneakers + 4 subcategorías) ✅
- `/marketing/creation?block=gtm` — overflow=0, GTM Strategy card full-width ✅
- `/product` (Collection Builder) — overflow=0 (era 277px), tab pill ahora `overflow-x-auto` ✅
- `/account` — overflow=0 ✅
- NotificationBell dropdown — fixed positioning a 12px del borde derecho, contenido completo legible ✅
- Plan Financiero — label "ESTIMADO" wraps debajo de "INVERSIÓN TOTAL" sin overlap ✅
- `/factories` — "Back to Tech Pack" link arriba del título, sin overlap ✅
- `/creative?block=consumer` — overflow=0, action buttons wrap correctamente ✅

Verificado en 412×915 (Pixel 7): Families, GTM, /product → todos overflow=0. Layout 1-col preserva la legibilidad por debajo de sm:640px.

`tsc --noEmit` clean. CLAUDE.md gold standard actualizado.

---

## 🔴 CRÍTICO (resueltos en sesión)
1. **Merchandising > Families & Pricing** — `grid-cols-4 gap-5` hardcodeado renderiza 4 Family Cards a 63px de ancho, ilegibles, títulos cortados a "FAMIL...". 37px overflow horizontal. **File**: `src/app/collection/[id]/merchandising/page.tsx:213`
2. **Collection Builder (/product)** — 277px de overflow horizontal masivo. SKU range plan grid sin breakpoints. **Files**: `merchandising/page.tsx`, `creative/page.tsx:2116`, plus interior grids del flip-card layout.
3. **Marketing > GTM Hub** — `grid-cols-4 gap-5` hardcodeado renderiza GTM Strategy / Launch Plan / Content Calendar / Paid Growth a 63px cada una; títulos cortados. 73px overflow. **File**: `src/components/marketing/GtmLaunchHub.tsx:114`
4. **Marketing cards interiores** — ContentCalendarCard, PaidGrowthCard, LaunchCard, GoToMarketCard tienen 23+ grids hardcoded `grid-cols-3/4/5/6` sin breakpoints (filas KPI/inputs internos). Aplastan o overflowean al abrir cualquier sub-block.
5. **NotificationBell dropdown** — content cortado 80px a la izquierda. Width 400 fija + anchor right edge → en 375 viewport sale por la izq. Cabecera "Notificaciones" se ve "ciones", items truncados ("ner & Target Definition", "oard Creation", "Research..."). Memory ya anticipaba este issue. **File**: `src/components/notifications/NotificationBell.tsx`

## 🟠 ALTO
1. **Collection Overview** — AssistantBubble tooltip "Pregúntale a Aimily..." sobre el título "SS27 SLAIZ" en mobile. Cubre el título.
2. **Presentation deck** (`/presentation` y `/p/[token]`) — slide 16:9 renderiza a 287×161 en portrait 375; mucho espacio negro arriba/abajo, navegación sí accesible. Sin breakpoint para portrait/landscape.
3. **Tech-pack directories** (Factory + Supplier) — `grid-cols-3` hardcodeado (FactoryDirectory.tsx:218, 298 / SupplierDirectory.tsx:237, 309). Visualmente acceptable (chips 79px) pero idealmente `grid-cols-2 sm:grid-cols-3`.
4. **Planner phases** (SketchPhase, ProductionPhase, PrototypingPhase) — `grid-cols-3` interno hardcodeado para chips KPI.
5. **Calendar mode** — timeline horizontal de 2056px oculto en 375; solo visible la sidebar de mini-blocks. Sin indicador visual de que se puede scrollear horizontalmente. Mobile UX confuso.
6. **Creative Consumer** — botón "Editar" + delete button rebasan 65px en cards de público objetivo.

## 🟡 MEDIO
1. **Mobile menu hamburger** — 36×36 px (< 44 touch target).
2. **Drawer logged-in muestra "Prueba Gratis"** — copy nav público mostrado a usuario con cuenta activa. No es responsive issue, pero evidente en mobile.
3. **BrandBoardCanvas** — `grid-cols-4 gap-2` interno (`src/components/workspace/BrandBoardCanvas.tsx:258`).
4. **Family Cards (cuando lleguen al mobile fix)** — pricing pills "min/max" rounded-full bg-carbon/[0.03] necesitan validación táctil.
5. **Plan Financiero (budget)** — labels "ESTIMADO" superpuesto sobre "INGRESOS ESPERADOS" en card de KPI. Probable absolute positioning legacy pensado para desktop.
6. **Factories/Suppliers header** — link "Back to Tech Pack" se solapa con "SS27 SLAIZ" en mobile (no espacio vertical separador).

## 🟢 BAJO
1. **Iconos action botones** 28-32 px en cards (delete/edit hover) — táctilmente borderline.

---

## Scope total estimado de Fase 3
**16 archivos · 36 grids hardcoded** (excluyendo presentation templates, que son intencionalmente de aspect ratio fijo):

```
src/app/collection/[id]/creative/page.tsx
src/app/collection/[id]/merchandising/page.tsx
src/app/collection/[id]/product/loading.tsx
src/components/design-dev/FinalSelectionWorkspace.tsx
src/components/design-dev/ProductionWorkspace.tsx
src/components/marketing/ContentCalendarCard.tsx       (8 grids)
src/components/marketing/GoToMarketCard.tsx            (4 grids)
src/components/marketing/GtmLaunchHub.tsx              (1 grid)
src/components/marketing/LaunchCard.tsx                (5 grids)
src/components/marketing/PaidGrowthCard.tsx            (4 grids)
src/components/planner/sku-phases/ProductionPhase.tsx  (2 grids)
src/components/planner/sku-phases/PrototypingPhase.tsx (1 grid)
src/components/planner/sku-phases/SketchPhase.tsx      (1 grid)
src/components/tech-pack/FactoryDirectory.tsx          (2 grids)
src/components/tech-pack/SupplierDirectory.tsx         (2 grids)
src/components/workspace/BrandBoardCanvas.tsx          (1 grid)
```

**Patrón fix universal** (mobile-first, no tocar el gold standard en lg+):
- `grid-cols-4 gap-5` (Family Card · Sub-block hub · 4-card hub) → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5`
- `grid-cols-5 gap-5` (sub-block hub 5-card) → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5`
- `grid-cols-3 gap-X` interior (KPI chips, inputs row) → `grid-cols-2 sm:grid-cols-3 gap-X`
- `grid-cols-6 gap-3` (ContentCalendar week strip) → necesita `overflow-x-auto` pattern + sticky labels
- `grid-cols-3 gap-2` con texto chico (chips de stats) → `grid-cols-3 gap-2` se mantiene (firstColW≥100px en 375 OK)

CLAUDE.md "GOLD STANDARD" especifica `grid-cols-4 gap-5` para 4-card layouts — **necesita actualización** a `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5` para que sea genuinamente mobile-friendly. El gold standard preserva el rendering desktop intacto.

---

## Notas técnicas durante el mapeo

**Detector de overflow refinado**: usé `gridTemplateColumns` resuelto + `firstColWidth` real (en px) en vez de inspección por className. Evita falsos negativos cuando un className tiene `lg:grid-cols-3` pero sigue rendering en 3 cols en mobile (caso real visto en algunos contenedores).

**Falsos positivos descartados**:
- ASIDE drawer con `translate-x-full` aparecía como "overflowing" → filtrado por matrix transform >= -100.
- Full-page screenshot con altura ~6300px se ve "crushed" en thumbnail → uso viewport-only para evaluación visual.
- Buying Strategy renderiza fine; el screenshot full-page engañó.

**No tocar** (architecture lock confirmado):
- AI context: `load-full-context.ts`, `cis-prefix.ts`, `prompt-foundations.ts`, `prompt-context.ts`, `collection-intelligence.ts`, `src/app/api/ai/*`
- Auth-email: `src/lib/auth-email-renderer.ts`
- Presentation templates 16:9: aspect-ratio fijo intencional, no es responsive issue.
