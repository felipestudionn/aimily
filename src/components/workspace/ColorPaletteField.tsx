'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';

export type ColorRole = 'primary' | 'secondary' | 'accent' | 'neutral';

export interface ColorEntry {
  hex: string;
  name: string;
  role: ColorRole;
}

interface Props {
  palette: ColorEntry[];
  onChange: (next: ColorEntry[]) => void;
  addLabel?: string;
}

const ROLE_ORDER: ColorRole[] = ['primary', 'secondary', 'accent', 'accent', 'neutral', 'neutral'];
const ROLE_LABELS: Record<ColorRole, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  neutral: 'Neutral',
};

function luminance(hex: string): number {
  const m = hex.replace('#', '').match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return 0.5;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function textClass(hex: string): string {
  return luminance(hex) > 0.62 ? 'text-black/80' : 'text-white';
}

function subTextClass(hex: string): string {
  return luminance(hex) > 0.62 ? 'text-black/45' : 'text-white/70';
}

function spanClass(role: ColorRole): string {
  if (role === 'primary' || role === 'secondary') return 'row-span-2';
  return 'row-span-1';
}

export function ColorPaletteField({ palette, onChange, addLabel = 'Add color' }: Props) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const updateEntry = (i: number, patch: Partial<ColorEntry>) => {
    const next = [...palette];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const removeEntry = (i: number) => {
    onChange(palette.filter((_, j) => j !== i));
    if (editingIdx === i) setEditingIdx(null);
  };

  const addEntry = () => {
    const nextRole = ROLE_ORDER[palette.length] || 'neutral';
    onChange([...palette, { hex: '#E5E5E5', name: '', role: nextRole }]);
  };

  const cycleRole = (i: number) => {
    const roles: ColorRole[] = ['primary', 'secondary', 'accent', 'neutral'];
    const current = palette[i].role;
    const idx = roles.indexOf(current);
    const next = roles[(idx + 1) % roles.length];
    updateEntry(i, { role: next });
  };

  return (
    <div className="grid grid-cols-2 gap-2 auto-rows-[72px] grid-flow-row-dense">
      {palette.map((c, i) => {
        const isEditing = editingIdx === i;
        const t = textClass(c.hex);
        const st = subTextClass(c.hex);
        return (
          <div
            key={i}
            className={`group relative rounded-[12px] overflow-hidden p-3 flex flex-col justify-between transition-transform hover:scale-[1.015] cursor-pointer ${spanClass(c.role)}`}
            style={{ backgroundColor: c.hex }}
            onClick={() => setEditingIdx(isEditing ? null : i)}
          >
            <div className="flex items-start justify-between gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cycleRole(i);
                }}
                className={`text-[9px] tracking-[0.1em] uppercase font-semibold ${st} hover:opacity-100 opacity-80`}
              >
                {ROLE_LABELS[c.role]}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeEntry(i);
                }}
                className={`opacity-0 group-hover:opacity-100 transition-opacity rounded-full w-5 h-5 flex items-center justify-center ${t} hover:bg-black/10`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>

            {isEditing ? (
              <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={c.name}
                  autoFocus
                  onChange={(e) => updateEntry(i, { name: e.target.value })}
                  onBlur={() => setEditingIdx(null)}
                  placeholder="Name"
                  className={`bg-transparent border-0 outline-none text-[14px] font-semibold tracking-[-0.02em] ${t} placeholder:opacity-40 w-full p-0`}
                />
                <label className="flex items-center gap-1.5 w-fit">
                  <input
                    type="color"
                    value={c.hex.startsWith('#') ? c.hex : `#${c.hex}`}
                    onChange={(e) => updateEntry(i, { hex: e.target.value.toUpperCase() })}
                    className="w-4 h-4 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={c.hex}
                    onChange={(e) => updateEntry(i, { hex: e.target.value.toUpperCase() })}
                    onClick={(e) => e.stopPropagation()}
                    className={`bg-transparent border-0 outline-none text-[10px] tracking-[0.02em] font-mono ${st} w-20 p-0`}
                  />
                </label>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                <div className={`text-[14px] font-semibold tracking-[-0.02em] leading-tight ${t}`}>
                  {c.name || ' '}
                </div>
                <div className={`text-[10px] tracking-[0.02em] font-mono ${st}`}>
                  {c.hex.toUpperCase()}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addEntry}
        className="rounded-[12px] border border-dashed border-carbon/15 text-carbon/25 hover:border-carbon/35 hover:text-carbon/60 transition-colors flex items-center justify-center gap-1.5 text-[11px] font-medium"
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </button>
    </div>
  );
}

/** Parse legacy colors string[] (e.g. ["#C6D1D9", "#F1F1F1 (Light Grey)"]) into palette */
export function migrateColorsToPalette(colors: string[]): ColorEntry[] {
  return colors.map((raw, i) => {
    const str = raw.trim();
    const hexMatch = str.match(/#?([A-Fa-f0-9]{6})/);
    const nameMatch = str.match(/\(([^)]+)\)/);
    const hex = hexMatch ? `#${hexMatch[1].toUpperCase()}` : '#E5E5E5';
    const name = nameMatch ? nameMatch[1] : '';
    const role: ColorRole = ROLE_ORDER[i] || 'neutral';
    return { hex, name, role };
  });
}

/** Convert palette back to legacy colors string[] for AI pipeline compatibility */
export function paletteToLegacyColors(palette: ColorEntry[]): string[] {
  return palette.map((c) => (c.name ? `${c.hex} (${c.name})` : c.hex));
}

/** Hook to keep data.colors and data.colorPalette synced */
export function usePaletteSync(
  data: Record<string, unknown>,
  onChange: (d: Record<string, unknown>) => void,
): { palette: ColorEntry[]; setPalette: (p: ColorEntry[]) => void } {
  const rawPalette = (data.colorPalette as ColorEntry[] | undefined) || null;
  const rawColors = (data.colors as string[] | undefined) || [];

  const palette = useMemo<ColorEntry[]>(() => {
    if (rawPalette && rawPalette.length > 0) return rawPalette;
    if (rawColors.length > 0) return migrateColorsToPalette(rawColors);
    return [];
  }, [rawPalette, rawColors]);

  // Migrate on first render if needed (persist once)
  useEffect(() => {
    if (!rawPalette && rawColors.length > 0) {
      const migrated = migrateColorsToPalette(rawColors);
      onChange({ ...data, colorPalette: migrated });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPalette = (p: ColorEntry[]) => {
    onChange({ ...data, colorPalette: p, colors: paletteToLegacyColors(p) });
  };

  return { palette, setPalette };
}
