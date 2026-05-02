# Auditoría Codex — Supabase Pro para 10 clientes reales

Fecha: 2026-05-02. Alcance: revisión independiente de `docs/supabase-architecture.md`, código local indicado y documentación oficial de Supabase. No pude leer el handoff `.claude/.../SESSION-2026-05-02-pro-upgrade-handoff.md`: la ruta no existe en este checkout, así que cualquier dato que dependía solo de ese archivo queda como verificación pendiente.

## 1. Verificación de afirmaciones

1. ✅ Plan Pro y backups: correcto que Pro tiene backups diarios y acceso a los últimos 7 días. Fuente oficial: https://supabase.com/docs/guides/platform/backups.
2. ⚠️ Backups: falta matiz crítico. Los backups de base de datos no incluyen los objetos de Storage; solo metadata. Si se borra una imagen en Storage, restaurar una daily backup no la recupera. Fuente: https://supabase.com/docs/guides/platform/backups y https://supabase.com/docs/guides/database/overview.
3. ✅ PITR: correcto que es add-on y que 7 días cuestan $100/mes; también requiere al menos Small compute. El ejemplo oficial muestra Pro $25 + Small $15 + PITR $100, con créditos de compute aplicables según factura. Fuente: https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery.
4. ✅ Storage privado + signed URLs: el patrón existe oficialmente. Para buckets privados, Supabase permite URLs firmadas temporales o endpoint authenticated con Authorization header. Fuente: https://supabase.com/docs/guides/storage/serving/downloads y https://supabase.com/docs/reference/javascript/storage-from-createsignedurl.
5. ⚠️ TTL de 1 año: técnicamente válido porque `expiresIn` es segundos hasta expiración, pero no es el patrón más higiénico: equivale casi a hacer público el asset para cualquiera que consiga la URL hasta 2027. El código lo confirma en `src/lib/storage.ts`.
6. ✅ Auth: correcto que `getUser()` es más fiable que `getSession()` en servidor porque hace request al Auth server y el resultado es auténtico. Fuente: https://supabase.com/docs/reference/javascript/auth-getuser y https://supabase.com/docs/reference/javascript/auth-getsession.
7. ✅ RLS: correcto que Supabase usa `anon` y `authenticated` como roles Postgres y que RLS es la capa esperada para autorización. Fuente: https://supabase.com/docs/guides/database/postgres/row-level-security.
8. ✅ RLS performance: correcto el fix de `(select auth.uid())`; Supabase documenta este patrón para evitar reevaluaciones por fila. Fuente: https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations.
9. ✅ Security definer view: correcto que una vista creada por rol privilegiado puede saltarse RLS y que debe usarse `security_invoker=true`. Fuente: https://supabase.com/docs/guides/database/tables.
10. ✅ Funciones SECURITY DEFINER: correcto endurecerlas con `search_path` y revocar `execute` cuando no deban exponerse. Fuente: https://supabase.com/docs/guides/database/functions.
11. ⚠️ Database Webhooks: en tu doc aparecen como mecánica útil, pero no deben venderse como GA: la página oficial de features los lista como beta. Fuente: https://supabase.com/docs/guides/getting-started/features.
12. ⚠️ Branching: tu tabla dice que Branches es add-on y no necesario, correcto para mañana; pero la página oficial de features lo lista como beta, no GA. Fuente: https://supabase.com/docs/guides/getting-started/features.
13. ✅ Image Transformations: correcto que está GA y que `createSignedUrl(..., { transform })` está soportado. Fuentes: https://supabase.com/docs/guides/getting-started/features y https://supabase.com/docs/reference/javascript/storage-from-createsignedurl.
14. ✅ Read Replicas: correcto que no son necesarias para 10 clientes; oficialmente requieren Pro/Team/Enterprise, AWS, Postgres 15+ y al menos Small compute add-on. Fuente: https://supabase.com/docs/guides/platform/read-replicas/getting-started.
15. ⚠️ Advisors: no puedo verificar los números exactos del advisor contra Supabase sin acceso al dashboard/MCP en esta sesión. Sí verifiqué que las clases de hallazgo y las mitigaciones son coherentes con documentación oficial y con migraciones/código local.

## 2. Bloqueantes para 10 clientes mañana

### 1. Quitar bypass de RLS en `collection_intelligence`

Qué hacer: si la vista existe, pasarla a `security_invoker=true`. Si realmente es Fred y no se usa, bórrala, pero no la dejes SECURITY DEFINER.

Por qué bloquea: una vista SECURITY DEFINER puede ejecutar con permisos del creador y no del usuario final. En una app multi-cliente, esto es riesgo directo de fuga entre clientes.

SQL:

```sql
do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'collection_intelligence'
      and c.relkind in ('v', 'm')
  ) then
    alter view public.collection_intelligence set (security_invoker = true);
  end if;
end $$;
```

Tiempo estimado: 10 minutos.

### 2. Revocar ejecución pública de RPCs internas de créditos/subscripciones

Qué hacer: dejar callable públicamente solo lo que sea de verdad público. En esta app, `increment_share_views` puede seguir expuesto si la página `/p/[token]` lo necesita; las RPCs de crédito y trigger interno no.

Por qué bloquea: `src/lib/api-auth.ts` y `src/app/api/webhooks/stripe/route.ts` llaman estas RPCs desde servidor con `service_role`. Exponerlas a `anon/authenticated` amplía la superficie de abuso de cuotas y billing.

SQL:

```sql
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'add_imagery_credits',
        'consume_imagery_units',
        'refund_imagery_units',
        'handle_new_user_subscription'
      )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.fn);
  end loop;
end $$;
```

Tiempo estimado: 15 minutos, incluyendo smoke test de compra/generación.

### 3. Fijar `search_path` en funciones SECURITY DEFINER

Qué hacer: aplicar `search_path` fijo a las funciones marcadas por el advisor.

Por qué bloquea: Supabase recomienda fijar `search_path` en SECURITY DEFINER. Sin esto, una función privilegiada es más fácil de explotar si alguna ruta termina permitiendo objetos maliciosos en un schema resoluble.

SQL:

```sql
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'touch_tech_pack_data_updated_at',
        'touch_suppliers_updated_at',
        'touch_factories_updated_at',
        'increment_share_views',
        'handle_new_user_subscription',
        'add_imagery_credits',
        'update_updated_at_column'
      )
  loop
    execute format('alter function %s set search_path = public, pg_catalog', r.fn);
  end loop;
end $$;
```

Tiempo estimado: 15 minutos.

### 4. Activar Leaked Password Protection

Qué hacer: en Supabase Dashboard del proyecto `sbweszownvspzjfejmfx`, activar `Authentication -> Password Strength -> Leaked Password Protection`.

Por qué bloquea: para clientes reales, permitir contraseñas filtradas es una mala postura básica. Es un cambio de bajo coste con impacto real.

Comando: no hay SQL local seguro; es setting de Auth en dashboard. Validación posterior: crear usuario de prueba con una contraseña conocida filtrada y comprobar rechazo.

Tiempo estimado: 5 minutos.

### 5. Cerrar buckets públicos Fred o confirmar migración antes del primer cliente

Qué hacer: si `reports` y `rrss-assets` existen y no son necesarios para aimily, hacerlos privados ya. No esperaría a la migración Fred si mañana entran clientes.

Por qué bloquea: aunque sean “Fred-only”, comparten proyecto Supabase. Un cliente no distingue deuda de otro producto dentro del mismo backend.

SQL:

```sql
update storage.buckets
set public = false
where id in ('reports', 'rrss-assets');
```

Tiempo estimado: 10 minutos, más revisar si alguna ruta Fred se rompe.

### 6. Arreglar RLS `auth.uid()` en las tablas core con más tráfico

Qué hacer: priorizar policies de `collection_plans`, `collection_skus`, `collection_assets`, `collection_decisions`, `tech_pack_data`, `tech_pack_comments`, `ai_usage`, `ai_generations`, `presentation_shares`.

Por qué bloquea: para 10 clientes no es un riesgo de seguridad, pero sí de latencia y coste si un cliente sube colecciones grandes. Es la diferencia entre “demo que aguanta” y “producto que no se arrastra”.

SQL de verificación previa:

```sql
select schemaname, tablename, policyname, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
  and (qual ilike '%auth.uid()%' or with_check ilike '%auth.uid()%')
order by tablename, policyname;
```

Ejemplo exacto de patrón a aplicar al recrear cada policy:

```sql
-- antes: user_id = auth.uid()
-- después:
user_id = (select auth.uid())
```

Tiempo estimado: 2-4 horas con pruebas. No lo haría a ciegas con search/replace global.

## 3. No bloqueantes pero recomendados en 30 días

1. Storage backup real: exportar objetos de `collection-assets` a S3/rclone o al menos job diario de `supabase storage`/S3-compatible. Los backups de BD no cubren objetos borrados.
2. Rotación de signed URLs: crear endpoint de firma bajo auth y migrar de URLs de 1 año a URLs cortas, cacheadas por cliente. Deadline duro actual: antes de mayo de 2027.
3. Índices FK: añadir los índices que falten tras confirmar en `pg_indexes`. Prioridad: `collection_plans.user_id`, `collection_skus.collection_plan_id/plan_id`, `tech_pack_comments.collection_plan_id`, `team_members.invited_by`, `collection_assets.uploaded_by`.
4. Redis/Upstash para rate limit si empieza tráfico real de pago o abuso. Para 10 clientes, memoria por instancia es aceptable como freno de runaway, no como control antifraude fuerte.
5. Image Transformations para thumbnails. No desbloquea lanzamiento, pero mejora mucho pantallas con muchas imágenes.
6. Drop de índices duplicados solo tras verificar definiciones exactas en producción con `pg_indexes`; no lo haría antes de clientes.
7. `pg_cron` solo para tareas database-bound. Vercel Cron actual cubre lo que existe si `CRON_SECRET` está configurado.
8. Alertas mínimas: log de 401/403/429, fallos de Storage signing, fallos RPC de cuotas y errores 5xx en rutas AI.

## 4. Desacuerdos conmigo

1. No llamaría bloqueante la re-firma anual de signed URLs. Es P0 de calendario, no P0 de lanzamiento mañana. Bloqueante sería no tener `storage_path` persistido para poder regenerarlas; el código sí lo guarda en metadata.
2. Sí considero bloqueante cerrar o aislar los buckets públicos Fred antes de aceptar clientes. Aunque no sean aimily, están en el mismo proyecto y el advisor ya los señaló.
3. No vendería Database Webhooks como GA: la página oficial de features los lista como beta.
4. No vendería Branches como GA: la página oficial de features los lista como beta.
5. Matizaría “daily backups 7 días cubren escenarios actuales”: cubren base de datos, no recuperación completa de imágenes borradas.
6. No activaría PITR para 10 clientes si todavía no hay contratos enterprise. La decisión de no pagar $100/mes + Small compute es razonable ahora, siempre que se acepte pérdida potencial de hasta 24h de DB y cero recuperación nativa de Storage borrado.
7. Read Replicas y Network Restrictions no son urgentes para este stack actual. Network Restrictions no arregla acceso vía Data API; Read Replicas añade coste/operativa sin cuello de botella probado.

## 5. Verificación cruzada de impacto al usuario final

### Imágenes firmadas con TTL 1 año

El patrón funciona: Supabase soporta signed URLs temporales para buckets privados y el código usa `createSignedUrl(path, 365 * 24 * 3600)`. Si regeneras antes, las URLs nuevas conviven con las antiguas; regenerar no invalida automáticamente las ya emitidas. Si borras o mueves el objeto, la URL vieja deja de servir contenido.

Riesgo: una URL filtrada da acceso durante un año. Para producción madura, prefiero signed URLs cortas bajo endpoint autenticado, por ejemplo `/api/storage/sign?assetId=...`, validando `verifyCollectionOwnership()` y firmando por 5-60 minutos. Alternativa válida: usar endpoint authenticated de Storage con Authorization header; `getPublicUrl` no aplica para buckets privados.

Para mañana: aceptable si el bucket es privado y no se imprimen URLs en logs/clientes externos. No es enterprise-grade a largo plazo.

### Backups 7 días en Pro

Incluyen base de datos. No incluyen objetos de Storage. Supabase lo dice explícitamente: la BD solo tiene metadata de objetos y restaurar backup antiguo no restaura objetos borrados.

Caso real: si un cliente borra una colección con 50 imágenes y `deleteAsset()` borra Storage + row, una daily backup podría recuperar rows/metadata con downtime, pero no las 50 imágenes si ya fueron eliminadas de Storage. Para cubrir esto necesitas backup/versionado externo de Storage o política de soft-delete: marcar rows como deleted y borrar objetos físicamente más tarde.

Para mañana: riesgo aceptable si comunicas internamente “no hard delete sin ventana de papelera”. Acción mínima: no purgar objetos inmediatamente en flujos de borrado masivo de cliente.

### Rate limit per-user en memoria

El caveat está bien entendido en el código: `src/lib/rate-limit.ts` usa un `Map` por warm instance. Con 3 instancias, un límite de 10/min puede convertirse aproximadamente en 30/min si el tráfico se reparte. Con despliegues/restarts se resetea. No sirve contra abuso distribuido ni como contador financiero.

Para 10 clientes: se puede vivir con esto porque la cuota real de imágenes se controla en Postgres vía RPC y el rate limit solo limita ráfagas. Migraría a Redis antes de campañas públicas, self-serve abierto o clientes que paguen por uso alto.

## Fuentes oficiales usadas

- Pricing: https://supabase.com/pricing
- Features/status: https://supabase.com/docs/guides/getting-started/features
- Database backups: https://supabase.com/docs/guides/platform/backups
- PITR usage/pricing: https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery
- Database overview y Storage exclusion: https://supabase.com/docs/guides/database/overview
- Storage serving/private buckets: https://supabase.com/docs/guides/storage/serving/downloads
- `createSignedUrl`: https://supabase.com/docs/reference/javascript/storage-from-createsignedurl
- RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Views/security invoker: https://supabase.com/docs/guides/database/tables
- Database functions/security definer: https://supabase.com/docs/guides/database/functions
- Auth `getUser`: https://supabase.com/docs/reference/javascript/auth-getuser
- Auth `getSession`: https://supabase.com/docs/reference/javascript/auth-getsession
- Read Replicas: https://supabase.com/docs/guides/platform/read-replicas/getting-started
