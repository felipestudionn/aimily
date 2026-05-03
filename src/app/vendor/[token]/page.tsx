'use client';

/**
 * Phase 5 — Vendor portal landing page.
 *
 * Public route at /vendor/[token]. Read-only list of the SKUs this
 * vendor (factory) is allowed to see, with a click-through to the
 * tech-pack snapshot. No login.
 *
 * Differentiator vs Centric/FlexPLM: those tools require vendors to
 * have a paid seat. Aimily ships token-link sharing — same UX as
 * sharing a Figma file with a contractor.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2, AlertTriangle, ChevronRight, Globe } from 'lucide-react';

interface VendorSku {
  id: string;
  name: string;
  family: string;
  category: string;
  sketch_url: string | null;
  sketch_top_url: string | null;
  render_urls: Record<string, string> | null;
  cost: number | null;
}

interface VendorPortalData {
  collection: { id: string; name: string; season: string } | null;
  vendor: { name: string | null; email: string };
  permissions: Record<string, boolean>;
  expires_at: string;
  skus: VendorSku[];
}

export default function VendorPortalPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<VendorPortalData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/vendor-portal/${params.token}`);
      if (cancelled) return;
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? 'Could not load vendor portal');
        return;
      }
      setData((await res.json()) as VendorPortalData);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-shade px-6">
        <div className="max-w-md text-center">
          <AlertTriangle className="h-10 w-10 mx-auto text-red-500 mb-4" />
          <h1 className="text-[24px] font-semibold text-carbon mb-2">Access denied</h1>
          <p className="text-[14px] text-carbon/60">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-shade">
        <Loader2 className="h-6 w-6 animate-spin text-carbon/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-shade">
      <header className="bg-white border-b border-carbon/[0.06]">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/40">
              Vendor portal · aimily
            </p>
            <h1 className="text-[24px] font-semibold text-carbon tracking-[-0.02em] mt-0.5">
              {data.collection?.name ?? 'Collection'}{' '}
              <span className="text-carbon/40 font-medium">{data.collection?.season}</span>
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-carbon/60">
              {data.vendor.name ?? data.vendor.email}
            </p>
            <p className="text-[11px] text-carbon/40">
              Access expires {new Date(data.expires_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h2 className="text-[18px] font-semibold text-carbon tracking-[-0.01em]">
              Assigned SKUs ({data.skus.length})
            </h2>
            <p className="text-[12px] text-carbon/55 mt-0.5">
              Click a SKU to read its current tech pack snapshot.
            </p>
          </div>
          {data.permissions?.translate && (
            <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.04em] uppercase font-semibold text-carbon/65 px-3 py-1.5 rounded-full bg-carbon/[0.04]">
              <Globe className="h-3 w-3" />
              AI translation enabled
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.skus.map((sku) => {
            const cover = sku.sketch_url ?? (sku.render_urls?.['3d'] ?? null);
            return (
              <Link
                key={sku.id}
                href={`/vendor/${params.token}/sku/${sku.id}`}
                className="group bg-white rounded-[16px] overflow-hidden border border-carbon/[0.06] hover:border-carbon/15 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all"
              >
                <div className="aspect-[4/3] bg-carbon/[0.04] relative overflow-hidden">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt={sku.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-carbon/30 text-[12px]">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-carbon/40 font-semibold mb-1">
                    {sku.family}
                  </p>
                  <h3 className="text-[15px] font-semibold text-carbon tracking-[-0.01em] flex items-center justify-between">
                    {sku.name}
                    <ChevronRight className="h-4 w-4 text-carbon/30 group-hover:translate-x-0.5 transition-transform" />
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
