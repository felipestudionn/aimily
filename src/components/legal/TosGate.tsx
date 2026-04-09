'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

const STORAGE_KEY = 'aimily_tos_accepted_v2';

/**
 * ToS Gate — full-screen modal that blocks usage until user accepts Terms of Service.
 * Stores acceptance in both localStorage (fast) and user_metadata (persistent).
 * Uses version key so we can re-prompt when Terms are materially updated.
 */
export function TosGate() {
  const { user } = useAuth();
  const t = useTranslation();
  const [showGate, setShowGate] = useState(false);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check localStorage first (fastest)
    if (localStorage.getItem(STORAGE_KEY) === 'true') return;

    // Check user_metadata
    if (user.user_metadata?.tos_accepted_v2) return;

    setShowGate(true);
  }, [user]);

  const accept = useCallback(async () => {
    if (!checked || saving) return;
    setSaving(true);

    localStorage.setItem(STORAGE_KEY, 'true');

    if (user) {
      try {
        const supabase = createClient();
        await supabase.auth.updateUser({
          data: { tos_accepted_v2: new Date().toISOString() },
        });
      } catch {
        // localStorage is the fallback
      }
    }

    setShowGate(false);
    setSaving(false);
  }, [user, checked, saving]);

  if (!showGate) return null;

  const tos = (t as Record<string, Record<string, string>>).tosGate || {};

  return (
    <div className="fixed inset-0 z-[200] bg-carbon/95 flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full p-8 space-y-6" style={{ borderRadius: '6px' }}>
        <div className="space-y-2">
          <h2 className="text-2xl font-light text-carbon tracking-tight">
            {tos.title || 'Terms of Service'}
          </h2>
          <p className="text-sm text-carbon/50 leading-relaxed">
            {tos.subtitle || 'Before you continue, please review and accept our Terms of Service and Privacy Policy.'}
          </p>
        </div>

        <div className="space-y-3 text-sm text-carbon/60 leading-relaxed">
          <p>{tos.summary1 || 'By using aimily, you acknowledge that AI-generated designs are provided as creative inspiration only. You are solely responsible for verifying intellectual property compliance before manufacturing or commercializing any product.'}</p>
          <p>{tos.summary2 || 'aimily acts exclusively as a technological tool and does not assume responsibility for the final products you create, manufacture, or sell.'}</p>
        </div>

        <div className="flex flex-col gap-3 text-xs text-carbon/40">
          <Link href="/terms" target="_blank" className="hover:text-carbon underline">
            {tos.readTerms || 'Read full Terms of Service'}
          </Link>
          <Link href="/privacy" target="_blank" className="hover:text-carbon underline">
            {tos.readPrivacy || 'Read Privacy Policy'}
          </Link>
        </div>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-carbon cursor-pointer"
          />
          <span className="text-sm text-carbon/70 leading-relaxed group-hover:text-carbon transition-colors">
            {tos.checkboxLabel || 'I have read and accept the Terms of Service and Privacy Policy.'}
          </span>
        </label>

        <button
          onClick={accept}
          disabled={!checked || saving}
          className="w-full py-3 bg-carbon text-crema text-sm font-medium tracking-[0.08em] uppercase hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ borderRadius: '6px' }}
        >
          {saving
            ? (tos.saving || 'Saving...')
            : (tos.acceptButton || 'Accept & Continue')}
        </button>
      </div>
    </div>
  );
}
