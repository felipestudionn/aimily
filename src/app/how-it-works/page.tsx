'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { HorizontalSlideshow } from '@/components/how-it-works/HorizontalSlideshow';

export default function HowItWorksPage() {
  const { language, setLanguage } = useLanguage();
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
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-carbon/80 backdrop-blur-sm border-b border-gris/10">
        <div className="max-w-7xl mx-auto px-6 flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/aimily-logo-white.png"
              alt="aimily"
              width={774}
              height={96}
              className="object-contain h-5 w-auto opacity-50 hover:opacity-80 transition-opacity"
              priority
              unoptimized
            />
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6">
              <Link href="/discover" className="text-gris/50 text-xs font-medium tracking-[0.15em] uppercase hover:text-crema transition-colors">
                {t.common.discover}
              </Link>
              <Link href="/meet-aimily" className="text-gris/50 text-xs font-medium tracking-[0.15em] uppercase hover:text-crema transition-colors">
                {t.common.meetAimily}
              </Link>
              <Link href="/contact" className="text-gris/50 text-xs font-medium tracking-[0.15em] uppercase hover:text-crema transition-colors">
                {t.common.contact}
              </Link>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-transparent text-[10px] font-semibold tracking-[0.12em] uppercase cursor-pointer border border-crema/20 rounded px-2 py-1 text-crema transition-colors focus:outline-none [&>option]:bg-carbon [&>option]:text-crema"
            >
              <option value="en">EN</option>
              <option value="es">ES</option>
              <option value="fr">FR</option>
              <option value="it">IT</option>
              <option value="de">DE</option>
              <option value="pt">PT</option>
              <option value="nl">NL</option>
              <option value="sv">SV</option>
              <option value="no">NO</option>
            </select>
            {user ? (
              <Link
                href="/my-collections"
                className="text-crema text-xs font-medium tracking-[0.1em] uppercase hover:text-crema/80 transition-colors"
              >
                {t.common.myCollections}
              </Link>
            ) : (
              <>
                <button
                  onClick={() => openAuth('signin')}
                  className="hidden md:block text-crema/70 text-xs font-medium tracking-[0.1em] uppercase hover:text-crema transition-colors"
                >
                  {t.common.logIn}
                </button>
                <button
                  onClick={() => openAuth('signup')}
                  className="px-4 py-2 bg-crema text-carbon text-xs font-medium tracking-[0.1em] uppercase hover:bg-crema/90 transition-colors"
                >
                  {t.common.startFreeTrial}
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

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
