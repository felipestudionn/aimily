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
    <div className="w-full h-full relative">
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
      {/*
        Legal disclaimer overlay on every shared deck. Same posture as
        the Notes & Disclaimers slide that ships in the PDF export, but
        compact for live viewing — small enough to ignore, large enough
        to spot. Required because shared decks circulate publicly and
        may name third-party brands as inspiration. Trademarks remain
        with their owners; AI content needs human review before commercial use.
      */}
      <div
        style={{
          position: 'fixed',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '10px',
          letterSpacing: '0.04em',
          color: 'rgba(255,255,255,0.55)',
          background: 'rgba(10,10,10,0.55)',
          backdropFilter: 'blur(6px)',
          padding: '6px 14px',
          borderRadius: '999px',
          pointerEvents: 'none',
          zIndex: 50,
          maxWidth: '90vw',
          textAlign: 'center',
        }}
      >
        Working draft &middot; brand references are inspiration, not endorsements &middot;
        AI content requires brand-owner review &middot; aimily
      </div>
    </div>
  );
}
