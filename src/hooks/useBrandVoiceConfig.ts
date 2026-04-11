import { useState, useEffect, useCallback } from 'react';
import type { BrandVoiceConfig } from '@/types/digital';
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
      if (!res.ok) throw await backendError(res);
      const data = await res.json();
      setConfig(data as BrandVoiceConfig | null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const saveConfig = async (updates: Partial<BrandVoiceConfig>) => {
    setError(null);
    const res = await fetch('/api/brand-voice-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection_plan_id: collectionPlanId, ...updates }),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as BrandVoiceConfig;
    setConfig(data);
    return data;
  };

  useEffect(() => {
    if (collectionPlanId) fetchConfig();
  }, [collectionPlanId, fetchConfig]);

  return { config, loading, error, saveConfig, refetch: fetchConfig };
};
