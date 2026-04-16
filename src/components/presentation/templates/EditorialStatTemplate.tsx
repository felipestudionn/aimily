/* ═══════════════════════════════════════════════════════════════════
   EDITORIAL STAT TEMPLATE — big KPI + narrative bridge

   For slides where one number tells the story: market research
   headlines, distribution mix, financial plan, sales dashboard.

   Layout: 2/3 giant stat hero on the left, 1/3 narrative +
   supporting stats on the right. Everything theme-tokenised.
   ═══════════════════════════════════════════════════════════════════ */

'use client';

import type { MicroBlockSlide, DeckMeta } from '@/lib/presentation/types';
import type { StatSlideData } from '@/lib/presentation/load-presentation-data';
import { useTranslation } from '@/i18n';
import { Construction } from 'lucide-react';

interface Props {
  slide: MicroBlockSlide;
  meta: DeckMeta;
  title: string;
  /* Real data shaped by load-presentation-data. When present, overrides
     the editorial placeholder. Populated today for financial-plan via
     computeFinancialPlan(); other stat slides (market-research,
     distribution, sales-dashboard) still fall back until wired. */
  data?: StatSlideData;
}

/* Placeholder copy per mini-block. F2 will replace via CIS. Keeping
   them editorial-plausible so the slide reads well even empty. */
const STAT_PLACEHOLDERS: Record<string, { value: string; caption: string; narrative: string; support: { value: string; label: string }[] }> = {
  'market-research': {
    value: '$47.2B',
    caption: 'Global streetwear market by 2028',
    narrative: 'Consumer appetite for limited-edition drops is accelerating — a 14% YoY growth outpacing traditional ready-to-wear.',
    support: [
      { value: '68%', label: 'Gen Z drop awareness' },
      { value: '2.4×', label: 'resale premium avg.' },
      { value: '142', label: 'competitor drops tracked' },
    ],
  },
  distribution: {
    value: '42 / 58',
    caption: 'Wholesale vs. DTC split',
    narrative: 'Balanced distribution with a slight lean toward direct — giving us margin headroom while keeping brand-builder retail partners.',
    support: [
      { value: '14', label: 'wholesale doors' },
      { value: '3', label: 'DTC channels' },
      { value: '7', label: 'priority markets' },
    ],
  },
  'financial-plan': {
    value: '62%',
    caption: 'Target gross margin',
    narrative: 'Healthy margin architecture: premium positioning absorbs cost inflation while leaving room for marketing spend at launch.',
    support: [
      { value: '€1.8M', label: 'total revenue target' },
      { value: '€680K', label: 'COGS budget' },
      { value: '€240K', label: 'marketing envelope' },
    ],
  },
  'sales-dashboard': {
    value: '84%',
    caption: 'Sell-through at week 6',
    narrative: 'Core drops outperforming forecast — momentum is strong enough to unlock the second shipment without markdown.',
    support: [
      { value: '€412K', label: 'revenue to date' },
      { value: '1,240', label: 'units sold' },
      { value: '4.1', label: 'avg. basket size' },
    ],
  },
};

const FALLBACK = {
  value: '—',
  caption: 'Key metric',
  narrative: 'Once this mini-block is complete, the headline number surfaces here alongside a short narrative bridge.',
  support: [
    { value: '—', label: 'Supporting metric' },
    { value: '—', label: 'Supporting metric' },
    { value: '—', label: 'Supporting metric' },
  ],
};

export function EditorialStatTemplate({ slide, meta, title, data: real }: Props) {
  const tr = useTranslation().presentation;

  /* Work-in-Progress mode: the loader knows there's a structural
     source for this slide but the data isn't populated yet. Render an
     explicit placeholder instead of editorial sample numbers. */
  const wip = real?.status === 'pending';

  /* Prefer real CIS-derived data. Fall back to editorial placeholder
     when the slide hasn't been composed yet (keeps the deck readable
     during demos with partial CIS coverage). */
  const data = real && !wip && (real.value || real.narrative)
    ? {
        value: real.value ?? '—',
        caption: real.caption ?? '',
        narrative: real.narrative ?? '',
        support: real.support ?? [],
      }
    : (STAT_PLACEHOLDERS[slide.id] ?? FALLBACK);

  /* ─── WIP rendering (dedicated layout) ────────────────────────── */
  if (wip) {
    // Localize the WIP body by slide.id; fall back to the generic
    // default when the slide doesn't have a dedicated message.
    const wipMessages: Record<string, string> = {
      'sales-dashboard': tr.wipSalesDashboard,
      'financial-plan': tr.wipFinancialPlan,
    };
    const pendingMessage = real?.pendingMessage ?? wipMessages[slide.id] ?? tr.wipDefault;
    return (
      <div
        className="w-full h-full flex flex-col"
        style={{
          background: 'var(--p-bg)',
          color: 'var(--p-fg)',
          padding: 'clamp(48px, 5vw, 88px)',
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
              fontSize: 'clamp(28px, 2.8vw, 42px)',
              lineHeight: 1.1,
              color: 'var(--p-fg)',
              margin: '16px 0 0 0',
            }}
          >
            {title}
          </h2>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6" style={{ minHeight: 0 }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--p-surface)',
              border: '1px solid var(--p-border)',
            }}
          >
            <Construction className="w-7 h-7" style={{ color: 'var(--p-accent)' }} strokeWidth={1.5} />
          </div>
          <div style={{ textAlign: 'center', maxWidth: '560px' }}>
            <div
              style={{
                fontFamily: 'var(--p-display-font)',
                textTransform: 'var(--p-display-case)' as const,
                fontWeight: 'var(--p-display-weight)',
                letterSpacing: 'var(--p-display-tracking)',
                fontSize: 'clamp(28px, 2.4vw, 36px)',
                lineHeight: 1.15,
                color: 'var(--p-fg)',
                marginBottom: '12px',
              }}
            >
              {tr.wipHeading}
            </div>
            <p
              style={{
                fontFamily: 'var(--p-body-font)',
                fontSize: 'clamp(14px, 1.1vw, 17px)',
                lineHeight: 1.55,
                color: 'var(--p-mute)',
                letterSpacing: 'var(--p-body-tracking)',
                margin: 0,
              }}
            >
              {pendingMessage}
            </p>
          </div>
        </div>

        <div
          style={{
            fontFamily: 'var(--p-body-font)',
            fontSize: '12px',
            color: 'var(--p-mute)',
            letterSpacing: 'var(--p-body-tracking)',
          }}
        >
          {meta.collectionName}{meta.season ? ` · ${meta.season}` : ''}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex"
      style={{
        background: 'var(--p-bg)',
        color: 'var(--p-fg)',
      }}
    >
      {/* LEFT 2/3 — giant stat hero */}
      <div
        className="flex-1 flex flex-col justify-between"
        style={{ padding: 'clamp(48px, 5vw, 88px)' }}
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
              fontSize: 'clamp(28px, 2.8vw, 42px)',
              lineHeight: 1.1,
              color: 'var(--p-fg)',
              margin: '16px 0 0 0',
            }}
          >
            {title}
          </h2>
        </div>

        <div>
          <div
            style={{
              fontFamily: 'var(--p-display-font)',
            textTransform: 'var(--p-display-case)' as const,
              fontWeight: 'var(--p-display-weight)',
              letterSpacing: 'var(--p-display-tracking)',
              fontSize: 'clamp(96px, 11vw, 200px)',
              lineHeight: 0.95,
              color: 'var(--p-accent)',
            }}
          >
            {data.value}
          </div>
          <div
            style={{
              width: '80px',
              height: '2px',
              background: 'var(--p-fg)',
              margin: '20px 0',
            }}
          />
          <p
            style={{
              fontFamily: 'var(--p-body-font)',
              fontSize: '18px',
              lineHeight: 1.45,
              color: 'var(--p-fg)',
              letterSpacing: 'var(--p-body-tracking)',
              maxWidth: '80%',
              margin: 0,
            }}
          >
            {data.caption}
          </p>
        </div>

        <div
          style={{
            fontFamily: 'var(--p-body-font)',
            fontSize: '12px',
            color: 'var(--p-mute)',
            letterSpacing: 'var(--p-body-tracking)',
          }}
        >
          {meta.collectionName}{meta.season ? ` · ${meta.season}` : ''}
        </div>
      </div>

      {/* RIGHT 1/3 — narrative bridge + support stats */}
      <div
        className="w-[38%] flex flex-col justify-between"
        style={{
          background: 'var(--p-surface)',
          padding: 'clamp(48px, 5vw, 72px)',
          borderLeft: '1px solid var(--p-border)',
        }}
      >
        <div>
          <span
            style={{
              fontFamily: 'var(--p-mono-font)',
              fontSize: '10px',
              letterSpacing: '0.24em',
              color: 'var(--p-mute)',
              textTransform: 'uppercase',
            }}
          >
            Context
          </span>
          <p
            style={{
              fontFamily: 'var(--p-body-font)',
              fontSize: 'clamp(14px, 1.1vw, 17px)',
              lineHeight: 1.55,
              color: 'var(--p-fg)',
              letterSpacing: 'var(--p-body-tracking)',
              margin: '12px 0 0 0',
            }}
          >
            {data.narrative}
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {data.support.map((s, i) => (
            <div key={i} className="flex items-baseline gap-4 pb-3" style={{ borderBottom: i < data.support.length - 1 ? '1px solid var(--p-border)' : 'none' }}>
              <div
                style={{
                  fontFamily: 'var(--p-display-font)',
            textTransform: 'var(--p-display-case)' as const,
                  fontWeight: 'var(--p-display-weight)',
                  fontSize: '28px',
                  letterSpacing: 'var(--p-display-tracking)',
                  color: 'var(--p-fg)',
                  minWidth: '80px',
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: 'var(--p-body-font)',
                  fontSize: '12px',
                  color: 'var(--p-mute)',
                  letterSpacing: 'var(--p-body-tracking)',
                  lineHeight: 1.35,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
