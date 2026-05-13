'use client';

import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { SubscriptionProvider, type SubscriptionData } from '@/contexts/SubscriptionContext';
import { ToastProvider } from '@/components/ui/toast';

/**
 * Client provider tree for the authenticated app.
 *
 * Receives the server-resolved user + subscription from `(app)/layout.tsx`
 * so the first paint already knows who's logged in and what plan they're
 * on. Without this, every authenticated route flashed:
 *
 *   blank shell → AuthContext.loading=true → SubscriptionContext.loading=true → ready
 *
 * Now the shell mounts straight into the ready state.
 *
 * Provider order matters: AuthProvider must wrap SubscriptionProvider
 * (subscription reads user.id via useAuth). LanguageProvider sits between
 * them because it also reads user.user_metadata.language.
 */
interface AppProvidersProps {
  children: ReactNode;
  initialUser: User | null;
  initialSubscription: SubscriptionData | null;
}

export function AppProviders({
  children,
  initialUser,
  initialSubscription,
}: AppProvidersProps) {
  return (
    <AuthProvider initialUser={initialUser}>
      <LanguageProvider>
        <SubscriptionProvider initialSubscription={initialSubscription}>
          <ToastProvider>{children}</ToastProvider>
        </SubscriptionProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
