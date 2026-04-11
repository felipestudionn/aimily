import { useState, useEffect, useCallback } from 'react';
import type { SkuColorway } from '@/types/design';
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

export const useColorways = (collectionPlanId: string) => {
  const [colorways, setColorways] = useState<SkuColorway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchColorways = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/colorways?planId=${collectionPlanId}`);
      if (!res.ok) throw await backendError(res);
      const data = await res.json();
      setColorways(data as SkuColorway[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching colorways:', err);
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addColorway = async (colorway: Omit<SkuColorway, 'id' | 'created_at'>) => {
    setError(null);
    const res = await fetch('/api/colorways', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(colorway),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as SkuColorway;
    setColorways((prev) => [...prev, data]);
    return data;
  };

  const updateColorway = async (id: string, updates: Partial<SkuColorway>) => {
    setError(null);
    const res = await fetch(`/api/colorways/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as SkuColorway;
    setColorways((prev) => prev.map((c) => (c.id === id ? data : c)));
    return data;
  };

  const deleteColorway = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/colorways/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    setColorways((prev) => prev.filter((c) => c.id !== id));
    return true;
  };

  useEffect(() => {
    if (collectionPlanId) fetchColorways();
  }, [collectionPlanId, fetchColorways]);

  return {
    colorways,
    loading,
    error,
    addColorway,
    updateColorway,
    deleteColorway,
    refetch: fetchColorways,
  };
};
