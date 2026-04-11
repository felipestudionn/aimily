import { useState, useEffect, useCallback, useRef } from 'react';
import type { BrandProfile } from '@/types/brand';
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
 *
 *  Note: `debouncedUpdate` fires `updateProfile` from a setTimeout, so any
 *  thrown error there has no caller to catch it. We swallow it inside the
 *  debounced wrapper after the underlying write has already set `error`.
 */

export const useBrandProfile = (collectionPlanId: string) => {
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/brand-profiles?planId=${collectionPlanId}`);
      if (!res.ok) throw await backendError(res);
      const data = await res.json();
      setProfile(data as BrandProfile);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching brand profile:', err);
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const updateProfile = useCallback(
    async (updates: Partial<BrandProfile>) => {
      if (!profile) return null;
      setError(null);
      setSaving(true);
      try {
        const res = await fetch('/api/brand-profiles', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: profile.id, ...updates }),
        });
        if (!res.ok) {
          const err = await backendError(res);
          setError(err.message);
          throw err;
        }
        const data = (await res.json()) as BrandProfile;
        setProfile(data);
        return data;
      } finally {
        setSaving(false);
      }
    },
    [profile]
  );

  // Auto-save with debounce (800ms). Errors here have no caller to catch them
  // (setTimeout context), so we swallow after the underlying write has already
  // set `error` on the hook. UI surfaces it via the `error` field.
  const debouncedUpdate = useCallback(
    (updates: Partial<BrandProfile>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateProfile(updates).catch(() => {
          // already captured in `error` state
        });
      }, 800);
    },
    [updateProfile]
  );

  useEffect(() => {
    if (collectionPlanId) fetchProfile();
  }, [collectionPlanId, fetchProfile]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    profile,
    loading,
    saving,
    error,
    updateProfile,
    debouncedUpdate,
    refetch: fetchProfile,
  };
};
