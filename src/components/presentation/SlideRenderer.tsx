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
import { HeroTemplate } from './templates/HeroTemplate';
import { PlaceholderTemplate } from './templates/PlaceholderTemplate';
import { EditorialStatTemplate } from './templates/EditorialStatTemplate';
import { NarrativePortraitTemplate } from './templates/NarrativePortraitTemplate';
import { GridTileTemplate } from './templates/GridTileTemplate';
import { TimelineStripTemplate } from './templates/TimelineStripTemplate';

interface Props {
  slide: MicroBlockSlide;
  meta: DeckMeta;
  title: string;
}

export function SlideRenderer({ slide, meta, title }: Props) {
  switch (slide.template) {
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
