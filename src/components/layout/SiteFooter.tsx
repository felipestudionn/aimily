'use client';

/* ═══════════════════════════════════════════════════════════════════
   SiteFooter — single footer component used across all public pages.

   Replaces the per-page inline footers (each one had different links,
   different copy, different sizes). One source of truth: same five
   links in the same order, same copyright, same DWP disclaimer.
   ═══════════════════════════════════════════════════════════════════ */

import Link from 'next/link';
import Image from 'next/image';

interface SiteFooterProps {
  variant?: 'dark' | 'light';
}

export function SiteFooter({ variant = 'dark' }: SiteFooterProps) {
  const isDark = variant === 'dark';
  const text = isDark ? 'text-crema/55' : 'text-carbon/55';
  const textHover = isDark ? 'hover:text-crema' : 'hover:text-carbon';
  const border = isDark ? 'border-crema/[0.08]' : 'border-carbon/[0.08]';
  const logoSrc = isDark ? '/images/aimily-logo-white.png' : '/images/aimily-logo-black.png';

  const links = [
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

          {/* Right — links */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 justify-center">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[12px] ${text} ${textHover} tracking-[0.15em] uppercase font-medium transition-colors`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom row — copyright + DWP disclaimer */}
        <div className={`mt-8 pt-6 border-t ${border} flex flex-col md:flex-row items-center justify-between gap-3 text-[12px] ${text} tracking-[-0.01em]`}>
          <span>© {new Date().getFullYear()} aimily — StudioNN Agency S.L. · NIF B42978130</span>
          <span className="italic text-center md:text-right">
            Not affiliated with The Devil Wears Prada or NBCUniversal.
          </span>
        </div>
      </div>
    </footer>
  );
}
