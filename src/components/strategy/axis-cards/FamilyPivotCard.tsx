'use client';

/**
 * FamilyPivotCard — per-family ±50% pivot sliders + adjacency targets for D.
 * For archetype D, the "Target adjacent families" sub-section is required
 * (server validation rejects empty target_adjacent_families when D).
 */

import { useState } from 'react';
import { EditorAxisCard } from './EditorAxisCard';
import { Plus, Minus } from 'lucide-react';
import { useTranslation } from '@/i18n';

export interface FamilyPivotRow {
  family_code: string;
  pivot_pct: number;
  rationale: string;
}

interface Props {
  pivots: FamilyPivotRow[];
  topFamilyCodes: string[];
  adjacentFamilies: string[];
  archetypeId: 'A' | 'B' | 'C' | 'D' | null;
  onPivotChange: (next: FamilyPivotRow[]) => void;
  onAdjacentChange: (next: string[]) => void;
  onDeepen?: (axis: string) => void;
  deepening?: string | null;
}

export function FamilyPivotCard({
  pivots,
  topFamilyCodes,
  adjacentFamilies,
  archetypeId,
  onPivotChange,
  onAdjacentChange,
  onDeepen,
  deepening,
}: Props) {
  const t = useTranslation();
  const fp = t.inSeason.axis.familyPivot;
  const [adjacentDraft, setAdjacentDraft] = useState('');
  const isD = archetypeId === 'D';

  const update = (idx: number, patch: Partial<FamilyPivotRow>) => {
    const next = [...pivots];
    next[idx] = { ...next[idx], ...patch };
    onPivotChange(next);
  };

  const remove = (idx: number) => onPivotChange(pivots.filter((_, i) => i !== idx));

  const add = () => {
    const used = new Set(pivots.map((p) => p.family_code));
    const fallback = topFamilyCodes.find((c) => !used.has(c)) ?? 'NEW_FAMILY';
    onPivotChange([...pivots, { family_code: fallback, pivot_pct: 0, rationale: '' }]);
  };

  const addAdjacent = () => {
    const value = adjacentDraft.trim();
    if (!value) return;
    if (adjacentFamilies.includes(value)) {
      setAdjacentDraft('');
      return;
    }
    onAdjacentChange([...adjacentFamilies, value]);
    setAdjacentDraft('');
  };

  const removeAdjacent = (code: string) => {
    onAdjacentChange(adjacentFamilies.filter((c) => c !== code));
  };

  return (
    <EditorAxisCard
      title={fp.title}
      description={isD ? fp.descriptionD : fp.descriptionDefault}
      axis="family_pivot"
      onDeepen={onDeepen}
      deepening={deepening}
    >
      <div className="space-y-3">
        {pivots.length === 0 && (
          <p className="text-[12px] text-carbon/45 italic">
            {fp.noPivots}
          </p>
        )}
        {pivots.map((row, idx) => (
          <div
            key={idx}
            className="grid grid-cols-12 gap-3 items-center bg-carbon/[0.03] rounded-[12px] px-3 py-2.5"
          >
            <input
              type="text"
              list={`fp-families-${idx}`}
              value={row.family_code}
              onChange={(e) => update(idx, { family_code: e.target.value })}
              className="col-span-3 text-[12px] font-mono text-carbon bg-white/60 rounded px-2 py-1 outline-none truncate"
            />
            <datalist id={`fp-families-${idx}`}>
              {topFamilyCodes.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <div className="col-span-2 flex items-center gap-1">
              <input
                type="range"
                min={-50}
                max={50}
                value={row.pivot_pct}
                onChange={(e) => update(idx, { pivot_pct: Number(e.target.value) })}
                className="w-full"
              />
            </div>
            <div className="col-span-2 flex items-center gap-1">
              <input
                type="number"
                min={-50}
                max={50}
                value={row.pivot_pct}
                onChange={(e) => update(idx, { pivot_pct: Number(e.target.value) })}
                className="w-full text-[13px] tabular-nums bg-white/60 rounded px-2 py-1 outline-none"
              />
              <span className="text-[11px] text-carbon/45">%</span>
            </div>
            <input
              type="text"
              value={row.rationale}
              onChange={(e) => update(idx, { rationale: e.target.value })}
              placeholder={fp.rationalePlaceholder}
              className="col-span-4 text-[12px] text-carbon/75 bg-white/60 rounded px-2 py-1 outline-none placeholder:text-carbon/30"
            />
            <button
              type="button"
              onClick={() => remove(idx)}
              className="col-span-1 w-7 h-7 rounded-full bg-carbon/[0.06] hover:bg-carbon/[0.12] text-carbon/55 flex items-center justify-center"
              aria-label={fp.removePivotAria}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          className="w-full py-2 rounded-[12px] border border-dashed border-carbon/[0.12] hover:border-carbon/30 text-[12px] font-medium text-carbon/55 inline-flex items-center justify-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> {fp.addPivot}
        </button>
      </div>

      {isD && (
        <div className="mt-6 pt-5 border-t border-carbon/[0.06]">
          <div className="mb-3">
            <div className="text-[12px] font-semibold text-carbon tracking-[-0.01em] mb-1">
              {fp.adjacentTitle}
              <span className="ml-2 text-[11px] font-medium text-amber-700 uppercase tracking-[0.08em]">
                {fp.adjacentRequiredBadge}
              </span>
            </div>
            <p className="text-[12px] text-carbon/55">
              {fp.adjacentDescription}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {adjacentFamilies.length === 0 && (
              <span className="text-[12px] text-carbon/40 italic">{fp.adjacentEmpty}</span>
            )}
            {adjacentFamilies.map((code) => (
              <span
                key={code}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-carbon text-white text-[12px] font-medium"
              >
                {code}
                <button
                  type="button"
                  onClick={() => removeAdjacent(code)}
                  className="text-white/70 hover:text-white"
                  aria-label={fp.removeAdjacentAria.replace('{code}', code)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={adjacentDraft}
              onChange={(e) => setAdjacentDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addAdjacent();
                }
              }}
              placeholder={fp.adjacentPlaceholder}
              className="flex-1 px-3 py-2 text-[13px] text-carbon bg-carbon/[0.03] rounded-[10px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none placeholder:text-carbon/30 font-mono"
            />
            <button
              type="button"
              onClick={addAdjacent}
              disabled={!adjacentDraft.trim()}
              className="px-4 py-2 rounded-full bg-carbon text-white text-[12px] font-semibold disabled:opacity-40 hover:bg-carbon/90"
            >
              {fp.adjacentAdd}
            </button>
          </div>
        </div>
      )}
    </EditorAxisCard>
  );
}
