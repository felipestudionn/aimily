'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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

      {/* Discrete top navigation — cosmos.so style */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 md:px-10 py-5 animate-fade-in-up">
        <div className="flex items-center gap-6">
          <Link href="/discover" className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors">
            Discover
          </Link>
          <Link href="/contact" className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors">
            Contact
          </Link>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => openAuth('signin')}
            className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors"
          >
            Log in
          </button>
          <button
            onClick={() => openAuth('signup')}
            className="text-crema text-xs font-medium tracking-widest uppercase hover:text-crema/70 transition-colors"
          >
            Sign up
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl">
        {/* Logo */}
        <div className="mb-10 animate-fade-in-up w-full flex justify-center">
          <Image
            src="/images/aimily-logo-white.png"
            alt="aimily"
            width={500}
            height={500}
            className="object-contain w-[clamp(140px,35vw,336px)] h-auto brightness-[0.95] sepia-[0.15]"
            priority
          />
        </div>

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

      {/* Bottom legal links */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="flex items-center justify-center gap-6 py-5">
          <Link href="/terms" className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors">
            Privacy
          </Link>
          <Link href="/cookies" className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors">
            Cookies
          </Link>
        </div>
        <div className="h-px bg-gris/20" />
      </div>

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
