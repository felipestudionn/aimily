/* ═══════════════════════════════════════════════════════════════════
   SCENARIO COMPARE TEMPLATE — three-column buying-strategy spread

   Used by the Buying Scenarios slide. Renders all 3 AI-generated
   scenarios side-by-side: name, description, families, SKU count,
   investment, target revenue, commercial role. The selected scenario
   gets a subtle accent border so the buyer knows which one was chosen.
   ═══════════════════════════════════════════════════════════════════ */

import type { MicroBlockSlide, DeckMeta } from '@/lib/presentation/types';

export interface ScenarioCompareSlideData {
  caption?: string;
  selectedId?: string;
  scenarios?: {
    id: string;
    name: string;
    description?: string;
    skuCount?: number;
    families?: { name: string; count: number }[];
    investment?: string;
    revenue?: string;
    margin?: string;
    role?: 'core' | 'seasonal' | 'statement' | 'versatile' | string;
  }[];
}

interface Props {
  slide: MicroBlockSlide;
  meta: DeckMeta;
  title: string;
  data?: ScenarioCompareSlideData;
}

export function ScenarioCompareTemplate({ slide, meta, title, data }: Props) {
  const scenarios = (data?.scenarios ?? []).slice(0, 3);
  const hasScenarios = scenarios.length > 0;

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

      {hasScenarios ? (
        <div className="flex-1 grid grid-cols-3 gap-5" style={{ minHeight: 0 }}>
          {scenarios.map((sc) => {
            const isSelected = sc.id === data?.selectedId;
            return (
              <div
                key={sc.id}
                className="flex flex-col p-6"
                style={{
                  background: isSelected ? 'var(--p-surface)' : 'transparent',
                  border: '1px solid var(--p-border)',
                  borderColor: isSelected ? 'var(--p-accent)' : 'var(--p-border)',
                  borderRadius: 'var(--p-radius)',
                  minHeight: 0,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    style={{
                      fontFamily: 'var(--p-mono-font)',
                      fontSize: '10px',
                      letterSpacing: '0.22em',
                      color: 'var(--p-mute)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {sc.role || 'Scenario'}
                  </span>
                  {isSelected && (
                    <span
                      className="px-2 py-0.5"
                      style={{
                        fontFamily: 'var(--p-mono-font)',
                        fontSize: '9px',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: 'var(--p-bg)',
                        background: 'var(--p-accent)',
                        borderRadius: 'var(--p-radius)',
                      }}
                    >
                      Selected
                    </span>
                  )}
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--p-display-font)',
                    fontWeight: 'var(--p-display-weight)',
                    letterSpacing: 'var(--p-display-tracking)',
                    fontSize: 'clamp(22px, 2vw, 30px)',
                    lineHeight: 1.1,
                    color: 'var(--p-fg)',
                    marginBottom: '12px',
                  }}
                >
                  {sc.name}
                </h3>
                {sc.description && (
                  <p
                    style={{
                      fontFamily: 'var(--p-body-font)',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      color: 'var(--p-mute)',
                      letterSpacing: 'var(--p-body-tracking)',
                      margin: 0,
                      marginBottom: '20px',
                    }}
                  >
                    {sc.description}
                  </p>
                )}

                {/* Numerical block */}
                <div className="mt-auto pt-4 space-y-3" style={{ borderTop: '1px solid var(--p-border)' }}>
                  {sc.skuCount !== undefined && <Row label="Styles" value={String(sc.skuCount)} />}
                  {sc.investment && <Row label="Investment" value={sc.investment} />}
                  {sc.revenue && <Row label="Y1 Target" value={sc.revenue} />}
                  {sc.margin && <Row label="Margin" value={sc.margin} />}
                </div>

                {/* Families pill row */}
                {sc.families && sc.families.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {sc.families.slice(0, 5).map((f, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5"
                        style={{
                          fontFamily: 'var(--p-mono-font)',
                          fontSize: '9px',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: 'var(--p-fg)',
                          background: 'var(--p-bg)',
                          border: '1px solid var(--p-border)',
                          borderRadius: 'var(--p-radius)',
                        }}
                      >
                        <strong style={{ fontWeight: 700, marginRight: '4px' }}>{f.count}</strong>
                        {f.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
              letterSpacing: '0.24em',
              color: 'var(--p-mute)',
              textTransform: 'uppercase',
            }}
          >
            Generate scenarios in Buying Strategy to populate this slide
          </span>
        </div>
      )}

      {/* Bottom signature */}
      <div className="pt-6">
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
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
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
          fontSize: 'clamp(15px, 1.4vw, 20px)',
          color: 'var(--p-fg)',
          letterSpacing: 'var(--p-display-tracking)',
        }}
      >
        {value}
      </span>
    </div>
  );
}
