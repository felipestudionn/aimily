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

import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Download, Loader2, Share2, Copy, Check } from 'lucide-react';
import { SPINE, SLIDE_COUNT } from '@/lib/presentation/spine';
import { getTheme, themeStyle } from '@/lib/presentation/themes';
import type { ThemeId, DeckMeta } from '@/lib/presentation/types';
import type { PresentationData } from '@/lib/presentation/load-presentation-data';
import { SlideRenderer } from './SlideRenderer';
import { ThemePicker } from './ThemePicker';

interface Props {
  meta: DeckMeta;
  /* Collection id — needed so the Download PDF button can call the
     server-side export endpoint. */
  collectionId: string;
  /* Map of titleKey → translated title (passed in from WizardSidebar
     so we don't double-load i18n inside this component). */
  titles: Record<string, string>;
  /* Cover slide subtitle — translated once by the parent so i18n
     stays out of this component. Presentation has one cover slide
     at index 0; SPINE mini-blocks start at index 1. */
  coverSubtitle: string;
  /* Slide-shaped CIS data; null while loading or on error. Templates
     fall back to editorial placeholders when the matching slide data
     isn't present. */
  data: PresentationData | null;
  /* Controlled index + theme — owned by WizardSidebar so the LEFT
     spine list and the RIGHT deck canvas stay in sync. index 0 is
     the cover; indices 1..SPINE.length map to SPINE[i-1]. */
  index: number;
  themeId: ThemeId;
  onIndexChange: (i: number) => void;
  onThemeChange: (id: ThemeId) => void;
  /* Called when the user hits Esc or clicks the X — parent flips out
     of presentation mode (mirrors the calendar exit pattern). */
  onExit: () => void;
  /* True when rendering inside a public /p/[token] share. Hides the
     X exit, the theme picker, and the Share button; PDF download
     stays enabled so viewers can save their own copy. */
  readOnly?: boolean;
}

/* Total slide count = 1 cover + SPINE mini-blocks. */
const TOTAL_SLIDES = SLIDE_COUNT + 1;

export function PresentationDeck({ meta, collectionId, titles, coverSubtitle, data, index, themeId, onIndexChange, onThemeChange, onExit, readOnly = false }: Props) {
  const theme = useMemo(() => getTheme(themeId), [themeId]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  /* Share modal state — only reachable in non-readOnly mode. */
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement | null>(null);

  /* Close Share dropdown on outside click + Esc (reuses the pattern
     from ThemePicker for consistency). */
  useEffect(() => {
    if (!shareOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!shareRef.current?.contains(e.target as Node)) setShareOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShareOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [shareOpen]);

  const createShare = useCallback(async () => {
    setShareLoading(true);
    setShareError(null);
    try {
      const res = await fetch('/api/presentation/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId, themeId, coverSubtitle }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed to create share (HTTP ${res.status})`);
      }
      const j = await res.json();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setShareUrl(`${origin}/p/${j.token}`);
    } catch (e) {
      setShareError(e instanceof Error ? e.message : 'Failed to create share');
    } finally {
      setShareLoading(false);
    }
  }, [collectionId, themeId, coverSubtitle]);

  const copyShareUrl = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* no-op */
    }
  }, [shareUrl]);

  const downloadPdf = useCallback(async () => {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch('/api/presentation/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId, themeId, coverSubtitle }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Export failed (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meta.collectionName.replace(/\s+/g, '-')}-presentation.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }, [collectionId, themeId, coverSubtitle, meta.collectionName]);
  /* Cover at index 0 has no mini-block slide context; SPINE starts at 1. */
  const slide = index === 0 ? null : SPINE[index - 1];
  const titleFor = useCallback((key: string) => titles[key] ?? key, [titles]);

  /* A slide is a PLACEHOLDER when it's showing editorial sample copy
     because its CIS slot hasn't been filled yet. Cover + hero templates
     always have real meta; EditorialStat isn't wired to CIS yet so it's
     always a placeholder; narrative / grid / timeline check their data map. */
  const isSlidePlaceholder = useMemo(() => {
    if (!slide) return false; // cover
    switch (slide.template) {
      case 'hero': return false;
      case 'cover': return false;
      case 'narrative-portrait': return !data?.narratives[slide.id];
      case 'grid-tile': return !(data?.grids[slide.id]?.tiles?.length);
      case 'timeline-strip': return !(data?.timelines[slide.id]?.milestones?.length);
      case 'editorial-stat': return true; // not wired yet
      default: return true;
    }
  }, [slide, data]);

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
        onIndexChange(Math.min(TOTAL_SLIDES - 1, index + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onIndexChange(Math.max(0, index - 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        onIndexChange(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        onIndexChange(TOTAL_SLIDES - 1);
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
        {readOnly ? (
          /* In a public share, the X has nowhere to exit to. Swap for
             an aimily wordmark that links back to the product page. */
          <a
            href="https://www.aimily.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] tracking-[0.24em] uppercase text-white/60 hover:text-white font-semibold transition-colors"
          >
            aimily
          </a>
        ) : (
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 transition-colors"
            title="Exit presentation (Esc)"
          >
            <X className="w-4 h-4 text-white" strokeWidth={1.8} />
          </button>
        )}

        <div className="flex items-center gap-3">
          {!readOnly && (
            <div ref={shareRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setShareOpen(o => !o);
                  if (!shareUrl && !shareLoading) createShare();
                }}
                className={`inline-flex items-center gap-2 pl-3 pr-4 py-2 rounded-full backdrop-blur-md text-[12px] font-semibold tracking-[-0.01em] border transition-colors ${
                  shareOpen
                    ? 'bg-white/20 border-white/30 text-white'
                    : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                }`}
                title="Create a public share link"
              >
                <Share2 className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Share</span>
              </button>
              {shareOpen && (
                <div className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-[16px] shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-carbon/[0.06] p-4 z-50">
                  <div className="text-[10px] tracking-[0.24em] uppercase text-carbon/55 font-semibold mb-2">
                    Share this presentation
                  </div>
                  <p className="text-[12px] text-carbon/60 leading-relaxed mb-3">
                    Anyone with this link will see the deck in the theme you have active now. They can page through slides and download the PDF.
                  </p>
                  {shareLoading && (
                    <div className="inline-flex items-center gap-2 text-[12px] text-carbon/60">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} /> Generating link…
                    </div>
                  )}
                  {shareError && (
                    <div className="text-[12px] text-error">{shareError}</div>
                  )}
                  {shareUrl && (
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={shareUrl}
                        className="flex-1 px-3 py-2 text-[12px] bg-carbon/[0.04] text-carbon rounded-[10px] border border-carbon/[0.08] font-mono"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <button
                        type="button"
                        onClick={copyShareUrl}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-semibold bg-carbon text-white hover:bg-carbon/90 transition-colors"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <Copy className="w-3.5 h-3.5" strokeWidth={2} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={downloadPdf}
            disabled={exporting}
            className="inline-flex items-center gap-2 pl-3 pr-4 py-2 rounded-full backdrop-blur-md text-[12px] font-semibold tracking-[-0.01em] border border-white/15 bg-white/10 hover:bg-white/15 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            title={exportError ?? 'Download PDF'}
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
            ) : (
              <Download className="w-3.5 h-3.5" strokeWidth={2} />
            )}
            <span>{exporting ? 'Generating…' : 'PDF'}</span>
          </button>
          {!readOnly && <ThemePicker current={theme} onChange={onThemeChange} />}
          {isSlidePlaceholder && (
            <div
              className="text-[10px] tracking-[0.24em] uppercase text-citronella/90 font-semibold px-3 py-1.5 rounded-full bg-citronella/10 border border-citronella/30"
              title="This slide shows sample content — fill the matching mini-block to personalise it."
            >
              Sample
            </div>
          )}
          <div className="text-[11px] tabular-nums text-white/55 font-semibold tracking-[0.08em] px-3 py-1.5 rounded-full bg-white/8 border border-white/10">
            {String(index + 1).padStart(2, '0')} / {String(TOTAL_SLIDES).padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* ── Slide canvas (16:9, letterboxed) ── */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-8 py-6">
        <div
          key={`${themeId}-${slide?.id ?? 'cover'}`}
          className="relative w-full max-w-[1600px] aspect-[16/9] shadow-[0_24px_80px_rgba(0,0,0,0.4)] overflow-hidden"
          style={{
            ...themeStyle(theme),
            borderRadius: 'var(--p-radius)',
          }}
        >
          <SlideRenderer
            slide={slide}
            meta={meta}
            title={slide ? titleFor(slide.titleKey) : (meta.brandName ?? meta.collectionName)}
            coverSubtitle={coverSubtitle}
            data={data}
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

        {/* Progress bar — cover tick (slot 0) + 20 mini-block ticks grouped
            by block, separated by hairline dividers. */}
        <div className="flex-1 flex items-center gap-1">
          {/* Cover tick */}
          <div className="flex items-center flex-1">
            <button
              type="button"
              onClick={() => onIndexChange(0)}
              className="group/tick flex-1 py-2"
              title="Cover"
            >
              <div
                className={`h-1 rounded-full transition-all ${
                  index === 0 ? 'bg-white' : 'bg-white/25 group-hover/tick:bg-white/55'
                }`}
              />
            </button>
          </div>
          {/* Divider between cover and block 1 */}
          <div className="w-2 h-px bg-white/15 mx-0.5 shrink-0" />

          {SPINE.map((s, i) => {
            const slotIdx = i + 1; // cover occupies slot 0
            const active = slotIdx === index;
            const past = slotIdx < index;
            const isFirstOfBlock = i === 0 || SPINE[i - 1].block !== s.block;
            return (
              <div key={s.id} className="flex items-center flex-1">
                {isFirstOfBlock && i > 0 && <div className="w-2 h-px bg-white/15 mx-0.5 shrink-0" />}
                <button
                  type="button"
                  onClick={() => onIndexChange(slotIdx)}
                  className="group/tick flex-1 py-2"
                  title={`${String(slotIdx + 1).padStart(2, '0')} · ${titleFor(s.titleKey)}`}
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
          onClick={() => onIndexChange(Math.min(TOTAL_SLIDES - 1, index + 1))}
          disabled={index === TOTAL_SLIDES - 1}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Next slide (→ or Space)"
        >
          <ChevronRight className="w-4 h-4 text-white" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
