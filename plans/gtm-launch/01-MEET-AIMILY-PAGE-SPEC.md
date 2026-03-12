# Meet Aimily — Spec Técnico de Página

> **Ruta**: `/meet-aimily`
> **Deadline**: 7 abril 2026
> **Prioridad**: P0

---

## Arquitectura

```
src/app/meet-aimily/page.tsx          ← Página principal (client component)
src/components/meet-aimily/
├── HeroSection.tsx                    ← Hero con headline + subtitle
├── BlockShowcase.tsx                  ← Componente reutilizable por bloque
├── CreativeBlock.tsx                  ← Sección Creative Vision
├── MerchandisingBlock.tsx             ← Sección Merchandising Intelligence
├── DesignDevBlock.tsx                 ← Sección Design & Development
├── MarketingBlock.tsx                 ← Sección Marketing & Launch
├── CalendarBlock.tsx                  ← Sección Calendar (orquestador)
├── CTASection.tsx                     ← CTA final "That's all you need"
└── ScrollProgress.tsx                 ← Indicador de progreso visual
```

## Design System (Alfred)

- **Fondo**: `bg-carbon` (#282A29) con grid texture (opacity 0.03)
- **Texto principal**: `text-crema` (#FAEFE0)
- **Texto secundario**: `text-gris` (#D8D8D8)
- **Headlines**: `font-light tracking-wide`
- **Emphasis**: `italic` en palabras clave
- **Sin bordes redondeados**: `rounded-none` / `--radius: 0px`
- **Separadores**: `border-t border-gris/10`
- **Spacing**: `py-24 px-4` a `py-32 px-6` entre secciones

## Secciones Detalladas

### 1. Hero

```
Layout: Centrado, max-w-4xl
Contenido:
  - Tag: "MEET AIMILY" (text-xs font-medium tracking-[0.3em] uppercase text-gris/60)
  - H1: "Your AI-powered fashion collection assistant" (text-5xl md:text-7xl font-light)
  - Subtitle: "From a spark of inspiration to a sold-out launch. One platform. Every step."
    (text-xl font-light text-gris leading-relaxed max-w-2xl)
  - Scroll indicator: flecha animada (animate-bounce)
Animación: fade-in-up staggered (100ms delay entre elementos)
```

### 2. Intro/Stats Bar

```
Layout: Grid 4 columnas, gap-px bg-gris/10 (patrón border-grid de /discover)
Stats:
  - "4 integrated blocks"
  - "45 automated milestones"
  - "From idea to market"
  - "One timeline"
Cada stat:
  - Número grande (text-3xl font-light text-crema)
  - Label (text-xs uppercase tracking-widest text-gris/60)
Animación: fade-in-up al entrar en viewport (Intersection Observer)
```

### 3. Creative Vision Block

```
Layout: 2 columnas (texto izq + visual dcha) en desktop, stack en mobile
Contenido izquierda:
  - Step number: "01" (text-8xl font-light text-gris/20)
  - Label: "CREATIVE VISION" (tracking-widest uppercase text-xs)
  - H2: "Start with a vision, not a spreadsheet" (text-3xl font-light)
  - Descripción: "Capture your creative direction with AI-powered moodboards,
    trend analysis, and color palette generation. Turn abstract inspiration
    into a structured creative brief." (font-light text-gris leading-relaxed)
  - Feature list:
    - Trend Analysis & Forecasting
    - AI Moodboard Generation
    - Color Palette Intelligence
    - Creative Brief Builder
Contenido derecha:
  - Screenshot/mockup de Creative block (moodboard view)
  - O: animación CSS mostrando un moodboard construyéndose
Animación: Imagen slide-in desde derecha, texto fade-in-up
```

### 4. Merchandising Intelligence Block

```
Layout: 2 columnas (visual izq + texto dcha) — INVERTIDO vs bloque anterior
Contenido:
  - Step: "02"
  - Label: "MERCHANDISING INTELLIGENCE"
  - H2: "From gut feeling to business model"
  - Descripción: "Transform creative vision into commercial reality. Define product
    families, set pricing strategies, plan distribution channels, and build budgets
    — all powered by market intelligence."
  - Features:
    - Product Family Architecture
    - Pricing Strategy Engine
    - Channel Distribution Planning
    - Budget & Margin Builder
Visual: Screenshot del Merchandising dashboard / pricing matrix
Animación: Imagen slide-in desde izquierda
```

### 5. Design & Development Block

```
Layout: 2 columnas (texto izq + visual dcha)
Contenido:
  - Step: "03"
  - Label: "DESIGN & DEVELOPMENT"
  - H2: "Your collection, pixel to pattern"
  - Descripción: "From AI-generated sketches to production-ready tech packs.
    Manage prototypes, curate your final selection, and build a complete product
    catalog — all in one connected workflow."
  - Features:
    - AI Sketch Generation (SketchFlow)
    - Prototype Management
    - Collection Curation & Selection
    - Production-Ready Catalogs
Visual: Animación sketch → prototipo → producto final (3 estados con transition)
Animación: Morph entre los 3 estados al scroll
```

### 6. Marketing & Launch Block

```
Layout: 2 columnas (visual izq + texto dcha) — INVERTIDO
Contenido:
  - Step: "04"
  - Label: "MARKETING & LAUNCH"
  - H2: "Launch day? Already planned."
  - Descripción: "Plan your go-to-market strategy, create campaign content,
    schedule your content calendar, and execute your launch — from brand story
    to paid media, everything in sync."
  - Features:
    - Content Strategy & Calendar
    - Campaign Video Briefs
    - Go-To-Market Planning
    - Launch Execution Dashboard
Visual: Screenshot del Marketing creation screen
Animación: Timeline que se va llenando con posts/campaigns
```

### 7. Calendar (Orquestador)

```
Layout: Full-width, centrado
Contenido:
  - Step: "05" (o símbolo ∞ / icono timeline)
  - Label: "THE ORCHESTRATOR"
  - H2: "Every deadline. Every team. One timeline."
  - Descripción: "A visual Gantt timeline that connects all four blocks.
    45 milestones with cross-block dependencies. Drag, resize, export.
    Your entire collection journey in one view."
Visual: Screenshot del Gantt chart FULL WIDTH (el más impresionante visualmente)
  - O: animación de milestones cayendo en posición por bloque (color-coded)
Animación: Milestones aparecen secuencialmente: Creative → Merch → Design → Marketing
Fondo: Cambio a bg-crema (#FAEFE0) con texto oscuro (como sección "Evolution" de /discover)
```

### 8. CTA Final

```
Layout: Centrado, max-w-3xl, fondo carbon
Contenido:
  - Quote: "That's all you need." (text-4xl font-light italic)
  - Subtext: "Join designers, brands, and studios managing their collections with Aimily."
  - CTA primario: "Start your free trial" → /signup (btn-primary, grande)
  - CTA secundario: "See pricing →" → /pricing (text link)
  - Trust: "14-day free trial · No credit card required"
Animación: fade-in-up
```

### 9. Footer
- Reutilizar footer de landing page (links legales, social, copyright)

---

## Implementación Técnica

### Scroll Animations (sin librerías externas)

```typescript
// Hook personalizado para Intersection Observer
function useScrollReveal(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true)
        observer.disconnect() // Solo animar una vez
      }
    }, { threshold: 0.15, ...options })

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return { ref, isVisible }
}
```

### CSS Animations necesarias (añadir a globals.css)

```css
/* Slide from right */
@keyframes slide-in-right {
  from { opacity: 0; transform: translateX(40px); }
  to { opacity: 1; transform: translateX(0); }
}

/* Slide from left */
@keyframes slide-in-left {
  from { opacity: 0; transform: translateX(-40px); }
  to { opacity: 1; transform: translateX(0); }
}

/* Scale up */
@keyframes scale-reveal {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Counter animation handled via JS (countUp on intersection) */
```

### Screenshots necesarios

| # | Bloque | Vista | Resolución | Estado |
|---|--------|-------|-----------|--------|
| 1 | Creative | Moodboard con AI-generated content | 1200x800 | `PENDIENTE` |
| 2 | Merchandising | Pricing matrix / Budget dashboard | 1200x800 | `PENDIENTE` |
| 3 | Design & Dev | Sketch → Catalog progression | 1200x800 | `PENDIENTE` |
| 4 | Marketing | Campaign creation screen | 1200x800 | `PENDIENTE` |
| 5 | Calendar | Gantt chart full view | 1600x600 | `PENDIENTE` |

### SEO

```html
<title>Meet Aimily — AI Fashion Collection Assistant | From Idea to Launch</title>
<meta name="description" content="Discover how Aimily helps fashion designers and brands
manage entire collections — from creative vision to market launch — with AI-powered tools
for merchandising, design, and marketing." />
<meta property="og:title" content="Meet Aimily — Your AI Fashion Assistant" />
<meta property="og:description" content="From concept to market. One platform. Every step." />
<meta property="og:image" content="/og-meet-aimily.png" />
```

### Bilingüe (EN/ES)

Mismo patrón que pricing page — toggle EN/ES en la esquina superior.
Todos los textos con versiones en ambos idiomas.

---

## Tareas de Implementación

| # | Tarea | Estimación | Dependencia |
|---|-------|-----------|-------------|
| 1 | Crear estructura de archivos y page.tsx base | 1h | — |
| 2 | Hero section con animaciones | 1h | #1 |
| 3 | Stats bar con counter animation | 1h | #1 |
| 4 | BlockShowcase componente reutilizable | 2h | #1 |
| 5 | Creative block con screenshot | 1h | #4, screenshots |
| 6 | Merchandising block | 1h | #4, screenshots |
| 7 | Design & Dev block | 1h | #4, screenshots |
| 8 | Marketing block | 1h | #4, screenshots |
| 9 | Calendar block (full-width) | 1.5h | #4, screenshots |
| 10 | CTA section | 30min | #1 |
| 11 | Scroll progress indicator | 1h | #1 |
| 12 | Mobile responsive pass | 2h | #2-#10 |
| 13 | ES translations | 1.5h | #2-#10 |
| 14 | SEO + OG meta | 30min | #1 |
| 15 | Navigation link en navbar/landing | 30min | #1 |
| 16 | QA + performance | 1h | todo |

**Total estimado**: ~16 horas de desarrollo

---

## Navegación

Añadir "Meet Aimily" a:
- Landing page nav (entre "Discover" y "Contact")
- Navbar default (para pricing y otras páginas públicas)
- Footer links
