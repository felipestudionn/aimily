/* ═══════════════════════════════════════════════════════════════════
   Vercel Domains API helper · Ecom block

   Why this exists:
   We can't get a wildcard SSL for *.aimily.shop because:
   - Cloudflare Free doesn't allow proxied wildcard records (only Business+)
   - Vercel can't emit wildcard SSL without DNS access (Let's Encrypt
     requires DNS-01 challenge for wildcards, and our DNS is in Cloudflare)

   Solution (production-grade · zero recurring cost · zero manual ops):
   When a user publishes a storefront at <sub>.aimily.shop, the publish
   endpoint registers <sub>.aimily.shop as a project domain in Vercel
   via this API. Vercel performs an HTTP-01 challenge (which CAN succeed
   because the wildcard CNAME in Cloudflare DNS already routes traffic
   to Vercel) and issues a single-host SSL cert in 30-90 seconds.

   When unpublished, we remove the project domain so Vercel cleans up
   the cert and we don't accumulate stale records.

   Rate limit: Let's Encrypt allows 50 certs/week per registered domain.
   For 100s of brands publishing/republishing in a week, this is the
   ceiling we need to monitor — but it's far above MVP scale.

   Required env vars:
   - VERCEL_API_TOKEN  (read from `~/Library/Application Support/com.vercel.cli/auth.json`
                        in dev; set in Vercel project env in production)
   - VERCEL_TEAM_ID    (defaults to felipe's projects team)
   ═══════════════════════════════════════════════════════════════════ */

const VERCEL_API_BASE = 'https://api.vercel.com';
const PROJECT_NAME = 'aimily';
const TEAM_ID = process.env.VERCEL_TEAM_ID || 'team_kieSXcYQ6bbTv4a94IR2DN1e';

function authHeaders(): HeadersInit {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) {
    throw new Error('VERCEL_API_TOKEN not set — cannot register storefront domains');
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export interface VercelDomainResponse {
  name: string;
  apexName: string;
  verified: boolean;
  createdAt?: number;
}

/**
 * Register a domain to the aimily Vercel project. Triggers automatic
 * SSL cert issuance via HTTP-01 once Vercel sees DNS routes to its edge.
 *
 * Idempotent: if the domain already exists (409), returns success.
 *
 * Failure modes (returned as { ok: false, error }):
 * - Vercel API down → publish endpoint can still write the DB row but
 *   warn the user that SSL is pending. Re-trying register will succeed.
 * - VERCEL_API_TOKEN missing → throws (caught at endpoint level)
 * - Domain already on a different project → 403 from Vercel
 */
export async function registerStorefrontDomain(domain: string): Promise<{
  ok: boolean;
  domain?: VercelDomainResponse;
  error?: string;
  alreadyExists?: boolean;
}> {
  try {
    const res = await fetch(
      `${VERCEL_API_BASE}/v10/projects/${PROJECT_NAME}/domains?teamId=${TEAM_ID}`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: domain }),
      },
    );

    if (res.ok) {
      const data = (await res.json()) as VercelDomainResponse;
      return { ok: true, domain: data };
    }

    if (res.status === 409) {
      return { ok: true, alreadyExists: true };
    }

    const errBody = await res.text();
    console.error('[vercel-domains] register failed:', res.status, errBody.slice(0, 200));
    return { ok: false, error: `Vercel API ${res.status}` };
  } catch (e) {
    console.error('[vercel-domains] register threw:', e);
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

/**
 * Remove a domain from the aimily Vercel project. Frees the SSL cert
 * and lets a new owner claim the same subdomain in the future.
 *
 * Idempotent: 404 (already removed or never registered) is success.
 */
export async function unregisterStorefrontDomain(domain: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(
      `${VERCEL_API_BASE}/v9/projects/${PROJECT_NAME}/domains/${encodeURIComponent(domain)}?teamId=${TEAM_ID}`,
      {
        method: 'DELETE',
        headers: authHeaders(),
      },
    );

    if (res.ok || res.status === 404) {
      return { ok: true };
    }

    const errBody = await res.text();
    console.error('[vercel-domains] unregister failed:', res.status, errBody.slice(0, 200));
    return { ok: false, error: `Vercel API ${res.status}` };
  } catch (e) {
    console.error('[vercel-domains] unregister threw:', e);
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

/**
 * Check current domain registration + SSL state on Vercel.
 * Used by the EcomHub UI to show "SSL pending… / Live" feedback after publish.
 */
export async function getStorefrontDomainStatus(domain: string): Promise<{
  registered: boolean;
  verified?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(
      `${VERCEL_API_BASE}/v9/projects/${PROJECT_NAME}/domains/${encodeURIComponent(domain)}?teamId=${TEAM_ID}`,
      { headers: authHeaders() },
    );

    if (res.status === 404) return { registered: false };

    if (!res.ok) {
      return { registered: false, error: `Vercel API ${res.status}` };
    }

    const data = await res.json();
    return { registered: true, verified: data.verified };
  } catch (e) {
    return { registered: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

/**
 * Build the canonical public URL for a storefront subdomain.
 */
export function buildStorefrontUrl(subdomain: string): string {
  const baseDomain = process.env.NEXT_PUBLIC_STOREFRONT_BASE_DOMAIN ?? 'aimily.shop';
  return `https://${subdomain}.${baseDomain}`;
}
