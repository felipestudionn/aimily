# Creative Brief Redesign — Implementation Plan

> Transformar el wizard de nueva coleccion de formularios rigidos a un **Creative Briefing Workspace** interactivo donde el usuario vuelca su vision creativa y Aimily organiza todo por detras.

---

## 1. VISION

**ANTES (desconectado):**
```
/new-collection  →  formularios rigidos (nombre, season, tags de colores...)
/creative-space  →  moodboard + trends (pagina separada, no conecta)
/trends          →  analisis de tendencias (pagina separada)
ProductMiniWizard →  tags manuales de colores/trends/items
```

**DESPUES (integrado):**
```
/new-collection  →  3 pasos fluidos:
  1. BASICS      (nombre, season, categorias, tamaño — rapido, auto-advance)
  2. CREATIVE BRIEF WORKSPACE (todo lo creativo en un solo espacio)
  3. REVIEW + CREATE (resumen + crear coleccion)
```

El paso 2 (Creative Brief) es el corazon: un workspace donde el usuario tiene **zonas** para volcar su vision, y Aimily extrae datos estructurados en tiempo real.

---

## 2. CREATIVE BRIEF WORKSPACE — UX

### Layout (desktop)
```
┌─────────────────────────────────────────────────────────────────┐
│  Your Creative Brief                            [Continue →]    │
├───────────────────────────────────┬─────────────────────────────┤
│                                   │                             │
│  ┌─ VISION ─────────────────┐     │  ┌─ AIMILY INSIGHTS ─────┐ │
│  │ Textarea libre:          │     │  │ (se actualiza live)    │ │
│  │ "Quiero una coleccion    │     │  │                        │ │
│  │  preppy con tonos..."    │     │  │ Colors:                │ │
│  └──────────────────────────┘     │  │  · Navy Blue           │ │
│                                   │  │  · Sage Green          │ │
│  ┌─ MOODBOARD ─────────────┐     │  │  · Cream               │ │
│  │ [img] [img] [img]       │     │  │                        │ │
│  │ [img] [+ drag & drop]   │     │  │ Trends:                │ │
│  │                          │     │  │  · Preppy Revival      │ │
│  │ [Analyze Moodboard ✨]   │     │  │  · Quiet Luxury        │ │
│  └──────────────────────────┘     │  │                        │ │
│                                   │  │ Items:                 │ │
│  ┌─ NEED INSPIRATION? ─────┐     │  │  · Oxford shirts       │ │
│  │ [Explore Trends]         │     │  │  · Chinos              │ │
│  │ [Import from Pinterest]  │     │  │                        │ │
│  │ [See What's Trending]    │     │  │ Styles:                │ │
│  └──────────────────────────┘     │  │  · New England Prep    │ │
│                                   │  │                        │ │
│                                   │  │ Mood:                  │ │
│                                   │  │  "East coast elegance  │ │
│                                   │  │   meets modern ease"   │ │
│                                   │  │                        │ │
│                                   │  │ [Edit Insights ✏]      │ │
│                                   │  └────────────────────────┘ │
└───────────────────────────────────┴─────────────────────────────┘
```

### Layout (mobile)
- Stacked: Vision → Moodboard → Inspiration → Insights (collapsible)

### Zonas del workspace

#### A. VISION (texto libre)
- Textarea grande con placeholder evocador: _"Describe your collection vision... What's the mood? The story? The woman or man you're designing for?"_
- Sin limites — el usuario escribe lo que quiera
- Gemini analiza el texto al hacer blur/submit y actualiza Insights

#### B. MOODBOARD (imagenes)
- Drag & drop de imagenes (reutilizar logica de Creative Space)
- Grid de thumbnails con X para eliminar
- Boton "Analyze Moodboard" que llama a `/api/ai/analyze-moodboard`
- Resultados alimentan el panel de Insights

#### C. NEED INSPIRATION? (expandible)
- **Explore Trends**: campo de busqueda + resultados inline (reutilizar `/api/ai/explore-trends`)
- **Import from Pinterest**: conectar cuenta + importar pins como moodboard (reutilizar `/api/pinterest/boards`)
- **See What's Trending**: market trends del momento (reutilizar `/api/ai/market-trends`)
- Cada resultado tiene boton "Add to Brief" que suma al panel de Insights

#### D. AIMILY INSIGHTS (panel lateral — sticky)
- Se actualiza en tiempo real segun el usuario añade contenido
- Muestra: Colors, Trends, Items, Styles, Materials, Mood, Target Audience
- Cada item es editable (X para quitar, + para añadir manual)
- Boton "Edit Insights" para ajustes manuales
- Este panel es la **fuente de verdad** que se pasa a `generate-plan`

---

## 3. ARQUITECTURA TECNICA

### 3.1 Nuevo componente: `CreativeBriefWorkspace`

**Ubicacion:** `src/components/planner/CreativeBriefWorkspace.tsx`

**Props:**
```typescript
interface CreativeBriefWorkspaceProps {
  onComplete: (briefData: CreativeBriefData) => void;
  initialData?: CreativeBriefData;
}

interface CreativeBriefData {
  visionText: string;
  moodboardImages: MoodImage[];
  insights: {
    keyColors: string[];
    keyTrends: string[];
    keyItems: string[];
    keyStyles: string[];
    keyMaterials: string[];
    keyBrands: string[];
    moodDescription: string;
    targetAudience: string;
    collectionName: string;
    seasonalFit: string;
  };
  pinterestBoardIds: string[];
  trendQueries: string[];  // historial de busquedas
}
```

**State interno:**
- `visionText` — texto libre del usuario
- `moodboardImages` — imagenes subidas + importadas de Pinterest
- `insights` — datos extraidos por AI (editables)
- `insightsSource` — de donde vino cada insight (moodboard/trends/manual)
- `isAnalyzing` — loading state
- `showInspiration` — toggle para expandir seccion de inspiracion
- `showTrends` / `showPinterest` / `showMarket` — sub-toggles

### 3.2 Nuevo API endpoint: `/api/ai/analyze-brief`

**Proposito:** Analizar texto libre + imagenes juntos en un solo call

**Input:**
```typescript
{
  visionText?: string;           // texto libre del usuario
  images?: { base64, mimeType }[];  // moodboard images
  existingInsights?: Partial<Insights>;  // merge con insights previos
}
```

**Output:** Mismo schema que `MoodboardAnalysis` + merge inteligente

**Logica:**
- Si solo hay texto → Gemini analiza texto y extrae creative direction
- Si solo hay imagenes → igual que analyze-moodboard actual
- Si hay ambos → Gemini combina ambos inputs para analisis holístico
- Merge con insights existentes (no sobreescribe lo que el usuario edito)

### 3.3 Flujo del wizard modificado

```
PASO 0: Nombre de coleccion
PASO 1: Season (auto-advance)
PASO 2: Categorias (multi-select)
PASO 3: Tamaño (auto-advance)
PASO 4: CREATIVE BRIEF WORKSPACE ← NUEVO (reemplaza steps 4-5 + phase questions)
PASO 5: Review + Create
```

**Eliminamos:**
- Step 4 antiguo (distribution) → se mueve a ProductMiniWizard
- Step 5 antiguo (launch date) → se calcula automatico de season
- Phase questions → se eliminan del wizard inicial (se marcan pending por defecto, se completan en cada workspace)

**Nota:** Las phase questions eran un atajo para marcar milestones como completados. Esto tiene mas sentido hacerlo dentro de cada workspace, no al crear la coleccion.

### 3.4 Integracion con ProductMiniWizard

El ProductMiniWizard (Level 2, dentro de la coleccion creada) ya no necesita Steps 0-1 (creative direction):

- Step 0 ("Want inspiration?") → **ELIMINADO** — ya se hizo en el Creative Brief
- Step 1 (tags de colores/trends/items) → **ELIMINADO** — datos vienen del Brief

El MiniWizard arranca directo en:
- Step 0: Target Consumer
- Step 1: Season (pre-filled)
- Step 2: SKU Count
- Step 3: Price Range
- Step 4: Categories
- Step 5: AI Generation (con contexto del Creative Brief)
- Step 6: Budget Confirmation

El `userMoodboardContext` que se pasa a `generate-plan` ahora viene del `CreativeBriefData.insights` guardado en la coleccion.

### 3.5 Persistencia de datos

**Opcion A (simple, localStorage + setup_data):**
- Guardar `CreativeBriefData` en `localStorage` durante el wizard
- Al crear la coleccion, guardar insights en `setup_data.creativeDirection`
- ProductMiniWizard lee de `setup_data.creativeDirection`

**Opcion B (DB, tabla nueva):**
- Nueva tabla `creative_briefs` en Supabase
- FK a `collection_plans`
- Almacena: vision_text, insights JSON, moodboard_image_urls
- Permite historial de cambios

→ **Recomendacion: Opcion A primero**, migrar a B cuando necesitemos historial.

---

## 4. REUTILIZACION DE CODIGO EXISTENTE

| Funcionalidad | Codigo existente | Accion |
|--------------|-----------------|--------|
| Upload imagenes + drag&drop | `creative-space-client.tsx` L400-450 | Extraer a componente reutilizable |
| Conversion a base64 | `creative-space-client.tsx` L416-453 | Mover a `lib/image-utils.ts` |
| Analyze Moodboard API | `/api/ai/analyze-moodboard` | Reutilizar tal cual |
| Pinterest connect + import | `creative-space-client.tsx` L511-632 | Extraer a componente `PinterestImporter` |
| Market Trends fetch | `creative-space-client.tsx` L708-721 | Extraer a hook `useMarketTrends` |
| Trend Explorer | `creative-space-client.tsx` L724-764 | Extraer a componente `TrendExplorer` |
| Tags editables (add/remove) | `ProductMiniWizard.tsx` L314-446 | Reutilizar patron pero mejorar UX |

### Componentes a extraer del Creative Space:
1. `MoodboardUploader` — drag&drop + grid de imagenes
2. `PinterestImporter` — OAuth + board selection + pin import
3. `TrendExplorer` — search + results + "Add to Brief"
4. `MarketTrendsPanel` — current trends + seleccion
5. `InsightsPanel` — panel lateral con datos extraidos (editable)

---

## 5. FASES DE IMPLEMENTACION

### Fase 1: Extraer componentes reutilizables (no rompe nada)
- [ ] Crear `src/lib/image-utils.ts` (base64 conversion, proxy logic)
- [ ] Crear `src/components/creative/MoodboardUploader.tsx`
- [ ] Crear `src/components/creative/InsightsPanel.tsx`
- [ ] Crear `src/components/creative/TrendExplorer.tsx`
- [ ] Crear `src/components/creative/PinterestImporter.tsx`
- [ ] Crear `src/components/creative/MarketTrendsPanel.tsx`
- [ ] Verificar que `/creative-space` sigue funcionando con los componentes extraidos

### Fase 2: Crear el Creative Brief Workspace
- [ ] Crear `src/components/planner/CreativeBriefWorkspace.tsx`
- [ ] Integrar MoodboardUploader + InsightsPanel + TrendExplorer + Pinterest
- [ ] Crear `/api/ai/analyze-brief` (texto + imagenes combinado)
- [ ] Layout responsive (2 columnas desktop, stacked mobile)
- [ ] Insights editables (add/remove tags, editar texto)
- [ ] Auto-analisis cuando el usuario añade contenido

### Fase 3: Integrar en el wizard de /new-collection
- [ ] Modificar `new-collection/page.tsx`:
  - Reducir a: Name → Season → Categories → Size → **Creative Brief** → Review
  - Eliminar phase questions del wizard inicial
  - Launch date auto-calculado de season
- [ ] Guardar `CreativeBriefData.insights` en `setup_data.creativeDirection`
- [ ] Pasar creative context a la creacion de coleccion

### Fase 4: Conectar con ProductMiniWizard
- [ ] Eliminar Steps 0-1 del ProductMiniWizard (creative direction)
- [ ] Leer creative context de `setup_data.creativeDirection`
- [ ] Formatear `userMoodboardContext` desde insights guardados
- [ ] Verificar que `generate-plan` recibe contexto correcto

### Fase 5: Polish y testing
- [ ] Animaciones y transiciones fluidas
- [ ] Loading states elegantes durante analisis AI
- [ ] Mensajes de Aimily contextuales ("Love the earthy tones!", "Try exploring..." )
- [ ] Test end-to-end del flujo completo
- [ ] Verificar que `/creative-space` sigue funcionando (backwards compatible)

---

## 6. DATOS CLAVE

### APIs que reutilizamos tal cual:
- `POST /api/ai/analyze-moodboard` — vision analysis de imagenes
- `POST /api/ai/explore-trends` — deep dive en tendencia especifica
- `GET /api/ai/market-trends` — tendencias actuales del mercado
- `GET /api/pinterest/boards` — boards del usuario
- `GET /api/pinterest/boards/[id]/pins` — pins de un board

### API nueva:
- `POST /api/ai/analyze-brief` — analisis combinado texto + imagenes

### localStorage keys (mantener compatibilidad):
- `aimily_creative_data` — { keyColors, keyTrends, keyItems }
- `aimily_moodboard_summary` — resumen del moodboard
- `aimily_pinterest_connected` — boolean
- `aimily_pinterest_boards` — boards data

### Datos que fluyen al plan:
```
CreativeBriefData.insights
  → setup_data.creativeDirection (en collection_plans)
    → userMoodboardContext (al llamar generate-plan)
      → SetupData (families, pricing, drops)
        → SKUs generados por AI
```

---

## 7. ESTIMACION DE COMPLEJIDAD

| Fase | Archivos nuevos | Archivos modificados | Complejidad |
|------|----------------|---------------------|-------------|
| 1. Extraer componentes | 5 nuevos | 1 (creative-space) | Media |
| 2. Creative Brief Workspace | 2 nuevos | 0 | Alta |
| 3. Integrar en wizard | 0 | 1 (new-collection) | Alta |
| 4. Conectar MiniWizard | 0 | 1 (ProductMiniWizard) | Baja |
| 5. Polish | 0 | varios | Media |

---

## 8. RIESGOS Y MITIGACION

| Riesgo | Mitigacion |
|--------|-----------|
| Romper Creative Space existente | Fase 1 extrae componentes sin cambiar la pagina |
| Romper flujo de creacion de coleccion | Fase 3 mantiene el API de creacion intacto |
| Performance con muchas imagenes | Batch processing ya implementado en analyze-moodboard |
| Pinterest OAuth puede fallar | Ya tiene graceful fallback en Creative Space |
| AI analysis lento | Loading states + analisis en background |
