'use client';

/**
 * ActionMixCard — 4-segment editable bar (replenish / new / family-ext / kill).
 * Sum must equal 100, validated client-side as the user drags sliders; DB
 * + server-side enforce the same invariant on confirm.
 */

import { EditorAxisCard } from './EditorAxisCard';

export interface ActionMix {
  replenish_pct: number;
  new_sku_proposal_pct: number;
  family_extension_pct: number;
  kill_pct: number;
}

interface Props {
  mix: ActionMix;
  onChange: (next: ActionMix) => void;
  onDeepen?: (axis: string) => void;
  deepening?: string | null;
}

const ROWS: Array<{ key: keyof ActionMix; label: string; color: string }> = [
  { key: 'replenish_pct', label: 'Replenish', color: '#b6c8c7' },
  { key: 'new_sku_proposal_pct', label: 'New SKUs', color: '#c5caa8' },
  { key: 'family_extension_pct', label: 'Family extensions', color: '#fff4ce' },
  { key: 'kill_pct', label: 'Kill', color: '#f1efed' },
];

export function ActionMixCard({ mix, onChange, onDeepen, deepening }: Props) {
  const total =
    mix.replenish_pct + mix.new_sku_proposal_pct + mix.family_extension_pct + mix.kill_pct;
  const sumValid = Math.abs(total - 100) <= 0.5;

  const update = (key: keyof ActionMix, value: number) => {
    onChange({ ...mix, [key]: Math.max(0, Math.min(100, Math.round(value))) });
  };

  return (
    <EditorAxisCard
      title="Action mix"
      description="How next season's SKU budget splits across replenish, new, family-extension, and kill."
      axis="action_mix"
      onDeepen={onDeepen}
      deepening={deepening}
    >
      {/* Stacked bar visualization */}
      <div className="flex h-3 rounded-full overflow-hidden bg-carbon/[0.04] mb-5">
        {ROWS.map((row) => {
          const pct = mix[row.key];
          if (pct === 0) return null;
          return (
            <div
              key={row.key}
              style={{ width: `${pct}%`, backgroundColor: row.color }}
              title={`${row.label}: ${pct}%`}
            />
          );
        })}
      </div>

      <div className="space-y-3">
        {ROWS.map((row) => (
          <div key={row.key} className="flex items-center gap-3">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: row.color }}
            />
            <span className="text-[12px] tracking-[0.05em] uppercase font-semibold text-carbon/55 w-[140px] shrink-0">
              {row.label}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={mix[row.key]}
              onChange={(e) => update(row.key, Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={mix[row.key]}
              onChange={(e) => update(row.key, Number(e.target.value))}
              className="w-[60px] text-center text-[13px] font-semibold text-carbon tabular-nums bg-carbon/[0.03] rounded-md py-1 outline-none focus:bg-carbon/[0.06]"
            />
            <span className="text-[12px] text-carbon/45">%</span>
          </div>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-carbon/[0.06] flex items-baseline justify-between text-[12px]">
        <span className="text-carbon/50 uppercase tracking-[0.08em]">Total</span>
        <span
          className={`text-[16px] font-semibold tabular-nums ${
            sumValid ? 'text-carbon' : 'text-red-600'
          }`}
        >
          {Math.round(total * 10) / 10}%
          {!sumValid && (
            <span className="ml-2 text-[11px] font-normal">Must equal 100</span>
          )}
        </span>
      </div>
    </EditorAxisCard>
  );
}
