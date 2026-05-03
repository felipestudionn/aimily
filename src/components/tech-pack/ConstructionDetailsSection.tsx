'use client';

/**
 * Phase 6 — Construction Details section.
 *
 * Structured replacement for the parts of factory_notes that are too
 * critical to leave free-form: stitching specs, pressing instructions,
 * finishing edges, and the hand-feel target. Free-form factory_notes
 * stays for everything else.
 *
 * Shape (mirrors migration 038 jsonb default):
 *   {
 *     stitching:  [{ seam, type, spi, thread_color, thread_weight }],
 *     pressing:   [{ area, temp, time, instructions }],
 *     finishing:  [{ edge, treatment }],
 *     hand_feel_target: string
 *   }
 */

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';

interface StitchingRow {
  seam: string;
  type: string;
  spi: string;            // stitches per inch — kept as string for free-text "8-10"
  thread_color: string;
  thread_weight: string;
}
interface PressingRow {
  area: string;
  temp: string;           // °C as text, factory readable
  time: string;
  instructions: string;
}
interface FinishingRow {
  edge: string;
  treatment: string;
}

export interface ConstructionDetails {
  stitching?: StitchingRow[];
  pressing?: PressingRow[];
  finishing?: FinishingRow[];
  hand_feel_target?: string;
}

interface Props {
  initial: ConstructionDetails | undefined;
  onChange: (next: ConstructionDetails) => void;
  saving?: boolean;
}

const EMPTY_STITCH: StitchingRow = { seam: '', type: '', spi: '', thread_color: '', thread_weight: '' };
const EMPTY_PRESS: PressingRow = { area: '', temp: '', time: '', instructions: '' };
const EMPTY_FINISH: FinishingRow = { edge: '', treatment: '' };

export function ConstructionDetailsSection({ initial, onChange, saving }: Props) {
  const [stitching, setStitching] = useState<StitchingRow[]>(initial?.stitching ?? []);
  const [pressing, setPressing] = useState<PressingRow[]>(initial?.pressing ?? []);
  const [finishing, setFinishing] = useState<FinishingRow[]>(initial?.finishing ?? []);
  const [handFeel, setHandFeel] = useState(initial?.hand_feel_target ?? '');
  const [touched, setTouched] = useState(false);

  // Push debounced changes upward.
  useEffect(() => {
    if (!touched) return;
    const id = setTimeout(() => {
      onChange({
        stitching: stitching.filter((r) => Object.values(r).some((v) => v.trim() !== '')),
        pressing: pressing.filter((r) => Object.values(r).some((v) => v.trim() !== '')),
        finishing: finishing.filter((r) => Object.values(r).some((v) => v.trim() !== '')),
        hand_feel_target: handFeel || undefined,
      });
    }, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stitching, pressing, finishing, handFeel, touched]);

  function update<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, idx: number, field: keyof T, value: string) {
    setter((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
    setTouched(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-carbon/45">Construction Details</h2>
        {saving && <span className="text-[11px] text-carbon/40">Saving…</span>}
      </div>

      {/* Stitching */}
      <div>
        <p className="text-[12px] font-semibold text-carbon mb-2">Stitching</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.1em] text-carbon/40">
                <th className="text-left pb-2 font-semibold">Seam</th>
                <th className="text-left pb-2 font-semibold">Type</th>
                <th className="text-left pb-2 font-semibold">SPI</th>
                <th className="text-left pb-2 font-semibold">Thread color</th>
                <th className="text-left pb-2 font-semibold">Weight</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {stitching.map((row, i) => (
                <tr key={i} className="border-t border-carbon/[0.05]">
                  {(['seam', 'type', 'spi', 'thread_color', 'thread_weight'] as const).map((k) => (
                    <td key={k} className="py-1.5 pr-2">
                      <input
                        value={row[k]}
                        onChange={(e) => update(setStitching, i, k, e.target.value)}
                        className="w-full px-2 py-1.5 rounded-[8px] bg-white border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none text-[12px]"
                      />
                    </td>
                  ))}
                  <td>
                    <button
                      type="button"
                      onClick={() => {
                        setStitching((r) => r.filter((_, j) => j !== i));
                        setTouched(true);
                      }}
                      className="p-1 rounded-full text-carbon/40 hover:text-red-500"
                      aria-label="Remove row"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() => {
            setStitching((r) => [...r, { ...EMPTY_STITCH }]);
            setTouched(true);
          }}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-carbon/60 hover:text-carbon"
        >
          <Plus className="h-3 w-3" /> Add seam
        </button>
      </div>

      {/* Pressing */}
      <div>
        <p className="text-[12px] font-semibold text-carbon mb-2">Pressing</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.1em] text-carbon/40">
                <th className="text-left pb-2 font-semibold">Area</th>
                <th className="text-left pb-2 font-semibold">Temp (°C)</th>
                <th className="text-left pb-2 font-semibold">Time</th>
                <th className="text-left pb-2 font-semibold">Instructions</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pressing.map((row, i) => (
                <tr key={i} className="border-t border-carbon/[0.05]">
                  {(['area', 'temp', 'time', 'instructions'] as const).map((k) => (
                    <td key={k} className="py-1.5 pr-2">
                      <input
                        value={row[k]}
                        onChange={(e) => update(setPressing, i, k, e.target.value)}
                        className="w-full px-2 py-1.5 rounded-[8px] bg-white border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none text-[12px]"
                      />
                    </td>
                  ))}
                  <td>
                    <button
                      type="button"
                      onClick={() => {
                        setPressing((r) => r.filter((_, j) => j !== i));
                        setTouched(true);
                      }}
                      className="p-1 rounded-full text-carbon/40 hover:text-red-500"
                      aria-label="Remove row"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() => {
            setPressing((r) => [...r, { ...EMPTY_PRESS }]);
            setTouched(true);
          }}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-carbon/60 hover:text-carbon"
        >
          <Plus className="h-3 w-3" /> Add area
        </button>
      </div>

      {/* Finishing */}
      <div>
        <p className="text-[12px] font-semibold text-carbon mb-2">Finishing</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.1em] text-carbon/40">
                <th className="text-left pb-2 font-semibold">Edge</th>
                <th className="text-left pb-2 font-semibold">Treatment</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {finishing.map((row, i) => (
                <tr key={i} className="border-t border-carbon/[0.05]">
                  {(['edge', 'treatment'] as const).map((k) => (
                    <td key={k} className="py-1.5 pr-2">
                      <input
                        value={row[k]}
                        onChange={(e) => update(setFinishing, i, k, e.target.value)}
                        className="w-full px-2 py-1.5 rounded-[8px] bg-white border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none text-[12px]"
                      />
                    </td>
                  ))}
                  <td>
                    <button
                      type="button"
                      onClick={() => {
                        setFinishing((r) => r.filter((_, j) => j !== i));
                        setTouched(true);
                      }}
                      className="p-1 rounded-full text-carbon/40 hover:text-red-500"
                      aria-label="Remove row"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() => {
            setFinishing((r) => [...r, { ...EMPTY_FINISH }]);
            setTouched(true);
          }}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-carbon/60 hover:text-carbon"
        >
          <Plus className="h-3 w-3" /> Add edge
        </button>
      </div>

      {/* Hand-feel target */}
      <div>
        <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/45 mb-2">
          Hand-feel target
        </label>
        <input
          value={handFeel}
          onChange={(e) => {
            setHandFeel(e.target.value);
            setTouched(true);
          }}
          placeholder="e.g. Soft drape, slight crisp at the seams"
          className="w-full px-3 py-2.5 rounded-[10px] bg-white border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none text-[13px]"
        />
      </div>
    </div>
  );
}
