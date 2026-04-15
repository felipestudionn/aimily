/* ═══════════════════════════════════════════════════════════════════
   PRESENTATION DECK — the Rubik's cube's third face (RIGHT column)

   Lives INSIDE the WizardSidebar's expanded <aside> alongside a
   persistent spine sidebar on the LEFT. Symmetric to calendar:
   - Calendar = sticky sidebar | timeline canvas
   - Presentation = sticky sidebar | slide canvas
   The sidebar drives slide navigation + mode switching; the deck
   only owns the canvas, top bar (theme picker, exit), and prev/next.

   Controlled props: index + themeId are owned by WizardSidebar so
   the LEFT spine list and the RIGHT canvas stay in sync.

   Keyboard:
   - ArrowRight / Space → next slide
   - ArrowLeft           → previous slide
   - Home / End          → first / last slide
   - Esc                 → exit to nav mode
   ═══════════════════════════════════════════════════════════════════ */

'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { SPINE, SLIDE_COUNT } from '@/lib/presentation/spine';
import { getTheme, themeStyle } from '@/lib/presentation/themes';
import type { ThemeId, DeckMeta } from '@/lib/presentation/types';
import { SlideRenderer } from './SlideRenderer';
import { ThemePicker } from './ThemePicker';

interface Props {
  meta: DeckMeta;
  /* Map of titleKey → translated title (passed in from WizardSidebar
     so we don't double-load i18n inside this component). */
  titles: Record<string, string>;
  /* Controlled index + theme — owned by WizardSidebar so the LEFT
     spine list and the RIGHT deck canvas stay in sync. */
  index: number;
  themeId: ThemeId;
  onIndexChange: (i: number) => void;
  onThemeChange: (id: ThemeId) => void;
  /* Called when the user hits Esc or clicks the X — parent flips out
     of presentation mode (mirrors the calendar exit pattern). */
  onExit: () => void;
}

export function PresentationDeck({ meta, titles, index, themeId, onIndexChange, onThemeChange, onExit }: Props) {
  const theme = useMemo(() => getTheme(themeId), [themeId]);
  const slide = SPINE[index];
  const titleFor = useCallback((key: string) => titles[key] ?? key, [titles]);

  /* Keyboard nav */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      /* Ignore when typing in inputs/textareas (theme picker dropdown
         button is fine — it doesn't take focus on space). */
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        onIndexChange(Math.min(SLIDE_COUNT - 1, index + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onIndexChange(Math.max(0, index - 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        onIndexChange(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        onIndexChange(SLIDE_COUNT - 1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit, onIndexChange, index]);

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ background: '#0A0A0A', color: '#FFFFFF' }}
    >
      {/* ── Top bar ── */}
      <div className="flex-shrink-0 h-[64px] flex items-center justify-between px-6 border-b border-white/10">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 transition-colors"
            title="Exit presentation (Esc)"
          >
            <X className="w-4 h-4 text-white" strokeWidth={1.8} />
          </button>
          <div className="hidden md:flex flex-col leading-tight">
            <span className="text-[10px] tracking-[0.24em] uppercase text-white/55 font-semibold">
              Presentation
            </span>
            <span className="text-[13px] font-semibold text-white truncate max-w-[280px]">
              {meta.collectionName}{meta.season ? ` · ${meta.season}` : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemePicker current={theme} onChange={onThemeChange} />
          <div className="text-[11px] tabular-nums text-white/55 font-semibold tracking-[0.08em] px-3 py-1.5 rounded-full bg-white/8 border border-white/10">
            {String(index + 1).padStart(2, '0')} / {String(SLIDE_COUNT).padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* ── Slide canvas (16:9, letterboxed) ── */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-8 py-6">
        <div
          key={`${themeId}-${slide.id}`}
          className="relative w-full max-w-[1600px] aspect-[16/9] shadow-[0_24px_80px_rgba(0,0,0,0.4)] overflow-hidden"
          style={{
            ...themeStyle(theme),
            borderRadius: 'var(--p-radius)',
          }}
        >
          <SlideRenderer
            slide={slide}
            meta={meta}
            title={titleFor(slide.titleKey)}
          />
        </div>
      </div>

      {/* ── Bottom: simple prev/next + thin progress (slide nav is on
            the LEFT spine column, so no thumbnail strip here). ── */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-white/10 flex items-center gap-4">
        <button
          type="button"
          onClick={() => onIndexChange(Math.max(0, index - 1))}
          disabled={index === 0}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Previous slide (←)"
        >
          <ChevronLeft className="w-4 h-4 text-white" strokeWidth={2} />
        </button>

        {/* Progress bar — 20 segments grouped by block */}
        <div className="flex-1 flex items-center gap-1">
          {SPINE.map((s, i) => {
            const active = i === index;
            const past = i < index;
            const isFirstOfBlock = i === 0 || SPINE[i - 1].block !== s.block;
            return (
              <div key={s.id} className="flex items-center flex-1">
                {isFirstOfBlock && i > 0 && <div className="w-2 h-px bg-white/15 mx-0.5 shrink-0" />}
                <button
                  type="button"
                  onClick={() => onIndexChange(i)}
                  className="group/tick flex-1 py-2"
                  title={`${String(i + 1).padStart(2, '0')} · ${titleFor(s.titleKey)}`}
                >
                  <div
                    className={`h-1 rounded-full transition-all ${
                      active ? 'bg-white' : past ? 'bg-white/55' : 'bg-white/15 group-hover/tick:bg-white/40'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onIndexChange(Math.min(SLIDE_COUNT - 1, index + 1))}
          disabled={index === SLIDE_COUNT - 1}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Next slide (→ or Space)"
        >
          <ChevronRight className="w-4 h-4 text-white" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
