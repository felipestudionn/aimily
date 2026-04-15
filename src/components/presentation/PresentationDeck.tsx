/* ═══════════════════════════════════════════════════════════════════
   PRESENTATION DECK — the Rubik's cube's third face

   Lives INSIDE the WizardSidebar's <aside> when mode === 'presentation'
   and the aside is expanded to 100vw. Mirrors the calendar's pattern:
   same DOM element morphs across the three modes.

   Layout (full viewport):
   - Top bar  : eyebrow (collection · season) | theme picker | slide N/M + close
   - Canvas   : centered 16:9 slide letterboxed against the deck bg
   - Bottom   : prev / next + thumbnail strip (TOC)

   Keyboard:
   - ArrowRight / Space → next slide
   - ArrowLeft           → previous slide
   - Home / End          → first / last slide
   - Esc                 → exit to nav mode
   ═══════════════════════════════════════════════════════════════════ */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { SPINE, SLIDE_COUNT } from '@/lib/presentation/spine';
import { THEMES, getTheme, themeStyle, DEFAULT_THEME_ID } from '@/lib/presentation/themes';
import type { ThemeId, DeckMeta } from '@/lib/presentation/types';
import { SlideRenderer } from './SlideRenderer';
import { ThemePicker } from './ThemePicker';

interface Props {
  meta: DeckMeta;
  /* Map of titleKey → translated title (passed in from WizardSidebar
     so we don't double-load i18n inside this component). */
  titles: Record<string, string>;
  /* Called when the user hits Esc or clicks the X — parent flips out
     of presentation mode (mirrors the calendar exit pattern). */
  onExit: () => void;
}

export function PresentationDeck({ meta, titles, onExit }: Props) {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [index, setIndex] = useState(0);

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
        setIndex(i => Math.min(SLIDE_COUNT - 1, i + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIndex(i => Math.max(0, i - 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setIndex(SLIDE_COUNT - 1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);

  return (
    <div
      className="w-full h-full flex flex-col rounded-[16px] overflow-hidden"
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
          <ThemePicker current={theme} onChange={setThemeId} />
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

      {/* ── Bottom nav + TOC strip ── */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-white/10 flex items-center gap-4">
        <button
          type="button"
          onClick={() => setIndex(i => Math.max(0, i - 1))}
          disabled={index === 0}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Previous slide (←)"
        >
          <ChevronLeft className="w-4 h-4 text-white" strokeWidth={2} />
        </button>

        {/* Thumbnail strip — one tick per slide, grouped by block */}
        <div className="flex-1 overflow-x-auto scrollbar-subtle">
          <div className="flex items-center gap-1 min-w-max">
            {SPINE.map((s, i) => {
              const active = i === index;
              const isFirstOfBlock = i === 0 || SPINE[i - 1].block !== s.block;
              return (
                <div key={s.id} className="flex items-center">
                  {isFirstOfBlock && i > 0 && <div className="w-3 h-px bg-white/15 mx-1" />}
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    className={`group/tick relative px-1 py-2 ${active ? '' : 'hover:opacity-100'}`}
                    title={`${String(i + 1).padStart(2, '0')} · ${titleFor(s.titleKey)}`}
                  >
                    <div
                      className={`h-1 rounded-full transition-all ${
                        active ? 'w-8 bg-white' : 'w-4 bg-white/25 group-hover/tick:bg-white/55'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIndex(i => Math.min(SLIDE_COUNT - 1, i + 1))}
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
