---
name: aimily Pitch Deck — Source of Truth
description: The aimily investor / Zara / partner pitch deck. Two language versions live on main — docs/aimily-pitch.key (ES, canonical) and docs/aimily-pitch-en.key (English). Read this before touching anything related to the deck. The old web /pitch was a misaligned draft removed 2026-05-29.
type: project
---

# aimily Pitch Deck — Source of Truth

> **The investor / Zara / partner pitch deck — definitive, ship-ready, as of 2026-05-29.**
>
> Two language versions live on `main`, both as Keynote files:
> - `docs/aimily-pitch.key` — Spanish peninsular, canonical source of truth. Felipe edits directly here.
> - `docs/aimily-pitch-en.key` — English, mirror translated from ES on 2026-05-29 via AppleScript. Fonts, colors, layout, photos preserved 1:1.
>
> Both files are presentation-ready. The 3 known ES typos (slides 5, 9, 20) were corrected on 2026-05-29 — no outstanding fixes.
>
> Both files have nothing to do with any web route. An earlier web deck at `/pitch` was a misaligned draft that lived in `src/app/(pitch)/` + `src/components/pitch/` — **deleted on 2026-05-29** because it never matched the Keynote Felipe actually presents.

## Canonical artifacts

| File | Language | Status |
| ---- | -------- | ------ |
| `docs/aimily-pitch.key` | Spanish peninsular | **Source of truth · ship-ready.** Felipe edits directly in Keynote, commits the binary. |
| `docs/aimily-pitch-en.key` | English | **Ship-ready** mirror of the ES, translated 2026-05-29. **Must be re-translated whenever the ES changes** — see sync workflow below. |

- **Format**: Apple Keynote binary.
- **Length**: 23 slides each.
- **Audience**: investors, Zara CTO / partners, internal stakeholders. Use whichever language matches the room.

## How the English version got translated (and how to re-translate after future ES edits)

The EN version was produced from code via AppleScript (`osascript` → `tell application "Keynote"`). The same approach is repeatable any time the ES version changes:

1. Save the current ES Keynote in `docs/aimily-pitch.key`. Close Keynote.
2. Duplicate: `cp docs/aimily-pitch.key docs/aimily-pitch-en.key`.
3. Open the duplicate in Keynote.
4. Iterate over every slide and every text item, replacing the ES `object text` with the EN equivalent. Reference the slide-by-slide EN copy in [`memory/pitch-keynote-en-copy.md`](pitch-keynote-en-copy.md).
5. For text items nested inside `group`s (only slide 9 in v1), navigate via `iWork item N of g` instead of `text item N of g`.
6. Save + close Keynote: `save document "aimily-pitch-en.key"` then `close … saving yes`.
7. `git add docs/aimily-pitch-en.key`, commit, push.

**Caveats that came up during v1 translation** (worth re-checking on every re-translation):
- AppleScript `linefeed` between paragraphs creates a soft line break inside a single paragraph. Use `return` (CR) for a true paragraph break.
- Paragraph spacing-after gets reset when you overwrite `object text`. To emulate the ES original's visual spacing between wishes/bullets (slides 7, 9, 10), use **double `return`** between paragraphs.
- Text items nested inside a `group` must be set by assigning to a local variable first (`set ti to iWork item N of g; set object text of ti to "…"`). Setting `object text of iWork item N of g` directly throws `-10006`.
- Two-column layouts in a single text item (slide 22 thesis) are achieved with literal spaces between the two phrases. The exact number of spaces depends on font/width — slide 22 needed ~28 spaces between `"talent, where it adds value"` and `"aimily, in everything else."` to match the ES layout.
- Manual "page counters" in the Keynote master (slides 14, 16 had `10 / 19` and `11 / 19`) are not part of the translation — leave as is.

## Companion EN copy reference

When translating, work from [`memory/pitch-keynote-en-copy.md`](pitch-keynote-en-copy.md) — slide-by-slide EN copy that mirrors the Keynote 1:1, with tone rules preserved. **Update that file in the same commit whenever the EN Keynote changes** so the two surfaces don't drift.

## Slide outline (the actual content)

| #  | Eyebrow                                              | Headline                                                          | Notes                          |
| -- | ---------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------ |
| 01 | —                                                    | `aimily` (cover · dark)                                           |                                |
| 02 | `EL ORIGEN DEL CAOS`                                 | 20 presentaciones. 10 equipos. 15 archivos de Excel. 3 presupuestos. 25 reuniones. 8 versiones del calendario. |  |
| 03 | `LAS CONSECUENCIAS`                                  | el caos genera tres problemas                                     | 3 cards: 01 dispersión · 02 pérdida de tiempo · 03 falta de contexto |
| 04 | `01 · LA DISPERSIÓN DE LA INFORMACIÓN`               | El volumen de decisiones, múltiples equipos y la velocidad del negocio pierde y dispersa la información de manera exponencial | + foto Devil Wears Prada |
| 05 | `02 · LA PÉRDIDA DE TIEMPO`                          | El tiempo donde se crea valor: estratégico, creativo, de ejecución de calidad y reflexión, se reduce a la minima expresión. | + foto. Typo: `minima` → debería ser `mínima` |
| 06 | `03 · LA FALTA DE CONTEXTO EN LA TOMA DE DECISIONES` | Se toman decisiones mediocres, sin contexto y sin tiempo.         | + foto                         |
| 07 | —                                                    | Si tuviera un asistente ideal, ¿qué le pediría?                    | 4 deseos: 24/7 · recordara todo · supiera interconexiones · me propusiera (no que decidiera por mí) |
| 08 | —                                                    | aimily · El asistente con memoria, inteligencia y conocimiento que está en cada paso, desde el primer briefing hasta el lanzamiento |  |
| 09 | `QUE ES AMILY`                                       | Dos tecnologías. Un solo flujo.                                   | 01 Fashion Knowledge Engine (motor) · 02 Context Intelligence Layer (memoria). **Typo en eyebrow: AMILY → debería ser AIMILY** |
| 10 | `FASHION KNOWLEDGE ENGINE`                           | 16 roles, conocimiento 360º.                                      | 4 cards: Input → Conocimiento experto del rol → Consulta IA → Output |
| 11 | `CONTEXT INTELLIGENCE LAYER`                         | Cuatro bloques. Un solo flujo.                                    | 4 bloques con Input/Output     |
| 12 | `01 · DIRECCIÓN CREATIVA Y TENDENCIAS`               | La visión creativa se mantiene viva.                              | Sub: Se vuelca, se cruza y se fusiona con la estructura de compras y la estrategia comercial. Nada del trabajo creativo se pierde. |
| 13 | `CONTEXT INTELLIGENCE LAYER · BLOQUE 01 · DIRECCIÓN CREATIVA Y TENDENCIAS` | (sub-cards diagram)                          | 4 sub-cards: 01 Moodboard · 02 Cliente · 03 Investigación de Mercado · 04 Identidad de Marca |
| 14 | `02 · ESTRUCTURA DE COLECCIÓN Y COMPRAS`             | Una colección hiperconectada.                                     | Sub: La estrategia comercial y la visión creativa, en un mismo lugar y vivas. Cualquier variación se retroalimenta sobre el escenario en tiempo real, sin perder nunca el punto de vista creativo ni el del mercado. |
| 15 | `CONTEXT INTELLIGENCE LAYER · BLOQUE 02 · ESTRUCTURA DE COLECCIÓN Y COMPRAS` | (sub-cards diagram)                      | 4 sub-cards: 01 Estrategia de Compra · 02 Familias y Precios · 03 Canales y Mercados · 04 Presupuesto y Margen |
| 16 | `03 · DISEÑO, DESARROLLO Y SELECCIÓN`                | De concepto a decisión, conectada al presupuesto. En minutos.     | Sub: Un sketch propio o una referencia se convierten en producto visualizable. La decisión llega con las expectativas de venta de la colección ya conectadas. |
| 17 | `CONTEXT INTELLIGENCE LAYER · BLOQUE 03 · DISEÑO, DESARROLLO Y SELECCIÓN` | (sub-cards diagram)                          | 4 sub-cards: 01 Boceto y Color · 02 Ficha Técnica · 03 Prototipado · 04 Producción |
| 18 | `04 · MARKETING Y LANZAMIENTO`                       | Conexión de impacto con el consumidor.                            | Sub: Toda la fuerza creativa, la estrategia numérica y la solidez financiera, maximizando el punto de venta a través de una historia que genera deseo. |
| 19 | `CONTEXT INTELLIGENCE LAYER · BLOQUE 04 · LANZAMIENTO, CONTENIDO Y VENTA` | (sub-cards diagram)                          | 4 sub-cards: 01 Estrategia de Ventas · 02 Lanzamiento al Mercado · 03 Content Studio · 04 Comunicación |
| 20 | `BLOQUE EXTRA · IN-SEASON SALES`                     | Cada venta es una semilla. Cada semilla, la próxima colección.    | **Sub-body in Keynote is a copy-paste error from slide 16** (talks about sketches becoming product). Needs its own copy. |
| 21 | `CONTEXT INTELLIGENCE LAYER · BLOQUE EXTRA · IN-SEASON SALES` | (sub-cards diagram)                                       | 4 sub-cards: 01 Análisis de Venta · 02 Propuesta de Acciones · 03 Ejecución de Acciones · 04 Creación de Semillas |
| 22 | —                                                    | el talento, donde aporta — aimily, en todo lo demás.              | Two-column closing thesis      |
| 23 | —                                                    | That's all. aimily.app                                            | Closing dark                    |

## Narrative arc

The deck is a 3-act structure (no explicit "ACTO" eyebrows, but the rhythm is the same):

- **Act I · The chaos** (slides 02–06). One vivid statistic of operational reality, then the three consequences (information dispersion, time loss, context loss) with photo-driven reinforcement (Devil Wears Prada framing).
- **Act II · The wish + the answer** (slides 07–11). The "if I had an ideal assistant" reframe → aimily as the answer → the two technologies that compose it (Fashion Knowledge Engine = the doer, Context Intelligence Layer = the memory).
- **Act III · The four blocks + In-Season** (slides 12–21). For each of the 4 blocks: one narrative slide ("X stays alive / hyper-connected / from concept to decision / impact connection") followed by the sub-cards diagram. Then the In-Season Sales extra block as the feedback loop.
- **Closing** (slides 22–23). The thesis ("talent where it adds value — aimily everywhere else") and the dark sign-off.

## Tone rules (locked across the deck)

- **aimily protege, NUNCA sustituye.** The deck never says aimily generates / designs / produces. It is the assistant that remembers, knows, proposes — the human decides. Slide 07's wish list bakes this in: "Que me propusiera. No que decidiera por mí." Slide 22 closes on the same idea: talent decides, aimily covers everything else.
- **Two technologies, one flow.** Fashion Knowledge Engine + Context Intelligence Layer are the two technical anchors. Always introduced together.
- **Four blocks + In-Season.** The product is always presented as Block 01 Dirección Creativa → 02 Estructura de Colección → 03 Diseño & Desarrollo → 04 Marketing → Extra In-Season Sales. The sub-block names are the canonical naming.
- **Visual identity**: light cream/shade slides for the bulk; dark carbon slides for cover + closing. Devil Wears Prada photos on slides 04–06 (3 consequences). Sub-card diagrams reuse the 4 brand colors (sea-foam, moss, clay, citronella, midnight) consistently per block.
- **Spanish peninsular.** No latam vocabulary. EN translation is a separate file (`memory/pitch-keynote-en-copy.md`), not a Keynote slide overlay.

## Hard rules

- ❌ Do not invent or "improve" the deck content from inside this repo. The Keynote is Felipe's; this doc only describes what's there.
- ❌ Do not create a web version of the deck. Past attempt (`src/app/(pitch)/` + `src/components/pitch/`) was deleted on 2026-05-29 because it drifted from the Keynote and Felipe never used it.
- ❌ Do not commit intermediate Keynote drafts to `main`. Only `docs/aimily-pitch.key` (canonical · ES) and, once it exists, `docs/aimily-pitch-en.key` (English) live on main.
- ❌ Do not assume the web `/pitch` route exists. Middleware no longer whitelists `/pitch` (removed 2026-05-29).
- ✅ If you need to know what the deck says, read this doc + `memory/pitch-keynote-en-copy.md`. If they disagree with the Keynote, the **Keynote wins** and these docs need updating, not the other way around.

## Commits of record

| Hash       | Date       | What                                                                                       |
| ---------- | ---------- | ------------------------------------------------------------------------------------------ |
| `cb7a5d5` (rebased into `bede8d7`) | 2026-05-28 | Iteration day Keynote, 17 AZUR drafts + final `aimily-pitch.key`.        |
| `bede8d7`  | 2026-05-28 | Merged to main: canonical `aimily-pitch.key` only (drafts dropped).                        |
| `850653a`  | 2026-05-29 | Deleted misaligned web `/pitch` route + rewrote this doc + produced `pitch-keynote-en-copy.md`. |
| `b39089e`  | 2026-05-29 | `docs/aimily-pitch-en.key` — English Keynote translated 1:1 from ES via AppleScript.       |
| `fa60d53`  | 2026-05-29 | ES Keynote: fixed slide 9 eyebrow typo + slide 20 sub-body copy-paste error.               |
| `a483455`  | 2026-05-29 | ES Keynote: fixed slide 5 `minima` → `mínima`. All 3 known typos now resolved.             |
