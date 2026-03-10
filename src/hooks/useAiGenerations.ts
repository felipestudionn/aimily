import { useState, useEffect, useCallback } from 'react';
import type { AiGeneration, GenerationType } from '@/types/studio';

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
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch generations');
      }
      const data = await res.json();
      setGenerations(data as AiGeneration[]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId, generationType]);

  const addGeneration = async (generation: Partial<AiGeneration>) => {
    try {
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
        const err = await res.json();
        throw new Error(err.error || 'Failed to create generation');
      }
      const data = await res.json();
      setGenerations((prev) => [data as AiGeneration, ...prev]);
      return data as AiGeneration;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    }
  };

  const updateGeneration = async (id: string, updates: Partial<AiGeneration>) => {
    try {
      setError(null);
      const res = await fetch(`/api/ai-generations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update generation');
      }
      const data = await res.json();
      setGenerations((prev) => prev.map((g) => (g.id === id ? (data as AiGeneration) : g)));
      return data as AiGeneration;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    }
  };

  const deleteGeneration = async (id: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/ai-generations/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete generation');
      }
      setGenerations((prev) => prev.filter((g) => g.id !== id));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return false;
    }
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
