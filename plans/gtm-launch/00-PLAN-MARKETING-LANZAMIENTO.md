# Plan de Marketing de Lanzamiento — Aimily.app

> **Fecha objetivo**: 1 de mayo de 2026 (estreno The Devil Wears Prada 2)
> **Días restantes**: 50 (desde 12 marzo 2026)
> **Responsable**: Felipe Martinez / StudioNN Agency S.L.
> **Última actualización**: 2026-03-12

---

## La Oportunidad

### The Devil Wears Prada 2 — Datos clave
- **Estreno**: 1 mayo 2026 (USA y mercados principales)
- **Trailer**: 181.5M views en 24 horas — trailer de comedia más visto en 15 años
- **Cast**: Meryl Streep, Emily Blunt, Anne Hathaway, Lady Gaga
- **Plot**: Emily (Blunt) es ahora ejecutiva de un conglomerado de moda de lujo. Miranda Priestly necesita su ayuda.
- **Algoritmo**: Todo el mundo fashion estará dentro del ciclo de contenido de esta película

### El Silogismo Aimily ↔ DWP

```
Emily (2006) → La asistente humana que hacía TODO en moda → Agotada, explotada, limitada
Aimily (2026) → La asistente AI que hace TODO en moda → Incansable, potente, escalable

Miranda necesitaba a Emily → Tú necesitas a Aimily
Emily se convirtió en ejecutiva → Con Aimily, TÚ te conviertes en ejecutiva

"That's all." → Miranda cerraba conversaciones
"That's all." → Aimily cierra colecciones completas

Andy llegó sin saber nada de moda → Aimily te guía desde cero
El "Cerulean Sweater Speech" → Cada decisión de moda ya está basada en datos

DWP2: Emily es la jefa ahora → Aimily empodera al diseñador independiente
Lady Gaga en la película → Fashion + Pop Culture = Viralidad máxima
```

---

## Estructura del Plan

| Fase | Nombre | Periodo | Estado |
|------|--------|---------|--------|
| 0 | Fundación Web: "Meet Aimily" | 12-26 marzo | `PENDIENTE` |
| 1 | Contenido Motion/Video | 19 marzo - 2 abril | `PENDIENTE` |
| 2 | Arsenal de Contenido DWP2 | 2-23 abril | `PENDIENTE` |
| 3 | Calendario de Publicación | abril-mayo | `PENDIENTE` |
| 4 | Producción de Assets | continuo | `PENDIENTE` |
| 5 | Distribución y Canales | abril-mayo | `PENDIENTE` |

---

## FASE 0 — Fundación Web: "Meet Aimily" (12-26 marzo)

### Objetivo
Nueva página `/meet-aimily` — recorrido visual e interactivo por los 4 bloques del sistema.

### Secciones de la página

#### Hero
- Headline: *"Meet Aimily. Your AI-powered fashion collection assistant."*
- Subhead: *"From a spark of inspiration to a sold-out launch — one platform, every step."*
- Fondo carbon con grid texture, tipografía light, estilo Alfred Design System

#### Bloque 1 — Creative Vision
- **Visual**: Moodboard generándose con AI, paletas de color emergiendo
- **Copy**: *"Start with a vision, not a spreadsheet"*
- **Features mostradas**: Trend analysis, moodboard generation, creative brief
- **Animación**: Scroll-triggered fade-in-up con imágenes que se van revelando

#### Bloque 2 — Merchandising Intelligence
- **Visual**: Números formándose — pricing matrices, channel distribution
- **Copy**: *"From gut feeling to business model"*
- **Features mostradas**: Familias de producto, pricing engine, canales, budget builder
- **Animación**: Counters animados, gráficos que se dibujan

#### Bloque 3 — Design & Development
- **Visual**: Sketch → Prototipo → Catálogo → Production pipeline
- **Copy**: *"Your collection, pixel to pattern"*
- **Features mostradas**: AI sketch generation, tech pack builder, SKU management
- **Animación**: Transición morphing de sketch a producto final

#### Bloque 4 — Marketing & Launch
- **Visual**: Calendar de contenido llenándose, campaign cards apareciendo
- **Copy**: *"Launch day? Already planned."*
- **Features mostradas**: Content strategy, campaign videos, GTM planning, launch execution
- **Animación**: Timeline que se va completando con checkmarks

#### Bloque 5 — Calendar (Orquestador)
- **Visual**: Gantt chart con los 45 milestones cayendo en posición
- **Copy**: *"Every deadline. Every team. One timeline."*
- **Features mostradas**: Cross-block dependencies, milestone tracking, Excel export
- **Animación**: Milestones que aparecen secuencialmente por bloque

#### CTA Final
- *"That's all you need."* (guiño DWP)
- Botón: "Start your free trial" → signup
- Secondary: "See pricing" → /pricing

### Especificaciones técnicas
- **Stack**: Next.js page (`'use client'`), CSS animations (Intersection Observer), sin librerías externas
- **Responsive**: Mobile-first, single column en móvil, side-by-side en desktop
- **Performance**: Lazy loading de imágenes, animaciones con `will-change` y `transform`
- **SEO**: Meta tags optimizados para "fashion collection management", "AI fashion assistant"
- **Bilingüe**: EN/ES toggle (como pricing page)

---

## FASE 1 — Contenido Motion/Video (19 marzo - 2 abril)

### Video principal: "From Idea to Runway" (60-90 segundos)

#### Storyboard

| Seg | Visual | Audio/Text | Transición |
|-----|--------|-----------|------------|
| 0-5 | Pantalla negra | *"Every collection starts with..."* | Fade in texto light |
| 5-15 | Moodboard generándose | Trend data flowing, paletas apareciendo | Morph suave |
| 15-25 | Merchandising dashboard | Números formándose: €, unidades, canales | Slide horizontal |
| 25-40 | Sketch → Prototipo → Catálogo | Dibujo que cobra vida, tech packs | Zoom progresivo |
| 40-50 | Marketing calendar | Posts programándose, campaign cards | Grid assembly |
| 50-60 | Gantt timeline completo | Todos los milestones en su lugar | Pull-back reveal |
| 60-70 | Logo Aimily | *"That's all."* | Fade to black |
| 70-80 | CTA | *"Your AI-powered fashion assistant"* + URL | Clean fade |

#### Variantes
- **Reels/TikTok cut**: 30 segundos (bloques 1-4 rápidos + "That's all.")
- **Story cut**: 15 segundos (hero + CTA)
- **LinkedIn cut**: 60 segundos (más datos, menos motion)

#### Producción
- **Opción A**: Screen recordings de la app + After Effects compositing
- **Opción B**: CSS/Rive animations grabadas como video
- **Opción C**: Figma prototypes animados + Lottie export

---

## FASE 2 — Arsenal de Contenido DWP2 (2-23 abril)

### 2A. Contenido SERIO (LinkedIn, Newsletter, Blog)

#### Post 1: "From Emily to CEO"
- **Ángulo**: La evolución del asistente de moda. Emily pasó de llevar cafés a dirigir un imperio. La IA está haciendo lo mismo para diseñadores independientes.
- **Hook**: "In 2006, Emily ran around Manhattan fetching scarves. In 2026, she runs a luxury conglomerate. What changed? She stopped doing everything manually."
- **CTA**: "Meet the AI that does what Emily used to do — but never burns out."
- **Formato**: Long-form LinkedIn post con imagen de apertura

#### Post 2: "Miranda's Problem is Real"
- **Ángulo**: Print is dying. Runway Magazine necesita reinventarse. La moda se ha digitalizado y los diseñadores necesitan herramientas digitales.
- **Hook**: "Miranda Priestly's nightmare isn't losing her job. It's realizing the industry moved on while she was still doing things the old way."
- **CTA**: "Don't be Miranda. Be ready."
- **Formato**: LinkedIn article con datos de mercado

#### Post 3: "The Cerulean Sweater Speech, but for Data"
- **Ángulo**: Miranda explicó cómo una decisión en la pasarela llega a las rebajas. Ahora eso se puede trackear con datos en tiempo real.
- **Hook**: "You think you chose that color by accident? There's data behind every trend, every purchase, every viral moment. Now you can see it."
- **CTA**: "See the data Miranda wishes she had."
- **Formato**: Carousel (5-7 slides) adaptable a LinkedIn e Instagram

#### Post 4: "5 Things Emily Did That AI Does Better"
- **Ángulo**: Listicle comparativo
- **Contenido**:
  1. Research trends → AI trend analysis en segundos
  2. Coordinate schedules → Calendar con 45 milestones automáticos
  3. Source materials → Supplier database + pricing engine
  4. Prepare presentations → AI-generated moodboards y briefs
  5. Manage the impossible → Collection Builder: de idea a producción
- **Formato**: Carousel Instagram + LinkedIn post

### 2B. Contenido MEME/VIRAL (Instagram, TikTok, X)

#### Meme 1: "Get me 40 skirts"
- Miranda: "I need 40 skirts for the shoot"
- Emily: *corriendo por Manhattan*
- Aimily: *genera 40 SKUs con pricing en 3 minutos*
- Caption: "Upgrade your assistant. @aimily.app"

#### Meme 2: Side-by-side "Then vs Now"
- Left: Emily 2006 — corriendo con cafés y Harry Potter manuscripts
- Right: Aimily 2026 — generando colecciones completas
- Caption: "The assistant glow-up nobody expected."

#### Meme 3: "I live on it"
- Emily original: "I'm just one stomach flu away from my goal weight"
- Aimily version: "I'm just one AI tool away from launching my collection"
- Visual: Screenshot de la app con "size zero effort"

#### Meme 4: "Florals? For spring?"
- Miranda: "Florals? For spring? Groundbreaking."
- Rewrite: "AI-predicted trends for spring? Actually groundbreaking."
- Visual: Aimily trend analysis mostrando datos reales

#### Meme 5: "That's all."
- Miranda cierra la reunión con "That's all."
- Corte a: Aimily con colección completa (4 bloques done)
- Caption: "That's all you need. Link in bio."

#### Meme 6: Cerulean Monologue Remix
- Texto adaptado: "You think your collection happened by accident? Let me explain the algorithm behind every trend you're about to use..."
- Formato: Video con voz en off + screen recording de Aimily

#### Meme 7: "By all means, move at a glacial pace"
- Miranda a una diseñadora usando Excel para planificar colecciones
- Cut to: Aimily timeline en 30 segundos
- Caption: "Stop moving at a glacial pace."

#### Meme 8: Andy's Transformation
- Montaje del makeover de Andy → "Your collection management glow-up"
- Before: Spreadsheets, emails, WhatsApp groups
- After: Aimily dashboard, Gantt chart, AI moodboards

#### Meme 9: "A million girls would kill for this job"
- Original: Emily a Andy sobre trabajar para Miranda
- Remix: "A million designers would kill for this tool"
- Visual: Aimily features grid

#### Meme 10: Lady Gaga Crossover
- Gaga en DWP2 + "Born This Way"
- "Born to design. Built to launch."
- Visual: Aimily logo + Gaga still

### 2C. Contenido ENGAGEMENT

#### Poll Series
1. "Who's the real MVP? Emily the assistant or Aimily the platform?"
2. "How do you currently plan your collection? A) Excel B) Notion C) Prayer D) Aimily"
3. "What's harder? Working for Miranda Priestly or launching a collection without AI?"

#### Quiz: "Which DWP Character Is Your Fashion Brand?"
- Miranda = Established luxury brand (needs digital transformation)
- Emily = Emerging brand (hustling, needs efficiency)
- Andy = New designer (needs guidance from zero)
- Nigel = Creative director (needs tools to execute vision)
- → Todas las respuestas llevan a Aimily como solución

#### Countdown Campaign
- "X days until fashion's biggest comeback"
- Dual meaning: la película + Aimily launch
- Daily Instagram stories desde el 14 de abril

#### #AimilyChallenge
- "Describe your next collection in 3 words. Aimily designs the rest."
- User-generated content → engagement → follows → trials

---

## FASE 3 — Calendario de Publicación

### Marzo (preparación)
```
12-18 mar: Desarrollo Meet Aimily page
19-25 mar: Meet Aimily QA + Video storyboard
26-31 mar: Video producción + primeros assets gráficos
```

### Abril (build-up)
```
Semana 1 (1-7 abril):
├── Lun: Teaser IG story "Something is coming..." (silueta Aimily)
├── Mar: LinkedIn post "From Emily to CEO"
├── Mié: IG Reel teaser (5s del video motion)
├── Jue: X thread sobre fashion + AI trends
├── Vie: IG story countdown activado (30 días)
├── Sáb: —
└── Dom: TikTok teaser

Semana 2 (8-14 abril):
├── Lun: "Meet Aimily" page goes LIVE → anuncio en todos los canales
├── Mar: Video "From Idea to Runway" drop (IG Reel + YouTube + LinkedIn)
├── Mié: LinkedIn article "Miranda's Problem is Real"
├── Jue: Meme #1 "Get me 40 skirts" (IG + X)
├── Vie: IG carousel "5 Things Emily Did That AI Does Better"
├── Sáb: TikTok — Cerulean monologue remix
└── Dom: IG story — poll "Emily vs Aimily"

Semana 3 (15-21 abril):
├── Lun: LinkedIn "Cerulean Sweater Speech but for Data"
├── Mar: Meme #4 "Florals for spring?" (IG + X)
├── Mié: TikTok — "By all means, move at a glacial pace"
├── Jue: IG carousel — Quiz "Which DWP character is your brand?"
├── Vie: Meme #2 "Then vs Now" (IG + X + LinkedIn)
├── Sáb: IG story — behind the scenes de Aimily
└── Dom: TikTok compilation de memes

Semana 4 (22-28 abril):
├── Lun: Press outreach begins (fashion tech blogs)
├── Mar: LinkedIn thought piece — "The Fashion Industry's AI Moment"
├── Mié: Meme #8 "Andy's Transformation" (IG + TikTok)
├── Jue: Product Hunt listing preparado (draft)
├── Vie: Meme #5 "That's all." (IG + X) — THE signature meme
├── Sáb: IG story — final countdown 3 days
└── Dom: "Tomorrow." — single word post across all platforms

Semana 5 (29 abril - 1 mayo):
├── Mar 29: "2 days." + Meme #9 "A million girls would kill..."
├── Mié 30: "Tomorrow." + Meme #7 "Glacial pace"
└── Jue 1 MAYO — LAUNCH DAY (ver abajo)
```

### 1 DE MAYO — LAUNCH DAY

```
08:00  Product Hunt launch goes live
09:00  "Emily is back. So is Aimily." — hero post (IG, LinkedIn, X)
10:00  Video "From Idea to Runway" re-drop con copy DWP
11:00  IG Stories blitz (5 stories seguidas, memes + features)
12:00  LinkedIn — "Why we named our AI after a movie character"
13:00  Meme #10 Lady Gaga crossover
14:00  X thread — "The real fashion assistant doesn't need coffee ☕→🤖"
15:00  TikTok — compilation reel
16:00  IG Reel — "That's all." (signature video)
18:00  Email blast a waitlist/trial users
20:00  Live tweet/post durante estreno (reacciones, memes en tiempo real)
22:00  Recap story del día
```

### Mayo post-launch (2-31)
```
Semana 1 (2-7): Ride the wave — reactive content, responder a memes ajenos, UGC reshares
Semana 2 (8-14): "Post-premiere" — reviews de la peli + ángulos Aimily, blog posts
Semana 3 (15-21): Convert — retargeting ads, email nurture, case studies
Semana 4 (22-31): Optimize — análisis de métricas, doble down en lo que funcionó
```

---

## FASE 4 — Assets de Producción (Prioridad)

### P0 — Críticos (completar antes del 7 abril)

| # | Asset | Specs | Estado |
|---|-------|-------|--------|
| 1 | Página "Meet Aimily" | Next.js page, responsive, bilingüe, scroll animations | `PENDIENTE` |
| 2 | Screenshots HD de la app | 10-15 capturas de cada bloque en estado "showcase" | `PENDIENTE` |
| 3 | Video motion 60-90s | 1080x1080 (IG) + 1080x1920 (stories/TikTok) + 1920x1080 (YouTube/LinkedIn) | `PENDIENTE` |

### P1 — Importantes (completar antes del 14 abril)

| # | Asset | Specs | Estado |
|---|-------|-------|--------|
| 4 | 10 meme templates | Figma/Canva, con placeholders para screenshots | `PENDIENTE` |
| 5 | 4 posts serios completos | Textos finales + imágenes de apoyo | `PENDIENTE` |
| 6 | Carousel templates | 5-7 slides, estética Alfred (carbon + crema) | `PENDIENTE` |
| 7 | Brand kit social media | Profile pics, banners, story templates, highlight covers | `PENDIENTE` |

### P2 — Deseables (completar antes del 22 abril)

| # | Asset | Specs | Estado |
|---|-------|-------|--------|
| 8 | Press kit / one-pager | PDF con stats, screenshots, quotes, logo pack | `PENDIENTE` |
| 9 | Email sequence (5 emails) | Welcome → Feature 1 → Feature 2 → DWP tie-in → CTA trial | `PENDIENTE` |
| 10 | Product Hunt listing | Copy, screenshots, video, maker comment | `PENDIENTE` |

### P3 — Nice-to-have

| # | Asset | Specs | Estado |
|---|-------|-------|--------|
| 11 | Landing temporal DWP-themed | `/fashion-assistant` con copy full DWP | `PENDIENTE` |
| 12 | Sticker pack / GIFs | GIPHY branded stickers con frases DWP+Aimily | `PENDIENTE` |
| 13 | Influencer kit | Brief + assets para micro-influencers fashion | `PENDIENTE` |

---

## FASE 5 — Canales y Distribución

### Canales orgánicos

| Canal | Handle/URL | Estrategia | Frecuencia |
|-------|-----------|-----------|------------|
| Instagram | @aimily.app | Memes + Reels + Stories + Carousels | Daily desde 14 abril |
| TikTok | @aimily.app | Short-form memes, motion clips, tutorials | 3-5/semana |
| LinkedIn | Aimily / Felipe personal | Thought leadership, serious content | 2-3/semana |
| X (Twitter) | @aimily_app | Real-time reactions, memes, threads | Daily + live 1 mayo |
| YouTube | Aimily | Video largo + Shorts | 1/semana + Shorts diarios |
| Product Hunt | — | Launch programado | 1 mayo |

### Canales pagados (opcional, post-launch)

| Canal | Budget estimado | Objetivo |
|-------|----------------|----------|
| Instagram/Meta Ads | €500-1000/mes | Retargeting visitantes web → trial |
| Google Ads | €300-500/mes | Keywords "fashion collection management" |
| LinkedIn Ads | €200-400/mes | B2B: fashion brands, designers |

### PR / Earned media

| Target | Tipo | Pitch angle |
|--------|------|-------------|
| Vogue Business | Fashion tech | "AI assistant named after cinema's most famous fashion assistant" |
| Business of Fashion | Industry | "The tool democratizing fashion collection management" |
| TechCrunch | Startup | "Fashion-tech startup leverages DWP2 cultural moment" |
| Product Hunt | Launch | Standard PH launch |
| Fashion tech newsletters | Niche | Feature/review request |
| Fashion schools | Education | Free trials for students |

### Email marketing

| Sequence | Trigger | Emails | Objetivo |
|----------|---------|--------|----------|
| Welcome | Signup | 5 emails / 14 días | Activación trial |
| DWP Launch | 1 mayo | 3 emails / 7 días | Conversión |
| Nurture | Post-trial | 4 emails / 30 días | Retención / upgrade |

---

## Métricas de Éxito

### KPIs principales

| Métrica | Target mayo | Target junio |
|---------|------------|-------------|
| Visitas web (total) | 25K | 15K |
| Visitas /meet-aimily | 10K | 5K |
| Signups trial | 500 | 300 |
| Trial → Paid conversion | 5% (25) | 8% (24) |
| Social impressions | 500K | 200K |
| Video views (total) | 100K | 30K |
| Email subscribers | 1,000 | 500 |
| Product Hunt upvotes | 200+ | — |
| Press mentions | 3-5 | 2-3 |

### KPIs de engagement

| Métrica | Target |
|---------|--------|
| IG engagement rate | >5% |
| LinkedIn post impressions | >10K/post |
| TikTok views | >50K total |
| Email open rate | >35% |
| Email click rate | >5% |

---

## Presupuesto Estimado

| Concepto | Coste | Notas |
|----------|-------|-------|
| Desarrollo web (Meet Aimily) | €0 | In-house (Felipe + Claude) |
| Video motion producción | €0-500 | DIY con After Effects / Rive, o freelancer |
| Diseño gráfico (memes, carousels) | €0-300 | Canva Pro + Figma |
| Stock footage/images | €0-100 | Si necesario para video |
| Ads budget (mayo) | €500-1000 | Meta + Google retargeting |
| PR outreach tool | €0-100 | Manual o con herramienta |
| **TOTAL** | **€500-2,000** | |

---

## Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Película se retrasa | Baja | Alto | Contenido adaptable, no 100% dependiente de fecha |
| Copyright claims en memes | Media | Medio | Usar texto/referencias, no clips directos de la película |
| App no lista para demo | Media | Alto | Priorizar showcase screenshots sobre features nuevas |
| Bajo engagement inicial | Media | Medio | Tener 2 semanas de contenido pre-producido como buffer |
| Competidores copian la idea | Baja | Bajo | First-mover advantage, nombre "Aimily" es único |

---

## Archivos del Plan

```
plans/gtm-launch/
├── 00-PLAN-MARKETING-LANZAMIENTO.md    ← Este archivo (master plan)
├── 01-MEET-AIMILY-PAGE-SPEC.md         ← Spec técnico de la página
├── 02-VIDEO-STORYBOARD.md              ← Storyboard detallado del motion video
├── 03-CONTENIDO-SERIO.md               ← Textos completos posts LinkedIn/Blog
├── 04-CONTENIDO-MEMES.md               ← Briefs de cada meme con specs
├── 05-CALENDARIO-PUBLICACION.md        ← Calendario día a día
├── 06-EMAIL-SEQUENCES.md               ← Textos de cada email
├── 07-PRESS-KIT.md                     ← Press kit content
├── 08-PRODUCCION-ASSETS.md             ← Checklist de assets con specs
└── 09-METRICAS-TRACKING.md             ← Dashboard de métricas
```

---

*"That's all."*
