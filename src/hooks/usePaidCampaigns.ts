import { useState, useEffect, useCallback } from 'react';
import type { AdCampaign } from '@/types/marketing';

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
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch');
      const data = await res.json();
      setCampaigns(data as PaidCampaign[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addCampaign = async (campaign: Omit<PaidCampaign, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const res = await fetch('/api/paid-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create');
      const data = await res.json();
      setCampaigns(prev => [...prev, data as PaidCampaign]);
      return data as PaidCampaign;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const updateCampaign = async (id: string, updates: Partial<PaidCampaign>) => {
    try {
      const res = await fetch(`/api/paid-campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update');
      const data = await res.json();
      setCampaigns(prev => prev.map(c => (c.id === id ? (data as PaidCampaign) : c)));
      return data as PaidCampaign;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      const res = await fetch(`/api/paid-campaigns/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete');
      setCampaigns(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  useEffect(() => {
    if (collectionPlanId) fetchCampaigns();
  }, [collectionPlanId, fetchCampaigns]);

  return { campaigns, loading, error, addCampaign, updateCampaign, deleteCampaign, refetch: fetchCampaigns };
};
