# Plan de Implementación: Subscription Enforcement System

## Estado Actual — Problemas Detectados

### Críticos
1. **AI routes sin autenticación** — Las 12+ rutas AI aceptan requests sin login
2. **Sin tracking de uso AI** — `trackAIUsage()` existe pero ninguna ruta lo llama
3. **Trial infinito** — No hay expiración de los 14 días
4. **Sin límite de colecciones** — Todos crean ilimitadas independientemente del plan
5. **DB schema mismatch** — La tabla `subscriptions` tiene CHECK constraint con `('free','pro','business','enterprise')` pero el código usa `('trial','starter','professional','enterprise')`
6. **Sin admin bypass** — El dueño no tiene acceso garantizado

### Menores
7. Feature gating solo cosmético (UpgradePrompt muestra mensaje pero no bloquea)
8. Sin modo read-only post-trial
9. Portal de Stripe no configurado completamente

---

## Plan de Ejecución — 8 Fases

### FASE 1: Fix DB Schema (migración)
**Objetivo:** Alinear la base de datos con el código

**Archivo:** `supabase/migrations/010_fix_subscription_plans.sql`

```sql
-- 1. Drop old CHECK constraint
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

-- 2. Add new CHECK with correct plan names
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('trial', 'starter', 'professional', 'enterprise'));

-- 3. Migrate existing data
UPDATE subscriptions SET plan = 'trial' WHERE plan = 'free';
UPDATE subscriptions SET plan = 'starter' WHERE plan = 'pro';
UPDATE subscriptions SET plan = 'professional' WHERE plan = 'business';

-- 4. Add trial_ends_at column for trial expiration tracking
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- 5. Add is_admin column for owner bypass
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
```

**Verificación:** Query `SELECT plan, count(*) FROM subscriptions GROUP BY plan` — solo debe mostrar trial/starter/professional/enterprise.

---

### FASE 2: Auto-crear suscripción trial al registrarse
**Objetivo:** Cada nuevo usuario recibe automáticamente un registro de suscripción trial con fecha de expiración

**Archivo:** `supabase/migrations/011_auto_trial_on_signup.sql`

```sql
-- Trigger function: create trial subscription on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (id, user_id, plan, status, trial_ends_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    'trial',
    'trialing',
    NOW() + INTERVAL '14 days',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();
```

**Verificación:** Crear un usuario nuevo → verificar que aparece en `subscriptions` con plan='trial', status='trialing', trial_ends_at = NOW() + 14 días.

**Backfill:** Para usuarios existentes sin suscripción:
```sql
INSERT INTO subscriptions (id, user_id, plan, status, trial_ends_at, created_at, updated_at)
SELECT gen_random_uuid(), id, 'trial', 'trialing', created_at + INTERVAL '14 days', NOW(), NOW()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM subscriptions)
ON CONFLICT (user_id) DO NOTHING;
```

---

### FASE 3: Admin bypass para el dueño
**Objetivo:** El usuario Felipe (dueño) tiene acceso enterprise permanente

**SQL directo (después de Fase 1+2):**
```sql
-- Set Felipe's account as admin with enterprise access
UPDATE subscriptions
SET plan = 'enterprise', status = 'active', is_admin = true, trial_ends_at = NULL
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'felipe@studionnagency.com');
```

**En el código:** Añadir check de `is_admin` en:
- `GET /api/billing/subscription` — si is_admin, devolver enterprise sin importar plan
- `POST /api/billing/usage` — si is_admin, siempre allowed: true

**Archivo a modificar:** `src/lib/stripe.ts` — añadir función:
```typescript
export const ADMIN_EMAILS = ['felipe@studionnagency.com'];

export function isAdminUser(email: string | undefined): boolean {
  return ADMIN_EMAILS.includes(email || '');
}
```

**Verificación:** Login con cuenta de Felipe → useSubscription() muestra plan enterprise, sin límites.

---

### FASE 4: Proteger rutas AI con autenticación
**Objetivo:** Todas las rutas AI requieren login

**Archivos a modificar (12+ rutas):**
- `src/app/api/ai/analyze-text/route.ts`
- `src/app/api/ai/generate-plan/route.ts`
- `src/app/api/ai/generate-skus/route.ts`
- `src/app/api/ai/market-trends/route.ts`
- `src/app/api/ai/market-prediction/route.ts`
- `src/app/api/ai/analyze-moodboard/route.ts`
- `src/app/api/ai/explore-trends/route.ts`
- `src/app/api/ai/generate-techpack/route.ts`
- `src/app/api/ai/copy/generate/route.ts`
- `src/app/api/ai/propose-comments/route.ts`
- `src/app/api/ai/generate-sketch-options/route.ts`
- `src/app/api/ai/fal/model-create/route.ts`
- `src/app/api/ai/fal/lifestyle/route.ts`
- `src/app/api/ai/fal/product-render/route.ts`
- `src/app/api/ai/fal/tryon/route.ts`
- `src/app/api/ai/fal/video/route.ts`
- `src/app/api/ai/fal/status/route.ts`

**Patrón a aplicar:** Crear helper reutilizable en `src/lib/api-auth.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { ADMIN_EMAILS } from '@/lib/stripe';

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { user, error: null };
}

export async function checkAIUsage(userId: string, userEmail: string) {
  // Admin bypass
  if (ADMIN_EMAILS.includes(userEmail)) {
    return { allowed: true, current: 0, limit: -1 };
  }

  // Get subscription
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, status, trial_ends_at, is_admin')
    .eq('user_id', userId)
    .single();

  // Check trial expiration
  if (sub?.plan === 'trial' && sub?.trial_ends_at) {
    if (new Date(sub.trial_ends_at) < new Date()) {
      return { allowed: false, reason: 'trial_expired', current: 0, limit: 0 };
    }
  }

  // Check subscription status
  if (sub?.status === 'canceled' || sub?.status === 'unpaid') {
    return { allowed: false, reason: 'subscription_inactive', current: 0, limit: 0 };
  }

  // Admin flag bypass
  if (sub?.is_admin) {
    return { allowed: true, current: 0, limit: -1 };
  }

  // Get plan limits
  const planLimits = getPlanLimits(sub?.plan || 'trial');
  const limit = planLimits.aiGenerations;

  // Unlimited
  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1 };
  }

  // Check current usage
  const month = new Date().toISOString().slice(0, 7);
  const { data: usage } = await supabaseAdmin
    .from('ai_usage')
    .select('generation_count')
    .eq('user_id', userId)
    .eq('month', month)
    .single();

  const current = usage?.generation_count || 0;

  if (current >= limit) {
    return { allowed: false, reason: 'limit_reached', current, limit };
  }

  // Increment usage
  await supabaseAdmin.from('ai_usage').upsert({
    user_id: userId,
    month,
    generation_count: current + 1,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,month' });

  return { allowed: true, current: current + 1, limit };
}
```

**En cada ruta AI, añadir al inicio:**
```typescript
import { getAuthenticatedUser, checkAIUsage } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  // Auth check
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  // Usage check
  const usage = await checkAIUsage(user.id, user.email!);
  if (!usage.allowed) {
    return NextResponse.json(
      { error: usage.reason === 'trial_expired'
          ? 'Your trial has expired. Please choose a plan to continue.'
          : usage.reason === 'limit_reached'
          ? 'AI generation limit reached for this month.'
          : 'Subscription inactive. Please update your payment method.'
      },
      { status: 403 }
    );
  }

  // ... rest of existing route logic
}
```

**Excepción:** `src/app/api/ai/fal/status/route.ts` — esta ruta solo checkea estado de un job ya creado, NO consume una generación. Solo necesita auth, NO usage tracking.

**Verificación:**
1. Sin login → 401 en todas las rutas AI
2. Con login + trial activo → funciona
3. Con trial expirado → 403 "trial expired"
4. Con admin → siempre funciona

---

### FASE 5: Límite de colecciones
**Objetivo:** Respetar el límite de colecciones por plan (Starter: 2, Professional: ilimitado)

**Archivo a modificar:** `src/app/api/planner/create/route.ts`

**Lógica a añadir antes de crear la colección:**
```typescript
// Check collection limit
const { data: sub } = await supabaseAdmin
  .from('subscriptions')
  .select('plan, status, trial_ends_at, is_admin')
  .eq('user_id', user.id)
  .single();

// Admin bypass
if (!sub?.is_admin && !ADMIN_EMAILS.includes(user.email || '')) {
  // Trial expiration check
  if (sub?.plan === 'trial' && sub?.trial_ends_at && new Date(sub.trial_ends_at) < new Date()) {
    return NextResponse.json({ error: 'Your trial has expired. Choose a plan to create collections.' }, { status: 403 });
  }

  const limits = getPlanLimits(sub?.plan || 'trial');

  if (limits.collections !== -1) {
    const { count } = await supabaseAdmin
      .from('collection_plans')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if ((count || 0) >= limits.collections) {
      return NextResponse.json(
        { error: `Your ${sub?.plan || 'trial'} plan allows ${limits.collections} collections. Upgrade to create more.` },
        { status: 403 }
      );
    }
  }
}
```

**Verificación:**
1. Starter con 2 colecciones → error al crear la 3ra
2. Professional → sin límite
3. Admin → sin límite

---

### FASE 6: Trial expiration en SubscriptionContext
**Objetivo:** El frontend detecta trial expirado y muestra paywall

**Archivo a modificar:** `src/contexts/SubscriptionContext.tsx`

**Cambios:**
1. Añadir `trialEndsAt` al estado de suscripción
2. Añadir `isTrialExpired` computed: `plan === 'trial' && trialEndsAt && new Date(trialEndsAt) < new Date()`
3. Modificar `GET /api/billing/subscription` para devolver `trialEndsAt`
4. Añadir `trialDaysLeft` computed

**En el API `GET /api/billing/subscription`:**
```typescript
// Add trial_ends_at to response
trialEndsAt: sub?.trial_ends_at || null,
```

**En SubscriptionContext:**
```typescript
const isTrialExpired = subscription.plan === 'trial'
  && subscription.trialEndsAt
  && new Date(subscription.trialEndsAt) < new Date();

const trialDaysLeft = subscription.plan === 'trial' && subscription.trialEndsAt
  ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
  : null;
```

**Verificación:**
1. Trial con 10 días restantes → `trialDaysLeft: 10`, `isTrialExpired: false`
2. Trial expirado → `isTrialExpired: true`, `trialDaysLeft: 0`

---

### FASE 7: UI — Paywall y trial banners
**Objetivo:** Mostrar banners de trial y bloquear acceso post-trial

**Archivo nuevo:** `src/components/billing/TrialBanner.tsx`
- Banner superior fijo con countdown: "X days left in your trial — Choose a plan"
- Visible solo para usuarios trial con < 5 días restantes
- Link a /pricing

**Archivo nuevo:** `src/components/billing/Paywall.tsx`
- Pantalla completa que bloquea acceso cuando trial expira
- "Your 14-day trial has ended — Choose a plan to continue"
- Botones: Ver planes (primario) + Contact sales (secundario)
- Se muestra en lugar del contenido de cualquier workspace

**Integración en pages:** En cada página protegida (my-collections, collection workspaces, etc.):
```typescript
const { isTrialExpired, trialDaysLeft } = useSubscription();

if (isTrialExpired) {
  return <Paywall />;
}

return (
  <>
    {trialDaysLeft !== null && trialDaysLeft <= 5 && <TrialBanner daysLeft={trialDaysLeft} />}
    {/* existing page content */}
  </>
);
```

**Páginas que necesitan el Paywall:**
- `/my-collections`
- `/new-collection`
- `/collection/[id]/*` (todos los workspaces)
- `/planner/[id]`
- `/sketch-flow`
- `/trends`
- `/go-to-market/[id]`
- `/collection-calendar`

**Páginas que NO necesitan Paywall (acceso libre):**
- `/` (landing)
- `/pricing`
- `/account` (para poder cambiar plan/pagar)
- `/discover`
- `/contact`
- `/terms`, `/privacy`, `/cookies`

**Verificación:**
1. Trial activo, 3 días restantes → banner amarillo arriba
2. Trial expirado → paywall en todas las páginas de trabajo
3. Pagado → sin banner ni paywall
4. Admin → sin banner ni paywall

---

### FASE 8: Commit, deploy y test E2E
**Objetivo:** Todo funciona en producción

**Pasos:**
1. Ejecutar migración SQL en Supabase (Fase 1 + 2)
2. Marcar cuenta de Felipe como admin (Fase 3)
3. Build local: `npx next build` — sin errores
4. Commit todo con mensaje descriptivo
5. Push + deploy a Vercel
6. Tests manuales:
   - [ ] Login con cuenta admin → acceso total, sin límites
   - [ ] Crear usuario nuevo → trial 14 días, subscription creada automáticamente
   - [ ] Ruta AI sin login → 401
   - [ ] Ruta AI con login trial → funciona + usage incrementa
   - [ ] Simular trial expirado (UPDATE trial_ends_at a ayer) → paywall + 403 en APIs
   - [ ] Checkout Stripe con Starter → plan actualizado, límites aplicados
   - [ ] Starter con 2 colecciones → bloqueo al crear 3ra

---

## Resumen de Archivos a Crear/Modificar

### Nuevos:
| Archivo | Fase |
|---------|------|
| `supabase/migrations/010_fix_subscription_plans.sql` | 1 |
| `supabase/migrations/011_auto_trial_on_signup.sql` | 2 |
| `src/lib/api-auth.ts` | 4 |
| `src/components/billing/TrialBanner.tsx` | 7 |
| `src/components/billing/Paywall.tsx` | 7 |

### Modificados:
| Archivo | Fase | Cambio |
|---------|------|--------|
| `src/lib/stripe.ts` | 3 | Añadir ADMIN_EMAILS, isAdminUser() |
| `src/app/api/billing/subscription/route.ts` | 3, 6 | Admin bypass + trialEndsAt |
| `src/app/api/billing/usage/route.ts` | 3 | Admin bypass |
| `src/contexts/SubscriptionContext.tsx` | 6 | trialEndsAt, isTrialExpired, trialDaysLeft |
| `src/app/api/planner/create/route.ts` | 5 | Collection limit check |
| 16 rutas AI en `src/app/api/ai/` | 4 | Auth + usage check |
| ~10 pages en `src/app/` | 7 | Paywall + TrialBanner |

### No modificados (ya funcionan bien):
| Archivo | Razón |
|---------|-------|
| `src/app/api/webhooks/stripe/route.ts` | Ya actualiza plan correctamente |
| `src/app/api/billing/checkout/route.ts` | Ya crea sesión de checkout |
| `src/app/api/billing/portal/route.ts` | Ya abre portal |
| `src/components/billing/UpgradePrompt.tsx` | Ya muestra mensajes de upgrade |

---

## Orden de Ejecución

```
Fase 1 (DB fix) → Fase 2 (auto-trial) → Fase 3 (admin)
     ↓
Fase 4 (auth AI routes) → Fase 5 (collection limits)
     ↓
Fase 6 (context trial) → Fase 7 (UI paywall/banners)
     ↓
Fase 8 (deploy + test)
```

**Estimación:** ~25 archivos modificados, 3 nuevos, 2 migraciones SQL.
