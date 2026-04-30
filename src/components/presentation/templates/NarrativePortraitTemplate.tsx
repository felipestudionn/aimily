/* ═══════════════════════════════════════════════════════════════════
   NARRATIVE PORTRAIT TEMPLATE — story-driven slide

   For slides that tell a story in one paragraph + one image: consumer
   definition, brand identity, tech pack, communications, buying
   strategy. Magazine-feature spread layout.

   Layout: 50/50 split — full-bleed image panel LEFT, editorial type
   RIGHT. All typography and palette theme-tokenised.
   ═══════════════════════════════════════════════════════════════════ */

import type { MicroBlockSlide, DeckMeta } from '@/lib/presentation/types';
import type { NarrativeSlideData } from '@/lib/presentation/load-presentation-data';
import { EditableText } from '../EditableText';
import type { EditingContext } from '../SlideRenderer';

interface Props {
  slide: MicroBlockSlide;
  meta: DeckMeta;
  title: string;
  /* Real CIS data for this slide. When present, its fields override
     the editorial placeholders below. */
  data?: NarrativeSlideData;
  /* When defined, the slide is in edit mode — lead + body become
     click-to-edit via EditableText. */
  editing?: EditingContext;
}

/* Empty-state attribution per slide — purely the slide category, not a
   fabricated quote. Used when the user hasn't typed anything yet. */
const EMPTY_ATTRIBUTION: Record<string, string> = {
  consumer: 'Consumer profile',
  'brand-identity': 'Brand DNA',
  'brand-logo': 'Logo',
  'brand-voice': 'Voice & tone',
  'buying-strategy': 'Buying strategy',
  'tech-pack': 'Tech pack',
  communications: 'Communications',
};

export function NarrativePortraitTemplate({ slide, meta, title, data: cisData, editing }: Props) {
  /* Drafts (live editor) → committed CIS/override → empty.
     We DO NOT fabricate a lead/body when the user hasn't recorded one;
     instead the slide renders an explicit empty-state placeholder. */
  const lead = editing?.drafts.lead ?? cisData?.lead ?? '';
  const body = editing?.drafts.body ?? cisData?.body ?? '';
  const attribution = cisData?.attribution ?? EMPTY_ATTRIBUTION[slide.id] ?? '';
  const data = { lead, body, attribution };
  const hasNarrative = !!(lead || body);
  const isLeadOverride = !!editing?.slideOverrides.lead;
  const isBodyOverride = !!editing?.slideOverrides.body;

  return (
    <div
      className="w-full h-full flex"
      style={{ background: 'var(--p-bg)', color: 'var(--p-fg)' }}
    >
      {/* LEFT — visual panel. Renders one of three modes:
            • Photo mode (default): cisData.images[] painted as a hero or
              2-4 mosaic. Used by consumer / buying-strategy / tech-pack /
              communications when real assets exist.
            • Palette mode: paletteHex[] swatch grid. Used by brand-identity
              when the user has saved palette colors but no logo image.
            • Placeholder: theme-tinted frame (legacy fallback).
          We always overlay the attribution at the bottom. */}
      <div
        className="w-1/2 relative flex flex-col justify-between"
        style={{
          background: 'var(--p-surface)',
          borderRight: '1px solid var(--p-border)',
        }}
      >
        <NarrativeVisual
          slideId={slide.id}
          images={cisData?.images}
          imageMode={cisData?.imageMode}
          paletteHex={cisData?.paletteHex}
          caption={cisData?.imageCaption}
        />
        {/* Attribution is anchored bottom-left over a soft gradient so it
            stays legible whether the panel is a photo or a fallback. */}
        <div
          className="absolute bottom-0 left-0 right-0 px-8 py-5 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0))',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--p-mono-font)',
              fontSize: '10px',
              letterSpacing: '0.24em',
              color: cisData?.images?.length ? '#fff' : 'var(--p-mute)',
              textTransform: 'uppercase',
              textShadow: cisData?.images?.length
                ? '0 1px 2px rgba(0,0,0,0.4)'
                : 'none',
            }}
          >
            {data.attribution}
          </span>
        </div>
      </div>

      {/* RIGHT — editorial type */}
      <div
        className="w-1/2 flex flex-col justify-between"
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
          {hasNarrative ? (
          <>
          <EditableText
            as="p"
            value={data.lead}
            editMode={!!editing?.editMode}
            isOverride={isLeadOverride}
            onDraftChange={(v) => editing?.onDraftChange('lead', v)}
            onRevert={() => editing?.onRevert('lead')}
            style={{
              fontFamily: 'var(--p-display-font)',
              textTransform: 'var(--p-display-case)' as const,
              fontWeight: 'var(--p-display-weight)',
              letterSpacing: 'var(--p-display-tracking)',
              fontSize: 'clamp(28px, 2.6vw, 44px)',
              lineHeight: 1.15,
              color: 'var(--p-fg)',
              margin: 0,
              maxWidth: '95%',
            }}
          >
            {data.lead}
          </EditableText>
          <div
            style={{
              width: '60px',
              height: '2px',
              background: 'var(--p-accent)',
              margin: '24px 0',
            }}
          />
          <EditableText
            as="p"
            value={data.body ?? ''}
            editMode={!!editing?.editMode}
            isOverride={isBodyOverride}
            onDraftChange={(v) => editing?.onDraftChange('body', v)}
            onRevert={() => editing?.onRevert('body')}
            style={{
              fontFamily: 'var(--p-body-font)',
              fontSize: 'clamp(14px, 1.1vw, 17px)',
              lineHeight: 1.55,
              color: 'var(--p-fg)',
              letterSpacing: 'var(--p-body-tracking)',
              margin: 0,
              maxWidth: '95%',
            }}
          >
            {data.body}
          </EditableText>
          </>
          ) : (
            /* Empty state — no narrative saved. We surface where the
               user should go to fill it in, but render no fabricated
               text in either lead or body. The right pane is left
               quiet on purpose. */
            <div className="space-y-3">
              <p
                style={{
                  fontFamily: 'var(--p-mono-font)',
                  fontSize: '10px',
                  letterSpacing: '0.24em',
                  color: 'var(--p-mute)',
                  textTransform: 'uppercase',
                }}
              >
                Awaiting your text
              </p>
              <p
                style={{
                  fontFamily: 'var(--p-body-font)',
                  fontSize: 'clamp(14px, 1.1vw, 17px)',
                  lineHeight: 1.55,
                  color: 'var(--p-mute)',
                  letterSpacing: 'var(--p-body-tracking)',
                  margin: 0,
                  maxWidth: '95%',
                }}
              >
                {emptyHintFor(slide.id)}
              </p>
            </div>
          )}
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
          {meta.collectionName}{meta.season ? ` · ${meta.season}` : ''}
        </div>
      </div>
    </div>
  );
}

/* Per-slide empty hint pointing the user to the right Workspace block.
   No marketing copy, just a literal where-to-go. */
function emptyHintFor(slideId: string): string {
  switch (slideId) {
    case 'consumer':
      return 'Open Creative · Consumer Definition to populate this slide.';
    case 'brand-identity':
      return 'Open Creative · Brand Identity to populate this slide.';
    case 'brand-logo':
      return 'Upload a logo in Creative · Brand Identity to populate this slide.';
    case 'brand-voice':
      return 'Open Creative · Brand Identity → Voice & Tone to populate this slide.';
    case 'tech-pack':
      return 'Open Design & Development · Tech Pack to populate this slide.';
    case 'buying-strategy':
      return 'Open Merchandising · Buying Strategy to populate this slide.';
    case 'communications':
      return 'Open Marketing · Communications to populate this slide.';
    default:
      return 'Open the corresponding workspace block to populate this slide.';
  }
}

/* ─── Visual panel — three modes ──────────────────────────────────────
   1) photo (default when images[]): hero or 2-4 mosaic, full-bleed.
   2) palette: hex swatch grid for brand-identity when no logo.
   3) placeholder: theme-tinted frame (legacy fallback).
   The component is intentionally local — it depends on slide-side
   styling tokens that the rest of the template owns. */
function NarrativeVisual({
  slideId,
  images,
  imageMode = 'auto',
  paletteHex,
  caption,
}: {
  slideId: string;
  images?: string[];
  imageMode?: 'auto' | 'palette' | 'single' | 'mosaic';
  paletteHex?: string[];
  caption?: string;
}) {
  const hasImages = !!(images && images.length > 0);
  const hasPalette = !!(paletteHex && paletteHex.length > 0);

  // Palette mode (brand-identity primary use case)
  if ((imageMode === 'palette' || (!hasImages && hasPalette)) && hasPalette) {
    const swatches = paletteHex!.slice(0, 6);
    return (
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 gap-px" style={{ background: 'var(--p-border)' }}>
        {swatches.map((hex, i) => (
          <div key={i} className="relative" style={{ background: hex }}>
            <span
              className="absolute bottom-3 left-3"
              style={{
                fontFamily: 'var(--p-mono-font)',
                fontSize: '10px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: contrastFor(hex),
                textShadow: '0 1px 2px rgba(0,0,0,0.25)',
              }}
            >
              {hex.toUpperCase()}
            </span>
          </div>
        ))}
        {/* If user only saved 1-5 hex, fill remaining cells with surface tint */}
        {Array.from({ length: Math.max(0, 6 - swatches.length) }).map((_, i) => (
          <div key={`pad-${i}`} style={{ background: 'var(--p-surface)' }} />
        ))}
      </div>
    );
  }

  // Photo mode
  if (hasImages) {
    const list = images!.slice(0, 4);
    if (imageMode === 'single' || list.length === 1) {
      return (
        <div className="absolute inset-0">
          <img
            src={list[0]}
            alt={`${slideId} portrait`}
            className="w-full h-full object-cover"
          />
          {caption && (
            <span
              className="absolute top-5 right-5 px-3 py-1.5 rounded-full"
              style={{
                fontFamily: 'var(--p-mono-font)',
                fontSize: '10px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                background: 'rgba(255,255,255,0.85)',
                color: 'var(--p-fg)',
                backdropFilter: 'blur(6px)',
              }}
            >
              {caption}
            </span>
          )}
        </div>
      );
    }
    // Mosaic 2×2 (or 1×N if fewer)
    const cols = list.length === 2 ? 'grid-cols-1' : 'grid-cols-2';
    const rows = list.length <= 2 ? 'grid-rows-2' : 'grid-rows-2';
    return (
      <div className={`absolute inset-0 grid ${cols} ${rows} gap-px`} style={{ background: 'var(--p-border)' }}>
        {list.map((src, i) => (
          <div key={i} className="relative overflow-hidden">
            <img src={src} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    );
  }

  // Placeholder fallback (legacy)
  return (
    <div
      className="absolute inset-8 flex items-center justify-center"
      style={{
        border: '1px solid var(--p-border)',
        borderRadius: 'var(--p-radius)',
      }}
    >
      <div className="text-center" style={{ fontFamily: 'var(--p-mono-font)', color: 'var(--p-mute)' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Visual
        </div>
        <div style={{ fontSize: '13px' }}>{slideId}.portrait</div>
      </div>
    </div>
  );
}

/* Choose dark/light text for a hex background by relative luminance.
   Matches the WCAG formula closely enough for swatch labels. */
function contrastFor(hex: string): string {
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  // Approx perceptual luminance (sRGB)
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.55 ? '#1a1a1a' : '#fafafa';
}
