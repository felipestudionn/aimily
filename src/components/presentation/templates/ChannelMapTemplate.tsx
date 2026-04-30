/* ═══════════════════════════════════════════════════════════════════
   CHANNEL MAP TEMPLATE — distribution and point of sale visualisation

   Replaces the empty Hero slide for Point of Sale with a structured
   channel architecture: web store status, DTC + Wholesale activation,
   priority markets list, and aggregated wholesale order count when
   present. Strictly editorial — no actual map rendering, just typed
   blocks with theme tokens.
   ═══════════════════════════════════════════════════════════════════ */

import type { MicroBlockSlide, DeckMeta } from '@/lib/presentation/types';
import type { ChannelMapSlideData } from '@/lib/presentation/load-presentation-data';

interface Props {
  slide: MicroBlockSlide;
  meta: DeckMeta;
  title: string;
  data?: ChannelMapSlideData;
}

export function ChannelMapTemplate({ slide, meta, title, data }: Props) {
  const ws = data?.webStore;
  const dtc = data?.dtc;
  const wholesale = data?.wholesale;
  const markets = data?.markets ?? [];

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{
        background: 'var(--p-bg)',
        color: 'var(--p-fg)',
        padding: 'clamp(48px, 5vw, 88px)',
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
              fontSize: 'clamp(36px, 3.5vw, 60px)',
              lineHeight: 1.05,
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

      {/* Three-block channel grid: Web Store · DTC · Wholesale */}
      <div className="grid grid-cols-3 gap-5 mb-10">
        <ChannelBlock
          eyebrow="Web store"
          status={ws?.status === 'live' ? 'Live' : 'Coming'}
          accent={ws?.status === 'live'}
          detail={ws?.provider ?? (ws?.status === 'live' ? 'Direct' : 'Phase 2')}
        />
        <ChannelBlock
          eyebrow="DTC"
          status={dtc?.enabled ? 'Active' : 'Off'}
          accent={!!dtc?.enabled}
          detail={
            dtc?.enabled
              ? [dtc.digital ? 'Digital' : '', dtc.physical ? 'Physical' : '']
                  .filter(Boolean)
                  .join(' + ')
              : '—'
          }
        />
        <ChannelBlock
          eyebrow="Wholesale"
          status={wholesale?.enabled ? `${wholesale.ordersCount} orders` : 'Off'}
          accent={!!wholesale?.enabled}
          detail={wholesale?.valueLabel ?? '—'}
        />
      </div>

      {/* Markets list — flex-1 fills remaining space */}
      <div className="flex-1 flex flex-col">
        <span
          style={{
            fontFamily: 'var(--p-mono-font)',
            fontSize: '11px',
            letterSpacing: '0.24em',
            color: 'var(--p-mute)',
            textTransform: 'uppercase',
            marginBottom: '20px',
          }}
        >
          Priority markets · {markets.length || '—'}
        </span>

        {markets.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            {markets.slice(0, 8).map((m, i) => (
              <div
                key={i}
                className="flex items-baseline justify-between pb-3"
                style={{ borderBottom: '1px solid var(--p-border)' }}
              >
                <div className="flex items-baseline gap-3 min-w-0">
                  <span
                    style={{
                      fontFamily: 'var(--p-mono-font)',
                      fontSize: '11px',
                      letterSpacing: '0.16em',
                      color: 'var(--p-mute)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--p-display-font)',
                      fontSize: 'clamp(18px, 1.6vw, 26px)',
                      fontWeight: 'var(--p-display-weight)',
                      letterSpacing: 'var(--p-display-tracking)',
                      color: 'var(--p-fg)',
                    }}
                  >
                    {m.name}
                  </span>
                  {m.region && (
                    <span
                      style={{
                        fontFamily: 'var(--p-body-font)',
                        fontSize: '12px',
                        color: 'var(--p-mute)',
                      }}
                    >
                      {m.region}
                    </span>
                  )}
                </div>
                {m.opportunity && (
                  <span
                    className="px-2.5 py-0.5"
                    style={{
                      fontFamily: 'var(--p-mono-font)',
                      fontSize: '9px',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: m.opportunity === 'high' ? 'var(--p-bg)' : 'var(--p-mute)',
                      background: m.opportunity === 'high' ? 'var(--p-accent)' : 'transparent',
                      border: m.opportunity === 'high' ? 'none' : '1px solid var(--p-border)',
                      borderRadius: 'var(--p-radius)',
                    }}
                  >
                    {m.opportunity}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p
            style={{
              fontFamily: 'var(--p-body-font)',
              fontSize: '13px',
              color: 'var(--p-mute)',
              letterSpacing: 'var(--p-body-tracking)',
              maxWidth: '60%',
            }}
          >
            Markets are still being mapped. Open Merchandising → Distribution to
            anchor priority territories.
          </p>
        )}

        {/* Bottom collection signature */}
        <div className="mt-auto pt-8">
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

function ChannelBlock({
  eyebrow,
  status,
  detail,
  accent,
}: {
  eyebrow: string;
  status: string;
  detail: string;
  accent: boolean;
}) {
  return (
    <div
      className="p-5 flex flex-col gap-3"
      style={{
        background: accent ? 'var(--p-surface)' : 'transparent',
        border: '1px solid var(--p-border)',
        borderRadius: 'var(--p-radius)',
        borderColor: accent ? 'var(--p-accent)' : 'var(--p-border)',
      }}
    >
      <div className="flex items-center justify-between">
        <span
          style={{
            fontFamily: 'var(--p-mono-font)',
            fontSize: '10px',
            letterSpacing: '0.22em',
            color: 'var(--p-mute)',
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </span>
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: accent ? 'var(--p-accent)' : 'var(--p-border)' }}
        />
      </div>
      <div
        style={{
          fontFamily: 'var(--p-display-font)',
          fontSize: 'clamp(22px, 2vw, 32px)',
          fontWeight: 'var(--p-display-weight)',
          letterSpacing: 'var(--p-display-tracking)',
          color: 'var(--p-fg)',
          lineHeight: 1,
        }}
      >
        {status}
      </div>
      <div
        style={{
          fontFamily: 'var(--p-body-font)',
          fontSize: '12px',
          color: 'var(--p-mute)',
          letterSpacing: 'var(--p-body-tracking)',
        }}
      >
        {detail}
      </div>
    </div>
  );
}
