---
name: AI Generation Bible — Prompt Architecture v2 (Haiku)
description: Complete reference for AI generation. Claude Haiku primary + Gemini fallback. 27+ prompt types, expert personas, quality gates, anti-refusal system, maxTokens 8192. THE reference for all AI in aimily.
type: project
originSessionId: 79be6ddc-3b2c-4a40-b2bf-54629578114f
---
# AI Generation Bible v3 — Multi-Model Architecture

> Migrado 2026-03-13. Última actualización: 2026-03-17.

## Arquitectura LLM

### Tri-Model System (actualizado 2026-03-17)
- **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`) — Creative tasks: consumer, vibe, brand-generate, brand-extract analysis
- **Gemini 2.5 Flash Lite** — Fallback automático si Haiku falla
- **Perplexity Sonar** — Web-grounded research: trends (4 types) van DIRECTO a Sonar sin Claude
- **Perplexity Search API** — Raw web results para Brand DNA (fed to Claude for analysis)
- **Claude Sonnet** — Vision tasks: analyze-moodboard, generate-techpack
- **Freepik Nano Banana** (Gemini 2.5 Flash Image) — Still life, editorial, try-on, brand model
- **Freepik Kling 2.1 Pro** — Video generation
- **Freepik Flux 2 Pro** — Hyper-realistic model headshots (aimily roster)
- **OpenAI gpt-image-1.5** — Sketch colorization + 3D render

### Routing por tipo de tarea
| Tarea | Modelo | Razón |
|-------|--------|-------|
| Consumer profiles, Vibe, Brand generate | Claude Haiku | Creatividad + razonamiento |
| Brand DNA extract | Perplexity Search + Claude Haiku | Web research + expert analysis |
| Global Trends, Deep Dive, Live Signals, Competitors | **Perplexity Sonar directo** | Datos web reales, 1 sola llamada |
| Merchandising (families, pricing, channels, budget) | Claude Haiku | Razonamiento experto |
| Marketing content | Claude Haiku / Gemini | Creatividad |
| Vision (moodboard, techpack) | Claude Sonnet | Multimodal |
| Still life / editorial / try-on | Freepik Nano Banana | Reference image compositing |
| Video | Freepik Kling 2.1 Pro | Image-to-video |
| Model headshots | Freepik Flux 2 Pro | Hyper-realistic portraits |
| Sketch colorization + 3D | OpenAI gpt-image-1.5 | Design phase renders |

### Archivos Core
```
src/lib/ai/llm-client.ts          — Cliente unificado: generateJSON(), generateText(), extractJSON()
src/lib/ai/perplexity-client.ts   — Perplexity Search + Sonar APIs, season expansion, result cleanup
src/lib/ai/prompt-foundations.ts   — 8 PERSONAS, 6 QUALITY_GATES, OUTPUT_RULES, seasonContext(), buildInheritedContext()
src/lib/ai/load-full-context.ts   — 🔒 loadFullContext() + mergeContextWithInput() — SHARED by ALL 13 AI endpoints
src/lib/ai/creative-prompts.ts    — 10 prompt types (buildCreativePrompt) — solo para Claude tasks
src/lib/ai/merch-prompts.ts       — 8 prompt types (buildMerchPrompt)
src/lib/ai/design-prompts.ts      — 4 prompt types (buildDesignPrompt)
src/lib/prompts/marketing-prompts.ts — 12 templates Handlebars (renderPrompt)
src/lib/prompts/prompt-context.ts — buildPromptContext() fetches cross-block data from 11 Supabase tables + CIS
src/lib/collection-intelligence.ts — CIS core: recordDecision(), getIntelligence(), compilePromptContext()
```

### 🚨 Context Loading Architecture (2026-04-14)

**ALL 13 critical AI endpoints load context SERVER-SIDE.** No endpoint depends on the frontend for core collection intelligence. See full documentation in `full-project-documentation.md` section 19b.

Key files that MUST NOT be modified during frontend-only changes:
- `src/lib/ai/load-full-context.ts`
- `src/lib/ai/prompt-foundations.ts` (buildInheritedContext)
- `src/lib/prompts/prompt-context.ts` (buildPromptContext)
- `src/lib/collection-intelligence.ts`
- Any `src/app/api/ai/*/route.ts` file

### Anti-Refusal System (2026-03-13)
Problema detectado: el LLM a veces se niega diciendo "I cannot access URLs" o "I need to be transparent".

**Soluciones implementadas**:
1. **OUTPUT_RULES** incluye: "NEVER refuse the task. NEVER say you cannot do something. ALWAYS return valid JSON."
2. **brand-extract** tiene system prompt reforzado: "You CANNOT and MUST NOT attempt to visit any URL. Use your existing knowledge of the brand."
3. **trends-live-signals** eliminó "RIGHT NOW" y "real-time" que triggereaban refusals
4. **extractJSON()** detecta refusals (busca "i cannot", "i can't", "unable to access") y lanza error limpio: "AI was unable to complete the request. Please try again."

### maxTokens
**TODOS los 10 prompt types de creative-prompts.ts tienen `maxTokens: 8192`** (antes solo consumer tenía).
Esto previene truncación de JSON en respuestas largas.

### JSON Extraction (4-level fallback)
1. Direct `JSON.parse(text)`
2. Strip markdown code blocks
3. Extract outermost `{ ... }`
4. Extract outermost `[ ... ]`
5. Detect refusal → clean error message

## Calidad de Prompts — Principios

### Personas Expertos
- **consumerStrategist**: Consumer profiling, psychographics
- **creativeDirector**: Collection narrative, silhouette, color story
- **brandArchitect**: Brand DNA, positioning, identity
- **trendForecaster**: Macro/micro trends, WGSN-level
- **merchPlanner**: Assortment, price architecture, OTB
- **designConsultant**: Construction, materials, proportions
- **contentStrategist**: Copy, social, email, SEO
- **financialStrategist**: P&L, margins, budget

### Quality Gates
- **Forbidden words**: "elevate", "curate", "versatile", "timeless", "effortless"
- **Required specificity**: Real designer names, Pantone codes, price benchmarks
- **Anti-refusal**: "NEVER refuse the task. ALWAYS return valid JSON."

### Temperaturas Calibradas
| Tipo | Temp | Razón |
|------|------|-------|
| Analysis/SEO/pricing | 0.3-0.5 | Precision |
| Planning/budget/channels | 0.5-0.65 | Structured |
| Copy/descriptions | 0.7 | Balanced |
| Creative direction/vibe | 0.75-0.9 | Maximum range |

## Prompt Types — Consumer Proposals (selective regeneration)

El prompt `consumer-proposals` soporta regeneración selectiva:
- Si recibe `input.existingProfiles` + `input.count`, genera solo N nuevos perfiles diferentes a los existentes
- Si no recibe estos campos, genera 4 perfiles estándar
- Esto permite que el frontend regenere solo los perfiles rechazados

## 16 Endpoints Migrados (Haiku primary)

### Bloque 1: Creative & Brand → `/api/ai/creative-generate`
10 prompts: consumer (assisted/proposals), vibe (assisted/proposals), brand (extract/generate), trends (global/deep-dive/live-signals/competitors)

### Bloque 2: Merchandising → `/api/ai/merch-generate`
8 prompts: families (assisted/proposals), pricing (assisted/proposals), channels (assisted/proposals), budget (assisted/proposals)

### Bloque 3: Design & Dev → `/api/ai/design-generate`
4 prompts: sketch-suggest, color-suggest, materials-suggest, catalog-description

### Bloque 4: Marketing (6 endpoints)
stories, content-strategy, gtm, content-calendar, paid, launch

### Vision Endpoints (Sonnet primary)
analyze-moodboard, generate-techpack, propose-comments

### Freepik Visual Endpoints (auto-persist to Supabase Storage)
- `/api/ai/freepik/still-life` — product alone, 8 editorial LOOKS (Nano Banana)
- `/api/ai/freepik/editorial` — on-model + product + style ref + model casting (Nano Banana)
- `/api/ai/freepik/tryon` — brand-model catalog (Nano Banana)
- `/api/ai/freepik/brand-model` — brand model portraits (Nano Banana)
- `/api/ai/freepik/video` — video generation (Kling 2.1 Pro/Std)
- `/api/ai/freepik/sketch` — technical sketch (Flux Dev)
- `/api/ai/colorize-sketch` — colorization + 3D render (gpt-image-1.5)

### Asset Storage System
- **Bucket**: `collection-assets` (public, 50MB limit)
- **Path**: `{collection_plan_id}/{asset_type}/{filename}`
- **Utility**: `src/lib/storage.ts` — `persistAsset()`, `uploadFromUrl()`, `uploadBase64()`
- **Upload API**: `POST /api/storage/upload`
