import { useState, useEffect, useCallback } from 'react';
import { backendError } from './hook-errors';

/**
 * Contract: reads degrade gracefully, writes throw (enterprise error contract).
 */

export interface WholesaleOrder {
  id: string;
  collection_plan_id: string;
  buyer_name: string;
  buyer_company: string | null;
  buyer_email: string | null;
  status: 'draft' | 'sent' | 'confirmed' | 'in_production' | 'shipped' | 'delivered' | 'cancelled';
  order_lines: Array<{ sku_id: string; sku_name?: string; quantity: number; unit_price: number; total: number }>;
  total_units: number;
  total_value: number;
  notes: string | null;
  delivery_date: string | null;
  created_at: string;
  updated_at: string;
}

export function useWholesaleOrders(collectionPlanId: string) {
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/wholesale-orders?planId=${collectionPlanId}`);
      if (!res.ok) throw await backendError(res);
      const data = await res.json();
      setOrders(data as WholesaleOrder[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addOrder = useCallback(async (order: Partial<WholesaleOrder> & { collection_plan_id: string; buyer_name: string }) => {
    setError(null);
    const res = await fetch('/api/wholesale-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = await res.json();
    setOrders((prev) => [data, ...prev]);
    return data as WholesaleOrder;
  }, []);

  useEffect(() => {
    if (collectionPlanId) fetchOrders();
  }, [collectionPlanId, fetchOrders]);

  return { orders, loading, error, addOrder, refetch: fetchOrders };
}
