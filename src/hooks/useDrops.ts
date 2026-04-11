import { useState, useEffect, useCallback } from 'react';
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

export interface Drop {
  id: string;
  collection_plan_id: string;
  drop_number: number;
  name: string;
  launch_date: string;
  end_date?: string;
  weeks_active: number;
  story_name?: string;
  story_description?: string;
  channels: string[];
  position: number;
  created_at?: string;
  updated_at?: string;
}

export const useDrops = (collectionPlanId: string) => {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrops = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/drops?planId=${collectionPlanId}`);
      if (!res.ok) throw await backendError(res);
      const data = await res.json();
      setDrops(data as Drop[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching drops:', err);
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addDrop = async (drop: Omit<Drop, 'id' | 'created_at' | 'updated_at'>) => {
    setError(null);
    const res = await fetch('/api/drops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(drop),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as Drop;
    setDrops((prev) => [...prev, data].sort((a, b) => a.position - b.position));
    return data;
  };

  const updateDrop = async (id: string, updates: Partial<Drop>) => {
    setError(null);
    const res = await fetch(`/api/drops/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as Drop;
    setDrops((prev) => prev.map((d) => (d.id === id ? data : d)));
    return data;
  };

  const deleteDrop = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/drops/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    setDrops((prev) => prev.filter((d) => d.id !== id));
    return true;
  };

  /**
   * Optimistic reorder: updates the UI immediately, then writes positions.
   * If any write fails we set `error` and refetch to restore canonical order.
   * This function intentionally does not throw — UX is best-effort drag/drop.
   */
  const reorderDrops = async (reorderedDrops: Drop[]) => {
    setDrops(reorderedDrops);
    setError(null);
    try {
      const results = await Promise.all(
        reorderedDrops.map((drop, index) =>
          fetch(`/api/drops/${drop.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: index }),
          })
        )
      );
      const failed = results.find((r) => !r.ok);
      if (failed) {
        const err = await backendError(failed);
        setError(err.message);
        fetchDrops();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error reordering drops:', err);
      fetchDrops();
    }
  };

  useEffect(() => {
    if (collectionPlanId) {
      fetchDrops();
    }
  }, [collectionPlanId, fetchDrops]);

  return {
    drops,
    loading,
    error,
    addDrop,
    updateDrop,
    deleteDrop,
    reorderDrops,
    refetch: fetchDrops,
  };
};
