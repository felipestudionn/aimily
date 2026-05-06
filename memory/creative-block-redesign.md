---
name: Creative Block Redesign — 3-Step Flow
description: Creative & Brand block spec + implementation status. 3-step flow (Vision/Research/Synthesis), 12 mini-blocks, expand/collapse UI, interactive selection flows. IMPLEMENTADO con persistencia DB via useWorkspaceData.
type: project
---

# Creative & Brand Block — Redesign Completo

> Definido por Felipe (2026-03-12). Última actualización: 2026-03-17.

## ESTADO DE IMPLEMENTACIÓN (actualizado 2026-03-17)

| Componente | Estado | Notas |
|---|---|---|
| Paso 1: Creative Vision (4 mini-blocks) | ✅ Implementado | Consumer, Vibe, Moodboard, Brand DNA — flujos interactivos completos |
| Paso 2: Market Research (4 mini-blocks) | ✅ Implementado | **Perplexity Sonar directo** — sin mode pills, Load More + Replace Unselected |
| Paso 3: Creative Synthesis | ✅ IMPLEMENTADO | Visual board editable: hero, moodboard 8-col, Brand DNA, consumer, trends, competitors. Validate button + celebration overlay |
| API endpoint | ✅ Implementado | `/api/ai/creative-generate` — Brand DNA: Perplexity Search + scraping + Claude. Trends: Perplexity Sonar directo |
| Brand DNA extract | ✅ MEJORADO | 3 fuentes en paralelo: Perplexity web research + smart scraper (about page) + Claude analysis |
| Research blocks | ✅ MEJORADO | Sin mode pills. Sonar directo. Focus field filtra por producto. Season-aware (SS27→SS26 ref) |
| Live Signals | ✅ MEJORADO | 15+ fashion neighborhoods, TikTok, Reddit, retail sell-outs, 3-month window |
| Creative→Merch handover | ✅ ARREGLADO | Merchandising ahora lee consumer/vibe/brandDNA/trends de creative workspace |
| Celebration overlay | ✅ Implementado | Full-screen carbon, staggered animations, CTAs to Merchandising/Dashboard |
| Sidebar content expansion | ✅ Implementado | Content expands when sidebar collapses (ml-72 → ml-[52px]) |
| Pinterest integration | ❌ No implementado | Botón existe, sin backend |
| Persistencia DB | ✅ Implementado | `useWorkspaceData` hook → `collection_workspace_data` table |

**Archivo**: `src/app/collection/[id]/creative/page.tsx` (~2800 líneas)
**API**: `src/app/api/ai/creative-generate/route.ts`
**Perplexity client**: `src/lib/ai/perplexity-client.ts`

---

## Flujos Interactivos de Selección (v2 — 2026-03-13)

### Consumer Definition — Multi-select (patrón "Consumer")
- **Propuesta IA**: Genera 4 perfiles → thumbs up/down para seleccionar/rechazar
- Inline editing de título + descripción por perfil
- "Regenerar N rechazados" → prompt envía `existingProfiles` + `count` para no duplicar
- "Añadir perfil manual" → formulario con status `liked` automático
- Contador: "N selected · N rejected · N pending"
- Gender selector (Women/Men/Unisex/Mixed) requerido antes de generar
- `ConsumerProposalFlow` component

### Collection Vibe — Single-select (patrón "Vibe")
- **Propuesta IA**: Genera 3 direcciones → seleccionar UNA
- Al seleccionar → modo edición: título, narrativa, keywords editables
- "← Choose another" para volver a las 3 opciones
- **Asistido**: Genera narrativa + keywords, ambos editables post-generación
- `VibeProposalFlow` component

### Brand DNA — Sin mode pills (flujo propio)
- **Pregunta inicial**: "¿Tienes marca?" / "Crear desde cero"
- **Path A (Tengo marca)**: Instagram + Website → "Extract Brand DNA" → resultado editable
- **Path B (Crear desde cero)**: Nombre + Dirección → "Generate with AI" O "Fill manually"
- **BrandResultEditor** compartido: color pickers nativos (`type="color"` + hex input), añadir/eliminar colores, tone (textarea), typography (input), visual identity (textarea), brand name (input)
- NO tiene pills Libre/Asistido/Propuesta IA

### Moodboard — Upload directo
- Upload fotos + Pinterest (placeholder)
- Sin mode pills (como antes)

### Research Blocks (4) — Multi-select + inline edit (patrón "Research")
- Genera 4-5 resultados → checkbox para seleccionar/deseleccionar
- Pencil icon → edición inline de título + descripción
- X icon → eliminar resultado individual
- Badge de relevancia (high/medium)
- Contador: "N selected · N unselected · N total"
- `ResearchBlockContent` compartido por los 4 bloques

---

## REGLA UX: 3 Modos de Input (donde aplica)

| Pill | Label | Comportamiento |
|------|-------|---------------|
| 1 | **Libre** | El usuario introduce toda la información. Sin IA. |
| 2 | **Asistido** | El usuario da dirección/keywords → IA complementa y expande. |
| 3 | **Propuesta IA** | El usuario da referencia mínima → IA genera propuesta(s) completa(s). |

**Excepciones**: Moodboard y Brand DNA NO usan estos pills — tienen flujos propios.

---

## Mobile Responsiveness (2026-03-13)

- Padding: `px-4 sm:px-8 md:px-12 lg:px-16`
- Sidebar icons: `hidden sm:flex` (ocultos en mobile)
- Step navigation: `overflow-x-auto max-w-full`
- Mode description: `hidden sm:inline`
- Cards: `min-h-[240px] sm:min-h-[320px]`, `p-6 sm:p-10 lg:p-12`
- Expanded content: `p-5 sm:p-10 lg:p-12`
