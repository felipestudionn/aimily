/* ═══════════════════════════════════════════════════════════════════
   usePresentationData — fetch slide-shaped CIS data for the deck

   Fires once when the user enters Presentation mode, caches the
   result per collectionId so mode-switching doesn't refetch.
   Falls back to null on error; templates show editorial placeholders
   when data is null/loading.
   ═══════════════════════════════════════════════════════════════════ */

'use client';

import { useEffect, useState, useRef } from 'react';
import type { PresentationData } from '@/lib/presentation/load-presentation-data';

/* In-memory cache per collectionId for the session. Avoids refetching
   when the user toggles Presentation → Workspace → Presentation. */
const CACHE = new Map<string, PresentationData>();

interface UsePresentationDataResult {
  data: PresentationData | null;
  loading: boolean;
  error: string | null;
}

export function usePresentationData(
  collectionId: string,
  enabled: boolean = true,
): UsePresentationDataResult {
  const [data, setData] = useState<PresentationData | null>(() => CACHE.get(collectionId) ?? null);
  const [loading, setLoading] = useState<boolean>(enabled && !CACHE.has(collectionId));
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!enabled || CACHE.has(collectionId) || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    fetch(`/api/presentation/data?collectionId=${encodeURIComponent(collectionId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: PresentationData) => {
        CACHE.set(collectionId, json);
        setData(json);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load presentation data');
      })
      .finally(() => {
        inFlight.current = false;
        setLoading(false);
      });
  }, [collectionId, enabled]);

  return { data, loading, error };
}
