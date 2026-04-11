import { useState, useEffect, useCallback } from 'react';
import type { ProductCopy, CopyType } from '@/types/digital';
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

export const useProductCopy = (collectionPlanId: string, copyType?: CopyType) => {
  const [copies, setCopies] = useState<ProductCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCopies = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ planId: collectionPlanId });
      if (copyType) params.set('copyType', copyType);
      const res = await fetch(`/api/product-copy?${params}`);
      if (!res.ok) throw await backendError(res);
      const data = await res.json();
      setCopies(data as ProductCopy[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId, copyType]);

  const addCopy = async (copy: Omit<ProductCopy, 'id' | 'created_at' | 'updated_at'>) => {
    setError(null);
    const res = await fetch('/api/product-copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(copy),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as ProductCopy;
    setCopies((prev) => [data, ...prev]);
    return data;
  };

  const updateCopy = async (id: string, updates: Partial<ProductCopy>) => {
    setError(null);
    const res = await fetch(`/api/product-copy/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as ProductCopy;
    setCopies((prev) => prev.map((c) => (c.id === id ? data : c)));
    return data;
  };

  const deleteCopy = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/product-copy/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    setCopies((prev) => prev.filter((c) => c.id !== id));
    return true;
  };

  useEffect(() => {
    if (collectionPlanId) fetchCopies();
  }, [collectionPlanId, fetchCopies]);

  return { copies, loading, error, addCopy, updateCopy, deleteCopy, refetch: fetchCopies };
};
