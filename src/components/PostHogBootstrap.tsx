'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { initPostHog, identify, reset } from '@/lib/posthog';

/**
 * Mounts PostHog once and keeps the identified user in sync with auth state.
 * Mounted at the root layout so every page gets analytics.
 */
export function PostHogBootstrap() {
  const { user } = useAuth();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (user?.id) {
      identify(user.id, {
        email: user.email,
        created_at: user.created_at,
      });
    } else {
      reset();
    }
  }, [user?.id, user?.email, user?.created_at]);

  return null;
}
