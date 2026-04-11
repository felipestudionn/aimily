import { useState, useEffect, useCallback } from 'react';
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

export interface LaunchTask {
  id: string;
  collection_plan_id: string;
  title: string;
  category: string;
  due_date: string | null;
  assigned_to: string | null;
  status: string;
  priority: string;
  notes: string | null;
  depends_on: string[];
  created_at: string;
  updated_at: string;
}

export const useLaunchTasks = (collectionPlanId: string) => {
  const [tasks, setTasks] = useState<LaunchTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/launch-tasks?planId=${collectionPlanId}`);
      if (!res.ok) throw await backendError(res);
      const data = await res.json();
      setTasks(data as LaunchTask[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addTask = async (task: Omit<LaunchTask, 'id' | 'created_at' | 'updated_at'>) => {
    setError(null);
    const res = await fetch('/api/launch-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as LaunchTask;
    setTasks((prev) => [...prev, data]);
    return data;
  };

  const updateTask = async (id: string, updates: Partial<LaunchTask>) => {
    setError(null);
    const res = await fetch(`/api/launch-tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as LaunchTask;
    setTasks((prev) => prev.map((t) => (t.id === id ? data : t)));
    return data;
  };

  const deleteTask = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/launch-tasks/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
    return true;
  };

  useEffect(() => {
    if (collectionPlanId) fetchTasks();
  }, [collectionPlanId, fetchTasks]);

  return { tasks, loading, error, addTask, updateTask, deleteTask, refetch: fetchTasks };
};
