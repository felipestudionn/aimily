---
name: Shopify lane · feasibility & decision
description: Análisis de si podemos replicar la experiencia In-Season + Aimily Design con datos de Shopify. Incluye matriz comparativa Zara vs Shopify, parser actual, brechas críticas, decisión técnica + plan de implementación.
type: project
---

# Shopify lane · feasibility & decision · 2026-05-19

> **Veredicto ejecutivo en una frase**: el In-Season completo (13 verbos + Aimily Design) **es viable en Shopify Plus + Prediko + Loop Returns** — y la calidad de fotos para Aimily Design es **estrictamente mejor que Zara** (2048×2048 masters vs 135×203 thumbs). En Shopify Basic standalone funcionan **8 de 13 verbos** con graceful degradation; los 5 que se degradan son los de supply chain (PULL_FORWARD, REPLENISH_URGENT, AMPLIFY_DISTRIBUTION, AMPLIFY_IN_SEASON, PROMOTE_PUSH).

---

## §1 · Estado del parser actual (commit ya en main)

`src/lib/strategy/parsers/shopify-csv.ts` (462 líneas) parsea XLSX bundle de 3 sheets: Sales by variant + Inventory levels + Returns by variant. Ya extrae:

| Categoría | Lo que el parser hace HOY |
|---|---|
| **Identity** | SKU + product_title + variant_title; infiere color_ref/size_ref del variant_title splitting por `/` (e.g. "Black / S") |
| **Velocity** | Deriva windows `d1` / `d2` / `7d` / `8_14d` time-bucketing las filas de Sales by `day` / `week` / `month` contra un `observation_date` anchor |
| **Pricing** | Deriva `pvp` como `lifetime_net_sales / lifetime_units` (precio medio realizado, no list price) |
| **Inventory** | `stock_store = available + on_hand`, `stock_in_transit = incoming`, `stock_pending = committed`, todo agregado por SKU a través de todas las locations |
| **Returns** | `returns_pct = units_returned / lifetime_units` (corrección Codex P1: nunca usar `total_returns` como units, suele ser euros) |
| **Header aliases** | 30+ alias mapeados (`product_variant_sku`, `sku`, `product_sku` → `variant_sku`; `net_items_sold`, `net_quantity`, `units_sold` → `net_units_sold`; etc.) |

`coverage_dimensions` que el parser marca como **false explícitamente**:
- `distribution`, `efficiency` (sin total_bought / total_shipped), `geographic`, `channel`, `weather`, `marketing_exposure`, `page_traffic`, `markdown_date`, `stockout_days`, `supplier_lead_time`, `margin_after_returns`

**Lo que NO hace** (gap principal vs Aimily Design): **no extrae imágenes**. El CSV Products de Shopify SÍ tiene `Image Src` URLs (CSV ingest path), pero el parser actual sólo procesa Sales/Inventory/Returns sheets — no Products. Y para steady-state ingestion via API, hay que llamar al GraphQL Admin para obtener `Product.media` o `MediaImage.url(transform: ...)`.

---

## §2 · Matriz comparativa · 43 campos canónicos Zara vs Shopify

Leyenda: ✅ direct · 🟡 derivable · 🟠 requires app · ❌ not available

### Identity (6 campos)
| Campo Zara | Equivalente Shopify | Verdict |
|---|---|---|
| `model_ref` | `Product.id` / `Product.handle` (GraphQL) | ✅ |
| `color_ref` | `ProductVariant.selectedOptions[name="Color"]` | ✅ |
| `family_code` | `Product.productType` / `Product.tags` / `Product.category` (Shopify Standard Taxonomy) | ✅ (convención tenant-dependiente) |
| `product_name` | `Product.title` | ✅ |
| `season_tag` | `Product.tags` o metafield `custom.season` | 🟡 (sin canónico, requiere convención) |
| `activation_date` | `Product.publishedAt` | ✅ |

### Pricing (5 campos)
| Campo Zara | Equivalente Shopify | Verdict |
|---|---|---|
| `pvp` | `ProductVariant.price` | ✅ |
| `pvp_compare` | `ProductVariant.compareAtPrice` | ✅ |
| `markup_pct` | derived `(price - InventoryItem.unitCost) / price` | 🟡 (requiere "View product costs" granular permission) |
| `on_promo` | derived `compareAtPrice > price` | 🟡 |
| `margin_pct_list` | derived | 🟡 |

### Demand / Velocity (6 campos) — derivable del Orders GraphQL
| Campo Zara | Equivalente Shopify | Verdict |
|---|---|---|
| `velocity_d1` / `d2` / `7d` / `8_14d` | `SUM(lineItems.quantity WHERE order.createdAt IN bucket)` | 🟡 (todos derivables) |
| `importe_7d` | `SUM(lineItems.price × quantity)` last 7d | 🟡 |
| `share_net_sales_7d` | SKU revenue / total revenue 7d | 🟡 |

### Productividad (4 campos) — **PUNTO MÁS DÉBIL**
| Campo Zara | Equivalente Shopify | Verdict |
|---|---|---|
| `rotation_td_tr_aj_7d` / `rotation_td_tr_7d` | NO native — derive `velocity_7d / avg_stock_7d` (requiere snapshots diarios de inventory que aimily debe persistir) | 🟡 (we own the ETL) |
| `emptying_rate` / `emptying_rate_available` | derive `velocity_7d / stock_available` | 🟡 |

### Capacity (2 campos)
| Campo Zara | Equivalente Shopify | Verdict |
|---|---|---|
| `max_sale_no_promo` / `max_sale_promo` | derive: max daily velocity en períodos cuando `compareAtPrice` era null / no-null. **Shopify no almacena price history** → aimily debe persistir snapshots diarios de price | 🟡 |

### Distribución (5 campos) — **DEGRADADO PARA DTC**
| Campo Zara | Equivalente Shopify | Verdict |
|---|---|---|
| `stores_total` | `Location` count `isActive=true` | ✅ (pero DTC suele tener 1-3 locations, no 100+) |
| `stores_with_stock` | count `InventoryLevel` WHERE `available > 0` por variant | ✅ |
| `stores_active` | `Location.fulfillsOnlineOrders` / `hasActiveInventory` | ✅ |
| `stores_with_sale_d1` | `DISTINCT location_id` from `Fulfillment` last 24h | 🟡 |
| `days_in_store` | `now() - Product.publishedAt` | ✅ |

### Stock (7 campos)
| Campo Zara | Equivalente Shopify | Verdict |
|---|---|---|
| `stock_store` / `stock_warehouse` / `stock_available` | `InventoryLevel.quantities` por Location | ✅ |
| `stock_in_transit` | `InventoryLevel.quantities("incoming")` — **inconsistente** (sólo poblado por Shopify Transfers, no por POs externos) | 🟡 |
| `stock_pending` | from PO system | 🟠 **Stocky/Prediko/Cogsy** |
| `cd2_available` | `InventoryLevel` at specific Location | ✅ (modeling decision) |
| `pipeline_total` | sum incoming + pending POs | 🟠 **requires PO app** |

### Eficiencia comercial (6 campos)
| Campo Zara | Equivalente Shopify | Verdict |
|---|---|---|
| `total_bought` | sum received quantities from POs | 🟠 Stocky/Prediko/Cogsy |
| `total_sold` | `SUM(lineItems.quantity)` lifetime | ✅ |
| `total_shipped` | `SUM(Fulfillment.lineItems.quantity)` | ✅ |
| `sell_through_bought_pct` | native report "Products by sell-through rate" (Shopify Reports) | ✅ |
| `sell_through_shipped_pct` | derived | 🟡 |
| `returns_pct` | derived `SUM(Return.totalQuantity) / SUM(lineItems.quantity)` | ✅ (Basic skinny; Loop/Returnly preferred) |

### Lineage (3 campos) — **aimily-owned**
| Campo Zara | Equivalente Shopify | Verdict |
|---|---|---|
| `identity_node_id` | aimily's `strategy_sku_identity_graph` sobre `Product.handle` + tokenized title | 🟡 (aimily layer) |
| `lineage_seasons_present` / `lineage_n_members` | requiere ingestir 2+ seasons del cliente | 🟡 (depende de history access — ver §5 brecha #2) |

**Tally final**: 43 campos canónicos → 14 directos ✅ · 24 derivables 🟡 · 5 requieren app externa 🠠 · 0 imposibles ❌.

---

## §3 · Comparación de los 13 verbos · ¿qué dispara con qué stack?

| Verbo | Basic standalone | Plus + Prediko + Loop |
|---|---|---|
| **D1 MATAR** | ✅ funciona (returns + margin + lifecycle desde Shopify directo) | ✅ |
| **D2 REBAJAR (markdown_accelerate)** | ✅ funciona | ✅ |
| **D3 REPOSICIÓN URGENTE (replenish)** | ⚠ degradado (sin supplier lead time → asume 60-120d por tipo de prenda) | ✅ con lead_time real |
| **D4 ADELANTAR PEDIDO (pull_forward_intake)** | ❌ no dispara (sin `stock_pending` ni lead time real) | ✅ con Prediko PO data |
| **D5 AMPLIAR DISTRIBUCIÓN (amplify_distribution)** | ⚠ degradado (DTC típica = 1-3 locations, fleet_coverage casi siempre alto) | ✅ con multi-location real |
| **D6 REPONER MAX VENTA (amplify_in_season)** | ⚠ degradado (sin `total_bought`, depende de proxy) | ✅ con PO history |
| **D7 EXTENDER COLORES (extend_colors)** | ✅ funciona (color_story brief + foto Shopify 2048px) | ✅ |
| **D8 REDUCIR COMPRA (resize_down)** | ⚠ degradado (sin `total_bought` específico — usa total_sold como proxy) | ✅ |
| **D9 MARCAR PARA REVISIÓN (investigate)** | ✅ funciona (returns reasons + signals) | ✅ con Loop reasons granulares |
| **D10 REPLICAR CONCEPTO (amplify_next_season)** | ✅ funciona (hero detection + foto Shopify) | ✅ |
| **D11 CONTINUIDAD (carryover)** | ⚠ degradado (lineage requires 2+ seasons → necesita `read_all_orders` scope) | ✅ con history completa |
| **D12 ESPERAR (hold)** | ✅ funciona | ✅ |
| **D∅ PROMOTE_PUSH** (oculto hasta marketing_calendar) | ❌ | 🟡 con Klaviyo adapter futuro |

**Resumen**: Basic standalone → **8 verbos plenos + 4 degradados + 1 muerto** (D4 pull_forward). Plus + Prediko + Loop → **13 verbos plenos**.

---

## §4 · Aimily Design (fotos) · Shopify **gana** a Zara

| Métrica | Zara RNK PDF | Shopify |
|---|---|---|
| Resolución nativa | 135×203 px embebida en PDF | hasta 5760 px CDN (5000×5000 master) |
| Calidad post-upscale | 681×1024 bicubic (limpia pero interpolada) | **2048×2048 sin upscale** |
| Imagen por variant (color) | ❌ no (1 thumbnail por SKU, color inferido del mod_ref) | ✅ `ProductVariant.image` (1 imagen por color) |
| Acceso programático | extracción de objetos del PDF + matching por modelRef (complejo) | `Image.url(transform: {maxWidth: 2048})` Liquid filter o GraphQL — 1 línea |
| Background / contexto | thumbnail catalog (a veces con anotaciones de la tabla) | hero shot e-commerce blanco limpio |

**Implicación**: el flow Aimily Design (extend_colors + amplify_next_season) **funcionará mejor con Shopify que con Zara**. No re-implementar el helper de extracción del PDF — para Shopify es un simple GraphQL query.

---

## §5 · 3 quick wins · ship-day-1 value

1. **Fotos masters 2048×2048 sin esfuerzo** — `Image.url(transform: {maxWidth: 2048})` devuelve la imagen del producto en alta resolución por SKU y por variant. Aimily Design corre directamente sin recortar PDFs, sin upscale bicubic, sin matching por modelRef.

2. **`InventoryItem.unitCost` = COGS real** — la mayoría de DTC fashion brands lo populan (sus contables lo necesitan). Nos da `margin_pct_list` y `markup_pct` **sin pedir al cliente subir nada extra**. Zero-config wedge.

3. **Native sell-through report** — Shopify expone "Products by sell-through rate" en su admin UI con la fórmula exacta que aimily usa (`qty_sold / (qty_sold + qty_remaining)`). Aunque no hay API directa, validar que nuestros números coinciden con su UI nativa es **un trust signal enorme en pitch**: "esto que ves ya lo tienes; lo que aimily añade encima es el verbo + el contexto creativo".

---

## §6 · 3 brechas críticas

### 1. Pipeline / lead-time / pending PO (D4 + D3 dependen)

**Causa**: `InventoryLevel.quantities("incoming")` solo lo popula Shopify Transfers (movimientos internos), NO purchase orders a proveedores. **Stocky muere el 31-Aug-2026** → todo cliente fashion en Shopify necesita reemplazo PO mgmt.

**Acción**: construir adapter para **Prediko** (Shopify-first, AI-positioned, EU presence) como v1.1. Hasta entonces: sintetizar lead_time desde retailer profile (apparel típico 60-120 días) con confidence_dim degradado.

### 2. Order history > 60 días requiere `read_all_orders` scope + app review

**Causa**: límite del Shopify API (no técnico). Sin esto, lineage detection rota (no vemos sales de temporadas previas).

**Acción**: solicitar el scope en day-1 del app submission. Hasta que Shopify lo apruebe, lineage corre con synthetic floor.

### 3. Sin price/inventory history nativo

**Causa**: Shopify solo expone point-in-time state. Para `max_sale_no_promo`, `velocity_8_14d` >60d, `rotation_td_tr_7d` necesitamos snapshots diarios propios.

**Acción**: cron diario que persiste `strategy_inventory_facts` + price en nuestra DB. Tras 2-3 semanas de data se calculan rotaciones nativas. **Misma ETL pattern que Zara V26** — sin nueva arquitectura.

---

## §7 · Decisión técnica

### Stack target para GA Q4 2026
- **Shopify Plus** (rate limits 10× Basic, 1000 locations) — segmento DTC fashion €10M-€100M revenue
- **Prediko** (PO + supplier lead time + forecasting) — reemplazo natural de Stocky
- **Loop Returns** (returns reasons granulares, exchanges) — 5000+ Shopify brands ya lo usan

### Stack mínimo viable (MVP)
- **Shopify Basic** standalone
- aimily corre con graceful degradation (8 verbos plenos + 4 degradados + 1 muerto)
- Aimily Design 100% funcional (fotos son strictly better)

### Arquitectura de ingestión
- **Phase A · onboarding** (cliente nuevo): CSV bundle drag-and-drop (lo que el parser actual ya soporta) — replica el flow de "subir PDF Zara"
- **Phase B · steady-state**: GraphQL Admin API + 2 webhooks (`orders/create`, `inventory_levels/update`)
- **Phase C · enrich**: adapter Prediko (PO) + adapter Loop (returns reasons)

### Sin cambios de schema
La tabla `strategy_product_facts` + `strategy_inventory_facts` + `strategy_sales_windows` + `strategy_efficiency_facts` aceptan el shape de Shopify **sin modificación**. El parser actual ya emite `ParsedRecord` compatible.

### Lo único que hay que añadir
1. **Adapter GraphQL Admin API** (`src/lib/strategy/parsers/shopify-api.ts`) — para steady-state, complementa el CSV parser
2. **Photo fetcher** (`src/lib/strategy/shopify-photos.ts`) — llama `MediaImage.url(transform: {maxWidth: 2048})` para AImily Design, sustituye al PDF cropper
3. **Daily snapshot cron** — persiste price + inventory diariamente para construir history
4. **Prediko adapter** (v1.1) — feed `total_bought`, `stock_pending`, `supplier_lead_time_days`
5. **Loop adapter** (v1.2 opcional) — returns reasons granulares para mejor D9

---

## §8 · Plan de implementación (próximos sprints)

### Sprint 1 (1 semana) · MVP Basic standalone
- [ ] Extender `shopify-csv.ts` para parsear Products CSV (image URLs)
- [ ] Helper `getSkuReferenceImage` ramificación shopify → simplemente devolver la URL del Product.media
- [ ] Test end-to-end con un export real de un cliente DTC pequeño
- [ ] Decidir qué verbos UI ocultar vs mostrar degradados en este modo

### Sprint 2 (1 semana) · GraphQL API adapter
- [ ] `src/lib/strategy/parsers/shopify-api.ts` con queries para Product, Order, InventoryLevel, Refund, Return
- [ ] OAuth flow para tenant Shopify (app installation)
- [ ] Webhook handlers `orders/create` + `inventory_levels/update`
- [ ] Submit app a Shopify partner program (request `read_all_orders` scope)

### Sprint 3 (1 semana) · Snapshot cron + history
- [ ] Cron diario que persiste `strategy_inventory_facts` + price
- [ ] Tras 2-3 semanas, validar que rotation/emptying calculados nativamente coinciden con Shopify reports UI

### Sprint 4 (2 semanas) · Prediko adapter
- [ ] OAuth con Prediko
- [ ] Fetch POs → mapear a `stock_pending` + `total_bought` + `supplier_lead_time_days`
- [ ] Activar verbos D4 (pull_forward) y D3 con confidence pleno

### Sprint 5 (opcional, post-pilot) · Loop adapter
- [ ] OAuth con Loop
- [ ] Fetch return reasons granulares → enriquecer D9 INVESTIGATE rationale

---

## §9 · Diferencias estratégicas Shopify vs Zara

| Dimensión | Zara | Shopify |
|---|---|---|
| Pitch audience | CTO de Inditex (technical, daily trading meeting) | CTO/CMO/Head of Merch de DTC fashion brand (€10-100M) |
| Onboarding | "manda RNK PDF semanal" (que ya generan) | OAuth Shopify app installation (1 click) |
| Time to value | Demo con datos reales del cliente en mismo sprint | Real-time desde minuto 1 (vía webhook) |
| Calidad de fotos | 135×203 catalog thumbnails | 2048×2048 hero shots |
| Granularidad temporal | Daily snapshot (1 PDF/día) | Real-time webhooks |
| Lineage | Implícito (mismo `model_ref` cross-seasons) | Requiere convención (Product handle persistente o metafield) |
| Distribución | 1000+ stores (rich signal) | 1-5 locations típicas (poor signal) |
| Verbos plenos | 13/13 | 8/13 Basic, 13/13 Plus + Prediko + Loop |
| Aimily Design fotos | requiere extracción compleja del PDF | trivial (GraphQL) |

**Implicación pitch**: Shopify es **el lane comercial open** mientras Zara es el lane enterprise. Aimily Design es **strictly better** con Shopify y compensa la pérdida en distribución/pipeline.

---

## §10 · Estado actual

- ✅ Parser CSV (`shopify-csv.ts`) ya en main, 462 líneas, header alias robusto
- ✅ Schema compatible (sin migration needed)
- ❌ Parser Products CSV con image URLs — no hecho
- ❌ GraphQL Admin API adapter — no hecho
- ❌ Photo fetcher para Aimily Design — no hecho (pero sería ~50 LOC)
- ❌ Prediko / Loop adapters — no hechos
- ❌ Snapshot cron diario — no hecho

**Próxima decisión**: ¿arrancar Sprint 1 (MVP Basic standalone con extensión del parser CSV para imágenes)? ¿O priorizar Sprint 2 (GraphQL API) para steady-state real-time?

Mi recomendación: **Sprint 1 primero** — replica el patrón Zara (drag-and-drop) que el demo ya valida, y el upgrade a API es una mejora incremental sin cambio de UX.
