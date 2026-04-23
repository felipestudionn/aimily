/* ═══════════════════════════════════════════════════════════════════
   THEME PICKER — top-bar dropdown to swap deck theme live

   Compact pill that opens a panel of all 10 themes. Each option shows
   the theme name + archetype + a 3-color swatch. Themes flagged
   `preview` carry a subtle badge so users know F1 ships 6 polished
   ones and the rest land in F2/F3.

   The panel is rendered via FloatingPanel (portal + fixed) because
   the top-bar uses `overflow-x-auto`, which clips absolute children.
   ═══════════════════════════════════════════════════════════════════ */

'use client';

import { useState, useRef } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { THEMES } from '@/lib/presentation/themes';
import type { Theme, ThemeId } from '@/lib/presentation/types';
import { FloatingPanel } from './FloatingPanel';

interface Props {
  current: Theme;
  onChange: (id: ThemeId) => void;
}

export function ThemePicker({ current, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-2 pl-4 pr-3 py-2 rounded-full backdrop-blur-md text-[12px] font-semibold tracking-[-0.01em] border transition-colors ${
          open
            ? 'bg-white/20 border-white/30 text-white'
            : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
        }`}
      >
        <span className="text-white/55 uppercase tracking-[0.18em] text-[10px] font-semibold">Style</span>
        <span className="h-3 w-px bg-white/20" />
        <span className="truncate max-w-[160px]">{current.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2} />
      </button>

      <FloatingPanel
        anchorRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        width={420}
        className="bg-white rounded-[16px] shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-carbon/[0.06] p-2"
      >
        {THEMES.map((theme) => {
          const active = theme.id === current.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => { onChange(theme.id); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-[12px] text-left transition-colors ${
                active ? 'bg-carbon/[0.06]' : 'hover:bg-carbon/[0.04]'
              }`}
            >
              <div className="flex shrink-0 h-9 w-12 rounded-[6px] overflow-hidden border border-carbon/[0.08]">
                <div className="flex-1" style={{ background: theme.tokens.bg }} />
                <div className="flex-1" style={{ background: theme.tokens.fg }} />
                <div className="flex-1" style={{ background: theme.tokens.accent }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-carbon truncate">{theme.name}</span>
                  {theme.status === 'preview' && (
                    <span className="text-[9px] tracking-[0.18em] uppercase font-semibold px-1.5 py-0.5 rounded-full bg-carbon/[0.06] text-carbon/55">
                      Preview
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-carbon/50 leading-tight mt-0.5 truncate">{theme.archetype}</div>
              </div>
              {active && <Check className="w-4 h-4 text-carbon shrink-0" strokeWidth={2.5} />}
            </button>
          );
        })}
      </FloatingPanel>
    </>
  );
}
