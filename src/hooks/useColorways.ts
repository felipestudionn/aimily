import { useState, useEffect, useCallback } from 'react';
import type { SkuColorway } from '@/types/design';

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
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch colorways');
      }
      const data = await res.json();
      setColorways(data as SkuColorway[]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error fetching colorways:', err);
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addColorway = async (colorway: Omit<SkuColorway, 'id' | 'created_at'>) => {
    try {
      setError(null);
      const res = await fetch('/api/colorways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(colorway),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add colorway');
      }
      const data = await res.json();
      setColorways((prev) => [...prev, data as SkuColorway]);
      return data as SkuColorway;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error adding colorway:', err);
      return null;
    }
  };

  const updateColorway = async (id: string, updates: Partial<SkuColorway>) => {
    try {
      setError(null);
      const res = await fetch(`/api/colorways/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update colorway');
      }
      const data = await res.json();
      setColorways((prev) => prev.map((c) => (c.id === id ? (data as SkuColorway) : c)));
      return data as SkuColorway;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error updating colorway:', err);
      return null;
    }
  };

  const deleteColorway = async (id: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/colorways/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete colorway');
      }
      setColorways((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error deleting colorway:', err);
      return false;
    }
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
