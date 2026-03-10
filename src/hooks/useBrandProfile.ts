import { useState, useEffect, useCallback, useRef } from 'react';
import type { BrandProfile } from '@/types/brand';

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
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch brand profile');
      }
      const data = await res.json();
      setProfile(data as BrandProfile);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error fetching brand profile:', err);
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const updateProfile = useCallback(
    async (updates: Partial<BrandProfile>) => {
      if (!profile) return null;
      try {
        setSaving(true);
        setError(null);
        const res = await fetch('/api/brand-profiles', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: profile.id, ...updates }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to update brand profile');
        }
        const data = await res.json();
        setProfile(data as BrandProfile);
        return data as BrandProfile;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('Error updating brand profile:', err);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [profile]
  );

  // Auto-save with debounce (800ms)
  const debouncedUpdate = useCallback(
    (updates: Partial<BrandProfile>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateProfile(updates);
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
