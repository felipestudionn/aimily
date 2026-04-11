import { useState, useEffect, useCallback } from 'react';
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

export interface CommercialAction {
  id: string;
  collection_plan_id: string;
  name: string;
  action_type: 'SALE' | 'COLLAB' | 'CAMPAIGN' | 'SEEDING' | 'EVENT' | 'OTHER';
  start_date: string;
  end_date?: string;
  category?: string;
  partner_name?: string;
  partner_logo_url?: string;
  description?: string;
  expected_traffic_boost?: number;
  expected_sales_boost?: number;
  channels: string[];
  position: number;
  created_at?: string;
  updated_at?: string;
}

export const useCommercialActions = (collectionPlanId: string) => {
  const [actions, setActions] = useState<CommercialAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/commercial-actions?planId=${collectionPlanId}`);
      if (!res.ok) throw await backendError(res);
      const data = await res.json();
      setActions(data as CommercialAction[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching commercial actions:', err);
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addAction = async (action: Omit<CommercialAction, 'id' | 'created_at' | 'updated_at'>) => {
    setError(null);
    const res = await fetch('/api/commercial-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as CommercialAction;
    setActions((prev) =>
      [...prev, data].sort(
        (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      )
    );
    return data;
  };

  const updateAction = async (id: string, updates: Partial<CommercialAction>) => {
    setError(null);
    const res = await fetch(`/api/commercial-actions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as CommercialAction;
    setActions((prev) => prev.map((a) => (a.id === id ? data : a)));
    return data;
  };

  const deleteAction = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/commercial-actions/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    setActions((prev) => prev.filter((a) => a.id !== id));
    return true;
  };

  useEffect(() => {
    if (collectionPlanId) {
      fetchActions();
    }
  }, [collectionPlanId, fetchActions]);

  return {
    actions,
    loading,
    error,
    addAction,
    updateAction,
    deleteAction,
    refetch: fetchActions,
  };
};
