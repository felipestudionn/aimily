'use client';

/**
 * LeadTimeCalendarCard — buy waves with per-wave lead-time penalty preview.
 * Pre-run, this card surfaces a planning view. After the run completes,
 * the run-detail editor variant pulls real lead_time_penalty values from
 * strategy_replenishment_allocations.
 */

import { EditorAxisCard } from './EditorAxisCard';
import { Plus, Minus } from 'lucide-react';
import { useTranslation } from '@/i18n';

export interface BuyWave {
  name: string;
  share_pct: number;
  target_lead_time_days: number;
}

interface Props {
  waves: BuyWave[];
  onChange: (next: BuyWave[]) => void;
  onDeepen?: (axis: string) => void;
  deepening?: string | null;
}

const DEFAULT_WAVE: BuyWave = { name: 'Wave', share_pct: 0, target_lead_time_days: 30 };

export function LeadTimeCalendarCard({ waves, onChange, onDeepen, deepening }: Props) {
  const t = useTranslation();
  const lt = t.inSeason.axis.leadTime;
  const sum = waves.reduce((acc, w) => acc + (w.share_pct ?? 0), 0);
  const sumValid = waves.length === 0 || Math.abs(sum - 100) <= 0.5;

  const updateWave = (idx: number, patch: Partial<BuyWave>) => {
    const next = [...waves];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const addWave = () => {
    const nextNumber = waves.length + 1;
    const remainder = Math.max(0, 100 - sum);
    onChange([
      ...waves,
      { ...DEFAULT_WAVE, name: `Wave ${nextNumber}`, share_pct: remainder },
    ]);
  };

  const removeWave = (idx: number) => {
    onChange(waves.filter((_, i) => i !== idx));
  };

  return (
    <EditorAxisCard
      title={lt.title}
      description={lt.description}
      axis="lead_time_calendar"
      onDeepen={onDeepen}
      deepening={deepening}
    >
      {waves.length === 0 ? (
        <button
          type="button"
          onClick={addWave}
          className="w-full py-6 rounded-[12px] border-2 border-dashed border-carbon/[0.12] hover:border-carbon/30 text-[13px] font-medium text-carbon/55 transition-colors"
        >
          {lt.addFirst}
        </button>
      ) : (
        <div className="space-y-3">
          {waves.map((wave, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 gap-3 items-center bg-carbon/[0.03] rounded-[12px] px-3 py-2.5"
            >
              <input
                type="text"
                value={wave.name}
                onChange={(e) => updateWave(idx, { name: e.target.value })}
                className="col-span-4 text-[13px] font-medium text-carbon bg-transparent outline-none focus:bg-white/60 rounded px-2 py-1"
              />
              <div className="col-span-3 flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={wave.share_pct}
                  onChange={(e) => updateWave(idx, { share_pct: Number(e.target.value) })}
                  className="w-full text-[13px] text-carbon tabular-nums bg-white/60 rounded px-2 py-1 outline-none"
                />
                <span className="text-[12px] text-carbon/45">%</span>
              </div>
              <div className="col-span-4 flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  value={wave.target_lead_time_days}
                  onChange={(e) => updateWave(idx, { target_lead_time_days: Number(e.target.value) })}
                  className="w-full text-[13px] text-carbon tabular-nums bg-white/60 rounded px-2 py-1 outline-none"
                />
                <span className="text-[12px] text-carbon/45">{lt.dLead}</span>
              </div>
              <button
                type="button"
                onClick={() => removeWave(idx)}
                className="col-span-1 w-7 h-7 rounded-full bg-carbon/[0.06] hover:bg-carbon/[0.12] text-carbon/55 flex items-center justify-center"
                aria-label={lt.removeWaveAria}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addWave}
            disabled={waves.length >= 8}
            className="w-full py-2 rounded-[12px] border border-dashed border-carbon/[0.12] hover:border-carbon/30 text-[12px] font-medium text-carbon/55 inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" /> {lt.addWave}
          </button>
        </div>
      )}

      {waves.length > 0 && (
        <div className="mt-4 pt-3 border-t border-carbon/[0.06] flex items-baseline justify-between text-[12px]">
          <span className="text-carbon/50 uppercase tracking-[0.08em]">{lt.totalShare}</span>
          <span
            className={`text-[14px] font-semibold tabular-nums ${
              sumValid ? 'text-carbon' : 'text-amber-600'
            }`}
          >
            {Math.round(sum * 10) / 10}%
            {!sumValid && <span className="ml-2 text-[11px] font-normal">{lt.tipAimFor100}</span>}
          </span>
        </div>
      )}
    </EditorAxisCard>
  );
}
