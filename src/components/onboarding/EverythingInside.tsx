'use client';

/**
 * <EverythingInside />
 *
 * Editorial deck that explains the full aimily product to a brand-new user.
 * Five horizontally-paginated slides (carousel), navigated by arrows / dots
 * / keyboard / swipe:
 *
 *   1 — Block 01 · Creative Direction
 *   2 — Block 02 · Merchandising & Planning
 *   3 — Block 03 · Design & Development
 *   4 — Block 04 · Marketing & Sales
 *   5 — Closing: three modes + working style + final CTA
 *
 * Built as a standalone reusable surface so the same content can later live
 * in marketing pages, rich emails, or in-product re-tour panels.
 *
 * Two variants:
 *   - "dark"  → bg-carbon, crema text. /welcome onboarding.
 *   - "light" → bg-shade, carbon text. Marketing / in-product embeds.
 *
 * Content lives entirely in i18n (t.welcome.everything.*).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Dictionary } from '@/i18n/en';

type Variant = 'dark' | 'light';

interface Tokens {
  bg: string;
  fg: string;
  fgMuted: string;
  fgFaint: string;
  fgGhost: string;
  divider: string;
  arrowBg: string;
  arrowBgHover: string;
  ctaBg: string;
  ctaBgHover: string;
  ctaText: string;
}

const TOKENS: Record<Variant, Tokens> = {
  dark: {
    bg: 'bg-carbon',
    fg: 'text-crema',
    fgMuted: 'text-crema/65',
    fgFaint: 'text-crema/45',
    fgGhost: 'text-crema/30',
    divider: 'bg-crema/[0.12]',
    arrowBg: 'bg-crema/[0.06]',
    arrowBgHover: 'hover:bg-crema/[0.12]',
    ctaBg: 'bg-crema',
    ctaBgHover: 'hover:bg-crema/90',
    ctaText: 'text-carbon',
  },
  light: {
    bg: 'bg-shade',
    fg: 'text-carbon',
    fgMuted: 'text-carbon/70',
    fgFaint: 'text-carbon/50',
    fgGhost: 'text-carbon/30',
    divider: 'bg-carbon/[0.10]',
    arrowBg: 'bg-carbon/[0.04]',
    arrowBgHover: 'hover:bg-carbon/[0.10]',
    ctaBg: 'bg-carbon',
    ctaBgHover: 'hover:bg-carbon/90',
    ctaText: 'text-crema',
  },
};

interface Props {
  /** Translated welcome dict — pass `t.welcome` from useTranslation(). */
  t: Dictionary['welcome'];
  variant?: Variant;
  /** When true, renders the final CTA pill on the closing slide. */
  showCta?: boolean;
  onCta?: () => void;
  onSkip?: () => void;
  /** Optional callback fired whenever the active slide changes (0-indexed).
   *  Useful for syncing an external progress indicator (e.g. dots in the
   *  parent page header). */
  onSlideChange?: (index: number, total: number) => void;
  className?: string;
}

const SERIF: React.CSSProperties = { fontFamily: "Georgia, 'Times New Roman', serif" };

export function EverythingInside({
  t,
  variant = 'dark',
  showCta = false,
  onCta,
  onSkip,
  onSlideChange,
  className = '',
}: Props) {
  const tw = TOKENS[variant];
  const e = t.everything;

  const blocks = [e.blocks.one, e.blocks.two, e.blocks.three, e.blocks.four];
  const totalSlides = blocks.length + 1; // 4 blocks + closing slide
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(totalSlides - 1, i));
      setIndex(clamped);
    },
    [totalSlides],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // Notify parent when slide changes
  useEffect(() => {
    onSlideChange?.(index, totalSlides);
  }, [index, totalSlides, onSlideChange]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(ev: KeyboardEvent) {
      if (ev.key === 'ArrowRight') next();
      else if (ev.key === 'ArrowLeft') prev();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [next, prev]);

  // Touch swipe (mobile)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let startX = 0;
    let dx = 0;
    function onTouchStart(ev: TouchEvent) {
      startX = ev.touches[0].clientX;
      dx = 0;
    }
    function onTouchMove(ev: TouchEvent) {
      dx = ev.touches[0].clientX - startX;
    }
    function onTouchEnd() {
      const THRESHOLD = 60;
      if (dx < -THRESHOLD) next();
      else if (dx > THRESHOLD) prev();
    }
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [next, prev]);

  const isFirst = index === 0;
  const isLast = index === totalSlides - 1;

  return (
    <div
      ref={containerRef}
      className={`relative min-h-screen overflow-hidden ${tw.bg} ${tw.fg} ${className}`}
    >
      {/* Slides track — translateX shifts in viewport-width units. Each
          child below is `w-screen shrink-0`, so the track auto-sizes to
          `totalSlides * 100vw` and `translateX(-N * 100vw)` advances by
          exactly one viewport per step. */}
      <div
        className="flex transition-transform duration-[450ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-screen"
        style={{ transform: `translateX(-${index * 100}vw)` }}
      >
        {blocks.map((block, idx) => (
          <BlockSlide key={idx} block={block} tokens={tw} />
        ))}
        <ClosingSlide
          modes={e.modes}
          workingStyle={e.workingStyle}
          tokens={tw}
          variant={variant}
          showCta={showCta}
          ctaLabel={e.cta}
          skipLabel={e.skip}
          onCta={onCta}
          onSkip={onSkip}
        />
      </div>

      {/* Left arrow — hidden on first slide */}
      {!isFirst && (
        <button
          type="button"
          onClick={prev}
          aria-label="Previous"
          className={`absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full ${tw.arrowBg} ${tw.arrowBgHover} ${tw.fg} flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-20`}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>
      )}

      {/* Right arrow — hidden on last slide (CTA takes over) */}
      {!isLast && (
        <button
          type="button"
          onClick={next}
          aria-label="Next"
          className={`absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full ${tw.arrowBg} ${tw.arrowBgHover} ${tw.fg} flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-20`}
        >
          <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
        </button>
      )}

      {/* Dot indicators — bottom centered */}
      <div className="absolute bottom-8 md:bottom-10 left-0 right-0 flex items-center justify-center gap-2 z-20">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index
                ? variant === 'dark'
                  ? 'w-8 bg-crema'
                  : 'w-8 bg-carbon'
                : variant === 'dark'
                  ? 'w-1.5 bg-crema/25 hover:bg-crema/45'
                  : 'w-1.5 bg-carbon/25 hover:bg-carbon/45'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Block slide — eyebrow + serif title + bullet list, centered
   ───────────────────────────────────────────────────────────────── */

interface BlockSlideProps {
  block: {
    eyebrow: string;
    title: string;
    bullets: string[];
  };
  tokens: Tokens;
}

function BlockSlide({ block, tokens: tw }: BlockSlideProps) {
  return (
    <section className="w-screen shrink-0 min-h-screen flex items-center justify-center px-6 md:px-24 py-24">
      <div className="max-w-[760px] w-full">
        <p className={`text-[11px] md:text-[12px] font-semibold tracking-[0.22em] uppercase ${tw.fgFaint} mb-6`}>
          {block.eyebrow}
        </p>
        <h2
          className={`font-light tracking-[-0.025em] leading-[1.1] text-[36px] md:text-[52px] ${tw.fg} mb-12`}
          style={SERIF}
        >
          {block.title}
        </h2>
        <ul className="space-y-3.5">
          {block.bullets.map((bullet, j) => (
            <li
              key={j}
              className={`text-[15px] md:text-[17px] leading-[1.6] ${tw.fgMuted} pl-6 relative`}
            >
              <span className={`absolute left-0 top-[0.7em] h-px w-4 ${tw.divider}`} />
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Closing slide — three modes + working style + CTA
   ───────────────────────────────────────────────────────────────── */

interface ClosingSlideProps {
  modes: { eyebrow: string; items: { name: string; desc: string }[] };
  workingStyle: { eyebrow: string; items: { name: string; desc: string }[] };
  tokens: Tokens;
  variant: Variant;
  showCta: boolean;
  ctaLabel: string;
  skipLabel: string;
  onCta?: () => void;
  onSkip?: () => void;
}

function ClosingSlide({
  modes,
  workingStyle,
  tokens: tw,
  variant: _variant,
  showCta,
  ctaLabel,
  skipLabel,
  onCta,
  onSkip,
}: ClosingSlideProps) {
  return (
    <section className="w-screen shrink-0 min-h-screen flex items-center justify-center px-6 md:px-24 py-24">
      <div className="max-w-[1080px] w-full">
        {/* Three modes */}
        <div className="mb-16 md:mb-20">
          <p className={`text-[11px] md:text-[12px] font-semibold tracking-[0.22em] uppercase ${tw.fgFaint} mb-8`}>
            {modes.eyebrow}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
            {modes.items.map((mode, idx) => (
              <div key={idx}>
                <p
                  className={`font-light tracking-[-0.02em] leading-[1.1] text-[28px] md:text-[34px] ${tw.fg} mb-4`}
                  style={SERIF}
                >
                  {mode.name}
                </p>
                <p className={`text-[14px] md:text-[15px] leading-[1.65] ${tw.fgMuted}`}>
                  {mode.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className={`h-px w-16 ${tw.divider} mb-16 md:mb-20`} />

        {/* Three working styles */}
        <div className="mb-16 md:mb-20">
          <p className={`text-[11px] md:text-[12px] font-semibold tracking-[0.22em] uppercase ${tw.fgFaint} mb-8`}>
            {workingStyle.eyebrow}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
            {workingStyle.items.map((style, idx) => (
              <div key={idx}>
                <p
                  className={`font-light tracking-[-0.02em] leading-[1.1] text-[28px] md:text-[34px] ${tw.fg} mb-4`}
                  style={SERIF}
                >
                  {style.name}
                </p>
                <p className={`text-[14px] md:text-[15px] leading-[1.65] ${tw.fgMuted}`}>
                  {style.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {showCta && (
          <div className="flex flex-col items-center gap-5 mt-4">
            <button
              type="button"
              onClick={onCta}
              className={`inline-flex items-center justify-center px-9 py-4 rounded-full text-[14px] md:text-[15px] font-semibold tracking-[-0.01em] transition-all hover:scale-[1.02] active:scale-[0.99] ${tw.ctaBg} ${tw.ctaText} ${tw.ctaBgHover}`}
            >
              {ctaLabel} <span className="ml-2">→</span>
            </button>
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className={`text-[13px] ${tw.fgGhost} hover:${tw.fgFaint} transition-colors`}
              >
                {skipLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
