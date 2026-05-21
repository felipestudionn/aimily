'use client';

/* ═══════════════════════════════════════════════════════════════════
   SiteFooter — single footer component used across all public pages.

   Replaces the per-page inline footers (each one had different links,
   different copy, different sizes). One source of truth: same links
   in the same order, same copyright, same DWP disclaimer.

   2026-05-21 fixes:
     - All hrefs auto-prefixed with the active locale so a click from
       /es/... doesn't strand visitors back on the English homepage.
     - Sign in / My collections entry exposed in the footer for the
       case where the visitor scrolled past the persistent nav and
       wants to log in from the bottom of the page.
   ═══════════════════════════════════════════════════════════════════ */

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n';

interface SiteFooterProps {
  variant?: 'dark' | 'light';
  /** Callback to open the auth modal (only used when no user is signed in). */
  onAuth?: (mode: 'signin' | 'signup') => void;
}

export function SiteFooter({ variant = 'dark', onAuth }: SiteFooterProps) {
  const isDark = variant === 'dark';
  const text = isDark ? 'text-crema/55' : 'text-carbon/55';
  const textHover = isDark ? 'hover:text-crema' : 'hover:text-carbon';
  const border = isDark ? 'border-crema/[0.08]' : 'border-carbon/[0.08]';
  const logoSrc = isDark ? '/images/aimily-logo-white.png' : '/images/aimily-logo-black.png';
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale ?? 'en';
  const { user } = useAuth();
  const t = useTranslation();
  const withLocale = (href: string) => `/${locale}${href === '/' ? '' : href}`;

  const links = [
    { href: '/in-season', label: 'In-Season' },
    { href: '/studio', label: 'Studio' },
    { href: '/contact', label: 'Contact' },
    { href: '/trust', label: 'Trust' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/terms', label: 'Terms' },
    { href: '/cookies', label: 'Cookies' },
  ];

  return (
    <footer className={`border-t ${border} px-6 py-12 md:py-16`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Left — logo + studionn */}
          <div className="flex items-center gap-3">
            <Image
              src={logoSrc}
              alt="aimily"
              width={774}
              height={96}
              className="object-contain h-4 w-auto opacity-70"
              unoptimized
            />
            <span className={`text-[13px] ${text} tracking-[-0.01em]`}>
              built by StudioNN Agency S.L., Alicante
            </span>
          </div>

          {/* Right — links + auth entry */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 justify-center">
            {links.map((link) => (
              <Link
                key={link.href}
                href={withLocale(link.href)}
                className={`text-[12px] ${text} ${textHover} tracking-[0.15em] uppercase font-medium transition-colors`}
              >
                {link.label}
              </Link>
            ))}
            {/* Auth pivot — second findable entry to sign in (the persistent
                nav has the primary one). Falls back to a regular link when
                no onAuth handler is wired, e.g. on legal pages. */}
            {user ? (
              <Link
                href="/my-collections"
                className={`text-[12px] ${text} ${textHover} tracking-[0.15em] uppercase font-medium transition-colors`}
              >
                {t.common.myCollections}
              </Link>
            ) : onAuth ? (
              <button
                onClick={() => onAuth('signin')}
                className={`text-[12px] ${text} ${textHover} tracking-[0.15em] uppercase font-medium transition-colors`}
              >
                {t.common.signIn}
              </button>
            ) : (
              <Link
                href={withLocale('/')}
                className={`text-[12px] ${text} ${textHover} tracking-[0.15em] uppercase font-medium transition-colors`}
              >
                {t.common.signIn}
              </Link>
            )}
          </div>
        </div>

        {/* Bottom row — copyright + DWP disclaimer */}
        <div className={`mt-8 pt-6 border-t ${border} flex flex-col md:flex-row items-center justify-between gap-3 text-[12px] ${text} tracking-[-0.01em]`}>
          <span>© {new Date().getFullYear()} aimily — StudioNN Agency S.L. · NIF B42978130</span>
          <span className="text-center md:text-right">
            Not affiliated with The Devil Wears Prada or NBCUniversal.
          </span>
        </div>
      </div>
    </footer>
  );
}
