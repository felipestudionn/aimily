# aimily FAQ — knowledge base seed

Hand-curated Q&A used to bootstrap the FAQ bot. Each `##` heading is a separate
chunk in the vector store. Add new entries here and re-run
`scripts/ingest-faq-docs.ts` to refresh.

---

## Qué es aimily

aimily es una plataforma para marcas de moda que cubre el ciclo completo de una
colección — Creative & Brand, Merchandising, Design & Development, y Marketing
& Digital. La construyó StudioNN Agency S.L. (NIF B42978130) en Alicante, España.
Ayuda a planificar, diseñar, lanzar y comunicar drops y temporadas con ayuda de
IA, sustituyendo el flujo "Excel + presentación + agencia creativa" por un único
producto.

## Cómo me registro

Ve a aimily.app, click en "Sign up" o "Create account". Solo necesitas email
y contraseña. Después confirmas el email y ya estás dentro. Tu primera colección
se llama "trial" y puedes generar contenido AI hasta agotar la cuota gratuita
(7 días con créditos limitados). Si no te gusta, cancelas sin coste antes del
día 7.

## Cuánto cuesta aimily

Los planes públicos están en aimily.app/pricing. Hay tres planes principales —
Starter, Professional, Pro Max — con cuotas de imagery distintas. Además hay
packs de créditos (50/250/1000) que se compran independientemente del plan y
no caducan. Los precios y los créditos exactos pueden cambiar; mira siempre
aimily.app/pricing para la cifra al día.

## Cómo cancelo mi suscripción

En aimily.app/account → "Manage subscription" → "Cancel". Tu plan sigue activo
hasta el final del periodo pagado. No hay tarifas de cancelación. Si cancelas
dentro de los primeros 7 días puedes pedir reembolso íntegro escribiendo a
hello@aimily.app. Después del día 7 no se reembolsan periodos parciales (la
cancelación detiene los próximos cobros).

## Garantía de devolución

Si compras un plan y dentro de los 7 días primeros decides que aimily no es
para ti, puedes pedir reembolso íntegro escribiéndonos a hello@aimily.app.
Después de día 7 no hay reembolsos por periodos parciales. Tus derechos UE
de 14 días (Directiva 2011/83/UE) siguen aplicando para servicios no usados.

## Mis datos están seguros

aimily corre sobre Supabase Pro (Postgres en EU central, RLS por usuario,
DKIM/SPF firmados, daily backups 7 días) y Vercel. Los assets de tu colección
están en Storage privado con signed URLs. Cumplimos GDPR + LOPDGDD + CCPA +
LGPD. La política completa está en aimily.app/privacy.

## Puedo borrar mi cuenta y mis datos

Sí. En aimily.app/account → "Delete account" o escribiéndonos a privacy@aimily.app.
Borramos tu cuenta + todas tus colecciones + assets + facturas. Las facturas
de Stripe se mantienen el tiempo legalmente requerido (7 años en España) por
obligación fiscal pero ya no quedan vinculadas a un usuario activo.

## Qué hace la IA exactamente

aimily genera con IA: visión creativa de la colección, moodboards (texto +
imágenes), brand DNA, plan de merchandising (familias, precios, escenarios
de buy units), planning de SKUs con renders 3D, tech packs, y materiales de
marketing (copy, sales dashboards, content calendar, presentación final).
Usamos Claude Haiku 4.5 para texto, OpenAI gpt-image-1.5 para renders de
diseño, Freepik (Nano Banana / Flux 2 Pro) para imagery comercial y modelos
aimily, y Kling 2.1 para video. Toda la generación es por demanda y se
descuenta de tu cuota de créditos.

## Quién es el dueño del contenido generado

Tú. Todo lo que aimily genera basado en tu input (briefs, imagery, copy,
presentaciones) es tuyo y puedes usarlo comercialmente. La política completa
está en aimily.app/terms.

## Aimily entrena con mis datos

No. Tus colecciones, briefs, SKUs, imágenes y conversaciones nunca se usan
para entrenar modelos genéricos. Cada llamada a Claude/OpenAI/Freepik se
hace con tu contexto solo y los proveedores tienen contratos de no-retención.

## Tengo un equipo, ¿pueden colaborar conmigo

Sí. Pro Max permite invitar colaboradores con permisos por bloque (Creative,
Merchandising, Design, Marketing). Cada colaborador entra con su email +
contraseña. Hay un audit log que registra quién hace qué.

## Cómo contacto al equipo

- Soporte general: hello@aimily.app
- Privacidad / GDPR: privacy@aimily.app
- Legal: legal@aimily.app
- Seguridad: security@aimily.app

Respondemos en un día laborable.

## Aimily existe en otros idiomas

Sí. La interfaz está en inglés, español, francés, italiano, alemán, portugués,
holandés, sueco y noruego — 9 idiomas. La generación AI también responde en
el idioma de tu cuenta. La política de privacidad y los términos están
disponibles en los 9 idiomas.

## Funciona en móvil

aimily está optimizado para desktop (la mayoría del trabajo creativo de una
colección se hace en pantalla grande). En móvil puedes ver tu dashboard y
revisar contenido pero la generación intensiva (Collection Builder, Tech Pack,
Presentation) está pensada para >= 1440px.

## Qué es un "drop"

Un drop es un mini-lanzamiento dentro de una colección — un grupo de SKUs
que sale al mercado en una fecha específica con su propia narrativa de
marketing. aimily soporta de 1 a 4 drops por colección por temporada.

## Qué es un "tech pack"

Un tech pack es la ficha técnica de un SKU para producción: medidas
detalladas, BOM (bill of materials), zonas de material, anotaciones tipo
pin sobre el render 3D, y cualquier comentario para el factory. aimily
genera tech packs A3 landscape PDF listos para enviar a fábricas.

## Qué es CIS (Collection Intelligence System)

Es la base de datos de aimily donde se guardan todas las decisiones que
tomas sobre tu colección — vibe, consumer, brand DNA, escenarios de
merchandising, SKUs, tech packs, plan de marketing. Cada decisión se
versiona y todas las llamadas AI usan ese contexto, así que no tienes
que repetir tu marca en cada prompt.

## Cuál es la diferencia entre Starter y Pro Max

Starter cubre 1 colección + cuota básica de imagery + 1 usuario. Pro Max
cubre múltiples colecciones simultáneas + cuota alta + colaboradores con
permisos por bloque + Tech Pack avanzado + Presentation con share links
públicos. Mira aimily.app/pricing para los números exactos al día.

## Qué pasa si me quedo sin créditos a media colección

Puedes comprar packs de créditos adicionales (50/250/1000) en
aimily.app/account → "Add credits". Los packs no caducan y se descuentan
después de la cuota mensual del plan. También puedes upgrade del plan
en cualquier momento desde el mismo sitio (prorrateo automático).
