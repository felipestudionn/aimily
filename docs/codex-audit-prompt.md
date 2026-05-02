# Codex audit — Supabase Pro readiness for 10 real clients tomorrow

## Tu rol
Eres un consultor independiente de Supabase contratado para auditar `aimily` antes de su lanzamiento comercial. El founder asume que **mañana entran 10 clientes reales** y necesita saber qué falta para que esté enterprise-ready, sin medias tintas, sin asumir nada.

## Reglas absolutas de la auditoría
1. **No inventes**. Cualquier afirmación sobre Supabase, Postgres, pg_cron, Storage, RLS, Auth, etc. debe estar verificada contra docs oficiales (https://supabase.com/docs/...) o contra el código del repo. Si no lo puedes verificar, dilo.
2. **No copies mi auditoría**. Yo ya hice una. Tú debes hacer la tuya independiente y al final marcar dónde discrepas conmigo.
3. **Verifica antes de afirmar precios o feature gates**. Pricing oficial: https://supabase.com/pricing. Plan features: https://supabase.com/docs/guides/getting-started/features.
4. **Habla en español**, claro, sin jerga gratuita. Tono: socio técnico que dice las cosas como son.
5. **Distingue lo bloqueante de lo no-bloqueante** para soportar 10 clientes mañana. No me listes deuda técnica de 6 meses si no es urgente.

## Contexto del proyecto

**Repo**: `/Users/felipemartinez/aimily`
**Proyecto Supabase aimily**: `sbweszownvspzjfejmfx` (Pro, EU central, Postgres 17.6.1)
**Plan**: Pro $25/mes sin add-ons (PITR descartado por coste, $115/mes adicionales no se justifica sin clientes pagando enterprise)

### Archivos a leer en orden
1. `docs/supabase-architecture.md` — mi documentación completa de la arquitectura (incluye hallazgos de los advisors, plan Pro features, beneficios al usuario). Léelo entero.
2. `src/lib/storage.ts` — helpers de Storage, signed URLs.
3. `src/lib/api-auth.ts` — auth, quotas, rate limit per-user.
4. `src/lib/team-permissions.ts` — RBAC.
5. `src/middleware.ts` — auth middleware + rate limit IP.
6. `vercel.json` — crons actuales.
7. `.claude/projects/-Users-felipemartinez-aimily/memory/SESSION-2026-05-02-pro-upgrade-handoff.md` — handoff de la última sesión (estado real al cierre, con datos de migración Fred).
8. Cualquier otro archivo que necesites para verificar afirmaciones (no leas el repo entero — sé selectivo).

### Hallazgos ya obtenidos de los advisors Supabase (2026-05-02)

Para que no los repitas como si fuera tu propio descubrimiento:

**Security advisor** (1 ERROR + 24 WARN):
- 🔴 ERROR: `public.collection_intelligence` view es SECURITY DEFINER (bypass RLS).
- 7 funciones con `function_search_path_mutable`: touch_*, increment_share_views, handle_new_user_subscription, add_imagery_credits, update_updated_at_column.
- 5 funciones SECURITY DEFINER ejecutables por anon/authenticated: add_imagery_credits, consume_imagery_units, refund_imagery_units, handle_new_user_subscription (este es trigger interno), increment_share_views (este sí debe ser anon-callable para /p/[token]).
- Leaked password protection desactivado.
- 4 RLS "always true" en chat_messages, client_decks, itinerary_items, user_projects (Fred-only, desaparecen).
- 2 buckets públicos con listing abierto: reports, rrss-assets (Fred-only).

**Performance advisor** (1.110 lints, gran parte Fred):
- 172 `auth_rls_initplan` — patrón sistémico, RLS policies usan `auth.uid()` directo en lugar de `(select auth.uid())`. Tablas aimily-core afectadas: collection_plans, collection_skus, collection_assets, collection_decisions, collection_stories, collection_timelines, ai_usage, ai_generations, audit_log, brand_profiles, drops, suppliers, factories, tech_pack_data, tech_pack_comments, presentation_shares, sales_channels, wholesale_orders.
- 896 `multiple_permissive_policies` — la mayoría desaparecen al borrar el rol `alfred_app` con la migración Fred.
- 13 FK aimily-core sin índice cubrente: collection_plans.user_id ⚠️, collection_skus.plan_id ⚠️, collection_assets.uploaded_by, collection_decisions.supersedes_id, brand_profiles.{guidelines_asset_id, logo_asset_id}, presentation_deck_overrides.updated_by, team_members.invited_by, tech_pack_comments.{author_id, collection_plan_id}.
- 3 índices duplicados aimily-core: ai_usage, imagery_credits, paid_campaigns.
- 43 `unused_index` (revisar al final).

## Lo que tienes que entregar

Escribe tu auditoría en **`docs/codex-audit.md`** con esta estructura:

### 1. Verificación de mis afirmaciones (10-15 puntos)

Lee `docs/supabase-architecture.md`. Por cada sección clave (planes/precios, RLS, storage, auth, rate limiting, advisors, features Pro), marca:
- ✅ verificado contra fuente oficial
- ⚠️ parcialmente correcto, matiza tu hallazgo
- ❌ incorrecto, di por qué con cita de la fuente

No copies mis frases. Verifica.

### 2. Bloqueantes para 10 clientes mañana

Lista lo que YO debo hacer hoy/mañana antes de aceptar el primer cliente real. Cada item:
- Qué hay que hacer
- Por qué es bloqueante (qué se rompe si no lo hago)
- Comando/SQL exacto para hacerlo (no `<placeholder>`, dame algo ejecutable o casi)
- Tiempo estimado

Ordena por payoff/coste descendente.

### 3. No bloqueantes pero recomendados antes de los próximos 30 días

Items que mejoran la experiencia/observabilidad/coste pero no rompen el lanzamiento.

### 4. Desacuerdos conmigo

Donde tu opinión difiera de la mía (vista en `docs/supabase-architecture.md`), dilo explícitamente. Justifica con la fuente oficial. Casos típicos donde puedo estar equivocado:
- Si afirmo que algo está GA cuando es Beta
- Si afirmo un coste que no esté en pricing actual
- Si recomiendo activar algo que no es necesario para 10 clientes
- Si dejo fuera algo que SÍ es necesario para 10 clientes

### 5. Verificación cruzada de cosas que afecten al usuario final

Hay tres preocupaciones del founder a las que te pido especial atención:

1. **Imágenes firmadas con TTL 1 año**: ¿es correcto el patrón? ¿qué pasa si renovamos/regeneramos antes? ¿hay alternativa más higiénica para producción (signed URLs cortas + reverse proxy, o RLS-protected paths con `getPublicUrl` y RLS, etc.)?
2. **Backups 7 días en Pro**: ¿qué incluyen exactamente? ¿el storage también o solo la BD? Si un cliente borra una colección por accidente con 50 imágenes, ¿podemos restaurar las imágenes o solo los rows en la BD?
3. **Rate limit per-user en memoria**: el caveat es que es in-memory por warm instance de Vercel Fluid. ¿Cuánto se rompe esto en escala? ¿Podemos vivir con esto en 10 clientes o tenemos que migrar a Redis ya?

## Reglas finales
- Si no tienes la información para responder algo con certeza, dilo y deja el item como "verificación pendiente".
- Tu output debe poder ser leído por el founder en 10 minutos. Si te alargas más, has fallado.
- No escribas SQL/código que no hayas validado contra docs oficiales.
- Cita las URLs oficiales que uses como fuente.
