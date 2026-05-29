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

> **Decisión Felipe 2026-05-29 sobre los forks de etiqueta:** bloque 01 = **Brand** (no "Trends"); bloque 04 = **Sales** en la app (la web puede mantener "Launch" — superficie distinta, ambas válidas). Los labels actuales se quedan; **no son contradicción, son variantes de énfasis**. No re-abrir.

| # | Web | App | Estado |
|---|---|---|---|
| 01 | Creative & Brand | Creative Direction & Brand | ✅ **Brand** (resuelto). Variación corta/larga aceptable. |
| 02 | Merchandising | Merchandising & Planning | Variación corta/larga aceptable. |
| 03 | Design & Development | Design & Development | ✅ coinciden. |
| 04 | Marketing & Launch | Marketing & **Sales** | ✅ app=**Sales**, web="Launch" — ambas OK. |
| Extra | "In-Season · the loop closes" / "el bloque extra que cierra el bucle" | producto `/in-season` | ✅ framing "bloque extra/loop" unificado en web (quitado "Block 5"). |

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

- **Excels:** ✅ fijada a **15** (canon pitch) en la web (2026-05-29) — `problem.titleItalic` ×9, `studionn.p1` ×9 y el stat hardcodeado en `MeetAimilyContent.tsx`.
- Resto de stats del pitch ("20 presentaciones, 10 equipos, 25 reuniones, 8 versiones del calendario") pueden vivir en la web sin contradicción si se citan igual.

## 6 · Reparto por audiencia (esto SÍ puede variar, el núcleo NO)

- **Pitch** (inversor/CTO): vende el **cómo** — arquitectura, las dos tecnologías, defensa metodológica, In-Season como loop.
- **Web** (usuario): vende el **qué/resultado** — velocidad, output, ahorro — pero respetando tono §2 y citando las dos tecnologías §3.
- **App** (usuario activo): instrucción funcional, neutral.

El **núcleo invariante** en las tres: qué es aimily (§1), qué NO hace (§2), las dos tecnologías (§3), los nombres de bloques (§4).

## Pendientes derivados
- [x] **Traducir a 7 idiomas** `poweredBy.subtitle` / `optionACaveat` / `photoshootCaveat` (2026-05-29) — estaban en inglés heredado; ahora fr/it/de/pt/nl/sv/no traducidos. Tono completo en los 9.
- [x] **Bloque "Dos tecnologías" en la web** (2026-05-29) — sección nueva entre "el problema" y "pull the thread" en `MeetAimilyContent.tsx` + namespace `tech` (en+es, opcional como block5). Hace visible al usuario el diferenciador del pitch: Fashion Knowledge Engine + Context Intelligence Layer.
- [x] **Estatus In-Season** unificado en la web (2026-05-29) — quitado el numerado "Block 5/Bloque 5" en `loopCaption`/`seedsBody`; ahora "el bloque extra que cierra el bucle" (alineado con el pitch "Bloque Extra").
- [x] **Cifra de Excels** fijada a 15 (ver §5).
- [x] **Etiquetas de bloque 1-4** (2026-05-29) — RESUELTO por Felipe: bloque 1 = Brand; bloque 4 = Sales (app) / Launch (web), ambas válidas. Sin cambios en código: variantes de énfasis, no contradicción. Ver tabla §4.
- [ ] **one-liner maestro** único fijado en web + app (§1 propuesto, sin aplicar a un slot concreto todavía). (2026-05-29) — quitado "aimily does/generates/builds/drafts/produces/turns" + pasivos "generated by aimily". 135 líneas, 15 claves × 9 locales: `meet.subtitle`, `silogism.titleB(+italic)/aimilyText/aimilyCaption`, `thread.captionEnd`, `block1.description/consumerCaption`, `block2.description/captionFooter`, `block3.description`, `block4.description`, `poweredBy.subtitle/optionACaveat/photoshootCaveat`. Verbos nuevos: aimily *recuerda · conecta · propone · acompaña*; la persona *dirige · decide · ajusta · aprueba*. Ganchos (Emily, "You need aimily") y micro-labels de UI mock (eyebrows "Moodboard generated") preservados a propósito. Los 3 keys que quedaban en inglés (`poweredBy.subtitle`/`optionACaveat`/`photoshootCaveat`) traducidos a los 7 idiomas restantes en un follow-up el mismo día.
- [ ] Añadir bloque "Dos tecnologías" a la web.
- [ ] Unificar etiquetas de bloque + estatus de In-Season en web/app.
- [ ] Fijar cifra de Excels y one-liner maestro en web + app.
- [ ] (Opcional) Publicar `[INFO]` en gbrain `aimily-events` para que StudioNN marketing siga este canon.
