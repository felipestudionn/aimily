'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const COOKIE_CONSENT_KEY = 'aimily-cookie-consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] p-4 sm:p-6">
      <div className="mx-auto max-w-3xl bg-carbon border border-gris/20 p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 text-sm text-gris/80 leading-relaxed">
            We use essential cookies to keep you signed in and functional cookies to improve your experience.{' '}
            <Link href="/cookies" className="text-crema underline hover:text-crema/80 transition-colors">
              Cookie Policy
            </Link>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={decline}
              className="px-4 py-2 text-xs font-medium text-gris/60 uppercase tracking-widest hover:text-crema transition-colors"
            >
              Decline
            </button>
            <button
              onClick={accept}
              className="px-5 py-2 bg-crema text-carbon text-xs font-medium uppercase tracking-widest hover:bg-crema/90 transition-colors"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
