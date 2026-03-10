'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { TimelineMilestone, MilestoneStatus } from '@/types/timeline';

interface TimelineContextValue {
  milestones: TimelineMilestone[];
  updateMilestoneStatus: (milestoneId: string, status: MilestoneStatus) => void;
  cycleMilestoneStatus: (milestoneId: string) => void;
  saving: boolean;
}

const TimelineContext = createContext<TimelineContextValue | null>(null);

const STATUS_CYCLE: Record<MilestoneStatus, MilestoneStatus> = {
  pending: 'in-progress',
  'in-progress': 'completed',
  completed: 'pending',
};

interface TimelineProviderProps {
  children: React.ReactNode;
  collectionPlanId: string;
  initialMilestones: TimelineMilestone[];
}

export function TimelineProvider({
  children,
  collectionPlanId,
  initialMilestones,
}: TimelineProviderProps) {
  const [milestones, setMilestones] = useState<TimelineMilestone[]>(initialMilestones);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync if initialMilestones change (e.g. server refetch)
  useEffect(() => {
    setMilestones(initialMilestones);
  }, [initialMilestones]);

  const saveToApi = useCallback(
    (updated: TimelineMilestone[]) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          setSaving(true);
          await fetch('/api/collection-timelines', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              collection_plan_id: collectionPlanId,
              milestones: updated,
            }),
          });
        } catch (err) {
          console.error('Failed to save milestone update:', err);
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    [collectionPlanId]
  );

  const updateMilestoneStatus = useCallback(
    (milestoneId: string, status: MilestoneStatus) => {
      setMilestones((prev) => {
        const next = prev.map((m) =>
          m.id === milestoneId ? { ...m, status } : m
        );
        saveToApi(next);
        return next;
      });
    },
    [saveToApi]
  );

  const cycleMilestoneStatus = useCallback(
    (milestoneId: string) => {
      setMilestones((prev) => {
        const milestone = prev.find((m) => m.id === milestoneId);
        if (!milestone) return prev;
        const nextStatus = STATUS_CYCLE[milestone.status];
        const next = prev.map((m) =>
          m.id === milestoneId ? { ...m, status: nextStatus } : m
        );
        saveToApi(next);
        return next;
      });
    },
    [saveToApi]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  return (
    <TimelineContext.Provider
      value={{ milestones, updateMilestoneStatus, cycleMilestoneStatus, saving }}
    >
      {children}
    </TimelineContext.Provider>
  );
}

export function useTimeline() {
  const ctx = useContext(TimelineContext);
  if (!ctx) {
    throw new Error('useTimeline must be used within a TimelineProvider');
  }
  return ctx;
}
