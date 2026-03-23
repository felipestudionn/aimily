'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n';
import { useLanguage, type Language } from '@/contexts/LanguageContext';

interface PublicNavProps {
  /** 'dark' for carbon pages, 'light' for legal pages (privacy/terms/cookies) */
  variant?: 'dark' | 'light';
  /** Callback to open auth modal — if provided, shows login/signup buttons */
  onAuth?: (mode: 'signin' | 'signup') => void;
}

const NAV_LINKS = [
  { href: '/discover', key: 'discover' },
  { href: '/how-it-works', key: 'howAimilyWorks' },
  { href: '/contact', key: 'contact' },
  { href: '/trust', key: 'trust' },
];

export function PublicNav({ variant = 'dark', onAuth }: PublicNavProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const t = useTranslation();
  const { language, setLanguage } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const trust = (t as Record<string, Record<string, string>>).trust || {};

  const isDark = variant === 'dark';
  const logo = isDark ? '/images/aimily-logo-white.png' : '/images/aimily-logo-black.png';

  const navLabelMap: Record<string, string> = {
    discover: t.common.discover,
    howAimilyWorks: t.common.howAimilyWorks,
    contact: t.common.contact,
    trust: trust.navLabel || 'Trust',
  };

  // Colors
  const bg = isDark ? 'bg-carbon/80 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm border-b border-gray-100';
  const textBase = isDark ? 'text-gris/60' : 'text-gray-400';
  const textActive = isDark ? 'text-crema' : 'text-gray-900';
  const textHover = isDark ? 'hover:text-crema' : 'hover:text-gray-900';
  const selectBorder = isDark ? 'border-gris/20' : 'border-gray-200';
  const selectText = isDark ? 'text-crema' : 'text-gray-700';
  const optionBg = isDark ? '[&>option]:bg-carbon [&>option]:text-crema' : '';
  const btnFilled = isDark
    ? 'bg-crema text-carbon hover:bg-crema/90'
    : 'bg-carbon text-crema hover:bg-carbon/90';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-5 ${bg}`}>
      {/* Desktop */}
      <div className="hidden md:flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <Image src={logo} alt="aimily" width={774} height={96}
              className="object-contain h-5 w-auto" priority unoptimized />
          </Link>
          <div className="flex items-center gap-6">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link key={link.href} href={link.href}
                  className={`text-xs font-medium tracking-widest uppercase transition-colors ${
                    isActive ? textActive : `${textBase} ${textHover}`
                  }`}>
                  {navLabelMap[link.key]}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}
            className={`bg-transparent text-[10px] font-semibold tracking-[0.12em] uppercase cursor-pointer border ${selectBorder} rounded px-2 py-1 ${selectText} focus:outline-none ${optionBg}`}>
            <option value="en">EN</option><option value="es">ES</option><option value="fr">FR</option>
            <option value="it">IT</option><option value="de">DE</option><option value="pt">PT</option>
            <option value="nl">NL</option><option value="sv">SV</option><option value="no">NO</option>
          </select>

          {user ? (
            <Link href="/my-collections"
              className={`text-xs font-medium tracking-widest uppercase ${textActive} ${textHover} transition-colors`}>
              {t.common.myCollections}
            </Link>
          ) : onAuth ? (
            <>
              <button onClick={() => onAuth('signin')}
                className={`text-xs font-medium tracking-widest uppercase ${textBase} ${textHover} transition-colors`}>
                {t.common.logIn}
              </button>
              <button onClick={() => onAuth('signup')}
                className={`${btnFilled} text-xs font-medium tracking-widest uppercase px-5 py-2.5 transition-colors`}>
                {t.common.startFreeTrial}
              </button>
            </>
          ) : (
            <Link href="/"
              className={`text-xs font-medium tracking-widest uppercase ${textBase} ${textHover} transition-colors`}>
              {t.common.home}
            </Link>
          )}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src={logo} alt="aimily" width={774} height={96}
            className="object-contain h-4 w-auto" priority unoptimized />
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)}
          className={`${textBase} ${textHover} transition-colors p-1`} aria-label="Menu">
          {mobileOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className={`md:hidden mt-4 ${isDark ? 'bg-carbon/95 border-gris/20' : 'bg-white/95 border-gray-200'} backdrop-blur-sm border rounded-xl p-5 flex flex-col gap-4`}>
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                className={`text-sm font-medium tracking-widest uppercase transition-colors ${
                  isActive ? textActive : `${textBase} ${textHover}`
                }`}>
                {navLabelMap[link.key]}
              </Link>
            );
          })}
          <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}
            className={`bg-transparent text-xs font-semibold tracking-[0.12em] uppercase cursor-pointer border ${selectBorder} rounded px-3 py-1.5 ${selectText} focus:outline-none self-start ${optionBg}`}>
            <option value="en">EN</option><option value="es">ES</option><option value="fr">FR</option>
            <option value="it">IT</option><option value="de">DE</option><option value="pt">PT</option>
            <option value="nl">NL</option><option value="sv">SV</option><option value="no">NO</option>
          </select>
          <hr className={isDark ? 'border-gris/20' : 'border-gray-200'} />
          {user ? (
            <Link href="/my-collections" onClick={() => setMobileOpen(false)}
              className={`text-sm font-medium tracking-widest uppercase ${textActive} transition-colors`}>
              {t.common.myCollections}
            </Link>
          ) : onAuth ? (
            <>
              <button onClick={() => { onAuth('signin'); setMobileOpen(false); }}
                className={`text-sm font-medium tracking-widest uppercase ${textBase} ${textHover} transition-colors text-left`}>
                {t.common.logIn}
              </button>
              <button onClick={() => { onAuth('signup'); setMobileOpen(false); }}
                className={`${btnFilled} text-sm font-medium tracking-widest uppercase px-5 py-2.5 transition-colors text-center`}>
                {t.common.startFreeTrial}
              </button>
            </>
          ) : (
            <Link href="/" onClick={() => setMobileOpen(false)}
              className={`text-sm font-medium tracking-widest uppercase ${textBase} ${textHover} transition-colors`}>
              {t.common.home}
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
