'use client';

/**
 * PDF + verdict viewer (v1).
 *
 * Layout: PDF rendered with PDF.js on the left, scrollable list of SKU
 * verdict chips on the right, click-a-SKU opens a drawer with the full
 * evidence + assumptions + a rotation editor.
 *
 * v1 deliberately does NOT position overlays on top of the PDF rows — the
 * text-layer matching for that is a follow-up. v1 ships the data and the
 * drawer so Felipe can validate the verdict model end-to-end.
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2, X, ChevronRight } from 'lucide-react';

interface VerdictAction {
  action:
    | 'kill'
    | 'markdown_accelerate'
    | 'replenish'
    | 'resize_down'
    | 'investigate'
    | 'amplify_winner'
    | 'extend_colors'
    | 'carryover'
    | 'hold';
  confidence: number;
  rationale: string;
  recommended_units: number | null;
  confidence_breakdown: {
    data_completeness: number | null;
    identity: number | null;
    demand: number | null;
    margin: number | null;
    creative_fit: number | null;
  };
  evidence: Record<string, unknown>;
  counter_evidence: Record<string, unknown>;
  assumptions: string[];
  data_sufficiency_warning: string | null;
}

interface SkuRow {
  /** 1-based position matching the SKU's row order in the original PDF.
   *  Renders as a small numbered square so the buyer can map a verdict
   *  card 1:1 to the corresponding line on the Zara RNK page. */
  rank: number;
  product_fact_id: string;
  model_ref: string | null;
  color_ref: string | null;
  product_name: string | null;
  family_code: string | null;
  pvp: number | null;
  velocity_7d: number | null;
  velocity_d1: number | null;
  stores_active: number | null;
  stores_with_stock: number | null;
  stock_total: number | null;
  target_rotation_days: number;
  current_stock_days: number | null;
  actions: VerdictAction[];
  modulator_notes: Array<{ kind: 'archetype' | 'budget' | 'brief'; note: string }>;
}

interface ApiResponse {
  run_id: string;
  pdf_signed_url: string | null;
  target_rotation_days_default: number;
  archetype_id: string | null;
  target_buy_budget_eur: number | null;
  skus: SkuRow[];
  summary: { total_skus: number; action_counts: Record<string, number> };
}

const ACTION_LABEL_ES: Record<VerdictAction['action'], string> = {
  kill: 'Kill',
  markdown_accelerate: 'Markdown',
  replenish: 'Reponer',
  resize_down: 'Reducir',
  investigate: 'Investigar',
  amplify_winner: 'Replicar arquetipo',
  extend_colors: 'Extender colores',
  carryover: 'Mantener',
  hold: 'Esperar',
};

const ACTION_TONE: Record<VerdictAction['action'], string> = {
  kill: 'bg-red-50 text-red-700',
  markdown_accelerate: 'bg-amber-50 text-amber-700',
  replenish: 'bg-emerald-50 text-emerald-700',
  resize_down: 'bg-orange-50 text-orange-700',
  investigate: 'bg-blue-50 text-blue-700',
  amplify_winner: 'bg-violet-50 text-violet-700',
  extend_colors: 'bg-indigo-50 text-indigo-700',
  carryover: 'bg-emerald-50 text-emerald-700',
  hold: 'bg-carbon/[0.06] text-carbon/55',
};

export function PdfOverlayViewer({ runId, tenantSlug: _tenantSlug }: { runId: string; tenantSlug: string }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeSkuId, setActiveSkuId] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<VerdictAction['action'] | 'all'>('all');
  const pdfCanvasRef = useRef<HTMLDivElement>(null);

  // Fetch verdicts + PDF signed URL once on mount.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/strategy/runs/${runId}/skus`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as ApiResponse;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Load failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [runId]);

  // Render PDF with PDF.js when the signed URL is available.
  useEffect(() => {
    if (!data?.pdf_signed_url || !pdfCanvasRef.current) return;
    const container = pdfCanvasRef.current;
    container.innerHTML = '';
    let cancelled = false;

    (async () => {
      try {
        // Dynamic import keeps PDF.js out of the server bundle.
        const pdfjs = await import('pdfjs-dist');
        // Self-host the worker from /public so the CSP doesn't block it.
        // cdnjs is not in `worker-src` of our CSP, and adding it would
        // need a security review for every new host. Copying the worker
        // to /public/pdf.worker.min.mjs sidesteps the issue entirely.
        // The file is mirrored at build time from node_modules/pdfjs-dist.
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const loadingTask = pdfjs.getDocument(data.pdf_signed_url!);
        const pdf = await loadingTask.promise;
        // Crisp render on retina screens: combine a generous base scale
        // (2.0) with devicePixelRatio so the canvas is high-resolution
        // internally while the visual size matches the base viewport.
        const baseScale = 2.0;
        const dpr = window.devicePixelRatio || 1;
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: baseScale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.className = 'block mx-auto mb-4 shadow-sm bg-white';
          container.appendChild(canvas);
          const renderCtx = canvas.getContext('2d');
          if (!renderCtx) continue;
          // The transform compensates for the canvas-pixel inflation so the
          // PDF content fills the canvas at the requested DPR.
          const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
          await page.render({
            canvasContext: renderCtx,
            viewport,
            transform,
          } as Parameters<typeof page.render>[0]).promise;
        }
      } catch (err) {
        console.error('[PdfViewer] render failed', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        if (container && !cancelled) {
          container.innerHTML = `<p class="text-[13px] text-red-700 p-4">No se pudo renderizar el PDF: ${errMsg}</p>`;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data?.pdf_signed_url]);

  const activeSku = data?.skus.find((s) => s.product_fact_id === activeSkuId) ?? null;
  const filteredSkus = data?.skus.filter((sku) =>
    actionFilter === 'all'
      ? true
      : sku.actions.some((a) => a.action === actionFilter)
  ) ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-carbon/55">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-[13px]">Cargando verdicts…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-5 bg-red-50 border border-red-200 rounded-[14px] text-[13px] text-red-800">
        {error}
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* PDF column · scrollable */}
      <div className="flex-1 overflow-y-auto bg-shade p-4">
        {data.pdf_signed_url ? (
          <div ref={pdfCanvasRef} />
        ) : (
          <div className="h-full flex items-center justify-center text-carbon/40 text-[13px] italic">
            Sin PDF disponible para este run · {data.summary.total_skus} SKUs analizados
          </div>
        )}
      </div>

      {/* SKU verdicts column · fixed width */}
      <aside className="w-[420px] border-l border-carbon/[0.06] bg-white overflow-y-auto">
        {/* Filter bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-carbon/[0.06] p-3">
          <div className="text-[10px] uppercase tracking-[0.1em] text-carbon/40 mb-2">
            {data.summary.total_skus} SKUs · Arquetipo {data.archetype_id ?? '—'}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip label="Todos" count={data.summary.total_skus} active={actionFilter === 'all'} onClick={() => setActionFilter('all')} />
            {(Object.keys(ACTION_LABEL_ES) as VerdictAction['action'][]).map((a) => {
              const c = data.summary.action_counts[a] || 0;
              if (c === 0) return null;
              return (
                <FilterChip
                  key={a}
                  label={ACTION_LABEL_ES[a]}
                  count={c}
                  active={actionFilter === a}
                  tone={ACTION_TONE[a]}
                  onClick={() => setActionFilter(a)}
                />
              );
            })}
          </div>
        </div>
        {/* SKU list */}
        <ul>
          {filteredSkus.map((sku) => (
            <li key={sku.product_fact_id}>
              <button
                type="button"
                onClick={() => setActiveSkuId(sku.product_fact_id)}
                className={`w-full text-left p-3 border-b border-carbon/[0.04] hover:bg-carbon/[0.02] transition-colors ${
                  activeSkuId === sku.product_fact_id ? 'bg-carbon/[0.04]' : ''
                }`}
              >
                <div className="flex items-start gap-2.5 mb-1.5">
                  {/* Ranking square · matches Zara RNK row position 1:1. */}
                  <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 bg-carbon text-white text-[11px] font-semibold tabular-nums rounded-[6px]">
                    {sku.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-carbon/40 uppercase tracking-[0.08em] truncate">
                      {sku.family_code || 'sku'}
                    </p>
                    <p className="text-[13px] font-medium text-carbon truncate" title={sku.product_name || sku.model_ref || ''}>
                      {sku.product_name || sku.model_ref || sku.product_fact_id.slice(0, 8)}
                    </p>
                    {sku.model_ref && sku.product_name && (
                      <p className="text-[10px] text-carbon/45 font-mono truncate">{sku.model_ref}</p>
                    )}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-carbon/30 mt-1 shrink-0" />
                </div>
                <div className="pl-[42px] space-y-1.5">
                  <div className="flex flex-wrap gap-1">
                    {sku.actions.map((a) => (
                      <span
                        key={a.action}
                        className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.06em] ${ACTION_TONE[a.action]}`}
                      >
                        {ACTION_LABEL_ES[a.action]}
                        {a.recommended_units != null && a.recommended_units > 0 ? ` · ${a.recommended_units} uds` : ''}
                      </span>
                    ))}
                  </div>
                  {sku.actions[0]?.rationale && (
                    <p className="text-[11px] text-carbon/60 leading-[1.45] line-clamp-2">
                      {sku.actions[0].rationale}
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Drawer with verdict detail */}
      {activeSku && (
        <SkuDrawer sku={activeSku} onClose={() => setActiveSkuId(null)} />
      )}
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  tone,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  tone?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.06em] transition-colors ${
        active
          ? 'bg-carbon text-white'
          : tone || 'bg-carbon/[0.04] text-carbon/60 hover:bg-carbon/[0.08]'
      }`}
    >
      {label} <span className="tabular-nums">{count}</span>
    </button>
  );
}

function SkuDrawer({ sku, onClose }: { sku: SkuRow; onClose: () => void }) {
  return (
    <div className="fixed inset-y-0 right-0 z-20 w-[520px] bg-white border-l border-carbon/[0.06] shadow-2xl overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white border-b border-carbon/[0.06] p-4 flex items-start gap-3">
        <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 bg-carbon text-white text-[14px] font-semibold tabular-nums rounded-[8px]">
          {sku.rank}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-carbon/40 uppercase tracking-[0.08em] truncate">
            {sku.family_code || 'sku'} · {sku.model_ref || ''}
          </p>
          <h2 className="text-[16px] font-semibold text-carbon truncate" title={sku.product_name || ''}>
            {sku.product_name || sku.model_ref || sku.product_fact_id.slice(0, 8)}
          </h2>
        </div>
        <button type="button" onClick={onClose} className="text-carbon/40 hover:text-carbon shrink-0 mt-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Operational quick-stats */}
        <section className="grid grid-cols-3 gap-2 text-[11px]">
          <Stat label="Precio" value={sku.pvp != null ? `€${Number(sku.pvp).toFixed(2)}` : '—'} />
          <Stat label="Velocidad 7d" value={sku.velocity_7d?.toLocaleString() ?? '—'} />
          <Stat label="Stock días" value={sku.current_stock_days != null ? `${sku.current_stock_days}d` : '—'} />
          <Stat label="Tiendas activas" value={sku.stores_active?.toLocaleString() ?? '—'} />
          <Stat label="Stock total" value={sku.stock_total?.toLocaleString() ?? '—'} />
          <Stat label="Rotación target" value={`${sku.target_rotation_days}d`} />
        </section>

        {/* Modulator notes (archetype/budget/brief annotations) */}
        {sku.modulator_notes.length > 0 && (
          <section className="bg-amber-50 border border-amber-200 rounded-[10px] p-3 space-y-1">
            {sku.modulator_notes.map((n, i) => (
              <p key={i} className="text-[11px] text-amber-900">
                · {n.note}
              </p>
            ))}
          </section>
        )}

        {/* Actions stack */}
        <section className="space-y-3">
          {sku.actions.map((a, i) => (
            <div key={`${a.action}-${i}`} className="border border-carbon/[0.06] rounded-[12px] p-3">
              <div className="flex items-baseline justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-[0.06em] font-semibold ${ACTION_TONE[a.action]}`}
                  >
                    {ACTION_LABEL_ES[a.action]}
                  </span>
                  <span className="text-[11px] text-carbon/50">
                    confianza {Math.round(a.confidence * 100)}%
                  </span>
                </div>
                {a.recommended_units != null && a.recommended_units > 0 && (
                  <span className="text-[14px] font-semibold tabular-nums">
                    {a.recommended_units.toLocaleString()} uds
                  </span>
                )}
              </div>
              {a.rationale && (
                <p className="text-[13px] text-carbon leading-[1.55] mb-3">
                  {a.rationale}
                </p>
              )}
              {a.data_sufficiency_warning && (
                <p className="text-[11px] text-amber-800 italic mb-2">⚠ {a.data_sufficiency_warning}</p>
              )}
              <details className="text-[11px]">
                <summary className="cursor-pointer text-carbon/50 hover:text-carbon select-none mb-2">
                  Ver datos detrás
                </summary>
                <EvidenceList obj={a.evidence} />
                {a.assumptions.length > 0 && (
                  <ul className="mt-2 text-[10px] text-carbon/55 space-y-0.5">
                    {a.assumptions.map((s, j) => (
                      <li key={j}>· {s}</li>
                    ))}
                  </ul>
                )}
              </details>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-carbon/[0.03] rounded-[8px] p-2">
      <div className="text-[9px] text-carbon/40 uppercase tracking-[0.06em] truncate">{label}</div>
      <div className="text-[13px] font-semibold text-carbon tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

/** Lightweight inline evidence list. Renders scalar fields only — nested
 *  objects skipped to keep the drawer scannable. */
function EvidenceList({ obj }: { obj: Record<string, unknown> }) {
  const entries = Object.entries(obj).filter(
    ([, v]) => v != null && typeof v !== 'object'
  );
  if (entries.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
      {entries.slice(0, 8).map(([k, v]) => (
        <li key={k} className="flex justify-between gap-2">
          <span className="text-carbon/45 truncate">{k.replace(/_/g, ' ')}</span>
          <span className="font-medium tabular-nums text-right truncate">
            {typeof v === 'number'
              ? Number.isInteger(v)
                ? v.toLocaleString()
                : (v as number).toFixed(3)
              : String(v)}
          </span>
        </li>
      ))}
    </ul>
  );
}
