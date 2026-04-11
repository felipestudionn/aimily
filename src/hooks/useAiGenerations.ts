import { useState, useEffect, useCallback } from 'react';
import type { AiGeneration, GenerationType } from '@/types/studio';
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

export const useAiGenerations = (
  collectionPlanId: string,
  generationType?: GenerationType
) => {
  const [generations, setGenerations] = useState<AiGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGenerations = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      let url = `/api/ai-generations?planId=${collectionPlanId}`;
      if (generationType) url += `&type=${generationType}`;
      const res = await fetch(url);
      if (!res.ok) throw await backendError(res);
      const data = await res.json();
      setGenerations(data as AiGeneration[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId, generationType]);

  const addGeneration = async (generation: Partial<AiGeneration>) => {
    setError(null);
    const res = await fetch('/api/ai-generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection_plan_id: collectionPlanId,
        ...generation,
      }),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as AiGeneration;
    setGenerations((prev) => [data, ...prev]);
    return data;
  };

  const updateGeneration = async (id: string, updates: Partial<AiGeneration>) => {
    setError(null);
    const res = await fetch(`/api/ai-generations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as AiGeneration;
    setGenerations((prev) => prev.map((g) => (g.id === id ? data : g)));
    return data;
  };

  const deleteGeneration = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/ai-generations/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    setGenerations((prev) => prev.filter((g) => g.id !== id));
    return true;
  };

  const toggleFavorite = async (id: string) => {
    const gen = generations.find((g) => g.id === id);
    if (!gen) return null;
    return updateGeneration(id, { is_favorite: !gen.is_favorite });
  };

  useEffect(() => {
    if (collectionPlanId) fetchGenerations();
  }, [collectionPlanId, fetchGenerations]);

  return {
    generations,
    loading,
    error,
    addGeneration,
    updateGeneration,
    deleteGeneration,
    toggleFavorite,
    refetch: fetchGenerations,
  };
};
