# aimily FAQ — biblia de soporte

Cada `##` es un chunk independiente del bot. Al editar este archivo, ejecuta
`set -a && source .env.local && set +a && npx tsx scripts/ingest-faq-docs.ts`
para refrescar.

Datos verificados contra `src/lib/stripe.ts`, i18n legal pages, código real
del producto, y MEMORY.md a fecha 2026-05-02.

---

## Qué es aimily

aimily es la plataforma que cubre el ciclo completo de una colección de moda
o calzado en un solo producto: Creative & Brand → Merchandising → Design &
Development → Marketing & Digital. Sustituye el flujo "Excel + Keynote +
agencia creativa + tech-pack en Illustrator" por un único entorno con IA que
aprende tu marca y mantiene contexto de bloque en bloque. Construido por
StudioNN Agency S.L. (NIF B42978130, Alicante, España).

## Para quién es aimily

aimily está pensado para fundadores y equipos pequeños de marcas de moda y
calzado que quieren operar con la calidad de una marca grande sin la
estructura. Los clientes típicos son: marcas DTC en su segunda o tercera
colección, diseñadores independientes que lanzan drops estacionales, equipos
de wholesale que necesitan presentar tech packs y range plans profesionales
sin contratar agencia. Si llevas más de 50 SKUs simultáneos o tienes equipo
> 25 personas, vete directo al plan Professional Max o Enterprise.

## Para quién NO es aimily

aimily NO es un ERP, no gestiona inventario en tiempo real, no es un PIM, no
hace bookkeeping ni facturación a clientes finales. Tampoco es un PLM
empresarial estilo Centric o Lectra — los procesos están simplificados para
marcas que iteran rápido, no para corporates con 50 capas de aprobación.

## Los cuatro bloques

aimily organiza el trabajo en cuatro bloques. **Creative & Brand**: vision
de la colección, consumer definition, brand DNA, moodboard, market research.
**Merchandising**: buying strategy con escenarios, familias y pricing, range
plan, distribution por canal y mercado, financial plan pre-business plan.
**Design & Development**: concept boards, sketches, color & materials, 3D
render, tech packs A3 con pin comments, prototyping, production tracking,
final selection. **Marketing & Digital**: sales dashboard con KPIs en tiempo
real, content studio (e-commerce, still life, editorial, campaign con modelos
aimily), communications (copy, social, email, brand voice, SEO), point of
sale (web store + wholesale).

## Cómo me registro y cuánto dura el trial

Vas a aimily.app, click en "Sign up", email + contraseña, confirmas el email
y entras. El **trial es gratuito y arranca con 200 imagery credits** (suficiente
para experimentar con un drop pequeño). No requiere tarjeta. El trial no
expira por tiempo — expira cuando agotas tus 200 imagery credits o cuando
decides upgrade. El trial incluye: colecciones ilimitadas, 1 usuario, export
habilitado, generación de texto AI ilimitada (Claude/Gemini son baratos
tirando), pero NO incluye AI video.

## Cuánto cuesta aimily — planes exactos

Cinco planes. Precios mensuales y entre paréntesis el precio mensualizado si
pagas anual:

- **Trial**: €0. 200 imagery / 1 usuario / sin video AI. Sin tarjeta.
- **Starter**: **€199/mes** (€159 si anual). 200 imagery / 1 usuario / sin video AI.
- **Professional**: **€599/mes** (€479 si anual). 1.000 imagery / 5 usuarios / video AI ✓.
- **Professional Max**: **€1.499/mes** (€1.199 si anual). 5.000 imagery / 25 usuarios / video AI ✓.
- **Enterprise**: desde **€3.000/mes** custom. Imagery ilimitado / usuarios ilimitados / video AI / API access / SSO.

Colecciones siempre ilimitadas en todos los planes. Generación de texto AI
ilimitada en todos los planes. Todos los planes usan los mismos modelos AI
top-tier — la diferenciación es por cantidad (imagery + seats), nunca por
calidad ni por feature gating que limite la creatividad.

## Qué cuenta como "imagery" para la cuota

Imagery = generaciones de imagen o video con IA que cuestan dinero al
proveedor. Cuenta cada llamada a: sketch generation, colorize, 3D render,
still-life, try-on, brand-model, brand-references, editorials, y video Kling.
La generación de TEXTO (briefs, copy, narrativas, prompts, planeación) NO
cuenta — Claude Haiku y Gemini son baratos tirando ($0.001-$0.008 por
llamada) y no hace sentido limitarlos.

## Aimily Credits — qué son y cuánto cuestan

Si te quedas sin imagery a media colección, en lugar de upgrade puedes
comprar packs de Aimily Credits one-time (no caducan, se acumulan):

- **+50 imagery**: €29
- **+250 imagery**: €119
- **+1.000 imagery**: €399

Los packs son deliberadamente más caros por imagery que el siguiente plan
tier — si llevas dos o tres meses comprando packs, te sale a cuenta hacer
upgrade del plan en lugar.

## Aimily Credits no caducan

Los Aimily Credits comprados en packs son permanentes y se acumulan a tu
cuota mensual del plan. Si tienes Starter (200 imagery/mes) y compras un
pack de +250, ese mes tienes 450 disponibles. Si gastas solo 300, los 150
restantes del pack se quedan para el mes siguiente. Lo único que se renueva
mensualmente es la cuota del plan, no los packs.

## Cómo cancelo mi suscripción

En aimily.app/account → "Manage subscription" → "Cancel subscription". Te
lleva al Stripe Customer Portal. Tu plan sigue activo hasta el final del
periodo pagado. Después pasas a plan trial automáticamente y conservas tus
colecciones (no se borran). Cancelar **no tiene tarifas**.

## Garantía de devolución 7 días

Si dentro de los **primeros 7 días** después de tu primer cobro decides que
aimily no es lo tuyo, escríbenos a hello@aimily.app y procesamos reembolso
íntegro. Después del día 7 no se reembolsan periodos parciales — la
cancelación detiene los próximos cobros pero el periodo en curso ya no se
devuelve. Tu derecho UE de 14 días para servicios no usados (Directiva
2011/83/UE) sigue aplicando además.

## Cómo cambio de plan

En aimily.app/account → "Change plan". El cambio es prorrateado
automáticamente por Stripe — pagas la diferencia hoy y el siguiente ciclo
ya entra el nuevo plan. Subir de plan es inmediato. Bajar de plan se aplica
al final del periodo pagado actual.

## Cómo cambio entre mensual y anual

Mismo sitio: aimily.app/account → "Change billing cycle". Cambiar a anual
te aplica el descuento (~20% sobre 12 meses) inmediatamente con prorrateo.
Cambiar de anual a mensual se aplica al final del año pagado actual.

## Métodos de pago aceptados

Stripe gestiona todo el cobro. Aceptamos tarjetas (Visa, Mastercard, Amex,
Discover), Apple Pay, Google Pay, Link, y SEPA Direct Debit para clientes
EU. Wire transfer y facturación neta solo en Enterprise.

## Aimily entrena con mis datos

**No.** Tus colecciones, briefs, SKUs, imágenes generadas, conversaciones
y prompts nunca se usan para entrenar modelos. Cada llamada a Claude
(Anthropic), OpenAI, Freepik o Perplexity se hace con tu contexto solo.
Los proveedores tienen contratos enterprise de no-retención: Anthropic
zero-data-retention para nuestro tier, OpenAI zero-retention con la API
business, Freepik según sus términos de partner.

## Quién es dueño del contenido generado

Tú. Todo lo que generas con aimily basado en tus inputs (briefs, imágenes,
copy, presentaciones, tech packs, sketches, renders) es tuyo y puedes usarlo
comercialmente sin límite. aimily no reclama derechos sobre tu output.
Política completa en aimily.app/terms.

## Mis datos están seguros

aimily corre en infraestructura europea: Supabase Pro (Postgres en EU
central, 7 días de daily backups) y Vercel (regiones EU). Cifrado en
tránsito TLS 1.2+ y en reposo. Row Level Security per-user en todas las
tablas. Los assets de tu colección viven en Storage privado con signed
URLs (papelera 30 días para recuperación tras borrado accidental).
Cumplimos GDPR (UE) + LOPDGDD (España) + CCPA/CPRA (California) + LGPD
(Brasil). Política de privacidad completa en aimily.app/privacy.

## Cómo borro mi cuenta y todos mis datos

En aimily.app/account → "Delete account", o escribiendo a privacy@aimily.app.
Borramos: tu cuenta, todas tus colecciones, todos los assets en Storage,
todo tu historial de generación AI. Las facturas de Stripe se conservan
los 7 años legalmente requeridos en España por obligación fiscal pero ya
no quedan vinculadas a un usuario activo y no son consultables desde el
producto.

## Tengo equipo, ¿pueden colaborar?

Sí. **Professional** permite hasta 5 colaboradores. **Professional Max**
hasta 25. **Enterprise** ilimitado. Cada colaborador entra con su propio
email + contraseña. Todos los cambios quedan registrados en un audit log
con quién hizo qué y cuándo. Permisos por bloque (Creative, Merchandising,
Design, Marketing) — un colaborador de marketing no puede tocar el tech
pack si no se le ha dado acceso.

## En qué idiomas funciona

aimily está completamente traducido a **9 idiomas**: inglés, español,
francés, italiano, alemán, portugués, holandés, sueco, noruego. La interfaz,
las páginas legales (privacy/terms/cookies), y la generación AI responden
todas en el idioma de tu cuenta. Puedes cambiar de idioma en cualquier
momento desde el sidebar.

## Funciona en móvil

aimily está optimizado para **desktop ≥ 1440px**. Razón: el trabajo creativo
de una colección (range plan, tech pack, presentation) se hace en pantalla
grande. En móvil puedes ver tu dashboard, revisar contenido, leer
notificaciones — pero la generación intensiva (Collection Builder con flip
cards, Tech Pack con pin comments, Presentation con 21 slides) está pensada
para pantalla grande.

## Qué modelos AI usa aimily

- **Texto**: Claude Haiku 4.5 (Anthropic) primario · Gemini Flash (Google)
  como fallback automático · Perplexity Sonar para búsquedas web en vivo.
- **Imágenes diseño** (sketch generation, colorize, 3D render): OpenAI
  gpt-image-1.5.
- **Imágenes editorial con modelo** (face fidelity): GPT Image 1.5.
- **Imágenes comerciales sin modelo** (still life, try-on, editorial sin
  modelo, brand references): Freepik Nano Banana.
- **Modelos aimily** (28 modelos sintéticos, 14 mujeres + 14 hombres):
  Flux 2 Pro vía Freepik.
- **Video**: Freepik Kling 2.1 Pro (10s clips).

Todos los planes usan los mismos modelos top-tier. Sin "AI cheap" en planes
bajos.

## Qué son los Aimily Models

28 modelos sintéticos generados con IA que aimily mantiene como roster
oficial — 14 mujeres y 14 hombres con biotipos, edades y estilos diferentes.
Los usas en editoriales y campaign para mantener consistencia entre drops
sin contratar modelos reales. Cada modelo tiene su headshot fijo que se
usa como referencia de identidad facial. La cara se preserva entre
generaciones (face fidelity gracias a GPT Image 1.5). Disponibles en
Content Studio.

## Qué es un drop

Un drop es un mini-lanzamiento dentro de una colección — un grupo de SKUs
que sale al mercado con su propia narrativa, fecha y materiales de
marketing. aimily soporta de 1 a 4 drops por colección por temporada.
Cada drop tiene su Sales Dashboard, su content calendar y sus piezas
campaign independientes.

## Qué es un Tech Pack en aimily

Es la ficha técnica de cada SKU lista para enviar a fábrica. Incluye:
medidas con cuotas detalladas, BOM (bill of materials) por componente,
zonas de material identificadas sobre el 3D render, anotaciones tipo "pin"
con comentarios y referencia a posición exacta sobre la imagen, sustitutos
sugeridos. Export a A3 landscape PDF con todas las pins numeradas en
leyenda. Compatible con flujos de fabricación europeos y asiáticos.

## Qué es CIS — Collection Intelligence System

CIS es la base de datos donde aimily guarda cada decisión que tomas sobre
tu colección — vibe, consumer, brand DNA, escenarios de merchandising,
SKUs, tech packs, plan de marketing. Cada decisión se versiona y todas
las llamadas AI usan ese contexto. Significa: no tienes que repetir tu
marca en cada prompt, todo el sistema sabe que eres una marca de calzado
italiano de gama media DTC con voz editorial calmada — y responde
coherentemente bloque tras bloque.

## Qué hace la Presentation

Es una keynote interactiva de 21 slides que aimily genera automáticamente
desde tu CIS. 10 themes editoriales para elegir (Editorial Heritage,
Streetwear Drop, Romantic Feminine, Minimal Architect, Performance Tech,
Avant-Garde Concept, Sustainable Craft, Y2K Digital Native, Workwear
Heritage, Resort Luxe). Export a PDF A4 landscape (~3-5 segundos). Share
link público de solo-lectura para enseñarla a inversores o retailers sin
darles acceso a tu cuenta. Edición inline directamente sobre los slides
sin tocar la AI.

## Qué hace el Sales Dashboard

KPIs de tu colección en tiempo real: revenue total esperado, units totales
por drop, average price, gross margin estimado, top stories comerciales,
calendario de drops. Recharts para visualización. Datos calculados
desde tus SKUs reales (buy_units × sell_pct/100 × pvp), no inventados.

## Qué incluye Content Studio

Pipeline de imagen comercial por SKU en cuatro niveles: e-commerce shot
(producto solo fondo blanco), still life (producto en escena), editorial
(producto + modelo aimily o tu referencia), campaign (concept con
narrativa). Picker de modelo aimily integrado. Brand references con
visual identity images. Export en alta resolución.

## Qué hace Communications

Copy comercial por canal y formato: producto descriptions, social posts,
email sequences (welcome, abandoned cart, post-purchase, re-engagement),
brand voice generator, SEO meta tags. Todo en el idioma y voz de tu marca
gracias al CIS.

## Qué hace Point of Sale

Wholesale order management (CRUD pedidos B2B con tech-pack adjunto y
exportable a PO Excel). Web store es Shopify-integrado en Phase 2 (no
disponible aún en producción).

## Existe API pública

Sí, pero solo en plan **Enterprise** (apiAccessEnabled: true). Los planes
self-serve (Trial/Starter/Professional/Pro Max) no tienen API access.
Para Enterprise el acceso API se configura caso por caso con tu cuenta.

## Tenéis SSO

Solo en plan **Enterprise**. SSO via SAML/OAuth para integrar con tu
identity provider corporativo (Google Workspace, Microsoft Entra ID, Okta).
Los planes self-serve usan email + contraseña con Supabase Auth (que
internamente sí soporta passwordless OTP, magic link y MFA por TOTP).

## Cómo cambio mi email

aimily.app/account → "Change email". Por seguridad anti-account-takeover,
el cambio requiere doble confirmación: te enviamos un enlace al email
viejo y otro al nuevo. Ambos tienen que confirmarse para que el cambio
se aplique. Es la práctica industrial estándar (NIST 800-63B).

## Cómo cambio mi contraseña

aimily.app/account → "Change password". Requiere meter la contraseña
actual + la nueva (mínimo 8 caracteres). aimily verifica que tu contraseña
nueva no aparezca en bases de datos públicas de leaks (HaveIBeenPwned)
antes de aceptarla — protección contra credential stuffing.

## Olvidé mi contraseña

aimily.app/auth/forgot-password — metes tu email, te llega un magic link
(válido 1 hora) para resetear. Si no te llega en 5 minutos: revisa spam,
verifica que el email es el correcto, escríbenos a hello@aimily.app.

## Cómo invito a un colaborador

aimily.app/account → "Team" → "Invite". Metes su email, eliges su rol
(Owner, Editor, Viewer) y los bloques a los que tiene acceso (Creative,
Merchandising, Design, Marketing). El invitado recibe email para
registrarse o aceptar (si ya tiene cuenta aimily). Disponible en
Professional (5 seats), Pro Max (25), Enterprise (ilimitado).

## Cómo contacto al equipo

- **Soporte general**: hello@aimily.app
- **Privacidad / GDPR / borrar cuenta**: privacy@aimily.app
- **Legal / términos**: legal@aimily.app
- **Seguridad / vulnerabilidades**: security@aimily.app
- **Empresa**: StudioNN Agency S.L., Alicante, España

Respondemos dentro de **un día laborable**. Para temas de pago,
cancelación o refund el camino más rápido es escribir a hello@aimily.app
con el subject "Billing".

## Quién está detrás de aimily

aimily es un producto de **StudioNN Agency S.L.** (NIF B42978130), una
agencia creativa con sede en Alicante, España. Felipe Martínez es el
fundador. El producto nació de la frustración con el flujo "Excel +
Keynote + Illustrator + agencia" en proyectos de marca de moda y
pretende reemplazar todo eso con un único entorno con IA.

## Aimily reporta vulnerabilidades de seguridad

Si descubres una vulnerabilidad de seguridad, escríbenos a
security@aimily.app con descripción y reproducción mínima. No la
publiques antes de que tengamos tiempo de mitigar (responsible
disclosure 90 días estándar). Reconocemos públicamente reporters
serios en nuestra página de seguridad si lo desean.

## Aimily ofrece factura

Sí. Cada cobro de Stripe genera una factura PDF descargable desde
aimily.app/account → "Billing" → "Invoices" o desde el Stripe Customer
Portal. Las facturas llevan tu nombre fiscal (puedes meterlo en
account → "Billing details") y NIF/VAT. Para clientes UE con NIF
intracomunitario válido aplicamos reverse charge automáticamente.

## Mi NIF/VAT no se reconoce

Stripe valida los VAT EU vía VIES en tiempo real. Si tu NIF no se
reconoce: verifica que está activo en https://ec.europa.eu/taxation_customs/vies,
revisa que metiste el código de país correcto (ES, FR, DE…) sin
espacios, y si todo está bien escríbenos a hello@aimily.app — algunos
NIF tardan 24-48h en propagar al sistema VIES.

## Cómo descargo una factura

aimily.app/account → "Billing" → busca el cobro → "Download invoice".
También puedes ir al Stripe Customer Portal desde el mismo sitio y
descargar todas las facturas históricas en un click.

## Stripe me cobró pero no veo mi plan activo

Razón típica: el webhook entre Stripe y aimily tardó unos segundos en
sincronizar. Refresca aimily.app/account después de 30 segundos. Si en
2 minutos sigue sin verse el plan, escríbenos a hello@aimily.app con tu
email + el ID del cobro Stripe (lo ves en el email de confirmación de
Stripe) y lo arreglamos manualmente en minutos.

## Aimily se cae alguna vez

aimily corre en Vercel (uptime ~99.99% histórico) y Supabase Pro (SLA
99.9%). Si hay incidentes los publicamos en /trust o vía email. Los
backups se hacen automáticamente: 7 días de daily backups Postgres +
papelera Storage de 30 días. Si pierdes algo por error humano lo
recuperamos.

## Mi colección pesa mucho — hay límite de Storage

Cada usuario tiene Storage práctico ilimitado dentro del coste
operacional razonable. Imagery generada se almacena en Supabase Storage
privado. Si subes un montón de assets manualmente y rebasas 50GB
escríbenos para revisar — no pasa nada, simplemente lo conversamos.

## Aimily tiene blog o roadmap público

No tenemos blog público activo todavía. Para roadmap: lo que ves en el
producto es lo que está en producción. Decisiones de roadmap futuro las
discutimos con clientes Pro Max y Enterprise individualmente. Si tienes
una request de feature, escríbenos a hello@aimily.app — escuchamos a
clientes activos por encima de cualquier hype externo.

## Puedo probar aimily antes de pagar

Sí — el plan Trial es gratuito, sin tarjeta, y arranca con 200 imagery
credits. Suficiente para experimentar con un drop pequeño y ver si el
producto encaja con tu flujo. Si te gusta, upgrade. Si no te gusta, no
hay que hacer nada — el trial no se renueva ni te cobra.

## Aimily integra con Shopify / WooCommerce

**Hoy no.** Point of Sale tiene placeholder para web store integration.
Shopify nativo está en Phase 2 del roadmap. Mientras tanto el producto
exporta range plan + tech packs a Excel/PDF que puedes importar
manualmente a tu plataforma de e-commerce.

## Aimily integra con Google Drive / Notion

**Hoy no nativamente.** Puedes exportar a PDF/Excel y subir manualmente
a tu Drive/Notion. Para clientes Enterprise hacemos integraciones
custom previa conversación.

## Diferencia entre Starter y Professional

**Starter (€199/mes)**: 1 usuario, 200 imagery/mes, sin video AI. Perfecto
para fundador solo con 1-2 colecciones por año.

**Professional (€599/mes)**: 5 usuarios, 1.000 imagery/mes, video AI ✓.
El step natural cuando empieza a haber equipo o cuando 200 imagery se
quedan cortos en una colección. Video AI permite generar piezas tipo
Kling 10s para social.

## Diferencia entre Professional y Professional Max

**Professional (€599/mes)**: 5 usuarios, 1.000 imagery/mes, video AI.

**Professional Max (€1.499/mes)**: 25 usuarios, 5.000 imagery/mes, video
AI, Tech Pack avanzado con pin comments + suppliers/factories directories,
Presentation con share links públicos, SLA mejorado. Para equipos
medianos que producen 4 colecciones por año o más.

## Por qué Pro Max no incluye API ni SSO

API y SSO están reservados a Enterprise porque requieren onboarding
técnico (configurar SAML, audit logs federados, SLA con penalización
económica) y soporte dedicado. Si necesitas API o SSO escríbenos a
hello@aimily.app para una conversación Enterprise — los precios
arrancan en €3.000/mes y son negociables según volumen.

## Tenéis prueba en directo / demo

Sí. Escribe a hello@aimily.app con subject "Demo" y agendamos una
videocall de 30 minutos donde te enseñamos el producto con una
colección real (AZUR · SS27, generada por aimily de principio a fin) y
respondemos preguntas. Sin compromiso.

## Aimily funciona offline

No. aimily es una webapp y necesita conexión para todo (la mayor parte
del valor viene de la generación AI, que es server-side). Lo que sí
puedes hacer offline es revisar PDFs ya descargados (tech packs,
presentations, range plans).

## Qué pasa si cancelo y vuelvo después

Si cancelas tu suscripción, conservas tus colecciones y assets — pasas
a plan Trial automáticamente con la cuota que tengas restante. Cuando
quieras volver, simplemente upgrade desde aimily.app/account y
reactivas tu plan anterior con todo intacto.

## Cómo es el flujo de una colección típica

1. **Creative**: defines vibe, consumer, brand DNA, moodboard, market
   research → aimily aprende tu marca.
2. **Merchandising**: configuras buying strategy con escenarios,
   familias y precios, distribution por canal/mercado, financial plan
   → aimily genera el range plan completo.
3. **Design**: aimily genera concept boards y sketches → tú eliges →
   colorize y 3D render → tech pack listo para fábrica.
4. **Marketing**: aimily genera el sales dashboard con tus números, el
   content studio con visuals comerciales, el communications kit
   completo, y la presentation final lista para inversores o retailers.

Tiempo realista de una colección de 30 SKUs en aimily: **2 a 5 días** vs
6-12 semanas con flujo tradicional.

## Qué hago si encuentro un bug

Escríbenos a hello@aimily.app con el subject "Bug" + descripción de qué
hiciste, qué esperabas, qué viste. Si puedes adjuntar screenshot o ID
de colección mejor. Respondemos en un día laborable. Bugs que bloquean
trabajo de un cliente activo suben a la cola top.

## Aimily es certificado SOC 2 / ISO 27001

**Hoy no.** Para clientes Enterprise que requieren certificación
formal: estamos en proceso (audit de SOC 2 Type I previsto Q4 2026).
Mientras tanto cumplimos los controles equivalentes (cifrado TLS,
RLS, audit log, MFA opcional, backups automatizados, daily security
advisor a cero) y firmamos DPA personalizado con clientes Enterprise.

## Cuál es la postura de aimily sobre AI ethics

Tres principios que aplicamos hoy: **(1)** la cara de modelos aimily
es 100% sintética — no clonamos cara de personas reales sin consentimiento
explícito. **(2)** las imágenes generadas con referencias proporcionadas
por el usuario pasan face-blur preprocesado para evitar clonado facial
accidental. **(3)** copy generado lleva disclaimer "AI content needs
human review" en exports (PDF, share links) cuando aplica — la decisión
editorial final es tuya.

## Aimily soporta marcas con producto sostenible

Sí. El bloque Creative incluye mood-board y brand DNA para sostenibilidad.
El tech pack soporta materiales reciclados y certificaciones (GOTS, GRS,
LWG, etc.) en el BOM. La presentation tiene un theme "Sustainable Craft".
No tenemos features específicos de huella de carbono o LCA hoy.

## Tengo una idea de feature, ¿cómo la propongo

Escríbenos a hello@aimily.app con subject "Feature request" + caso de
uso real (no "estaría bien tener X" — mejor "en mi flujo X pasa esto y
me gustaría que aimily hiciera Y"). Las features que vienen de fricción
real de clientes activos suben rápido. Las que vienen de "y si tuviera"
sin caso de uso van más lento.

## Por qué aimily existe

Porque construir una colección de moda requiere coordinar 5-7
herramientas (Excel, Keynote, Illustrator, Figma, Notion, agencia
externa) y la información se pierde entre saltos. aimily mantiene una
sola fuente de verdad (CIS) que aprende tu marca y la usa coherentemente
de bloque en bloque. El resultado: misma calidad o mejor que el flujo
tradicional, en una fracción del tiempo, sin perder coherencia de marca.
