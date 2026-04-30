/* ═══════════════════════════════════════════════════════════════════
   RANGE WALL TEMPLATE — magazine-spread photo wall of the full collection

   Replaces the empty Hero slides at block boundaries (Collection Builder,
   Final Selection) with a dense visual: 8-12 SKU thumbnails arranged as
   a magazine wall with aggregated stats in the corner.

   Layout: full-bleed photo grid (4×3 or 3×3 depending on item count) on
   the left 70%, narrative + stats column on the right 30%. Scales the
   thumbnail aspect to keep the wall edge-to-edge.
   ═══════════════════════════════════════════════════════════════════ */

import type { MicroBlockSlide, DeckMeta } from '@/lib/presentation/types';
import type { RangeWallSlideData } from '@/lib/presentation/load-presentation-data';

interface Props {
  slide: MicroBlockSlide;
  meta: DeckMeta;
  title: string;
  data?: RangeWallSlideData;
}

export function RangeWallTemplate({ slide, meta, title, data }: Props) {
  const items = data?.items ?? [];
  const hasItems = items.length > 0;
  const stats = data?.stats;

  // Adaptive grid: 1-4 → 2x2, 5-6 → 3x2, 7-9 → 3x3, 10-12 → 4x3.
  const layoutCls =
    items.length <= 4
      ? 'grid grid-cols-2 grid-rows-2 gap-2'
      : items.length <= 6
        ? 'grid grid-cols-3 grid-rows-2 gap-2'
        : items.length <= 9
          ? 'grid grid-cols-3 grid-rows-3 gap-2'
          : 'grid grid-cols-4 grid-rows-3 gap-2';
  const totalCells =
    items.length <= 4 ? 4 : items.length <= 6 ? 6 : items.length <= 9 ? 9 : 12;

  return (
    <div
      className="w-full h-full flex"
      style={{ background: 'var(--p-bg)', color: 'var(--p-fg)' }}
    >
      {/* LEFT — photo wall */}
      <div
        className="relative flex flex-col"
        style={{
          width: '70%',
          padding: 'clamp(24px, 2.5vw, 40px)',
          background: 'var(--p-surface)',
          borderRight: '1px solid var(--p-border)',
        }}
      >
        {hasItems ? (
          <div className={layoutCls} style={{ flex: '1 1 0', minHeight: 0 }}>
            {Array.from({ length: totalCells }).map((_, i) => {
              const item = items[i];
              return (
                <div
                  key={i}
                  className="relative overflow-hidden"
                  style={{
                    background: 'var(--p-bg)',
                    border: '1px solid var(--p-border)',
                    borderRadius: 'var(--p-radius)',
                    minHeight: 0,
                    minWidth: 0,
                  }}
                >
                  {item?.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.name ?? ''}
                      loading="lazy"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        background: 'var(--p-bg)',
                        display: 'block',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Fallback: empty wall message — shouldn't happen if loader
             guards on items.length > 0, but renders gracefully anyway. */
          <div
            className="flex-1 flex items-center justify-center"
            style={{
              border: '1px dashed var(--p-border)',
              borderRadius: 'var(--p-radius)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--p-mono-font)',
                fontSize: '11px',
                letterSpacing: '0.24em',
                color: 'var(--p-mute)',
                textTransform: 'uppercase',
              }}
            >
              No SKUs added yet
            </span>
          </div>
        )}
      </div>

      {/* RIGHT — title + caption + stats column */}
      <div
        className="flex flex-col justify-between"
        style={{
          width: '30%',
          padding: 'clamp(32px, 3.5vw, 56px)',
        }}
      >
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
          {data?.caption && (
            <p
              style={{
                fontFamily: 'var(--p-body-font)',
                fontSize: '13px',
                lineHeight: 1.55,
                color: 'var(--p-mute)',
                letterSpacing: 'var(--p-body-tracking)',
                marginTop: '20px',
                maxWidth: '95%',
              }}
            >
              {data.caption}
            </p>
          )}
        </div>

        {/* Stats block — appears bottom-right when present */}
        {stats && (
          <div className="space-y-3 pt-6">
            <StatRow label="Styles" value={String(stats.total).padStart(2, '0')} />
            <StatRow label="Families" value={String(stats.families)} />
            {stats.drops !== undefined && (
              <StatRow label="Drops" value={String(stats.drops)} />
            )}
            {stats.revenue && (
              <StatRow label="Target revenue" value={stats.revenue} />
            )}
            <div
              style={{
                width: '60px',
                height: '2px',
                background: 'var(--p-accent)',
                marginTop: '8px',
              }}
            />
          </div>
        )}

        {/* Bottom signature */}
        <div className="pt-4">
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
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        style={{
          fontFamily: 'var(--p-mono-font)',
          fontSize: '10px',
          letterSpacing: '0.18em',
          color: 'var(--p-mute)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--p-display-font)',
          fontWeight: 'var(--p-display-weight)',
          fontSize: 'clamp(18px, 1.6vw, 26px)',
          color: 'var(--p-fg)',
          letterSpacing: 'var(--p-display-tracking)',
        }}
      >
        {value}
      </span>
    </div>
  );
}
