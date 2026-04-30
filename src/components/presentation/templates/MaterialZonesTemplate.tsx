/* ═══════════════════════════════════════════════════════════════════
   MATERIAL ZONES TEMPLATE — sketch + zone-by-zone material breakdown

   Used by the Material Zones slide. Left: large sketch / 3D render of
   the lead SKU. Right: a structured material BOM split by zone with
   hex chip per zone color, material name, and supplier when known.
   Reads from the SKU's colorways[].zones + material_zones structure.
   ═══════════════════════════════════════════════════════════════════ */

import type { MicroBlockSlide, DeckMeta } from '@/lib/presentation/types';

export interface MaterialZonesSlideData {
  caption?: string;
  sketchUrl?: string;
  productName?: string;
  family?: string;
  rows?: {
    zone: string;
    hex?: string;
    material?: string;
    supplier?: string;
  }[];
}

interface Props {
  slide: MicroBlockSlide;
  meta: DeckMeta;
  title: string;
  data?: MaterialZonesSlideData;
}

export function MaterialZonesTemplate({ slide, meta, title, data }: Props) {
  const rows = (data?.rows ?? []).slice(0, 9);
  const hasRows = rows.length > 0;

  return (
    <div
      className="w-full h-full flex"
      style={{ background: 'var(--p-bg)', color: 'var(--p-fg)' }}
    >
      {/* LEFT — sketch / render hero */}
      <div
        className="relative flex flex-col"
        style={{
          width: '55%',
          padding: 'clamp(40px, 4vw, 64px)',
          background: 'var(--p-surface)',
          borderRight: '1px solid var(--p-border)',
        }}
      >
        <div className="flex-1 relative" style={{ minHeight: 0 }}>
          {data?.sketchUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.sketchUrl}
              alt={data.productName ?? slide.id}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                background: 'var(--p-bg)',
              }}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                border: '1px dashed var(--p-border)',
                borderRadius: 'var(--p-radius)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--p-mono-font)',
                  fontSize: '10px',
                  letterSpacing: '0.24em',
                  color: 'var(--p-mute)',
                  textTransform: 'uppercase',
                }}
              >
                Add a sketch in Design & Development
              </span>
            </div>
          )}
        </div>
        {(data?.productName || data?.family) && (
          <div className="pt-5 mt-4">
            <span
              style={{
                fontFamily: 'var(--p-mono-font)',
                fontSize: '10px',
                letterSpacing: '0.22em',
                color: 'var(--p-mute)',
                textTransform: 'uppercase',
              }}
            >
              {data.family ?? 'Lead style'}
            </span>
            <div
              style={{
                fontFamily: 'var(--p-display-font)',
                fontSize: 'clamp(20px, 1.8vw, 28px)',
                fontWeight: 'var(--p-display-weight)',
                letterSpacing: 'var(--p-display-tracking)',
                color: 'var(--p-fg)',
                marginTop: '4px',
              }}
            >
              {data.productName ?? '—'}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT — title + zone table */}
      <div
        className="flex flex-col"
        style={{ width: '45%', padding: 'clamp(40px, 4.5vw, 72px)' }}
      >
        <div className="mb-8">
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
              fontSize: 'clamp(28px, 2.6vw, 40px)',
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
                marginTop: '12px',
              }}
            >
              {data.caption}
            </p>
          )}
        </div>

        {/* Zone rows */}
        {hasRows ? (
          <div className="flex-1 flex flex-col gap-3" style={{ minHeight: 0, overflow: 'hidden' }}>
            {rows.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-4 pb-3"
                style={{ borderBottom: '1px solid var(--p-border)' }}
              >
                {/* hex chip — falls back to surface tint when no color set */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    flex: '0 0 40px',
                    borderRadius: 'var(--p-radius)',
                    background: r.hex || 'var(--p-surface)',
                    border: '1px solid var(--p-border)',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      style={{
                        fontFamily: 'var(--p-display-font)',
                        fontSize: 'clamp(15px, 1.3vw, 18px)',
                        fontWeight: 'var(--p-display-weight)',
                        letterSpacing: 'var(--p-display-tracking)',
                        color: 'var(--p-fg)',
                      }}
                    >
                      {r.zone}
                    </span>
                    {r.hex && (
                      <span
                        style={{
                          fontFamily: 'var(--p-mono-font)',
                          fontSize: '10px',
                          letterSpacing: '0.16em',
                          color: 'var(--p-mute)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {r.hex.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between gap-3 mt-1">
                    <span
                      style={{
                        fontFamily: 'var(--p-body-font)',
                        fontSize: '13px',
                        color: 'var(--p-fg)',
                        letterSpacing: 'var(--p-body-tracking)',
                      }}
                    >
                      {r.material || '—'}
                    </span>
                    {r.supplier && (
                      <span
                        style={{
                          fontFamily: 'var(--p-mono-font)',
                          fontSize: '10px',
                          letterSpacing: '0.12em',
                          color: 'var(--p-mute)',
                        }}
                      >
                        {r.supplier}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
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
                letterSpacing: '0.22em',
                color: 'var(--p-mute)',
                textTransform: 'uppercase',
              }}
            >
              Define material zones to populate this slide
            </span>
          </div>
        )}

        {/* Bottom signature */}
        <div className="pt-6 mt-4">
          <span
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
          </span>
        </div>
      </div>
    </div>
  );
}
