---
name: Handoff · método case-by-case (Felipe shadowing)
description: Protocolo de trabajo SKU por SKU. Felipe enseña, Claude codifica las reglas + tests. Único modo en que el sistema realmente piensa como comprador senior.
type: project
---

# Handoff · método case-by-case · 2026-05-18

**Para la siguiente ventana de contexto**: lee esto entero antes de hacer nada.

---

## El problema que estamos resolviendo

Claude ha pasado horas:
- Leyendo libros de retail buying
- Diseñando especs de árbol de decisión
- Implementando 12 verbos, 4 escenarios, modulación 3-dial, locks per-SKU, etc.

Felipe sigue encontrando errores en cada SKU. **Diagnóstico**: el conocimiento de comprador senior es TÁCITO. Los libros enseñan los frameworks pero NO el juicio. Cada threshold inventado deductivamente está mal porque no responde a la realidad operativa.

**Decisión Felipe 2026-05-18**: cambiar de método. Trabajar **case-by-case** — Felipe enseña SKU por SKU, Claude captura cada lección como (a) regla dura en código y (b) test de regresión que rompe si el sistema vuelve a meter la pata.

---

## Reglas del método

### 1 · NO inventar thresholds
Si Felipe no ha validado un umbral concreto, **no lo metes en código**. Los thresholds canónicos que tengo hoy (0.50 éxito enviado, 0.30 markdown, etc.) son los que Felipe ha validado en casos concretos.

### 2 · Cada caso = regla + test
Cuando Felipe muestra un SKU que el sistema decide mal:
1. Repite los datos en tus palabras → demuestra que entiendes
2. Articula la regla en mis palabras → Felipe valida / corrige
3. **No saltas a código hasta que Felipe diga sí**
4. Codifica la regla en el archivo correcto (modulator, appender, exclusion rules)
5. Escribe un test que carga el SKU real y verifica que el resultado es correcto
6. Re-ejecuta el orchestrator del run
7. Commiteas con mensaje que incluye: caso, regla, archivo, test

### 3 · El test es CANARIO permanente
El test queda en `scripts/test-sku-*.ts` y debe pasar siempre. Si alguien rompe la regla en el futuro, el test falla. Felipe puede pedir "corre los canarios" en cualquier momento.

### 4 · No reaprender lo aprendido
Si Felipe ya enseñó una regla en un caso anterior, NO la re-deduzcas. Léelas en el historial de commits + tests. Cuando un nuevo caso aparezca, **primero comprueba si alguna regla existente lo cubre**.

### 5 · Brief, sin defensiva
Felipe está exhausto. No apologices. No prometas. Solo (a) entiende el caso, (b) propón la regla, (c) implementa, (d) verifica. La validación es el test, no las palabras.

---

## Casos resueltos (que NO se deben olvidar)

Cada caso es un commit + un test en `scripts/test-sku-*.ts`. La siguiente ventana debe respetar las reglas que ya están vivas.

### Caso #3 · Grandad Collar 4786 166 401 — REPLICAR CONCEPTO invariante (2026-05-18)

**Pregunta de Felipe**: "En Conservar margen el modelo 1 no propone replicar concepto. Replicar concepto NO tiene efecto sobre el margen — debería aparecer."

**Lección**: la postura comercial (Conservar/Balanceada/Maximizar) regula la inversión PRESENTE en la temporada en curso. Las acciones que solo afectan al desarrollo FUTURO (brief a diseño, próximas drops) deben ser invariantes de escenario.

**Reglas**:
1. **D10 REPLICAR CONCEPTO EN NUEVO MODELO es invariante de escenario.** Si dispara en Balanceada, dispara también en Conservar margen y en Maximizar venta — **mismo trigger, mismos SKUs, misma confianza**.
2. La invariancia se logra en `passesScenarioThreshold` con early-return junto a replenish/pull_forward/investigate.
3. `modulateConfidence` ya no tiene case para `amplify_next_season` (cae al default = 1.0).
4. `confidence_modifier.replicate` queda a `1.0` en los 3 escenarios (letra muerta documentada, refleja la regla).
5. Los thresholds `replicate_contribution_min` + `replicate_days_in_store_min` quedan definidos en `scenario-diales.ts` pero NO se consumen (letra muerta auditable — pueden reactivarse si la regla cambia).

**Aplicado al Grandad Collar (aportación 0.18, días en tienda 21)**:
- Antes: aparecía en Balanceada/Maximizar; desaparecía en Conservar (umbral antiguo 0.30).
- Ahora: aparece en los 3 escenarios con confianza 0.78 invariante.

**Archivos tocados**:
- `src/lib/strategy/scenario-modulator.ts`: `amplify_next_season` añadido al early-return de invariantes en `passesScenarioThreshold`; eliminado el case del switch; eliminado el case en `modulateConfidence`.
- `src/lib/strategy/scenario-diales.ts`: `confidence_modifier.replicate` puesto a 1.0 en Conservar y Maximizar; docstring del módulo actualizada con D10 en la lista de invariantes.
- `scripts/test-sku-grandad-replicate-invariant.ts`: test canario 7/7 passing (3 presencia + 3 confianza + 1 umbral antiguo ignorado).

**Verificación**: `DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/test-sku-grandad-replicate-invariant.ts` → 7/7 passing. Tests previos (bomber-5247, bomber-5247-magnitudes) intactos.

**Cómo extender la regla a otras acciones**: si Felipe valida que otra acción solo afecta a desarrollo futuro y NO compromete budget/caja de la temporada en curso, candidata a invariante (mismo patrón: early-return + sin case en modulateConfidence).

---

### Caso #2 · Bomber 5247/600 — magnitud de supply se gradualiza (2026-05-18)

**Pregunta de Felipe**: "Adelantas 4.713 unidades. ¿De dónde sale? ¿En MAXIMIZAR adelantarías lo mismo que en CONSERVAR?"

**Lección**: las decisiones de supply (ADELANTAR PEDIDO, REPONER) **NO son invariantes en magnitud por escenario**. El DISPARO (rotura logística manda) puede ser invariante, pero **CUÁNTO comprar/adelantar SÍ se gradualiza**.

**Reglas**:
1. `pull_forward_intake.recommended_units` se ajusta por escenario:
   - Conservar margen: `min(pending, velocity_7d × 2)` (2 semanas — prudente con caja)
   - Balanceada: `min(pending, velocity_7d × 4)` (4 semanas — fórmula base)
   - Maximizar venta: `pending entero` (sin cap — adelantar TODO)
2. `replenish.recommended_units` se ajusta por escenario via `target_cover_days`:
   - Conservar: 14 días cobertura objetivo
   - Balanceada: 21 días (actual)
   - Maximizar: 30 días (colchón amplio)
3. Las rationales se reescriben en el modulator para reflejar la magnitud (no quedarse con la del baseline).

**Aplicado al Bomber**:
- Pending 38.000, velocity_7d 3.957 → Conservar **7.914**, Balanceada **15.828**, Maximizar **38.000**.

**Archivos tocados**:
- `src/lib/strategy/scenario-diales.ts`: añadidos `pull_forward_weeks_of_cover` (Infinity en Maximizar) + `replenish_target_cover_days` al magnitude dial
- `src/lib/strategy/sku-verdict-resolver.ts`: evidence enriquecido con `_raw_velocity_per_day`, `_raw_pipeline_total`, `_raw_lead_time_days`, `_raw_target_rotation_days` para replenish (pull_forward ya tenía los raw)
- `src/lib/strategy/scenario-modulator.ts`: `modulateMagnitude` recalcula recommended_units para pull_forward + replenish según escenario, y reescribe rationale de pull_forward
- `scripts/test-sku-bomber-5247-magnitudes.ts`: test 4/4 passing

**Verificación**: `DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/test-sku-bomber-5247-magnitudes.ts` → 4/4 passing.

---

### Caso #1 · Bomber Jacket 5247/600 (2026-05-18)

**Datos**: éxito enviado 63.6%, éxito comprado 18.2%, stock_pending 38.000 con fecha 2026-05-16 (vencida), total_bought 55.122.

**Error del sistema (antes)**: proponía REBAJAR + REDUCIR COMPRA. Razón: confiaba en éxito_comprado bajo (18.2%) sin ver que era artefacto de compra inflada mid-season.

**Reglas extraídas**:
1. **éxito_enviado es la señal PRIMARIA de hero**, no éxito_comprado. El éxito comprado se distorsiona cuando la compra se infla. El enviado refleja la realidad del piso.
2. **Rotación baja en tienda NO es señal negativa si hay pipeline pendiente con fecha vencida**. La rotación baja es ARTEFACTO logístico, no falta de demanda.
3. **REBAJAR está bloqueado si éxito_enviado ≥ 50%** (invariante de escenario).
4. **REDUCIR COMPRA está bloqueado si éxito_enviado ≥ 50%** (invariante de escenario).
5. **Pipeline vencido (stock_pending_date < hoy) → ROTURA LOGÍSTICA**. Bypassa todos los thresholds normales de ADELANTAR PEDIDO PENDIENTE. Confianza máxima.

**Archivos tocados**:
- `src/lib/strategy/classifiers/index.ts`: SkuScoreInput.stock_pending_date, SkuScore.is_logistic_rupture + logistic_rupture_days_overdue, computación en scoreSku, persistencia en v2_signals
- `src/lib/strategy/recommend.ts`: bloqueo de markdown + resize_down si shipped_pct ≥ 0.50
- `src/lib/strategy/sku-verdict-resolver.ts`: appendAmplifyWinnerAction acepta sell_through_shipped_pct como trigger; appendPullForwardIntakeAction bypassa thresholds si is_logistic_rupture
- `src/app/api/strategy/runs/[runId]/skus/route.ts`: applyExclusionRules con bloqueo cardinal por shipped_pct ≥ 0.50 o rotura logística; wire is_logistic_rupture al pull_forward caller
- `scripts/test-sku-bomber-5247.ts`: test de regresión (5/5 passing)

**Verificación**: `DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/test-sku-bomber-5247.ts` → 5/5 passing.

---

## Cómo seguir cuando Felipe muestra el próximo SKU

1. Pídele el SKU concreto (model_ref + color).
2. Carga sus datos reales:
```sql
SELECT p.*, ef.*, inv.*, s.classifier_traces->'v2_signals' as v2
FROM strategy_product_facts p
LEFT JOIN strategy_efficiency_facts ef ON ef.product_fact_id = p.id
LEFT JOIN strategy_inventory_facts inv ON inv.product_fact_id = p.id
LEFT JOIN strategy_sku_scores s ON s.product_fact_id = p.id AND s.run_id = '0c2ed3e9-cef4-4107-abea-c01535d885e3'
WHERE p.model_ref = '<X>' AND p.color_ref = '<Y>';
```
3. Articula en tus palabras qué propone el sistema y qué Felipe ve mal.
4. Pregunta cuál sería la decisión correcta y POR QUÉ.
5. Extrae 3-6 reglas. Felipe valida o corrige.
6. Implementa.
7. Test de regresión.
8. Re-ejecutar V26.
9. Commit con título `case(N): <SKU> · <regla principal>`.
10. Update este handoff doc con la sección del caso.

---

## Tooling existente que ayuda

- **scripts/reexecute-strategy-run.ts**: re-ejecuta un run dado su ID.
- **mcp__supabase__execute_sql**: queries directas a producción.
- **DB**: tenant aimily-internal (id `60105796-ea66-4355-b904-e10296436ff9`), run V26 (`0c2ed3e9-cef4-4107-abea-c01535d885e3`).
- **Spec**: `memory/decision-tree_aimily-in-season-2026-05-18.md` (lectura, no escritura — los cambios suben aquí pero la fuente operativa son los tests).

---

## Lo que NO se debe hacer en la nueva ventana

- ❌ Ir SKU por SKU corriendo el sistema entero — perder horas
- ❌ Inventar nuevos thresholds sin caso real validado
- ❌ Cambiar arquitectura sin que Felipe lo pida
- ❌ Apologizar / prometer / decir "ahora sí entendí"
- ❌ Hacer auditorías generales
- ❌ Saltar a código antes de confirmar el caso con Felipe

## Lo que SÍ se debe hacer

- ✅ Escuchar el caso
- ✅ Repetir en mis palabras los datos clave
- ✅ Extraer reglas concretas y validarlas
- ✅ Implementar + test + verificar
- ✅ Documentar el caso aquí
- ✅ Brief, sin fluff
