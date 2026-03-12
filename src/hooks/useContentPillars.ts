import { useState, useEffect, useCallback } from 'react';
import type { ContentPillar } from '@/types/digital';

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
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch');
      setPillars((await res.json()) as ContentPillar[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addPillar = async (pillar: Omit<ContentPillar, 'id' | 'created_at'>) => {
    try {
      const res = await fetch('/api/content-pillars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pillar),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create');
      const data = (await res.json()) as ContentPillar;
      setPillars(prev => [...prev, data]);
      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const bulkSavePillars = async (items: Omit<ContentPillar, 'id' | 'created_at'>[]) => {
    try {
      // Delete existing
      await Promise.all(pillars.map(p => fetch(`/api/content-pillars/${p.id}`, { method: 'DELETE' })));
      const res = await fetch('/api/content-pillars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pillars: items }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to bulk save');
      const data = (await res.json()) as ContentPillar[];
      setPillars(data);
      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const updatePillar = async (id: string, updates: Partial<ContentPillar>) => {
    try {
      const res = await fetch(`/api/content-pillars/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update');
      const data = (await res.json()) as ContentPillar;
      setPillars(prev => prev.map(p => (p.id === id ? data : p)));
      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const deletePillar = async (id: string) => {
    try {
      const res = await fetch(`/api/content-pillars/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete');
      setPillars(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  useEffect(() => {
    if (collectionPlanId) fetchPillars();
  }, [collectionPlanId, fetchPillars]);

  return { pillars, loading, error, addPillar, bulkSavePillars, updatePillar, deletePillar, refetch: fetchPillars };
};
