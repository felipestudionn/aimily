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
import type { PresentationData } from '@/lib/presentation/load-presentation-data';
import { CoverTemplate } from './templates/CoverTemplate';
import { HeroTemplate } from './templates/HeroTemplate';
import { PlaceholderTemplate } from './templates/PlaceholderTemplate';
import { EditorialStatTemplate } from './templates/EditorialStatTemplate';
import { NarrativePortraitTemplate } from './templates/NarrativePortraitTemplate';
import { GridTileTemplate } from './templates/GridTileTemplate';
import { TimelineStripTemplate } from './templates/TimelineStripTemplate';

export interface EditingContext {
  editMode: boolean;
  /* Saved overrides (committed, from DB) — drives "isOverride" flag
     so templates can show the revert chip on edited fields. */
  slideOverrides: Record<string, string>;
  /* Unsaved drafts (live in-memory state) — mirrors what's visible
     on screen while the user is typing. */
  drafts: Record<string, string>;
  onDraftChange: (field: string, value: string) => void;
  onRevert: (field: string) => void;
}

interface Props {
  /* slide is null when rendering the cover (slide 0 — no mini-block). */
  slide: MicroBlockSlide | null;
  meta: DeckMeta;
  title: string;
  coverSubtitle?: string;
  /* CIS-shaped slide data. When a matching entry exists for the slide
     id, the template renders real data; otherwise it falls back to
     editorial placeholders. */
  data?: PresentationData | null;
  /* When present, the slide is in edit mode and the template should
     wire its text fields through EditableText. */
  editing?: EditingContext;
}

export function SlideRenderer({ slide, meta, title, coverSubtitle, data, editing }: Props) {
  if (!slide) {
    return <CoverTemplate meta={meta} subtitle={coverSubtitle ?? ''} />;
  }
  switch (slide.template) {
    case 'cover':
      return <CoverTemplate meta={meta} subtitle={coverSubtitle ?? ''} />;
    case 'hero':
      return <HeroTemplate slide={slide} meta={meta} title={title} />;
    case 'editorial-stat':
      return <EditorialStatTemplate slide={slide} meta={meta} title={title} data={data?.stats[slide.id]} editing={editing} />;
    case 'narrative-portrait':
      return <NarrativePortraitTemplate slide={slide} meta={meta} title={title} data={data?.narratives[slide.id]} editing={editing} />;
    case 'grid-tile':
      return <GridTileTemplate slide={slide} meta={meta} title={title} data={data?.grids[slide.id]} editing={editing} />;
    case 'timeline-strip':
      return <TimelineStripTemplate slide={slide} meta={meta} title={title} data={data?.timelines[slide.id]} editing={editing} />;
    case 'placeholder':
    default:
      return <PlaceholderTemplate slide={slide} meta={meta} title={title} />;
  }
}
