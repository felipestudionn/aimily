import { useState, useEffect, useCallback } from 'react';
import type { BrandVoiceConfig } from '@/types/digital';

export const useBrandVoiceConfig = (collectionPlanId: string) => {
  const [config, setConfig] = useState<BrandVoiceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/brand-voice-config?planId=${collectionPlanId}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch');
      const data = await res.json();
      setConfig(data as BrandVoiceConfig | null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const saveConfig = async (updates: Partial<BrandVoiceConfig>) => {
    try {
      const res = await fetch('/api/brand-voice-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection_plan_id: collectionPlanId, ...updates }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save');
      const data = (await res.json()) as BrandVoiceConfig;
      setConfig(data);
      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  useEffect(() => {
    if (collectionPlanId) fetchConfig();
  }, [collectionPlanId, fetchConfig]);

  return { config, loading, error, saveConfig, refetch: fetchConfig };
};
