import { useState, useEffect, useCallback } from 'react';
import type { BrandModel } from '@/types/studio';

export const useBrandModels = (collectionPlanId: string) => {
  const [models, setModels] = useState<BrandModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/brand-models?planId=${collectionPlanId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch models');
      }
      const data = await res.json();
      setModels(data as BrandModel[]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addModel = async (model: Partial<BrandModel>) => {
    try {
      setError(null);
      const res = await fetch('/api/brand-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection_plan_id: collectionPlanId,
          ...model,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create model');
      }
      const data = await res.json();
      setModels((prev) => [data as BrandModel, ...prev]);
      return data as BrandModel;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    }
  };

  const updateModel = async (id: string, updates: Partial<BrandModel>) => {
    try {
      setError(null);
      const res = await fetch(`/api/brand-models/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update model');
      }
      const data = await res.json();
      setModels((prev) => prev.map((m) => (m.id === id ? (data as BrandModel) : m)));
      return data as BrandModel;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    }
  };

  const deleteModel = async (id: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/brand-models/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete model');
      }
      setModels((prev) => prev.filter((m) => m.id !== id));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return false;
    }
  };

  useEffect(() => {
    if (collectionPlanId) fetchModels();
  }, [collectionPlanId, fetchModels]);

  return {
    models,
    loading,
    error,
    addModel,
    updateModel,
    deleteModel,
    refetch: fetchModels,
  };
};
