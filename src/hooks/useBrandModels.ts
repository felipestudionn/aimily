import { useState, useEffect, useCallback } from 'react';
import type { BrandModel } from '@/types/studio';
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
      if (!res.ok) throw await backendError(res);
      const data = await res.json();
      setModels(data as BrandModel[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addModel = async (model: Partial<BrandModel>) => {
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
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as BrandModel;
    setModels((prev) => [data, ...prev]);
    return data;
  };

  const updateModel = async (id: string, updates: Partial<BrandModel>) => {
    setError(null);
    const res = await fetch(`/api/brand-models/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as BrandModel;
    setModels((prev) => prev.map((m) => (m.id === id ? data : m)));
    return data;
  };

  const deleteModel = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/brand-models/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    setModels((prev) => prev.filter((m) => m.id !== id));
    return true;
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
