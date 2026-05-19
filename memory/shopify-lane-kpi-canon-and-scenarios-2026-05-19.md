---
name: Shopify lane · KPI canon + Shopify mapping + demo scenarios
description: Lista exhaustiva de los KPIs que el motor In-Season consume (extraídos de SkuScoreInput), matriz de cómo Shopify entrega cada uno (direct / derivado / sintético / app externa), y los 10 arquetipos canónicos que el demo del dev store debe ilustrar. Felipe 2026-05-19 — pivote desde "harness técnico bonito" a "demo metodológica que demuestra qué decisión disparamos con qué dato".
type: project
---

# Shopify lane · KPI canon + Shopify mapping + demo scenarios

> Felipe 2026-05-19 noche: «de Zara tenemos un input bastante rico, pero de Shopify no. Tienes que entender qué KPIs necesitas, si Shopify los podría tener, a lo mejor combinando datos. Y volcarlo como si fuera una demo real organizando el ranking por escenarios.»

Este doc es el "manual del demo": qué se ve, por qué, y de dónde viene cada número.

---

## §1 · KPI canon (lo que el motor consume)

Extraído verbatim de `SkuScoreInput` en `src/lib/strategy/classifiers/index.ts`. Son 40+ campos que cada classifier referencia. Los agrupo por dimensión de decisión.

### Identidad y ciclo de vida
| KPI | Tipo | Para qué lo usa el motor |
|---|---|---|
| `model_ref` | string | Join key SKU |
| `color_ref` | string | Lineage matching + EXTEND_COLORS |
| `family_code` | string | Familia (para family_score + comparativos) |
| `season_tag` | string | Para separar carryover vs new |
| `activation_date` | date | days_in_store + "recién lanzado" detection |
| `days_in_store` | int | Lifecycle stage classifier (new/ramp/peak/decay) |
| `lineage_seasons_present` | int | Carryover survivor (≥2 seasons = survivor) |

### Pricing y margen
| KPI | Tipo | Para qué lo usa |
|---|---|---|
| `pvp` | num | Precio actual realizado |
| `pvp_compare` | num | Precio "compare at" → markdown detection (compare > pvp = on_promo) |
| `markup_pct` | num | margen del proveedor |
| `margin_pct_list` | num | margen sobre PVP list |
| `cost_estimate` | num | COGS unitario |
| `on_promo` | bool | Si ya está rebajado |

### Velocity (4 ventanas + 7d revenue)
| KPI | Para qué |
|---|---|
| `velocity_d1` | demanda última 24h |
| `velocity_d2` | demanda d-2 (compara con d1 para detectar aceleración) |
| `velocity_7d` | demanda semanal — la ventana canónica del buyer |
| `velocity_8_14d` | demanda 8-14 días atrás (comparativa con 7d para tendencia) |
| `importe_7d` | facturación € última semana |
| `share_net_sales_7d` | share dentro de la familia (importance) |
| `max_sale_no_promo` | techo de demanda sin rebajar |
| `max_sale_promo` | techo de demanda con rebajas |

### Productividad / rotación
| KPI | Fórmula | Para qué |
|---|---|---|
| `rotation_td_tr_aj_7d` | velocity_7d / stock medio (tienda + tránsito) | El KPI rey de productividad |
| `rotation_td_tr_7d` | velocity_7d / stock medio sin tránsito | Rotación bruta |
| `emptying_rate` | velocity_7d / stock_store | A qué ritmo se vacía la tienda |
| `emptying_rate_available` | velocity_7d / stock_available | Ritmo de vaciado del disponible |

### Stock + distribución
| KPI | Para qué |
|---|---|
| `stock_store` | unidades en tienda |
| `stock_warehouse` | unidades en almacén |
| `stock_available` | unidades movibles (post-bloqueos) — el denominador de REPONER |
| `stock_in_transit` | pipeline en camino |
| `stock_pending` | PO comprometido todavía no llegado |
| `stock_pending_date` | fecha estimada de entrada — si < hoy = ROTURA LOGÍSTICA |
| `cd2_available` | almacén secundario |
| `pipeline_total` | stock_available + stock_in_transit + stock_pending |
| `stores_total` | flota total (denominador de cobertura) |
| `stores_with_stock` | tiendas con stock > 0 |
| `stores_active` | tiendas activas (fulfills online) |
| `stores_with_sale_d1` | tiendas que vendieron en d-1 — activación diaria |

### Eficiencia (comprado vs vendido vs enviado)
| KPI | Para qué |
|---|---|
| `total_bought` | unidades compradas al proveedor (cumulative) |
| `total_sold` | unidades vendidas cumulative |
| `total_shipped` | unidades enviadas a tienda |
| `sell_through_bought_pct` | total_sold / total_bought |
| `sell_through_shipped_pct` | total_sold / total_shipped |
| `returns_pct` | total_returned_units / total_sold |

---

## §2 · Matriz Shopify · ¿cómo entregamos cada KPI?

Leyenda: ✅ direct · 🟡 derivable (combinando data Shopify) · 🟠 requiere app externa · ❌ synthetic fallback obligatorio

### Identidad y ciclo de vida
| KPI | Verdict | Cómo |
|---|---|---|
| `model_ref` | ✅ | `ProductVariant.sku` |
| `color_ref` | ✅ | `selectedOptions[name=Color]` |
| `family_code` | ✅ | `Product.productType` (o tag/categoría) |
| `season_tag` | 🟡 | tag `season:SS26` o metafield, por convención del tenant |
| `activation_date` | ✅ | `Product.publishedAt` |
| `days_in_store` | ✅ | `now() - publishedAt` |
| `lineage_seasons_present` | ❌ | Sintético: requiere histórico cross-season. Para demo = 1 para todos, 2 para subset "carryover" marcado por tag |

### Pricing
| KPI | Verdict | Cómo |
|---|---|---|
| `pvp` | ✅ | `ProductVariant.price` |
| `pvp_compare` | ✅ | `ProductVariant.compareAtPrice` |
| `cost_estimate` | ✅ | `InventoryItem.unitCost` (en dev store lo seteamos a 45% del PVP) |
| `markup_pct` | 🟡 | derived `(price - cost) / cost` |
| `margin_pct_list` | 🟡 | derived `(price - cost) / price` |
| `on_promo` | 🟡 | derived `compareAtPrice > price` |

### Velocity
| KPI | Verdict | Cómo |
|---|---|---|
| `velocity_d1` / `d2` / `7d` / `8_14d` | 🟡 | `SUM(lineItems.quantity WHERE order.processedAt IN bucket)` ya implementado en `shopify-graphql.ts` |
| `importe_7d` | 🟡 | `SUM(lineItems.quantity × originalUnitPrice WHERE processedAt last 7d)` |
| `share_net_sales_7d` | 🟡 | post-aggregation: este SKU.importe_7d / sum(SKUs en family).importe_7d |
| `max_sale_no_promo` / `max_sale_promo` | 🟡 | requiere price history (que aimily debe persistir) — sintético en demo |

### Rotación
| KPI | Verdict | Cómo |
|---|---|---|
| `rotation_td_tr_aj_7d` | 🟡 | `velocity_7d / ((stock_available + stock_in_transit) / 2)` — el motor lo deriva si los inputs están |
| `rotation_td_tr_7d` | 🟡 | `velocity_7d / stock_available` |
| `emptying_rate` | 🟡 | `velocity_7d / stock_store` |
| `emptying_rate_available` | 🟡 | `velocity_7d / stock_available` |

### Stock + distribución
| KPI | Verdict | Cómo |
|---|---|---|
| `stock_store` | ✅ | `InventoryLevel.quantities("on_hand")` por location |
| `stock_warehouse` | 🟡 | misma fuente, separar locations tipo "warehouse" |
| `stock_available` | ✅ | `InventoryLevel.quantities("available")` |
| `stock_in_transit` | 🟡 | `quantities("incoming")` — sólo poblado si usas Shopify Transfers entre locations |
| `stock_pending` | 🠠 | Requiere Prediko / Stocky / Cogsy para PO data. Synthetic en demo |
| `stock_pending_date` | 🠠 | mismo, requiere PO mgmt app |
| `cd2_available` | 🟡 | si tienes >1 warehouse, separar por convención |
| `pipeline_total` | 🟡 | suma stock_available + in_transit + pending |
| `stores_total` | ✅ | count `Location WHERE isActive` |
| `stores_with_stock` | ✅ | count `InventoryLevel WHERE available > 0 AND location.isActive` |
| `stores_active` | ✅ | count `Location WHERE fulfillsOnlineOrders` |
| `stores_with_sale_d1` | 🟡 | `DISTINCT location_id from Fulfillment last 24h` |

### Eficiencia
| KPI | Verdict | Cómo |
|---|---|---|
| `total_bought` | 🠠 | Sólo de PO app (Prediko). Synthetic en demo = velocity_lifetime × 1.5 |
| `total_sold` | ✅ | `SUM(lineItems.quantity)` lifetime |
| `total_shipped` | 🟡 | `SUM(Fulfillment.lineItems.quantity)` |
| `sell_through_bought_pct` | 🟡 | derived; native Shopify report «Products by sell-through rate» también existe |
| `sell_through_shipped_pct` | 🟡 | derived |
| `returns_pct` | ✅ | `SUM(returnLineItem.quantity) / SUM(lineItem.quantity)` |

### Resumen tally
- ✅ direct: **15** campos
- 🟡 derivable de Shopify combinando: **21** campos
- 🠠 requiere app externa: **3** (`total_bought`, `stock_pending`, `stock_pending_date`)
- ❌ sintético inevitable: **1** (`lineage_seasons_present`)

**Conclusión**: con sólo Shopify Plus podemos servir 36 de 40 KPIs. Las 4 brechas (PO + lineage) son la oportunidad de Prediko/Loop adapters y/o synthetic floor con confidence_dim degradada.

---

## §3 · Los 10 arquetipos del demo

Cada arquetipo es un escenario real que el merch buyer ve cada lunes. El demo asigna 4-6 SKUs a cada arquetipo y manipula los signals para que el motor produzca el verdict canónico de ese caso.

### Arquetipo 1 · Recién lanzado + hero
**5 SKUs** · activation_date hace 3-5 días · vendiendo fuerte ya · stock cayendo
- Signal: `days_in_store ∈ [3,5]` · `velocity_d1 ≥ 5` · `velocity_7d ≥ 15` · `stock_available cayendo 50%`
- Verdicts esperados: AMPLIFY_DISTRIBUTION + REPLICAR_CONCEPTO (apertura temprana)
- Por qué importa: «¿abro pedido a la semana 1 o espero?» · Caro & Gallien 2010 dice abre día 1

### Arquetipo 2 · Recién lanzado + loser
**5 SKUs** · activation_date hace 3-7 días · sin tracción · stock intacto
- Signal: `days_in_store ∈ [3,7]` · `velocity_d1 = 0` · `velocity_7d ≤ 2` · `stock_available = stock inicial`
- Verdicts esperados: KILL_EARLY o INVESTIGATE
- Por qué importa: identificar mata-temprana en lugar de esperar a rebajas

### Arquetipo 3 · Reposición llega tarde
**4 SKUs** · stock_pending_date ya pasó (debió llegar) · 2-3 stores en rotura
- Signal: `stock_pending > 0` · `stock_pending_date < today` · `stores_with_stock < stores_total / 2` · velocity buena
- Verdicts esperados: REPLENISH_URGENT + bloqueo de REBAJAR
- Por qué importa: caso Bomber 5247/600 de Felipe — pipeline vencido protege de markdown erróneo

### Arquetipo 4 · Hero mid-season confirmado
**5 SKUs** · activation_date 21-45d · top 20% velocidad · share_net_sales_7d alto
- Signal: `days_in_store ∈ [21,45]` · `velocity_7d top 20%` · `stock_available cayendo` · `stores_with_stock alto`
- Verdicts: REPONER + AMPLIFY_DISTRIBUTION + EXTEND_COLORS (si hay color winner)
- Por qué importa: maximizar el éxito antes del rebote

### Arquetipo 5 · Loser mid-season
**5 SKUs** · activation_date 21-60d · velocity bottom 30% · stock high · compareAtPrice unset
- Signal: `days_in_store ∈ [21,60]` · `velocity_7d bottom 30%` · `stock_available > stock_initial × 0.7` · `compareAtPrice IS NULL`
- Verdicts: MARKDOWN_ACCELERATE Stage 1 (-25/-30%)
- Por qué importa: el ladder canónico Donnellan empieza aquí. Recomendación primer markdown.

### Arquetipo 6 · Carryover survivor
**4 SKUs** · `lineage_seasons_present ≥ 2` (synthetic via tag `carryover:true`) · still selling
- Signal: tag `carryover:true` · `days_in_store > 90` · `velocity_7d ≥ 3`
- Verdicts: MAINTAIN + monitorear · candidato a continuidad SS27
- Por qué importa: bookmark del recurrente que el merch defiende temporada a temporada

### Arquetipo 7 · Problema de devoluciones
**5 SKUs** · returns_pct > 25%
- Signal: `returns_pct ∈ [0.25, 0.45]` · velocity OK
- Verdicts: INVESTIGATE (descripción incorrecta? sizing? calidad?)
- Por qué importa: returns matan margin neto — INVESTIGATE antes de seguir empujando

### Arquetipo 8 · Color winner, brothers lagging
**5 SKUs** · misma `product_name` con 3-4 colors · 1 color hero, otros 3 mid o low
- Signal: agrupado por product_name, 1 color con velocity_7d 3× mediana de los hermanos
- Verdicts: EXTEND_COLORS (replicar el winning color en variante similar) + RESIZE_DOWN brothers
- Por qué importa: leer el color como señal del concept · evita over-buying los slow colors

### Arquetipo 9 · Stockout total
**3 SKUs** · stock_available = 0 en todos los stores · pero hubo velocity buena
- Signal: `stock_available = 0` · `velocity_7d_pre_stockout ≥ 5` · `stores_with_stock = 0`
- Verdicts: REPLENISH_URGENT + flag de demanda perdida
- Por qué importa: el coste invisible del stockout — demanda perdida que no aparece en velocity

### Arquetipo 10 · Hold (señal demasiado débil)
**4 SKUs** · activation reciente pero noise/señal indecidida
- Signal: `velocity_7d ∈ [2, 5]` · `stock_available estable` · `returns_pct < 10%`
- Verdicts: HOLD/MANTENER (esperar otra semana)
- Por qué importa: no todo merece acción — el hold es una decisión válida

**Distribución total**: 5+5+4+5+5+4+5+5+3+4 = **45 SKUs** sobre 58 aimily-SKUs disponibles. Los 13 restantes quedan "baseline" sin manipulación (señal real natural).

---

## §4 · Cómo se construye en el dev store

Para cada arquetipo, las manipulaciones API necesarias:

| Manipulación | API | Coste |
|---|---|---|
| Cambiar `publishedAt` | `productUpdate(input: { id, publishedAt })` | instant |
| Cambiar stock por location | `inventorySetQuantities(input: { name: "available", reason, referenceDocumentUri, quantities })` | instant |
| Setear `compareAtPrice` | `productVariantUpdate(input: { id, compareAtPrice })` | instant |
| Setear `cost` | `inventoryItemUpdate(id, input: { cost })` | instant |
| Tag `carryover:true` | `productUpdate(input: { tags: [...] })` | instant |
| Crear order | `orderCreate(...)` | **5/min cap** |
| Crear refund | `refundCreate(...)` | ~no cap |

**Bottleneck**: orders. Con ~10 orders por SKU × 45 SKUs = 450 orders → 90 min al 5/min cap. **Demasiado**.

**Estrategia para acelerar**: NO uniforme. Asignar orders por arquetipo con perfiles distintos:
- Arquetipo 1 (hero recién lanzado): 15 orders × 5 SKUs = 75 orders en últimos 3-5 días
- Arquetipo 2 (loser recién lanzado): 0-1 orders × 5 SKUs = 3 orders total
- Arquetipo 4 (hero mid-season): 20 orders × 5 SKUs = 100 orders en últimos 14 días
- Arquetipo 5 (loser mid-season): 1-2 orders × 5 SKUs = 7 orders
- Arquetipo 6 (carryover): 8 orders × 4 SKUs = 32 orders en 21 días
- Arquetipo 7 (returns): 10 orders × 5 SKUs = 50 orders + refundCreate 30% de cada
- Arquetipo 8 (color winner): 18 orders × 5 SKUs en winning color = 90 orders
- Arquetipos 3, 9, 10: mínimo (3-5 orders cada uno)

**Total target**: ~360 orders = 72 min seeding. Reducible con sampling:

- Cap a 250 orders total = 50 min de seeding
- Mantener priorities: heroes (1,4,8) get full volume; losers (2,5) get token; medios (3,6,9,10) get minimal

---

## §5 · UI exposure (Step 5 separate)

El demo HOY muestra `#·FOTO·MODELO·PVP·VEND 7D·STOCK·TIENDAS` en la columna izquierda + verdicts a la derecha. **Falta exponer**:

- Rotación (rotation_td_tr_aj_7d) — el KPI rey
- Days in store (lifecycle indicator)
- Returns_pct para los del arquetipo 7
- compareAtPrice / on_promo flag visualmente
- Importe 7d (revenue per SKU, no solo unidades)

Esto va en Step 5 — tocar `PdfOverlayViewer.tsx` o el `/api/strategy/runs/[runId]/skus/route.ts`.

---

## §6 · Estado de ejecución (track durante Step 4)

| Step | Estado | Run final |
|---|---|---|
| 1 — KPI canon | ✅ §1 |  |
| 2 — Shopify mapping | ✅ §2 |  |
| 3 — 10 arquetipos | ✅ §3 |  |
| 4 — Re-seed targeted | ⏳ |  |
| 5 — UI exposure | ⏳ |  |
