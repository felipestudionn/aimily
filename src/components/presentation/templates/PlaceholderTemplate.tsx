/* ═══════════════════════════════════════════════════════════════════
   PLACEHOLDER TEMPLATE — used until the per-mini-block design lands

   Theme-styled skeleton so the deck still looks coherent end-to-end
   while we ship F1 → F2 (auto-filled content from CIS) → F3 (per
   template polish).
   ═══════════════════════════════════════════════════════════════════ */

import type { MicroBlockSlide, DeckMeta, TemplateId } from '@/lib/presentation/types';

interface Props {
  slide: MicroBlockSlide;
  meta: DeckMeta;
  title: string;
}

const TEMPLATE_DESCRIPTIONS: Record<TemplateId, string> = {
  'cover':                'Collection cover (slide 0)',
  'hero':                 'Block-opening monolith',
  'editorial-stat':       'Big KPI + narrative bridge',
  'narrative-portrait':   'Story-driven — image + paragraph',
  'grid-tile':            'Multi-tile (SKUs, looks, drops)',
  'timeline-strip':       'Horizontal milestone timeline',
  'placeholder':          'Skeleton pending design pass',
};

export function PlaceholderTemplate({ slide, meta, title }: Props) {
  return (
    <div
      className="w-full h-full flex flex-col"
      style={{
        background: 'var(--p-bg)',
        color: 'var(--p-fg)',
        padding: 'clamp(48px, 6vw, 96px)',
      }}
    >
      {/* Eyebrow row */}
      <div className="flex items-center justify-between mb-12">
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
          {String(slide.microIndex).padStart(2, '0')} / 05
        </span>
      </div>

      {/* Title block */}
      <div className="mb-16 max-w-[78%]">
        <h1
          style={{
            fontFamily: 'var(--p-display-font)',
            textTransform: 'var(--p-display-case)' as const,
            fontWeight: 'var(--p-display-weight)',
            letterSpacing: 'var(--p-display-tracking)',
            fontSize: 'clamp(56px, 6.5vw, 112px)',
            lineHeight: 1.0,
            color: 'var(--p-fg)',
            margin: 0,
          }}
        >
          {title}
        </h1>
        <div
          style={{
            width: '80px',
            height: '2px',
            background: 'var(--p-accent)',
            marginTop: '24px',
          }}
        />
      </div>

      {/* Skeleton content frame */}
      <div className="flex-1 grid grid-cols-12 gap-6">
        <div
          className="col-span-7 flex items-center justify-center"
          style={{
            background: 'var(--p-surface)',
            border: '1px solid var(--p-border)',
            borderRadius: 'var(--p-radius)',
            minHeight: '0',
          }}
        >
          <div className="text-center px-12">
            <div
              style={{
                fontFamily: 'var(--p-mono-font)',
                fontSize: '11px',
                letterSpacing: '0.24em',
                color: 'var(--p-mute)',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              Template · {slide.template}
            </div>
            <div
              style={{
                fontFamily: 'var(--p-body-font)',
                fontSize: '15px',
                color: 'var(--p-mute)',
                letterSpacing: 'var(--p-body-tracking)',
              }}
            >
              {TEMPLATE_DESCRIPTIONS[slide.template]}
            </div>
          </div>
        </div>

        <div className="col-span-5 flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-1 px-6 py-5 flex flex-col justify-between"
              style={{
                background: 'var(--p-surface)',
                border: '1px solid var(--p-border)',
                borderRadius: 'var(--p-radius)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--p-mono-font)',
                  fontSize: '10px',
                  letterSpacing: '0.24em',
                  color: 'var(--p-mute)',
                  textTransform: 'uppercase',
                }}
              >
                Slot {i}
              </div>
              <div
                style={{
                  fontFamily: 'var(--p-display-font)',
            textTransform: 'var(--p-display-case)' as const,
                  fontWeight: 'var(--p-display-weight)',
                  fontSize: '32px',
                  letterSpacing: 'var(--p-display-tracking)',
                  color: 'var(--p-fg)',
                }}
              >
                —
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-end justify-between mt-12">
        <div
          style={{
            fontFamily: 'var(--p-body-font)',
            fontSize: '13px',
            color: 'var(--p-mute)',
            letterSpacing: 'var(--p-body-tracking)',
          }}
        >
          {meta.collectionName} · {meta.season ?? '—'}
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
