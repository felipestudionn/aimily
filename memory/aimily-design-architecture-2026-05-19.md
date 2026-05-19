---
name: Aimily Design · arquitectura end-to-end
description: Documentación canónica del módulo Aimily Design — conexión In-Season ↔ fase Design del Collection Builder. Incluye schema, endpoints, prompts, flow completo, persistencia, debugging.
type: project
---

# Aimily Design · arquitectura end-to-end · 2026-05-19

> **Esta es la fuente de verdad** sobre cómo funciona Aimily Design. Si algo cambia, actualiza este doc primero. Si nunca lo has leído y vas a tocar Aimily Design, léelo entero antes.

---

## §0 · Filosofía cardinal

**Aimily Design NO es un módulo nuevo**. Es la fase **Design del Collection Builder** (concept → sketch → colorways → 3D → tech-pack → prototyping → production) expuesta como funcionalidad accesible desde In-Season Sales Management.

Cuando un comprador en In-Season ve una pill de acción `extend_colors` (Extender colores) o `amplify_next_season` (Replicar concepto en nuevo modelo) sobre un SKU, puede pulsar **"Abrir en Aimily Design →"**. Eso:

1. Recorta la foto del SKU del PDF Zara original (imagen embebida nativa)
2. Crea un nuevo SKU en una colección dedicada `"Aimily Design — In-Season"` del usuario
3. Pre-carga toda la fase Design con esa foto como `reference_image_url`
4. Inyecta el contexto del brief creativo del run (paleta moodboard, arquetipos) en las notas del SKU

**Resultado**: el comprador puede iterar el producto sin salir de su workflow, reusando el motor Design existente del Collection Builder.

**Regla cardinal**: NUNCA reimplementar prompts o flujos de Aimily app. Solo conectar y precargar.

---

## §1 · Casos de uso

| Pill en In-Season | Acción interna | Modo del sketch | Colorways | Persistencia |
|---|---|---|---|---|
| **Extender colores** | `extend_colors` | **Réplica fiel 1:1** del referente (no añade detalles inventados, copia cuello / bolsillos / cierre / mangas exactos) | Paleta del brief In-Season (`color_story`) | SKU con sufijo `· color variants`, `sku_role=BESTSELLER_REINVENTION` |
| **Replicar concepto en nuevo modelo** | `amplify_next_season` | **Variación creativa 85/15** (modelo NUEVO inspirado en hero — silueta familiar pero con variación sutil) | Paleta del brief In-Season | SKU con sufijo `· concept replica`, `sku_role=NEW` |

---

## §2 · Schema (DB)

### Migration `strategy_design_actions_2026_05_18`

```sql
-- 1) Campo nuevo en product_facts: URL de la imagen del SKU en alta resolución
ALTER TABLE strategy_product_facts
  ADD COLUMN IF NOT EXISTS product_image_url text NULL;

-- 2) Tabla nueva: ejecuciones de acciones creativas sobre SKUs
CREATE TABLE strategy_action_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES strategy_tenants(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES strategy_analysis_runs(id) ON DELETE CASCADE,
  product_fact_id uuid NOT NULL REFERENCES strategy_product_facts(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('extend_colors', 'amplify_next_season')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'complete', 'failed')),
  output_asset_urls text[] NOT NULL DEFAULT ARRAY[]::text[],
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  created_by uuid NULL
);

-- RLS strict via strategy_user_is_tenant_member()
```

### Bucket Storage `strategy-uploads`

Mime types permitidos (extendido 2026-05-19):
- `application/pdf`, `text/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel`, `application/json`, `text/plain` (original)
- **`image/png`, `image/jpeg`, `image/webp`** (añadidos para Aimily Design)

Path structure:
```
strategy-uploads/<tenant_id>/sku-images/<model_ref>-<color_ref>-<ts>.png    # imagen del SKU recortada del PDF
strategy-uploads/<tenant_id>/<source_id>/...                                # uploads originales del PDF Zara
```

---

## §3 · Endpoints nuevos (server)

### 3.1 · `POST /api/strategy/sku-image`

Recibe el blob de imagen recortada (frontend la extrae del PDF), la sube a Storage y persiste la URL en `strategy_product_facts.product_image_url`.

**Body** (FormData):
- `product_fact_id` (uuid, requerido)
- `image` (Blob/PNG, requerido)
- `force_replace` ('1', opcional · sobreescribe URL existente)

**Returns**: `{ url: string, reused: boolean }`

**Auth**: `requireStrategyAccess({ minRole: 'analyst' })`

### 3.2 · `POST /api/strategy/sku-actions/open-design`

Crea/reusa collection_plan "Aimily Design — In-Season" del usuario, crea collection_sku con reference + brief inyectado en notes, persiste execution row, devuelve URL al Collection Builder con `?open_sku=` que abre directamente SkuDetailView.

**Body** (JSON):
```json
{
  "product_fact_id": "uuid",
  "run_id": "uuid",
  "action_type": "extend_colors" | "amplify_next_season",
  "reference_image_url": "string (opcional · si no viene, usuario sube en concept phase)"
}
```

**Returns**:
```json
{
  "url": "/collection/<plan_id>/product?open_sku=<sku_id>&from=in_season&action=<action_type>",
  "sku_id": "uuid",
  "collection_plan_id": "uuid",
  "execution_id": "uuid"
}
```

**Lógica interna paso a paso**:
1. Lookup `strategy_product_facts` (`id, tenant_id, product_name, family_code, model_ref, color_ref, pvp, margin_pct_list`)
2. Auth guard `requireStrategyAccess({ tenantId: product.tenant_id, minRole: 'analyst' })`
3. Lookup `strategy_analysis_runs.creative_brief_id` del run
4. Lookup `strategy_creative_briefs.color_story` + `archetypes_focus`
5. Find or create `collection_plans` WHERE user_id = current AND name = "Aimily Design — In-Season"
6. Crea `collection_skus` con:
   - `name`: `"{product_name} · color variants"` (extend) o `"{product_name} · concept replica"` (amplify)
   - `family`: `product.family_code`
   - `category`: derivado de family (CALZADO / ACCESORIOS / ROPA)
   - `type`: `'IMAGEN'`
   - `pvp` / `final_price` / `margin` de `product`
   - `reference_image_url` si viene
   - `sku_role`: `BESTSELLER_REINVENTION` (extend) o `NEW` (amplify)
   - `notes`: multi-línea con `Origen`, `SKU referencia`, `Acción`, **`Paleta moodboard del brief In-Season: ...`**, `Arquetipos creativos del brief: ...`
7. Persiste `strategy_action_executions` con payload (incluye `reference_image_url` + `collection_plan_id` + `sku_id` + `sku_name`), `status: 'pending'`, `created_by: user.id`
8. Build URL: `/collection/<plan_id>/product?open_sku=<sku_id>&from=in_season&action=<action_type>`

**Auth**: `getAuthenticatedUser()` + `requireStrategyAccess({ minRole: 'analyst' })`

---

## §4 · Endpoints reutilizados (sin modificación de prompts existentes)

### 4.1 · `POST /api/ai/generate-sketch-options` (MODIFICADO)

Modificación: 2 nuevos params opcionales que inyectan directivas EXTRA al prompt apparel + footwear:

| Param | Cuándo | Efecto |
|---|---|---|
| `replicate_concept_brief: string` | `amplify_next_season` | Inyecta sufijo "MODO REPLICACIÓN INSPIRADA": variación 85/15 — modelo NUEVO inspirado en hero |
| `preserve_reference_exactly: true` | `extend_colors` | Inyecta sufijo "MODO RÉPLICA FIEL" con prohibiciones absolutas (no bolsillos inventados, no botones por convención) + checklist de inspección obligatoria |

**Importante**: si ambos vienen, gana `replicate_concept_brief`. Si ninguno viene, el prompt base del Collection Builder (FRONT_PROMPT / BACK_APPAREL_PROMPT / SIDE_PROMPT / TOP_PROMPT / BACK_FOOTWEAR_PROMPT) se usa tal cual (cero cambios).

**Detalle del sufijo "MODO RÉPLICA FIEL"** (extend_colors):
```
PROHIBICIONES ABSOLUTAS:
- NO añadas bolsillos a menos que sean CLARAMENTE visibles en la foto de referencia.
- NO añadas botones tradicionales si el referente tiene otro tipo de cierre.
- NO añadas costuras decorativas, paneles, o construcciones que no veas.
- NO completes "lo que falta" con detalles inventados.

INSPECCIÓN OBLIGATORIA antes de dibujar:
- ¿Tiene bolsillos visibles? (si dudas, NO los dibujes)
- ¿Cómo cierra? (botones / nudo / lazo / oculto)
- ¿Cuello? (mao / camisero / volante / sin cuello)
- ¿Bajo? (recto / curvo / asimétrico)
- ¿Mangas? (cortas / largas / 3/4 / sin mangas / con/sin puños)

REGLA DE DUDA: si dudas, simplifica.
```

**Detalle del sufijo "MODO REPLICACIÓN INSPIRADA"** (amplify_next_season):
```
Este sketch debe variar LIGERAMENTE del producto referente — silueta
familiar pero con sutiles diferencias en proporciones, detalles, longitud,
fit o tejido. Conserva el DNA conceptual del original (que es un hero
comercial probado) pero introduce variación creativa para que sea un
MODELO NUEVO inspirado, no una réplica idéntica.
Inspírate ~85% en el original, varía ~15%.
```

### 4.2 · `POST /api/ai/colorize-sketch` (SIN MODIFICAR)

Endpoint del Collection Builder que aplica zone_colors a un sketch. Aimily Design lo usa via flow estándar del SketchPhase — no se toca el prompt.

### 4.3 · `POST /api/ai/zones/detect` (SIN MODIFICAR)

Endpoint del Collection Builder que detecta las zonas anatómicas del producto (Grandad Collar, Body, Sleeves, Cuffs, Hem, Button Placket, Buttons, Knot Detail para una camisa). Aimily Design lo usa via flow estándar.

### 4.4 · `POST /api/ai/design-generate?type=color-suggest` (SIN MODIFICAR)

Endpoint que genera propuestas de colorways. Lee:
- `referencePalette` (extraída de `collection_skus.reference_image_url` con sharp)
- `brandPalette` y `moodboard` del CIS de la colección (vacío para "Aimily Design — In-Season")
- **`concept` y `designDirection` del input** ← **AQUÍ entra la paleta del brief**

Aimily Design no modifica el prompt — propaga el `color_story` del brief In-Season vía `sku.notes`, que el SketchPhase pasa al endpoint como `additionalNotes` y `designDirection`. El LLM ve la línea `"Paleta moodboard del brief In-Season (usar para proponer colorways): rojo_terracota, verde_oliva, mostaza, lavanda, crudo"` en el contexto y propone colorways usando esos colores.

---

## §5 · Frontend (componentes tocados)

### 5.1 · `src/lib/strategy/sku-image-cropper.ts` (nuevo)

Helper frontend que extrae la imagen del SKU del PDF Zara. Pipeline de prioridad:

1. **`extractSkuImageByModelRef(pdfUrl, modelRef, skuRank, totalSkus, numPages)`** (preferido)
   - Carga pdfjs dinámicamente
   - Para cada página estimada (página inicial + ±2 vecinas):
     - Encuentra coord Y del `modelRef` (e.g. "4786 166 401") con `page.getTextContent()`
     - Extrae todas las imágenes embebidas con `page.getOperatorList()` + tracking CTM stack
     - Filtra imágenes con área >20000px² (descarta iconos/logos)
     - Match: imagen cuyo Y CTM esté más cerca del Y del texto del modelRef
   - Returna canvas nativo (típicamente 135×203 en el PDF Zara) + upscale bicubic a 1024px lado mayor → 681×1024 limpia
   
2. **`cropSkuFromPdfByModelRef(pdfUrl, modelRef, ...)`** (fallback)
   - Localiza Y del modelRef igual que antes
   - Renderiza la página a 4× scale offscreen
   - Recorta region: X 2%–`matchX-8px` (hasta antes del texto del modelRef), Y `matchY ± rowH/2`
   - Auto-trim de bordes blancos
   
3. **`extractSkuImageFromPdf(pdfUrl, ...)`** (fallback sin modelRef)
   - Mismo extractImagesFromPage pero match por orden + rowInPage heurístico
   
4. **`cropSkuFromPdfHighRes(pdfUrl, ...)`** (último recurso)
   - Render 4× scale + crop heurístico por filas

**Función pública**: `getSkuReferenceImage(pdfUrl, skuRank, totalSkus, numPages, modelRef?)` orquesta los 4 modos.

### 5.2 · `src/app/(app)/strategy/[tenantSlug]/runs/[runId]/pdf-view/PdfOverlayViewer.tsx`

Cambios:
1. **Captura `pdf.numPages`** tras cargar el PDF → `setPdfNumPages(pdf.numPages)`
2. **Pasa `pdfCanvasRef`, `totalSkus`, `pdfSignedUrl`, `pdfNumPages`** al `SkuPanel` y de ahí al `SkuDetailInline`
3. **En `SkuDetailInline`** · función `launchDesign(actionType)`:
   - Llama `getSkuReferenceImage(pdfSignedUrl, sku.rank, totalSkus, pdfNumPages, sku.model_ref)`
   - Upload via `uploadCroppedSkuImage(blob, sku.product_fact_id, { forceReplace: true })`
   - POST a `/api/strategy/sku-actions/open-design` con el `reference_image_url` recibido
   - `window.open(url, '_blank')`
4. **Botón "Abrir en Aimily Design →"** renderizado dentro de la action card cuando `a.action === 'extend_colors' || a.action === 'amplify_next_season'`. Loading state con `Loader2` icon + texto "Abriendo Aimily Design…"

**Fix crítico relacionado (2026-05-19)**: orden de SKUs en la API. Los `strategy_product_facts` tenían `created_at` IDÉNTICO (mismo microsegundo del batch insert) → `ORDER BY created_at` no era determinístico. Ahora la API usa nested select `strategy_raw_records(row_index)` y sort en memoria. `rank` en `SkuRow` ahora coincide con el orden visual del PDF Zara.

### 5.3 · `src/components/planner/CollectionBuilder.tsx`

Cambios:
1. **`useEffect` que lee `?open_sku=` al mount** → cuando los SKUs están cargados, busca el SKU por id y dispara `setSelectedSku(found) + setEditingNotes(found.notes || '')`. Después limpia URL con `history.replaceState`. Esto abre el SkuDetailView automáticamente cuando viene del In-Season.

### 5.4 · `src/components/planner/sku-phases/SketchPhase.tsx`

Cambios:
1. **Detección del origen In-Season** vía `sku.notes`:
   - `isConceptReplica = /Replicar concepto en nuevo modelo/i.test(skuNotes)`
   - `isExtendColors = /Acción: Extender colores/i.test(skuNotes)`
2. **Cuando llama `/api/ai/generate-sketch-options`**, inyecta:
   - `replicate_concept_brief: "Modelo inspirado en hero comercial del In-Season — {sku.name}"` si `isConceptReplica`
   - `preserve_reference_exactly: true` si `isExtendColors`

---

## §6 · Flow end-to-end (paso a paso)

### Flow 1 · "Extender colores"

```
USUARIO en In-Season demo · expande SKU rank 1 (Grandad Collar)
    ↓
Click "Abrir en Aimily Design →" en la pill "Extender colores"
    ↓
Frontend (SkuDetailInline.launchDesign):
  1. cropSkuFromPdfByModelRef("4786 166 401")
     → 135×203 nativa del PDF (objeto embebido)
     → upscale bicubic 681×1024 limpia
  2. POST /api/strategy/sku-image (multipart, force_replace=true)
     → blob → strategy-uploads/<tenant>/sku-images/4786_166_401-401-<ts>.png
     → UPDATE strategy_product_facts.product_image_url = signed_url
     → returns { url }
  3. POST /api/strategy/sku-actions/open-design
     {
       product_fact_id, run_id, action_type: 'extend_colors',
       reference_image_url: <signed_url>
     }
     → lookup brief.color_story = [rojo_terracota, verde_oliva, mostaza, lavanda, crudo]
     → find/create collection_plan "Aimily Design — In-Season"
     → create collection_sku con name="...· color variants", sku_role=BESTSELLER_REINVENTION,
        notes = multi-line (incl. "Paleta moodboard del brief In-Season: rojo_terracota,...")
     → INSERT strategy_action_executions status=pending
     → returns { url: "/collection/<plan>/product?open_sku=<id>&from=in_season&action=extend_colors" }
  4. window.open(url, '_blank')
    ↓
NEW TAB · /collection/<plan>/product?open_sku=...
    ↓
CollectionBuilder mount:
  - useEffect lee ?open_sku=<id>
  - cuando useSkus() carga, busca el SKU
  - setSelectedSku(found) → abre SkuDetailView modal
  - history.replaceState() limpia la URL
    ↓
SkuDetailView abierto en "Concept" (01):
  - Header: "ZW - GRANDAD COLLAR SHIRT WITH KNOT ... · color variants"
  - Image preview: foto nativa del PDF (681×1024 limpia)
  - Nombre / familia / categoría / drop / etc. precargados
  - Notas visibles
    ↓
Click "Validar y Continuar" → Sketch (02):
    ↓
Click "GENERAR FLAT SKETCH":
  - SketchPhase detecta isExtendColors=true en sku.notes
  - POST /api/ai/generate-sketch-options con preserve_reference_exactly: true
  - Endpoint añade MODO RÉPLICA FIEL al typeSuffix del prompt
  - OpenAI gpt-image-1.5 genera FRONT + BACK
  - persistAsset() guarda en collection-assets/<plan>/sketches/
  - sku.sketch_url + sku.sketch_back_url actualizados
    ↓
Click "Validar y Continuar" → Color & Materials (03):
  - /api/ai/zones/detect llamado en background con productName, family, category
  - Devuelve zonas: Grandad Collar, Body, Sleeves, Cuffs, Hem, Button Placket, Buttons, Knot Detail
    ↓
Click "Proponer Colorways":
  - launchGenerate construye input con:
    concept: sku.notes  ← contiene la paleta del brief
    designDirection: notes || sku.notes
    family, category, zones
  - callDesignAI('color-suggest', input) → /api/ai/design-generate
  - Endpoint:
    - extrae referencePalette de la foto del SKU (gris azulado del Grandad)
    - construye prompt con concept (incluye la paleta del brief In-Season)
  - LLM genera array de colorways con nombres como "Terracota Profundo",
    "Verde Salvia", "Lavanda Nocturna", "Lino Crudo" (= paleta del brief)
  - colorizeAll(colorways) → /api/ai/colorize-sketch por cada colorway
    → renders en collection-assets/<plan>/render/...
    ↓
Resultado: 4 colorway cards con la silueta de Grandad pintada en cada color
del brief In-Season. El sketch base es réplica fiel del referente (no añade
bolsillos, no inventa botones, mantiene detalle de nudo).
    ↓
Usuario puede aceptar colorways, ir a Ficha Técnica, 3D Render, etc.
```

### Flow 2 · "Replicar concepto en nuevo modelo"

Igual al Flow 1 con **2 únicas diferencias**:

1. **Endpoint open-design** · `action_type: 'amplify_next_season'`:
   - `skuName`: `"{product_name} · concept replica"`
   - `sku_role`: `'NEW'`
   - `notes` incluye `Acción: Replicar concepto en nuevo modelo` (no `Extender colores`)

2. **SketchPhase generate** · detecta `isConceptReplica=true`:
   - POST con `replicate_concept_brief: "Modelo inspirado en hero comercial..."` (no `preserve_reference_exactly`)
   - Endpoint añade MODO REPLICACIÓN INSPIRADA al prompt
   - Resultado: sketch con variación 85/15 (silueta familiar, detalles distintos)

---

## §7 · Persistencia · ¿qué se guarda y dónde?

| Dato | Tabla / lugar | Cuándo |
|---|---|---|
| Imagen referencia del SKU | `strategy_product_facts.product_image_url` (URL firmada) + `strategy-uploads/<tenant>/sku-images/...png` | Primera vez que se hace click "Abrir en Aimily Design" |
| Ejecución de acción | `strategy_action_executions` (1 row por click) | En cada click, status=pending |
| Colección Aimily Design | `collection_plans` WHERE name="Aimily Design — In-Season" (1 por usuario, reusada) | Primera vez que el usuario abre Aimily Design |
| SKU nuevo en la colección | `collection_skus` (1 por click — múltiples del mismo producto generan múltiples SKUs) | En cada click |
| Sketch generado | `collection_skus.sketch_url` + `sketch_back_url` (URLs firmadas a `collection-assets/<plan>/sketches/...`) | Cuando el usuario clic "GENERAR FLAT SKETCH" |
| Zonas detectadas | en memoria del SketchPhase (no persiste en DB · re-detecta al re-abrir) | Auto al entrar a Color & Materials |
| Colorways propuestos | `collection_skus.colorways` (JSONB con array de propuestas) | Al aceptar una colorway |
| 3D render | `collection_skus.render_url` y `render_urls` (JSON) | Cuando el usuario llega a fase 3D Render |

**Reusabilidad**: cuando un usuario vuelve mañana al In-Season y hace click en el mismo SKU otra vez, se crea OTRO `collection_sku` en la colección Aimily Design (NO se reusa el anterior). Esto es a propósito — permite generar variantes múltiples por SKU origen.

Si Felipe quiere "reusar el último SKU generado en lugar de crear uno nuevo", habría que añadir una query en `open-design` que busque `collection_skus` con notes que incluyan el `SKU referencia: {model_ref}` + el `action_type` y reuse. **Aún no implementado** — todos los clicks crean SKUs nuevos.

---

## §8 · Cómo se propaga el brief creativo

**Cadena de propagación**:

```
strategy_analysis_runs.creative_brief_id
  → strategy_creative_briefs.color_story = ["rojo_terracota", "verde_oliva", "mostaza", "lavanda", "crudo"]
    → endpoint open-design lee esto
      → lo inyecta en collection_skus.notes como:
        "Paleta moodboard del brief In-Season (usar para proponer colorways): rojo_terracota, verde_oliva, mostaza, lavanda, crudo"
        "Arquetipos creativos del brief: minimalist, statement"
          → SketchPhase pasa sku.notes al endpoint color-suggest como:
            concept: sku.notes
            designDirection: notes || sku.notes
            additionalNotes: sku.notes
              → LLM ve la paleta en el contexto
                → propone colorways con esos colores
                  ("Terracota Profundo", "Verde Salvia", "Lavanda Nocturna", "Lino Crudo")
```

**El brief NO se guarda como Brand DNA de la colección**. Se transmite via notas del SKU. Esto es intencional — el "Aimily Design — In-Season" plan es un contenedor genérico, no una marca; el brief vive a nivel de cada SKU porque cada SKU puede venir de un run distinto con un brief distinto.

---

## §9 · Casos edge & debugging

### Si la imagen del SKU no es la correcta del PDF
- Causa: el LLM matching falló o el modelRef no aparece en el text content de la página.
- Debug: añadir console.log en `extractSkuImageByModelRef` (`page=${pageIdx + 1} modelRef=${normRef} matchY=${matchY}` + `images_extracted=${images.length}`).
- Fallback: el sistema cae automáticamente a `cropSkuFromPdfByModelRef` (crop del page render 4× con bbox text-anchored).

### Si el orden de la UI no coincide con el PDF
- Causa: `strategy_product_facts.created_at` idéntico → `ORDER BY created_at` no es determinístico.
- Fix aplicado: la API ordena por `strategy_raw_records.row_index` (asignado por el parser top-to-bottom).
- Si vuelve a fallar: verificar que `raw_record_id` está poblado en cada product_fact y que cada row tiene `row_index` único.

### Si el sketch añade detalles inventados (extend_colors)
- Causa: el LLM ignora el MODO RÉPLICA FIEL.
- Fix: el prompt actual es estricto pero el gpt-image-1.5 puede seguir interpretando. Si vuelve a pasar:
  1. Reforzar el prompt con más ejemplos negativos
  2. Considerar cambiar a otro modelo (Claude vision-edit, Magnific)
  3. Aceptar y permitir al usuario subir su propio sketch manualmente

### Si "Abrir en Aimily Design" falla con 404
- Causa: pérdida de sesión auth durante `window.open` cross-tab.
- Workaround: navegar primero a `/my-collections` para refrescar auth, luego abrir el URL del builder. Esto pasaba en testing con Playwright; usuarios reales no deberían verlo si están autenticados.

### Si el bucket Storage rechaza la imagen con "mime type image/png is not supported"
- Causa: el bucket `strategy-uploads` no tenía `image/*` en `allowed_mime_types`.
- Fix aplicado: UPDATE storage.buckets SET allowed_mime_types = array_cat(..., ARRAY['image/png','image/jpeg','image/webp']) WHERE name = 'strategy-uploads'.
- Si vuelve a fallar: re-aplicar la misma query.

### Si las colorways no usan los colores del brief
- Causa: `sku.notes` no incluye la paleta (puede que `creative_brief_id` sea null o que el brief no tenga color_story).
- Debug: SELECT notes FROM collection_skus WHERE id = '<sku>' y verificar que la línea "Paleta moodboard del brief In-Season:" está presente.
- Si está pero el LLM no la usa: el prompt color-suggest tiene que dar prioridad a esa línea. Por ahora confiamos en que la inyecta en `concept` y `designDirection`.

### Si necesitas re-extraer la imagen de un SKU con la versión nueva del extractor
- POST `/api/strategy/sku-image` con `force_replace: '1'` en el FormData.
- Esto sobreescribe `strategy_product_facts.product_image_url` (la URL vieja queda en Storage pero ya no se referencia).

---

## §10 · Versiones de prompts (histórico)

### MODO RÉPLICA FIEL · v1 (commit 6904f9d · 2026-05-19)
Suave: "NO añadas detalles que no están en el referente". El LLM siguió añadiendo bolsillos por convención.

### MODO RÉPLICA FIEL · v2 (commit 49f6e0b · 2026-05-19) [ACTUAL]
Estricto: PROHIBICIONES ABSOLUTAS + INSPECCIÓN OBLIGATORIA + REGLA DE DUDA. Verificado por Felipe en producción.

### MODO REPLICACIÓN INSPIRADA · v1 (commit 3a0e6fa · 2026-05-19) [ACTUAL]
"Inspírate ~85% en el original, varía ~15%". Verificado: añadió un bolsillo a la Grandad Collar (variación correcta, no réplica).

---

## §11 · Commits del sprint Aimily Design (cronológico)

| Commit | Descripción |
|---|---|
| `fc85678` | feat conexión In-Season ↔ Collection Builder Design Phase |
| `4fee2c2` | fix URL routing a `/collection/[id]/product` |
| `3a0e6fa` | recorte canvas heurístico + variación prompt amplify_next_season |
| `d6ee3e4` | extracción imágenes embebidas del PDF |
| `54c4306` | upscale bicubic a 1024px |
| `60f73e1` | recorte text-anchored por modelRef |
| `0a9dcae` | fix orden SKUs UI por row_index |
| `f449f29` | extracción nativa matched por modelRef |
| `8f17b11` | retirar logs debug |
| `fa84807` | propagar color_story del brief al SKU |
| `6904f9d` | modo réplica fiel para extend_colors v1 |
| `49f6e0b` | modo réplica fiel v2 con prohibiciones absolutas |

Schema migration: `strategy_design_actions_2026_05_18` (aplicada vía Supabase MCP).

Bucket update: `UPDATE storage.buckets SET allowed_mime_types = array_cat(...) WHERE name = 'strategy-uploads'` (aplicada vía SQL inline).

---

## §12 · Pending items / próximos sprints

- **Aimily Design como módulo dedicado · página "Design Lab"** (no esta sesión): vista cross-runs/cross-temporadas donde el usuario gobierna todos los sketches generados. Crear como `/design` o `/design-lab`. Reusar `useSkus` filtrando por `collection_plan.name = "Aimily Design — In-Season"`.
- **Reusar SKU existente** en lugar de crear uno nuevo en cada click. Match por `product_fact_id + action_type` (almacenado en `strategy_action_executions`).
- **Cleanup automático** de imágenes huérfanas en Storage (cuando un `collection_sku` se elimina, su `reference_image_url` queda en Storage).
- **Mostrar contador "Ya generaste N variantes"** en el drawer del SKU del In-Season — usar `strategy_action_executions` filtrado por `product_fact_id`.
- **`mostaza` colorway**: actualmente solo se generan 4 de 5 colores del brief — el LLM elige sus 4 favoritos. Forzar que use los 5 o pedirle un número específico.
- **Refactor Strategy → In-Season**: rename de URLs/slugs `/strategy/...` → `/in-season/...`. Pendiente, ya documentado en `memory/project_rename-strategy-to-in-season.md`.
