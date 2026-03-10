'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface AppNotification {
  id: string;
  type: 'overdue' | 'due_soon' | 'launch_approaching' | 'in_progress';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  title_es: string;
  body: string;
  body_es: string;
  collection: string;
  collection_id: string;
  phase?: string;
  milestone_id?: string;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('aimily_dismissed_notifications');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?user_id=${user.id}`);
      if (!res.ok) return;
      const data = await res.json();
      const allNotifs: AppNotification[] = data.notifications || [];
      setNotifications(allNotifs);
      // Unread = not dismissed
      const activeCount = allNotifs.filter((n) => !dismissed.has(n.id)).length;
      setUnreadCount(activeCount);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user, dismissed]);

  useEffect(() => {
    fetchNotifications();
    // Refresh every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem('aimily_dismissed_notifications', JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const dismissAll = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    setDismissed((prev) => {
      const next = new Set(Array.from(prev).concat(allIds));
      try { localStorage.setItem('aimily_dismissed_notifications', JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
    setUnreadCount(0);
  }, [notifications]);

  const activeNotifications = notifications.filter((n) => !dismissed.has(n.id));

  return {
    notifications: activeNotifications,
    allNotifications: notifications,
    unreadCount,
    loading,
    dismiss,
    dismissAll,
    refresh: fetchNotifications,
  };
}
