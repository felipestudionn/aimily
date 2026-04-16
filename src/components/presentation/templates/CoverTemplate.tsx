/* ═══════════════════════════════════════════════════════════════════
   COVER TEMPLATE — the brand-hero opener

   Slide 0 of every Presentation deck. Receives DeckMeta (no slide
   context) because a cover isn't tied to a mini-block — it's the
   collection's front cover.

   Layout: aimily wordmark top-left, season top-right, brand name as
   monumental hero center-left, launch date bottom-left, "Collection"
   eyebrow bottom-right. Everything theme-tokenised.
   ═══════════════════════════════════════════════════════════════════ */

'use client';

import type { DeckMeta } from '@/lib/presentation/types';
import { useTranslation } from '@/i18n';

interface Props {
  meta: DeckMeta;
  /* Translated label to render below the brand name (e.g. "A collection
     presentation" / "Una presentación de colección"). Keeps i18n in
     the sidebar where the rest of the titles live. */
  subtitle: string;
}

function formatLaunchDate(d: string | null | undefined): string | null {
  if (!d) return null;
  try {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return d;
  }
}

export function CoverTemplate({ meta, subtitle }: Props) {
  const tr = useTranslation().presentation;
  const launch = formatLaunchDate(meta.launchDate);

  return (
    <div
      className="w-full h-full flex flex-col justify-between"
      style={{
        background: 'var(--p-bg)',
        color: 'var(--p-fg)',
        padding: 'clamp(56px, 6vw, 96px)',
      }}
    >
      {/* Top row: aimily wordmark · season */}
      <div className="flex items-start justify-between">
        <span
          style={{
            fontFamily: 'var(--p-mono-font)',
            fontSize: '14px',
            letterSpacing: '0.24em',
            color: 'var(--p-mute)',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          aimily
        </span>
        {meta.season && (
          <span
            style={{
              fontFamily: 'var(--p-mono-font)',
              fontSize: '14px',
              letterSpacing: '0.24em',
              color: 'var(--p-mute)',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            {meta.season}
          </span>
        )}
      </div>

      {/* Hero: monumental brand name */}
      <div className="flex flex-col gap-8">
        <h1
          style={{
            fontFamily: 'var(--p-display-font)',
            textTransform: 'var(--p-display-case)' as const,
            fontWeight: 'var(--p-display-weight)',
            letterSpacing: 'var(--p-display-tracking)',
            fontSize: 'clamp(96px, 12vw, 224px)',
            lineHeight: 0.9,
            color: 'var(--p-fg)',
            margin: 0,
          }}
        >
          {meta.brandName ?? meta.collectionName}
        </h1>
        <div
          style={{
            width: '140px',
            height: '3px',
            background: 'var(--p-accent)',
          }}
        />
        <p
          style={{
            fontFamily: 'var(--p-body-font)',
            fontSize: 'clamp(16px, 1.3vw, 20px)',
            lineHeight: 1.4,
            color: 'var(--p-fg)',
            letterSpacing: 'var(--p-body-tracking)',
            margin: 0,
            maxWidth: '60%',
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* Bottom row: launch date · Collection meta */}
      <div className="flex items-end justify-between">
        {launch ? (
          <div>
            <div
              style={{
                fontFamily: 'var(--p-mono-font)',
                fontSize: '10px',
                letterSpacing: '0.28em',
                color: 'var(--p-mute)',
                textTransform: 'uppercase',
                fontWeight: 600,
                marginBottom: '6px',
              }}
            >
              {tr.tplLaunching}
            </div>
            <div
              style={{
                fontFamily: 'var(--p-display-font)',
            textTransform: 'var(--p-display-case)' as const,
                fontWeight: 'var(--p-display-weight)',
                fontSize: '22px',
                letterSpacing: 'var(--p-display-tracking)',
                color: 'var(--p-fg)',
              }}
            >
              {launch}
            </div>
          </div>
        ) : <div />}

        <div className="text-right">
          <div
            style={{
              fontFamily: 'var(--p-mono-font)',
              fontSize: '10px',
              letterSpacing: '0.28em',
              color: 'var(--p-mute)',
              textTransform: 'uppercase',
              fontWeight: 600,
              marginBottom: '6px',
            }}
          >
            {tr.tplCollection}
          </div>
          <div
            style={{
              fontFamily: 'var(--p-display-font)',
            textTransform: 'var(--p-display-case)' as const,
              fontWeight: 'var(--p-display-weight)',
              fontSize: '22px',
              letterSpacing: 'var(--p-display-tracking)',
              color: 'var(--p-fg)',
            }}
          >
            {meta.collectionName}
          </div>
        </div>
      </div>
    </div>
  );
}
