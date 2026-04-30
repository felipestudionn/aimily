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

const NARRATIVE_PLACEHOLDERS: Record<string, { lead: string; body: string; attribution: string }> = {
  consumer: {
    lead: 'She is 24, lives between cities, and reads culture more than trend reports.',
    body: 'Our consumer treats each drop as a statement piece rather than a wardrobe filler. She values scarcity, craftsmanship, and the community of people wearing the same pieces — but refuses anything that looks mass-produced.',
    attribution: 'Consumer archetype · Primary segment',
  },
  'brand-identity': {
    lead: 'A brand built at the seam between craft and rebellion.',
    body: 'The aesthetic is disciplined: neutral tones, architectural silhouettes, and deliberate imperfections borrowed from atelier floors. The voice is short, physical, unafraid. The product speaks before the logo does.',
    attribution: 'Brand DNA · Core positioning',
  },
  'buying-strategy': {
    lead: 'Three drops a season, each telling a chapter of the collection story.',
    body: 'Narrow and deep over broad and shallow: 28 styles across three families, staggered across eight weeks. Core programs anchor the top of funnel; seasonal captures convert the followers we earn along the way.',
    attribution: 'Buying strategy · Season blueprint',
  },
  'tech-pack': {
    lead: 'Specs that a factory can build without a phone call.',
    body: 'Every silhouette carries pattern measurements, materials BOM, stitch density, labelling, and packaging. One-page-per-SKU format, bilingual EN/IT, always synced with the sample status so production never works from stale data.',
    attribution: 'Tech pack · Production-ready',
  },
  communications: {
    lead: 'Short sentences. Heavy with meaning.',
    body: 'Copy across site, email, and social shares the same cadence: declarative, uncluttered, and physically specific. We name the material, the city, the process. We never reach for adjectives when a noun does the work.',
    attribution: 'Voice & tone · Communications spine',
  },
};

const FALLBACK = {
  lead: 'The narrative for this mini-block lands here once it\'s finalised.',
  body: 'This template renders story-driven slides with a lead sentence, supporting paragraph, and an editorial image panel. Real content flows in from the Collection Intelligence System when the mini-block is filled.',
  attribution: `${''} · Draft`,
};

export function NarrativePortraitTemplate({ slide, meta, title, data: cisData, editing }: Props) {
  const placeholder = NARRATIVE_PLACEHOLDERS[slide.id] ?? FALLBACK;
  /* Prefer draft (what user is typing) → committed CIS/override → placeholder.
     Drafts win so the screen reflects typing without a round-trip. */
  const data = {
    lead: editing?.drafts.lead ?? cisData?.lead ?? placeholder.lead,
    body: editing?.drafts.body ?? cisData?.body ?? placeholder.body,
    attribution: cisData?.attribution ?? placeholder.attribution,
  };
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
