# Analisis Profundo: Aimily vs Framework Talentiam/CICEG

> Fecha: 12 Marzo 2026
> Objetivo: Identificar gaps, oportunidades de mejora y reorganizacion de Aimily
> basandonos en como realmente funciona una empresa de moda segun el diplomado

---

## RESUMEN EJECUTIVO

Aimily cubre bien el **timeline operativo** (cuando hacer que) y las **herramientas creativas** (AI, sketches, renders). Pero le falta el **cerebro estrategico** del negocio: la parte cuantitativa, la segmentacion cualitativa, y el flujo de decision que conecta datos de venta con decisiones de producto. En resumen: Aimily es fuerte en ejecucion creativa pero debil en inteligencia comercial.

---

## 1. LO QUE AIMILY HACE BIEN (alineado con el Diplomado)

### 1.1 Retroplanning / Calendario
- El sistema de 4 bloques con 45 milestones es solido
- Calculo hacia atras desde launch date = correcto
- Responsabilidades (US/FACTORY/ALL) = alineado con Modulo 2
- Gantt interactivo con dependencias = herramienta profesional

### 1.2 Flujo Creativo → Diseno → Produccion → Lanzamiento
- La secuencia de workspaces sigue la logica del retroplanning
- Brand → Product → Design → Prototyping → Sampling → Production → Digital → Marketing → Launch
- Cada workspace tiene sus milestones asociados

### 1.3 Herramientas AI para Creacion
- SketchFlow, renders, try-on, lookbooks = no lo cubre el diplomado (es innovacion propia de Aimily)
- Copywriting AI = valor anadido real
- Esto es una VENTAJA COMPETITIVA que el diplomado no contempla

### 1.4 Brand Workspace
- Naming, logo, guidelines, packaging, target audience, competitors
- Alineado con "Brand DNA como punto de partida" del Modulo 1

---

## 2. GAPS CRITICOS: Lo que nos falta

### 2.1 NO EXISTE: Estrategia Cuantitativa (el gap mas grande)

**El diplomado dedica un modulo entero (slides 231-254) a esto. En Aimily es practicamente inexistente.**

Lo que falta:
| Concepto | Estado en Aimily | Impacto |
|----------|-----------------|---------|
| KPIs de compra (margen, rotacion, sell-through, cobertura) | No existe | Sin esto no se puede planificar compras |
| Analisis de ventas historico | No existe | Se compra "a ciegas" |
| Arquitectura de precios (piramide Hero/Core/Entry) | Solo campo price en SKU | No hay vision estrategica de pricing |
| Plan de compras por bloque | No existe | No se sabe cuanto invertir en cada bloque |
| Curva de tallas | No existe | Imposible calcular profundidad de stock |
| Stock health (sano/envejecido/muerto) | No existe | No hay gestion post-lanzamiento |
| Presupuesto total → distribucion por familia | No existe como workflow | El plan de compras es el corazon del negocio |

**Impacto real**: Una marca que use Aimily puede disenar una coleccion preciosa pero comprar mal, fijar precios sin estrategia, y terminar con stock muerto. Aimily ayuda a crear pero no a decidir cuanto invertir.

### 2.2 NO EXISTE: Segmentacion y Distribucion (Estrategia Cualitativa)

**El diplomado (slides 255-300) muestra que el Product Merchandising es el puente entre creatividad y ventas. En Aimily no existe como concepto.**

Lo que falta:
| Concepto | Estado en Aimily | Impacto |
|----------|-----------------|---------|
| Piramide de distribucion (DTC → Tier1 → Tier2 → Mass) | Solo campo "distribution model" binario (DTC/wholesale/both) | No hay estrategia de donde vender que |
| Arquitectura de precios POR FAMILIA | Campo price plano en cada SKU | No se visualiza la piramide Hero/Core/Entry por familia |
| Curva de adopcion (innovators → laggards) | No existe | No se piensa en QUE producto para QUE cliente |
| Capsulas como estrategia | Solo "drops" basicos | No hay narrativa, timing estrategico, ni exclusividad por canal |
| Clasificacion de SKU (bestseller reinventado / tendencia / oportunidad / capsula) | No existe | Todos los SKUs son iguales |
| Consumer profile POR SKU | No existe | No se sabe para quien es cada producto |

### 2.3 NO EXISTE: Multitemporalidad

**El diplomado (slide 88) muestra que una empresa SIEMPRE trabaja en multiples temporadas a la vez.**

- Aimily trata cada coleccion como isla independiente
- No hay vista de "que estoy haciendo simultaneamente en todas mis colecciones"
- No hay concepto de: "mientras vendo SS26, diseno FW26, compro SS27, y fabrico FW26"
- **Esto es fundamental para empresas reales que gestionan temporadas solapadas**

### 2.4 DEBIL: Consumer Analysis como Punto de Partida

**El diplomado empieza por el consumidor (Modulo 1). Aimily empieza por la marca.**

- Aimily tiene "target_audience" en BrandProfile pero es un campo de texto libre
- No hay tipologias de consumidor (Feminine, Athleisure, Edgy, New Minimal, Casual, Formal)
- No hay analisis generacional
- No hay mapeo de consumidor → producto → precio → canal
- El flujo del diplomado es: Consumidor → Brand DNA → Coleccion
- El flujo de Aimily es: Brand → Product → Design (el consumidor se pierde)

### 2.5 DEBIL: Bestseller Management

**El diplomado (slides 213-216) dice que 60-70% de la coleccion debe ser continuacion/reinvencion de bestsellers.**

- En Aimily no hay concepto de "carry-over" vs "nuevo"
- No hay historial de SKUs entre temporadas
- No hay forma de identificar bestsellers de la temporada anterior
- No hay workflow de "reinventar bestseller" (misma base + actualizacion)
- **Esto implica que cada temporada se empieza de cero, perdiendo el conocimiento acumulado**

### 2.6 DEBIL: Research de Tendencias

**El diplomado (slides 160-212) dedica 50+ slides a como investigar tendencias.**

- Aimily no tiene herramientas de trend research
- No hay moodboard builder (solo AI generation)
- No hay competitive analysis estructurado (solo campo de texto en brand)
- No hay feed de tendencias integrado
- **Oportunidad: AI podria analizar tendencias automaticamente**

### 2.7 AUSENTE: Rol del Product Merchandiser Director

**El diplomado (Modulo 2) pone al PM Director en el centro, conectando Diseno + Produccion + Retail + Control de Gestion.**

- Aimily no tiene roles ni permisos por funcion
- No hay vista "como PM Director veo el estado de todo"
- No hay dashboard de decision que cruce datos creativos con datos comerciales
- Todos los usuarios ven lo mismo, no hay flujo de aprobacion entre roles

---

## 3. OPORTUNIDADES: Como reorganizar Aimily

### 3.1 PROPUESTA: Anadir "Estrategia" como capa sobre los workspaces

Actualmente Aimily tiene:
```
Bloques → Workspaces → Milestones → Tareas
```

Deberia tener:
```
ESTRATEGIA (las 4 del diplomado)
  ├── Creativa     → ya cubierta (Brand + Product + Design workspaces)
  ├── Cuantitativa → NUEVO: dashboard financiero, plan de compras, KPIs
  ├── Cualitativa  → NUEVO: segmentacion, piramide distribucion, pricing
  └── Comunicacion → ya cubierta (Digital + Marketing + Launch)

EJECUCION (los 4 bloques actuales)
  ├── Creative & Brand (6 milestones)
  ├── Range Planning (6 milestones)
  ├── Design & Dev (18 milestones)
  └── Marketing & Digital (15 milestones)
```

**La estrategia guia la ejecucion. Los bloques son el "como" pero falta el "que y cuanto".**

### 3.2 PROPUESTA: "Collection Intelligence" - El cerebro que falta

Un nuevo modulo/workspace que contenga:

**A) Plan de Compras (Purchase Plan)**
- Input: presupuesto total, familias, historico
- Output: cuantas unidades de cada familia, a que coste, con que margen
- Distribucion por bloque (Transicion 15-20%, Bloque 1 40-45%, Bloque 2 25-30%, Flash 10-15%)
- Vinculado a los SKUs existentes

**B) Arquitectura de Precios**
- Vista piramide por familia: Hero (5-10%) / Core (60-70%) / Entry (20-30%)
- Cada SKU se clasifica automaticamente por su precio relativo dentro de la familia
- Alerta si la distribucion esta desequilibrada

**C) Dashboard de KPIs**
- Margen bruto target vs actual
- Numero de referencias por familia
- Cobertura de stock
- Balance comercial vs tendencia

**D) Clasificacion de SKUs**
- Cada SKU se etiqueta: `bestseller_reinvention` | `trend` | `opportunity` | `capsule`
- El sistema sugiere: "Tienes 80% trend y 0% bestseller reinvention - alto riesgo"

### 3.3 PROPUESTA: Piramide de Producto y Distribucion

En el Product workspace o nuevo workspace de estrategia:

- Definir tiers de distribucion (DTC exclusivo → Tier 1 → Tier 2 → Mass)
- Asignar SKUs a tiers
- Visualizar piramide interactiva
- Regla: producto hero solo en DTC + Tier 1, core en todos, entry amplia distribucion

### 3.4 PROPUESTA: Consumer Profiles Estructurados

Reemplazar el campo de texto libre `target_audience` por:

- Profiles predefinidos (Feminine, Athleisure, Edgy, New Minimal, Casual, Formal) + custom
- Mapeo: Profile → SKUs asignados
- Vista: "Para el perfil Athleisure tengo X productos a un precio medio de Y"
- Esto conecta consumidor → producto → precio → canal

### 3.5 PROPUESTA: Multi-Season View

Nueva vista en `/my-collections` que muestre:

```
         Ene  Feb  Mar  Abr  May  Jun  Jul  Ago  Sep  Oct  Nov  Dic
Venta    [========= SS26 =========]         [========= FW26 =========]
Diseno                   [========= FW26 =========]  [========= SS27 ==
Compra        [==== FW26 ====]                  [==== SS27 ====]
Produccion         [========= FW26 =========]        [======== SS27 ===
```

- Vista Gantt de todas las colecciones activas
- Identificar conflictos de recursos (equipo de diseno trabajando en 2 colecciones a la vez)
- Vista real de como opera una empresa fashion

### 3.6 PROPUESTA: Bestseller Carry-Over System

- Al crear nueva coleccion, opcion de "importar bestsellers de temporada anterior"
- Los SKUs importados se marcan como `carry_over`
- Workflow de reinvencion: "Que cambio? Color / Material / Suela / Detalle"
- KPI: % carry-over vs % nuevo (target: 60-70% carry / 30-40% nuevo)

### 3.7 PROPUESTA: AI Trend Research Assistant

Aprovechar la ventaja AI de Aimily para cubrir el gap de research:
- Feed automatico de tendencias (catwalk, street style, social media)
- AI analiza y sugiere: "Para tu perfil de marca, estas tendencias son relevantes"
- Generacion automatica de moodboards basados en tendencias detectadas
- Competitive analysis: "Estas marcas similares a ti estan haciendo X"

---

## 4. PRIORIZACION: Que implementar primero

### Impacto Alto + Esfuerzo Medio
1. **Clasificacion de SKUs** (bestseller/trend/opportunity/capsule) - campo nuevo + UI
2. **Arquitectura de precios visual** (piramide por familia) - dashboard sobre datos existentes
3. **Consumer profiles estructurados** - reemplazar texto libre por sistema
4. **Multi-season view** - Gantt de colecciones solapadas

### Impacto Alto + Esfuerzo Alto
5. **Plan de compras completo** - modulo nuevo con presupuesto, distribucion, KPIs
6. **Bestseller carry-over system** - importar SKUs entre temporadas
7. **Dashboard de KPIs financieros** - margen, rotacion, sell-through

### Impacto Medio + Esfuerzo Medio
8. **Piramide de distribucion** - tiers + asignacion de SKUs
9. **AI Trend Research** - feed + sugerencias automaticas
10. **Vista de estrategia** - las 4 estrategias como capa sobre los bloques

---

## 5. COMPARATIVA VISUAL: Framework Diplomado vs Aimily

```
DIPLOMADO (como funciona la empresa real)        AIMILY (que tenemos)
================================================  ========================

1. CONSUMIDOR (punto de partida)                  ❌ No existe como flujo
   └── Perfiles, generaciones, Brand DNA          (campo texto en brand)

2. 4 ESTRATEGIAS
   ├── Creativa ✅                                ✅ Brand + Product + Design
   ├── Cuantitativa ❌                            ❌ No existe
   ├── Cualitativa ❌                             ❌ No existe
   └── Comunicacion ✅                            ✅ Digital + Marketing

3. RETROPLANNING                                  ✅ 4 bloques, 45 milestones
   └── 5 hitos hacia atras                        (bien implementado)

4. ESTRUCTURA DE COLECCION
   ├── Product Sheets ⚠️                          ⚠️ SKUs basicos (faltan campos)
   ├── Familias y subfamilias ⚠️                  ⚠️ Solo "family" plano
   ├── Arquitectura precios ❌                    ❌ No hay piramide
   └── Balance comercial/tendencia ❌             ❌ No hay clasificacion

5. PRODUCTO
   ├── Bestseller reinvention ❌                  ❌ No hay carry-over
   ├── Nuevas oportunidades ❌                    ❌ No hay evaluacion
   ├── Capsulas estrategicas ⚠️                   ⚠️ Drops basicos, sin narrativa
   └── Colaboraciones ❌                          ❌ No hay workflow

6. DISTRIBUCION
   ├── Piramide de distribucion ❌                ❌ Solo DTC/wholesale toggle
   ├── Tiers de retail ❌                         ❌ No existe
   └── Producto por canal ❌                      ❌ No hay asignacion

7. MULTITEMPORALIDAD ❌                           ❌ Colecciones aisladas

8. ROLES (PM Director, Disenador,                ❌ Sin roles
   Produccion, Retail, Control Gestion)           (todos ven lo mismo)

VENTAJA AIMILY NO EN DIPLOMADO:
   ├── AI Generation (renders, try-on, sketches)  ✅ Unico en el mercado
   ├── AI Copywriting                             ✅
   ├── Lookbook builder                           ✅
   └── Campaign shoot planning                    ✅
```

---

## 6. CONCLUSION

Aimily es una herramienta de **ejecucion creativa** excelente, pero le falta el **motor de decision comercial** que hace que una coleccion sea rentable. El diplomado deja claro que:

> "Una coleccion de exito es balanceada entre comercial y tendencia, adecuada en tiempo, equilibrada en precios, y conecta con su publico objetivo."

Aimily ayuda con el "tiempo" (calendario) y la "tendencia" (AI creativa), pero no con el "balance comercial", los "precios equilibrados" ni la "conexion con publico especifico".

**La oportunidad es enorme**: ninguna herramienta en el mercado combina AI creativa + inteligencia comercial de moda. Si Aimily anade la capa cuantitativa y cualitativa, se convierte en la primera plataforma verdaderamente end-to-end para marcas de moda.
