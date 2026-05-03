'use client';

/**
 * Phase 5 — Vendor portal SKU detail page.
 *
 * Read-only tech-pack snapshot for a single SKU. Pulls from the
 * current approved revision so the vendor never sees an in-flight
 * draft. AI translation toggle on the right rewrites the user-visible
 * fields (header strings, factory notes) into the vendor's language.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Globe } from 'lucide-react';

interface VendorSkuSnapshot {
  sku: {
    id: string;
    name: string;
    family: string;
    category: string;
    sketch_url: string | null;
    sketch_top_url: string | null;
    render_urls: Record<string, string> | null;
  };
  revision: { id: string; version: string; approval_status: string; created_at: string } | null;
  snapshot: {
    header: Record<string, unknown>;
    drawings: Record<string, unknown>;
    measurements: Record<string, unknown>;
    bom: Record<string, unknown>;
    materials: Record<string, unknown>;
    factory_notes: Record<string, unknown>;
    cost_breakdown: Record<string, unknown>;
  };
}

const TRANSLATE_OPTIONS = [
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中' },
  { code: 'it', label: 'IT' },
  { code: 'tr', label: 'TR' },
  { code: 'pt', label: 'PT' },
  { code: 'vi', label: 'VI' },
];

export default function VendorSkuPage() {
  const params = useParams<{ token: string; skuId: string }>();
  const [data, setData] = useState<VendorSkuSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [translatedNotes, setTranslatedNotes] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/vendor-portal/${params.token}/sku/${params.skuId}`);
      if (cancelled) return;
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? 'Could not load SKU');
        return;
      }
      setData((await res.json()) as VendorSkuSnapshot);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.token, params.skuId]);

  async function translate(text: string, locale: string, key: string) {
    setTranslating(`${key}|${locale}`);
    const res = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: params.token, text, target_locale: locale }),
    });
    setTranslating(null);
    if (!res.ok) return;
    const j = (await res.json()) as { translated: string };
    setTranslatedNotes((prev) => ({ ...prev, [`${key}|${locale}`]: j.translated }));
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-shade px-6 text-center">
        <div>
          <p className="text-[14px] text-carbon/60">{error}</p>
          <Link href={`/vendor/${params.token}`} className="text-[13px] text-carbon underline mt-3 inline-block">
            Back to portal
          </Link>
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

  const factoryNotesText =
    typeof data.snapshot.factory_notes === 'object' && data.snapshot.factory_notes
      ? (data.snapshot.factory_notes as { text?: string }).text ?? ''
      : '';
  const bomLines =
    (data.snapshot.bom as { lines?: Array<{ type?: string; material?: string; qty?: string; unit?: string }> }).lines ?? [];
  const measurements =
    (data.snapshot.measurements as { rows?: Array<{ point?: string; xs?: string; s?: string; m?: string; l?: string; xl?: string }> }).rows ?? [];

  return (
    <div className="min-h-screen bg-shade">
      <header className="bg-white border-b border-carbon/[0.06] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <Link href={`/vendor/${params.token}`} className="inline-flex items-center gap-1.5 text-[12px] text-carbon/60 hover:text-carbon">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to assigned SKUs
          </Link>
          {data.revision && (
            <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.05em] uppercase font-semibold text-carbon/70 px-3 py-1.5 rounded-full bg-carbon/[0.04]">
              {data.revision.version} · {data.revision.approval_status}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/45">
            {data.sku.family} · {data.sku.category}
          </p>
          <h1 className="text-[32px] font-medium text-carbon tracking-[-0.03em] mt-1">{data.sku.name}</h1>
        </div>

        {/* Drawings */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.sku.sketch_url && (
            <div className="bg-white rounded-[14px] overflow-hidden border border-carbon/[0.06]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.sku.sketch_url} alt="Side view" className="w-full aspect-[4/3] object-contain" />
              <p className="text-[11px] uppercase tracking-[0.15em] text-carbon/45 px-4 py-2">Side view</p>
            </div>
          )}
          {data.sku.sketch_top_url && (
            <div className="bg-white rounded-[14px] overflow-hidden border border-carbon/[0.06]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.sku.sketch_top_url} alt="Top view" className="w-full aspect-[4/3] object-contain" />
              <p className="text-[11px] uppercase tracking-[0.15em] text-carbon/45 px-4 py-2">Top-down view</p>
            </div>
          )}
        </section>

        {/* Measurements */}
        {measurements.length > 0 && (
          <section className="bg-white rounded-[14px] border border-carbon/[0.06] p-6">
            <h2 className="text-[14px] font-semibold text-carbon tracking-[-0.01em] mb-3">Measurements</h2>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.1em] text-carbon/45">
                  <th className="text-left pb-2">Point</th>
                  <th className="text-left pb-2">XS</th>
                  <th className="text-left pb-2">S</th>
                  <th className="text-left pb-2">M</th>
                  <th className="text-left pb-2">L</th>
                  <th className="text-left pb-2">XL</th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((row, i) => (
                  <tr key={i} className="border-t border-carbon/[0.05]">
                    <td className="py-2 text-carbon font-medium">{row.point}</td>
                    <td className="py-2 text-carbon/65">{row.xs ?? '—'}</td>
                    <td className="py-2 text-carbon/65">{row.s ?? '—'}</td>
                    <td className="py-2 text-carbon/65">{row.m ?? '—'}</td>
                    <td className="py-2 text-carbon/65">{row.l ?? '—'}</td>
                    <td className="py-2 text-carbon/65">{row.xl ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* BOM */}
        {bomLines.length > 0 && (
          <section className="bg-white rounded-[14px] border border-carbon/[0.06] p-6">
            <h2 className="text-[14px] font-semibold text-carbon tracking-[-0.01em] mb-3">Bill of Materials</h2>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.1em] text-carbon/45">
                  <th className="text-left pb-2">Type</th>
                  <th className="text-left pb-2">Material</th>
                  <th className="text-left pb-2">Qty</th>
                  <th className="text-left pb-2">Unit</th>
                </tr>
              </thead>
              <tbody>
                {bomLines.map((line, i) => (
                  <tr key={i} className="border-t border-carbon/[0.05]">
                    <td className="py-2 text-carbon font-medium">{line.type}</td>
                    <td className="py-2 text-carbon/75">{line.material}</td>
                    <td className="py-2 text-carbon/65">{line.qty ?? '—'}</td>
                    <td className="py-2 text-carbon/45">{line.unit ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Factory notes — translatable */}
        {factoryNotesText && (
          <section className="bg-white rounded-[14px] border border-carbon/[0.06] p-6">
            <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-[14px] font-semibold text-carbon tracking-[-0.01em]">Factory notes</h2>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Globe className="h-3.5 w-3.5 text-carbon/40" />
                {TRANSLATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => translate(factoryNotesText, opt.code, 'factory_notes')}
                    disabled={translating === `factory_notes|${opt.code}`}
                    className="text-[10px] uppercase tracking-[0.08em] font-semibold text-carbon/65 px-2 py-1 rounded-full bg-carbon/[0.04] hover:bg-carbon/[0.08] disabled:opacity-50"
                  >
                    {translating === `factory_notes|${opt.code}` ? '…' : opt.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[13px] text-carbon/75 leading-snug whitespace-pre-wrap">{factoryNotesText}</p>
            {Object.entries(translatedNotes)
              .filter(([k]) => k.startsWith('factory_notes|'))
              .map(([k, v]) => (
                <div key={k} className="mt-3 pt-3 border-t border-carbon/[0.05]">
                  <p className="text-[10px] uppercase tracking-[0.1em] font-semibold text-carbon/40 mb-1">
                    {k.split('|')[1]}
                  </p>
                  <p className="text-[13px] text-carbon/75 leading-snug whitespace-pre-wrap">{v}</p>
                </div>
              ))}
          </section>
        )}
      </main>
    </div>
  );
}
