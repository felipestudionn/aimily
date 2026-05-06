---
name: AUDITAR antes de proponer · NO ASUMIR que algo está sin configurar
description: Antes de proponer "vamos a configurar X" o "esto no existe, lo añado", PRIMERO verificar el estado real del sistema. Asumir sin verificar = perder tiempo de Felipe.
type: feedback
---

# AUDITAR antes de proponer · regla de oro

**Regla**: ANTES de proponer cualquier acción ("vamos a configurar X", "esto no existe, lo añado", "habría que setupear Y"), VERIFICAR primero el estado real del sistema mediante tools/queries/dig/curl/api-call. **No asumir.**

**Why**: Felipe me dio feedback duro 2026-05-06 después de ~40 minutos perdidos en una conversación sobre Google Search Console donde asumí que NO estaba configurado y le propuse meta tag verification + DNS records, cuando en realidad GSC ya estaba verificado vía DNS TXT desde antes (sc-domain). El audit que debí haber hecho primero (1 minuto: navegar a GSC con la sesión Playwright + ver propiedades) habría revelado el setup completo y nos habría ahorrado 40 min de discusión sobre algo que ya existía.

**Patrón anti-good repetido hoy** (2026-05-06):
1. Asumí que GSC no estaba configurado → ya lo estaba (DNS TXT en IONOS)
2. Asumí que wildcard SSL Vercel + Cloudflare Free funcionaría → Cloudflare Free no proxy wildcards
3. Asumí que Cloudflare Registrar permitiría cambiar NS → no permite (lock NS por 60 días post-registro)
4. Asumí que Next.js routea paths con underscore prefix → no lo hace (`/_storefront/` no funciona, hay que usar `/storefront/`)

Cada error me hizo proponer + ejecutar antes de auditar. Cada error me costó tiempo de Felipe.

**How to apply** (checklist antes de proponer cualquier "vamos a configurar X"):

1. **¿Existe ya?** Verificar con la herramienta canónica:
   - DNS records → `dig` o Cloudflare/Vercel API
   - Servicios externos (GSC, Stripe, Vercel, Sentry, PostHog) → navegar a su dashboard via Playwright si está logueado, o leer la biblia (`memory/full-project-documentation.md`)
   - Código → `grep` antes de "voy a añadir esto"
   - DB → `mcp__supabase__list_tables` o `execute_sql` antes de "vamos a crear esta tabla"
   - Env vars → `vercel env ls` o leer `.env.local`
2. **¿La biblia lo dice?** Antes de proponer, leer la sección relevante de `full-project-documentation.md`. Si está documentado, lo digo a Felipe ("ya tenemos X configurado · dice así..."). Si no está documentado pero existe, lo documento a la biblia DESPUÉS de verificar.
3. **¿Limitaciones del provider conocidas?** Para servicios externos (Cloudflare Free, Vercel, Stripe), buscar en context7/docs ANTES de proponer. Cloudflare Free no soporta wildcard proxy → eso es 1 minuto de search vs 30 minutos de troubleshooting con Felipe.
4. **Si tras auditar la propuesta sigue siendo necesaria**, presentarla con evidencia: "Verifiqué X via Y, devuelve Z, por tanto necesitamos hacer A".

**Excepción razonable**: si el audit requeriría más de 5 min de tools cuando la propuesta es obvia (ej: "añadir un campo type a una tabla nueva que estoy creando"), el audit es overkill. Pero para casos donde el sistema PUEDE ya tenerlo (servicios externos, integraciones, configuración compartida), el audit es obligatorio.

**Trigger para esta regla**: cualquier mensaje mío que contenga "vamos a configurar", "esto no está configurado", "tendríamos que añadir", "habría que setupear", "no veo X" debe pararse 1 minuto y auditar antes de continuar.
