import { useState, useEffect, useCallback } from 'react';
import type { ContentPillar } from '@/types/digital';
import { backendError } from './hook-errors';

/**
 * Contract (enterprise-ready, applies to every *.ts hook in this folder):
 *
 *  - Read operations (fetch*) set `error` on failure and degrade gracefully
 *    (loading flag flips, data stays empty). They never throw.
 *
 *  - Write operations (add/update/delete/toggle/bulkSave) set `error` AND
 *    throw a structured Error built from the backend envelope via
 *    backendError(res). Callers must wrap them in try/catch and surface
 *    err.message to the user. Silent "return null" is no longer acceptable:
 *    it masked every persistence failure and was the root cause of the
 *    2026-04-11 Still Life / stories regression.
 */

export const useContentPillars = (collectionPlanId: string) => {
  const [pillars, setPillars] = useState<ContentPillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPillars = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/content-pillars?planId=${collectionPlanId}`);
      if (!res.ok) throw await backendError(res);
      setPillars((await res.json()) as ContentPillar[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addPillar = async (pillar: Omit<ContentPillar, 'id' | 'created_at'>) => {
    setError(null);
    const res = await fetch('/api/content-pillars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pillar),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as ContentPillar;
    setPillars((prev) => [...prev, data]);
    return data;
  };

  const bulkSavePillars = async (items: Omit<ContentPillar, 'id' | 'created_at'>[]) => {
    setError(null);
    // Delete existing first. Per-delete failures are intentionally swallowed
    // because the subsequent POST is the source of truth — see useStories
    // bulkSaveStories for the same rationale.
    await Promise.all(
      pillars.map((p) => fetch(`/api/content-pillars/${p.id}`, { method: 'DELETE' }))
    );
    const res = await fetch('/api/content-pillars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pillars: items }),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as ContentPillar[];
    setPillars(data);
    return data;
  };

  const updatePillar = async (id: string, updates: Partial<ContentPillar>) => {
    setError(null);
    const res = await fetch(`/api/content-pillars/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as ContentPillar;
    setPillars((prev) => prev.map((p) => (p.id === id ? data : p)));
    return data;
  };

  const deletePillar = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/content-pillars/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    setPillars((prev) => prev.filter((p) => p.id !== id));
    return true;
  };

  useEffect(() => {
    if (collectionPlanId) fetchPillars();
  }, [collectionPlanId, fetchPillars]);

  return { pillars, loading, error, addPillar, bulkSavePillars, updatePillar, deletePillar, refetch: fetchPillars };
};
