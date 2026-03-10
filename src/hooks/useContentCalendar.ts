import { useState, useEffect, useCallback } from 'react';
import type { ContentCalendarEntry } from '@/types/marketing';

export const useContentCalendar = (collectionPlanId: string) => {
  const [entries, setEntries] = useState<ContentCalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/content-calendar?planId=${collectionPlanId}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch');
      const data = await res.json();
      setEntries(data as ContentCalendarEntry[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addEntry = async (entry: Omit<ContentCalendarEntry, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const res = await fetch('/api/content-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create');
      const data = await res.json();
      setEntries(prev => [...prev, data as ContentCalendarEntry].sort(
        (a, b) => a.scheduled_date.localeCompare(b.scheduled_date)
      ));
      return data as ContentCalendarEntry;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const updateEntry = async (id: string, updates: Partial<ContentCalendarEntry>) => {
    try {
      const res = await fetch(`/api/content-calendar/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update');
      const data = await res.json();
      setEntries(prev => prev.map(e => (e.id === id ? (data as ContentCalendarEntry) : e)));
      return data as ContentCalendarEntry;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/content-calendar/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete');
      setEntries(prev => prev.filter(e => e.id !== id));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  useEffect(() => {
    if (collectionPlanId) fetchEntries();
  }, [collectionPlanId, fetchEntries]);

  return { entries, loading, error, addEntry, updateEntry, deleteEntry, refetch: fetchEntries };
};
