'use client';

import { useState } from 'react';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { HorizontalSlideshow } from '@/components/how-it-works/HorizontalSlideshow';
import { PublicNav } from '@/components/layout/PublicNav';

export default function HowItWorksPage() {
  const t = useTranslation();
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  return (
    <div className="bg-carbon min-h-screen">
      <PublicNav onAuth={(mode) => openAuth(mode)} />

      {/* Slideshow */}
      <HorizontalSlideshow mode="page" t={t.howItWorksPage} />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authMode}
      />
    </div>
  );
}
