/**
 * Presenter helpers for strategy_recommendation_candidates rows.
 *
 * Shared between the run-detail page and the printable decision-pack so
 * both render the same human-readable identity + evidence. Kept in
 * src/lib/strategy/ so it can be imported from server components.
 *
 * Why a presenter layer:
 *   The raw candidate row carries UUIDs (scope_ref) and a JSON evidence
 *   blob with backend field names like `velocity_7d`, `returns_pct`,
 *   `lifecycle_stage: decay`. Surfacing that verbatim is a log dump, not
 *   a UI. This module converts those into:
 *     · identity headline (product name / model_ref / color name)
 *     · evidence rows with locale-aware labels + visual tone
 */

export interface EvidenceLabels {
  title: string;
  counterTitle: string;
  assumptionsTitle: string;
  confidenceBreakdown: string;
  skuMissing: string;
  colorMissing: string;
  lineageMissing: string;
  velocity7d: string;
  unitsLast7d: string;
  velocityRatio: string;
  returnsPct: string;
  returnsFlag: string;
  returnRisk: string;
  effectiveMargin: string;
  demandLevel: string;
  marginLevel: string;
  storesActive: string;
  lifecycleStage: string;
  rank: string;
  high: string;
  medium: string;
  low: string;
  yes: string;
  creativeFitColor: string;
  colorInPalette: string;
  colorOffPalette: string;
  creativeFitArchetype: string;
  creativeFitFamilyPivot: string;
  creativeFitFamilyPivotMisaligned: string;
  tensionType: string;
  underlyingAction: string;
  lifecycleStages: Record<string, string>;
  ranks: Record<string, string>;
}

export interface CandidateIdentity {
  headline: string;
  sub: string | null;
  family: string | null;
  /** True when `sub` is a code-like value (model_ref, canonical_id) and
   *  should be rendered in mono; false when it's prose (e.g. fallback
   *  "details unavailable"). */
  subIsCode: boolean;
}

export type EvidenceTone = 'good' | 'bad' | 'neutral';

export interface EvidenceRow {
  key: string;
  label: string;
  value: string;
  tone?: EvidenceTone;
}

/** Short the UUID for fallback display: first 6 + last 4 chars. */
export function shortUuid(ref: string): string {
  if (!ref) return ref;
  if (ref.length <= 12) return ref;
  return `${ref.slice(0, 6)}…${ref.slice(-4)}`;
}

export function resolveCandidateIdentity(
  candidate: { scope: string; scope_ref: string },
  productById: Map<string, any>,
  lineageById: Map<string, any>,
  colorCodeMap: Record<string, string>,
  evidenceLabels: EvidenceLabels
): CandidateIdentity {
  if (candidate.scope === 'sku') {
    const p = productById.get(candidate.scope_ref);
    if (p) {
      const colorName =
        p.color_ref && colorCodeMap[p.color_ref]
          ? colorCodeMap[p.color_ref].replace(/_/g, ' ')
          : p.color_ref;
      return {
        headline: p.product_name || p.model_ref || shortUuid(candidate.scope_ref),
        sub: `${p.model_ref || shortUuid(candidate.scope_ref)}${colorName ? ` · ${colorName}` : ''}${p.pvp ? ` · €${Number(p.pvp).toFixed(2)}` : ''}`,
        family: p.family_code || null,
        subIsCode: true,
      };
    }
    return {
      headline: `SKU ${shortUuid(candidate.scope_ref)}`,
      sub: evidenceLabels.skuMissing,
      family: null,
      subIsCode: false,
    };
  }
  if (candidate.scope === 'color') {
    const [lineageId, colorRef] = candidate.scope_ref.split('#');
    const lineage = lineageById.get(lineageId);
    const colorName =
      colorRef && colorCodeMap[colorRef]
        ? colorCodeMap[colorRef].replace(/_/g, ' ')
        : colorRef;
    if (lineage) {
      return {
        headline: colorName || shortUuid(colorRef ?? ''),
        sub: lineage.display_name || lineage.canonical_id || shortUuid(lineageId),
        family: null,
        subIsCode: false,
      };
    }
    return {
      headline: colorName || shortUuid(colorRef ?? ''),
      sub: evidenceLabels.lineageMissing,
      family: null,
      subIsCode: false,
    };
  }
  if (candidate.scope === 'lineage') {
    const lineage = lineageById.get(candidate.scope_ref);
    if (lineage) {
      return {
        headline: lineage.display_name || lineage.canonical_id || shortUuid(candidate.scope_ref),
        sub: lineage.canonical_id || null,
        family: null,
        subIsCode: true,
      };
    }
    return {
      headline: shortUuid(candidate.scope_ref),
      sub: evidenceLabels.lineageMissing,
      family: null,
      subIsCode: false,
    };
  }
  return {
    headline: candidate.scope_ref,
    sub: null,
    family: null,
    subIsCode: false,
  };
}

/**
 * Translate the raw evidence/counter-evidence record into locale-aware,
 * human-readable rows. Maps well-known backend fields (velocity_7d,
 * returns_pct, etc.) to formatted values with proper units; unknown
 * fields get a safe fallback display so we never lose information.
 */
export function humanizeEvidence(
  obj: Record<string, unknown>,
  ev: EvidenceLabels,
  actionLabels: Record<string, string>
): EvidenceRow[] {
  const rows: EvidenceRow[] = [];
  const seen = new Set<string>();
  const push = (row: EvidenceRow) => {
    seen.add(row.key);
    rows.push(row);
  };

  if (typeof obj.velocity_7d === 'number') {
    push({
      key: 'velocity_7d',
      label: ev.velocity7d,
      value: `${obj.velocity_7d.toLocaleString()} ${ev.unitsLast7d}`,
    });
  }
  if (typeof obj.velocity_ratio === 'number') {
    const r = obj.velocity_ratio;
    push({
      key: 'velocity_ratio',
      label: ev.velocityRatio,
      value: `${r.toFixed(2)}×`,
      tone: r >= 1.1 ? 'good' : r <= 0.7 ? 'bad' : 'neutral',
    });
  }
  if (typeof obj.returns_pct === 'number') {
    const p = obj.returns_pct;
    push({
      key: 'returns_pct',
      label: ev.returnsPct,
      value: `${(p * 100).toFixed(1)}%`,
      tone: p > 0.25 ? 'bad' : p > 0.15 ? 'neutral' : 'good',
    });
  }
  if (obj.returns_flag === true) {
    push({ key: 'returns_flag', label: ev.returnsFlag, value: ev.yes, tone: 'bad' });
  }
  if (typeof obj.return_risk === 'number') {
    const r = obj.return_risk;
    push({
      key: 'return_risk',
      label: ev.returnRisk,
      value: `${(r * 100).toFixed(0)}%`,
      tone: r > 0.5 ? 'bad' : r > 0.3 ? 'neutral' : 'good',
    });
  }
  if (typeof obj.effective_margin === 'number') {
    const m = obj.effective_margin;
    push({
      key: 'effective_margin',
      label: ev.effectiveMargin,
      value: `${(m * 100).toFixed(1)}%`,
      tone: m < 0 ? 'bad' : m < 0.2 ? 'neutral' : 'good',
    });
  }
  if (typeof obj.demand_score === 'number') {
    const s = obj.demand_score;
    const level = s >= 0.7 ? ev.high : s >= 0.4 ? ev.medium : ev.low;
    push({
      key: 'demand_score',
      label: ev.demandLevel,
      value: level,
      tone: s >= 0.7 ? 'good' : s < 0.4 ? 'bad' : 'neutral',
    });
  }
  if (typeof obj.margin_score === 'number') {
    const s = obj.margin_score;
    const level = s >= 0.7 ? ev.high : s >= 0.4 ? ev.medium : ev.low;
    push({
      key: 'margin_score',
      label: ev.marginLevel,
      value: level,
      tone: s >= 0.7 ? 'good' : s < 0.4 ? 'bad' : 'neutral',
    });
  }
  if (typeof obj.stores_active === 'number') {
    push({
      key: 'stores_active',
      label: ev.storesActive,
      value: obj.stores_active.toLocaleString(),
    });
  }
  if (typeof obj.lifecycle_stage === 'string') {
    const stage = obj.lifecycle_stage;
    const stageLabel = ev.lifecycleStages[stage] || stage;
    push({
      key: 'lifecycle_stage',
      label: ev.lifecycleStage,
      value: stageLabel,
      tone: stage === 'decay' || stage === 'dead' ? 'bad' : stage === 'peak' ? 'good' : 'neutral',
    });
  }
  if (typeof obj.rank === 'string') {
    const r = obj.rank;
    const rankLabel = ev.ranks[r] || r;
    push({
      key: 'rank',
      label: ev.rank,
      value: rankLabel,
      tone: r === 'top' ? 'good' : r === 'tail' ? 'bad' : 'neutral',
    });
  }
  if (typeof obj.color_story_hit === 'string') {
    push({
      key: 'color_story_hit',
      label: ev.creativeFitColor,
      value: `${ev.colorInPalette} · ${obj.color_story_hit}`,
      tone: 'good',
    });
  }
  if (obj.color_off_palette != null) {
    push({
      key: 'color_off_palette',
      label: ev.creativeFitColor,
      value: `${ev.colorOffPalette} · ${String(obj.color_off_palette)}`,
      tone: 'bad',
    });
  }
  if (typeof obj.archetype_focus === 'string') {
    push({
      key: 'archetype_focus',
      label: ev.creativeFitArchetype,
      value: obj.archetype_focus,
      tone: 'good',
    });
  }
  if (typeof obj.family_pivot === 'string') {
    push({
      key: 'family_pivot',
      label: ev.creativeFitFamilyPivot,
      value: obj.family_pivot,
      tone: 'good',
    });
  }
  if (typeof obj.family_pivot_misaligned === 'number') {
    const pivot = obj.family_pivot_misaligned;
    push({
      key: 'family_pivot_misaligned',
      label: ev.creativeFitFamilyPivotMisaligned,
      value: `${pivot > 0 ? '+' : ''}${(pivot * 100).toFixed(0)}%`,
      tone: 'bad',
    });
  }
  if (typeof obj.tension_type === 'string') {
    push({
      key: 'tension_type',
      label: ev.tensionType,
      value: obj.tension_type.replace(/_/g, ' '),
    });
  }
  if (typeof obj.underlying_action === 'string') {
    push({
      key: 'underlying_action',
      label: ev.underlyingAction,
      value: actionLabels[obj.underlying_action] || obj.underlying_action,
    });
  }

  // Catch-all: surface remaining scalar fields verbatim so we never silently
  // drop signal. Skip keys we already rendered + nested objects.
  for (const [k, v] of Object.entries(obj)) {
    if (seen.has(k)) continue;
    if (v == null || typeof v === 'object') continue;
    const value =
      typeof v === 'number'
        ? Number.isInteger(v)
          ? v.toLocaleString()
          : v.toFixed(3)
        : String(v);
    rows.push({ key: k, label: k.replace(/_/g, ' '), value });
  }

  return rows;
}
