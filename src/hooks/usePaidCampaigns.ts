import { useState, useEffect, useCallback } from 'react';
import type { AdCampaign } from '@/types/marketing';
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

export interface PaidCampaign {
  id: string;
  collection_plan_id: string;
  name: string;
  platform: string;
  objective: string;
  budget: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  drop_name: string | null;
  ad_sets: AdCampaign['ad_sets'];
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export const usePaidCampaigns = (collectionPlanId: string) => {
  const [campaigns, setCampaigns] = useState<PaidCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/paid-campaigns?planId=${collectionPlanId}`);
      if (!res.ok) throw await backendError(res);
      const data = await res.json();
      setCampaigns(data as PaidCampaign[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addCampaign = async (campaign: Omit<PaidCampaign, 'id' | 'created_at' | 'updated_at'>) => {
    setError(null);
    const res = await fetch('/api/paid-campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaign),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as PaidCampaign;
    setCampaigns((prev) => [...prev, data]);
    return data;
  };

  const updateCampaign = async (id: string, updates: Partial<PaidCampaign>) => {
    setError(null);
    const res = await fetch(`/api/paid-campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as PaidCampaign;
    setCampaigns((prev) => prev.map((c) => (c.id === id ? data : c)));
    return data;
  };

  const deleteCampaign = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/paid-campaigns/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    return true;
  };

  useEffect(() => {
    if (collectionPlanId) fetchCampaigns();
  }, [collectionPlanId, fetchCampaigns]);

  return { campaigns, loading, error, addCampaign, updateCampaign, deleteCampaign, refetch: fetchCampaigns };
};
