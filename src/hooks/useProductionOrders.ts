import { useState, useEffect, useCallback } from 'react';
import type { ProductionOrder } from '@/types/production';

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
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch');
      const data = await res.json();
      setOrders(data as ProductionOrder[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addOrder = async (order: Omit<ProductionOrder, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const res = await fetch('/api/production-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create');
      const data = await res.json();
      setOrders((prev) => [data as ProductionOrder, ...prev]);
      return data as ProductionOrder;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const updateOrder = async (id: string, updates: Partial<ProductionOrder>) => {
    try {
      const res = await fetch(`/api/production-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update');
      const data = await res.json();
      setOrders((prev) => prev.map((o) => (o.id === id ? (data as ProductionOrder) : o)));
      return data as ProductionOrder;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/production-orders/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete');
      setOrders((prev) => prev.filter((o) => o.id !== id));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  useEffect(() => {
    if (collectionPlanId) fetchOrders();
  }, [collectionPlanId, fetchOrders]);

  return { orders, loading, error, addOrder, updateOrder, deleteOrder, refetch: fetchOrders };
};
