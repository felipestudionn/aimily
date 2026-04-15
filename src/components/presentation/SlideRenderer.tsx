/* ═══════════════════════════════════════════════════════════════════
   SLIDE RENDERER — picks the right template for a slide

   Templates currently shipped:
   - hero  → HeroTemplate (block intros + closers)
   - other → PlaceholderTemplate (theme-styled skeleton)

   F2 will add EditorialStat, NarrativePortrait, GridTile, TimelineStrip.
   ═══════════════════════════════════════════════════════════════════ */

import type { MicroBlockSlide, DeckMeta } from '@/lib/presentation/types';
import { HeroTemplate } from './templates/HeroTemplate';
import { PlaceholderTemplate } from './templates/PlaceholderTemplate';

interface Props {
  slide: MicroBlockSlide;
  meta: DeckMeta;
  title: string;
}

export function SlideRenderer({ slide, meta, title }: Props) {
  switch (slide.template) {
    case 'hero':
      return <HeroTemplate slide={slide} meta={meta} title={title} />;
    /* All other templates fall back to placeholder until F2 ships them */
    case 'editorial-stat':
    case 'narrative-portrait':
    case 'grid-tile':
    case 'timeline-strip':
    case 'placeholder':
    default:
      return <PlaceholderTemplate slide={slide} meta={meta} title={title} />;
  }
}
