/* ═══════════════════════════════════════════════════════════════════
   GRID TILE TEMPLATE — multi-tile content

   For slides that show a collection of entities: moodboard, assortment
   & pricing, sketch & color, content studio. Contact-sheet / lookbook
   index aesthetic.

   Layout: title header + 6-tile grid (3 columns × 2 rows). Each tile
   carries a visual slot + 2-line label. Theme-tokenised throughout.
   ═══════════════════════════════════════════════════════════════════ */

import type { MicroBlockSlide, DeckMeta } from '@/lib/presentation/types';

interface Props {
  slide: MicroBlockSlide;
  meta: DeckMeta;
  title: string;
}

interface Tile {
  eyebrow: string;
  label: string;
  value?: string;
}

const GRID_PLACEHOLDERS: Record<string, { tiles: Tile[]; caption: string }> = {
  moodboard: {
    caption: 'Six anchors framing the collection\'s visual voice.',
    tiles: [
      { eyebrow: 'Texture', label: 'Raw Canvas', value: '01' },
      { eyebrow: 'Form', label: 'Split-Toe Low-Top', value: '02' },
      { eyebrow: 'Color', label: 'Oxidized Ivory', value: '03' },
      { eyebrow: 'Atmosphere', label: 'Atelier Floor', value: '04' },
      { eyebrow: 'Motion', label: 'Static Portrait', value: '05' },
      { eyebrow: 'Era', label: '2004 · Antwerp', value: '06' },
    ],
  },
  'assortment-pricing': {
    caption: 'Four product families carrying the range.',
    tiles: [
      { eyebrow: 'Family A', label: 'Sneakers', value: '€340' },
      { eyebrow: 'Family B', label: 'Loafers', value: '€420' },
      { eyebrow: 'Family C', label: 'Boots', value: '€510' },
      { eyebrow: 'Family D', label: 'Sandals', value: '€280' },
      { eyebrow: 'Accessories', label: 'Bags', value: '€190' },
      { eyebrow: 'Accessories', label: 'Small Leather', value: '€80' },
    ],
  },
  'sketch-color': {
    caption: 'Opening round of sketches and colorway decisions.',
    tiles: [
      { eyebrow: 'SKU 01', label: 'Split-Toe · Ivory', value: 'R1' },
      { eyebrow: 'SKU 02', label: 'Split-Toe · Black', value: 'R1' },
      { eyebrow: 'SKU 03', label: 'Loafer · Brown', value: 'R1' },
      { eyebrow: 'SKU 04', label: 'Loafer · Black', value: 'R1' },
      { eyebrow: 'SKU 05', label: 'Boot · Ivory', value: 'R2' },
      { eyebrow: 'SKU 06', label: 'Boot · Black', value: 'R2' },
    ],
  },
  'content-studio': {
    caption: 'Six content pillars feeding every channel.',
    tiles: [
      { eyebrow: 'Editorial', label: 'Still Life', value: '24' },
      { eyebrow: 'Editorial', label: 'On-Model', value: '18' },
      { eyebrow: 'Campaign', label: 'Hero Film', value: '2' },
      { eyebrow: 'Social', label: 'Reels', value: '12' },
      { eyebrow: 'Social', label: 'Stories', value: '36' },
      { eyebrow: 'Email', label: 'Drops', value: '8' },
    ],
  },
};

const FALLBACK = {
  caption: 'Tiles populate from the Collection Intelligence System once this mini-block is filled.',
  tiles: Array.from({ length: 6 }, (_, i) => ({
    eyebrow: `Slot ${String(i + 1).padStart(2, '0')}`,
    label: '—',
    value: '',
  })),
};

export function GridTileTemplate({ slide, meta, title }: Props) {
  const data = GRID_PLACEHOLDERS[slide.id] ?? FALLBACK;

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{
        background: 'var(--p-bg)',
        color: 'var(--p-fg)',
        padding: 'clamp(40px, 4.5vw, 72px)',
      }}
    >
      {/* Header row */}
      <div className="flex items-end justify-between mb-8">
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
        <p
          style={{
            fontFamily: 'var(--p-body-font)',
            fontSize: '13px',
            color: 'var(--p-mute)',
            letterSpacing: 'var(--p-body-tracking)',
            maxWidth: '40%',
            textAlign: 'right',
            lineHeight: 1.45,
            margin: 0,
          }}
        >
          {data.caption}
        </p>
      </div>

      {/* 3×2 tile grid */}
      <div className="flex-1 grid grid-cols-3 gap-4">
        {data.tiles.map((tile, i) => (
          <div
            key={i}
            className="flex flex-col justify-between relative overflow-hidden"
            style={{
              background: 'var(--p-surface)',
              border: '1px solid var(--p-border)',
              borderRadius: 'var(--p-radius)',
              padding: 'clamp(16px, 1.6vw, 24px)',
            }}
          >
            {/* Visual slot — dashed inset so templates scan as placeholders,
                not as missing content. Vanishes in F2 when images land. */}
            <div
              className="absolute inset-4 flex items-center justify-center pointer-events-none"
              style={{
                opacity: 0.35,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--p-mono-font)',
                  fontSize: '28px',
                  fontWeight: 600,
                  color: 'var(--p-mute)',
                  letterSpacing: '-0.02em',
                }}
              >
                {tile.value}
              </div>
            </div>

            <div className="relative">
              <span
                style={{
                  fontFamily: 'var(--p-mono-font)',
                  fontSize: '10px',
                  letterSpacing: '0.24em',
                  color: 'var(--p-mute)',
                  textTransform: 'uppercase',
                }}
              >
                {tile.eyebrow}
              </span>
            </div>

            <div className="relative">
              <div
                style={{
                  fontFamily: 'var(--p-display-font)',
                  fontWeight: 'var(--p-display-weight)',
                  fontSize: 'clamp(16px, 1.4vw, 22px)',
                  letterSpacing: 'var(--p-display-tracking)',
                  lineHeight: 1.2,
                  color: 'var(--p-fg)',
                }}
              >
                {tile.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between">
        <span
          style={{
            fontFamily: 'var(--p-mono-font)',
            fontSize: '11px',
            letterSpacing: '0.18em',
            color: 'var(--p-mute)',
            textTransform: 'uppercase',
          }}
        >
          {meta.collectionName}{meta.season ? ` · ${meta.season}` : ''}
        </span>
        <span
          style={{
            fontFamily: 'var(--p-mono-font)',
            fontSize: '11px',
            letterSpacing: '0.18em',
            color: 'var(--p-mute)',
            textTransform: 'uppercase',
          }}
        >
          06 tiles
        </span>
      </div>
    </div>
  );
}
