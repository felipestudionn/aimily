import { useState, useEffect, useCallback, useRef } from 'react';
import { CollectionTimeline, TimelineMilestone } from '@/types/timeline';
import { createDefaultTimeline, migrateLegacyMilestones } from '@/lib/timeline-template';

export function useCollectionTimeline(
  collectionPlanId: string,
  collectionName: string,
  season: string,
  defaultLaunchDate?: string
) {
  const [timeline, setTimeline] = useState<CollectionTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/collection-timelines?planId=${collectionPlanId}`);
      if (!res.ok) throw new Error('Failed to fetch timeline');

      const data = await res.json();

      if (data) {
        // Existing timeline from DB — migrate legacy phases/IDs
        setTimeline({
          id: data.id,
          collectionId: data.collection_plan_id,
          collectionName,
          season,
          launchDate: data.launch_date,
          milestones: migrateLegacyMilestones(data.milestones),
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        } as CollectionTimeline);
      } else {
        // No timeline yet — create default
        const launchDate = defaultLaunchDate || '2027-02-01';
        const fresh = createDefaultTimeline(collectionName, season, launchDate);
        setTimeline(fresh);
        // Save to DB
        await saveToDb(collectionPlanId, launchDate, fresh.milestones);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      // Fallback: create local timeline
      const launchDate = defaultLaunchDate || '2027-02-01';
      setTimeline(createDefaultTimeline(collectionName, season, launchDate));
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId, collectionName, season, defaultLaunchDate]);

  async function saveToDb(
    planId: string,
    launchDate: string,
    milestones: TimelineMilestone[]
  ) {
    try {
      setSaving(true);
      const res = await fetch('/api/collection-timelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection_plan_id: planId,
          launch_date: launchDate,
          milestones,
        }),
      });
      if (!res.ok) throw new Error('Failed to save timeline');
    } catch (err: unknown) {
      console.error('Error saving timeline:', err);
    } finally {
      setSaving(false);
    }
  }

  // Debounced save
  const debouncedSave = useCallback(
    (t: CollectionTimeline) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveToDb(collectionPlanId, t.launchDate, t.milestones);
      }, 1000);
    },
    [collectionPlanId]
  );

  const updateMilestone = useCallback(
    (milestoneId: string, updates: Partial<TimelineMilestone>) => {
      setTimeline((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          updatedAt: new Date().toISOString(),
          milestones: prev.milestones.map((m) =>
            m.id === milestoneId ? { ...m, ...updates } : m
          ),
        };
        debouncedSave(next);
        return next;
      });
    },
    [debouncedSave]
  );

  const updateTimeline = useCallback(
    (updates: Partial<CollectionTimeline>) => {
      setTimeline((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...updates, updatedAt: new Date().toISOString() };
        debouncedSave(next);
        return next;
      });
    },
    [debouncedSave]
  );

  const resetToDefaults = useCallback(() => {
    if (!timeline) return;
    const fresh = createDefaultTimeline(
      timeline.collectionName,
      timeline.season,
      timeline.launchDate
    );
    fresh.id = timeline.id;
    setTimeline(fresh);
    saveToDb(collectionPlanId, fresh.launchDate, fresh.milestones);
  }, [timeline, collectionPlanId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  return {
    timeline,
    loading,
    saving,
    error,
    updateMilestone,
    updateTimeline,
    resetToDefaults,
    refetch: fetchTimeline,
  };
}
