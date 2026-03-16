'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'aimily_onboarding_completed';
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes — only show to very new users

export function useOnboarding() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check localStorage first (fastest)
    if (localStorage.getItem(STORAGE_KEY) === 'true') return;

    // Check user_metadata
    if (user.user_metadata?.onboarding_completed) return;

    // Only show to users created within the last 5 minutes
    const createdAt = new Date(user.created_at).getTime();
    const now = Date.now();
    if (now - createdAt > MAX_AGE_MS) return;

    setShowOnboarding(true);
  }, [user]);

  const dismiss = useCallback(async () => {
    setShowOnboarding(false);
    localStorage.setItem(STORAGE_KEY, 'true');

    if (user) {
      try {
        const supabase = createClient();
        await supabase.auth.updateUser({ data: { onboarding_completed: true } });
      } catch {
        // Silent fail — localStorage is the primary source
      }
    }
  }, [user]);

  return { showOnboarding, dismiss };
}
