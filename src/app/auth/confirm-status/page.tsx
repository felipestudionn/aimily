'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/i18n';

export default function ConfirmPage() {
  const t = useTranslation();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resendSent, setResendSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    // Check if the user is already authenticated (confirmation was handled by callback)
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user?.email_confirmed_at) {
        setStatus('success');
      } else if (user) {
        // User exists but email not confirmed yet
        setStatus('error');
        setError(t.auth.emailNotConfirmedYet);
        setResendEmail(user.email ?? '');
      } else {
        // No user — probably landed here directly
        setStatus('error');
        setError(t.auth.noSessionFound);
      }
    };

    // Small delay to allow auth state to settle after redirect
    const timer = setTimeout(checkAuth, 1000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResend = async () => {
    if (!resendEmail) return;
    setResendLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: resendEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setResendSent(true);
      }
    } catch {
      setError(t.auth.resendFailed);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff6dc] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-carbon/10 p-8 text-center">
          {status === 'verifying' && (
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 text-carbon animate-spin mx-auto" />
              <h1 className="text-2xl font-light text-carbon tracking-tight">
                {t.auth.confirmingEmail}
              </h1>
              <p className="text-sm text-carbon/60">
                {t.auth.confirmingEmailDesc}
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <h1 className="text-2xl font-light text-carbon tracking-tight">
                {t.auth.emailConfirmed}
              </h1>
              <p className="text-sm text-carbon/60">
                {t.auth.emailConfirmedDesc}
              </p>
              <Link
                href="/my-collections"
                className="inline-block w-full py-3 bg-carbon text-crema text-sm font-medium tracking-[0.1em] uppercase hover:bg-carbon/90 transition-colors"
              >
                {t.auth.goToCollections}
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <XCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h1 className="text-2xl font-light text-carbon tracking-tight">
                {t.auth.confirmFailed}
              </h1>
              <p className="text-sm text-carbon/60">
                {error}
              </p>

              {resendEmail && !resendSent && (
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="inline-flex items-center justify-center gap-2 w-full py-3 bg-carbon text-crema text-sm font-medium tracking-[0.1em] uppercase hover:bg-carbon/90 transition-colors disabled:opacity-50"
                >
                  {resendLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.auth.resendSending}
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      {t.auth.resendConfirmationEmail}
                    </>
                  )}
                </button>
              )}

              {resendSent && (
                <p className="text-sm text-green-600">
                  {t.auth.resendSent}
                </p>
              )}

              <Link
                href="/"
                className="inline-block text-sm text-carbon/60 hover:text-carbon transition-colors"
              >
                {t.auth.backToHome}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
