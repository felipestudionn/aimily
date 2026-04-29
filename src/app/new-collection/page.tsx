'use client';

/* ═══════════════════════════════════════════════════════════════════════
   /new-collection — single-screen, single-decision entry to the tool.

   1. Land → see the 40-week timeline visualised as 4 colored bands.
   2. Adjust launch date inline (only required field).
   3. Click "Empezar" → bands morph (Framer Motion `layoutId`) into the
      4 block cards of the Collection Overview.
   4. After morph, navigate to /collection/[id]. Same 4 cards, same
      colors, same positions — the user has already arrived.

   We never ask for: collection name, season, brief, or anything else.
   The collection is created with a placeholder name ("Sin título · SS27"
   auto-derived from the launch date). Everything else flows from the
   Collection Overview blocks themselves.
   ═══════════════════════════════════════════════════════════════════════ */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
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

/** Derive SS/FW season label from launch date. SS = Feb–Jul, FW = Aug–Jan. */
function deriveSeason(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth(); // 0 = Jan
  const isFW = month >= 7 || month === 0; // Aug–Jan → FW of that year
  const yearTwoDigit = String(d.getFullYear()).slice(2);
  return `${isFW ? 'FW' : 'SS'}${yearTwoDigit}`;
}

/** Default placeholder name. The user can rename inline later. */
function defaultName(season: string, untitledLabel: string): string {
  return `${untitledLabel} · ${season}`;
}

type View = 'pick-date' | 'creating' | 'morphing';

function NewCollectionFlow() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = useTranslation();
  const { language } = useLanguage();

  const [view, setView] = useState<View>('pick-date');
  const [launchDate, setLaunchDate] = useState(defaultLaunchDate());
  const [showAuth, setShowAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const season = useMemo(() => deriveSeason(launchDate), [launchDate]);

  const nc = (t as Record<string, Record<string, string>>).newCollection || {};
  const untitledLabel = nc.untitled || 'Sin título';
  const headline = nc.headline || 'Cuándo lanzas.';
  const subheadline = nc.subheadline || 'Lo demás ya lo construimos juntos.';
  const launchLabel = nc.launchLabel || 'Lanzamiento';
  const startCta = nc.start || 'Empezar';
  const cancel = nc.cancel || 'Cancelar';
  const creatingCopy = nc.creating || 'Preparando tu colección…';

  // Open the auth modal if the user lands here unauthenticated.
  useEffect(() => {
    if (!authLoading && !user) setShowAuth(true);
  }, [authLoading, user]);

  const handleStart = useCallback(async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setError(null);
    setView('creating');

    try {
      track(Events.COLLECTION_CREATED, { source: 'new-collection-disruptive' });
      const res = await fetch('/api/planner/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: defaultName(season, untitledLabel),
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

      // Trigger the morph: bands → cards, then route to the real overview.
      setView('morphing');
      // Spring animation runs ~1s. Give a beat at the landed state, then route.
      setTimeout(() => {
        router.push(`/collection/${plan.id}`);
      }, 1100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'create_failed');
      setView('pick-date');
    }
  }, [user, launchDate, season, untitledLabel, router]);

  const onLaunchDateChange = useCallback((iso: string) => {
    if (!iso) return;
    // Reject dates in the past
    if (new Date(iso).getTime() <= Date.now()) return;
    setLaunchDate(iso);
  }, []);

  return (
    <div className="min-h-screen bg-shade flex flex-col">
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-6 md:px-10 lg:px-14 py-6">
        <span className="text-[18px] font-semibold text-carbon tracking-[-0.02em]">aimily</span>
        <button
          onClick={() => router.push('/my-collections')}
          className="flex items-center gap-2 text-[12px] tracking-[0.16em] uppercase text-carbon/40 hover:text-carbon transition-colors"
          aria-label={cancel}
        >
          {cancel}
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* ── Main canvas ── */}
      <main className="flex-1 flex items-center justify-center px-4 md:px-10 lg:px-14 pb-12">
        <LayoutGroup>
          <div className="w-full max-w-[1100px] mx-auto">
            <AnimatePresence mode="wait">
              {/* Headline appears in pick-date and morphing, fades during creating */}
              {(view === 'pick-date' || view === 'morphing') && (
                <motion.header
                  key="headline"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                  className="text-center mb-10 md:mb-14"
                >
                  <h1 className="text-[40px] md:text-[56px] font-semibold text-carbon tracking-[-0.04em] leading-[1.05]">
                    {headline}
                  </h1>
                  <p className="mt-3 text-[16px] md:text-[18px] text-carbon/55 italic tracking-[-0.01em]">
                    {subheadline}
                  </p>
                </motion.header>
              )}
            </AnimatePresence>

            {/* The bands → cards (always rendered to keep layoutId stable) */}
            <div className="mb-10">
              <TimelinePreview
                launchDate={launchDate}
                language={language}
                asCards={view === 'morphing'}
              />
            </div>

            {/* Date picker chip + CTA — only visible in pick-date */}
            <AnimatePresence>
              {view === 'pick-date' && (
                <motion.div
                  key="controls"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                  className="flex flex-col items-center gap-8"
                >
                  <label className="flex items-center gap-3 px-5 py-3 bg-white rounded-full border border-carbon/[0.08] text-[14px] text-carbon shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                    <Calendar className="h-4 w-4 text-carbon/50" />
                    <span className="text-carbon/50">{launchLabel}:</span>
                    <input
                      type="date"
                      value={launchDate}
                      onChange={(e) => onLaunchDateChange(e.target.value)}
                      min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                      className="bg-transparent border-0 outline-none font-medium text-carbon text-[14px] cursor-pointer"
                    />
                  </label>

                  <button
                    onClick={handleStart}
                    className="inline-flex items-center justify-center gap-2 rounded-full px-9 py-4 text-[14px] font-semibold bg-carbon text-crema hover:bg-carbon/90 transition-all hover:scale-[1.02] active:scale-[0.99] shadow-[0_4px_14px_rgba(0,0,0,0.08)]"
                  >
                    {startCta}
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  {error && (
                    <p className="text-[13px] text-[#A0463C]" role="alert">
                      {error}
                    </p>
                  )}
                </motion.div>
              )}

              {(view === 'creating' || view === 'morphing') && (
                <motion.div
                  key="creating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center justify-center gap-3 text-[13px] text-carbon/50 mt-6"
                >
                  {view === 'creating' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{creatingCopy}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </LayoutGroup>
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
