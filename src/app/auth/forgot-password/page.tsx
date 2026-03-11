'use client';

import React, { useState, useRef } from 'react';
import { ArrowLeft, Mail, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { createClient } from '@/lib/supabase/client';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (TURNSTILE_SITE_KEY && !captchaToken) {
        setError('Please complete the security check');
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        captchaToken: captchaToken || undefined,
      });

      if (error) {
        setError(error.message);
        turnstileRef.current?.reset();
        setCaptchaToken(null);
      } else {
        setSent(true);
      }
    } catch {
      setError('An unexpected error occurred');
      turnstileRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff6dc] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-carbon/60 hover:text-carbon transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="bg-white border border-carbon/10 p-8">
          {sent ? (
            /* Success state */
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <h1 className="text-2xl font-light text-carbon tracking-tight">
                Check your email
              </h1>
              <p className="text-sm text-carbon/60">
                We sent a password reset link to <strong className="text-carbon">{email}</strong>.
                Click the link in the email to reset your password.
              </p>
              <p className="text-xs text-carbon/40">
                Didn&apos;t receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => { setSent(false); setError(null); }}
                  className="text-carbon underline hover:text-carbon/80"
                >
                  try again
                </button>
              </p>
            </div>
          ) : (
            /* Form state */
            <>
              <h1 className="text-2xl font-light text-carbon tracking-tight">
                Reset your password
              </h1>
              <p className="text-sm text-carbon/60 mt-2 mb-6">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-medium text-carbon/70 uppercase tracking-widest">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-carbon/30" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 bg-transparent border border-carbon/20 text-carbon text-sm placeholder:text-carbon/30 focus:outline-none focus:border-carbon/50 transition-colors"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {TURNSTILE_SITE_KEY && (
                  <div className="flex justify-center">
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={TURNSTILE_SITE_KEY}
                      onSuccess={(token) => setCaptchaToken(token)}
                      onExpire={() => setCaptchaToken(null)}
                      options={{ theme: 'light', size: 'flexible' }}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-carbon text-crema text-sm font-medium tracking-[0.1em] uppercase hover:bg-carbon/90 transition-colors disabled:opacity-50"
                  disabled={loading || (!!TURNSTILE_SITE_KEY && !captchaToken)}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </form>

              <div className="text-center text-sm text-carbon/50 mt-6">
                Remember your password?{' '}
                <Link href="/" className="text-carbon font-medium hover:text-carbon/80 transition-colors">
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
