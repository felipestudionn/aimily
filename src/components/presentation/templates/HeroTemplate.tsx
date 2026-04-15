/* ═══════════════════════════════════════════════════════════════════
   HERO TEMPLATE — block-opening monolith

   The 4 block-closing slides (creative-overview, collection-builder,
   final-selection, point-of-sale) use this. Big eyebrow + giant title
   + brand mark. Theme-driven typography and palette.
   ═══════════════════════════════════════════════════════════════════ */

import type { MicroBlockSlide, DeckMeta } from '@/lib/presentation/types';

interface Props {
  slide: MicroBlockSlide;
  meta: DeckMeta;
  title: string;
}

export function HeroTemplate({ slide, meta, title }: Props) {
  return (
    <div
      className="w-full h-full flex flex-col justify-between"
      style={{
        background: 'var(--p-bg)',
        color: 'var(--p-fg)',
        padding: 'clamp(48px, 6vw, 96px)',
      }}
    >
      {/* Top eyebrow */}
      <div className="flex items-center justify-between">
        <span
          style={{
            fontFamily: 'var(--p-mono-font)',
            fontSize: '11px',
            letterSpacing: '0.24em',
            color: 'var(--p-mute)',
            textTransform: 'uppercase',
          }}
        >
          {slide.eyebrow}
        </span>
        <span
          style={{
            fontFamily: 'var(--p-mono-font)',
            fontSize: '11px',
            letterSpacing: '0.24em',
            color: 'var(--p-mute)',
            textTransform: 'uppercase',
          }}
        >
          {meta.season ?? meta.collectionName}
        </span>
      </div>

      {/* Center: the giant title */}
      <div className="flex flex-col gap-6 max-w-[80%]">
        <h1
          style={{
            fontFamily: 'var(--p-display-font)',
            fontWeight: 'var(--p-display-weight)',
            letterSpacing: 'var(--p-display-tracking)',
            fontSize: 'clamp(72px, 9vw, 168px)',
            lineHeight: 0.95,
            color: 'var(--p-fg)',
            margin: 0,
          }}
          className={
            // letter case is theme-controlled but we apply it via CSS class
            // because CSS variables don't work on text-transform
            ''
          }
        >
          {title}
        </h1>
        <div
          style={{
            width: '120px',
            height: '2px',
            background: 'var(--p-accent)',
          }}
        />
      </div>

      {/* Bottom: collection signature */}
      <div className="flex items-end justify-between">
        <div
          style={{
            fontFamily: 'var(--p-body-font)',
            fontSize: '14px',
            color: 'var(--p-fg)',
            letterSpacing: 'var(--p-body-tracking)',
          }}
        >
          <div style={{ color: 'var(--p-mute)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '6px' }}>
            Collection
          </div>
          <div style={{ fontSize: '20px' }}>{meta.collectionName}</div>
        </div>
        <div
          style={{
            fontFamily: 'var(--p-mono-font)',
            fontSize: '11px',
            color: 'var(--p-mute)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          aimily
        </div>
      </div>
    </div>
  );
}
