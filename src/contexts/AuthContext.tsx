'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  /**
   * Server-resolved user. When provided, the provider arrives in a
   * "ready" state (loading: false) and skips the client `getSession()`
   * round-trip — eliminating the auth-flash that used to repaint the
   * Navbar and every consumer of `useAuth()` on first mount.
   *
   * Pass `null` explicitly to mean "server checked, no session". Pass
   * `undefined` (or omit) to fall back to the legacy client-side flow
   * for routes that haven't been migrated to SSR yet.
   */
  initialUser?: User | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const hasServerSession = initialUser !== undefined;

  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!hasServerSession);

  const supabase = createClient();

  useEffect(() => {
    // Supabase fires both getSession() AND onAuthStateChange(INITIAL_SESSION)
    // on mount, producing two different User object references for the same
    // identity. Downstream effects keyed on `user` (e.g. fetchData) would
    // double-fire and flash the loading spinner. We dedupe by id so the
    // reference only changes when the actual user changes.
    const setUserStable = (next: User | null) =>
      setUser((prev) => (prev?.id === next?.id ? prev : next));

    // When the server already resolved the user, skip the explicit
    // getSession() round-trip. The onAuthStateChange listener below still
    // mounts, so login/logout/refresh events propagate normally; we just
    // don't force the page through a redundant pending state on first
    // paint. For legacy callers without `initialUser`, behavior is
    // unchanged.
    if (!hasServerSession) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUserStable(session?.user ?? null);
        setLoading(false);
      });
    } else {
      // Still pull the session reference once so consumers that read it
      // get a populated value. The user is already authoritative from SSR,
      // so we don't touch `user` here — that would just create a stable
      // no-op ref change anyway.
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
      });
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUserStable(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error as Error | null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return { error: error as Error | null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      signUp, signIn, signInWithGoogle, signOut,
      resetPassword, updatePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
