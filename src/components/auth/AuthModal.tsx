'use client';

import React, { useState } from 'react';
import { X, Loader2, Mail, Lock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultMode?: 'signin' | 'signup';
}

function getErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before signing in. Check your inbox.';
  }
  if (lower.includes('password') && lower.includes('weak')) {
    return 'Password is too weak. Use at least 8 characters with a number.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return message;
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/\d/.test(password)) return 'Password must contain at least 1 number';
  return null;
}

export function AuthModal({ isOpen, onClose, onSuccess, defaultMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();

  // Reset mode when defaultMode changes
  React.useEffect(() => {
    setMode(defaultMode);
    setSignupSuccess(false);
  }, [defaultMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        // Validate password before submitting
        const validationError = validatePassword(password);
        if (validationError) {
          setError(validationError);
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password);
        if (error) {
          setError(getErrorMessage(error.message));
        } else {
          setSignupSuccess(true);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(getErrorMessage(error.message));
        } else {
          onSuccess?.();
          onClose();
        }
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Post-signup success view
  if (signupSuccess) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative bg-carbon w-full max-w-md mx-auto overflow-hidden border border-gris/20">
          <div className="px-8 py-8 text-center space-y-4">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gris hover:text-crema transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-2xl font-light text-crema tracking-tight">
              Check your email
            </h2>
            <p className="text-sm text-gris/70">
              We sent a confirmation link to <strong className="text-crema">{email}</strong>.
              Click the link to activate your account.
            </p>
            <p className="text-xs text-gris/50">
              Didn&apos;t receive it? Check your spam folder or try signing up again.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-crema text-carbon text-sm font-medium tracking-[0.1em] uppercase hover:bg-crema/90 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal — Alfred editorial style */}
      <div className="relative bg-carbon w-full max-w-md mx-auto overflow-hidden border border-gris/20">
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gris hover:text-crema transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-light text-crema tracking-tight">
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gris/70 text-sm mt-1">
            {mode === 'signin'
              ? 'Sign in to access your collections'
              : 'Create an account to get started'}
          </p>
        </div>

        {/* Google Sign-In */}
        <div className="px-8 pt-4">
          <button
            type="button"
            onClick={async () => {
              setError(null);
              setGoogleLoading(true);
              const { error } = await signInWithGoogle();
              if (error) {
                setError(getErrorMessage(error.message));
                setGoogleLoading(false);
              }
            }}
            disabled={googleLoading || loading}
            className="w-full py-3 bg-transparent border border-gris/30 text-crema text-sm font-medium tracking-wide hover:bg-gris/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mt-5">
            <div className="flex-1 h-px bg-gris/20" />
            <span className="text-xs text-gris/50 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-gris/20" />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-8 pt-4 space-y-5">
          {error && (
            <div className="p-3 bg-error/10 border border-error/30 text-error text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-gris uppercase tracking-widest">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gris/50" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 bg-transparent border border-gris/30 text-crema text-sm placeholder:text-gris/40 focus:outline-none focus:border-crema/50 transition-colors"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-medium text-gris uppercase tracking-widest">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gris/50" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-transparent border border-gris/30 text-crema text-sm placeholder:text-gris/40 focus:outline-none focus:border-crema/50 transition-colors"
                minLength={mode === 'signup' ? 8 : 6}
                required
              />
            </div>
            {mode === 'signup' && (
              <p className="text-xs text-gris/50">Minimum 8 characters, at least 1 number</p>
            )}
          </div>

          {/* Forgot password link */}
          {mode === 'signin' && (
            <div className="text-right -mt-2">
              <Link
                href="/auth/forgot-password"
                onClick={onClose}
                className="text-xs text-gris/60 hover:text-crema transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-crema text-carbon text-sm font-medium tracking-[0.1em] uppercase hover:bg-crema/90 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : (
              mode === 'signin' ? 'Sign In' : 'Create Account'
            )}
          </button>

          <div className="text-center text-sm text-gris/60">
            {mode === 'signin' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); }}
                  className="text-crema hover:text-crema/80 font-medium transition-colors"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); }}
                  className="text-crema hover:text-crema/80 font-medium transition-colors"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
