import { useState, useEffect, useCallback } from 'react';

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
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch');
      const data = await res.json();
      setTasks(data as LaunchTask[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addTask = async (task: Omit<LaunchTask, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const res = await fetch('/api/launch-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create');
      const data = await res.json();
      setTasks(prev => [...prev, data as LaunchTask]);
      return data as LaunchTask;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const updateTask = async (id: string, updates: Partial<LaunchTask>) => {
    try {
      const res = await fetch(`/api/launch-tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update');
      const data = await res.json();
      setTasks(prev => prev.map(t => (t.id === id ? (data as LaunchTask) : t)));
      return data as LaunchTask;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/launch-tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete');
      setTasks(prev => prev.filter(t => t.id !== id));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  useEffect(() => {
    if (collectionPlanId) fetchTasks();
  }, [collectionPlanId, fetchTasks]);

  return { tasks, loading, error, addTask, updateTask, deleteTask, refetch: fetchTasks };
};
