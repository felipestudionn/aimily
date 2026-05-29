---
name: messaging-canonical
description: Fuente de verdad del mensaje comercial de aimily — one-liner maestro, tono (protege no sustituye), nomenclatura unificada de los 4 bloques + In-Season, las dos tecnologías. Las tres superficies (pitch Keynote, web pública, app) deben converger aquí. El pitch manda.
metadata:
  type: project
---

# Mensaje canónico de aimily — fuente de verdad

> Decisión Felipe 2026-05-29: el **pitch Keynote es el canon**. La web y la app se alinean
> hacia él, nunca al revés. Este doc resuelve las discrepancias detectadas en el cruce
> pitch ([[architecture-pitch-deck]]) ↔ web (`home.ts` + `MeetAimilyContent`) ↔ app
> (`CollectionOverview.tsx`).
>
> Master rule que gobierna todo: [[feedback_aimily-protege-no-sustituye]].

## 1 · One-liner maestro (único, en todas las superficies)

> **aimily es el asistente con memoria, conocimiento y contexto que acompaña cada paso de
> una colección — del primer briefing al lanzamiento y la venta in-season. Tú diriges y
> decides; aimily recuerda, conecta y te propone. Nunca decide por ti.**

- Tagline corta (web hero + app): **"Plan, design, and launch your fashion collection."** ✅ ya coherente entre web y app — mantener.
- Gancho permitido en web: el ángulo *Devil Wears Prada / Emily → aimily* sirve como **hook**, no como tesis del producto. Refuerzo, igual que en el pitch.

## 2 · Tono (LOCKED — el punto que la web viola hoy)

| | Verbo correcto | Verbo PROHIBIDO |
|---|---|---|
| Sujeto = aimily | recuerda · conecta · propone · acompaña · cuida la visión | ❌ genera · diseña · produce · hace · decide · sustituye |
| Sujeto = persona | diriges · decides · creas · eliges | — |

- **Pitch ✅** — "Que me propusiera. No que decidiera por mí." / "el talento, donde aporta — aimily, en todo lo demás."
- **App ✅** — "AI **proposes** A/B/C scenarios" + verbos imperativos al usuario.
- **Web ❌ (a corregir)** — hoy dice *"aimily does it in seconds"*, *"Generates moodboards. Builds range plans. Drafts campaigns."*, *"aimily does it too"* en los 9 idiomas de `home.ts`. **Pendiente de reescritura** hacia "tú diriges, aimily recuerda y propone".

## 3 · Las dos tecnologías (deben aparecer en las tres superficies)

> **Dos tecnologías, un solo flujo.**
> - **Fashion Knowledge Engine** — el conocimiento. 16 roles, 360º.
> - **Context Intelligence Layer** — la memoria (CIS). Conecta los bloques para que nada se pierda.

- **Pitch ✅** — es la espina dorsal (slides 9–11).
- **Web ❌** — las menciona **0 veces**. Pendiente: añadir un bloque "Dos tecnologías" para que el diferenciador defendible sea visible al usuario.
- **App** — el CIS existe en código; no se nombra al usuario (aceptable, pero no contradecir).

## 4 · Nomenclatura unificada de bloques (canon = pitch)

| # | Canon ES (pitch) | Canon EN | Web hoy | App hoy | Acción |
|---|---|---|---|---|---|
| 01 | Dirección Creativa y Tendencias | Creative Direction & Trends | Creative & Brand | Creative Direction & Brand | unificar "& Brand" vs "& Trends" |
| 02 | Estructura de Colección y Compras | Collection Structure & Buying | Merchandising | Merchandising & Planning | alinear etiqueta |
| 03 | Diseño, Desarrollo y Selección | Design, Development & Selection | Design & Development | Design & Development | añadir "& Selection" |
| 04 | Marketing y Lanzamiento | Marketing & Launch | Marketing & Launch | Marketing & **Sales** | decidir Launch vs Sales |
| Extra | Bloque Extra · In-Season Sales | Extra block · In-Season Sales | "Block 5 · the loop closes" | producto separado `/in-season` | unificar **estatus** de In-Season |

**In-Season — un solo estatus:** es el **bloque extra / loop de cierre** del aimily 360 (no "Block 5" a secas, no producto desconectado). "Cada venta es una semilla; cada semilla, la próxima colección." Es el puente Block-Extra → Block-01.

### Sub-bloques canónicos (pitch, 4 por bloque)
- **01 Creativa:** Moodboard · Cliente · Investigación de Mercado · Identidad de Marca
- **02 Compras:** Estrategia de Compra · Familias y Precios · Canales y Mercados · Presupuesto y Margen
- **03 Diseño:** Boceto y Color · Ficha Técnica · Prototipado · Producción
- **04 Marketing:** Estrategia de Ventas · Lanzamiento al Mercado · Content Studio · Comunicación
- **Extra In-Season:** Análisis de Venta · Propuesta de Acciones · Ejecución de Acciones · Creación de Semillas

> La app añade un 5º card "output" por bloque (Creative Overview / Collection Builder / Final
> Selection / Ecom). No es contradicción — es profundidad de producto. Mantener, pero que la
> web/pitch no impliquen que solo hay 4 si la app enseña 5.

## 5 · Datos fijos (parar de divergir)

- **Excels:** la cifra canónica es la del pitch. Hoy pitch dice "15 archivos de Excel", web dice "14 spreadsheets". **Fijar una sola** (recomendado: la del pitch) y usarla en ambas.
- Resto de stats del pitch ("20 presentaciones, 10 equipos, 25 reuniones, 8 versiones del calendario") pueden vivir en la web sin contradicción si se citan igual.

## 6 · Reparto por audiencia (esto SÍ puede variar, el núcleo NO)

- **Pitch** (inversor/CTO): vende el **cómo** — arquitectura, las dos tecnologías, defensa metodológica, In-Season como loop.
- **Web** (usuario): vende el **qué/resultado** — velocidad, output, ahorro — pero respetando tono §2 y citando las dos tecnologías §3.
- **App** (usuario activo): instrucción funcional, neutral.

El **núcleo invariante** en las tres: qué es aimily (§1), qué NO hace (§2), las dos tecnologías (§3), los nombres de bloques (§4).

## Pendientes derivados
- [x] **Reescribir tono de `src/i18n/home.ts` × 9 idiomas** (2026-05-29) — quitado "aimily does/generates/builds/drafts/produces/turns" + pasivos "generated by aimily". 135 líneas, 15 claves × 9 locales: `meet.subtitle`, `silogism.titleB(+italic)/aimilyText/aimilyCaption`, `thread.captionEnd`, `block1.description/consumerCaption`, `block2.description/captionFooter`, `block3.description`, `block4.description`, `poweredBy.subtitle/optionACaveat/photoshootCaveat`. Verbos nuevos: aimily *recuerda · conecta · propone · acompaña*; la persona *dirige · decide · ajusta · aprueba*. Ganchos (Emily, "You need aimily") y micro-labels de UI mock (eyebrows "Moodboard generated") preservados a propósito.
- [ ] Añadir bloque "Dos tecnologías" a la web.
- [ ] Unificar etiquetas de bloque + estatus de In-Season en web/app.
- [ ] Fijar cifra de Excels y one-liner maestro en web + app.
- [ ] (Opcional) Publicar `[INFO]` en gbrain `aimily-events` para que StudioNN marketing siga este canon.
