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
import { Loader2, ChevronRight, ChevronDown, ArrowRight } from 'lucide-react';

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

/** v2 §8.2 — los 4 escenarios comerciales (gradualización 3-dial sobre
 *  thresholds + magnitudes + confianza, NO eliminación). El comprador
 *  puede moverse entre ellos via toggle global o fijar uno por SKU
 *  (§8.3). */
type ScenarioId =
  | 'conservar_margen'
  | 'balanceada'
  | 'maximizar_venta'
  | 'tu_mezcla';

const SCENARIO_LABEL_ES: Record<ScenarioId, string> = {
  conservar_margen: 'Conservar margen',
  balanceada: 'Balanceada',
  maximizar_venta: 'Maximizar venta',
  tu_mezcla: 'Tu mezcla',
};

const SCENARIO_ORDER: ScenarioId[] = [
  'conservar_margen',
  'balanceada',
  'maximizar_venta',
  'tu_mezcla',
];

interface UserLock {
  chosen_scenario: ScenarioId;
  locked_at: string;
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
  returns_pct: number | null;
  target_rotation_days: number;
  current_stock_days: number | null;
  /** Sprint Shopify lane 2026-05-19 · si el parser populó la URL de la foto
   *  del producto (Shopify Products CSV), el flow Aimily Design la usa
   *  directamente sin recortar PDF. Null para Zara (extracción client-side). */
  product_image_url?: string | null;
  /** Legacy — apunta a `balanceada` para back-compat. La UI debería
   *  preferir `verdicts_by_scenario[activeScenario]` para el render. */
  actions: VerdictAction[];
  /** v2 §8.2 — los 4 stacks por escenario, pre-computados en el server. */
  verdicts_by_scenario?: Record<ScenarioId, VerdictAction[]> | null;
  /** v2 §8.3 — lock activo del usuario sobre este SKU, si lo hay. */
  user_lock?: UserLock | null;
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
  /** Felipe sprint Shopify lane 2026-05-19 · cuando no hay PDF (fuente
   *  CSV/XLSX Shopify, ERP), la columna izquierda renderiza el grid de
   *  product_image_url en su lugar. Source format lo dice. */
  source_format?: string | null;
  target_rotation_days_default: number;
  archetype_id: string | null;
  target_buy_budget_eur: number | null;
  skus: SkuRow[];
  summary: {
    total_skus: number;
    action_counts: Record<string, number>;
    /** v2 §8.2 — counts por escenario para que el filtro UI se ajuste
     *  cuando el usuario cambia el toggle global. */
    action_counts_by_scenario?: Record<ScenarioId, Record<string, number>>;
    /** v2 §8.3 — contadores del plan en construcción */
    locked_skus?: number;
    pending_skus?: number;
  };
}

const ACTION_LABEL_ES: Record<VerdictAction['action'], string> = {
  // THIS WEEK
  kill: 'Matar',
  markdown_accelerate: 'Rebajar',
  amplify_distribution: 'Ampliar distribución',
  pull_forward_intake: 'Adelantar pedido pendiente',
  // THIS MONTH
  // Felipe 2026-05-18: vocabulario retail real. Dos verbos REPONER
  // distintos. Reposición urgente manda sobre Reponer max venta — son
  // mutuamente excluyentes en exclusion rules.
  replenish: 'Reposición urgente por rotura',
  amplify_in_season: 'Reponer para maximizar la venta',
  promote_push: 'Promocionar',
  resize_down: 'Reducir compra',
  investigate_root_cause: 'Marcar para revisión',
  // NEXT SEASON
  amplify_next_season: 'Replicar concepto en nuevo modelo',
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

// Felipe 2026-05-18: "Mantener no aporta nada. Si el estado es saludable
// y no hay nada que hacer, mejor evitar una acción que sea mantener,
// porque al final confunde." CARRYOVER y HOLD no son acciones — son
// estados pasivos. Los filtramos completamente de la vista (pills,
// filtros, conteos visibles). Si un SKU SOLO tiene carryover o hold,
// se ve como SKU sin alertas — sin pills.
const ACTIONABLE_VERBS: Array<VerdictAction['action']> = [
  'kill',
  'markdown_accelerate',
  'amplify_distribution',
  'pull_forward_intake',
  'replenish',
  'amplify_in_season',
  // Felipe 2026-05-18: PROMOCIONAR oculto del filtro hasta tener feed
  // de marketing_calendar. Sigue en el sistema (puede disparar si llega
  // input) pero no contamina visualmente. Para Zara casi nunca aplica.
  // 'promote_push',
  'resize_down',
  'investigate_root_cause',
  'amplify_next_season',
  'extend_colors',
];

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
  // Felipe 2026-05-18 — REPONER (amplify_in_season), REPLICAR CONCEPTO
  // (amplify_next_season) y legacy amplify_winner NO renderizan chips
  // de colores. Los colores son output exclusivo del verbo EXTENDER
  // COLORES (Spec Gate 11). Antes mostrábamos paleta moodboard en
  // amplify_next_season pero confundía: el verbo es "replicar concepto
  // = silueta + material en modelo nuevo", no "lanzar este modelo en
  // otros colores".
  if (
    a.action === 'amplify_in_season' ||
    a.action === 'amplify_winner' ||
    a.action === 'amplify_next_season'
  ) {
    return [];
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
  // Felipe 2026-05-18: "Mantener no aporta nada. Si el estado es
  // saludable y no hay nada que hacer, mejor evitar una acción que sea
  // mantener, porque al final confunde." CARRYOVER y HOLD son estados
  // pasivos (no son acciones). Los filtramos completamente. Un SKU sin
  // verbos ACCIONABLES no muestra pills — la ausencia de pill = "sin
  // alertas, todo saludable".
  const droppedHold = actions.find(
    (a) => a.action === 'hold' && a.data_sufficiency_warning
  );
  let list = actions.filter((a) => a.action !== 'hold' && a.action !== 'carryover');

  if (droppedHold && list.length > 0) {
    const survivor = list[0];
    // Solo preservamos el "datos limitados" cuando la acción superviviente
    // tiene baja confianza. Un verdict confiado (≥0.6) anula la caveat.
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

export function PdfOverlayViewer({ runId, tenantSlug }: { runId: string; tenantSlug: string }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  // 2026-05-18 — accordion pattern (Felipe directive): replaced single
  // `activeSkuId` state with `expandedSkuIds` Set so multiple SKUs can be
  // open simultaneously. User stays in the panel, never loses the list
  // overview, can compare two SKUs side-by-side by opening both.
  const [expandedSkuIds, setExpandedSkuIds] = useState<Set<string>>(new Set());
  // Multi-select filter. Defaults a TODAS las acciones marcadas (= sin
  // filtrar). Felipe 2026-05-18: "que el filtro esté todo marcado por
  // defecto, pero que si quiero ver cuáles son cada uno, pues no puedo
  // ir rápido directamente a cada uno." Filtro va dentro de un panel
  // collapsable — visible bajo demanda, no de golpe.
  const [actionFilter, setActionFilter] = useState<Set<VerdictAction['action']>>(
    () => new Set(ACTIONABLE_VERBS)
  );
  // v2 §8.2 — escenario activo del toggle global. Default: 'balanceada'.
  // Cambiar el toggle re-renderiza todos los SKUs no-lockeados.
  const [activeScenario, setActiveScenario] = useState<ScenarioId>('balanceada');
  // v2 §8.3 — locks per-SKU del usuario. Map<product_fact_id, ScenarioId>.
  // Se sincroniza al servidor en cada cambio (auto-save Google Docs).
  const [userLocks, setUserLocks] = useState<Map<string, ScenarioId>>(new Map());
  // Fase 2 · diff visual: al cambiar el escenario activo, los SKUs cuyo
  // stack difiere del anterior se resaltan 1.5s. Permite ver QUÉ cambia
  // sin escanear los 48 SKUs uno por uno.
  const previousScenarioRef = useRef<ScenarioId>('balanceada');
  const [recentlyChangedPids, setRecentlyChangedPids] = useState<Set<string>>(new Set());
  // Fase 2 · modo comparación side-by-side: cuando hay un segundo
  // escenario activo, cada SKU muestra DOS stacks de pills.
  const [comparisonScenario, setComparisonScenario] = useState<ScenarioId | null>(null);
  const pdfCanvasRef = useRef<HTMLDivElement>(null);
  // Felipe sprint Aimily Design 2026-05-19 · pasamos pdf_signed_url +
  // numPages al SkuDetailInline para que pueda extraer imágenes
  // embebidas del PDF directamente (sin recorte heurístico).
  const [pdfNumPages, setPdfNumPages] = useState(0);

  // Felipe 2026-05-19 noche · auto-trigger desarrollo desde pool de semillas.
  // Cuando el merch hace click en "Desarrollar →" en /strategy/<tenant>/seeds,
  // navega aquí con ?develop_pfid=...&develop_action=... — leemos los params,
  // expandimos el SKU correspondiente, y pasamos los datos a SkuDetailInline
  // para que dispare launchDesign automáticamente al montar.
  const [autoDevelop, setAutoDevelop] = useState<{ pfid: string; actionType: string } | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const pfid = params.get('develop_pfid');
    const actionType = params.get('develop_action');
    if (pfid && actionType) {
      setAutoDevelop({ pfid, actionType });
      setExpandedSkuIds((prev) => {
        const next = new Set(prev);
        next.add(pfid);
        return next;
      });
    }
  }, []);

  // Fase 2 · al cambiar el escenario activo, calcular qué SKUs CAMBIAN
  // su verdict stack y resaltarlos por 1.5s. La comparación se hace
  // entre el escenario anterior y el nuevo, ignorando SKUs con lock
  // (esos no cambian por definición — siguen su escenario fijado).
  useEffect(() => {
    const prev = previousScenarioRef.current;
    if (prev === activeScenario) return;
    if (!data) {
      previousScenarioRef.current = activeScenario;
      return;
    }
    const changed = new Set<string>();
    for (const sku of data.skus) {
      // SKUs lockeados nunca "cambian" con el toggle global
      if (userLocks.has(sku.product_fact_id)) continue;
      const prevActions = sku.verdicts_by_scenario?.[prev] ?? sku.actions;
      const newActions = sku.verdicts_by_scenario?.[activeScenario] ?? sku.actions;
      const prevSet = new Set(visibleActions(prevActions).map((a) => a.action));
      const newSet = new Set(visibleActions(newActions).map((a) => a.action));
      let differs = prevSet.size !== newSet.size;
      if (!differs) {
        for (const a of Array.from(prevSet)) {
          if (!newSet.has(a)) {
            differs = true;
            break;
          }
        }
      }
      if (differs) changed.add(sku.product_fact_id);
    }
    previousScenarioRef.current = activeScenario;
    if (changed.size === 0) return;
    setRecentlyChangedPids(changed);
    const timeout = setTimeout(() => setRecentlyChangedPids(new Set()), 1800);
    return () => clearTimeout(timeout);
  }, [activeScenario, data, userLocks]);

  // Fetch verdicts + PDF signed URL once on mount.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/in-season/runs/${runId}/skus`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as ApiResponse;
        if (!cancelled) {
          setData(json);
          // v2 §8.3 — Inicializar locks del usuario desde la API.
          const initialLocks = new Map<string, ScenarioId>();
          for (const sku of json.skus) {
            if (sku.user_lock) {
              initialLocks.set(sku.product_fact_id, sku.user_lock.chosen_scenario);
            }
          }
          setUserLocks(initialLocks);
        }
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
        setPdfNumPages(pdf.numPages);
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

  // v2 §8.3 — Helper: escenario EFECTIVO por SKU.
  //   Si tiene lock → ese escenario.
  //   Si no → el escenario global activo (toggle top).
  const getEffectiveScenario = (productFactId: string): ScenarioId => {
    return userLocks.get(productFactId) ?? activeScenario;
  };

  // v2 §8.2/§8.3 — Helper: stack de verdicts EFECTIVO por SKU.
  //   Lee verdicts_by_scenario[escenario_efectivo]. Si la API no
  //   devolvió el campo (run legacy sin §8 ejecutado), cae a actions.
  const getEffectiveActions = (sku: SkuRow): VerdictAction[] => {
    const scenario = getEffectiveScenario(sku.product_fact_id);
    return sku.verdicts_by_scenario?.[scenario] ?? sku.actions;
  };

  // v2 §8.3 — Auto-save (Google Docs style). Cada lock/unlock va al
  // servidor inmediatamente. Optimistic update — UI cambia antes de la
  // confirmación. Si la API falla, rollback local + log al console
  // (silencioso para el usuario — no rompemos su flujo).
  const lockSku = async (productFactId: string, scenario: ScenarioId) => {
    setUserLocks((prev) => {
      const next = new Map(prev);
      next.set(productFactId, scenario);
      return next;
    });
    try {
      const res = await fetch(`/api/in-season/runs/${runId}/sku-selections`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ product_fact_id: productFactId, chosen_scenario: scenario }),
      });
      if (!res.ok) throw new Error(`lock_failed_${res.status}`);
    } catch (e) {
      console.error('[lock] persist failed', e);
      // Rollback local — no podemos garantizar el lock
      setUserLocks((prev) => {
        const next = new Map(prev);
        next.delete(productFactId);
        return next;
      });
    }
  };

  const unlockSku = async (productFactId: string) => {
    setUserLocks((prev) => {
      const next = new Map(prev);
      next.delete(productFactId);
      return next;
    });
    try {
      const res = await fetch(
        `/api/in-season/runs/${runId}/sku-selections?product_fact_id=${encodeURIComponent(productFactId)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error(`unlock_failed_${res.status}`);
    } catch (e) {
      console.error('[unlock] persist failed', e);
    }
  };
  // Multi-select filter: Set vacío = todos visibles. Si hay selecciones,
  // mostramos los SKUs que tienen AL MENOS UNA de las acciones
  // seleccionadas. Solo evaluamos sobre visibleActions (sin hold ni
  // carryover) — esos no se pueden filtrar porque no son acciones.
  const filteredSkus = data?.skus.filter((sku) => {
    if (actionFilter.size === 0) return true;
    const effectiveActions = getEffectiveActions(sku);
    return visibleActions(effectiveActions).some((a) => actionFilter.has(a.action));
  }) ?? [];
  const toggleActionFilter = (a: VerdictAction['action']) => {
    setActionFilter((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  };

  if (loading) {
    return <LoadingWheel totalSkus={null} />;
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
          // Shopify lane (no PDF): grid de product_image_url en orden de
          // ranking. Click en una foto expande el SKU correspondiente en
          // la columna derecha (delega en toggleSkuExpansion + scroll).
          <ShopifyProductGrid
            skus={data.skus}
            pdfSignedUrl={data.pdf_signed_url ?? null}
            onClick={(sku) => {
              setExpandedSkuIds((prev) => {
                const next = new Set(prev);
                next.add(sku.product_fact_id);
                return next;
              });
              const el = document.getElementById(`sku-row-${sku.product_fact_id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
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
        toggleActionFilter={toggleActionFilter}
        clearFilter={() => setActionFilter(new Set())}
        filteredSkus={filteredSkus}
        expandedSkuIds={expandedSkuIds}
        onToggleExpand={toggleSkuExpansion}
        activeScenario={activeScenario}
        setActiveScenario={setActiveScenario}
        userLocks={userLocks}
        lockSku={lockSku}
        unlockSku={unlockSku}
        getEffectiveScenario={getEffectiveScenario}
        getEffectiveActions={getEffectiveActions}
        recentlyChangedPids={recentlyChangedPids}
        comparisonScenario={comparisonScenario}
        setComparisonScenario={setComparisonScenario}
        runId={runId}
        tenantSlug={tenantSlug}
        pdfContainerRef={pdfCanvasRef}
        totalSkus={data.summary.total_skus}
        pdfSignedUrl={data.pdf_signed_url ?? null}
        pdfNumPages={pdfNumPages}
        autoDevelop={autoDevelop}
        clearAutoDevelop={() => setAutoDevelop(null)}
      />
    </div>
  );
}

function SkuPanel({
  data,
  actionFilter,
  toggleActionFilter,
  clearFilter,
  filteredSkus,
  expandedSkuIds,
  onToggleExpand,
  activeScenario,
  setActiveScenario,
  userLocks,
  lockSku,
  unlockSku,
  getEffectiveScenario,
  getEffectiveActions,
  recentlyChangedPids,
  comparisonScenario,
  setComparisonScenario,
  runId,
  tenantSlug,
  pdfContainerRef,
  totalSkus,
  pdfSignedUrl,
  pdfNumPages,
  autoDevelop,
  clearAutoDevelop,
}: {
  data: ApiResponse;
  actionFilter: Set<VerdictAction['action']>;
  toggleActionFilter: (a: VerdictAction['action']) => void;
  clearFilter: () => void;
  filteredSkus: SkuRow[];
  expandedSkuIds: Set<string>;
  onToggleExpand: (id: string) => void;
  activeScenario: ScenarioId;
  setActiveScenario: (s: ScenarioId) => void;
  userLocks: Map<string, ScenarioId>;
  lockSku: (productFactId: string, scenario: ScenarioId) => Promise<void>;
  unlockSku: (productFactId: string) => Promise<void>;
  getEffectiveScenario: (productFactId: string) => ScenarioId;
  getEffectiveActions: (sku: SkuRow) => VerdictAction[];
  recentlyChangedPids: Set<string>;
  comparisonScenario: ScenarioId | null;
  setComparisonScenario: (s: ScenarioId | null) => void;
  runId: string;
  tenantSlug: string;
  pdfContainerRef: React.RefObject<HTMLDivElement | null>;
  totalSkus: number;
  pdfSignedUrl: string | null;
  pdfNumPages: number;
  autoDevelop: { pfid: string; actionType: string } | null;
  clearAutoDevelop: () => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // v2 §8.2 — Counts del filtro DEPENDEN del escenario activo (porque
  // las decisiones de cada SKU varían con el escenario por gradualización
  // de los diales). Usamos action_counts_by_scenario cuando está
  // disponible; fallback a action_counts para runs legacy.
  const countsForScenario =
    data.summary.action_counts_by_scenario?.[activeScenario] ??
    data.summary.action_counts;
  // Solo acciones reales (sin carryover ni hold) que tengan ≥1 SKU en el run.
  const availableActions = ACTIONABLE_VERBS.filter(
    (a) => (countsForScenario[a] || 0) > 0
  );
  const totalSelected = actionFilter.size;
  const totalAvailable = availableActions.length;
  const isShowingAll = totalSelected === totalAvailable || totalSelected === 0;
  const triggerLabel = isShowingAll
    ? 'Todos'
    : `${totalSelected}/${totalAvailable} acciones`;
  const selectAll = () => {
    availableActions.forEach((a) => {
      if (!actionFilter.has(a)) toggleActionFilter(a);
    });
  };
  // Close dropdown when clicking outside (Excel-style filter behavior).
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);
  // v2 §8.3 — Contadores del plan para el footer
  const lockedCount = userLocks.size;
  const pendingCount = data.summary.total_skus - lockedCount;
  const planCompletePct = data.summary.total_skus > 0
    ? Math.round((lockedCount / data.summary.total_skus) * 100)
    : 0;

  return (
    <aside className="w-[520px] border-l border-carbon/[0.06] bg-white overflow-y-auto flex flex-col">
        {/* v2 §8.2 — Toggle global de 4 ESCENARIOS comerciales.
         *  Felipe 2026-05-18: "arriba hubiera un toggle de los cuatro
         *  escenarios y te pudieras mover entre ellos para poder ver
         *  cómo cambian los diferentes outputs". */}
        <div className="sticky top-0 z-20 bg-white border-b border-carbon/[0.06]">
          <div className="p-3 pb-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase tracking-[0.12em] text-carbon/40">
                Escenario comercial
              </div>
              {/* Fase 2 · botón comparación side-by-side */}
              <ComparisonControl
                activeScenario={activeScenario}
                comparisonScenario={comparisonScenario}
                setComparisonScenario={setComparisonScenario}
              />
            </div>
            {/* Felipe 2026-05-18: toggle redondo · cada escenario es
             *  una pill independiente. Activa = carbon sólido +
             *  shadow. Inactiva = bg-carbon/[0.04] sutil. */}
            <div className="flex flex-wrap gap-1.5">
              {SCENARIO_ORDER.map((sid) => {
                const isActive = activeScenario === sid;
                return (
                  <button
                    key={sid}
                    type="button"
                    onClick={() => setActiveScenario(sid)}
                    className={`text-[11px] py-1.5 px-3 rounded-full font-medium transition-all leading-tight ${
                      isActive
                        ? 'bg-carbon text-white shadow-[0_2px_6px_rgba(0,0,0,0.12)]'
                        : 'bg-carbon/[0.04] text-carbon/55 hover:bg-carbon/[0.08] hover:text-carbon'
                    }`}
                  >
                    {SCENARIO_LABEL_ES[sid]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter bar (acciones) */}
          <div className="px-3 pb-3 flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.1em] text-carbon/40">
              {filteredSkus.length} de {data.summary.total_skus} SKUs
            </div>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className={`text-[11px] flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors ${
                  isShowingAll
                    ? 'bg-carbon/[0.04] text-carbon/70 hover:bg-carbon/[0.08]'
                    : 'bg-carbon text-white hover:bg-carbon/90'
                }`}
              >
                <span className="font-medium">{triggerLabel}</span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-[280px] bg-white border border-carbon/[0.10] rounded-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.10)] overflow-hidden z-30">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-carbon/[0.06] bg-carbon/[0.02] text-[10px]">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-carbon/60 hover:text-carbon font-medium uppercase tracking-[0.04em]"
                    >
                      Marcar todas
                    </button>
                    <span className="text-carbon/20">·</span>
                    <button
                      type="button"
                      onClick={clearFilter}
                      className="text-carbon/60 hover:text-carbon font-medium uppercase tracking-[0.04em]"
                    >
                      Desmarcar todas
                    </button>
                  </div>
                  <ul className="max-h-[400px] overflow-y-auto py-1">
                    {availableActions.map((a) => {
                      const c = countsForScenario[a] || 0;
                      const checked = actionFilter.has(a);
                      return (
                        <li key={a}>
                          <button
                            type="button"
                            onClick={() => toggleActionFilter(a)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-carbon/[0.03] transition-colors"
                          >
                            <span className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`shrink-0 w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${
                                  checked
                                    ? 'bg-carbon border-carbon'
                                    : 'bg-white border-carbon/[0.20]'
                                }`}
                              >
                                {checked && (
                                  <svg
                                    width="10"
                                    height="10"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                  >
                                    <path
                                      d="M2 6L5 9L10 3"
                                      stroke="white"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </span>
                              <span className="text-[12px] text-carbon truncate">
                                {ACTION_LABEL_ES[a]}
                              </span>
                            </span>
                            <span className="text-[10px] text-carbon/45 tabular-nums shrink-0">
                              {c}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* SKU list — accordion pattern. Each row is a clickable header
         *  that toggles inline expansion. Multiple SKUs can be open at
         *  once so the buyer can compare side-by-side without losing the
         *  full list overview. */}
        <ul className="flex-1 overflow-y-auto">
          {filteredSkus.map((sku) => {
            const isExpanded = expandedSkuIds.has(sku.product_fact_id);
            const effectiveActions = getEffectiveActions(sku);
            const visibleActs = visibleActions(effectiveActions);
            const lockedScenario = userLocks.get(sku.product_fact_id);
            const isLocked = lockedScenario != null;
            const isRecentlyChanged = recentlyChangedPids.has(sku.product_fact_id);
            // Fase 2 · si modo comparación activo, también necesitamos el stack
            // del 2º escenario para mostrar side-by-side.
            const comparisonActions = comparisonScenario && sku.verdicts_by_scenario
              ? sku.verdicts_by_scenario[comparisonScenario] ?? []
              : null;
            const comparisonVisibleActs = comparisonActions
              ? visibleActions(comparisonActions)
              : null;
            return (
              <li
                key={sku.product_fact_id}
                id={`sku-row-${sku.product_fact_id}`}
                className="border-b border-carbon/[0.04]"
              >
                <button
                  type="button"
                  onClick={() => onToggleExpand(sku.product_fact_id)}
                  aria-expanded={isExpanded}
                  className={`w-full text-left p-3 hover:bg-carbon/[0.02] transition-colors ${
                    isExpanded ? 'bg-carbon/[0.03]' : ''
                  } ${isLocked ? 'border-l-2 border-l-carbon/40' : ''} ${
                    isRecentlyChanged ? 'animate-[pulse_0.9s_ease-out_2] bg-warning/[0.05]' : ''
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
                     *  the row is expanded. */}
                    <ChevronRight
                      className={`h-4 w-4 text-carbon/40 mt-1 shrink-0 transition-transform duration-150 ${
                        isExpanded ? 'rotate-90 text-carbon/70' : ''
                      }`}
                    />
                  </div>
                  <div className="pl-[42px] space-y-1.5">
                    {/* Fase 2 · modo comparación: dos stacks etiquetados.
                     *  Modo normal: un solo stack horizontal. */}
                    {comparisonVisibleActs ? (
                      <div className="space-y-1.5">
                        <ScenarioStackRow
                          label={SCENARIO_LABEL_ES[activeScenario]}
                          actions={visibleActs}
                          accent="primary"
                        />
                        <ScenarioStackRow
                          label={SCENARIO_LABEL_ES[comparisonScenario as ScenarioId]}
                          actions={comparisonVisibleActs}
                          accent="secondary"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {visibleActs.map((a) => {
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
                    )}
                    {!isExpanded && !comparisonVisibleActs && visibleActs[0]?.rationale && (
                      <p className="text-[11px] text-carbon/60 leading-[1.45] line-clamp-2">
                        {visibleActs[0].rationale}
                      </p>
                    )}
                    {/* v2 §8.3 — Selector de escenario per-SKU + lock state.
                     *  Si está locked → muestra badge "🔒 [Escenario]" + botón
                     *  para liberar. Si no → muestra "Sigue al global" con
                     *  opción de fijar. Click no propaga al accordion. */}
                    <SkuScenarioControl
                      productFactId={sku.product_fact_id}
                      currentEffectiveScenario={getEffectiveScenario(sku.product_fact_id)}
                      isLocked={isLocked}
                      lockedScenario={lockedScenario}
                      activeGlobalScenario={activeScenario}
                      lockSku={lockSku}
                      unlockSku={unlockSku}
                    />
                  </div>
                </button>
                {isExpanded && (
                  <SkuDetailInline
                    sku={{ ...sku, actions: effectiveActions }}
                    runId={runId}
                    tenantSlug={tenantSlug}
                    pdfContainerRef={pdfContainerRef}
                    totalSkus={totalSkus}
                    pdfSignedUrl={pdfSignedUrl}
                    pdfNumPages={pdfNumPages}
                    autoDevelopActionType={
                      autoDevelop?.pfid === sku.product_fact_id ? autoDevelop.actionType : null
                    }
                    onAutoDevelopHandled={clearAutoDevelop}
                  />
                )}
              </li>
            );
          })}
        </ul>
        {/* v2 §8.3 — Footer del plan en construcción. Contador vivo de
         *  SKUs decididos vs pendientes. Felipe: "que parezca que lo hace
         *  todo infinitamente rápido". */}
        <div className="sticky bottom-0 z-10 bg-white border-t border-carbon/[0.08] px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-[18px] font-semibold tabular-nums text-carbon">
                  {lockedCount}
                </span>
                <span className="text-[11px] text-carbon/55">
                  de {data.summary.total_skus} SKUs decididos
                </span>
                <span className="text-[10px] text-carbon/35 tabular-nums">
                  · {pendingCount} pendientes
                </span>
              </div>
              {/* Progress bar visual */}
              <div className="mt-1.5 h-1 bg-carbon/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-carbon transition-all duration-500"
                  style={{ width: `${planCompletePct}%` }}
                />
              </div>
            </div>
            <div className="text-[10px] uppercase tracking-[0.1em] text-carbon/35 shrink-0 text-right">
              <div>plan</div>
              <div className="text-[16px] font-semibold tabular-nums text-carbon/70 leading-none mt-0.5">
                {planCompletePct}%
              </div>
            </div>
          </div>
        </div>
      </aside>
  );
}

/** Selector de escenario per-SKU. Click abre dropdown con los 4
 *  escenarios. Si el SKU está locked, muestra badge con el escenario
 *  fijado + botón unlock. Si no está locked, muestra "Sigue al global". */
function SkuScenarioControl({
  productFactId,
  currentEffectiveScenario,
  isLocked,
  lockedScenario,
  activeGlobalScenario,
  lockSku,
  unlockSku,
}: {
  productFactId: string;
  currentEffectiveScenario: ScenarioId;
  isLocked: boolean;
  lockedScenario: ScenarioId | undefined;
  activeGlobalScenario: ScenarioId;
  lockSku: (productFactId: string, scenario: ScenarioId) => Promise<void>;
  unlockSku: (productFactId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      {isLocked ? (
        <span className="inline-flex items-center gap-1.5 text-[10px] text-carbon/65 px-2 py-0.5 rounded-full bg-carbon/[0.06]">
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
            <path
              d="M3 5V3.5a3 3 0 116 0V5m-7 0h8v6H2V5z"
              stroke="currentColor"
              strokeWidth="1.4"
              fill="none"
            />
          </svg>
          <span className="font-medium">
            {SCENARIO_LABEL_ES[lockedScenario ?? currentEffectiveScenario]}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              unlockSku(productFactId);
            }}
            className="text-carbon/45 hover:text-carbon ml-0.5"
            title="Liberar SKU (sigue al toggle global)"
          >
            ×
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="inline-flex items-center gap-1 text-[10px] text-carbon/45 hover:text-carbon/70 px-2 py-0.5 rounded-full hover:bg-carbon/[0.04]"
        >
          <span>Fijar escenario</span>
          <ChevronDown
            className={`h-2.5 w-2.5 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      )}
      {open && !isLocked && (
        <div className="absolute left-0 top-full mt-1 w-[180px] bg-white border border-carbon/[0.10] rounded-[10px] shadow-[0_6px_20px_rgba(0,0,0,0.08)] overflow-hidden z-30">
          <ul className="py-1">
            {SCENARIO_ORDER.map((sid) => {
              const isCurrent = sid === activeGlobalScenario;
              return (
                <li key={sid}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      lockSku(productFactId, sid);
                      setOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-left text-[11px] text-carbon hover:bg-carbon/[0.03]"
                  >
                    <span>{SCENARIO_LABEL_ES[sid]}</span>
                    {isCurrent && (
                      <span className="text-[9px] text-carbon/45 italic">
                        global
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
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
function SkuDetailInline({
  sku,
  runId,
  tenantSlug,
  pdfContainerRef,
  totalSkus,
  pdfSignedUrl,
  pdfNumPages,
  autoDevelopActionType,
  onAutoDevelopHandled,
}: {
  sku: SkuRow;
  runId: string;
  tenantSlug: string;
  pdfContainerRef: React.RefObject<HTMLDivElement | null>;
  totalSkus: number;
  pdfSignedUrl: string | null;
  pdfNumPages: number;
  autoDevelopActionType: string | null;
  onAutoDevelopHandled: () => void;
}) {
  // Felipe sprint Aimily Design 2026-05-18 — botón "Abrir en Aimily Design"
  // en cada action card de extend_colors / amplify_next_season. Crea un
  // SKU en el plan "Aimily Design — In-Season" del usuario y lo abre en
  // el Collection Builder. MISMO flow Design (concept → sketch → colorways
  // → 3D), reusado tal cual del Collection Builder.
  //
  // 2026-05-19 · recorte automático de la foto referencia del SKU desde
  // el canvas del PDF Zara ya renderizado. Primera invocación recorta +
  // sube + persiste en product_image_url. Siguientes invocaciones reusan.
  // Ref: src/lib/strategy/sku-image-cropper.ts
  const [launchingAction, setLaunchingAction] = useState<string | null>(null);

  // Felipe 2026-05-19 noche · user-initiated seed model. Botón "+ A añadir a
  // semillas" en cada verdict pill seed-producing (amplify_next_season,
  // extend_colors, drop_color, kill). Single POST a /seeds/create.
  // Tracks per-(sku, action) to soportar varios botones en la misma fila.
  const [seedingKey, setSeedingKey] = useState<string | null>(null);
  const [seededKeys, setSeededKeys] = useState<Set<string>>(new Set());
  const addToSeeds = async (sku: SkuRow, action: VerdictAction) => {
    const key = `${sku.product_fact_id}:${action.action}`;
    if (seedingKey || seededKeys.has(key)) return;
    setSeedingKey(key);
    try {
      const res = await fetch('/api/in-season/seeds/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: tenantSlug,
          run_id: runId,
          product_fact_id: sku.product_fact_id,
          action_type: action.action,
          rationale: action.rationale,
          evidence: action.evidence ?? {},
          proposed_changes: {
            new_colors: (action.evidence as Record<string, unknown> | undefined)?.proposed_colors ?? [],
          },
        }),
      });
      if (res.ok) {
        setSeededKeys((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      }
    } finally {
      setSeedingKey(null);
    }
  };
  // Felipe 2026-05-19 noche · auto-fire desde pool de semillas. Cuando
  // el merch viene desde /seeds con ?develop_pfid=...&develop_action=...,
  // este efecto se dispara una vez y abre Aimily Design para la action
  // matching (sin requerir un segundo click).
  const autoDevelopFiredRef = useRef(false);
  useEffect(() => {
    if (autoDevelopFiredRef.current) return;
    if (!autoDevelopActionType) return;
    const matching = sku.actions.find((a) => a.action === autoDevelopActionType);
    if (!matching) return;
    if (matching.action !== 'extend_colors' && matching.action !== 'amplify_next_season') return;
    autoDevelopFiredRef.current = true;
    onAutoDevelopHandled();
    // Defer one tick so the panel can finish mounting + scroll into view.
    setTimeout(() => {
      void launchDesign(matching);
    }, 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDevelopActionType, sku.actions]);

  const launchDesign = async (
    action: VerdictAction,
  ) => {
    const actionType = action.action as 'extend_colors' | 'amplify_next_season';
    if (launchingAction) return;
    setLaunchingAction(actionType);
    try {
      // Felipe 2026-05-19 noche · "Desarrollar ahora" = crear seed +
      // abrir Builder en un solo click. ANTES de cortar la foto y crear
      // el SKU en el plan de Design, materializamos la seed asociada
      // (idempotente — si el merch ya había añadido a semillas, el endpoint
      // devuelve already_existed=true y seguimos abriendo Builder).
      const seedKey = `${sku.product_fact_id}:${action.action}`;
      if (!seededKeys.has(seedKey)) {
        try {
          const seedRes = await fetch('/api/in-season/seeds/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenant_slug: tenantSlug,
              run_id: runId,
              product_fact_id: sku.product_fact_id,
              action_type: action.action,
              rationale: action.rationale,
              evidence: action.evidence ?? {},
              proposed_changes: {
                new_colors:
                  (action.evidence as Record<string, unknown> | undefined)?.proposed_colors ?? [],
              },
            }),
          });
          if (seedRes.ok) {
            setSeededKeys((prev) => {
              const next = new Set(prev);
              next.add(seedKey);
              return next;
            });
          }
        } catch (e) {
          // Non-blocking — seed creation failure shouldn't prevent the
          // user from developing now. We log + continue.
          console.warn('[launchDesign] seed create failed (non-blocking):', e);
        }
      }

      // 1) Resolver imagen referencia. Dos modos según el origen del run:
      //
      //    A) Run Shopify (Products CSV ingerido): el parser ya populó
      //       sku.product_image_url con la URL del Shopify CDN (2048×2048
      //       master). No necesitamos recortar nada.
      //
      //    B) Run Zara (PDF RNK): recortamos client-side el canvas del PDF
      //       ya renderizado vía sku-image-cropper. Imagen nativa 135×203
      //       + upscale bicubic a 1024px lado mayor.
      let referenceImageUrl: string | undefined;
      if (sku.product_image_url) {
        // Modo Shopify · usa la URL directa, asegúrala persistida en
        // strategy_product_facts (para que open-design la propague al
        // SKU nuevo del Collection Builder).
        referenceImageUrl = sku.product_image_url;
      } else if (pdfSignedUrl) {
        // Modo Zara · extracción client-side desde el canvas del PDF.
        const { getSkuReferenceImage, uploadCroppedSkuImage } = await import(
          '@/lib/in-season/sku-image-cropper'
        );
        const result = await getSkuReferenceImage(
          pdfSignedUrl,
          sku.rank,
          totalSkus,
          pdfNumPages,
          sku.model_ref,
        );
        if (result) {
          const url = await uploadCroppedSkuImage(result.blob, sku.product_fact_id, {
            forceReplace: true,
          });
          if (url) referenceImageUrl = url;
        }
      }

      // 2) Crear SKU en la colección "Aimily Design — In-Season" + abrir
      //    Collection Builder con la fase Design pre-cargada.
      const res = await fetch('/api/in-season/sku-actions/open-design', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          product_fact_id: sku.product_fact_id,
          run_id: runId,
          action_type: actionType,
          reference_image_url: referenceImageUrl,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        alert(`No se pudo abrir Aimily Design: ${err.error || res.statusText}`);
        return;
      }
      const { url } = (await res.json()) as { url: string };
      window.open(url, '_blank');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLaunchingAction(null);
    }
  };

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
              {/* Felipe sprint Aimily Design 2026-05-18 — CTA "Abrir Aimily
               *  Design" en pills extend_colors y amplify_next_season.
               *  Crea un SKU en la colección "Aimily Design — In-Season"
               *  del usuario y lo abre en el Collection Builder con la
               *  fase Design pre-cargada (mismo flow: concept → sketch →
               *  colorways → 3D, todos los pasos del Collection Builder
               *  reusados sin cambios). */}
              {(a.action === 'extend_colors' ||
                a.action === 'amplify_next_season' ||
                a.action === 'kill') && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {/* Primary CTA · Aimily Design (sigue solo para verbos creativos) */}
                  {(a.action === 'extend_colors' || a.action === 'amplify_next_season') && (
                    <button
                      type="button"
                      onClick={() => launchDesign(a)}
                      disabled={launchingAction === a.action}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-carbon text-white text-[11px] font-medium hover:bg-carbon/90 transition-colors disabled:opacity-50"
                    >
                      {launchingAction === a.action ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Desarrollando…
                        </>
                      ) : (
                        <>
                          Desarrollar ahora
                          <ArrowRight className="h-3 w-3" />
                        </>
                      )}
                    </button>
                  )}
                  {/* Secondary CTA · Añadir a semillas (todos los seed-producing) */}
                  {(() => {
                    const key = `${sku.product_fact_id}:${a.action}`;
                    const seeded = seededKeys.has(key);
                    const loading = seedingKey === key;
                    return (
                      <button
                        type="button"
                        onClick={() => addToSeeds(sku, a)}
                        disabled={loading || seeded}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                          seeded
                            ? 'bg-carbon/[0.06] text-carbon/50 cursor-default'
                            : 'border border-carbon/15 text-carbon/70 hover:border-carbon/40 hover:text-carbon disabled:opacity-50'
                        }`}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Añadiendo…
                          </>
                        ) : seeded ? (
                          <>✓ En semillas</>
                        ) : (
                          <>+ Añadir a semillas</>
                        )}
                      </button>
                    );
                  })()}
                </div>
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


/**
 * v2 §9 — Rueda de carga estilo aimily Studio. 10 fases visibles que
 * tangibilizan el análisis ocurriendo. Cada fase dura 200-400ms. Felipe
 * 2026-05-18: "que parezca que lo hace todo infinitamente rápido".
 *
 * El comprador SIENTE la profundidad del análisis — no es loading
 * spinner abstracto, es teatro de la complejidad que valida ante el
 * cliente que detrás hay rigor metodológico.
 */
const LOADING_PHASES: Array<{ text: string }> = [
  { text: 'Analizando datos del RNK Zara · detectando SKUs activos…' },
  { text: 'Cargando inventario, stock, ventas, devoluciones, pipeline…' },
  { text: 'Computando rotación canónica, aportación a familia, cobertura efectiva…' },
  { text: 'Detectando anomalías y rotura de stock suprimida…' },
  { text: 'Evaluando las 10 decisiones de comprador por cada SKU…' },
  { text: 'Aplicando dirección creativa · paleta moodboard · family pivot…' },
  { text: 'Generando 4 escenarios comerciales · Conservar margen / Maximizar venta / Balanceada / Tu mezcla…' },
  { text: 'Resolviendo exclusiones cruzadas y prioridades…' },
  { text: 'Construyendo plan final con cobertura por SKU…' },
  { text: 'Listo · análisis completo' },
];

function LoadingWheel({ totalSkus }: { totalSkus: number | null }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (phase >= LOADING_PHASES.length - 1) return;
    const t = setTimeout(() => setPhase((p) => Math.min(LOADING_PHASES.length - 1, p + 1)), 220);
    return () => clearTimeout(t);
  }, [phase]);
  const progress = ((phase + 1) / LOADING_PHASES.length) * 100;
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-8">
      <div className="w-full max-w-[520px]">
        <div className="mb-8 text-center">
          <h1 className="text-[28px] font-medium text-carbon tracking-[-0.02em] mb-2">
            Analizando colección
          </h1>
          <p className="text-[13px] text-carbon/55">
            {totalSkus
              ? `${totalSkus} SKUs · 4 escenarios comerciales · ${LOADING_PHASES.length} fases`
              : 'Construyendo plan en vivo'}
          </p>
        </div>
        <div className="mb-8">
          <div className="h-1.5 bg-carbon/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-carbon transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <ul className="space-y-2">
          {LOADING_PHASES.map((p, i) => {
            const isDone = i < phase;
            const isCurrent = i === phase;
            const isPending = i > phase;
            return (
              <li
                key={i}
                className={`flex items-start gap-3 text-[13px] leading-[1.5] transition-opacity duration-200 ${
                  isPending ? 'opacity-25' : 'opacity-100'
                }`}
              >
                <span
                  className={`shrink-0 mt-1 w-3 h-3 rounded-full transition-all ${
                    isDone
                      ? 'bg-carbon'
                      : isCurrent
                        ? 'bg-carbon/40 animate-pulse'
                        : 'bg-carbon/15'
                  }`}
                />
                <span
                  className={`${
                    isCurrent
                      ? 'text-carbon font-medium'
                      : isDone
                        ? 'text-carbon/55'
                        : 'text-carbon/40'
                  }`}
                >
                  {p.text}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Fase 2 · botón "Comparar" en el header. Abre dropdown con los 3
 *  escenarios distintos al activo. Al picar uno, activa modo
 *  side-by-side. */
function ComparisonControl({
  activeScenario,
  comparisonScenario,
  setComparisonScenario,
}: {
  activeScenario: ScenarioId;
  comparisonScenario: ScenarioId | null;
  setComparisonScenario: (s: ScenarioId | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  if (comparisonScenario) {
    return (
      <button
        type="button"
        onClick={() => setComparisonScenario(null)}
        className="inline-flex items-center gap-1 text-[10px] text-carbon/60 hover:text-carbon px-2 py-1 rounded-full bg-warning/15 hover:bg-warning/25"
      >
        <span>vs {SCENARIO_LABEL_ES[comparisonScenario]}</span>
        <span className="text-carbon/45 ml-0.5">×</span>
      </button>
    );
  }
  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[10px] text-carbon/55 hover:text-carbon px-2 py-1 rounded-full hover:bg-carbon/[0.04]"
      >
        <span>Comparar con…</span>
        <ChevronDown className={`h-2.5 w-2.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-[180px] bg-white border border-carbon/[0.10] rounded-[10px] shadow-[0_6px_20px_rgba(0,0,0,0.08)] overflow-hidden z-30">
          <ul className="py-1">
            {SCENARIO_ORDER.filter((s) => s !== activeScenario).map((sid) => (
              <li key={sid}>
                <button
                  type="button"
                  onClick={() => {
                    setComparisonScenario(sid);
                    setOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[11px] text-carbon hover:bg-carbon/[0.03]"
                >
                  {SCENARIO_LABEL_ES[sid]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Fase 2 · una fila etiquetada de pills bajo modo comparación. Se
 *  renderizan DOS de estas filas por SKU (una por escenario comparado). */
function ScenarioStackRow({
  label,
  actions,
  accent,
}: {
  label: string;
  actions: VerdictAction[];
  accent: 'primary' | 'secondary';
}) {
  const labelColor = accent === 'primary' ? 'text-carbon/70' : 'text-warning';
  return (
    <div className="flex items-start gap-1.5">
      <span className={`text-[9px] uppercase tracking-[0.06em] font-medium ${labelColor} shrink-0 mt-1 w-[68px]`}>
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
        {actions.length === 0 ? (
          <span className="text-[10px] text-carbon/30 italic">sin alertas</span>
        ) : (
          actions.map((a) => {
            const colors = actionColors(a);
            return (
              <span key={a.action} className="inline-flex items-center gap-1">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.06em] ${ACTION_TONE[a.action]}`}
                >
                  {ACTION_LABEL_ES[a.action]}
                  {a.recommended_units != null && a.recommended_units > 0
                    ? ` · ${a.recommended_units.toLocaleString()}`
                    : ''}
                </span>
                {colors.length > 0 && <ColorSwatches swatches={colors} size={12} />}
              </span>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * ShopifyProductGrid — render columna izquierda cuando la fuente NO es
 * Zara RNK. Aimily reconstruye un "ranking sintético" imitando la
 * forma del PDF Zara RNK que el comprador ya conoce: una hoja vertical
 * con #rank prominente · foto pequeña · model_ref · familia · color ·
 * PVP · vendidos 7d · stock · tiendas. Click → expande SKU en panel
 * derecho + scroll.
 *
 * Felipe sprint Shopify lane 2026-05-19. Objetivo explícito de Felipe:
 * "cuando alguien sube info fea de CSV de Shopify, nosotros la
 * mostramos lo más parecido posible al formato Zara". El comprador no
 * debería notar la diferencia de fuente; el formato es universal.
 *
 * Diseño basado en la captura del Zara RNK: header de columnas en
 * minúsculas tipo terminal, filas con cell-borders muy sutiles, datos
 * tabulares alineados a la derecha, valores ausentes como "—".
 */
function ShopifyProductGrid({
  skus,
  onClick,
  pdfSignedUrl,
}: {
  skus: SkuRow[];
  onClick: (sku: SkuRow) => void;
  pdfSignedUrl: string | null;
}) {
  if (skus.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-carbon/40 text-[13px] italic">
        Sin SKUs persistidos para este run.
      </div>
    );
  }
  const fmtNum = (n: number | null | undefined) =>
    n == null ? '—' : Math.round(n).toLocaleString('es-ES');
  const fmtPvp = (n: number | null | undefined) =>
    n == null ? '—' : `€${Number(n).toFixed(2)}`;
  // Felipe 2026-05-19 noche: when no PDF source (= Shopify lane) sort by
  // velocity_7d desc so the merchandiser sees real top vendedores first,
  // not arbitrary ingest order. Zara runs keep PDF row order intact.
  const sortedSkus = pdfSignedUrl
    ? skus
    : [...skus].sort((a, b) => (b.velocity_7d ?? 0) - (a.velocity_7d ?? 0));
  return (
    <div className="bg-white max-w-[860px] mx-auto shadow-sm">
      {/* Header tipo hoja Zara RNK */}
      <div className="border-b border-carbon/10 px-6 py-4">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-carbon/45">
              Ranking sintético · {skus.length} SKUs
            </div>
            <div className="text-[18px] font-semibold text-carbon tracking-[-0.02em] mt-1">
              Top vendedores del run
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-carbon/35">
            Reconstruido desde fuente externa
          </div>
        </div>
      </div>

      {/* Column headers — sticky-style.
       *  Felipe 2026-05-19 noche: la fila tenía sólo PVP·Vend·Stock·Tiendas y
       *  el merch no podía "ver" la metodología. Añadimos las KPIs que
       *  diferencian arquetipos: rotación (productividad), días en tienda
       *  (lifecycle stage) y returns% (red flag).
       */}
      <div className="grid grid-cols-[40px_72px_1fr_72px_64px_64px_64px_56px_56px_56px] gap-3 px-6 py-2 border-b border-carbon/10 bg-carbon/[0.015] text-[10px] uppercase tracking-[0.08em] text-carbon/45">
        <span>#</span>
        <span>Foto</span>
        <span>Modelo · familia · color</span>
        <span className="text-right">PVP</span>
        <span className="text-right">Vend 7d</span>
        <span className="text-right">Stock</span>
        <span className="text-right">Tiendas</span>
        <span className="text-right">Rotac.</span>
        <span className="text-right">Días</span>
        <span className="text-right">Devol.</span>
      </div>

      {/* Filas — sort by velocity_7d desc when no PDF source (Shopify lane).
       *  When pdf_signed_url is present (Zara) keep PDF row order intact. */}
      <div>
        {sortedSkus.map((sku, idx) => {
          const rot = sku.commercial_kpis?.rotation_aj_7d ?? null;
          const rotColor = rot == null
            ? 'text-carbon/30'
            : rot >= 1.0
              ? 'text-emerald-600 font-semibold'
              : rot >= 0.5
                ? 'text-carbon/80'
                : 'text-amber-600 font-semibold';
          const returnsPct = sku.returns_pct ?? null;
          const returnsColor = returnsPct == null
            ? 'text-carbon/30'
            : returnsPct >= 0.25
              ? 'text-red-600 font-semibold'
              : returnsPct >= 0.15
                ? 'text-amber-600'
                : 'text-carbon/80';
          const displayRank = pdfSignedUrl ? sku.rank : idx + 1;
          return (
          <button
            key={sku.product_fact_id}
            type="button"
            onClick={() => onClick(sku)}
            className="group w-full grid grid-cols-[40px_72px_1fr_72px_64px_64px_64px_56px_56px_56px] gap-3 items-center px-6 py-3 border-b border-carbon/[0.06] hover:bg-carbon/[0.02] transition-colors text-left"
          >
            <span className="text-[18px] font-semibold text-carbon/30 tabular-nums">
              {displayRank}
            </span>
            <div className="w-[72px] h-[88px] bg-carbon/[0.03] rounded-[4px] overflow-hidden flex items-center justify-center">
              {sku.product_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sku.product_image_url}
                  alt={sku.product_name ?? sku.model_ref ?? ''}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="text-[9px] text-carbon/25 uppercase tracking-wider">
                  sin foto
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-carbon truncate">
                {sku.product_name ?? sku.model_ref ?? '—'}
              </div>
              <div className="text-[11px] text-carbon/45 truncate mt-0.5 font-mono">
                {sku.model_ref ?? '—'}
                {sku.family_code ? ` · ${sku.family_code}` : ''}
                {sku.color_ref ? ` · ${sku.color_ref}` : ''}
              </div>
            </div>
            <span className="text-[12px] text-carbon/80 text-right tabular-nums font-mono">
              {fmtPvp(sku.pvp)}
            </span>
            <span className="text-[12px] text-carbon/80 text-right tabular-nums font-mono">
              {fmtNum(sku.velocity_7d)}
            </span>
            <span className="text-[12px] text-carbon/80 text-right tabular-nums font-mono">
              {fmtNum(sku.stock_total)}
            </span>
            <span className="text-[12px] text-carbon/80 text-right tabular-nums font-mono">
              {sku.stores_with_stock != null && sku.stores_active != null
                ? `${sku.stores_with_stock}/${sku.stores_active}`
                : fmtNum(sku.stores_active)}
            </span>
            <span className={`text-[12px] text-right tabular-nums font-mono ${rotColor}`}>
              {rot == null ? '—' : rot.toFixed(2)}
            </span>
            <span className="text-[12px] text-carbon/70 text-right tabular-nums font-mono">
              {sku.days_in_store == null ? '—' : `${sku.days_in_store}d`}
            </span>
            <span className={`text-[12px] text-right tabular-nums font-mono ${returnsColor}`}>
              {returnsPct == null ? '—' : `${Math.round(returnsPct * 100)}%`}
            </span>
          </button>
          );
        })}
      </div>
    </div>
  );
}
