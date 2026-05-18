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
import { Loader2, ChevronRight } from 'lucide-react';

interface VerdictAction {
  // 13-verb spec taxonomy (2026-05-17). The legacy aliases (investigate,
  // amplify_winner) are retained so verdicts persisted with prior schema
  // still render. Source of truth: SkuVerdictAction in sku-verdict-resolver.ts.
  action:
    // THIS WEEK / TODAY
    | 'kill'
    | 'markdown_accelerate'
    | 'amplify_distribution'
    | 'pull_forward_intake'
    // THIS MONTH
    | 'replenish'
    | 'amplify_in_season'
    | 'promote_push'
    | 'resize_down'
    | 'investigate_root_cause'
    // NEXT SEASON
    | 'amplify_next_season'
    | 'extend_colors'
    | 'carryover'
    // FALLBACK
    | 'hold'
    // LEGACY ALIASES (deprecated)
    | 'investigate'
    | 'amplify_winner';
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
  /** Six Right anchor (Kincade & Gibson Ch.4). Populated by enrichVerdict
   *  in sku-verdict-resolver.ts before the API responds. */
  six_right?:
    | 'right_product'
    | 'right_price'
    | 'right_place'
    | 'right_time'
    | 'right_quantity'
    | 'right_promotion';
  /** Owner role (Jackson & Shaw discipline boundary). Populated by
   *  enrichVerdict in sku-verdict-resolver.ts. */
  owner?: 'buyer' | 'merchandiser' | 'both' | 'marketing' | 'design' | 'supply_chain';
}

/** Spanish-language labels for the Six Right (right_product etc.) — used
 *  as a small pill under the action title. */
const SIX_RIGHT_LABEL_ES: Record<NonNullable<VerdictAction['six_right']>, string> = {
  right_product: 'Right Product',
  right_price: 'Right Price',
  right_place: 'Right Place',
  right_time: 'Right Time',
  right_quantity: 'Right Quantity',
  right_promotion: 'Right Promotion',
};

/** Spanish-language labels for the owner role. */
const OWNER_LABEL_ES: Record<NonNullable<VerdictAction['owner']>, string> = {
  buyer: 'Comprador',
  merchandiser: 'Comercial',
  both: 'Comprador + Comercial',
  marketing: 'Marketing',
  design: 'Diseño',
  supply_chain: 'Supply chain',
};

interface HeadlineKpiValue {
  value: number | null;
  source: 'tenant' | 'synthetic';
  label?: string;
}

interface HeadlineKpis {
  gmroi: HeadlineKpiValue;
  str_vs_plan_pp: HeadlineKpiValue;
  fwoc_lt_ratio: HeadlineKpiValue;
  s_s_ratio: HeadlineKpiValue;
  maintained_markup_pct: HeadlineKpiValue;
}

/** v2 — KPIs comerciales/operacionales del comprador, leídos del trace
 *  v2_signals que F2 persiste. Se muestran en una segunda fila bajo los
 *  5 KPIs cabecera financieros, para que el comprador vea de un vistazo
 *  los KPIs canónicos de retail merchandising. */
interface CommercialKpis {
  /** Rotación 7d ajustada. >1 = excepcional, 0.5-1 = sana, <0.5 = estancada. */
  rotation_aj_7d: number | null;
  /** Aportación: % de la facturación de la familia que representa este SKU. */
  family_contribution_pct: number | null;
  /** Activación diaria: % de tiendas activas que vendieron ayer. */
  daily_activation_pct: number | null;
  /** Espacio al techo: % de espacio que queda antes de saturar capacidad. */
  capacity_headroom_pct: number | null;
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
  days_in_store: number | null;
  target_rotation_days: number;
  current_stock_days: number | null;
  actions: VerdictAction[];
  modulator_notes: Array<{ kind: 'archetype' | 'budget' | 'brief'; note: string }>;
  /** Spec v1 — the 5 headline KPIs a buyer expects to see before drilling
   *  into verdicts. Populated by computeHeadlineKpis on the server. */
  headline_kpis?: HeadlineKpis;
  /** Spec v2 §2 — KPIs comerciales leídos de v2_signals. */
  commercial_kpis?: CommercialKpis;
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
  // THIS WEEK
  kill: 'Matar',
  markdown_accelerate: 'Rebajar',
  amplify_distribution: 'Ampliar distribución',
  pull_forward_intake: 'Adelantar pedido pendiente',
  // THIS MONTH
  // Felipe 2026-05-18: vocabulario retail real. Dos verbos REPONER
  // distintos con su intención visible — el comprador lee la razón en
  // el propio nombre del verbo, no en la rationale.
  replenish: 'Reponer por rotura de stock',
  amplify_in_season: 'Reponer para maximizar la venta',
  promote_push: 'Promocionar',
  resize_down: 'Reducir compra',
  investigate_root_cause: 'Marcar para revisión',
  // NEXT SEASON
  amplify_next_season: 'Briefar diseño',
  extend_colors: 'Extender colores',
  carryover: 'Mantener',
  // FALLBACK
  hold: 'Esperar',
  // LEGACY ALIASES — surface with same labels as the split versions
  // so persisted rows render coherently. Will be removed after the
  // resolver is migrated entirely off them.
  investigate: 'Marcar para revisión',
  amplify_winner: 'Replicar estilo',
};

// Aimily accent palette. Each action keys to a different brand colour so
// the buyer can scan a page of SKUs and tell verdicts apart at a glance.
// Tokens (tailwind.config.js): error / warning / success / sea-foam / moss
// / clay / citronella / midnight / linen / carbon.
const ACTION_TONE: Record<VerdictAction['action'], string> = {
  // THIS WEEK — urgent (warning / error palette)
  kill: 'bg-error/15 text-error',
  markdown_accelerate: 'bg-warning/15 text-warning',
  amplify_distribution: 'bg-success/30 text-success',
  pull_forward_intake: 'bg-warning/30 text-warning',
  // THIS MONTH — tactical (mixed warm tones)
  replenish: 'bg-success/20 text-success',
  amplify_in_season: 'bg-midnight text-white',
  promote_push: 'bg-citronella text-carbon',
  resize_down: 'bg-clay text-carbon',
  investigate_root_cause: 'bg-sea-foam text-carbon',
  // NEXT SEASON — strategic (cooler/quieter tones)
  amplify_next_season: 'bg-midnight/70 text-white',
  extend_colors: 'bg-moss text-carbon',
  carryover: 'bg-linen text-carbon/70',
  // FALLBACK
  hold: 'bg-carbon/[0.04] text-carbon/45',
  // LEGACY ALIASES — same tone as split equivalents
  investigate: 'bg-sea-foam text-carbon',
  amplify_winner: 'bg-midnight text-white',
};

// Approximate hex for typical Spanish/RNK colour names. Used to render
// little swatches next to "Extender colores" / "Replicar estilo". Keys
// are lowercased and unaccented before lookup.
const COLOR_NAME_HEX: Record<string, string> = {
  negro: '#101010', blanco: '#fafaf7', beige: '#e7d9c3', crudo: '#efe7d8',
  hueso: '#f3eee0', marfil: '#f0e8d4', crema: '#f1e8d2', arena: '#d9c6a4',
  camel: '#c1986c', tostado: '#9a6a3d', cuero: '#8a5a32', cognac: '#a45c2a',
  marron: '#6b4528', chocolate: '#4a2c1a', tabaco: '#7c5a3a',
  caqui: '#a79770', oliva: '#7a8538', kaki: '#a79770', verde: '#3f7a4f',
  'verde botella': '#1f4634', 'verde militar': '#4a5a37', 'verde menta': '#a8d8b9',
  azul: '#3a5da9', 'azul marino': '#1a3162', 'azul claro': '#9bc4e2',
  celeste: '#9bc4e2', turquesa: '#4ea8a4', petroleo: '#1f5b66',
  morado: '#5a3a7a', violeta: '#7a4f8a', lila: '#bba2c8', malva: '#a385a3',
  rojo: '#a82828', 'rojo cereza': '#7a1c1c', granate: '#6e1a1a',
  burdeos: '#5b1a22', vino: '#5b1a22', coral: '#e08a6e',
  rosa: '#e8b4b4', 'rosa palo': '#e8c4c4', 'rosa empolvado': '#deb5b5',
  fucsia: '#d63b6a', salmon: '#e8a48a',
  naranja: '#d68040', mostaza: '#c8a64a', ocre: '#c89548',
  amarillo: '#e8c84a', dorado: '#c89a4a',
  gris: '#9e9e9e', 'gris claro': '#c8c8c8', 'gris oscuro': '#5a5a5a',
  'gris perla': '#cfcfcf', plata: '#c8c8c8',
};

function normaliseColorName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function colorToHex(name: string): string | null {
  const key = normaliseColorName(name);
  if (COLOR_NAME_HEX[key]) return COLOR_NAME_HEX[key];
  // Try first word in case of two-word names (e.g. "rojo intenso").
  const first = key.split(' ')[0];
  if (first && COLOR_NAME_HEX[first]) return COLOR_NAME_HEX[first];
  return null;
}

// D.4 · Resolve a hex from an action's evidence first (backend-resolved
// via strategy_taxonomies.code_to_hex), falling back to the local dict
// when the taxonomy doesn't have a mapping. Removes the silent grey
// fallback that hit 47% of corpus colors pre-fix.
function resolveHex(
  evidence: Record<string, unknown> | null | undefined,
  nameFallback: string | null
): string {
  if (evidence) {
    const hexFromBackend = evidence.anchor_color_hex;
    if (typeof hexFromBackend === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(hexFromBackend)) {
      return hexFromBackend;
    }
  }
  if (nameFallback) {
    const fromDict = colorToHex(nameFallback);
    if (fromDict) return fromDict;
  }
  return '#cfcfcf';
}

/** Extract the colour names + resolved hex for an action's swatches.
 *  D.4 · Returns paired (name, hex) so the renderer doesn't need to
 *  re-resolve. Backend ships anchor_color_hex directly. */
function actionColors(a: VerdictAction): Array<{ name: string; hex: string }> {
  if (a.action === 'extend_colors') {
    // 2026-05-18 — Chips show the PROPOSED new colors from the moodboard
    // color_story, NOT the winner. The winner is the anchor mentioned in
    // the rationale text; the verb's OUTPUT is the new chromatic
    // territory. Backend resolves hex (taxonomy → Spanish dict → null)
    // so the UI just reads it. Falls back to local dict when hex is
    // null (rare — only when both backend tiers miss).
    const ev = a.evidence as Record<string, unknown>;
    const proposed = Array.isArray(ev.proposed_colors)
      ? (ev.proposed_colors as Array<{ name: string; hex: string | null }>)
      : [];
    return proposed
      .filter((p) => !!p?.name)
      .map((p) => ({
        name: p.name,
        hex:
          (typeof p.hex === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(p.hex))
            ? p.hex
            : (colorToHex(p.name) ?? '#cfcfcf'),
      }));
  }
  if (a.action === 'kill') {
    // C.5 · Color-scope kill carries scope_hint='color' and anchor_color_*.
    const ev = a.evidence as Record<string, unknown>;
    if (ev.scope_hint !== 'color') return [];
    const loser =
      typeof ev.anchor_color_name === 'string' ? (ev.anchor_color_name as string) : null;
    if (!loser) return [];
    return [{ name: loser, hex: resolveHex(ev, loser) }];
  }
  // 2026-05-18 — Decision-map cleanup post-split (Spec §4.3 Gates 9/10/11):
  //
  //   • amplify_in_season (REPLICAR AHORA) = reorder + distort of THIS
  //     SKU in ITS color. Output unit is SKU+color, color is implicit.
  //     NO chips — moodboard colors are not part of this verb's output.
  //     Pre-split amplify_winner used to attach moodboard chips here as a
  //     leftover from when the verb was hybrid in-season + next-season.
  //
  //   • amplify_next_season (REPLICAR ESTILO PRÓXIMA TEMPORADA) = sequel
  //     brief to design. Moodboard colors ARE the output (silhouette +
  //     materials + 2-3 colorways). Renders chips using the same
  //     [{name, hex}] resolved server-side as extend_colors so the chips
  //     look right (no grey fallback for terracota/oliva/lavanda).
  //
  //   • amplify_winner (legacy alias) = treat as in-season for chip
  //     purposes — defensive in case any persisted candidate still
  //     references the pre-split action_type.
  if (a.action === 'amplify_in_season' || a.action === 'amplify_winner') {
    return [];
  }
  if (a.action === 'amplify_next_season') {
    const ev = a.evidence as Record<string, unknown>;
    // Prefer the structured [{name, hex}] resolved by the backend (same
    // module as extend_colors); fall back to the legacy name-only list
    // resolved client-side for any candidate persisted before the upgrade.
    const structured = Array.isArray(ev.proposed_colors)
      ? (ev.proposed_colors as Array<{ name: string; hex: string | null }>)
      : null;
    if (structured && structured.length > 0) {
      return structured
        .filter((p) => !!p?.name)
        .map((p) => ({
          name: p.name,
          hex:
            (typeof p.hex === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(p.hex))
              ? p.hex
              : (colorToHex(p.name) ?? '#cfcfcf'),
        }));
    }
    const proposed = Array.isArray(ev.proposed_brief_colors)
      ? (ev.proposed_brief_colors as string[])
      : [];
    return proposed.filter(Boolean).map((n) => ({ name: n, hex: resolveHex(null, n) }));
  }
  return [];
}

// When a SKU stack contains real actions, the "hold" fallback is noise.
// Drop it; only surface hold when it is the ONLY thing the engine has.
// Also drop the "replenish + resize_down" contradiction: a SKU that needs
// stock NOW (because it sells fast) cannot also be the one to under-buy
// next season — those two signals are logically incompatible. Keep the
// one with the highest confidence; the other was a noise candidate.
//
// G.2 (2026-05-17 audit) · Originally preserved data_sufficiency_warning
// from a dropped `hold` onto the surviving action. CORRECTION 2026-05-18:
// this was too aggressive — when a high-confidence appender fires (e.g.,
// amplify_in_season at 93% on a confirmed hero), copying "No clear
// signal" onto it is wrong and contradicts the verdict. We now only
// preserve the warning when the surviving action's confidence is low
// (< 0.6) AND its own warning is empty. A confident verdict overrides
// the data-sufficiency caveat.
//
// G.3 · Annotate the surviving action when a contradiction is suppressed
// so the buyer sees "1 verdict en conflicto suprimido" instead of nothing.
const WARNING_PRESERVATION_CONFIDENCE_THRESHOLD = 0.6;
function visibleActions(actions: VerdictAction[]): VerdictAction[] {
  const droppedHold = actions.find(
    (a) => a.action === 'hold' && a.data_sufficiency_warning
  );
  let list = actions.filter((a) => a.action !== 'hold');
  if (list.length === 0) list = actions;

  if (droppedHold && list.length > 0 && list[0]?.action !== 'hold') {
    const survivor = list[0];
    // Only preserve the "datos limitados" caveat when the surviving
    // action's own confidence is low. A confident verdict (>= 0.6)
    // overrides the data-sufficiency warning — the engine HAS a clear
    // signal even if the candidate path didn't surface it (it came from
    // a heuristic appender like amplify_in_season).
    if (
      !survivor.data_sufficiency_warning &&
      survivor.confidence < WARNING_PRESERVATION_CONFIDENCE_THRESHOLD
    ) {
      list = [{ ...survivor, data_sufficiency_warning: droppedHold.data_sufficiency_warning }, ...list.slice(1)];
    }
  }

  const rep = list.find((a) => a.action === 'replenish');
  const down = list.find((a) => a.action === 'resize_down');
  if (rep && down) {
    const winnerAction = rep.confidence >= down.confidence ? rep : down;
    const loserAction = rep.confidence >= down.confidence ? down : rep;
    // G.3 · Mark the survivor so the UI can show a "1 verdict en conflicto"
    // badge instead of silently dropping the loser.
    const annotated = {
      ...winnerAction,
      evidence: {
        ...(winnerAction.evidence ?? {}),
        suppressed_conflicting_action: loserAction.action,
        suppressed_conflicting_confidence: loserAction.confidence,
      },
    };
    list = list.map((a) => (a.action === winnerAction.action ? annotated : a))
      .filter((a) => a.action !== loserAction.action);
  }
  return list;
}

export function PdfOverlayViewer({ runId, tenantSlug: _tenantSlug }: { runId: string; tenantSlug: string }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  // 2026-05-18 — accordion pattern (Felipe directive): replaced single
  // `activeSkuId` state with `expandedSkuIds` Set so multiple SKUs can be
  // open simultaneously. User stays in the panel, never loses the list
  // overview, can compare two SKUs side-by-side by opening both.
  const [expandedSkuIds, setExpandedSkuIds] = useState<Set<string>>(new Set());
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

  // Toggle handler shared by every accordion chevron + clickable row header.
  const toggleSkuExpansion = (id: string) => {
    setExpandedSkuIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
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

      {/* Right side: SKU panel with accordion expand/collapse per row.
       *  Felipe directive 2026-05-18: the buyer never loses the full list
       *  view — clicking a chevron expands detail inline in place of
       *  pushing the user into a separate drawer. Multiple SKUs can be
       *  expanded at once for side-by-side comparison. */}
      <SkuPanel
        data={data}
        actionFilter={actionFilter}
        setActionFilter={setActionFilter}
        filteredSkus={filteredSkus}
        expandedSkuIds={expandedSkuIds}
        onToggleExpand={toggleSkuExpansion}
      />
    </div>
  );
}

function SkuPanel({
  data,
  actionFilter,
  setActionFilter,
  filteredSkus,
  expandedSkuIds,
  onToggleExpand,
}: {
  data: ApiResponse;
  actionFilter: VerdictAction['action'] | 'all';
  setActionFilter: (a: VerdictAction['action'] | 'all') => void;
  filteredSkus: SkuRow[];
  expandedSkuIds: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  return (
    <aside className="w-[520px] border-l border-carbon/[0.06] bg-white overflow-y-auto">
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
        {/* SKU list — accordion pattern. Each row is a clickable header
         *  that toggles inline expansion. Multiple SKUs can be open at
         *  once so the buyer can compare side-by-side without losing the
         *  full list overview. */}
        <ul>
          {filteredSkus.map((sku) => {
            const isExpanded = expandedSkuIds.has(sku.product_fact_id);
            return (
              <li key={sku.product_fact_id} className="border-b border-carbon/[0.04]">
                <button
                  type="button"
                  onClick={() => onToggleExpand(sku.product_fact_id)}
                  aria-expanded={isExpanded}
                  className={`w-full text-left p-3 hover:bg-carbon/[0.02] transition-colors ${
                    isExpanded ? 'bg-carbon/[0.03]' : ''
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
                    {/* Accordion chevron — rotates 90° to point down when
                     *  the row is expanded. Mirrors disclosure-arrow
                     *  pattern from Apple Finder / iOS Settings.
                     */}
                    <ChevronRight
                      className={`h-4 w-4 text-carbon/40 mt-1 shrink-0 transition-transform duration-150 ${
                        isExpanded ? 'rotate-90 text-carbon/70' : ''
                      }`}
                    />
                  </div>
                  <div className="pl-[42px] space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {visibleActions(sku.actions).map((a) => {
                        const colors = actionColors(a);
                        return (
                          <span
                            key={a.action}
                            className="inline-flex items-center gap-1.5"
                          >
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.06em] ${ACTION_TONE[a.action]}`}
                            >
                              {ACTION_LABEL_ES[a.action]}
                              {a.recommended_units != null && a.recommended_units > 0
                                ? ` · ${a.recommended_units.toLocaleString()} uds`
                                : ''}
                            </span>
                            {colors.length > 0 && <ColorSwatches swatches={colors} />}
                          </span>
                        );
                      })}
                    </div>
                    {!isExpanded && visibleActions(sku.actions)[0]?.rationale && (
                      <p className="text-[11px] text-carbon/60 leading-[1.45] line-clamp-2">
                        {visibleActions(sku.actions)[0].rationale}
                      </p>
                    )}
                  </div>
                </button>
                {isExpanded && <SkuDetailInline sku={sku} />}
              </li>
            );
          })}
        </ul>
      </aside>
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

/**
 * Inline-expansion detail block for an accordion SKU row.
 *
 * 2026-05-18 — Felipe directive: replaced the drawer takeover pattern
 * (where opening one SKU hid the full list) with this inline expander.
 * The SKU's row header stays visible above (already shows rank +
 * family_code + product_name), so we don't repeat them here. The buyer
 * keeps the full list overview while expanding 1-N SKUs simultaneously
 * for side-by-side comparison.
 *
 * Content mirrors the prior SkuDrawer minus the sticky header + back
 * button. Same headline KPIs, operational stats, modulator notes,
 * action stack with full detail.
 */
function SkuDetailInline({ sku }: { sku: SkuRow }) {
  return (
    <div className="border-t border-carbon/[0.06] bg-white p-4 space-y-5">
        {/* ACTION STACK — the reason to expand. "Reponer", "Extender
         *  colores", "Reponer", etc. with full rationale, Six Right anchor,
         *  owner, confidence + evidence per action. THIS is what the buyer
         *  wants to see when they expand a SKU, so it leads the detail. */}
        <section className="space-y-3">
          <h3 className="text-[10px] uppercase tracking-[0.12em] text-carbon/45 font-semibold">
            Acciones recomendadas — qué hacer y por qué
          </h3>
          {visibleActions(sku.actions).map((a, i) => (
            <div
              key={`${a.action}-${i}`}
              className="bg-white border border-carbon/[0.08] rounded-[14px] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              {/* Action header — label pill + meta pills + units */}
              <div className="flex items-center justify-between mb-3 gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] uppercase tracking-[0.06em] font-semibold ${ACTION_TONE[a.action]}`}
                  >
                    {ACTION_LABEL_ES[a.action]}
                  </span>
                  {actionColors(a).length > 0 && (
                    <ColorSwatches swatches={actionColors(a)} size={20} />
                  )}
                  {a.six_right && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] tracking-[0.04em] bg-carbon/[0.04] text-carbon/55"
                      title="Six Rights of Merchandising (Kincade & Gibson)"
                    >
                      {SIX_RIGHT_LABEL_ES[a.six_right]}
                    </span>
                  )}
                  {a.owner && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] tracking-[0.04em] bg-sea-foam/30 text-carbon/65"
                      title="Owner del verdict (Jackson & Shaw discipline boundary)"
                    >
                      {OWNER_LABEL_ES[a.owner]}
                    </span>
                  )}
                  <span className="text-[11px] text-carbon/50">
                    confianza {Math.round(a.confidence * 100)}%
                  </span>
                </div>
                {a.recommended_units != null && a.recommended_units > 0 && (
                  <span className="text-[16px] font-semibold tabular-nums shrink-0">
                    {a.recommended_units.toLocaleString()} uds
                  </span>
                )}
              </div>
              {/* The MEANING — what this action means for this SKU. Larger
               *  prose so it's the focal point of the expanded detail. */}
              {a.rationale && (
                <p className="text-[14px] text-carbon leading-[1.6] mb-3">
                  {a.rationale}
                </p>
              )}
              {a.data_sufficiency_warning && (
                <p className="text-[11px] text-amber-800 italic mb-2">⚠ {a.data_sufficiency_warning}</p>
              )}
              {a.assumptions.length > 0 && (
                <ul className="text-[11px] text-carbon/55 space-y-0.5 mb-2 pl-2 border-l-2 border-carbon/[0.08]">
                  {a.assumptions.map((s, j) => (
                    <li key={j} className="leading-[1.5]">· {s}</li>
                  ))}
                </ul>
              )}
              {/* Detailed evidence (the data behind) — collapsed by default
               *  so it doesn't drown the rationale, but always one click
               *  away when the buyer wants to defend the decision. */}
              <details className="text-[11px]">
                <summary className="cursor-pointer text-carbon/50 hover:text-carbon select-none">
                  Ver datos detrás
                </summary>
                <div className="mt-2">
                  <EvidenceList obj={a.evidence} />
                </div>
              </details>
            </div>
          ))}
        </section>

        {/* Headline KPIs — primera fila: los 5 KPIs financieros del comprador
         *  (GMROI, sell-through vs plan, FWOC/LT, S/S, maintained markup).
         *  Segunda fila: 4 KPIs comerciales canónicos de retail merchandising
         *  (rotación, aportación a familia, activación diaria, espacio al
         *  techo). El comprador senior los lee de un vistazo antes de
         *  entrar en las acciones. */}
        {(sku.headline_kpis || sku.commercial_kpis) && (
          <section>
            <h3 className="text-[10px] uppercase tracking-[0.12em] text-carbon/45 font-semibold mb-2">
              KPIs del SKU
            </h3>
            {sku.headline_kpis && (
              <div className="grid grid-cols-5 gap-1.5 text-[10px]">
                <HeadlineKpi
                  title="GMROI"
                  hint="target 3.0–3.5"
                  kpi={sku.headline_kpis.gmroi}
                  format={(v) => v.toFixed(2)}
                />
                <HeadlineKpi
                  title="STR vs plan"
                  hint="pp delta"
                  kpi={sku.headline_kpis.str_vs_plan_pp}
                  format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`}
                />
                <HeadlineKpi
                  title="FWOC / LT"
                  hint="< 1 = rotura · > 2 = oversupplied"
                  kpi={sku.headline_kpis.fwoc_lt_ratio}
                  format={(v) => `${v.toFixed(1)}×`}
                />
                <HeadlineKpi
                  title="S / S ratio"
                  hint="parked si > 10"
                  kpi={sku.headline_kpis.s_s_ratio}
                  format={(v) => v.toFixed(1)}
                />
                <HeadlineKpi
                  title="Maint. MU"
                  hint="margen post-rebajas"
                  kpi={sku.headline_kpis.maintained_markup_pct}
                  format={(v) => `${v.toFixed(0)}%`}
                />
              </div>
            )}
            {sku.commercial_kpis && (
              <div className="grid grid-cols-4 gap-1.5 text-[10px] mt-1.5">
                <CommercialKpi
                  title="Rotación 7d"
                  hint=">1 excepcional · 0.5-1 sana · <0.5 estancada"
                  value={sku.commercial_kpis.rotation_aj_7d}
                  format={(v) => v.toFixed(2)}
                  status={
                    sku.commercial_kpis.rotation_aj_7d == null
                      ? null
                      : sku.commercial_kpis.rotation_aj_7d >= 1.0
                        ? 'good'
                        : sku.commercial_kpis.rotation_aj_7d >= 0.5
                          ? 'ok'
                          : 'bad'
                  }
                />
                <CommercialKpi
                  title="Aportación"
                  hint="% de la familia"
                  value={sku.commercial_kpis.family_contribution_pct}
                  format={(v) => `${v.toFixed(1)}%`}
                  status={
                    sku.commercial_kpis.family_contribution_pct == null
                      ? null
                      : sku.commercial_kpis.family_contribution_pct >= 15
                        ? 'good'
                        : sku.commercial_kpis.family_contribution_pct >= 5
                          ? 'ok'
                          : 'bad'
                  }
                />
                <CommercialKpi
                  title="Activación diaria"
                  hint="% tiendas con venta ayer"
                  value={sku.commercial_kpis.daily_activation_pct}
                  format={(v) => `${v.toFixed(0)}%`}
                  status={
                    sku.commercial_kpis.daily_activation_pct == null
                      ? null
                      : sku.commercial_kpis.daily_activation_pct >= 70
                        ? 'good'
                        : sku.commercial_kpis.daily_activation_pct >= 40
                          ? 'ok'
                          : 'bad'
                  }
                />
                <CommercialKpi
                  title="Techo libre"
                  hint="espacio antes de saturar"
                  value={sku.commercial_kpis.capacity_headroom_pct}
                  format={(v) => `${v.toFixed(0)}%`}
                  status={
                    sku.commercial_kpis.capacity_headroom_pct == null
                      ? null
                      : sku.commercial_kpis.capacity_headroom_pct >= 40
                        ? 'good'
                        : sku.commercial_kpis.capacity_headroom_pct >= 15
                          ? 'ok'
                          : 'bad'
                  }
                />
              </div>
            )}
          </section>
        )}

        {/* Operational quick-stats */}
        <section>
          <h3 className="text-[10px] uppercase tracking-[0.12em] text-carbon/45 font-semibold mb-2">
            Operacional
          </h3>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <Stat label="Precio" value={sku.pvp != null ? `€${Number(sku.pvp).toFixed(2)}` : '—'} />
            <Stat label="Velocidad 7d" value={sku.velocity_7d?.toLocaleString() ?? '—'} />
            <Stat label="Stock días" value={sku.current_stock_days != null ? `${sku.current_stock_days}d` : '—'} />
            <Stat label="Tiendas activas" value={sku.stores_active?.toLocaleString() ?? '—'} />
            <Stat label="Stock total" value={sku.stock_total?.toLocaleString() ?? '—'} />
            <Stat label="Rotación target" value={`${sku.target_rotation_days}d`} />
          </div>
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

/** Headline KPI tile — the 5 numbers that anchor the buyer's review.
 *  Renders the value + a subtle directional label + an 'estimate' badge
 *  when the underlying KPI is computed from synthetic retailer-profile
 *  defaults rather than tenant-provided data. */
function HeadlineKpi({
  title,
  hint,
  kpi,
  format,
}: {
  title: string;
  hint: string;
  kpi: HeadlineKpiValue;
  format: (v: number) => string;
}) {
  const isSynthetic = kpi.source === 'synthetic';
  return (
    <div className="bg-white border border-carbon/[0.06] rounded-[8px] p-2" title={hint}>
      <div className="flex items-center justify-between gap-1">
        <div className="text-[9px] text-carbon/45 uppercase tracking-[0.06em] truncate">
          {title}
        </div>
        {isSynthetic && (
          <span
            className="text-[8px] text-carbon/40 uppercase tracking-[0.04em] px-1 py-px rounded-sm bg-carbon/[0.04]"
            title="Estimate from retailer profile (no tenant input)"
          >
            est
          </span>
        )}
      </div>
      <div className="text-[14px] font-semibold text-carbon tabular-nums mt-0.5">
        {kpi.value != null ? format(kpi.value) : '—'}
      </div>
      {kpi.label && (
        <div className="text-[9px] text-carbon/45 mt-0.5 truncate" title={kpi.label}>
          {kpi.label}
        </div>
      )}
    </div>
  );
}

/** v2 — KPI comercial del comprador (rotación / aportación / activación
 *  diaria / techo libre). Mismo lenguaje visual que HeadlineKpi pero con
 *  semáforo good/ok/bad para que el comprador escanee la salud de un
 *  vistazo. */
function CommercialKpi({
  title,
  hint,
  value,
  format,
  status,
}: {
  title: string;
  hint: string;
  value: number | null;
  format: (v: number) => string;
  status: 'good' | 'ok' | 'bad' | null;
}) {
  const borderColor =
    status === 'good'
      ? 'border-success/30'
      : status === 'ok'
        ? 'border-carbon/[0.10]'
        : status === 'bad'
          ? 'border-warning/40'
          : 'border-carbon/[0.06]';
  const valueColor =
    status === 'good'
      ? 'text-success'
      : status === 'bad'
        ? 'text-warning'
        : 'text-carbon';
  return (
    <div className={`bg-white border ${borderColor} rounded-[8px] p-2`} title={hint}>
      <div className="text-[9px] text-carbon/45 uppercase tracking-[0.06em] truncate">
        {title}
      </div>
      <div className={`text-[14px] font-semibold tabular-nums mt-0.5 ${valueColor}`}>
        {value != null ? format(value) : '—'}
      </div>
    </div>
  );
}

/** Colour swatches rendered next to (NOT inside) the extend_colors /
 *  amplify_winner pill. Squares with a thin neutral border. The colour
 *  name shows as a tooltip on hover. Falls back to a hashed grey when
 *  the name isn't in the dictionary. */
function ColorSwatches({
  swatches,
  size = 16,
}: {
  swatches: Array<{ name: string; hex: string }>;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {swatches.slice(0, 4).map((s, i) => (
        <span
          key={`${s.name}-${i}`}
          title={s.name}
          className="inline-block rounded-[4px] ring-1 ring-carbon/15"
          style={{ width: size, height: size, backgroundColor: s.hex }}
        />
      ))}
    </span>
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
