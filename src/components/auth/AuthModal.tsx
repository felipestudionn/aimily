'use client';

import React, { useState } from 'react';
import { X, Loader2, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, onSuccess, defaultMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();

  // Reset mode when defaultMode changes
  React.useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message);
        } else {
          const { error: signInError } = await signIn(email, password);
          if (signInError) {
            setError('Account created! Please sign in.');
            setMode('signin');
          } else {
            onSuccess?.();
            onClose();
          }
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
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
                minLength={6}
                required
              />
            </div>
            {mode === 'signup' && (
              <p className="text-xs text-gris/50">Minimum 6 characters</p>
            )}
          </div>

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
