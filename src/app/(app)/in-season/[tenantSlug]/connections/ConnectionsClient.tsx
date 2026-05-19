'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Connection {
  id: string;
  provider: 'shopify' | 'stripe';
  shop_domain: string | null;
  scopes: string[];
  status: 'active' | 'paused' | 'error' | 'revoked';
  last_sync_at: string | null;
  last_sync_records_count: number | null;
  last_sync_error: string | null;
  next_sync_at: string;
  sync_cadence_hours: number;
  created_at: string;
}

interface SyncRun {
  id: string;
  connection_id: string;
  trigger: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  records_count: number | null;
  error: string | null;
  duration_ms: number | null;
}

const STATUS_TONE: Record<Connection['status'], string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-rose-50 text-rose-700 border-rose-200',
  revoked: 'bg-carbon/[0.06] text-carbon/50 border-carbon/[0.12]',
};

export function ConnectionsClient({
  tenantSlug,
  connections,
  syncRuns,
}: {
  tenantSlug: string;
  connections: Connection[];
  syncRuns: SyncRun[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(connections.length === 0);
  const [provider, setProvider] = useState<'shopify' | 'stripe'>('shopify');
  const [shopDomain, setShopDomain] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [oauthShop, setOauthShop] = useState('');
  const [oauthBusy, setOauthBusy] = useState(false);

  const oauthSuccess = searchParams?.get('oauth_success');
  const oauthError = searchParams?.get('oauth_error');
  const oauthSuccessShop = searchParams?.get('shop');

  // Strip ?oauth_* query params from the URL after first paint so reload
  // doesn't keep showing the banner.
  useEffect(() => {
    if (oauthSuccess || oauthError) {
      const url = new URL(window.location.href);
      url.searchParams.delete('oauth_success');
      url.searchParams.delete('oauth_error');
      url.searchParams.delete('shop');
      window.history.replaceState({}, '', url.toString());
    }
  }, [oauthSuccess, oauthError]);

  const startShopifyOAuth = () => {
    const shop = oauthShop.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{0,59}\.myshopify\.com$/.test(shop)) {
      setError('El dominio debe ser <tu-tienda>.myshopify.com');
      return;
    }
    setOauthBusy(true);
    setError(null);
    const installUrl = `/api/in-season/oauth/shopify/install?shop=${encodeURIComponent(shop)}&tenant_slug=${encodeURIComponent(tenantSlug)}`;
    window.location.href = installUrl;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/in-season/sales-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: tenantSlug,
          provider,
          shop_domain: provider === 'shopify' ? shopDomain : null,
          access_token: accessToken,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'unknown' }));
        throw new Error(body.error ?? 'request failed');
      }
      router.refresh();
      setShowForm(false);
      setShopDomain('');
      setAccessToken('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const onSyncNow = async (connectionId: string) => {
    setSyncingId(connectionId);
    try {
      const res = await fetch(`/api/in-season/sales-connections/${connectionId}/sync`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'unknown' }));
        alert(`Sync falló: ${body.error ?? 'unknown'}`);
      }
      router.refresh();
    } finally {
      setSyncingId(null);
    }
  };

  const runsByConn = new Map<string, SyncRun[]>();
  for (const r of syncRuns) {
    const arr = runsByConn.get(r.connection_id) ?? [];
    arr.push(r);
    runsByConn.set(r.connection_id, arr);
  }

  return (
    <div className="space-y-6">
      {/* OAuth result banner */}
      {oauthSuccess === 'shopify' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-[16px] p-4 text-[13px] text-emerald-900">
          Tienda <span className="font-mono">{oauthSuccessShop}</span> conectada vía Shopify Partner App. La primera sincronización ya está encolada.
        </div>
      )}
      {oauthError && (
        <div className="bg-rose-50 border border-rose-200 rounded-[16px] p-4 text-[13px] text-rose-900">
          La instalación OAuth de Shopify falló: <span className="font-mono">{oauthError}</span>. Reintenta o usa el formulario de token manual abajo.
        </div>
      )}

      {/* Connection list */}
      {connections.map((conn) => {
        const tone = STATUS_TONE[conn.status];
        const lastSync = conn.last_sync_at ? new Date(conn.last_sync_at).toLocaleString('es-ES') : '—';
        const nextSync = new Date(conn.next_sync_at).toLocaleString('es-ES');
        const recentRuns = (runsByConn.get(conn.id) ?? []).slice(0, 5);
        return (
          <div key={conn.id} className="bg-white rounded-[20px] p-8 border border-carbon/[0.06]">
            <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[18px] font-semibold text-carbon capitalize">{conn.provider}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider ${tone}`}>
                    {conn.status}
                  </span>
                </div>
                <div className="text-[13px] text-carbon/60 font-mono">{conn.shop_domain ?? '—'}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onSyncNow(conn.id)}
                  disabled={syncingId === conn.id}
                  className="px-5 py-2 rounded-full bg-carbon text-white text-[12px] font-semibold disabled:opacity-50"
                >
                  {syncingId === conn.id ? 'Sincronizando…' : 'Sincronizar ahora'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <div className="text-[10px] uppercase tracking-[0.1em] text-carbon/40 mb-1">Última sync</div>
                <div className="text-[13px] text-carbon">{lastSync}</div>
                {conn.last_sync_records_count != null && (
                  <div className="text-[11px] text-carbon/50 mt-0.5">{conn.last_sync_records_count} records</div>
                )}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.1em] text-carbon/40 mb-1">Próxima sync</div>
                <div className="text-[13px] text-carbon">{nextSync}</div>
                <div className="text-[11px] text-carbon/50 mt-0.5">cada {conn.sync_cadence_hours}h</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.1em] text-carbon/40 mb-1">Scopes</div>
                <div className="text-[11px] text-carbon/70 font-mono">{conn.scopes.length} permisos</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.1em] text-carbon/40 mb-1">Creada</div>
                <div className="text-[13px] text-carbon">
                  {new Date(conn.created_at).toLocaleDateString('es-ES')}
                </div>
              </div>
            </div>

            {conn.last_sync_error && (
              <div className="bg-rose-50 border border-rose-200 rounded-[12px] p-3 text-[12px] text-rose-700 mb-4">
                Último error: {conn.last_sync_error}
              </div>
            )}

            {recentRuns.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.1em] text-carbon/40 mb-2">Historial reciente</div>
                <div className="space-y-1.5">
                  {recentRuns.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 text-[12px] py-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          r.status === 'success' ? 'bg-emerald-500' : r.status === 'error' ? 'bg-rose-500' : 'bg-amber-500'
                        }`}
                      />
                      <span className="text-carbon/70 font-mono w-32">{new Date(r.started_at).toLocaleString('es-ES')}</span>
                      <span className="text-carbon/50 capitalize w-16">{r.trigger}</span>
                      {r.records_count != null && (
                        <span className="text-carbon/60">{r.records_count} records</span>
                      )}
                      {r.duration_ms != null && (
                        <span className="text-carbon/40 ml-auto text-[11px]">{Math.round(r.duration_ms / 100) / 10}s</span>
                      )}
                      {r.error && (
                        <span className="text-rose-600 text-[11px] truncate max-w-md">{r.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add connection */}
      {showForm ? (
        <div className="space-y-4">
          {/* Shopify OAuth — recommended path */}
          <div className="bg-white rounded-[20px] p-8 border border-carbon/[0.06] space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-[18px] font-semibold text-carbon">Conectar Shopify</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-carbon text-white uppercase tracking-wider">
                  Recomendado
                </span>
              </div>
              <p className="text-[13px] text-carbon/55 leading-relaxed">
                Instala aimily In-Season en tu tienda Shopify. Te llevamos a Shopify, apruebas los
                permisos de lectura (products, orders, inventory, locations, customers, price rules,
                discounts, publications) y vuelves aquí con la conexión activa.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={oauthShop}
                onChange={(e) => setOauthShop(e.target.value)}
                placeholder="tu-tienda.myshopify.com"
                className="flex-1 min-w-[260px] px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30 font-mono"
              />
              <button
                type="button"
                onClick={startShopifyOAuth}
                disabled={oauthBusy || !oauthShop.trim()}
                className="px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold disabled:opacity-50 whitespace-nowrap"
              >
                {oauthBusy ? 'Redirigiendo…' : 'Conectar con Shopify →'}
              </button>
            </div>
            <p className="text-[11px] text-carbon/40 leading-relaxed">
              Tu access token se almacena cifrado en Supabase Vault. Nunca pasa por nuestro frontend
              ni se guarda en texto plano.
            </p>
          </div>

          {/* Manual token paste — fallback for Stripe + edge cases */}
          <form onSubmit={onSubmit} className="bg-white rounded-[20px] p-8 border border-carbon/[0.06] space-y-4">
            <h3 className="text-[18px] font-semibold text-carbon">Pegar token manual</h3>
            <p className="text-[13px] text-carbon/55 leading-relaxed">
              Para Stripe Connect o para tiendas Shopify configuradas como Custom App (un único shop,
              sin instalación pública).
            </p>
            <div>
              <label className="text-[11px] uppercase tracking-[0.1em] text-carbon/45 block mb-2">Proveedor</label>
              <div className="flex gap-2">
                {(['shopify', 'stripe'] as const).map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setProvider(p)}
                    className={`px-5 py-2 rounded-full text-[12px] font-medium border capitalize transition-colors ${
                      provider === p
                        ? 'bg-carbon text-white border-carbon'
                        : 'bg-white text-carbon/60 border-carbon/[0.12] hover:border-carbon/30'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            {provider === 'shopify' && (
              <div>
                <label className="text-[11px] uppercase tracking-[0.1em] text-carbon/45 block mb-2">Dominio Shopify</label>
                <input
                  type="text"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  placeholder="ejemplo.myshopify.com"
                  className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30 font-mono"
                  required
                />
              </div>
            )}
            <div>
              <label className="text-[11px] uppercase tracking-[0.1em] text-carbon/45 block mb-2">Admin API access token</label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={provider === 'shopify' ? 'shpat_xxxxxxxx' : 'sk_live_xxx'}
                className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30 font-mono"
                required
              />
            </div>
            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-[12px] p-3 text-[12px] text-rose-700">{error}</div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold disabled:opacity-50"
              >
                {submitting ? 'Guardando…' : 'Conectar'}
              </button>
              {connections.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 rounded-full border border-carbon/[0.12] text-carbon/60 text-[13px]"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="bg-white rounded-[20px] p-8 border border-dashed border-carbon/[0.15] w-full text-center text-[13px] text-carbon/60 hover:border-carbon/30 hover:text-carbon transition-colors"
        >
          + Añadir otro proveedor
        </button>
      )}
    </div>
  );
}
