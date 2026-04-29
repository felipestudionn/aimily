'use client';

/* ═══════════════════════════════════════════════════════════════════════
   /new-collection — single-screen, single-decision entry to the tool.

   1. Land → see the 40-week timeline as 4 colored bands.
   2. Adjust launch date inline (the only required field).
   3. Click "Empezar" → the canvas fades, then we navigate to the real
      /collection/[id] where the WorkspaceShell takes over.

   Plain fade transition. No layout morph — that turned out to be too
   fragile across the heavy WorkspaceShell mount, so we keep the entry
   simple and reliable: the bands fade out, the wizard loads.
   ═══════════════════════════════════════════════════════════════════════ */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Loader2, X, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import SubscriptionGate from '@/components/billing/SubscriptionGate';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { TimelinePreview } from '@/components/new-collection/TimelinePreview';
import { track, Events } from '@/lib/posthog';

/** Default launch ≈ 6 months from today, snapped to the 1st of the month. */
function defaultLaunchDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

/**
 * Derive SS/FW season label from launch date using fashion industry
 * convention:
 *   • Feb–Jul launch → SS of that calendar year (e.g. "SS27").
 *   • Aug–Dec launch → FW of that calendar year (e.g. "FW26").
 *   • Jan launch    → FW of the *previous* year — that's the tail of the
 *                     prior FW capsule still selling through, not the
 *                     start of a new one.
 */
function deriveSeason(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth(); // 0 = Jan
  const year = d.getFullYear();
  if (month === 0) return `FW${String(year - 1).slice(2)}`;
  if (month >= 7) return `FW${String(year).slice(2)}`;
  return `SS${String(year).slice(2)}`;
}

function defaultName(season: string, untitledLabel: string): string {
  return `${untitledLabel} · ${season}`;
}

type View = 'pick-date' | 'leaving';

function NewCollectionFlow() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = useTranslation();
  const { language } = useLanguage();

  const [view, setView] = useState<View>('pick-date');
  const [launchDate, setLaunchDate] = useState(defaultLaunchDate());
  const [name, setName] = useState('');
  const [skipNaming, setSkipNaming] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const season = useMemo(() => deriveSeason(launchDate), [launchDate]);
  const trimmedName = name.trim();
  const canStart = trimmedName.length > 0 || skipNaming;

  const nc = (t as Record<string, Record<string, string>>).newCollection || {};
  const untitledLabel = nc.untitled || 'Sin título';
  const headline = nc.headline || 'El día del lanzamiento de la colección.';
  const subheadline = nc.subheadline || 'Lo demás ya lo construimos juntos.';
  const launchLabel = nc.launchLabel || 'Lanzamiento';
  const namePlaceholder = nc.namePlaceholder || 'Cómo se llama tu colección';
  const skipNamingCta = nc.skipNaming || 'Aún no tengo título — ponedlo después';
  const namingSkipped = nc.namingSkipped || 'La nombras dentro';
  const startCta = nc.start || 'Empezar';
  const cancel = nc.cancel || 'Cancelar';
  const creatingCopy = nc.creating || 'Preparando tu colección…';

  useEffect(() => {
    if (!authLoading && !user) setShowAuth(true);
  }, [authLoading, user]);

  const handleStart = useCallback(async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (!canStart) return;
    setError(null);
    setCreating(true);

    // If the user typed a title, use it. Otherwise (only when they
    // explicitly opted out of naming) fall back to "Sin título · SS27".
    const finalName = trimmedName.length > 0
      ? trimmedName
      : defaultName(season, untitledLabel);

    try {
      track(Events.COLLECTION_CREATED, {
        source: 'new-collection-disruptive',
        named_at_creation: trimmedName.length > 0,
      });
      const res = await fetch('/api/planner/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalName,
          season,
          launch_date: launchDate,
          setup_data: {},
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'create_failed');
      }

      const plan = await res.json();

      // Fade the canvas out, then navigate. Plain transition.
      setView('leaving');
      setTimeout(() => {
        router.push(`/collection/${plan.id}`);
      }, 450);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'create_failed');
      setCreating(false);
    }
  }, [user, canStart, trimmedName, launchDate, season, untitledLabel, router]);

  const onLaunchDateChange = useCallback((iso: string) => {
    if (!iso) return;
    if (new Date(iso).getTime() <= Date.now()) return;
    setLaunchDate(iso);
  }, []);

  return (
    <div className="min-h-screen bg-shade flex flex-col">
      <header className="flex items-center justify-between px-6 md:px-10 lg:px-14 py-6">
        <span className="text-[18px] font-normal text-carbon tracking-[-0.02em]">aimily</span>
        <button
          onClick={() => router.push('/my-collections')}
          className="flex items-center gap-2 text-[12px] tracking-[0.16em] uppercase text-carbon/40 hover:text-carbon transition-colors"
          aria-label={cancel}
        >
          {cancel}
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 md:px-10 lg:px-14 pb-12">
        <AnimatePresence mode="wait">
          {view === 'pick-date' && (
            <motion.div
              key="canvas"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="w-full max-w-[1100px] mx-auto"
            >
              <div className="text-center mb-10 md:mb-14">
                <h1 className="text-[40px] md:text-[56px] font-semibold text-carbon tracking-[-0.04em] leading-[1.05]">
                  {headline}
                </h1>
                <p className="mt-3 text-[16px] md:text-[18px] text-carbon/55 italic tracking-[-0.01em]">
                  {subheadline}
                </p>
              </div>

              {/* Name field — first creative moment. The user writes a
                  title before doing anything else; if they truly don't
                  have one yet they tap "skip" below to fall back to the
                  default placeholder. */}
              <div className="flex flex-col items-center gap-2 mb-10">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={namePlaceholder}
                  maxLength={120}
                  autoFocus
                  disabled={creating || skipNaming}
                  className="w-full max-w-[640px] text-center bg-transparent border-0 border-b border-carbon/[0.10] focus:border-carbon/40 outline-none text-[28px] md:text-[34px] font-medium text-carbon tracking-[-0.02em] leading-[1.2] placeholder:text-carbon/30 transition-colors py-2 disabled:opacity-50"
                />
                {trimmedName.length === 0 && !skipNaming && (
                  <button
                    type="button"
                    onClick={() => setSkipNaming(true)}
                    className="text-[12px] text-carbon/40 hover:text-carbon/70 italic tracking-[-0.01em] transition-colors mt-2"
                  >
                    {skipNamingCta}
                  </button>
                )}
                {skipNaming && (
                  <button
                    type="button"
                    onClick={() => setSkipNaming(false)}
                    className="text-[12px] text-carbon/40 hover:text-carbon/70 italic tracking-[-0.01em] transition-colors mt-2"
                  >
                    {namingSkipped}
                  </button>
                )}
              </div>

              <div className="mb-10">
                <TimelinePreview launchDate={launchDate} language={language} asCards={false} />
              </div>

              <div className="flex flex-col items-center gap-3">
                <label className="flex items-center gap-3 px-5 py-3 bg-white rounded-full border border-carbon/[0.08] text-[14px] text-carbon shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                  <Calendar className="h-4 w-4 text-carbon/50" />
                  <span className="text-carbon/50">{launchLabel}:</span>
                  <input
                    type="date"
                    value={launchDate}
                    onChange={(e) => onLaunchDateChange(e.target.value)}
                    min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                    className="bg-transparent border-0 outline-none font-medium text-carbon text-[14px] cursor-pointer"
                    disabled={creating}
                  />
                </label>

                <p className="text-[12px] text-carbon/45 italic tracking-[-0.01em]">
                  {(nc.seasonLabel || 'Temporada')}: <span className="not-italic font-medium text-carbon/65">{season}</span>
                </p>
              </div>

              <div className="mt-8 flex flex-col items-center gap-8">

                <button
                  onClick={handleStart}
                  disabled={creating || !canStart}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-9 py-4 text-[14px] font-semibold bg-carbon text-crema hover:bg-carbon/90 transition-all hover:scale-[1.02] active:scale-[0.99] shadow-[0_4px_14px_rgba(0,0,0,0.08)] disabled:opacity-30 disabled:hover:scale-100"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {creatingCopy}
                    </>
                  ) : (
                    <>
                      {startCta}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                {error && (
                  <p className="text-[13px] text-[#A0463C]" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {view === 'leaving' && (
            <motion.div
              key="leaving"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="flex items-center gap-3 text-[14px] text-carbon/50"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              {creatingCopy}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AuthModal
        isOpen={showAuth}
        defaultMode="signup"
        onClose={() => setShowAuth(false)}
        onSuccess={() => setShowAuth(false)}
      />
    </div>
  );
}

export default function NewCollectionPage() {
  return (
    <SubscriptionGate>
      <NewCollectionFlow />
    </SubscriptionGate>
  );
}
