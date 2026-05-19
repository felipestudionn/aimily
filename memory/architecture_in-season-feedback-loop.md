---
name: aimily In-Season · feedback loop architecture + two-surface model
description: Captura la visión estructural de Felipe (2026-05-19 noche) sobre In-Season como (1) connector standalone para marcas que ya existen y (2) bloque final del aimily 360 cuyos verdicts producen "semillas de SKU" que retroalimentan la próxima colección. Pre-requisito del rename Strategy→In-Season. Doc canónico para el siguiente sprint que lo construya.
type: project
---

# aimily In-Season · feedback loop architecture + two-surface model

> Felipe 2026-05-19 noche: «El In-Season Management tiene que estar incluido como último punto dentro del Aimily App para alguien que quiere todo el 360, porque esto es lo que realmente retroalimenta todo. En base a esto, puedes empezar a generar nuevas colecciones. Quiero imaginarme cómo se puede conectar todo.»

Doc estructural — no plan de implementación. Captura una visión que debe informar todo lo que se construya a partir de ahora en In-Season.

---

## §1 · Dos superficies, un mismo motor

In-Season tiene **dos entry points** distintos. Comparten el motor (parsers + classifiers + orchestrator + verdict resolver) pero sirven a personas distintas y conviven con bloques distintos del aimily app.

### Superficie A · "In-Season connector" standalone

**Target user**: una marca que YA existe — Shopify Plus DTC, Mango, una boutique con ERP propio, una marca emergente con tracción y un piloto. NO usa aimily para crear su marca; usa aimily exclusivamente para resolver el problema In-Season (qué reponer, qué rebajar, qué extender, qué matar).

**Onboarding flow**:
1. Sign-up + brand-scoped tenant en aimily
2. Conecta su fuente de datos: OAuth Shopify, upload CSV/XLSX, conectar Prediko/Loop, etc.
3. Run inicial → ve verdicts sobre su catálogo real
4. Cadence semanal (Mango) o diaria (Zara): cron ingesta nuevos snapshots, aimily presenta el daily/weekly trading view

**Análogo**: Aimily Studio standalone — la marca trae su brand kit + briefs, Studio genera contenido. No hay collection builder de por medio.

**Lo que YA está construido (2026-05-19)**:
- Tenant model + isolation RLS
- Parsers: Zara RNK PDF · Shopify CSV/XLSX · Shopify GraphQL Admin API
- Engine: classifiers + orchestrator + verdict resolver + scenario diales + 4 scenarios
- UI: ranking + per-SKU verdicts + KPIs (rotation/days/returns/distribution)
- Test harness: cool indie brand dev store (memory/shopify-lane-test-harness-2026-05-19.md)
- Bridge Aimily Design (parcial — ver §5)

**URL pattern actual** (necesita rename §6):
`https://aimily.app/strategy/<tenant_slug>/runs/<runId>/pdf-view`
→ destino: `https://aimily.app/in-season/<tenant_slug>/runs/<runId>/view`

### Superficie B · In-Season como bloque final del aimily 360

**Target user**: marca que está usando aimily end-to-end. Creó su brand kit (Block 1), planificó merchandising y prices (Block 2), diseñó las prendas con Creative Workspace (Block 3), produjo tech packs (Block 4), lanzó GTM (Block 5). Ahora la colección está EN TIENDA — In-Season es lo que sigue.

**Esto es lo que cambia radicalmente vs Superficie A**:
- No es un connector externo: las collections ya viven en aimily (`collection_plans`, `creative_workspace_sessions`, `tech_packs`, etc.)
- El "ingest" no viene de Shopify GraphQL ni CSV — viene de **datos de venta reales** que el cliente conecta una vez (Shopify/ERP/POS) y se persisten en aimily como hechos cíclicos
- Las collections en aimily son las "Zara RNK" del 360: cada SKU del catálogo tiene model_ref + color + size + variant tied a un collection block, no a un Shopify product id huérfano

**El bloque In-Season en aimily 360 es la 6ª y última fase**:
```
01 Creative & Brand → 02 Merchandising → 03 Design & Development → 04 Tech Pack → 05 Marketing/GTM → 06 In-Season ← retroalimenta todo
                                                                                                    ↓
                                                                                            semillas para nueva colección
```

---

## §2 · El bucle de retroalimentación · SKU seeds

> **2026-05-19 noche · MODELO DEFINITIVO (user-initiated)**: las semillas
> NO se auto-materializan al ejecutar un run. Sólo nacen cuando el merch
> hace click explícito en "+ Añadir a semillas" en un verdict pill, o
> cuando hace click en "Abrir en Aimily Design" (que también crea la
> seed). El motor sigue produciendo el universo permisivo de verdicts
> (eso no cambia), pero el pool de semillas es el subset que el usuario
> decidió DESARROLLAR. Pool = decisión humana, no universo del motor.
>
> El intento previo de auto-materializar (commit 94ad874 hook fire-and-
> forget) está rolled back en commit pendiente. Razón: confundía el
> motor con la intención. El merch ve TODOS los verdicts en el run UI
> con sus rationales y evidence; añade a semillas solo lo que va a
> desarrollar para próxima colección.

**Dos botones, mismo flow** (Felipe 2026-05-19):

| Botón en verdict pill | Crea seed | Abre Builder | Cuándo usarlo |
|---|---|---|---|
| **"+ Añadir a semillas"** | ✅ | ❌ | Decidir ahora, desarrollar luego desde el pool |
| **"Desarrollar ahora"** | ✅ | ✅ | Decisión + ejecución inmediata |

Y en el pool `/strategy/<tenant>/seeds`, cada SKU card tiene un botón **"Desarrollar →"** que abre el run de origen con auto-trigger del Aimily Design — equivalente a "Desarrollar ahora" pero desde la cola.

Esta es la pieza nueva que Felipe puntualiza.

### Concepto: "SKU seed"

Cada vez que In-Season emite un verdict de los siguientes 5 tipos:

| Verdict | Seed type | Qué propone para próxima colección |
|---|---|---|
| `REPLICAR_CONCEPTO` (in-season) | Reorder + Distort | Re-pedir mismo SKU AHORA — no es seed para próxima colección. SE QUEDA |
| `AMPLIFY_NEXT_SEASON` | Sequel brief | Crear nueva versión del concepto en próxima colección — alter color/fabric/silueta |
| `EXTENDER_COLORES` | New color variants | Crear el mismo SKU base en N nuevos colores propuestos por el moodboard brief |
| `DROP_COLOR` | Retire from palette | Borrar/no incluir ese color en próxima colección |
| `DECONTINUAR_MODELO` (kill) | Retire | No volver a desarrollar este model_ref |

Las semillas son **artefactos persistentes** con su propia tabla:

```sql
CREATE TABLE strategy_sku_seeds (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  source_run_id uuid NOT NULL,          -- de qué run salió
  source_sku_id text NOT NULL,           -- model_ref + color de la madre
  seed_type text NOT NULL,               -- amplify_next_season | extend_colors | drop_color | retire | reorder
  proposed_changes jsonb NOT NULL,       -- {new_colors, new_fabric, new_silhouette, etc.}
  evidence jsonb NOT NULL,               -- screenshot del verdict que la generó
  rationale text NOT NULL,
  created_at timestamptz DEFAULT now(),
  consumed_at timestamptz NULL,          -- null = vivo · timestamp = ya se metió en una collection
  consumed_in_collection_id uuid NULL,
  rejected_at timestamptz NULL,          -- usuario la descartó explícitamente
  status text NOT NULL DEFAULT 'live'    -- live | consumed | rejected | expired
);
```

### Vida de una semilla

```
Verdict In-Season emitido
       ↓
seed materializada en strategy_sku_seeds (status=live)
       ↓
Aimily Design Module embebe la foto + brief (esto ya existe, parcial)
       ↓
Usuario revisa el pool ("Mis semillas de In-Season")
       ↓
Decide: consumir / rechazar / posponer
       ↓ consumir
Al arrancar nueva colección, gate "Quieres traerte estas semillas?"
       ↓ sí
seed.consumed_in_collection_id = nueva colección
seed.status = consumed
SKUs en la nueva colección heredan el rationale + brief de la semilla
```

### Gate "¿Quieres traerte tus semillas?" al arrancar nueva colección

Cuando el usuario hace **New Collection** en aimily 360, después del paso "elegir temporada" (SS26/FW26) y antes de "definir el consumer", insertamos un step:

> «Tienes **17 semillas** de SKU generadas por In-Season de SS26.
> — 4 extensions de color (Lodge: añadir Navy/Brown/Olive)
> — 6 sequel briefs (Whitney Pullover: tela más liviana para verano)
> — 3 reorders directos (Foraker Coat: mismo SKU, +200 uds)
> — 4 retire from palette (Khaki / Sage / Rust no funcionaron)
>
> ¿Cuáles quieres traer a FW26?»

Click selects → las semillas seleccionadas pre-pueblan:
- `collection_plan_skus` con los model_refs + color_refs propuestos
- `creative_workspace_sessions.moodboard_proposed_palette` con los colores propuestos
- `creative_brief.seasonal_pivots` con los aprendizajes ("Lodge fue hero en White con +30% sell-through, replicar en Navy")

### Mapping verdict → block target

Cada seed types va a un bloque específico del aimily 360:

| Seed type | Block target | Sub-step |
|---|---|---|
| `amplify_next_season` | Block 1 Creative & Brand | Brief de consumer + moodboard preserva concept |
| `extend_colors` | Block 1.2 Moodboard | Color palette pre-pueblada |
| `extend_colors` | Block 3.X Color cards | Cards de color pre-añadidas como "validated by In-Season" |
| `drop_color` | Block 1.2 Moodboard | Color marcado como excluded with rationale |
| `retire` | Block 2 Merchandising | Model_ref bloqueado de uso futuro |
| `reorder` | NOT a seed | Se actúa AHORA, no llega a próxima colección |

---

## §3 · Quién consume qué · matriz de superficie × bloque

| Surface | Quien es | Qué usa de aimily | Qué NO usa |
|---|---|---|---|
| A · Standalone connector | Marca con catálogo propio en Shopify/ERP | In-Season engine + verdicts + Aimily Design (extend_colors) | Brand kit · Collection Builder · Tech packs · GTM |
| B · Final block 360 | Marca usando aimily end-to-end | TODO + In-Season feedback loop con seeds + gate de "traer semillas" | (nada) |

**Implicación de diseño**:
- El motor In-Season debe correr **indistinto** del data shape input (Shopify GraphQL vs aimily-native catalog vs CSV bundle)
- La capa de output (verdicts → seeds) sólo materializa seeds para tenants que tengan una "aimily collection mode" activa
- Para connector standalone (surface A) las seeds NO se materializan en strategy_sku_seeds — el output es solo el verdict + la posibilidad de re-pedir via Aimily Design embebido

---

## §4 · Pre-requisitos estructurales

Para construir este loop **end-to-end** hace falta:

### 1. Rename Strategy → In-Season (DEFERIDO desde 2026-05-17)

Ver memory entry: `project_rename-strategy-to-in-season.md`. La ventana de auditoría que justificaba el deferment cerró. Es momento.

**Surface**: archivos a tocar (~40):
- URLs: `/strategy/` → `/in-season/`
- DB tables: `strategy_*` → `in_season_*` (40+ tablas)
- Código: `strategy/` directory paths
- i18n: 9 locales
- API endpoints: `/api/strategy/*` → `/api/in-season/*`

Sin este rename el bloque "06 In-Season" del aimily 360 tendrá nombres inconsistentes con el resto del producto.

### 2. Tabla `strategy_sku_seeds`

Schema en §2. Migración nueva.

### 3. Hook al verdict resolver

En `sku-verdict-resolver.ts`, después de calcular el verdict, materializar seed cuando:
- action ∈ {amplify_next_season, extend_colors, drop_color, retire}
- run_id pertenece a tenant con `surface_mode = 'aimily_360'` (no connector standalone)

### 4. Pool UI "Mis semillas"

Nueva vista `/in-season/<tenant>/seeds`. Lista de seeds live + consumed + rejected. Filtros por seed_type + source_run.

### 5. Gate en New Collection flow

En `/collection-plans/new/...` insertar step "Bring forward seeds?" entre selección de temporada y consumer brief.

### 6. Ingestion de seeds en blocks del builder

Modificar `collection_plan_skus` insert para aceptar `seed_id` como fuente. Block 1.2 Moodboard debe leer seeds con type=extend_colors al popular palette.

### 7. Sales data ingestion para tenants 360

Para superficie B (aimily 360) la marca debe poder conectar UNA VEZ su fuente de venta (Shopify/POS) y aimily corre la analítica cíclica sin que el usuario tenga que subir CSVs cada lunes.

Schema: `tenant_sales_connections` con OAuth tokens encriptados + cron config + last_sync_at.

---

## §5 · Lo que YA existe (embrión) vs lo que falta

### Existe (no descartar):
- `strategy_design_actions` tabla (migración `strategy_design_actions_2026_05_18`)
- Aimily Design Module — pill «Abrir en Aimily Design» en verdicts `extend_colors` / `amplify_next_season`. Click recorta foto del PDF Zara (o usa la URL del Shopify product), crea SKU en colección «Aimily Design — In-Season»
- Dos modos del módulo:
  - **Réplica fiel 1:1** (`extend_colors`, preserve_reference_exactly)
  - **Variación 85/15** (`amplify_next_season`, replicate_concept_brief)

### Embrión vs vision:
- **Embrión**: actuación manual (usuario hace click) · colección destino fija ("Aimily Design — In-Season") · sin pool global · sin gate de "traer al arrancar nueva colección"
- **Vision (§2)**: materialización automática · pool persistente · vida propia · gate de "traer semillas" al new collection · destino dinámico

### Falta:
- Tabla `strategy_sku_seeds`
- Auto-materialización post-verdict
- Pool UI
- Gate de "bring forward seeds"
- Block ingestion (moodboard accepts seed colors, etc.)
- Ingest cíclico para tenants 360

---

## §6 · Plan de ejecución sugerido (NO ejecutar ahora)

Cuando se priorice este loop, propongo este orden:

1. **Sprint A — Rename Strategy→In-Season** (1 sprint completo, ~40 archivos). Sin esto, el resto produce inconsistencias.
2. **Sprint B — `strategy_sku_seeds` schema + auto-mat post-verdict** (~3 días). Solo materialización, sin UI.
3. **Sprint C — Pool UI "Mis semillas" en In-Season** (~3 días). Vista de listing + drill-down.
4. **Sprint D — Gate New Collection "Bring forward seeds"** (~5 días). Step nuevo en collection-plan/new.
5. **Sprint E — Block ingestion** (~1 semana). Moodboard, Color cards, Merchandising, etc. aceptan seed_id como input.
6. **Sprint F — Cyclic sales ingestion para tenants 360** (~1 semana). OAuth + cron config + automated weekly runs.

Total: **~5 semanas** para cerrar el loop completo desde rename a ingest cíclico. Es un trabajo no trivial. Pero sin esto el aimily 360 queda "abierto" — el último bloque emite outputs que nadie consume.

---

## §7 · Cardinal rule

**El In-Season no es un dashboard de analytics. Es un generador de outputs que retroalimentan el ciclo creativo de la marca.** El usuario que ve un verdict EXTENDER COLORES no quiere solo verlo: quiere que esa decisión se convierta en SKUs reales de la próxima colección sin tener que copiar y pegar manualmente.

Si construimos el loop, In-Season pasa de ser una herramienta de decisión semanal a ser **el cerebro estratégico que aprende temporada a temporada**. Cada ciclo SS→FW→SS→FW el sistema acumula evidence, las decisiones se vuelven más informadas, y la marca va construyendo un "merch DNA" propio basado en sus learnings reales.

Eso es lo que distingue aimily de un Centric o un Toolio: el loop creativo, no solo el dashboard.
