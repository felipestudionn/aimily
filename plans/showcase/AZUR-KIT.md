# AZUR · SS27 — Kit completo para recorrer aimily end-to-end

> Cómo se usa: abre esta pestaña al lado de la app. Cada sección mapea **1:1** a un input de la UI. Cuando dispares un AI generator, si lo que devuelve te gusta, acéptalo. Si no, vienes aquí, copias el bloque correspondiente, lo pegas en "edit manual" y confirmas.
>
> Los textos están escritos para que parezcan tuyos — no de un script. Edita lo que quieras: el kit es un esqueleto, no una camisa de fuerza.
>
> **Concepto en una frase**: AZUR es el cruce entre Jacquemus (Mediterráneo, juego), Alaïa (escultura, cuerpo, peso) y Phoebe Philo Céline-era (cortes arquitectónicos, silencio intelectual). Verano 27, mujer 28-42, contemporary luxury por encima de Zara y por debajo de Loro Piana.

---

## INDEX

1. [Sesión 0 · Crear la colección](#sesión-0--crear-la-colección)
2. [Sesión 1 · Block 1 Creative & Brand](#sesión-1--block-1-creative--brand)
3. [Sesión 2 · Block 2 Merchandising + Range Plan](#sesión-2--block-2-merchandising--range-plan)
4. [Sesión 3 · Block 2 Collection Builder · 20 SKUs](#sesión-3--block-2-collection-builder--20-skus)
5. [Sesión 4 · Block 3 Design & Development](#sesión-4--block-3-design--development)
6. [Sesión 5 · Block 4 Marketing & Sales](#sesión-5--block-4-marketing--sales)
7. [Sesión 6 · Ecom + SEO + Publish](#sesión-6--ecom--seo--publish)
8. [Anexo · 10 SKUs ready vs 10 sketch-only · qué pongo en cada uno](#anexo--reparto-ready-vs-sketch)

---

## SESIÓN 0 · CREAR LA COLECCIÓN

**Ruta**: https://www.aimily.app/new-collection

| Campo UI | Pega esto |
|---|---|
| **Nombre de la colección** | `AZUR` |
| **Launch date** | `2027-05-15` (snap al 1 de mayo si la UI te lo pide redondeado) |
| **Season auto-derivada** | SS27 |
| **CTA** | Empezar |

→ Te lleva a `/collection/<nuevo-id>`. Avísame el id y lo apunto. La timeline ya tiene 45 milestones en `pending` y la captura seed CIS escribe `identity.collection.{name,season,launch_date}` + `identity.user.language`.

---

## SESIÓN 1 · BLOCK 1 CREATIVE & BRAND

Tiempo estimado: 35-45 min.

### 1.1 · Consumer Definition

**Ruta**: `creative?block=consumer`

Click "Generar propuestas con IA". El AI genera 3-4 personas. Si una encaja, like. Si no, abre "edit manual" y pega:

```
Persona principal: "The Returning Summer Girl"

Mujer 30-40, urbana, viaja al Mediterráneo cada verano por dos
o tres semanas. Vive en Madrid, Barcelona, París, Milán o NYC.
Lidera su propio negocio o sube en una empresa que la deja escapar.

Income: €60-150k/año personal, contexto familiar a menudo más alto.
No tiene hijos pequeños o están en edad de viajar bien.

Compra 8-12 piezas nuevas al año. Cada pieza la lleva 5-7 años.
Conoce cada prenda de su armario. Prefiere pagar 2x por algo
"perfectamente cortado" que 3x algo "trendy".

Otras marcas que ya compra: Jacquemus, Khaite, Toteme, La DoubleJ,
Polo Ralph Lauren resort, Birkenstock, Hermès silk.

Lee Vogue Business, NYT Style, Apartmento, Cereal magazine.
Ve documentales de craftsmanship Loro Piana. Sigue cuentas de
arquitectura mediterránea más que de moda directa.

Pain point: la boutique es lenta y cara, el e-commerce de masas
pierde la narrativa de oficio. Quiere ambas cosas a la vez:
velocidad e historia detrás de la pieza.
```

**Confirma** la propuesta. La UI escribe a `creative.target.{persona_name, demographics, lifestyle, psychographics}`.

---

### 1.2 · Vibe Direction

**Ruta**: `creative?block=moodboard` o `vibe` según cómo se llame en tu sidebar

Click "Generar vibe propuestas". Si el AI te da algo genérico, pega esta dirección:

**Vibe title**: `Côte du Sol`

**Narrative**:
```
AZUR vive en la línea donde Saint-Tropez al amanecer se junta con
Cadaqués al mediodía. Cortes franceses arquitectónicos cosidos por
manos catalanas y andaluzas. Los colores salen del paisaje: azul
profundo del agua, blanco hueso de las paredes encaladas, terracota
del azulejo, oliva del olivo a la hora dorada.

Los tejidos son 100% naturales — lino italiano de Solbiati, algodón
egipcio voile, lana merino australiana, rafia tejida a mano en Mallorca,
cuero curtido vegetal en Portugal. Nada sintético. Nunca.

La pieza vive cinco veranos, no uno.
```

**Keywords**: `lino, rafia, sol, sal, marea, oliva, terracota, azur, mediterráneo, escultura, peso, silencio, hecho a mano, anti-trend`

---

### 1.3 · Moodboard

**Ruta**: `creative?block=moodboard` (paso de moodboard, distinto de vibe si están separados)

Si te pide referencias visuales, sube las del Pinterest que estás preparando. Si te pide keywords / análisis, pega:

```
Mediterranean architectural · whitewashed walls · terracotta tile floor ·
bougainvillea shadow · raking afternoon light · Apartmento magazine
atmosphere · Cereal magazine palette · Loro Piana craftsmanship
documentary · Charlotte Wales for Khaite · Jacquemus Le Bambino
campaign · Phoebe Philo Céline 2014 lookbook · Alaïa Spring/Summer
sculpture · Ancient Greek minimalism · Mediterranean fishing village.

Color story: deep azure (#1B4D8E), bone white (#F5EFE6), terre brûlée
(#B85C3A), olive silver (#7A8F5F), charbon (#1A1A1A).
```

---

### 1.4 · Market Research / Trend Analysis

**Ruta**: `creative?block=market-research`

Click "AI trends Spring/Summer 2027". Confirma o pega:

```
TRENDS SS27 — convergence

1. Quiet luxury permanence (4ª temporada). No pico hasta 2028.
   AZUR encaja: oficio sin logo, narrativa de tejido.

2. Linen + raffia como "el nuevo logo". Visible craft replaces
   visible branding. AZUR triple-anchor: lino italiano, rafia
   mallorquina, cuero portugués.

3. Mediterranean anchor. Tom Ford Beauty, Khaite, Frankies Bikinis
   todos viran a Côte d'Azur. AZUR es residente, no turista.

4. Anti-mass-resort backlash. Las consumidoras están cansadas de
   homogeneidad sundress. Quieren cortes, no estampados.

5. Supply chain transparency. No claims, hechos. AZUR: Provence,
   Mallorca, Portugal — 3 países, 14 talleres, todos visitables.

WHITE SPACE

- Mediterráneo artisanal de verdad (la mayoría son NY/Stockholm).
- Calzado en este tier con narrativa de oficio (la mayoría delega
  a wholesale).
- Paleta más allá de bone+terracota+azul — AZUR empuja olive y azur
  signature como anclajes.

COMPETIDORES

| Marca | Tier | Distancia | Por qué |
|---|---|---|---|
| Jacquemus | €350-€800 | Direct peer | Mismo DNA mediterráneo, estética más amplia |
| Khaite | €600-€1500 | Adjacent NY-coded | Mismo cliente, más arquitectónico |
| Toteme | €300-€700 | Adjacent Scandi-clean | Mismo minimalismo, menos calidez |
| La DoubleJ | €400-€1200 | Adjacent Italian-print | Mismo cliente resort, más estampado |
| Faithfull the Brand | €150-€350 | Below mass-resort | Mismo vibe, precio accesible |
```

---

### 1.5 · Brand Identity (Brand DNA)

**Ruta**: `creative?block=brand-identity` o `brand-dna`

| Campo UI | Valor |
|---|---|
| Brand name | `AZUR` (lowercase: `azur`) |
| Tagline | `Wear what the sea would wear.` |
| One-liner | `A Mediterranean resort-luxury label — sculpted linen, raffia, vegetable-tanned leather. Made in Provence, Portugal, and Mallorca.` |
| Mission | `To dress the woman who returns to the Mediterranean every summer with pieces that age the way good linen ages — softer, more familiar, more hers.` |
| Values | `Craft over speed · Material truth · Mediterranean rhythm · Anti-trend permanence` |
| Voice tone | `sensorial, present-tense, Mediterranean. Salt, light, weight of fabric. Em-dashes welcome — they slow the reader down. Lowercase brand mark.` |
| Personality | `sensorial · discreet · considered · warm-Mediterranean · anti-trend` |
| Vocabulary (DO) | `linen · raffia · sun · salt · tide · olive · terracotta · azure · Mediterranean · sculpted · woven · hand-finished · garment-washed · vegetable-tanned · breathable · soft hand-feel · five summers` |
| Don't rules | `no exclamation marks · no overt branding · no synthetic adjectives ("game-changing", "must-have") · no all-caps · no "buy now" CTA · no "limited drop" urgency` |
| Sign-off | `Côte du Sol.` |
| Reference brands | `Jacquemus · Khaite · Toteme · La DoubleJ · Phoebe Philo Céline-era · Alaïa` |

**Colors** (paleta primaria — el AI te pedirá hex + name + role):

| Name | Hex | Role |
|---|---|---|
| Azur | `#1B4D8E` | signature |
| Bone | `#F5EFE6` | base |
| Terre | `#B85C3A` | accent warm |
| Olive | `#7A8F5F` | accent cool |
| Charbon | `#1A1A1A` | contrast |

**Typography**:
- Display: `Editorial New` o `Times New Roman` (serif elegante)
- Body: `Inter` o `Söhne` (sans clean)
- Brand mark: `azur` lowercase, serif fine, tight tracking

---

### 1.6 · Synthesis / Creative Overview

**Ruta**: `creative?block=creative-overview` (se llama Creative Brief Consolidation o similar)

Click "Generar synthesis". El AI consolida lo de arriba. Si quieres editarlo:

```
AZUR es una marca de lujo contemporáneo mediterránea para mujeres
que veranean igual cada año pero nunca se ven igual dos veces.

Vivimos en la línea Saint-Tropez–Cadaqués–Mallorca: cortes arquitectónicos
franceses, oficio catalán y andaluz. Lino italiano garment-washed, rafia
tejida a mano, cuero curtido vegetal — nunca sintético.

Apuntamos a la mujer de 30-40 que compra 8-12 piezas al año y guarda
cada una cinco veranos. Posicionamiento: por encima de Reformation y
Rouje, peer con Jacquemus y la línea resort de The Row, por debajo
de Loro Piana y Hermès Plage. Precios entre €180 (un top) y €490
(un vestido estructurado).

Voz: sensorial, presente, mediterránea. Em-dashes. Lowercase. Sin
urgencia, sin adjetivos sintéticos, sin gritos.

Año 1 DTC objetivo: €500K. Canal: directo a través de azur.aimily.shop +
selección curada de boutiques (5-8 multimarcas en Madrid, Barcelona,
París, Lisboa) en wholesale phase 2.
```

**→ Block 1 listo. Confirma cada card y pasa al Block 2.**

---

## SESIÓN 2 · BLOCK 2 MERCHANDISING + RANGE PLAN

Tiempo estimado: 30-40 min.

### 2.1 · Buying Strategy / Scenarios

**Ruta**: `merchandising?block=scenarios`

Click "Generar 3 escenarios con IA". El AI te da focused / balanced / ambitious. **Selecciona BALANCED** para hit el target €500K.

Si necesitas pegar el balanced manualmente:

```
ESCENARIO BALANCED — "The Founding Capsule"

20 SKUs · 3 familias · 2 colorways promedio
Year 1 DTC target: €500,000
Total investment: €175,000 (production €110K + marketing €45K + ops €20K)
Margen objetivo: 64% bruto

SKU breakdown:
- 7 Skin Linens (vestidos + tops + pantalones lino)
- 7 Sun Footwear (sandalias + slingbacks + flats)
- 6 Hand Objects (bolsos rafia + cuero + tote vegetal)

Drops calendar:
- Drop 1 (15-Mayo-2027): 8 SKUs hero. Skin Linens 3 + Sun Footwear 3 + Hand Objects 2.
- Drop 2 (15-Junio-2027): 7 SKUs. Skin Linens 2 + Sun Footwear 3 + Hand Objects 2.
- Drop 3 (15-Julio-2027): 5 SKUs trend. Skin Linens 2 + Sun Footwear 1 + Hand Objects 2.

Channel split:
- DTC web 65% (azur.aimily.shop)
- Wholesale 30% (5-7 boutiques curadas, comisión 50-55%)
- Pop-up Madrid + Mallorca 5%

Sell-through target: 80% by end September. Carry-over 20% para primavera 28
(no rebajas mediterráneas — solo private sale a community).

Por qué BALANCED y no FOCUSED ni AMBITIOUS:
- 12 SKUs (focused) no llena el lookbook con autoridad.
- 30+ SKUs (ambitious) requiere wholesale agresivo y diluye el control DTC.
- 20 SKUs es el dulce: storytelling completo, inventory manejable,
  cuota production realista para Provence + Portugal + Mallorca en SS27.
```

---

### 2.2 · Families & Pricing

**Ruta**: `merchandising?block=families-pricing`

Click "Generar families con IA" → confirma 3 familias. Pega si prefieres editar:

```
FAMILIA 1 · SKIN LINENS  (ROPA)
Theme: cuts that breathe, skin-touching layers.
Materials: Italian linen 148gsm garment-washed (Solbiati), Egyptian
cotton voile, Spanish merino australiana 14-gauge.
Priority: CORE (anchor de la colección)
SKU count: 7
Price range: €180 - €490
Margin target: 65%
Rationale: Es la pieza que la cliente recuerda — el vestido del
verano. Lino italiano de Solbiati con dye job en Provence. Cortes
de Phoebe Philo Céline-era. Sin estampados, sin volantes.

FAMILIA 2 · SUN FOOTWEAR  (CALZADO)
Theme: anatomic comfort meets sculptural minimalism.
Materials: vegetable-tanned Portuguese leather (CTCP partner),
hand-woven Mallorcan raffia, jute sole, lambskin lining.
Priority: CORE (alta velocidad, sell-through 90%+)
SKU count: 7
Price range: €180 - €340
Margin target: 60%
Rationale: La pieza que la cliente compra primera vez. Punto de entrada
para el universo. Sandalias minimalistas, slingbacks, espadrilles
elevadas. Inspiración Manolo + Jacquemus + The Row.

FAMILIA 3 · HAND OBJECTS  (ACCESORIOS)
Theme: woven by hand, signed by the sun.
Materials: Mallorcan raffia, vegetable-tanned leather handles,
horn closures, lambskin interior.
Priority: STRATEGIC (margen alto, cuenta historia oficio)
SKU count: 6
Price range: €140 - €380
Margin target: 70%
Rationale: El bolso rafia es el statement piece SS27. Tejido a mano
en Mallorca por mujeres de tres generaciones (Cooperativa de Sineu).
Cada bolso tarda 14-22 horas. Es el showcase de "ostensible craft".
```

**Pricing matrix**:

| SKU | Family | Min € | Max € |
|---|---|---|---|
| Solène | Skin Linens | 380 | 420 |
| Camille | Skin Linens | 360 | 390 |
| Pauline | Skin Linens | 340 | 380 |
| Anaïs | Skin Linens | 240 | 280 |
| Margot | Skin Linens | 220 | 240 |
| Inès | Skin Linens | 240 | 260 |
| Hélène | Skin Linens | 180 | 200 |
| Léonie | Sun Footwear | 280 | 310 |
| Charlotte | Sun Footwear | 260 | 290 |
| Estelle | Sun Footwear | 260 | 280 |
| Margaux | Sun Footwear | 320 | 340 |
| Ophélie | Sun Footwear | 290 | 320 |
| Brigitte | Sun Footwear | 280 | 300 |
| Amélie | Sun Footwear | 180 | 200 |
| Marina | Hand Objects | 280 | 320 |
| Élise | Hand Objects | 140 | 160 |
| Lola | Hand Objects | 220 | 260 |
| Aurore | Hand Objects | 160 | 180 |
| Béatrice | Hand Objects | 180 | 220 |
| Zoé | Hand Objects | 220 | 260 |

---

### 2.3 · Channels / Distribution Strategy

**Ruta**: `merchandising?block=channels`

```
CHANNELS

FASE 1 (Mes 1-6) — DTC EXCLUSIVO
- azur.aimily.shop con tema editorial-luxe
- Instagram Shop (catálogo sincronizado)
- Email DB (objetivo 8K subs pre-launch)
- Margen retenido 65-70%
- Objetivo: validar narrativa, capturar data cliente, construir
  comunidad (Discord privado para top 200 buyers).

FASE 2 (Mes 7-12) — WHOLESALE CURADO
- 5-7 boutiques multimarca: Madrid (Cuyana, María de Panes),
  Barcelona (Santa Eulalia kids of), París (Centre Commercial),
  Lisboa (Lela's), Mallorca (Rialto Living).
- Margen wholesale 50-55% retail.
- No marketplace (Zalando, Farfetch) — dilution risk.

FASE 3 (Año 2) — POP-UP + COLABORACIONES
- Pop-up Madrid (Calle Jorge Juan, 1 mes)
- Pop-up Mallorca (Palma casco antiguo, 2 semanas)
- Colaboración con Sézane o Apartmento (TBD)

CHANNEL SPLIT YEAR 1
- DTC web: 65% (€325K)
- Wholesale: 30% (€150K)
- Pop-up: 5% (€25K)
- Total: €500K
```

---

### 2.4 · Budget / Financial Plan

**Ruta**: `merchandising?block=budget`

| Campo | Valor |
|---|---|
| Total Sales Target Y1 | `500000` |
| Total Units (estimado) | `2400` |
| Avg Price | `205` (€500K / 2400 units) |
| Target Margin | `65` |
| Avg Discount | `10` |
| Production Budget | `110000` |
| Marketing Budget | `45000` |
| Operations Budget | `20000` |
| Expected Revenue Y1 | `500000` |
| Expected Profit Y1 | `175000` (35% net) |

**Type segmentation** (por revenue, no por unit count):

| Type | % |
|---|---|
| REVENUE | 55 |
| IMAGE | 25 |
| ENTRY | 20 |

**Newness segmentation**:

| Name | % |
|---|---|
| Newness | 100 |
| Carry-Over | 0 |

(Es lanzamiento de marca — todo es newness el primer año.)

**Monthly distribution** (SS — pico Mar-Jun): la UI debería auto-derivar `[4, 8, 12, 14, 14, 12, 10, 8, 6, 5, 4, 3]` según `season=SS27`. No tocar.

---

## SESIÓN 3 · BLOCK 2 COLLECTION BUILDER · 20 SKUs

Tiempo estimado: 25-35 min.

**Ruta**: `/collection/<id>/product` (Collection Builder)

Click "Generar SKUs con IA" → te genera ~20 SKUs basándose en families + pricing + budget. Si la IA queda corta o devuelve nombres genéricos, edita SKU por SKU con esta tabla.

| # | Name | Family | Category | Type | PVP | Cost | Drop | Story | Description |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Solène | Skin Linens | ROPA | IMAGE | 420 | 128 | 1 | At Sea | Vestido maxi linen asimétrico, espalda abierta con tirantes finos, cuello cuadrado. A-line skirt. Italian linen 148gsm garment-washed |
| 2 | Camille | Skin Linens | ROPA | REVENUE | 390 | 117 | 1 | At Sea | Vestido midi linen sin mangas, corte recto con sutil entallado en cintura. Bone, Azur. Italian linen washed |
| 3 | Pauline | Skin Linens | ROPA | REVENUE | 380 | 115 | 2 | The Walk | Pantalón lino tiro alto, pierna ancha, pinzas frontales. Bone, Charbon, Azur. Italian linen weight |
| 4 | Anaïs | Skin Linens | ROPA | REVENUE | 280 | 84 | 2 | The Walk | Falda pareo lino, anudada al lado. Bone, Terre. Italian linen + raffia tie |
| 5 | Margot | Skin Linens | ROPA | ENTRY | 240 | 72 | 1 | At Sea | Top sin mangas linen cropped, cuello redondo, espalda con botones. Bone, Terre. Italian linen washed |
| 6 | Inès | Skin Linens | ROPA | REVENUE | 260 | 78 | 3 | After Hours | Camisa linen oversized, cuello camisero, manga francesa. Bone, Olive, Azur. Italian linen washed |
| 7 | Hélène | Skin Linens | ROPA | ENTRY | 200 | 60 | 2 | The Walk | Tank top algodón egipcio voile, escote asimétrico. Bone, Olive, Charbon. Egyptian cotton |
| 8 | Léonie | Sun Footwear | CALZADO | REVENUE | 290 | 87 | 2 | The Walk | Slingback puntiagudo, cuero curtido vegetal, kitten heel 4cm. Bone, Charbon, Azur |
| 9 | Charlotte | Sun Footwear | CALZADO | REVENUE | 280 | 84 | 3 | After Hours | Mule plana, cuero, suela jute. Olive, Terre, Bone |
| 10 | Estelle | Sun Footwear | CALZADO | REVENUE | 260 | 78 | 2 | The Walk | Sandalia minimalista 2 tiras, cuero anatómico. Bone, Charbon, Terre |
| 11 | Margaux | Sun Footwear | CALZADO | IMAGE | 340 | 102 | 2 | The Walk | Sandalia escultural 1 tira ancha, cuero, tacón cilíndrico 7cm. Azur, Charbon |
| 12 | Ophélie | Sun Footwear | CALZADO | REVENUE | 310 | 93 | 2 | The Walk | Slipper de noche, cuero suave, suela cuero, cordón fino. Charbon, Olive |
| 13 | Brigitte | Sun Footwear | CALZADO | IMAGE | 300 | 90 | 2 | The Walk | Espadrille elevada con plataforma 5cm, cuero sobre rafia. Bone, Terre |
| 14 | Amélie | Sun Footwear | CALZADO | ENTRY | 200 | 60 | 1 | At Sea | Espadrille flat, rafia tejida a mano, suela jute, cuero insole. Natural, Charbon |
| 15 | Marina | Hand Objects | ACCESORIOS | REVENUE | 320 | 96 | 1 | At Sea | Tote rafia tejida a mano grande, asas cuero curtido vegetal, forro lambskin. Natural |
| 16 | Élise | Hand Objects | ACCESORIOS | ENTRY | 160 | 48 | 3 | After Hours | Pochette plana cuero, cierre horn, sin asas. Bone, Charbon |
| 17 | Lola | Hand Objects | ACCESORIOS | IMAGE | 260 | 78 | 1 | At Sea | Bolso bandolera media luna, cuero suave, asa fina cuero. Azur, Olive |
| 18 | Aurore | Hand Objects | ACCESORIOS | ENTRY | 180 | 54 | 2 | The Walk | Cesta rafia mini con asas cuero cortas. Natural, Charbon |
| 19 | Béatrice | Hand Objects | ACCESORIOS | REVENUE | 220 | 66 | 2 | The Walk | Hobo cuero suave drapeado, asa única ancha. Charbon, Terre |
| 20 | Zoé | Hand Objects | ACCESORIOS | REVENUE | 260 | 78 | 3 | After Hours | Clutch rectangular cuero, cadena fina interior, cierre horn. Bone, Azur |

**buy_units por SKU**: la UI lo deriva de `expected_sales / pvp`. Apunta más o menos al sell-through 80% del target — no obsesionarse. Si la IA propone numbers bajos para los IMAGE pieces (Solène, Margaux, Brigitte, Lola), está bien — esos no son volume, son editorial.

---

## SESIÓN 4 · BLOCK 3 DESIGN & DEVELOPMENT

Tiempo estimado: 60-90 min (es la fase con más AI calls — sketches + colorize + tech_pack + review).

### 4.1 · Reparto SKU ready vs sketch-only

Para que la colección se vea "in full progress" — mitad lista, mitad en proceso:

**LOS 10 EDITORIAL-READY** (los que tendrán fotos editoriales tuyas + tech pack completo):
1. Solène · vestido hero
2. Camille · vestido midi
3. Pauline · pantalón lino
4. Marina · tote rafia hero
5. Léonie · slingback
6. Estelle · sandalia minimalista
7. Margaux · sandalia escultural
8. Amélie · espadrille flat
9. Lola · bolso media luna
10. Margot · top sin mangas

→ Estos 10 reciben: sketch AI + zone detection + colorize 2 colorways + tech_pack_data + 1 sample_review aprobado + production_order opened. Editorial photo upload (la pasas tú).

**LOS 10 SKETCH-ONLY** (sólo sketch, sin tech pack ni proto):
11. Anaïs, 12. Inès, 13. Hélène, 14. Charlotte, 15. Ophélie, 16. Brigitte, 17. Élise, 18. Aurore, 19. Béatrice, 20. Zoé

→ Estos 10 reciben: solo sketch AI (sin colorize ni nada más).

### 4.2 · Sketch AI · 20 SKUs

**Ruta**: `/collection/<id>/product?phase=sketch` o vía SkuDetailView card por card.

Por cada SKU click "Generar sketch AI". El endpoint detecta zonas y genera. Si necesitas pegar prompt manual:

**Para vestidos** (Solène, Camille, Pauline, Anaïs, Inès, Margot, Hélène):
```
Hand-drawn fashion technical sketch of a [tipo de vestido — see SKU spec].
Front view, full body. Clean black single-line illustration on pure white
background. Designer's croquis style — like Phoebe Philo Céline-era technical
drawings. NO color, NO shading, NO model, NO text. Pure technical fashion
sketch with measurement guides barely visible. 1:1 aspect ratio.
```

**Para calzado** (Léonie, Charlotte, Estelle, Margaux, Ophélie, Brigitte, Amélie):
```
Hand-drawn fashion technical sketch of [tipo zapato — see SKU spec].
Side view AND top view, two angles. Clean black single-line illustration
on pure white background. Fashion designer croquis style. Material texture
(leather, raffia) suggested with light shading. NO color, NO model, NO text.
1:1 aspect ratio.
```

**Para bolsos** (Marina, Élise, Lola, Aurore, Béatrice, Zoé):
```
Hand-drawn fashion technical sketch of [tipo bolso — see SKU spec].
Front view AND side view, showing texture (woven raffia / smooth leather)
and handle attachment. Clean black single-line illustration on pure white
background. Designer technical drawing style. NO color, NO model, NO text.
1:1 aspect ratio.
```

### 4.3 · Colorize · solo los 10 ready

Para cada uno de los 10 ready: click "Colorize" → elegir colorway → AI llama gpt-image-1.5 con la sketch + paleta. 2 colorways por SKU (por ejemplo Solène en Bone + Azur).

Si la zone detection falla, hay un fallback manual (zonas predefinidas: Body / Lining / Trim).

### 4.4 · Tech Pack · solo los 10 ready

**Ruta**: por cada uno de los 10 ready, abre Tech Pack workspace.

Pega esta plantilla (adaptando los specs de material por SKU):

```
HEADER
Style: AZ-001
Season: SS27
Designer: AZUR Design Studio
Tech Designer: TBD

MATERIALS
- Body: Italian linen 148gsm garment-washed (Solbiati 23/L4-WSH) — 1.8m
- Lining: Egyptian cotton voile 80gsm (TBC) — 0.9m
- Closures: Mother-of-pearl button 12mm × 4 (Sambonet)
- Trim: silk thread 60wt natural

CONSTRUCTION
- French seams throughout body
- Hand-finished hem (3mm rolled)
- Bias binding neckline
- Hidden zip 22cm at side seam

MEASUREMENTS (size 38, base)
- Bust: 92cm
- Waist: 76cm
- Hip: 100cm
- Length CB: 112cm
- Sleeve: N/A (sleeveless)

GRADING
- 36/38/40/42 standard
- +/- 4cm bust per size

SAMPLING NOTES
Sample en bone para fitting v1. Wash test 30°C antes de proto.
Hand-finishing pass por costurera senior.
```

Adapta `MATERIALS` por SKU (rafia para Marina, cuero para Léonie, etc.). El AI puede ayudarte a rellenar bills of materials si tu UI lo soporta.

### 4.5 · Sample Reviews · 5 SKUs (subset de los 10 ready)

Para Solène, Camille, Léonie, Marina, Estelle: crear un sample_review con `ai_recommendation: 'minor_revisions'` (realista — primer proto rara vez approved cleanly):

```
Factory: Atelier Provence (Solène, Camille) / CTCP Portugal (Léonie, Estelle) /
Cooperativa de Sineu (Marina)

Promised date: 2026-09-15
Received date: 2026-09-22 (delay 7d)

Visual deviations:
- Hem 2mm shorter than spec
- Color slightly off (more grey-bone, less warm-bone)
- Stitching density acceptable

AI recommendation: minor_revisions
Action: approve para production con ajustes en next batch.
```

### 4.6 · Production Orders · 3 SKUs

Para Camille, Léonie, Marina: open production order

```
Order: PO-AZUR-SS27-001 (Camille)
Factory: Atelier Provence
Quantity: 280 units (drop 1 + 2)
Total cost: €32,760 (€117 × 280)
Open date: 2026-10-15
Promised delivery: 2027-02-28
Status: in_progress
```

Igual para Léonie (PO-002, CTCP Portugal, 240u) y Marina (PO-003, Cooperativa de Sineu, 180u).

---

## SESIÓN 5 · BLOCK 4 MARKETING & SALES

Tiempo estimado: 45-60 min.

### 5.1 · Stories · 4 stories

| Name | Hero SKU | Drop | Narrative |
|---|---|---|---|
| **At Sea** | Solène | 1 | El primer día. Sales del agua, el vestido pesa el peso correcto, la sal se queda en el dobladillo. SKUs: Solène, Camille, Marina, Margot, Amélie, Lola |
| **The Walk** | Léonie | 2 | El paseo entre dos pueblos del interior. Sombra, calor seco, paso largo. SKUs: Pauline, Anaïs, Hélène, Léonie, Estelle, Margaux, Ophélie, Brigitte, Aurore, Béatrice |
| **After Hours** | Inès | 3 | La cena después del baño. Camisa abierta, sandalia plana, vino frío. SKUs: Inès, Charlotte, Élise, Zoé |
| **The Return** | (no hero — campaign closer) | — | Septiembre. La pieza vuelve a la maleta, ya con la marca del verano. (Storytelling de post-launch — no nuevo SKU.) |

Pega cada una en su tarjeta. El AI puede expandir las narrativas.

### 5.2 · Content Pillars · 4

| Name | Description | Examples |
|---|---|---|
| **Material Truth** | Foco en el origen y el oficio del tejido. Solbiati, Cooperativa de Sineu, CTCP Portugal. Vídeos en taller, manos trabajando, sin voz off. | Reel "Cómo se teje un Marina" · Carrusel "El lino italiano de AZUR" |
| **Mediterranean Rhythm** | El paisaje, la luz, las costumbres. No marketing — atmosphere. Bougainvilleas, paredes encaladas, tarde dorada. | Reel "La hora dorada en Cadaqués" · Foto serie "Walls of Mallorca" |
| **The Returning Woman** | Customer voices. Mujeres de 30-40 contando su relación con el verano. Largo formato, sin guión. | Long-form interview Inés (founder Madrid) · Newsletter testimonio |
| **Anti-Trend Permanence** | Por qué AZUR no sigue tendencias. Filosofía de la marca. Five summers manifesto. | Editorial "Por qué nunca habrá rebajas en AZUR" · Newsletter "El armario lento" |

### 5.3 · Brand Voice Config

| Campo | Valor |
|---|---|
| Personality | `sensorial · discreet · considered · warm-Mediterranean · anti-trend` |
| Tone | `sensorial, present-tense, Mediterranean. Salt, light, weight of fabric. Em-dashes welcome — they slow the reader down.` |
| Vocabulary | `linen · raffia · sun · salt · tide · olive · terracotta · azure · Mediterranean · sculpted · woven · hand-finished · garment-washed · vegetable-tanned · breathable · soft hand-feel · five summers` |
| Do rules | `Use lowercase brand mark "azur"` · `Always present tense` · `Reference materials by origin (Solbiati linen, Mallorcan raffia)` · `End with sign-off "Côte du Sol."` |
| Don't rules | `no exclamation marks` · `no overt branding` · `no synthetic adjectives ("game-changing", "must-have")` · `no all-caps` · `no "buy now" CTA` · `no "limited drop" urgency` |
| Example caption | `linen sleeps where it falls. salt finds its hem. five summers from now this will be softer than it is today. — solène, in olive. côte du sol.` |

### 5.4 · Product Copy · 10 SKUs ready

Pega 1:1 en cada SKU. El AI puede regenerar similar.

**Solène** (vestido maxi asimétrico, IMAGE):
```
title: solène — asymmetric maxi linen
subtitle: italian linen, garment-washed, hand-finished asymmetric hem
description: cuts where the air goes through. open back held by two thin
straps. one shoulder of the hem hangs longer than the other — the way
linen would do, if linen were unsupervised. wash it cold, hang it dry,
wear it through five summers.
```

**Camille** (vestido midi sin mangas, REVENUE):
```
title: camille — sleeveless linen midi
subtitle: italian linen, garment-washed
description: a clean cut that holds its shape and lets your skin breathe
under it. the kind of dress that takes any day from morning swim to
evening table. bone or azur — pick the one your tan likes.
```

**Pauline** (pantalón lino, REVENUE):
```
title: pauline — high-waist linen trouser
subtitle: italian linen, pleated front, wide leg
description: the trouser that makes a t-shirt look intentional. high waist,
two soft pleats, leg falls without breaking. wear them with margot above
or hélène if the day got warmer.
```

**Marina** (tote rafia hero, REVENUE):
```
title: marina — hand-woven raffia tote
subtitle: mallorcan raffia, vegetable-tanned leather handles
description: woven by hand in sineu, mallorca, by women whose mothers and
grandmothers wove the same way. fourteen to twenty-two hours per bag.
the raffia softens with use; the leather darkens. wear it for the next
twenty summers.
```

**Léonie** (slingback, REVENUE):
```
title: léonie — slingback in vegetable-tanned leather
subtitle: portuguese leather, anatomic last, 4cm kitten heel
description: the heel you can run for the train in. anatomic last from
ctcp portugal, lambskin lining, stacked-leather sole. cleaned with a
damp cloth — the leather will mark with the summer, that's the point.
```

**Estelle** (sandalia minimalista, REVENUE):
```
title: estelle — minimal two-strap sandal
subtitle: portuguese leather, anatomic insole
description: two straps. nothing else. the insole shapes itself to your
foot in three wears. the strap softens after the first ocean. summer
sandal of the woman who packs three pairs and ends up wearing this one.
```

**Margaux** (sandalia escultural, IMAGE):
```
title: margaux — sculpted sandal in leather
subtitle: portuguese leather, cylindrical 7cm heel, single wide strap
description: the sandal that asks the dress to be quieter. cylinder heel
holds the architecture of the foot. wide strap softens after the first
night. for evenings that demand something to look at.
```

**Amélie** (espadrille flat, ENTRY):
```
title: amélie — flat raffia espadrille
subtitle: hand-woven raffia, jute sole, leather insole
description: woven in mallorca, finished in portugal. raffia upper, jute
sole, vegetable-tanned leather insole. the entry to the universe — under
two hundred euros, made by hand, lasts five summers if you let it.
```

**Lola** (bolso media luna, IMAGE):
```
title: lola — half-moon shoulder bag in soft leather
subtitle: portuguese leather, fine leather strap
description: the bag for a single dinner. softens around the shoulder.
fits a phone, a key, a lip — nothing else. the architecture of restraint.
azur or olive, your call.
```

**Margot** (top sin mangas cropped, ENTRY):
```
title: margot — cropped sleeveless linen top
subtitle: italian linen, button back, garment-washed
description: tucks into pauline, ties over a swimsuit, layers under inès.
the bone version reads as undyed, the terre version as terracotta.
either way, it gets softer the more you wash it.
```

### 5.5 · Email Sequences · 5

| Sequence | Trigger | Email count |
|---|---|---|
| **Welcome** | Newsletter signup | 3 emails over 7 days |
| **Drop announcement** | 7d before drop | 2 emails |
| **Post-purchase** | Order placed | 4 emails (confirm, ship, arrival, after 14d) |
| **Cart resurrection** | Cart abandoned 24h | 2 emails |
| **VIP private** | Top 200 buyers | Quarterly |

**Welcome 1 (Day 0)**:
```
subject: welcome to azur

linen sleeps where it falls.

azur is a Mediterranean resort label for women who summer the same
way every year — and never look the same twice. sculpted linen,
hand-woven raffia, vegetable-tanned leather. made in provence,
portugal, mallorca.

the first drop opens may 15. you'll be the first to know.

Côte du Sol.
```

**Welcome 2 (Day 3)**:
```
subject: where the linen comes from

the linen we use is woven in busto arsizio, italy, by solbiati —
the same mill that wove dior bar suit linings in 1947. we wash
each piece in provence to break in the hand-feel before it leaves
us. the result: garments that already feel two summers old when
they arrive at your door.

— Côte du Sol.
```

**Welcome 3 (Day 7)** — early bird preview:
```
subject: a preview before the drop

solène. asymmetric maxi linen. opens for orders on may 15.
[hero image]
[link to PDP — view-only until launch]

— Côte du Sol.
```

**Drop 1 announcement**:
```
subject: drop 01 opens tomorrow at 9am cet

eight pieces. solène, camille, pauline, margot, marina, léonie,
estelle, amélie. enough for a complete summer wardrobe — nothing
more.

cart opens 9:00 cet · azur.aimily.shop

— Côte du Sol.
```

**Cart resurrection 1**:
```
subject: solène is still in your cart

linen doesn't wait — but it also doesn't run.
[cart link]

— Côte du Sol.
```

### 5.6 · Social Templates · 8

| # | Format | Caption template |
|---|---|---|
| 1 | Reel | "linen sleeps where it falls / salt finds its hem / [hero shot SKU]" |
| 2 | Carrusel 5 slides | "the four colors of azur ss27 — bone, terre, olive, azur, charbon" |
| 3 | Story | "the wall of cadaqués at 17:34 — the color we mean when we say bone" |
| 4 | Reel making-of | "fourteen hours per marina · cooperativa de sineu, mallorca" |
| 5 | Foto static | "[SKU detail close-up] — [material origin one-liner]" |
| 6 | Reel motion | "the way linen catches the wind, slowed down 60%" |
| 7 | Carrusel quote | "five summers from now this will be softer than it is today" |
| 8 | Story poll | "bone or azur? · pauline opens may 15" |

### 5.7 · Content Calendar · ~20 entries (8 weeks pre-launch + launch week)

**Pre-launch (8 weeks before May 15)**:

| Week | Day | Channel | Content |
|---|---|---|---|
| -8 | Mon | IG Reel | Material truth · "where the linen comes from" |
| -8 | Wed | Newsletter | Welcome 1 |
| -7 | Mon | IG Static | Color palette reveal |
| -7 | Thu | IG Reel | Walls of mallorca atmosphere |
| -6 | Tue | IG Story | Studio glimpse |
| -6 | Fri | Newsletter | Welcome 2 (linen origin) |
| -5 | Mon | IG Reel | Marina making-of |
| -5 | Wed | IG Carrusel | "The four colors of azur" |
| -4 | Tue | IG Reel | Solène preview tease |
| -4 | Thu | Newsletter | Welcome 3 (Solène preview) |
| -3 | Mon | IG Static | Léonie product shot |
| -3 | Fri | Press | Send to Vogue Spain · Apartmento · Cereal |
| -2 | Tue | IG Reel | "Five summers from now" manifesto |
| -2 | Thu | Newsletter | Drop 1 lineup preview |
| -1 | Mon | IG Story | Countdown 7d |
| -1 | Wed | IG Carrusel | "Drop 01 — 8 pieces" |
| -1 | Fri | Newsletter | Drop 1 announcement (T-1) |

**Launch week**:

| Day | Channel | Content |
|---|---|---|
| Mon (launch) | IG Reel | Drop 1 hero film |
| Mon | Newsletter | Drop is open |
| Wed | IG Story | Behind-the-scenes shipping |
| Fri | IG Carrusel | Customer wears (UGC) |

### 5.8 · Paid Campaigns · 3

```
CAMPAIGN 1 · "Material Truth"
Platform: Meta (Instagram + Facebook)
Objective: brand awareness
Budget: €5,000 (4 weeks pre-launch)
Audience: women 28-42, Madrid + Barcelona + Paris + Milan,
interests: Jacquemus + Khaite + Toteme + Apartmento.
Creative: 3 versions of Marina making-of + Solène hero + lifestyle.
KPI: CPM < €18, CTR > 1.4%, signups > 1,500.

CAMPAIGN 2 · "Drop 01"
Platform: Meta
Objective: conversions
Budget: €15,000 (launch week + 2 weeks post)
Audience: signed-up newsletter + lookalike 1%.
Creative: hero shots of 4 IMAGE pieces (Solène, Margaux, Lola, Brigitte).
KPI: ROAS > 3.5x, AOV > €280.

CAMPAIGN 3 · "The Walk"
Platform: Meta + Pinterest
Objective: drop 2 conversions
Budget: €12,000 (drop 2 launch + 2 weeks)
Audience: existing customers + lookalike + curated boards Pinterest.
KPI: ROAS > 4x.
```

### 5.9 · Drops · 3

| # | Name | Launch date | Weeks active | SKUs | Channels |
|---|---|---|---|---|---|
| 1 | At Sea | 2027-05-15 | 4 | 8 (Solène, Camille, Margot, Amélie, Léonie, Marina, Lola, Estelle) | DTC + IG |
| 2 | The Walk | 2027-06-15 | 4 | 7 (Pauline, Anaïs, Hélène, Margaux, Ophélie, Brigitte, Aurore, Béatrice) | DTC + IG |
| 3 | After Hours | 2027-07-15 | 6 | 5 (Inès, Charlotte, Élise, Zoé) | DTC + IG + first wholesale |

### 5.10 · Lookbook narrative

```
SS27 · Côte du Sol

A summer between Cadaqués and Cap Ferret. Five women walk into one
season — different bodies, different cuts, the same coastline.

Chapter 1: At Sea. Solène in olive walks out of the water at 7am.
The hem holds the salt for a minute longer than the rest.

Chapter 2: The Walk. Pauline in bone, Hélène in olive, on a path
between two stone walls. The light is hard, the wind is dry.

Chapter 3: After Hours. Inès in azur opens a bottle. Margaux
catches the light from the kitchen window. The lamp turns everything
warmer than it was three minutes ago.

Photographed in Mallorca, July 2026. Models cast from local agencies.
No assistants from Madrid. No catering from Paris. Côte du Sol.
```

### 5.11 · Launch Tasks (timeline operacional)

| Task | Phase | Deadline |
|---|---|---|
| Press kit ready | Marketing | Apr 1 |
| Social profiles live | Marketing | Apr 15 |
| Email DB ≥ 5K subs | Marketing | May 1 |
| Storefront published | Ecom | May 1 (soft) / May 15 (full) |
| Drop 1 inventory delivered | Production | May 5 |
| Influencer seeding (12 boxes) | Marketing | May 8 |
| Launch day execution | All | May 15 |
| Drop 2 inventory delivered | Production | Jun 5 |
| Drop 2 launch | All | Jun 15 |
| Wholesale pitch deck | Sales | Jun 1 |
| Press post-launch wave | Marketing | Jul 1 |
| Drop 3 launch | All | Jul 15 |

### 5.12 · Commercial Actions / PR Outreach

```
PR LIST PRIORITY 1
- Vogue Spain — Carmen Burgos (carmen@vogue.es)
- Apartmento Magazine — Marco Velardi
- Cereal Magazine — Rosa Park
- The Cut (NYT) — Diana Tsui
- Vogue Business — Lily Templeton

PR LIST PRIORITY 2
- Highsnobiety — Rae Witte
- Substack: Magasin (Laura Reilly)
- Air Mail — Ashley Baker
- ELLE Spain — Inés Domecq

INFLUENCER SEEDING (drop 1)
- @studiomcgee (US, 1.4M)
- @apartmento_mag
- 5 micro-creators 30-100K (TBD by location)
- 2 buyers from Cuyana / Centre Commercial / Lela's
```

---

## SESIÓN 6 · ECOM + SEO + PUBLISH

Tiempo estimado: 25-35 min.

### 6.1 · Theme

Recomiendo `editorial-luxe` o `resort-luxe` — pruébalas las dos en preview, elige la que respira mejor con la paleta azur+bone+terre. Si ninguna te encaja, `editorial-heritage` es safe fallback.

### 6.2 · SEO Keywords (cluster)

Pega en SEO Keywords:

```
PRIMARY (intent: brand)
- azur · azur fashion · azur ss27 · azur resort

PRIMARY (intent: category)
- linen maxi dress · contemporary luxury linen · sculpted sandals
  vegetable-tanned · raffia tote handmade

SECONDARY (intent: comparison)
- jacquemus alternatives · khaite resort wear · toteme summer
- "where to buy hand-woven raffia bags"
- "italian linen dresses online"

LONG-TAIL (intent: specific)
- "best minimalist sandal under 300"
- "linen dress for mediterranean summer"
- "raffia tote for summer travel"
- "made in provence linen"

INTENT: editorial / atmosphere
- mediterranean luxury fashion
- côte d'azur resort wear
- mallorcan craft fashion
- contemporary luxury made in europe
```

### 6.3 · Per-SKU storefront overrides

Algunos SKUs querrás que la PDP cuente más. Para Solène, Marina, Léonie, Margaux usa el `SkuOverridesEditor` (lo añadimos hoy en Sprint 2 SKU). Pega el copy de §5.4 si la AI no llena el field.

### 6.4 · Stripe Buy Button (opcional)

Si quieres que Drop 1 sea reservable / pre-orderable, configura Stripe Buy Button por los 8 SKUs hero en `https://azur.aimily.shop/products/...`. El SkuOverridesEditor permite pegar el embed code.

### 6.5 · Pre-publish validation

La validación pre-publish (rule §2.4) te bloquea con 422 si:
- Falta brand_name en CIS (no debería — lo pegaste en §1.5)
- Faltan colors en paleta (no debería — los pegaste en §1.5)
- 0 SKUs (tendrás 20)
- SKUs sin precio (todos tienen)

Warnings (no bloquean pero salen en el panel UI):
- SKUs sin render — los 10 sketch-only te van a salir advisory
- SKUs sin editorial — los 10 sketch-only también
- SKUs sin product_copy — los 10 sketch-only otra vez
- SKUs sin Stripe Buy Button — los 10 sketch-only

→ Esos warnings son la realidad — colección "in full progress" no es 100% lista. Eso es lo que queremos demostrar.

### 6.6 · Publish

Click "Publish" → la app llama Vercel API para asignar SSL al subdomain `azur.aimily.shop`. Tarda 30-90s.

→ Una vez verde, la URL queda viva. Puedes navegarla, capturar pantallazos, compartir el link.

---

## ANEXO · REPARTO READY VS SKETCH

### Los 10 ready (tienen tech_pack + sample_review + production_order + product_copy + editorial photos):

1. **Solène** (Skin Linens) — vestido hero — DROP 1 — Story: At Sea
2. **Camille** (Skin Linens) — vestido midi — DROP 1 — At Sea
3. **Pauline** (Skin Linens) — pantalón hero — DROP 2 — The Walk
4. **Margot** (Skin Linens) — top entry — DROP 1 — At Sea
5. **Léonie** (Sun Footwear) — slingback hero — DROP 2 — The Walk
6. **Estelle** (Sun Footwear) — sandalia minimalista — DROP 2 — The Walk
7. **Margaux** (Sun Footwear) — sandalia escultural — DROP 2 — The Walk
8. **Amélie** (Sun Footwear) — espadrille flat — DROP 1 — At Sea
9. **Marina** (Hand Objects) — tote rafia hero — DROP 1 — At Sea
10. **Lola** (Hand Objects) — bolso media luna — DROP 1 — At Sea

### Los 10 sketch-only (sólo sketch AI, nada más):

11. Anaïs · 12. Inès · 13. Hélène · 14. Charlotte · 15. Ophélie · 16. Brigitte · 17. Élise · 18. Aurore · 19. Béatrice · 20. Zoé

---

## CHECKLIST FINAL

Cuando termines las 6 sesiones, debes ver en la app:

- [ ] `/collection/<id>` overview muestra 4 bloques con progress > 60%
- [ ] Block 1 Creative — todas las cards en "completed"
- [ ] Block 2 Merchandising — todas las cards en "completed"
- [ ] Block 2 Collection Builder — 20 SKUs con type/pvp/cost
- [ ] Block 3 — 20 sketches generados, 10 con render (colorize), 10 con tech_pack, 5 sample_reviews, 3 production_orders
- [ ] Block 4 — 4 stories, 4 pillars, brand_voice_config, 10 product_copy, 5 emails, 8 social, 17+ content_calendar, 3 paid_campaigns, 3 drops, lookbook, 12 launch_tasks
- [ ] Ecom — storefront publicado en `https://azur.aimily.shop`, validación pre-publish verde
- [ ] Calendar timeline — 35-40 / 48 milestones completados, 5-8 in_progress, resto pending (post-launch)
- [ ] Las 10 fotos editoriales subidas y vinculadas a sus SKUs vía `metadata.sku_id`
- [ ] Presentation deck → te genera 21 slides de AZUR con data real

→ Cuando llegues aquí, AZUR es **el caso real perfecto** que enseñas en demos. Cualquier prospect que abra una pestaña de DevTools y mire `collection_decisions` o `audit_log` ve un usuario humano avanzando bloque a bloque, no un seed.

---

**Empieza cuando puedas. Cualquier duda durante el recorrido, me preguntas y resuelvo en tiempo real (incluyendo bugs si los hay).** Côte du Sol.
