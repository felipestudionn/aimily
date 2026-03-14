'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/i18n';

export default function ResetPasswordPage() {
  const t = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  // Handle PKCE code exchange on mount (when arriving from email link)
  useEffect(() => {
    const supabase = createClient();

    // Check if there's a code in the URL (PKCE flow)
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setError(t.auth.resetLinkExpiredOrInvalid);
        } else {
          setSessionReady(true);
        }
        // Clean URL
        window.history.replaceState({}, '', '/auth/reset-password');
        setInitializing(false);
      });
    } else {
      // No code — check if user already has a session (e.g. came via callback)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setSessionReady(true);
        } else {
          setError(t.auth.noActiveSession);
        }
        setInitializing(false);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return t.auth.errPasswordMinChars;
    if (!/\d/.test(pw)) return t.auth.errPasswordNeedNumber;
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.auth.passwordsDoNotMatch);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError(t.common.unexpectedError);
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-carbon flex items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-crema/50" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-carbon flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="border border-gris/20 p-8">
          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h1 className="text-2xl font-light text-crema tracking-tight">
                {t.auth.passwordUpdated}
              </h1>
              <p className="text-sm text-gris/60">
                {t.auth.passwordUpdateSuccess}
              </p>
              <Link
                href="/my-collections"
                className="inline-block w-full py-3 bg-crema text-carbon text-sm font-medium tracking-[0.1em] uppercase hover:bg-crema/90 transition-colors text-center"
              >
                {t.auth.goToCollections}
              </Link>
            </div>
          ) : !sessionReady ? (
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-light text-crema tracking-tight">
                {t.auth.linkExpired}
              </h1>
              <p className="text-sm text-gris/60">
                {error || t.auth.linkExpiredDesc}
              </p>
              <Link
                href="/auth/forgot-password"
                className="inline-block w-full py-3 bg-crema text-carbon text-sm font-medium tracking-[0.1em] uppercase hover:bg-crema/90 transition-colors text-center"
              >
                {t.auth.requestNewResetLink}
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-light text-crema tracking-tight">
                {t.auth.setNewPassword}
              </h1>
              <p className="text-sm text-gris/60 mt-2 mb-6">
                {t.auth.setNewPasswordDesc}
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3 bg-error/10 border border-error/30 text-error text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-medium text-gris uppercase tracking-widest">
                    {t.auth.newPassword}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gris/50" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t.auth.newPasswordPlaceholder}
                      className="w-full pl-10 pr-4 py-3 bg-transparent border border-gris/30 text-crema text-sm placeholder:text-gris/40 focus:outline-none focus:border-crema/50 transition-colors"
                      minLength={8}
                      required
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gris/40">{t.auth.passwordHint}</p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-xs font-medium text-gris uppercase tracking-widest">
                    {t.auth.confirmPassword}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gris/50" />
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t.auth.newPasswordPlaceholder}
                      className="w-full pl-10 pr-4 py-3 bg-transparent border border-gris/30 text-crema text-sm placeholder:text-gris/40 focus:outline-none focus:border-crema/50 transition-colors"
                      minLength={8}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-crema text-carbon text-sm font-medium tracking-[0.1em] uppercase hover:bg-crema/90 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.auth.updatingPassword}
                    </span>
                  ) : (
                    t.auth.updatePassword
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
