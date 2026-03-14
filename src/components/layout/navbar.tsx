"use client";

import Link from "next/link";
import Image from "next/image";
import { LogOut, Zap, User, FolderOpen } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n";
import { AuthModal } from "@/components/auth/AuthModal";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface NavbarProps {
  /** Slim mode for workspace context — logo in corner, minimal actions */
  variant?: 'default' | 'workspace' | 'workspace-dark';
}

export function Navbar({ variant = 'default' }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const { user, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const t = useTranslation();

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const LanguageToggle = ({ className = '' }: { className?: string }) => (
    <div className={`flex bg-transparent border border-current/20 overflow-hidden ${className}`}>
      <button
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 text-[10px] font-semibold tracking-wide transition-colors ${
          language === 'en' ? 'bg-current/20 opacity-100' : 'opacity-40 hover:opacity-70'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('es')}
        className={`px-2 py-1 text-[10px] font-semibold tracking-wide transition-colors ${
          language === 'es' ? 'bg-current/20 opacity-100' : 'opacity-40 hover:opacity-70'
        }`}
      >
        ES
      </button>
    </div>
  );

  // Slim workspace navbar — just logo + user avatar
  if (variant === 'workspace' || variant === 'workspace-dark') {
    const isDark = variant === 'workspace-dark';
    return (
      <div className={`fixed top-0 left-0 right-0 z-50 transition-colors ${
        isDark
          ? 'bg-transparent'
          : 'bg-white/80 backdrop-blur-sm border-b border-black/[0.04]'
      }`}>
        <div className="flex h-14 items-center justify-between px-5">
          <Link href="/my-collections" className="flex items-center">
            <Image
              src={isDark ? '/images/aimily-logo-white.png' : '/images/aimily-logo-black.png'}
              alt="aimily"
              width={774}
              height={96}
              className={`object-contain h-5 w-auto transition-opacity ${
                isDark ? 'opacity-50 hover:opacity-80' : 'opacity-40 hover:opacity-70'
              }`}
              priority
              unoptimized
            />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle className={isDark ? 'text-crema border-crema/20' : 'text-carbon border-carbon/20'} />
            <NotificationBell />
            {user && (
              <Link
                href="/account"
                className={`w-7 h-7 flex items-center justify-center text-[11px] font-medium hover:opacity-80 transition-opacity ${
                  isDark ? 'bg-crema/20 text-crema' : 'bg-carbon text-crema'
                }`}
                title={t.common.account}
              >
                {user.email?.charAt(0).toUpperCase()}
              </Link>
            )}
          </div>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultMode={authMode}
        />
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-crema/80 backdrop-blur-sm animate-fade-in">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
      <div className="flex h-14 items-center">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/aimily-logo-black.png"
            alt="aimily"
            width={774}
            height={96}
            className="object-contain h-7 w-auto"
            priority
            unoptimized
          />
        </Link>
        <div className="ml-auto flex items-center gap-3">
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center px-4 py-2 text-texto/40 text-[11px] font-medium tracking-[0.08em] uppercase transition-all hover:text-texto/70"
                >
                  <Zap className="mr-1.5 h-3.5 w-3.5" />
                  {t.common.pricing}
                </Link>
                <NotificationBell />
                <LanguageToggle className="text-carbon border-carbon/20" />
                <Link
                  href="/account"
                  className="w-7 h-7 bg-carbon flex items-center justify-center text-crema text-[11px] font-medium hover:bg-carbon/80 transition-colors"
                  title={t.common.account}
                >
                  {user.email?.charAt(0).toUpperCase()}
                </Link>
                <button
                  onClick={() => signOut()}
                  className="p-1.5 text-texto/30 hover:text-texto/60 transition-colors"
                  title={t.common.signOut}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <LanguageToggle className="text-carbon border-carbon/20" />
                <button
                  onClick={() => openAuth('signin')}
                  className="inline-flex items-center justify-center px-4 py-2 text-texto/70 text-sm font-medium transition-all hover:text-texto"
                >
                  {t.common.logIn}
                </button>
                <button
                  onClick={() => openAuth('signup')}
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-carbon text-crema text-sm font-medium tracking-wide transition-all hover:bg-carbon/90"
                >
                  {t.common.startFreeTrial}
                </button>
              </>
            )}
          </div>
          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 w-9"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            )}
            <span className="sr-only">{t.common.toggleMenu}</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-sm border-b shadow-md">
          <div className="flex flex-col space-y-4 p-6">
            {user ? (
              <>
                <div className="flex items-center justify-between py-3 border-b border-gris/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-carbon flex items-center justify-center text-crema text-sm font-medium">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-texto">{user.email}</span>
                  </div>
                  <button
                    onClick={() => { signOut(); setMobileMenuOpen(false); }}
                    className="text-sm text-texto/50 hover:text-texto"
                  >
                    {t.common.signOut}
                  </button>
                </div>
                <Link href="/my-collections" className="flex items-center gap-2 py-2 text-base font-medium text-texto transition-colors hover:text-texto/70" onClick={() => setMobileMenuOpen(false)}>
                  <FolderOpen className="h-4 w-4" /> {t.common.myCollections}
                </Link>
                <Link href="/account" className="flex items-center gap-2 py-2 text-base font-medium text-texto transition-colors hover:text-texto/70" onClick={() => setMobileMenuOpen(false)}>
                  <User className="h-4 w-4" /> {t.common.account}
                </Link>
                <Link href="/pricing" className="flex items-center gap-2 py-2 text-base font-medium text-texto transition-colors hover:text-texto/70" onClick={() => setMobileMenuOpen(false)}>
                  <Zap className="h-4 w-4" /> {t.common.pricing}
                </Link>
              </>
            ) : (
              <>
                <button onClick={() => { openAuth('signin'); setMobileMenuOpen(false); }} className="flex items-center gap-2 py-2 text-base font-medium text-texto transition-colors hover:text-texto/70">
                  <User className="h-4 w-4" /> {t.common.logIn}
                </button>
              </>
            )}
            <div className="flex items-center gap-3 py-2">
              <LanguageToggle className="text-carbon border-carbon/20" />
            </div>
            <div className="pt-2">
              <button
                onClick={() => { openAuth('signup'); setMobileMenuOpen(false); }}
                className="w-full inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors bg-carbon text-crema shadow hover:bg-carbon/90 h-10 px-4 py-2"
              >
                {t.common.startFreeTrial}
              </button>
            </div>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authMode}
      />
      </div>
    </div>
  );
}
