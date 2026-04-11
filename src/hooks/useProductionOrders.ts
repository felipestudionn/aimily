import { useState, useEffect, useCallback } from 'react';
import type { ProductionOrder } from '@/types/production';
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

export const useProductionOrders = (collectionPlanId: string) => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/production-orders?planId=${collectionPlanId}`);
      if (!res.ok) throw await backendError(res);
      const data = await res.json();
      setOrders(data as ProductionOrder[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addOrder = async (order: Omit<ProductionOrder, 'id' | 'created_at' | 'updated_at'>) => {
    setError(null);
    const res = await fetch('/api/production-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as ProductionOrder;
    setOrders((prev) => [data, ...prev]);
    return data;
  };

  const updateOrder = async (id: string, updates: Partial<ProductionOrder>) => {
    setError(null);
    const res = await fetch(`/api/production-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as ProductionOrder;
    setOrders((prev) => prev.map((o) => (o.id === id ? data : o)));
    return data;
  };

  const deleteOrder = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/production-orders/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    setOrders((prev) => prev.filter((o) => o.id !== id));
    return true;
  };

  useEffect(() => {
    if (collectionPlanId) fetchOrders();
  }, [collectionPlanId, fetchOrders]);

  return { orders, loading, error, addOrder, updateOrder, deleteOrder, refetch: fetchOrders };
};
