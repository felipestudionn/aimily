'use client';

import React, { useState } from 'react';
import { ArrowLeft, Mail, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/i18n';

export default function ForgotPasswordPage() {
  const t = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSent(true);
      }
    } catch {
      setError(t.common.unexpectedError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-carbon flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gris/60 hover:text-crema transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.auth.backToHome}
        </Link>

        <div className="border border-gris/20 p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h1 className="text-2xl font-light text-crema tracking-tight">
                {t.auth.resetLinkSent}
              </h1>
              <p className="text-sm text-gris/60">
                {t.auth.resetLinkSentDesc} <strong className="text-crema">{email}</strong>.
                {' '}{t.auth.resetLinkSentFollow}
              </p>
              <p className="text-xs text-gris/40">
                {t.auth.resetLinkDidntReceive}{' '}
                <button
                  onClick={() => { setSent(false); setError(null); }}
                  className="text-crema underline hover:text-crema/80"
                >
                  {t.auth.resetLinkTryAgain}
                </button>
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-light text-crema tracking-tight">
                {t.auth.resetPassword}
              </h1>
              <p className="text-sm text-gris/60 mt-2 mb-6">
                {t.auth.resetPasswordDesc}
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3 bg-error/10 border border-error/30 text-error text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-medium text-gris uppercase tracking-widest">
                    {t.auth.emailLabel}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gris/50" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.auth.emailPlaceholder}
                      className="w-full pl-10 pr-4 py-3 bg-transparent border border-gris/30 text-crema text-sm placeholder:text-gris/40 focus:outline-none focus:border-crema/50 transition-colors"
                      required
                      autoFocus
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
                      {t.auth.sendingResetLink}
                    </span>
                  ) : (
                    t.auth.sendResetLink
                  )}
                </button>
              </form>

              <div className="text-center text-sm text-gris/50 mt-6">
                {t.auth.rememberPassword}{' '}
                <Link href="/" className="text-crema font-medium hover:text-crema/80 transition-colors">
                  {t.auth.backToSignIn}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
