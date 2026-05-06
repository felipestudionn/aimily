---
name: Design & Development Block Redesign
description: D&D CONSOLIDADO en Collection Builder (2026-03-19). SKU modal con 4 fases (Range Plan → Sketch → Proto → Production). Workspaces batch siguen existiendo como rutas separadas.
type: project
originSessionId: f99254a8-8360-4858-a287-eacb00c4229e
---
# Design & Development Block — ✅ CONSOLIDADO EN COLLECTION BUILDER

> Consolidado 2026-03-19. Cada SKU vive su lifecycle completo dentro del modal del Collection Builder.

## ESTADO: ✅ CONSOLIDADO (sesión 2026-03-19)

**Las 4 fases del Design & Development ahora están embebidas en el modal del SKU dentro del Collection Builder.** Al hacer clic en cualquier SKU, se abre un modal con un stepper de 4 fases. Los workspaces batch (`/design`, `/prototyping`, `/sampling`, `/production`) siguen existiendo como vistas "batch" pero el flujo principal es per-SKU en el modal.

### Arquitectura actual: SkuLifecycleContext

```
CollectionBuilder.tsx (1,274 líneas)
  ├── Llama hooks a nivel de colección (una vez):
  │   ├── useColorways(collectionPlanId)
  │   ├── useSampleReviews(collectionPlanId)
  │   ├── useWorkspaceData(collectionPlanId, 'design')
  │   └── useProductionOrders(collectionPlanId)
  ├── Envuelve modal en <SkuLifecycleProvider value={...}>
  └── SkuDetailView.tsx (207 líneas, thin shell)
      ├── Header + Phase stepper + Footer
      └── Delega a sub-componentes:
          ├── RangePlanPhase.tsx (123 líneas)
          ├── SketchPhase.tsx (419 líneas) ← EL GORDO
          ├── PrototypingPhase.tsx (450 líneas)
          └── ProductionPhase.tsx (337 líneas)
```

### Per-SKU Modal — 4 Fases

| Fase | Componente | Líneas | Funcionalidad |
|------|-----------|--------|---------------|
| Range Plan | RangePlanPhase | 123 | Reference image upload, financials (PVP, COGS, margin), attributes, notes |
| Sketch | SketchPhase | 419 | 4-step stepper (Sketch → Colorways → Materials → Tech Pack). 3 modos: Free/Assisted/AI Proposal. AI genera flat sketch via **Freepik Flux Dev** (`/api/ai/freepik/sketch`). _(Nota 2026-04-10: originalmente documentado como fal.ai Flux 2 Pro; el flow real siempre fue Freepik Flux Dev, y fal.ai se eliminó del proyecto entero en el cleanup del 2026-04-10.)_ |
| Prototyping | PrototypingPhase | 450 | 2-step: Sourcing (factory details) + Proto Tracking (iterations con fotos, rating, notas, issues) |
| Production | ProductionPhase | 337 | 4-step: Color Validation + Fit Validation (measurement table) + Production Sample + Final Sign-off |

**Total nuevo código en sku-phases/: 1,665 líneas**

### Workspaces batch (siguen existiendo como rutas separadas)

#### Design Workspace (`/collection/[id]/design/`) — 1,220 líneas
- ColorwayManager, DesignReviewHub, LastFormSection, PatternSection
- DesignReviewHub/Lasts/Patterns usan localStorage (no migrado a DB)
- API `/api/ai/design-generate` — 4 tipos, AHORA conectado al modal via SketchPhase

#### Prototyping Workspace (`/collection/[id]/prototyping/`) — 641 líneas
- ProtoTracker + TechSheets — DB-backed

#### Sampling Workspace (`/collection/[id]/sampling/`) — 904 líneas
- ColorSampleReview + FittingReview + FinalApproval — DB-backed

#### Production Workspace (`/collection/[id]/production/`) — 1,201 líneas
- OrderTracker + QcTracker + LogisticsTracker — DB-backed

### Lo que queda pendiente:
1. ~~Consolidar los 4 workspaces como capas del Collection Builder~~ — ✅ HECHO
2. ~~Conectar AI design-generate con botones en UI~~ — ✅ HECHO (SketchPhase)
3. Persistir Color/Fit validation status en `sample_reviews` DB (actualmente local state en ProductionPhase)
4. Persistir Sourcing data en DB (actualmente local state en PrototypingPhase)
5. Tech Pack PDF generation (actualmente solo summary view)
6. Deprecar workspaces batch eventualmente (cuando el modal cubra todos los casos)

---

## Principio Fundamental

**El Collection Builder está VIVO siempre.** No hay workspaces separados. Cada fase del bloque Design & Development añade nuevas columnas/dimensiones al Collection Builder que ya se construyó en los bloques anteriores. Los SKUs arrastran TODA la información de fases previas (Creative Input + Merchandising: familia, subcategoría, pricing, canal, tipo, novedad, etc.).

```
Collection Builder (construido en Bloque 2)
    │
    ├── Fase 1: + Sketch + Color + Materiales      → cada SKU gana diseño
    ├── Fase 2: + Prototipos (revisión + rondas)    → cada SKU gana proto físico
    ├── Fase 3: + Selección Final + Catálogo        → proto aprobado + imagen AI + PVP final
    └── Fase 4: + Production (orders + logística)   → orders exportables + fechas + QC
```

---

## Fase 1: SKETCH, COLOR & MATERIALES

### Por cada SKU del Collection Builder, añadir:

#### Sketch
- **2 modos**:
  - **Manual**: El diseñador sube su sketch (upload imagen)
  - **Propuesta IA**: En base a los atributos del SKU (tipo de producto, concepto, descripción — ej. "Deportivo, Runner, Retro"), la IA genera propuesta(s) de sketch
- La IA tiene contexto completo: Creative Input (moodboard, vibe, tendencias) + atributos del SKU (familia, subcategoría, precio, tipo)
- El diseñador puede elegir entre propuestas o subir el suyo

#### Color
- Asignar opciones de colorido a cada SKU
- Se pueden diseñar varias opciones de color por SKU (para luego elegir en fases posteriores)
- Hereda paleta del Creative Input (Brand DNA + tendencias de color seleccionadas)

#### Materiales
- Información de materiales por SKU
- Puede ser libre (el diseñador especifica) o sugerido por IA en base al tipo de producto y precio

### Vista en Collection Builder
Nuevas columnas/dimensión por SKU:
```
SKU existente | ... atributos previos ... | Sketch | Colorways | Materiales | ✓
```

---

## Fase 2: PROTOTIPOS (Revisión)

### Llegan los prototipos físicos de fábrica

- Misma vista del Collection Builder, pero ahora se añade la dimensión de **prototipo**
- Por cada SKU:
  - Subir **foto real del prototipo** recibido
  - Marcar status: aprobado / con modificaciones / rechazado
  - Si tiene modificaciones → se genera otra ronda de trabajo (se piden cambios a fábrica)
  - Validar qué **color** es el aprobado de las opciones que se diseñaron en Fase 1
  - Notas de rectificación

### No hay IA en esta fase — es trabajo físico/manual

### Vista en Collection Builder
```
SKU | ... | Sketch | Colorways | Materiales | Proto Foto | Proto Status | Color Aprobado | Notas | ✓
```

---

## Fase 3: SELECCIÓN FINAL + CATÁLOGO

### Fusión de selección y catálogo en una sola fase

#### Selección Final
- Por cada hueco de SKU se asigna **un prototipo final** (de los recibidos en Fase 2)
- Se valida la selección definitiva
- Si el prototipo final tiene diferencias vs. el plan original → se puede **alterar el precio de venta** u otros atributos
- Confirmación: "este es el producto real que va a producción"

#### Catálogo (una vez seleccionado)
- **IA genera imagen realista** de foto de estudio para cada SKU aprobado
  - Input: foto del prototipo real + atributos del SKU + Brand DNA
  - Output: imagen profesional tipo catálogo/e-commerce
- El resultado es un catálogo de venta con:
  - Imagen realista por SKU
  - Precios finales
  - Todos los atributos del producto
- Ideal para venta (wholesale, showroom, e-commerce)

### Vista en Collection Builder
```
SKU | ... | Proto Final (foto) | Color Final | PVP Final | Imagen Catálogo (AI) | ✓ Validado
```

**Output**: Colección completa con producto real + imagen profesional + precio final por cada SKU.

---

## Fase 4: PRODUCTION

### Colección validada → generar órdenes de producción

- Arranca cuando Fase 3 está validada (todos los SKUs tienen proto final aprobado)
- El Collection Builder añade las dimensiones de producción:

#### Por cada SKU:
- **Precio final** (confirmado en Fase 3, visible)
- **Unidades de producción** (buy units, puede diferir de lo planificado)
- **Fecha de entrega estimada**
- **Fábrica asignada**
- **Notas de producción**

#### Funcionalidades:
- **Botón "Generar Orders"**: genera órdenes de producción agrupadas (por fábrica, por drop, etc.)
- **Exportar Excel/PDF**: en el formato estándar que necesita la fábrica (PO - Purchase Order)
- **Timeline de producción**: fechas de entrega por orden
- **QC tracking**: cuando llegan las unidades, marcar QC pass/fail
- **Logística**: método de envío, tracking, fechas estimadas vs. reales

### Vista en Collection Builder
```
SKU | ... | Proto Final | Imagen | PVP Final | Units | Fábrica | Fecha Entrega | QC Status | ✓
```

### Export
- **Excel**: formato estándar de Purchase Order (PO) con todos los datos por SKU
- **PDF**: catálogo de producción con imágenes + specs
- Agrupable por fábrica, por drop, por familia

---

## Resumen: Capas del Collection Builder

```
Bloque 2 (Merchandising):
  SKU = nombre + familia + subcategoría + pricing + canal + mercado + tipo + novedad

Bloque 3, Fase 1 (Sketch/Color/Materiales):
  SKU += sketch + colorways[] + materiales

Bloque 3, Fase 2 (Prototipos):
  SKU += foto_proto + status_proto + color_aprobado + notas_rectificación

Bloque 3, Fase 3 (Selección + Catálogo):
  SKU += proto_final + color_final + pvp_ajustado + imagen_catalogo (AI) + validado

Bloque 3, Fase 4 (Production):
  SKU += units_producción + fábrica + fecha_entrega + qc_status + tracking
  + Export: Excel PO / PDF catálogo producción
```

El Collection Builder es siempre la misma interfaz. Solo gana columnas/dimensiones en cada fase.

---

## Qué cambia vs. sistema actual

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| Workspaces | 4 separados (Design, Prototyping, Sampling, Production) con mini-wizards independientes | 4 fases dentro del Collection Builder |
| Eje central | Cada workspace es su propia UI | Collection Builder es la UI única, se le añaden capas |
| SketchFlow | Herramienta separada, genera tech pack independiente | Integrado como opción dentro de Fase 1 por cada SKU |
| Colorways | Tab separado en Design workspace | Dimensión por SKU en Fase 1 |
| Prototipos | Proto Tracker separado con sistema de reviews | Fase 2: foto + status directamente en el Builder |
| Selección + Catálogo | Sampling (3 tabs) + catálogo no existía | Fase 3: selección + imagen AI en el Builder |
| Production | Workspace separado (orders, QC, logistics) | Fase 4: integrado en el Builder + export Excel/PDF |
| Persistencia | Mix localStorage + Supabase | Todo en Supabase, todo atributo del SKU |

---

## Datos que recibe

- **Creative Input**: moodboard, vibe, tendencias, Brand DNA, paleta de colores → contexto para IA en Fase 1
- **Merchandising Output**: SKUs completos con familia, subcategoría, pricing, canal, tipo, novedad → base del Collection Builder
- **Ambos bloques anteriores** determinan qué sabe la IA cuando propone sketches, colores y materiales
