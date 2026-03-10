'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // If already authenticated, redirect to collections
  if (user) {
    router.push('/my-collections');
    return null;
  }

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-carbon overflow-hidden">
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl">
        {/* Logo / Brand */}
        <h1 className="text-crema text-[clamp(3rem,8vw,6rem)] font-light tracking-tight leading-[0.95] mb-6 animate-fade-in-up">
          OLAWAVE
        </h1>

        <p className="text-gris text-lg md:text-xl font-light tracking-wide leading-relaxed max-w-xl mb-12 animate-fade-in-up animate-delay-100">
          Plan, design, and launch your fashion collection.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up animate-delay-200">
          <button
            onClick={() => openAuth('signup')}
            className="btn-primary px-10 py-4 text-sm tracking-[0.15em]"
          >
            GET STARTED
          </button>
          <button
            onClick={() => openAuth('signin')}
            className="btn-secondary px-10 py-4 text-sm tracking-[0.15em]"
          >
            SIGN IN
          </button>
        </div>
      </div>

      {/* Bottom line accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gris/20" />

      {/* Auth */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => router.push('/my-collections')}
        defaultMode={authMode}
      />
    </div>
  );
}
