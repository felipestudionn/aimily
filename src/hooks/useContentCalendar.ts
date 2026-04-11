import { useState, useEffect, useCallback } from 'react';
import type { ContentCalendarEntry } from '@/types/marketing';
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
      if (!res.ok) throw await backendError(res);
      const data = await res.json();
      setEntries(data as ContentCalendarEntry[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addEntry = async (entry: Omit<ContentCalendarEntry, 'id' | 'created_at' | 'updated_at'>) => {
    setError(null);
    const res = await fetch('/api/content-calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as ContentCalendarEntry;
    setEntries((prev) =>
      [...prev, data].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    );
    return data;
  };

  const updateEntry = async (id: string, updates: Partial<ContentCalendarEntry>) => {
    setError(null);
    const res = await fetch(`/api/content-calendar/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as ContentCalendarEntry;
    setEntries((prev) => prev.map((e) => (e.id === id ? data : e)));
    return data;
  };

  const deleteEntry = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/content-calendar/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
    return true;
  };

  useEffect(() => {
    if (collectionPlanId) fetchEntries();
  }, [collectionPlanId, fetchEntries]);

  return { entries, loading, error, addEntry, updateEntry, deleteEntry, refetch: fetchEntries };
};
