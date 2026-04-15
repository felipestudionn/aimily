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

interface Props {
  slide: MicroBlockSlide;
  meta: DeckMeta;
  title: string;
  /* Real CIS data for this slide. When present, its fields override
     the editorial placeholders below. */
  data?: NarrativeSlideData;
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

export function NarrativePortraitTemplate({ slide, meta, title, data: cisData }: Props) {
  const placeholder = NARRATIVE_PLACEHOLDERS[slide.id] ?? FALLBACK;
  /* Prefer real CIS data field-by-field. Each field falls back to the
     editorial placeholder when CIS hasn't been filled for this mini-block. */
  const data = {
    lead: cisData?.lead ?? placeholder.lead,
    body: cisData?.body ?? placeholder.body,
    attribution: cisData?.attribution ?? placeholder.attribution,
  };

  return (
    <div
      className="w-full h-full flex"
      style={{ background: 'var(--p-bg)', color: 'var(--p-fg)' }}
    >
      {/* LEFT — image panel (placeholder until F2 serves real visuals) */}
      <div
        className="w-1/2 relative flex flex-col justify-between"
        style={{
          background: 'var(--p-surface)',
          padding: 'clamp(32px, 3.5vw, 56px)',
          borderRight: '1px solid var(--p-border)',
        }}
      >
        {/* Visual placeholder — theme-tinted frame */}
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
            <div style={{ fontSize: '13px' }}>{slide.id}.portrait</div>
          </div>
        </div>
        {/* Bottom caption */}
        <div className="relative mt-auto pt-6">
          <span
            style={{
              fontFamily: 'var(--p-mono-font)',
              fontSize: '10px',
              letterSpacing: '0.24em',
              color: 'var(--p-mute)',
              textTransform: 'uppercase',
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
          <p
            style={{
              fontFamily: 'var(--p-display-font)',
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
          </p>
          <div
            style={{
              width: '60px',
              height: '2px',
              background: 'var(--p-accent)',
              margin: '24px 0',
            }}
          />
          <p
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
          </p>
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
