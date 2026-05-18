---
name: Decision tree completo · aimily In-Season · 2026-05-18
description: Árbol de decisión exhaustivo y unificado. Mapea cada input del RNK Zara → señal derivada → condición de cada decisión → output. Single source of truth para la refactorización.
type: project
---

# Decision tree completo — aimily In-Season — 2026-05-18

**Por qué existe este documento**: Felipe (2026-05-18) tras 8 horas de fixes puntuales: *"estructuralmente, esto es tener un decision tree ultra bien diseñado. No puedo ir SKU por SKU."* Tenía razón. Cada decisión vivía en su archivo, sin tabla unificada, y por eso se me escapaban interacciones (e.g., AMPLIAR DISTRIBUCIÓN sobre un SKU con cobertura justa = mala recomendación).

**Cómo se lee este documento**:
- §1 lista los inputs crudos del RNK Zara (38+ campos).
- §2 lista las señales derivadas (~55 señales) — la "capa cerebro" entre datos y decisiones.
- §3 contiene la matriz exhaustiva: 12 decisiones × 7 columnas (pregunta, inputs, señales, triggers, bloqueos, prioridad, output).
- §4 ordena las decisiones en **5 niveles de prioridad** + reglas de interacción cruzada.
- §5 define cómo se construye el stack final de outputs para un SKU.

**Cardinales que no se tocan**:
- Output unit = SKU (nunca estilo).
- Vocabulario retail / moda — sin nombres inventados ni jerga académica.
- Filosofía Zara: día 1 si datos son buenos, se actúa.

---

## §1 · Inputs crudos del RNK Zara

Cada input es un campo que el parser extrae del PDF del RNK y que el cargador trae a memoria. Listados por bucket mental del comprador.

### A. Identidad y precio comercial (10)
1. `model_ref` — código de estilo (4 dígitos + variante)
2. `color_ref` — código de colorway (3 dígitos)
3. `family_code` — familia comercial (W.A FLUIDOS LARGO 1500, etc.)
4. `product_name` — nombre comercial
5. `season_tag` — campaña (V26, I26+V26, etc.)
6. `activation_date` — primer día en tienda
7. `pvp` — precio actual
8. `pvp_compare` — precio referencia (antes de rebaja si la hay)
9. `markup_pct` — markup % al precio inicial
10. `margin_pct_list` — margen % sobre PVP actual

### B. Demanda y facturación (6)
11. `velocity_d1` — unidades vendidas ayer
12. `velocity_d2` — unidades hace 2 días
13. `velocity_7d` — unidades últimos 7 días
14. `velocity_8_14d` — unidades semana anterior (baseline trend)
15. `importe_7d` — facturación € de la semana
16. `share_net_sales_7d` — aportación a la familia (% de facturación neta)

### C. Productividad — KPIs canónicos merchandising (4)
17. `rotation_td_tr_aj_7d` — rotación 7d ajustada (tienda + tránsito)
18. `rotation_td_tr_7d` — rotación 7d cruda
19. `emptying_rate` — tasa de vaciado en tienda
20. `emptying_rate_available` — tasa de vaciado sobre disponible

### D. Capacidad / elasticidad precio (2)
21. `max_sale_no_promo` — pico de venta sin promo
22. `max_sale_promo` — pico de venta con promo

### E. Distribución (5)
23. `stores_total` — flota total
24. `stores_with_stock` — tiendas con inventario
25. `stores_active` — tiendas vendiendo
26. `stores_with_sale_d1` — tiendas con venta ayer
27. `days_in_store` — días desde activación

### F. Stock (7)
28. `stock_store` — unidades en tiendas
29. `stock_warehouse` — almacén principal (CD1)
30. `stock_available` — disponible para mover AHORA
31. `stock_in_transit` — viniendo de fábrica
32. `stock_pending` — pedido confirmado pero sin salir
33. `cd2_available` — almacén secundario
34. `pipeline_total` — agregado (transit + pending)

### G. Eficiencia comercial (6)
35. `total_bought` — comprado total
36. `total_sold` — vendido total
37. `total_shipped` — enviado total
38. `sell_through_bought_pct` — éxito del comprado
39. `sell_through_shipped_pct` — éxito del enviado
40. `returns_pct` — % devoluciones sobre vendido

### H. Lineage / estilo (3)
41. `identity_node_id` — cluster del estilo padre
42. `lineage_seasons_present` — temporadas que el estilo lleva activo
43. `lineage_n_members` — cuántos SKUs hermanos hay en el estilo (clave para solitarios)

**Total inputs: 43 campos por SKU.**

---

## §2 · Señales derivadas (capa cerebro)

Cada señal se computa de los inputs y es lo que las decisiones realmente consumen. **Una decisión nunca lee un input crudo — siempre via señal derivada**. Esto elimina lógica duplicada y hace explícita cada interpretación.

### S1 · Demanda

| Señal | Fórmula | Rango |
|---|---|---|
| `demand_score` | velocity_per_store_per_day / family.max_density | 0-1 |
| `velocity_trend` | (velocity_d1 - velocity_d2) / mean(d1, d2) | -1 a +1 (acelerando vs decelerando) |
| `revenue_demand_score` | importe_7d / family.max_importe_7d | 0-1 |
| `family_contribution` | share_net_sales_7d | 0-1 (aportación directa) |
| `rotation_health` | rotation_td_tr_aj_7d / family.max_rotation | 0-1 |
| `daily_activation_score` | stores_with_sale_d1 / stores_active | 0-1 |

### S2 · Margen

| Señal | Fórmula |
|---|---|
| `effective_margin_eur` | pvp × margin_pct × (1 − returns_pct) − reverse_logistics × returns_pct |
| `markdown_already_applied` | pvp < pvp_compare |
| `markdown_stage` | discount % brackets → 0 / 1 (-25/-30) / 2 (-40/-60) / 3 (-70+) |
| `price_elasticity_score` | (max_sale_promo / max_sale_no_promo) − 1 |
| `shipped_margin_eur` | effective_margin × sell_through_shipped_pct |
| `markdown_margin_safety_eur` | effective_margin − discount_eur del siguiente escalón |
| `is_unit_economics_negative` | effective_margin < 0 AND returns_pct ≥ 0.30 |

### S3 · Stock & cobertura (LA SECCIÓN CRÍTICA — donde tenía bugs)

| Señal | Fórmula | Notas |
|---|---|---|
| `daily_velocity` | velocity_7d / 7 | unidades/día |
| `cobertura_dias_now` | (stock_store + stock_warehouse) / daily_velocity | días aguantamos al ritmo actual |
| `cobertura_ratio_lead_time` | cobertura_dias_now / lead_time_days | <0.5 urgente, <0.1 crítico |
| `pipeline_arrival_runway_days` | pipeline_total / daily_velocity | cuándo se acaba lo del pipeline |
| `pipeline_arrival_eta_days` | (stock_in_transit / mean_transit_days) ≈ tránsito promedio | cuándo llega lo que viene |
| **`cobertura_gap_days`** | **cobertura_dias_now − pipeline_arrival_eta_days** | **>0 = HUECO de rotura entre el stock acabándose y el pipeline llegando. ESTO ES LO QUE FALTABA.** |
| `can_replenish_now` | stock_available > 0 OR cd2_available > 0 | binario — hay stock para mover |
| `is_urgent_replenish` | ratio < 0.5 **OR** cobertura_gap_days > 0 | ampliada vs v anterior |
| `is_critical_replenish` | ratio < 0.1 **OR** cobertura_gap_days > 3 | ampliada vs v anterior |
| `is_oversupplied` | stock_total / daily_velocity > 60 días | safety net para markdown |

### S4 · Distribución

| Señal | Fórmula |
|---|---|
| `distribution_breadth_score` | stores_active / stores_with_stock |
| `fleet_coverage_score` | stores_with_stock / stores_total (synthetic = max stores_with_stock del corpus si stores_total null) |
| `distribution_lift_capacity_stores` | stores_total − stores_with_stock |
| `activation_ratio_today` | stores_with_sale_d1 / stores_with_stock |
| `cd2_pool_strength` | cd2_available / pipeline_total |

### S5 · Ciclo

| Señal | Valores |
|---|---|
| `lifecycle_stage` | new (<14d), ramp, peak, decay, mature, exit, insufficient_evidence |
| `seasonal_runway_days` | días restantes en la ventana de venta natural de la temporada |
| `markdown_risk_score` | FWOC / season_weeks_remaining (capped at 1, Caro & Gallien 2012 canon) |

### S6 · Capacidad

| Señal | Fórmula |
|---|---|
| `capacity_utilization` | velocity_d1 / max_sale_no_promo |
| `capacity_headroom` | 1 − capacity_utilization |
| `promo_capacity_ceiling` | max_sale_promo (techo con descuento) |

### S7 · Canibalización & lineage (CORREGIDO POST-SOLITARIO)

| Señal | Fórmula |
|---|---|
| **`is_solitary_winner`** | **n_members === 1 AND family_contribution ≥ 0.15 AND rotation_health ≥ 0.30** |
| `color_winner_strength` | mi share / mean(other siblings' share) [null cuando solitario] |
| `share_concentration_gini` | Gini coefficient de shares entre hermanos |
| `sibling_returns_variance` | std dev de returns_pct entre hermanos |
| `cannibalization_risk_score` | velocity gap entre hermanos (existing) |

### S8 · Eficiencia comercial

| Señal | Fórmula |
|---|---|
| `efficiency_bought` | sell_through_bought_pct (vendido / comprado — éxito decisión compra) |
| `efficiency_shipped` | sell_through_shipped_pct (vendido / enviado — éxito en suelo) |
| `efficiency_dual_min` | min(bought, shipped) — el peor de los dos como gate conservador |

### S9 · Devoluciones

| Señal | Fórmula |
|---|---|
| `returns_vs_baseline_score` | returns_pct / family.weighted_returns_baseline |
| `returns_value_at_risk_eur` | total_sold × pvp × returns_pct + logística inversa |

### S10 · Continuidad / básicos

| Señal | Fórmula |
|---|---|
| `is_survivor` | lineage_seasons_present ≥ 2 AND velocity ≥ family.median AND returns OK AND no stockout |
| `continuity_strength` | weighted(seasons × rotation × aportación) — 0-1 |
| `staple_eligibility` | is_survivor AND continuity_strength ≥ 0.50 |

**Total señales derivadas: ~55. Todas son computables desde los 43 inputs + family/lineage baselines.**

---

## §3 · Matriz de las 12 decisiones

Cada decisión es una FILA. Las columnas:
- **PREGUNTA**: lo que un comprador senior se pregunta antes de decidir.
- **TRIGGERS**: condiciones (sobre señales derivadas) que disparan la decisión. AND/OR explícito.
- **BLOQUEOS**: condiciones (sobre señales o sobre otras decisiones) que la suprimen.
- **PRIORIDAD**: nivel (1-5) en el árbol — ver §4.
- **OUTPUT**: lo que el comprador hace.

---

### **D1 · MATAR** (kill)

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Hay que dejar de vender este SKU? |
| **Señales que mira** | `is_unit_economics_negative`, `lifecycle_stage`, `demand_score`, `rotation_health`, `markdown_risk_score`, `returns_vs_baseline_score`, `family_contribution`, `cobertura_dias_now` (para detectar héroe oculto por rotura) |
| **TRIGGERS** | **Trigger A (emergencia)**: `is_unit_economics_negative = true` → mata sin más. **Trigger B (combo)**: `lifecycle_stage ∈ {decay, exit}` AND `demand_score ≤ 0.20` AND `rotation_health ≤ 0.30` AND `markdown_risk_score ≥ 0.85` AND `returns_vs_baseline_score ≥ 2.0` AND `family_contribution ≤ 0.05` |
| **BLOQUEOS** | `family_contribution > 0.05` (contribuidor estructural — investiga antes de matar) **·** rotura oculta detectada (cobertura<lead_time pero velocidad cero porque stockout) |
| **Prioridad** | **Nivel 1 · Emergencia** — manda sobre todas las demás |
| **Output** | Discontinuar SKU. Marcar para no reorder. |

---

### **D2 · REBAJAR** (markdown_accelerate)

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Hay que rebajar para liberar stock antes de que muera la temporada? |
| **Señales que mira** | `markdown_risk_score`, `markdown_already_applied`, `markdown_stage`, `rotation_health`, `markdown_margin_safety_eur`, `lifecycle_stage`, `is_oversupplied` |
| **TRIGGERS** | `markdown_risk_score ≥ 0.4` (FWOC supera las semanas que quedan de temporada) **OR** `markdown_already_applied = true AND rotation_health caída última semana` (rebaja vigente que no está empujando) **OR** `is_oversupplied = true AND lifecycle_stage ∈ {decay, mature_late}` |
| **BLOQUEOS** | `markdown_margin_safety_eur < 0` (rebaja destruye economía — mejor mata) **·** `lifecycle_stage = new` (<14 días — too early) |
| **Prioridad** | **Nivel 4 · Corrección precio** — actúa sobre lo que ya no funciona |
| **Output** | Siguiente escalón canónico moda (`markdown_ladder_next_step`). **Ratchet duro — nunca atrás**. + estimación de unidades adicionales liberadas. |

---

### **D3 · REPOSICIÓN URGENTE POR ROTURA** (replenish)

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Vamos a romper stock pronto? |
| **Señales que mira** | `is_urgent_replenish`, `is_critical_replenish`, `cobertura_ratio_lead_time`, `cobertura_gap_days`, `can_replenish_now`, `pipeline_arrival_runway_days`, `returns_vs_baseline_score`, `lifecycle_stage` |
| **TRIGGERS** | `is_urgent_replenish = true` (ratio < 0.5 **OR** cobertura_gap_days > 0) |
| **BLOQUEOS** | D1 (MATAR), D2 (REBAJAR), D8 (REDUCIR COMPRA) — los tres significan "no más unidades" **·** `returns_vs_baseline_score > 2.0` (no rellenas algo defectuoso) **·** `lifecycle_stage = exit` |
| **Prioridad** | **Nivel 2 · Supply urgente** — antes que cualquier movimiento ofensivo |
| **Output** | N unidades para volver a ≥21 días de cobertura. Indica fuente (CD1 / CD2). Rationale explícita: "cobertura X días vs lead time Y → gap de Z días sin stock". |

---

### **D4 · ADELANTAR PEDIDO PENDIENTE** (pull_forward_intake)

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Merece la pena pedirle al proveedor que adelante lo pendiente? |
| **Señales que mira** | `stock_pending` (input directo — single trigger), `cobertura_dias_now`, `pipeline_arrival_eta_days`, `cobertura_gap_days`, `demand_score`, `family_contribution`, `lead_time_days` |
| **TRIGGERS** | `stock_pending > 0` AND `pipeline_arrival_eta_days > cobertura_dias_now` (= lo pendiente llega DESPUÉS de que el stock se acabe) AND (`demand_score ≥ 0.6` OR `family_contribution ≥ 0.10`) |
| **BLOQUEOS** | D1 (MATAR), D2 (REBAJAR), D8 (REDUCIR COMPRA) **·** `stock_pending = 0` (nada que adelantar) **·** `pipeline_arrival_eta_days < cobertura_dias_now` (ya llega a tiempo) |
| **Prioridad** | **Nivel 2 · Supply urgente** — junto con D3 |
| **Output** | Llamar al proveedor — adelantar ~4 semanas de demanda del pedido pendiente. |

---

### **D5 · AMPLIAR DISTRIBUCIÓN** (amplify_distribution)

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Está infra-distribuido un hero que podría capturar más demanda? |
| **Señales que mira** | `fleet_coverage_score`, `distribution_lift_capacity_stores`, `demand_score`, `family_contribution`, `can_replenish_now`, `returns_vs_baseline_score`, **`cobertura_ratio_lead_time`** (gate nuevo) |
| **TRIGGERS** | `fleet_coverage_score < 0.70` (faltan tiendas) AND (`demand_score ≥ 0.5` OR `family_contribution ≥ 0.10`) AND `can_replenish_now = true` AND `distribution_lift_capacity_stores > 0` AND `returns_vs_baseline_score ≤ 1.5` |
| **BLOQUEOS** | D1 (MATAR), D2 (REBAJAR) **·** **`cobertura_ratio_lead_time < 0.7`** (NO ampliar si el supply está justo — primero asegura cobertura) **·** D3 dispara simultáneamente (supply prima sobre expansión) |
| **Prioridad** | **Nivel 3 · Crecimiento ofensivo** — sólo cuando supply está seguro |
| **Output** | Enviar a N tiendas más, indicando fuente (CD1 / CD2). |

---

### **D6 · REPONER PARA MAXIMIZAR VENTA** (amplify_in_season)

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Hay un hero estructural que merece más unidades de las que el ritmo natural pediría? |
| **Señales que mira** | hero detection: `demand_score`, `efficiency_bought`, `velocity_rank`, `pdf_rank`, `family_velocity_ratio`, `family_contribution`. Gate adicional: `cobertura_ratio_lead_time` (nuevo). |
| **TRIGGERS** | Cualquier trigger de hero: `pdf_rank ≤ 10` **OR** `velocity_rank ≤ 10` **OR** (`demand_score ≥ 0.7` AND `efficiency_bought ≥ 0.5` AND `days_in_store ≥ 14`) **OR** `family_velocity_ratio ≥ 2.0` **OR** `family_contribution ≥ 0.20`. AND `returns_vs_baseline_score ≤ 2.5` |
| **BLOQUEOS** | D1 (MATAR), D2 (REBAJAR), D3 (REPOSICIÓN URGENTE — la urgente cubre máximo, no inflar) **·** **`cobertura_ratio_lead_time < 0.7`** (primero supply, luego ofensivo) **·** D8 (REDUCIR COMPRA) **·** `is_unit_economics_negative = true` |
| **Prioridad** | **Nivel 3 · Crecimiento ofensivo** — sólo cuando supply está seguro |
| **Output** | Comprar N unidades adicionales sobre el ritmo natural. |

---

### **D7 · EXTENDER COLORES** (extend_colors)

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Este estilo funciona como para sacarlo en colores nuevos del moodboard? |
| **Señales que mira** | `color_winner_strength`, `is_solitary_winner`, `family_contribution`, `lineage_n_members`, `lineage_n_colors`, `returns_vs_baseline_score`, brief.color_story disponible |
| **TRIGGERS** | **Camino A (multi-color)**: `color_winner_strength ≥ 2.0` AND `family_contribution ≥ 0.15` AND `lineage_n_colors < 5` AND brief.color_story tiene paleta. **Camino B (solitario heroico)**: `is_solitary_winner = true` (n_members=1 AND aportación ≥0.15 AND rotación sana) AND `returns_vs_baseline_score ≤ 1.5` AND brief.color_story tiene paleta. |
| **BLOQUEOS** | D1 (MATAR), D2 (REBAJAR) **·** brief.color_story vacío (no hay paleta que ofrecer) |
| **Prioridad** | **Nivel 3 · Crecimiento estratégico** — informa próximo desarrollo |
| **Output** | Propuesta a diseño: N nuevos colorways del moodboard (chips visuales). |

---

### **D8 · REDUCIR COMPRA** (resize_down)

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Compramos demasiado de este SKU? Bajar el pedido de próxima temporada. |
| **Señales que mira** | `efficiency_bought`, `efficiency_shipped`, `total_bought`, `lifecycle_stage`, `is_survivor` |
| **TRIGGERS** | (`efficiency_bought < 0.20` **OR** `efficiency_shipped < 0.30`) AND `total_bought > 1000` AND `lifecycle_stage ≠ new` AND `is_survivor = false` |
| **BLOQUEOS** | `is_survivor = true` (estructural — no reduces compra de un básico probado) **·** `lifecycle_stage = new` |
| **Prioridad** | **Nivel 4 · Corrección compra** |
| **Output** | Reducir 40% el pedido de próxima temporada. |

---

### **D9 · MARCAR PARA REVISIÓN** (investigate_root_cause)

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Hay señales contradictorias que no entiendo y necesito investigar antes de actuar? |
| **Señales que mira** | `returns_vs_baseline_score`, `demand_score`, `daily_activation_score`, `rotation_health`, `sibling_returns_variance`, `pdf_rank` |
| **TRIGGERS** | **Trigger A (devolución + velocidad)**: `returns_vs_baseline_score ≥ 2.0` AND `demand_score ≥ 0.6` (margin trap). **Trigger B (stocked-but-not-selling)**: `daily_activation_score < 0.3` AND `rotation_health < 0.3`. **Trigger C (anomalía entre hermanos)**: `sibling_returns_variance ≥ high_threshold`. **Trigger D (Zara-flag-only)**: `pdf_rank ≤ 10` AND `demand_score < 0.4`. |
| **BLOQUEOS** | Ninguno — es flag, no acción. Compatible con TODAS las decisiones (puede coexistir con MATAR, REBAJAR, etc. — "investiga antes de matar"). |
| **Prioridad** | **Nivel 5 · Diagnóstico** — flag, no acción operativa |
| **Output** | Flag al comprador con la causa concreta (fit / tech-pack / exposición / talla / RNK-flag-only). |

---

### **D10 · REPLICAR CONCEPTO EN NUEVO MODELO** (amplify_next_season)

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Este SKU es base conceptual de un nuevo desarrollo (silueta + material) en futuras drops? |
| **Señales que mira** | hero detection (mismas que D6) + `days_in_store` (modulador de confianza, NO gate) + `returns_vs_baseline_score` |
| **TRIGGERS** | Cualquier trigger de hero (`pdf_rank`, `velocity_rank`, `demand+ST`, `family_ratio`, `family_contribution ≥ 0.20`). **Sin gate de días** (filosofía Zara día 1). |
| **BLOQUEOS** | D1 (MATAR), D8 (REDUCIR COMPRA) **·** `returns_vs_baseline_score > 2.0` (no replicas un fallo de fit) |
| **Prioridad** | **Nivel 3 · Crecimiento estratégico** — informa próximo desarrollo |
| **Output** | Brief a diseño: silueta + material + concepto base de un modelo NUEVO. **Sin colores** (eso es D7). Confianza modulada por `days_in_store` (cap 70% si <7d, 80% si 7-13d, 88% si 14-27d, 90% si 28+). |

---

### **D11 · CONTINUIDAD / BÁSICOS** (carryover)

| Campo | Valor |
|---|---|
| **Pregunta** | ¿Es candidato a plan de básicos próxima temporada? |
| **Señales que mira** | `is_survivor`, `continuity_strength`, `staple_eligibility`, `lifecycle_stage`, `returns_vs_baseline_score` |
| **TRIGGERS** | `staple_eligibility = true` |
| **BLOQUEOS** | D1 (MATAR), D8 (REDUCIR COMPRA) — contradictorios |
| **Prioridad** | **Estado pasivo · no surface como pill** |
| **Output** | Incluir en plan de básicos. Sólo vive en data interna (Felipe 2026-05-18: no se muestra como acción visible). |

---

### **D12 · ESPERAR** (hold)

| Campo | Valor |
|---|---|
| **Pregunta** | (ninguna — es estado por defecto) |
| **Señales que mira** | `lifecycle_stage`, `confidence_data_completeness` |
| **TRIGGERS** | Ninguna otra decisión disparó AND (`lifecycle_stage = new AND days_in_store < 14` **OR** `confidence_data_completeness < 0.5`) |
| **BLOQUEOS** | Si cualquier otra decisión dispara, esto se descarta. |
| **Prioridad** | **Estado pasivo · no surface como pill** |
| **Output** | Sin acción. Re-evaluar siguiente ciclo. |

---

### **Verbo definido pero oculto del UI**

**D∅ · PROMOCIONAR** (promote_push) — no aparece en filtro hasta que exista `marketing_calendar` feed. Trigger: `demand_score < 0.5` AND `price_elasticity_score ≥ 0.5` AND marketing flag. Para Zara casi nunca dispara. Documentado por completitud.

---

## §4 · Niveles de prioridad e interacciones

Las 12 decisiones se ordenan en **5 niveles**. Las decisiones de nivel superior **se ejecutan primero** y pueden bloquear las inferiores.

```
┌──────────────────────────────────────────────────────────────────┐
│ Nivel 1 · Emergencia              D1 · MATAR                     │
│ (economía rota — manda sobre todo)                                │
└──────────────────────────────────────────────────────────────────┘
                              ↓ bloquea
┌──────────────────────────────────────────────────────────────────┐
│ Nivel 2 · Supply urgente          D3 · REPOSICIÓN URGENTE       │
│ (rotura inminente — asegura primero)  D4 · ADELANTAR PEDIDO     │
└──────────────────────────────────────────────────────────────────┘
                              ↓ bloquea ofensivos si supply justo
┌──────────────────────────────────────────────────────────────────┐
│ Nivel 3 · Crecimiento             D5 · AMPLIAR DISTRIBUCIÓN     │
│ (sólo cuando supply está seguro)  D6 · REPONER MAX VENTA        │
│                                   D7 · EXTENDER COLORES         │
│                                   D10 · REPLICAR CONCEPTO       │
└──────────────────────────────────────────────────────────────────┘
                              ↓ paralelo
┌──────────────────────────────────────────────────────────────────┐
│ Nivel 4 · Corrección              D2 · REBAJAR                  │
│ (precio / compra próxima)         D8 · REDUCIR COMPRA           │
└──────────────────────────────────────────────────────────────────┘
                              ↓ flag, compatible
┌──────────────────────────────────────────────────────────────────┐
│ Nivel 5 · Diagnóstico             D9 · MARCAR PARA REVISIÓN     │
│ (flag, no acción)                                                 │
└──────────────────────────────────────────────────────────────────┘

Pasivos (no surface UI): D11 (CONTINUIDAD), D12 (ESPERAR)
```

### Matriz de exclusión completa

Quién bloquea a quién. ✗ = bloquea. Si dos decisiones del mismo nivel pueden disparar, son compatibles (sin ✗).

|  | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **D1 MATAR** | — | — | ✗ | ✗ | ✗ | ✗ | ✗ | — | — | ✗ |
| **D2 REBAJAR** | — | — | ✗ | ✗ | ✗ | ✗ | ✗ | — | — | — |
| **D3 REPOSICIÓN URGENTE** | — | — | — | — | ✗ (cobertura<0.7) | ✗ (manda urgente) | — | — | — | — |
| **D4 ADELANTAR PEDIDO** | — | — | — | — | — | — | — | — | — | — |
| **D5 AMPLIAR DIST** | — | — | — | — | — | — | — | — | — | — |
| **D6 REPONER MAX VENTA** | — | — | — | — | — | — | — | — | — | — |
| **D7 EXTENDER COLORES** | — | — | — | — | — | — | — | — | — | — |
| **D8 REDUCIR COMPRA** | — | — | ✗ | ✗ | ✗ | ✗ | — | — | — | ✗ |
| **D9 MARCAR REVISIÓN** | — | — | — | — | — | — | — | — | — | — |
| **D10 REPLICAR CONCEPTO** | — | — | — | — | — | — | — | — | — | — |

Lectura: si dispara D1 (MATAR), bloquea D3, D4, D5, D6, D7, D10. Si dispara D3 (REPOSICIÓN URGENTE), bloquea D5 (cuando cobertura<0.7) y D6 (la urgente manda).

### Gates de cobertura cruzados (nuevo vs v anterior)

Tres decisiones NUEVAS tienen gate de cobertura para no recomendar acciones ofensivas sobre supply justo:

| Decisión | Gate de cobertura | Razón |
|---|---|---|
| D5 AMPLIAR DIST | `cobertura_ratio_lead_time ≥ 0.7` | No expandir a más tiendas si la cobertura por tienda actual es justa |
| D6 REPONER MAX VENTA | `cobertura_ratio_lead_time ≥ 0.7` | Antes de ofensivo, asegurar defensivo |
| D4 ADELANTAR PEDIDO | (no es gate, es trigger) `pipeline_arrival_eta > cobertura_dias` | Sólo adelantar si llega tarde |

---

## §5 · Construcción del stack final por SKU

Pipeline completo, multi-escenario:

```
1. Cargar inputs (43 campos RNK) + brief creativo + observación
2. Computar señales derivadas (~55)
3. Para cada SKU:
   a. Evaluar D1-D10 con thresholds permisivos (Maximizar venta — los más bajos)
      → obtener el universo completo de decisiones posibles
   b. Aplicar matriz de exclusión (§4)
   c. Aplicar modulación creativa (§8.1) — degradar MATAR a INVESTIGAR si aligned
4. Para cada uno de los 4 escenarios (§8.2):
   d. Aplicar los 3 diales del escenario (threshold/magnitude/confidence)
      → filtrar decisiones que no pasan el threshold ajustado
      → escalar magnitudes
      → escalar confianzas
   e. Construir el stack del SKU bajo ese escenario
5. Cargar locks del usuario (§8.3) — preferencias por SKU
6. Devolver al frontend:
   - 4 stacks por SKU (uno por escenario)
   - Locks del usuario
   - Plan agregado (totales, contadores)
```

### Reglas de ordenación dentro del stack

Cuando hay múltiples decisiones para un SKU, se muestran en este orden visual:
1. Emergencias (D1)
2. Supply urgente (D3, D4)
3. Crecimiento (D5, D6, D7, D10)
4. Corrección (D2, D8)
5. Diagnóstico (D9 — al final como flag)

Dentro del mismo nivel: por confianza descendente.

---

## §6 · Coverage check — ¿qué inputs del RNK están infrautilizados?

Auditoría: cada input debe ser consumido al menos por una señal derivada, y cada señal por al menos una decisión.

**Inputs sin uso actual** (post-audit):
- `on_promo` (boolean) — nunca consultado. ¿Útil? Sólo para detectar SKUs ya en promoción visible — pero `markdown_already_applied` lo cubre via pvp vs pvp_compare. ❌ **Descartable**.
- `rotation_td_tr_7d` (rotación cruda) — usamos sólo la ajustada. Cruda redundante. ❌ **Descartable**.
- `stock_in_transit` por separado — sí se consume para computar `pipeline_arrival_eta_days` (S3). ✅

**Señales sin uso por ninguna decisión** (post-audit):
- `velocity_trend` — debería alimentar D9 (marcar revisión) cuando hay tendencia muy negativa. **Falta gate**.
- `revenue_demand_score` — útil para distinguir héroe de revenue vs héroe de unidades. **Falta integrar en ordenación de hero priority**.
- `share_concentration_gini` — solo aparece en evidence, no en triggers. **Considerar D9 trigger nuevo**: gini muy alto = estilo en riesgo de monocolor sólido.

**Plan**: integrar `velocity_trend` en D9 (marcar revisión cuando trend muy negativo en ramp/peak) en el próximo build.

---

## §7 · Estado del documento

**Aprobado por Felipe**: 2026-05-18 (con instrucción "asegúrate de la ejecución del plan, sin inventar").

**Próximos pasos**:
1. Refactor del código contra esta matriz — un módulo por nivel.
2. Tests por celda: para cada (decisión, condición) un test que verifique disparo + bloqueo correctos.
3. UI: top toggle 4 escenarios + selector per-SKU + footer plan + rueda de carga.

**Cualquier cambio a una decisión se hace AQUÍ primero, luego en código. Esta matriz es la fuente de verdad.**

---

## §8 · Las 3 capas del sistema · Brief creativo + Escenarios + Locks

Las decisiones del §3 son la CAPA 1 (motor raw por SKU). Encima hay dos capas más que las modulan antes de llegar al comprador.

### §8.1 · Modulación creativa (Brief — Bucket B)

Cuando hay brief creativo cargado, modula las decisiones DEL §3 antes de aplicar los escenarios. Las reglas:

| Decisión | Cómo modula el brief |
|---|---|
| **D1 MATAR** | Si SKU aligned (`family_pivot ↑` O color ∈ `color_story`) → **degrada a D9 MARCAR PARA REVISIÓN**. Nunca matamos algo que el creative team está apostando |
| **D2 REBAJAR** | Aligned ↑ → confianza baja. Misaligned ↑ → confianza alta |
| **D5 AMPLIAR DIST** | `family_pivot ↑` → boost confianza. `family_pivot ↓` → bloqueo |
| **D6 REPONER MAX VENTA** | Mismo modulator que D5 |
| **D7 EXTENDER COLORES** | `color_story` ES la paleta propuesta. Sin brief = no dispara |
| **D8 REDUCIR COMPRA** | `family_pivot ↓` → boost. `↑` → suprimir |
| **D10 REPLICAR CONCEPTO** | Aligned → boost. La rationale cita el creative_narrative |

D3, D4, D9 son independientes del brief (supply + diagnóstico = invariantes a postura).

### §8.2 · Los 4 ESCENARIOS comerciales · gradualización 3-dial

Los escenarios NO eliminan decisiones — las **gradualizan**. Cada decisión tiene 3 diales que el escenario ajusta:

| Dial | Qué hace |
|---|---|
| **Umbral de disparo** | Más fácil / más difícil que la decisión dispare (más SKUs o menos, nunca 0) |
| **Magnitud** | Si dispara, la cantidad escala arriba o abajo |
| **Confianza** | Cuánta convicción muestra el sistema |

#### Matriz de diales por escenario × decisión

Símbolos: ▲ más fácil disparar · ▼ más difícil disparar · ─ igual al baseline · ↑ magnitud mayor · ↓ menor · = igual

| Decisión | Conservar margen | Balanceada (default) | Maximizar venta | Tu mezcla |
|---|---|---|---|---|
| **D1 MATAR** | ▲ umbral más bajo (mata SKUs marginales) · confianza ↑ | baseline | ▼ umbral más alto (solo casos extremos) · confianza ↓ | según action_mix |
| **D2 REBAJAR** | ▲ umbral más bajo (limpia stock antes) · magnitud ↑ | baseline | ▼ umbral más alto · magnitud ↓ | según action_mix |
| **D3 REPOSICIÓN URGENTE** | ─ INVARIANTE (supply, no postura) | ─ | ─ | ─ |
| **D4 ADELANTAR PEDIDO** | ─ INVARIANTE (supply) | ─ | ─ | ─ |
| **D5 AMPLIAR DIST** | ▼ umbral más alto · magnitud ↓ | baseline | ▲ umbral más bajo · magnitud ↑ | según action_mix |
| **D6 REPONER MAX VENTA** | ▼ aportación ≥ 0.30 · magnitud × 0.7 | aportación ≥ 0.20 · × 1.0 | ▲ aportación ≥ 0.10 · magnitud × 1.4 | según action_mix |
| **D7 EXTENDER COLORES** | ▼ color_winner ≥ 2.5 · propone máx 2 colores | color_winner ≥ 2.0 · propone hasta 4 | ▲ color_winner ≥ 1.5 · propone hasta 5 | según action_mix |
| **D8 REDUCIR COMPRA** | ▲ umbral más bajo (reduce más SKUs) | baseline | ▼ umbral más alto | según action_mix |
| **D9 MARCAR REVISIÓN** | ─ INVARIANTE (diagnóstico) | ─ | ─ | ─ |
| **D10 REPLICAR CONCEPTO** | ▼ umbral más alto (sólo héroes muy claros) | baseline | ▲ umbral más bajo (más sequels) | según action_mix |

**Cardinal**: ningún escenario elimina una decisión. En "Conservar margen" sigue habiendo REPONER MAX VENTA (solo en los heroes muy claros). En "Maximizar venta" sigue habiendo REBAJAR (solo en stock muerto evidente). La gradualización es orgánica.

#### Tabla numérica detallada (los thresholds reales)

```
Escenario:           Conservar   Balanceada   Maximizar   Tu mezcla
                     margen                   venta

D1 MATAR
  combo aportación ≤ 0.08        0.05         0.02         custom
  magnitud bloqueo               ─            ─            ─

D2 REBAJAR
  markdown_risk ≥    0.30        0.40         0.55         custom
  magnitud step      siguiente   siguiente    siguiente    custom
  multiplier         × 1.0       × 1.0        × 0.7        × custom

D5 AMPLIAR DIST
  fleet_coverage <   0.55        0.70         0.85         custom
  magnitud stores    × 0.7       × 1.0        × 1.4        custom

D6 REPONER MAX VENTA
  aportación ≥       0.30        0.20         0.10         custom
  family_ratio ≥     2.5×        2.0×         1.5×         custom
  magnitud units     × 0.7       × 1.0        × 1.4        custom

D7 EXTENDER COLORES
  color_winner ≥     2.5         2.0          1.5          custom
  aportación ≥       0.20        0.15         0.10         custom
  max colors prop.   2           4            5            custom

D8 REDUCIR COMPRA
  bought_pct <       0.30        0.20         0.10         custom
  shipped_pct <      0.40        0.30         0.20         custom
  multiplier         × 0.5       × 0.6        × 0.8        custom

D10 REPLICAR CONCEPTO
  aportación ≥       0.30        0.20         0.10         custom
  days_in_store ≥    14          7            1            custom
```

#### Lo que NUNCA hace el escenario

- No elimina decisiones (sigue habiendo de TODAS las acciones, solo más o menos)
- No anula los gates de supply (D3, D4 disparan según rotura, no según postura)
- No anula los flags de diagnóstico (D9 dispara según anomalías, no según postura)
- No anula la matriz de exclusión cruzada (§4 sigue rigiendo, e.g., MATAR sigue bloqueando AMPLIFY)

### §8.3 · Locks del usuario (cherry-pick per SKU)

El comprador construye su **plan final** mezclando escenarios SKU a SKU. Mecánica:

| Estado del SKU | Comportamiento |
|---|---|
| **Sin lock** | Sigue el toggle global de escenarios. Al cambiar el toggle, el stack se re-renderiza |
| **Con lock = X** | Fijado al escenario X. El toggle global no le afecta. Muestra badge "🔒 [Nombre escenario]" |

La granularidad del lock es **a nivel SKU** (no a nivel acción individual). Cuando un SKU está locked en "Maximizar venta", muestra todas las acciones del SKU bajo ese escenario.

**Persistencia**: DB. Tabla `strategy_user_sku_selections`:
```
run_id           uuid
product_fact_id  uuid
chosen_scenario  enum (conservar_margen | balanceada | maximizar_venta | tu_mezcla)
locked_by        uuid  (user_id)
locked_at        timestamp
unlocked_at      timestamp nullable (historial cuando se libera)
```

**Auto-save**: cada lock se persiste inmediatamente. Sin botón "guardar". Estilo Google Docs.

**Plan final agregado** (footer): cuenta vivo de:
- N SKUs decididos (lockeados) · M pendientes (siguen al toggle global)
- Inversión total estimada en €
- % del budget consumido
- Distribución de decisiones del plan final (X kills · Y rebajas · Z amplifies...)

---

## §9 · Rueda de carga · análisis visible

Cuando el comprador abre un run nuevo, los primeros segundos son lentos (cargar 43 KPIs × 48 SKUs + computar 55 señales + 4 escenarios). Aprovechamos esos segundos para **mostrar el análisis ocurriendo en fases visibles**, estilo aimily Studio.

### Fases que se muestran (200-400ms cada una)

```
[●○○○○○○○○○] Analizando datos del RNK Zara V26 · 48 SKUs detectados
[●●○○○○○○○○] Cargando inventario, stock, ventas, devoluciones, pipeline...
[●●●○○○○○○○] Computando rotación canónica, aportación a familia,
              cobertura efectiva, gap de pipeline...
[●●●●○○○○○○] Detectando anomalías y stockout suppression...
[●●●●●○○○○○] Evaluando las 12 decisiones de comprador por cada SKU...
[●●●●●●○○○○] Aplicando dirección creativa SS27 · paleta moodboard ·
              family pivot · narrativa...
[●●●●●●●○○○] Generando 4 escenarios comerciales · Conservar margen ·
              Balanceada · Maximizar venta · Tu mezcla...
[●●●●●●●●○○] Resolviendo exclusiones cruzadas y prioridades...
[●●●●●●●●●○] Construyendo plan final con cobertura por SKU...
[●●●●●●●●●●] Listo · 48 SKUs en 4 escenarios · plan vivo
```

### Por qué importa

El comprador SIENTE la profundidad del análisis. La animación tangibiliza lo que el sistema realmente hace en 2 segundos. No es "loading spinner indefinido" — es "teatro de la complejidad", validando ante el comprador que detrás hay rigor metodológico.

### Implementación

- Componente `LoadingWheel` con 10 fases hardcoded.
- Cada fase tiene texto + barra de progreso animada.
- La rueda se muestra desde que la página carga hasta que el API devuelve la respuesta (~1.5-2.5s).
- Si el API responde más rápido que la animación, esperamos a que la animación termine (mínimo 2s — la percepción de "trabajo serio").
- Si el API tarda más (raro), continuamos en la última fase con shimmer hasta que llegue la data.

---

## §10 · Resumen ejecutivo de la arquitectura final

```
USER LANDS ON /strategy/[tenant]/runs/[runId]/pdf-view
    ↓
[Rueda de carga §9 · 2s teatro del análisis]
    ↓
API: /api/strategy/runs/[runId]/skus
    Returns:
    - per_sku × 4 stacks (uno por escenario, §8.2)
    - user_locks (§8.3)
    - aggregate plan stats
    ↓
UI renders:
    - Top: toggle global de 4 escenarios + estado
    - Center: lista de SKUs (cada uno muestra stack del escenario activo o
              su lock si tiene)
    - Per-row: selector de escenario propio + badge si locked
    - Bottom: footer con contador del plan + budget + export
    ↓
User flow:
    1. Mueve toggle global → ve cómo cambian los SKUs
    2. Para cada SKU que decide: click selector → escoge escenario → lock
    3. Auto-save inmediato a DB
    4. Footer actualiza en vivo
    5. Cuando todos lockeados → export plan final
```

