/* ═══════════════════════════════════════════════════════════════════
   PALETTE TEMPLATE — color palette + typography specimen

   Used by the Brand Palette slide. Left column: large hex swatches
   stacked vertically with HEX label and an editorial role caption.
   Right column: typography specimen (display + body specimen lines,
   font name, weight, tracking).

   All theme tokens still drive the chrome (eyebrow font, fg/bg, etc.)
   so the slide adapts to the active deck theme.
   ═══════════════════════════════════════════════════════════════════ */

import type { MicroBlockSlide, DeckMeta } from '@/lib/presentation/types';

export interface PaletteSlideData {
  caption?: string;
  /** Hex values + optional descriptive role (e.g. "Identity", "Ground"). */
  swatches?: { hex: string; role?: string }[];
  /** Typography spec — font display name + weight/tracking + a sample. */
  typography?: {
    displayName?: string;
    bodyName?: string;
    sample?: string;
    weight?: string;
    tracking?: string;
  };
}

interface Props {
  slide: MicroBlockSlide;
  meta: DeckMeta;
  title: string;
  data?: PaletteSlideData;
}

const FALLBACK_SWATCHES = [
  { hex: '#1a1a1a', role: 'Ink' },
  { hex: '#f5f1ea', role: 'Cream' },
  { hex: '#7d8a85', role: 'Sage' },
  { hex: '#c87459', role: 'Terracotta' },
];

export function PaletteTemplate({ slide, meta, title, data }: Props) {
  const swatches = (data?.swatches && data.swatches.length > 0 ? data.swatches : FALLBACK_SWATCHES).slice(0, 5);
  const typo = data?.typography;

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{
        background: 'var(--p-bg)',
        color: 'var(--p-fg)',
        padding: 'clamp(40px, 4.5vw, 72px)',
      }}
    >
      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
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
          <h2
            style={{
              fontFamily: 'var(--p-display-font)',
              textTransform: 'var(--p-display-case)' as const,
              fontWeight: 'var(--p-display-weight)',
              letterSpacing: 'var(--p-display-tracking)',
              fontSize: 'clamp(28px, 2.8vw, 44px)',
              lineHeight: 1.1,
              color: 'var(--p-fg)',
              margin: '12px 0 0 0',
            }}
          >
            {title}
          </h2>
        </div>
        {data?.caption && (
          <p
            style={{
              fontFamily: 'var(--p-body-font)',
              fontSize: '13px',
              maxWidth: '40%',
              lineHeight: 1.55,
              color: 'var(--p-mute)',
              letterSpacing: 'var(--p-body-tracking)',
              textAlign: 'right',
              margin: 0,
            }}
          >
            {data.caption}
          </p>
        )}
      </div>

      {/* Two-column body: palette LEFT, typography RIGHT */}
      <div className="flex-1 grid grid-cols-2 gap-10" style={{ minHeight: 0 }}>
        {/* Palette column — vertical stack of swatches with hex/role rail */}
        <div className="flex flex-col gap-3" style={{ minHeight: 0 }}>
          {swatches.map((sw, i) => (
            <div
              key={i}
              className="flex-1 relative overflow-hidden"
              style={{
                background: sw.hex,
                borderRadius: 'var(--p-radius)',
                border: '1px solid var(--p-border)',
                minHeight: 0,
              }}
            >
              <div className="absolute inset-0 flex items-end justify-between px-5 py-4">
                <span
                  style={{
                    fontFamily: 'var(--p-mono-font)',
                    fontSize: '11px',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: contrastFor(sw.hex),
                    textShadow: '0 1px 2px rgba(0,0,0,0.25)',
                  }}
                >
                  {sw.hex.toUpperCase()}
                </span>
                {sw.role && (
                  <span
                    style={{
                      fontFamily: 'var(--p-display-font)',
                      fontSize: 'clamp(16px, 1.5vw, 22px)',
                      fontWeight: 'var(--p-display-weight)',
                      letterSpacing: 'var(--p-display-tracking)',
                      color: contrastFor(sw.hex),
                      textShadow: '0 1px 2px rgba(0,0,0,0.25)',
                    }}
                  >
                    {sw.role}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Typography column — display spec on top, body sample below */}
        <div className="flex flex-col" style={{ minHeight: 0 }}>
          <div className="flex-1 flex flex-col justify-center gap-8" style={{ minHeight: 0 }}>
            {/* Display specimen (the big "Aa") */}
            <div>
              <span
                style={{
                  fontFamily: 'var(--p-mono-font)',
                  fontSize: '10px',
                  letterSpacing: '0.22em',
                  color: 'var(--p-mute)',
                  textTransform: 'uppercase',
                }}
              >
                Display
              </span>
              <div
                style={{
                  fontFamily: 'var(--p-display-font)',
                  textTransform: 'var(--p-display-case)' as const,
                  fontWeight: 'var(--p-display-weight)',
                  letterSpacing: 'var(--p-display-tracking)',
                  fontSize: 'clamp(120px, 14vw, 220px)',
                  lineHeight: 0.9,
                  color: 'var(--p-fg)',
                  marginTop: '4px',
                }}
              >
                Aa
              </div>
              {typo?.displayName && (
                <div
                  style={{
                    fontFamily: 'var(--p-mono-font)',
                    fontSize: '12px',
                    letterSpacing: '0.16em',
                    color: 'var(--p-mute)',
                    textTransform: 'uppercase',
                    marginTop: '4px',
                  }}
                >
                  {typo.displayName}
                  {typo.weight ? ` · ${typo.weight}` : ''}
                </div>
              )}
            </div>

            {/* Body specimen line */}
            <div>
              <span
                style={{
                  fontFamily: 'var(--p-mono-font)',
                  fontSize: '10px',
                  letterSpacing: '0.22em',
                  color: 'var(--p-mute)',
                  textTransform: 'uppercase',
                }}
              >
                Body
              </span>
              <p
                style={{
                  fontFamily: 'var(--p-body-font)',
                  fontSize: 'clamp(16px, 1.4vw, 22px)',
                  lineHeight: 1.5,
                  color: 'var(--p-fg)',
                  letterSpacing: 'var(--p-body-tracking)',
                  margin: '6px 0 0 0',
                }}
              >
                {typo?.sample ??
                  'The quick brown fox jumps over the lazy dog. Editorial paragraphs read here at 22px to show how body copy carries the brand voice.'}
              </p>
              {typo?.bodyName && (
                <div
                  style={{
                    fontFamily: 'var(--p-mono-font)',
                    fontSize: '11px',
                    letterSpacing: '0.16em',
                    color: 'var(--p-mute)',
                    textTransform: 'uppercase',
                    marginTop: '8px',
                  }}
                >
                  {typo.bodyName}
                  {typo.tracking ? ` · ${typo.tracking}` : ''}
                </div>
              )}
            </div>
          </div>

          {/* Bottom signature */}
          <div className="pt-4 mt-auto">
            <div
              style={{
                fontFamily: 'var(--p-mono-font)',
                fontSize: '10px',
                letterSpacing: '0.18em',
                color: 'var(--p-mute)',
                textTransform: 'uppercase',
              }}
            >
              {meta.collectionName}
              {meta.season ? ` · ${meta.season}` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function contrastFor(hex: string): string {
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.55 ? '#1a1a1a' : '#fafafa';
}
