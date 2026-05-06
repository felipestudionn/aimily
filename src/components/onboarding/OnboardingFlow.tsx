'use client';

/**
 * <OnboardingFlow />
 *
 * Two-screen onboarding shown at /welcome to brand-new users only.
 *
 *   Step 1 — Language picker (9 cards, click commits + advances)
 *   Step 2 — <EverythingInside /> editorial spread + final CTA
 *
 * On completion, marks subscriptions.onboarding_completed_at = NOW() via
 * /api/onboarding/complete and routes to /new-collection (CTA) or
 * /my-collections (skip).
 *
 * Style: bg-carbon dark, continuing the visual ritual of the welcome email.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from '@/i18n';
import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { EverythingInside } from './EverythingInside';

type Step = 1 | 2;

const ALL_LANGUAGES: Language[] = ['en', 'es', 'fr', 'it', 'de', 'pt', 'nl', 'sv', 'no'];

const STEP_STORAGE_KEY = 'aimily_welcome_step';

function readStoredStep(): Step | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STEP_STORAGE_KEY);
  if (raw === '1' || raw === '2') return Number(raw) as Step;
  return null;
}

interface Props {
  /** Full name from auth metadata, used to greet by first name on step 2. */
  fullName?: string | null;
  /** Pre-resolved language from the server (auth.users.user_metadata.language).
   *  When set, it means the user already picked a language in a previous
   *  visit — we can skip step 1 on a refresh. */
  initialLanguage?: string | null;
}

export function OnboardingFlow({ fullName, initialLanguage = null }: Props) {
  const router = useRouter();
  const t = useTranslation();
  const { language, setLanguage } = useLanguage();
  // Decide initial step based on (a) stored step from a previous unfinished
  // visit, (b) whether the user has already saved a language server-side
  // (means they crossed step 1 in a prior visit), (c) default 1.
  const [step, setStep] = useState<Step>(() => {
    const stored = readStoredStep();
    if (stored) return stored;
    if (initialLanguage) return 2;
    return 1;
  });
  const [saving, setSaving] = useState(false);
  // Tracks the user's pre-selected detected language so we can highlight
  // it on step 1 even if they haven't clicked yet.
  const [detected] = useState<Language>(language);

  // Keep <html lang> in sync immediately on language change so a hard reload
  // would restore the right dictionary. setLanguage already does this, but
  // we re-assert here as defensive.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Persist the current step so closing the browser mid-onboarding doesn't
  // dump the user back to step 1 when they return.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STEP_STORAGE_KEY, String(step));
  }, [step]);

  const firstName = (fullName || '').split(' ')[0] || '';

  async function complete(target: '/new-collection' | '/my-collections') {
    if (saving) return;
    setSaving(true);
    try {
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
    } catch {
      // Soft fail — server-side defensive redirect will still let them in.
    }
    // Onboarding done — clear the resume marker so the next user on this
    // browser (a refresh, a different test account, etc.) starts clean.
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STEP_STORAGE_KEY);
    }
    // Hard navigation so AuthContext / SubscriptionContext re-fetch fresh
    // user metadata (including the freshly written language).
    window.location.assign(target);
  }

  function handleLanguageClick(lang: Language) {
    setLanguage(lang);
    // Small delay so the user sees the selection commit before transition.
    setTimeout(() => setStep(2), 180);
  }

  return (
    <div className="min-h-screen bg-carbon text-crema">

      {/* Top bar — aimily logo + step counter
          On step 1 (language) the counter shows "1 of 2" / "Paso 1 de 2".
          On step 2 (deck) the counter is hidden because the carousel
          ships its own dot indicators along the bottom. */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 md:px-10 pt-8">
        <div className="flex items-center">
          <Image
            src="/images/aimily-logo-white.png"
            alt="aimily"
            width={84}
            height={28}
            className="opacity-70"
            priority
          />
        </div>
        {step === 1 && (
          <p className="text-[11px] tracking-[0.2em] uppercase text-crema/35">
            {t.welcome.progress.step
              .replace('{n}', String(step))
              .replace('{total}', '2')}
          </p>
        )}
      </header>

      {step === 1 && (
        <LanguageStep
          t={t.welcome.language}
          detected={detected}
          onPick={handleLanguageClick}
        />
      )}

      {step === 2 && (
        <EverythingInside
          t={t.welcome}
          variant="dark"
          showCta
          onCta={() => complete('/new-collection')}
          onSkip={() => complete('/my-collections')}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Step 1 — Language picker (9 cards, 3×3 grid)
   ───────────────────────────────────────────────────────────────── */

interface LanguageStepProps {
  t: ReturnType<typeof useTranslation>['welcome']['language'];
  detected: Language;
  onPick: (lang: Language) => void;
}

function LanguageStep({ t, detected, onPick }: LanguageStepProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 md:px-10 py-32">
      <div className="max-w-[760px] w-full">

        {/* Headline */}
        <h1
          className="font-light tracking-[-0.03em] leading-[1.1] text-[36px] md:text-[48px] text-crema text-center"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {t.headline}
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-[14px] md:text-[15px] text-crema/55 text-center max-w-[480px] mx-auto leading-relaxed">
          {t.subtitle}
        </p>

        {/* Detected hint */}
        <p className="mt-3 text-[11px] tracking-[0.2em] uppercase text-crema/30 text-center">
          {t.detected}
        </p>

        {/* 3×3 language grid */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ALL_LANGUAGES.map((lang) => {
            const isDetected = lang === detected;
            return (
              <button
                key={lang}
                type="button"
                onClick={() => onPick(lang)}
                className={`group rounded-[16px] py-5 px-6 text-center transition-all duration-200
                  hover:scale-[1.02] active:scale-[0.98]
                  ${
                    isDetected
                      ? 'bg-crema text-carbon'
                      : 'bg-crema/[0.04] text-crema border border-crema/[0.08] hover:bg-crema/[0.08] hover:border-crema/20'
                  }`}
              >
                <span
                  className="text-[18px] font-light tracking-[-0.02em]"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {t.languageNames[lang]}
                </span>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}
