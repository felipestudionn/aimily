/* ═══════════════════════════════════════════════════════════════════
   SharedDeck — client wrapper for the public /p/[token] route.

   Reuses PresentationDeck in read-only mode:
   - No X exit button (replaced by a subtle aimily wordmark link).
   - Theme is locked to the one the owner picked at share-time.
   - No Share button (already shared).
   - PDF download stays enabled — viewers can save their own copy.

   Owns the local index state since there's no sidebar driving it.
   Keyboard nav (←/→/Space/Home/End/Esc) handled by PresentationDeck.
   ═══════════════════════════════════════════════════════════════════ */

'use client';

import { useState } from 'react';
import type { DeckMeta, ThemeId } from '@/lib/presentation/types';
import type { PresentationData } from '@/lib/presentation/load-presentation-data';
import { PresentationDeck } from './PresentationDeck';

interface Props {
  meta: DeckMeta;
  collectionId: string;
  themeId: string;
  coverSubtitle: string;
  titles: Record<string, string>;
  data: PresentationData;
}

export function SharedDeck({ meta, collectionId, themeId, coverSubtitle, titles, data }: Props) {
  const [index, setIndex] = useState(0);
  /* Esc on a shared deck has nowhere to exit to — swallow it. */
  const noOpExit = () => {};

  return (
    <div className="w-full h-full">
      <PresentationDeck
        meta={meta}
        collectionId={collectionId}
        titles={titles}
        coverSubtitle={coverSubtitle}
        data={data}
        index={index}
        themeId={themeId as ThemeId}
        onIndexChange={setIndex}
        onThemeChange={() => { /* locked in read-only mode */ }}
        onExit={noOpExit}
        readOnly
      />
    </div>
  );
}
