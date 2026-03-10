import { useState, useEffect, useCallback } from 'react';
import type { ProductCopy, CopyType } from '@/types/digital';

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
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch');
      const data = await res.json();
      setCopies(data as ProductCopy[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId, copyType]);

  const addCopy = async (copy: Omit<ProductCopy, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const res = await fetch('/api/product-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(copy),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create');
      const data = await res.json();
      setCopies(prev => [data as ProductCopy, ...prev]);
      return data as ProductCopy;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      return null;
    }
  };

  const updateCopy = async (id: string, updates: Partial<ProductCopy>) => {
    try {
      const res = await fetch(`/api/product-copy/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update');
      const data = await res.json();
      setCopies(prev => prev.map(c => (c.id === id ? (data as ProductCopy) : c)));
      return data as ProductCopy;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      return null;
    }
  };

  const deleteCopy = async (id: string) => {
    try {
      const res = await fetch(`/api/product-copy/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete');
      setCopies(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      return false;
    }
  };

  useEffect(() => {
    if (collectionPlanId) fetchCopies();
  }, [collectionPlanId, fetchCopies]);

  return { copies, loading, error, addCopy, updateCopy, deleteCopy, refetch: fetchCopies };
};
