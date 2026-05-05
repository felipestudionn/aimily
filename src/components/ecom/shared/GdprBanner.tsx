'use client';

/* GDPR cookie consent banner · auto-injected in storefront layout
   Uses localStorage to remember dismissal. Editorial styling via theme tokens. */

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'aimily-storefront-cookie-consent-v1';

export function GdprBanner() {
  const [visible, setVisible] = useState(false);
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'accepted' || stored === 'declined') {
        setHasConsent(stored === 'accepted');
        return;
      }
      // Show banner after a brief delay so it doesn't compete with hero
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    } catch {
      // localStorage blocked → show banner anyway
      setVisible(true);
    }
  }, []);

  const handleChoice = (accepted: boolean) => {
    try { localStorage.setItem(STORAGE_KEY, accepted ? 'accepted' : 'declined'); } catch {}
    setHasConsent(accepted);
    setVisible(false);
  };

  if (!visible || hasConsent !== null) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '1.5rem',
        right: '1.5rem',
        maxWidth: '640px',
        margin: '0 auto',
        zIndex: 100,
        background: 'var(--s-fg)',
        color: 'var(--s-bg)',
        padding: '1.5rem',
        borderRadius: 'var(--s-radius-card, 12px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.18)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        fontFamily: 'var(--s-body-font)',
      }}
    >
      <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.55, opacity: 0.9 }}>
        We use minimal cookies for analytics. Your data stays with the brand and aimily — never sold.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          onClick={() => handleChoice(false)}
          style={{
            background: 'transparent',
            color: 'inherit',
            border: '1px solid color-mix(in oklab, var(--s-bg) 30%, transparent)',
            padding: '0.5rem 1.25rem',
            borderRadius: 'var(--s-radius-button)',
            fontSize: '12px',
            letterSpacing: '0.05em',
            cursor: 'pointer',
            fontFamily: 'var(--s-body-font)',
          }}
        >
          Decline
        </button>
        <button
          onClick={() => handleChoice(true)}
          style={{
            background: 'var(--s-bg)',
            color: 'var(--s-fg)',
            border: 'none',
            padding: '0.5rem 1.25rem',
            borderRadius: 'var(--s-radius-button)',
            fontSize: '12px',
            letterSpacing: '0.05em',
            cursor: 'pointer',
            fontWeight: 600,
            fontFamily: 'var(--s-body-font)',
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
