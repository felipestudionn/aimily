---
name: Mapa de decisión v2 — aimily In-Season — 2026-05-18
description: Reescritura del mapa decisor en castellano puro de retail/moda. Los 10 ángulos de lectura del SKU consumiendo todo el dato disponible, alimentando las 12 decisiones de comprador senior.
type: project
---

# Mapa de decisión v2 — aimily In-Season — 2026-05-18

**Audiencia**: comprador senior / merchandiser / director comercial. Cualquier término aquí debe ser reconocible al instante. Si necesita glosario, está mal escrito.

**Spec original (eliminado)**: el v1 implícito en código tenía 9 datos consumidos de 33 disponibles. Felipe (2026-05-18): "no puedo dejar información encima de la mesa, es clave para saber si algo tiene sentido o no". Este documento es la respuesta: aprovechar **todo** el dato del RNK de Zara, leerlo con criterio de comprador senior.

**Regla cardinal (no se toca)**: el output del sistema es a nivel **SKU**, nunca a nivel estilo. Un SKU ganador puede convivir con SKUs hermanos perdedores dentro del mismo estilo (ver `memory/feedback_aimily-output-unit-is-sku.md`).

---

## §1 · El dato que entra — 38+ campos por SKU

Organizados como los miraría un comprador, no como los organiza la base de datos. Cada bloque es un ángulo distinto que pesa en la decisión.

### Identidad y precio comercial (7)
| Campo | Qué es |
|---|---|
| modelo (model_ref) | Código del estilo |
| color (color_ref) | Código del colorway |
| familia | Familia comercial Zara (e.g., W.A FLUIDOS LARGO – 1500) |
| PVP | Precio de venta actual |
| PVP referencia | Precio antes de rebaja (si hay) |
| markup % | Margen al precio inicial |
| margen % lista | Margen actual sobre el PVP actual |

### Fuerza de demanda (5)
| Campo | Qué es |
|---|---|
| venta ayer | Unidades vendidas ayer |
| venta antesdeayer | Unidades hace 2 días — sirve para ver tendencia |
| venta 7 días | Acumulado semana |
| venta semana anterior (8-14d) | Acumulado semana anterior — base de comparación |
| importe (€) | Facturación por ventana |

### Productividad — los KPIs canónicos de merchandising (4)
| Campo | Qué es |
|---|---|
| rotación 7d ajustada (tienda+tránsito) | El indicador canónico de productividad del stock |
| rotación 7d cruda | Sin ajuste por tránsito |
| tasa de vaciado | % de tiendas que se quedan sin stock en el periodo |
| tasa de vaciado disponible | Sobre lo que estaba disponible |

### Salud de distribución (5)
| Campo | Qué es |
|---|---|
| tiendas totales | Flota total |
| tiendas con stock | Las que llevan unidades |
| tiendas activas | Las que están vendiendo |
| tiendas con venta ayer | Las que hicieron al menos una venta ayer |
| días en tienda | Desde activación |

### Posición de stock (7)
| Campo | Qué es |
|---|---|
| stock en tienda | Unidades físicamente en tienda |
| stock en almacén (CD1) | Almacén principal |
| stock disponible | Lo que puedo mover **ahora mismo** |
| stock en tránsito | Lo que ya viene en camino de fábrica |
| stock pendiente | Pedido confirmado, todavía no salido |
| almacén secundario (CD2) | Stock pool alternativo |
| pipeline total | Suma agregada (tránsito + pendiente) |

### Capacidad y elasticidad a precio (2)
| Campo | Qué es |
|---|---|
| máximo de venta sin promo | Pico orgánico (día más fuerte sin descuento) |
| máximo de venta con promo | Pico con descuento — la diferencia muestra cuánto empuja la rebaja |

### Eficiencia comercial (5)
| Campo | Qué es |
|---|---|
| comprado total | Total comprado en el ciclo |
| vendido total | Total vendido |
| enviado total | Lo que ha salido de almacén a tienda |
| éxito del comprado (%) | vendido ÷ comprado |
| éxito del enviado (%) | vendido ÷ enviado |

### Devoluciones (1)
| Campo | Qué es |
|---|---|
| devoluciones (%) | Tasa sobre vendido |

### Estilo y continuidad (2)
| Campo | Qué es |
|---|---|
| estilo (lineage) | Cluster del estilo padre del SKU |
| temporadas que lleva activo | Cuántas temporadas el estilo lleva vivo |

### Peso estratégico (1)
| Campo | Qué es |
|---|---|
| aportación | % de la facturación neta de la familia que representa este SKU |

### Contexto temporal (2)
| Campo | Qué es |
|---|---|
| temporada (season_tag) | A qué campaña pertenece |
| fecha de activación | Primer día en tienda |

---

## §2 · Los 10 ángulos de lectura del SKU

Cada ángulo responde **una pregunta concreta de comprador** consumiendo todo el dato relevante para esa pregunta. NO son cajas negras — la pregunta y las señales que saca son visibles al usuario en cada decisión.

### 1. Demanda
**Pregunta**: ¿Esto vende, viene de subida o bajada, y pesa para su familia?

**Datos que mira**: ventas (ayer, 7d, semana anterior), importe €, aportación a familia, rotación 7d ajustada, tiendas con venta ayer vs activas, días en tienda, tiendas activas, baseline de la familia.

**Señales que saca**:
- *Demanda relativa* (vs la media de su familia)
- *Tendencia* (acelerando vs decelerando, según venta ayer vs antesdeayer)
- *Peso por facturación* (no solo unidades — un SKU caro de €120 con 50 unidades puede pesar más que uno de €30 con 200)
- *Aportación a familia* (estructuralmente importante o accesorio)
- *Rotación sana* (vs media de su familia)
- *Activación diaria* (de las tiendas que lo tienen, ¿cuántas lo vendieron ayer)

### 2. Margen
**Pregunta**: ¿Esto gana dinero por unidad, incluyendo devoluciones, descuento aplicado y posible elasticidad?

**Datos que mira**: PVP, PVP referencia, markup, margen lista, devoluciones, máximos con/sin promo, enviado, vendido, éxito del enviado.

**Señales que saca**:
- *Margen efectivo* (PVP × margen × (1 − devoluciones) − coste de logística inversa)
- *¿Ya está rebajado?* (PVP < PVP referencia)
- *Escalón de rebaja actual* (0/1/2/3, según % de descuento)
- *Elasticidad al precio* (cuánto más vende con promo vs sin promo)
- *Precio mínimo viable* (el coste donde la rebaja destruye economía)
- *Margen real sobre piso* (margen efectivo × éxito del enviado — lo que el suelo entrega de verdad)

### 3. Techo de demanda
**Pregunta**: ¿Está saturado o tiene recorrido?

**Datos que mira**: venta ayer, máximo sin promo, máximo con promo, tiendas con venta vs activas, tiendas totales.

**Señales que saca**:
- *Utilización de capacidad* (venta ayer / máximo sin promo)
- *Espacio que queda* (1 − utilización)
- *Techo con promo* (cuánto más vende cuando entra en oferta)
- *Recorrido en distribución* (tiendas que faltan por activar / tiendas totales)

### 4. Agotamiento
**Pregunta**: ¿La velocidad observada es la real, o está suprimida porque las tiendas se quedaron sin stock?

**Datos que mira**: tasa de vaciado, tasa de vaciado disponible, stock en tienda, stock disponible, tiendas con stock vs activas vs con venta ayer, pipeline total, venta 7d.

**Señales que saca**:
- *Riesgo de rotura* (agotamiento real)
- *Velocidad ajustada por rotura* (lo que vendería si no se hubiera agotado)
- *¿Puedo reponer ahora?* (¿hay stock disponible o en CD2?)
- *Plazo de pipeline* (cuántos días tarda en llegar lo que viene)
- *Activación de hoy* (tiendas con venta ayer ÷ tiendas con stock — si baja, es que está fuera del lineal o roto en tienda)

### 5. Canibalización
**Pregunta**: ¿Hay un color/variante dentro del estilo que está canibalizando a los hermanos, o es una distribución sana?

**Datos que mira**: ventas, aportación, devoluciones y tasa de vaciado de los SKUs hermanos del mismo estilo.

**Señales que saca**:
- *Riesgo de canibalización* (huecos grandes de velocidad entre hermanos)
- *Concentración de aportación* (¿un colorway se lleva el 80% de la familia?)
- *Fuerza del color ganador* (cuánto destaca el #1 sobre la media — para decidir si tiene sentido extender colores)
- *Anomalía de devoluciones* (un hermano que devuelve mucho más que los demás)

### 6. Ciclo de vida
**Pregunta**: ¿En qué fase está este SKU?

**Datos que mira**: días en tienda, tendencia de ventas (ayer vs antesdeayer, 7d vs semana anterior), éxito del comprado, éxito del enviado, rotación 7d ajustada, pipeline total, importe.

**Señales que saca**:
- *Fase* (nuevo, en rampa, en plateau, maduro, en declive, salida, datos insuficientes)
- *Posición en la curva* (% de la ventana de temporada usado)
- *Rotación subiendo o bajando esta semana*
- *Doble lectura de eficiencia* (éxito del comprado para evaluar la decisión de compra; éxito del enviado para evaluar lo que está pasando en tienda)

### 7. Cobertura
**Pregunta**: ¿Está en suficientes tiendas? ¿Cuánta flota queda?

**Datos que mira**: tiendas totales, con stock, activas, con venta ayer, stock disponible, CD2 disponible.

**Señales que saca**:
- *Amplitud de distribución* (activas ÷ con stock)
- *Cobertura de flota* (con stock ÷ totales)
- *Activación diaria* (con venta ayer ÷ activas)
- *Capacidad de ampliar cobertura* (tiendas que faltan × stock disponible por tienda)
- *Fuerza del CD2* (almacén secundario disponible vs pipeline)

### 8. Riesgo de rebaja
**Pregunta**: ¿Hay que rebajar? ¿En qué escalón estoy y cuál es el siguiente? ¿Cuántas unidades libera la rebaja y sigue ganando dinero?

**Datos que mira**: pipeline total, venta 7d, margen efectivo, fase del ciclo, rotación 7d ajustada, PVP referencia, máximos con/sin promo, semanas restantes de temporada.

**Señales que saca**:
- *Riesgo de rebaja* (semanas de cobertura ÷ semanas restantes de temporada — si pasa de 1, no llegas a vender el stock al ritmo actual)
- *Caída de rotación* (ciclo en declive + rotación cayendo)
- *Estimación de empuje* (cuántas unidades adicionales libera la rebaja, sacado del histórico promo vs no promo)
- *Siguiente escalón* (actual → siguiente, escalón canónico moda: -25/-30 → -40/-60 → -70+, **prohibido bajar de escalón**)
- *Margen post-rebaja* (¿la rebaja sigue dejando margen positivo o ya quemas?)

### 9. Devoluciones
**Pregunta**: ¿Las devoluciones de este SKU son normales para su familia o son anómalas?

**Datos que mira**: devoluciones, devoluciones medias de la familia, enviado total, vendido total, margen efectivo.

**Señales que saca**:
- *Tasa absoluta* (devoluciones %)
- *Tasa relativa a la familia* (este SKU ÷ media familia — si >2× hay un problema específico)
- *Euros en juego* (vendido × PVP × devoluciones − ahorros por logística inversa)
- *Economía unitaria rota* (margen efectivo negativo + devoluciones altas — kill regardless de velocidad)

### 10. Continuidad
**Pregunta**: ¿Este SKU es candidato a continuar próxima temporada como básico/staple?

**Datos que mira**: temporadas que lleva activo, rotación a lo largo de las temporadas, aportación, tasa de vaciado, devoluciones, fase del ciclo.

**Señales que saca**:
- *¿Es superviviente?* (≥2 temporadas + rotación sana + devoluciones normales + sin rotura)
- *Fuerza de continuidad* (temporadas activas × rotación × aportación)
- *Estabilidad del estilo* (varianza de velocidad entre temporadas — ¿predecible o irregular?)
- *Elegible para básico* (la familia admite la categoría de "fondo de armario" + el SKU lo cumple)

---

## §3 · Las 12 decisiones — cuándo dispara cada una

Cada decisión es **un verbo concreto** que el comprador puede ejecutar el lunes por la mañana. Las condiciones de disparo están escritas en lenguaje retail. Si una condición no se cumple, la decisión no se propone — no inventamos.

### Esta semana — urgentes

**1. MATAR**
- *Cuándo*: o bien la economía unitaria está rota (margen negativo + devoluciones altas), o se cumplen **todas** estas a la vez: ciclo en declive/salida, demanda baja, rotación muy baja, riesgo de rebaja alto, devoluciones ≥2× la media de la familia, **aportación a la familia ≤5%**, y el riesgo de rotura es bajo (si no, podría ser un héroe oculto por agotamiento).
- *Owner*: Comprador.
- *Six Rights*: Right Product.
- *Output*: discontinuar.

**2. REBAJAR** (escalón duro, nunca para atrás)
- *Cuándo*: riesgo de rebaja ≥0.4 **o** ya hay rebaja aplicada **+** la rotación cae. Bloqueado si la rebaja destruye economía (margen post-rebaja <0).
- *Owner*: Comprador + Merchandiser.
- *Six Rights*: Right Price + Right Time.
- *Output*: siguiente escalón (-25→-40, -40→-60, -60→-70). **Nunca volver al escalón anterior.** % concreto + estimación de unidades adicionales que libera.

**3. AMPLIAR DISTRIBUCIÓN**
- *Cuándo*: la cobertura de flota es <70% (le faltan tiendas), demanda sólida, hay stock disponible para mandar, las devoluciones están dentro de lo normal.
- *Owner*: Comprador + Supply Chain.
- *Six Rights*: Right Place.
- *Output*: ampliar a N tiendas más, desde almacén principal o CD2.

**4. ADELANTAR PEDIDO PENDIENTE**
- *Cuándo*: riesgo de rotura alto, hay stock pendiente (todavía no en tránsito), demanda sólida, el pipeline actual tarda >2 semanas en llegar al ritmo de venta.
- *Owner*: Comprador + Supply Chain.
- *Six Rights*: Right Time.
- *Output*: adelantar el pedido pendiente — N unidades.

### Este mes — tácticas

**5. REPONER POR ROTURA DE STOCK**
- *Cuándo*: o bien riesgo de rotura medio/alto, o bien rotación canónica sana (≥0.7 vs familia) + cobertura adecuada. Hay stock disponible para reponer. Devoluciones normales.
- *Owner*: Comprador + Merchandiser.
- *Six Rights*: Right Quantity.
- *Output*: comprar **N unidades adicionales**. Solo agregado — la distribución por tienda no es nuestro problema, la hace el allocator de Zara.

**6. REDUCIR COMPRA (próxima temporada)**
- *Cuándo*: éxito del comprado <20% **o** éxito del enviado <30%, comprado >1.000 unidades, ciclo distinto de "nuevo", no es un superviviente.
- *Owner*: Comprador.
- *Six Rights*: Right Quantity.
- *Output*: reducir el pedido de próxima temporada un 40%.

**7. MARCAR PARA REVISIÓN**
- *Cuándo*: señales contradictorias. Por ejemplo: devoluciones altas + velocidad alta; o **stock muy distribuido pero sin venta ayer + rotación baja** (algo está mal en exposición/talla/precio); o un hermano del estilo devuelve mucho más que el resto; o Zara lo marca en top 10 del RNK pero las métricas internas no lo confirman.
- *Owner*: Comprador.
- *Six Rights*: (es un flag, no encaja en un Six Right).
- *Output*: motivo concreto a investigar (fit, tech-pack, exposición, talla).

**8. REPONER PARA MAXIMIZAR LA VENTA** (anteriormente "amplify in season")
- *Cuándo*: o bien es héroe confirmado (top 10 del RNK + demanda fuerte + rotación sana + aportación ≥10% + activación diaria buena), o bien es héroe oculto por agotamiento (rotura alta + rotación que era sana antes del agotamiento), o bien es estructural (aportación ≥20% aunque no esté en velocidad-top). Bloqueado si la economía unitaria está rota o devoluciones ≥2.5× la familia.
- *Owner*: Comprador + Merchandiser.
- *Six Rights*: Right Quantity + Right Time.
- *Output*: pedir más unidades de **este SKU en su color actual** — el verbo va sobre la referencia tal cual, sin tocar el surtido cromático.

### Próxima temporada — estratégicas

**9. REPLICAR ESTILO PRÓXIMA TEMPORADA**
- *Cuándo*: mismas condiciones que "Reponer para maximizar la venta" + **el SKU lleva ≥28 días en tienda** (4 semanas de validación, mínimo razonable para comprometer el ciclo de diseño próxima temporada).
- *Owner*: Comprador + Diseño.
- *Six Rights*: Right Product (rango próxima temporada).
- *Output*: brief estructurado a diseño — silueta + materiales + 2-3 colores secuela (con sus hex) sacados del moodboard. Enriquece la rationale con la fuerza de continuidad si el estilo lleva varias temporadas.

**10. EXTENDER COLORES**
- *Cuándo*: el SKU es el ganador limpio de color dentro de su estilo (destaca ≥3× sobre la media de sus hermanos), aporta ≥15% a la familia (es estructuralmente importante), el estilo tiene menos de 5 colores actualmente, y hay un brief creativo con paleta cargada.
- *Owner*: Comprador + Diseño.
- *Six Rights*: Right Product (extensión de paleta).
- *Output*: propuesta a diseño — **nuevos colores del moodboard** para este estilo. El color ganador queda como ancla mencionada en texto; los chips visibles son los colores **nuevos** propuestos.

**11. CONTINUIDAD / BÁSICOS**
- *Cuándo*: es superviviente probado, o tiene fuerza de continuidad alta + estilo estable entre temporadas, o la familia es categoría de fondo de armario + ciclo maduro/plateau + devoluciones normales.
- *Owner*: Comprador + Merchandiser.
- *Six Rights*: Right Product.
- *Output*: incluir en el plan de básicos próxima temporada.

### Fallback

**12. ESPERAR**
- *Cuándo*: ninguna otra decisión se ha disparado **+** o bien es nuevo (<14 días) o no hay evidencia suficiente. Si en los primeros días la activación diaria es alta, podemos promover antes de los 14 días sin esperar.
- *Owner*: ninguno (re-evaluar al ciclo siguiente).
- *UI*: oculto si hay cualquier otra decisión activa. Solo visible si es la única lectura disponible.

---

## §4 · El cruce visual

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DATO QUE ENTRA · 38+ campos por SKU                                     │
│ Identidad y precio · Demanda · Productividad · Cobertura ·              │
│ Stock · Capacidad · Eficiencia · Devoluciones · Estilo ·                │
│ Aportación · Temporada                                                  │
└────────────┬────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 10 ÁNGULOS DE LECTURA — cada uno responde una pregunta de comprador    │
│                                                                          │
│ 1. Demanda            ──► ¿vende, sube, pesa?                            │
│ 2. Margen             ──► ¿gana dinero por unidad, con qué elasticidad?  │
│ 3. Techo de demanda   ──► ¿está saturado o tiene recorrido?              │
│ 4. Agotamiento        ──► ¿la velocidad es real o suprimida por rotura?  │
│ 5. Canibalización     ──► ¿un color se come al estilo entero?            │
│ 6. Ciclo de vida      ──► ¿en qué fase está, sube o baja?                │
│ 7. Cobertura          ──► ¿está en suficientes tiendas, cuánta flota?    │
│ 8. Riesgo de rebaja   ──► ¿hay que rebajar, en qué escalón, qué libera?  │
│ 9. Devoluciones       ──► ¿normales para la familia o anómalas?          │
│10. Continuidad        ──► ¿candidato a básico próxima temporada?         │
└────────────┬────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 12 DECISIONES                                                            │
│                                                                          │
│ ESTA SEMANA  ──► 1 Matar · 2 Rebajar · 3 Ampliar distribución            │
│                  4 Adelantar pedido pendiente                                     │
│ ESTE MES     ──► 5 Reponer · 6 Reducir compra · 7 Marcar revisión       │
│                  8 Reponer (max venta)                                       │
│ PRÓXIMA T.   ──► 9 Replicar estilo · 10 Extender colores                │
│                  11 Continuidad                                         │
│ FALLBACK     ──► 12 Esperar                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## §5 · Lo que cambia respecto al v1

| Decisión | Estado v1 | Estado v2 | Por qué |
|---|---|---|---|
| Matar | dispara amplio | **dispara menos, más justo** | Añade aportación + rotación + rotura → no mata a contribuidores estructurales ni héroes ocultos por agotamiento |
| Rebajar | sin escalón ni lift | **escalón duro + estimación de unidades liberadas** | El comprador ve el siguiente paso y cuánto desbloquea |
| Ampliar distribución | **no implementado** | **dispara** | Con `tiendas totales` y `stock disponible` la condición es computable |
| Adelantar pedido pendiente | **no implementado** | **dispara** | Con `stock pendiente` por separado de tránsito |
| Reponer | solo por agotamiento | **+ vía rotación canónica** | La rotación es la métrica retail correcta para reposición |
| Reducir compra | solo éxito del comprado | **+ éxito del enviado** | Dos lecturas paralelas — ambas pueden disparar |
| Marcar revisión | solo devoluciones+velocidad | **+ stocked-but-not-selling + anomalías de hermanos** | Detecta problemas de exposición / talla / fit que antes pasaban |
| Reponer (max venta) | velocity-rank simple | **+ rotación + aportación + activación** | Filtra falsos héroes |
| Replicar estilo próx. T. | igual + 28 días | igual + contexto de continuidad | Rationale más rico |
| Extender colores | "mejor color" | **solo ganadores limpios + estructurales** | Ya no propone sobre ganadores marginales |
| Continuidad | maduro/plateau | **+ fuerza de continuidad** | Captura básicos estructurales |
| Esperar | sin cambios | sin cambios | Fallback puro |

---

## §6 · Fases de implementación

| Fase | Qué hace | Tiempo | Visible |
|---|---|---|---|
| **F1 — Leer el dato** | Extender el cargador para que lea **todos** los campos (rotación, aportación, importe, tiendas con venta ayer, stock disponible, pendiente, en tránsito, CD2, máximo con promo, éxito del enviado, venta antesdeayer). | 1-2h | No, infra |
| **F2 — Los 10 ángulos** | Reconstruir cada uno de los 10 ángulos de lectura con todo el dato disponible — añadiendo las señales nuevas que faltan (rotación sana, aportación, tendencia, etc.) | 4-6h | No, infra |
| **F3 — Las 12 decisiones** | Reescribir las condiciones de disparo de cada una de las 12 decisiones con los nuevos signals. Implementar las 3 que no disparaban en v1 (ampliar distribución, acelerar entrada, decisiones nuevas dependen del dato). | 3-4h | Sí — empiezan a aparecer nuevas pills |
| **F4 — Visualizarlo** | Mostrar en pantalla los nuevos KPIs (rotación, aportación, activación diaria) en el detalle del SKU. Actualizar las rationales con el nuevo lenguaje. | 2-3h | Sí — el comprador ve los nuevos números |

**Total**: 10-15h. Cada fase se commita por separado. Cada fase pasa typecheck antes de pushar. Tenant aimily-internal y run V26 son el banco de pruebas.

---

## §7 · Estado

**Spec aprobado por Felipe**: 2026-05-18 (pendiente).

**Decisiones cerradas**:
- Eliminado `PROMOTE_PUSH` (era invento mío, nunca pedido).
- Escalón de rebajas: prohibido ir hacia atrás, ratchet duro sin override.
- "Reponer" no genera distort metadata — solo unidades agregadas. La distribución por tienda es del allocator.
- Baselines de rotación: calculados desde el propio corpus (familia por familia).

**Cualquier desviación durante implementación se documenta en commit message con su rationale.**
