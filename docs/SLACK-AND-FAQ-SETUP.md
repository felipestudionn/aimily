# Slack alerts + FAQ bot — setup completo

Estado al cierre de la sesión 2026-05-02 tarde:
- **Código Slack 100% implementado** en `src/lib/slack-alerts.ts` y `src/lib/founder-alerts.ts` (envío en paralelo a Resend).
- **Función SQL `notify_slack_direct`** lista en Postgres como ruta de respaldo si Vercel cae.
- **Pendiente activación**: solo necesitas crear el workspace Slack y darme la webhook URL.

---

## Parte 1 — Por qué dos rutas

```
Postgres trigger (subscriptions, wholesale_orders, audit_log)
   │
   ├── notify_founder() → Vercel /api/webhooks/db-event ──┬→ Resend → hello@aimily.app
   │                                                      └→ Slack incoming webhook
   │
   └── notify_slack_direct() (opcional, ruta directa)  ──→ Slack incoming webhook
```

- **Ruta principal** (Resend + Slack en paralelo via Vercel): defensa contra fallo de canal único.
- **Ruta directa Postgres → Slack**: defensa contra Vercel caído. Mismo destino Slack, otro hop.

Ambas rutas usan el **mismo Incoming Webhook URL** — Slack acepta cualquier número de POSTs por webhook (rate limit: 1 mensaje/seg, sobra para alertas founder). No necesitas dos webhooks distintos.

---

## Parte 2 — Lo que tú haces (10 min máximo)

### 2.1 Crear workspace Slack (si aún no tienes uno)

1. Ve a https://slack.com/get-started#/createnew
2. Email: `hello@aimily.app` (o el que ya uses para Slack — da igual)
3. Código de confirmación llega al email. Mete el código.
4. Nombre del workspace: **Aimily** (o `aimily-team`, lo que prefieras)
5. Primer canal: lo que quieras. Después crearemos otro.

### 2.2 Crear canal `#aimily-alerts`

1. En el sidebar de Slack, click `+` junto a "Channels" → "Create a channel"
2. Nombre: `aimily-alerts`
3. Tipo: **Private** (solo tú lo necesitas)
4. Crear

### 2.3 Crear la app y obtener el webhook URL

1. Ve a https://api.slack.com/apps → "Create New App" → "From scratch"
2. App Name: `Aimily Alerts`
3. Workspace: el que acabas de crear
4. Click "Create App"
5. En el menú izquierdo: "Incoming Webhooks"
6. Toggle "Activate Incoming Webhooks" → ON
7. Botón "Add New Webhook to Workspace"
8. Elige el canal `#aimily-alerts` → "Allow"
9. Copia la URL que aparece (formato: `https://hooks.slack.com/services/T.../B.../...`)

**Esa URL es secreta. No la pegues en chat público ni en código. Compártemela como mensaje aquí.**

---

## Parte 3 — Lo que hago yo cuando me des la URL

```bash
# 1. Añadir como Vault secret en Supabase (para la ruta Postgres directa)
SELECT vault.create_secret(
  '<URL>',
  'slack_alerts_webhook_url',
  'Incoming webhook to #aimily-alerts'
);

# 2. Añadir como Vercel env var SLACK_WEBHOOK_URL (para la ruta principal)
vercel env add SLACK_WEBHOOK_URL production
# (paste URL when prompted)
vercel env add SLACK_WEBHOOK_URL preview
vercel env add SLACK_WEBHOOK_URL development

# 3. Deploy
vercel --prod

# 4. Smoke test desde Postgres
SELECT public.notify_founder(
  'audit_high_severity',
  jsonb_build_object('action', 'slack_smoke', 'severity', 'high', 'message', 'Test post-activation')
);
# → debes ver el mensaje en #aimily-alerts en menos de 10 segundos
```

---

## Parte 4 — Qué tipo de alerta verás en Slack

Las 7 categorías ya cableadas (cada una con su emoji):

| Evento | Emoji | Disparador |
|---|---|---|
| Nueva suscripción Pro/Pro Max | 💰 `:moneybag:` | INSERT/UPDATE en `subscriptions` cuando plan != 'trial' |
| Cancelación | ⚠️ `:warning:` | UPDATE en `subscriptions` con status canceled/unpaid |
| Refund procesado | 🔄 `:arrows_counterclockwise:` | webhook Stripe (futuro) |
| Nuevo pedido wholesale | 📦 `:package:` | INSERT en `wholesale_orders` |
| Audit severity=high | 🚨 `:rotating_light:` | INSERT en `audit_log` con severity='high' |
| ≥10 signups en 1h | 🚀 `:rocket:` | cron `aimily_signup_spike_check` horario |
| Cron `aimily_*` con 2 fallos seguidos | ❌ `:x:` | cron `aimily_cron_failure_watcher` horario |

Cada mensaje incluye:
- Header con emoji + label legible
- Subject en bold + body
- Bloque JSON con datos estructurados (cuando aplica)
- Botón "View in aimily" (cuando se proporciona link)
- Footer con timestamp

---

## Parte 5 — FAQ bot 24/7

Aquí no hay una opción gratis-de-verdad-para-producción. Te explico qué he verificado y qué recomiendo.

### Lo que descarté (free pero no útil)

- **Tidio Free + Lyro AI**: 50 conversaciones AI **lifetime** (no mensual). Inviable más allá de validación.
- **Crisp Free**: sin AI verdadera (MagicReply solo desde plan Mini $45/mes).
- **Chatbase Free**: 50 mensajes/mes y agente borrado tras 14 días inactividad. Inviable.
- **HubSpot Free**: chatbot rule-based (sin LLM). Sirve para flujos cerrados, no para FAQ.

Fuentes: tidio.com/pricing, crisp.chat/en/pricing, chatbase.co/pricing, hubspot.com/products/crm/free.

### Lo que recomiendo (las dos opciones reales)

#### Opción A — Tidio Free como prueba rápida (1 semana)

**Coste**: 0 € hasta agotar 50 convs.
**Setup**: 30 min — registro, embed widget en `aimily.app`, subir FAQ markdown.
**Útil para**: validar si la gente pregunta cosas y qué pregunta. Después decides si pagas Tidio Premium ($59/mes) o construyes el tuyo.
**URL**: https://www.tidio.com/pricing/

#### Opción B — Build it yourself con Claude + pgvector (1-2 días, 0 € recurrente)

Stack que ya tienes:
- **Supabase Pro** con extensión `vector` (pgvector) → vector store gratis
- **Claude Haiku 4.5** ya integrado → ~$0,25 por millón de tokens input → un FAQ bot realista cuesta $0.5-2/mes a 100 conversaciones/día
- **Next.js + AI SDK** ya en el stack → endpoint `/api/chat-faq` y widget propio

Plan concreto si tiras por aquí:
1. Tabla `faq_documents` con embedding vector(1536) (Voyage AI o OpenAI ada-002).
2. Script que ingiere tu FAQ markdown (puede ser todo el `landing/MeetAimilyContent` + Pricing + Privacy + Terms + ¿Felipe escribe FAQ?).
3. Endpoint `POST /api/chat-faq`: recibe pregunta, embedding de la query, top-k retrieval por cosine, Claude Haiku genera respuesta con contexto.
4. Widget React mínimo en esquina inferior derecha de `www.aimily.app`.
5. Si Claude no encuentra respuesta → "Te paso con Felipe" → dispara alerta a `#aimily-alerts` con la pregunta.

**Ventajas**: control total, voz aimily verdadera (puedes prompt-engineerar la personalidad del bot), 0 € recurrente, escalable, integrado con Slack handoff que acabamos de configurar.
**Desventaja**: 1-2 días de build.

Template de partida oficial Vercel: https://vercel.com/templates/ai/nextjs-ai-chatbot

### Mi recomendación

**Empezar por A (Tidio Free, 1 semana validación)**. Si el volumen real lo justifica → migrar a B. No tiene sentido invertir 2 días en construir un bot custom hasta saber si la gente pregunta y qué pregunta.

Si dices "vamos con B directo" porque quieres el control desde el inicio, lo construyo en la próxima sesión.

---

## Parte 6 — Limitaciones reales que merece la pena saber

| Tema | Límite verificado | Fuente |
|---|---|---|
| **Resend Free** | 100 emails/día · 3.000 emails/mes · 1 dominio · 5 req/s API | https://resend.com/pricing |
| **Resend Pro** ($20/mes) | sin límite diario · 50.000/mes · 10 dominios · $0,90 / 1.000 extra | https://resend.com/pricing |
| **Slack Free** | 90 días de historial (>1 año borrado permanente) · webhooks ilimitados · 1 msg/seg/webhook | https://slack.com/help/articles/115002422943, https://docs.slack.dev/apis/web-api/rate-limits |
| **Slack Incoming Webhook** | URL fija a 1 canal · max 100 attachments/blocks · max 3000 chars URL botón | https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks |

Para aimily a 10–100 clientes los límites del Free Plan sobran.

---

## Parte 7 — Estado al cierre

**Listo para activar (esperando webhook URL)**:
- `src/lib/slack-alerts.ts` — Slack sender con Block Kit y soft-fail
- `src/lib/founder-alerts.ts` — fan-out paralelo Resend + Slack
- Función SQL `notify_slack_direct(event_label, subject, body, payload, link_url, emoji)` — ruta directa Postgres → Slack (Vault-backed)

**Falta de tu lado**:
- Crear workspace Slack (5 min)
- Crear canal `#aimily-alerts` (1 min)
- Crear app "Aimily Alerts" + Incoming Webhook (3 min)
- Pasarme la URL → yo la guardo en Vault + Vercel env

**Falta decidir FAQ**:
- ¿Tidio Free (validación 1 semana, 0 €) o build-it-yourself (1-2 días, 0 € recurrente)?
