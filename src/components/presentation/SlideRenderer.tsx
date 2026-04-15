/* ═══════════════════════════════════════════════════════════════════
   SLIDE RENDERER — picks the right template for a slide

   Templates currently shipped (F1.2 complete):
   - hero               → HeroTemplate (block intros + closers)
   - editorial-stat     → EditorialStatTemplate (big KPI + narrative)
   - narrative-portrait → NarrativePortraitTemplate (image + story)
   - grid-tile          → GridTileTemplate (multi-tile contact sheet)
   - timeline-strip     → TimelineStripTemplate (horizontal milestones)
   - placeholder        → PlaceholderTemplate (explicit skeleton)
   ═══════════════════════════════════════════════════════════════════ */

import type { MicroBlockSlide, DeckMeta } from '@/lib/presentation/types';
import { CoverTemplate } from './templates/CoverTemplate';
import { HeroTemplate } from './templates/HeroTemplate';
import { PlaceholderTemplate } from './templates/PlaceholderTemplate';
import { EditorialStatTemplate } from './templates/EditorialStatTemplate';
import { NarrativePortraitTemplate } from './templates/NarrativePortraitTemplate';
import { GridTileTemplate } from './templates/GridTileTemplate';
import { TimelineStripTemplate } from './templates/TimelineStripTemplate';

interface Props {
  /* slide is null when rendering the cover (slide 0 — no mini-block). */
  slide: MicroBlockSlide | null;
  meta: DeckMeta;
  title: string;
  coverSubtitle?: string;
}

export function SlideRenderer({ slide, meta, title, coverSubtitle }: Props) {
  if (!slide) {
    return <CoverTemplate meta={meta} subtitle={coverSubtitle ?? ''} />;
  }
  switch (slide.template) {
    case 'cover':
      return <CoverTemplate meta={meta} subtitle={coverSubtitle ?? ''} />;
    case 'hero':
      return <HeroTemplate slide={slide} meta={meta} title={title} />;
    case 'editorial-stat':
      return <EditorialStatTemplate slide={slide} meta={meta} title={title} />;
    case 'narrative-portrait':
      return <NarrativePortraitTemplate slide={slide} meta={meta} title={title} />;
    case 'grid-tile':
      return <GridTileTemplate slide={slide} meta={meta} title={title} />;
    case 'timeline-strip':
      return <TimelineStripTemplate slide={slide} meta={meta} title={title} />;
    case 'placeholder':
    default:
      return <PlaceholderTemplate slide={slide} meta={meta} title={title} />;
  }
}
