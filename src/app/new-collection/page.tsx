'use client';

/* ═══════════════════════════════════════════════════════════════════════
   /new-collection — single-screen, single-decision entry to the tool.

   The morph stays inside this page: bands → cards in the same layout
   group, sidebar slides in from the left, headline fades up to title,
   and the URL silently updates to /collection/[id] via history API.
   No route navigation = no flash, the user feels they never left the
   screen — only that the tool revealed itself around them.
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
import { CollectionOverview } from '@/app/collection/[id]/CollectionOverview';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { createDefaultTimeline } from '@/lib/timeline-template';
import type { TimelineMilestone } from '@/types/timeline';
import type { CollectionPlan } from '@/types/planner';
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
  const month = d.getMonth();
  const isFW = month >= 7 || month === 0;
  const yearTwoDigit = String(d.getFullYear()).slice(2);
  return `${isFW ? 'FW' : 'SS'}${yearTwoDigit}`;
}

function defaultName(season: string, untitledLabel: string): string {
  return `${untitledLabel} · ${season}`;
}

type View = 'pick-date' | 'overview';

interface CreatedState {
  plan: CollectionPlan;
  timeline: {
    id: string;
    collection_plan_id: string;
    launch_date: string;
    milestones: TimelineMilestone[];
  };
}

function NewCollectionFlow() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = useTranslation();
  const { language } = useLanguage();

  const [view, setView] = useState<View>('pick-date');
  const [launchDate, setLaunchDate] = useState(defaultLaunchDate());
  const [showAuth, setShowAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedState | null>(null);

  const season = useMemo(() => deriveSeason(launchDate), [launchDate]);

  const nc = (t as Record<string, Record<string, string>>).newCollection || {};
  const untitledLabel = nc.untitled || 'Sin título';
  const headline = nc.headline || 'Cuándo lanzas.';
  const subheadline = nc.subheadline || 'Lo demás ya lo construimos juntos.';
  const launchLabel = nc.launchLabel || 'Lanzamiento';
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
    setError(null);
    setCreating(true);

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

      const plan = (await res.json()) as CollectionPlan;

      // Build the timeline locally — same template the API uses, no extra fetch.
      const tpl = createDefaultTimeline(plan.name, season, launchDate);
      const timeline = {
        id: tpl.id,
        collection_plan_id: plan.id,
        launch_date: launchDate,
        milestones: tpl.milestones as TimelineMilestone[],
      };

      setCreated({ plan, timeline });
      setView('overview');
      setCreating(false);

      // Silently update the URL after the morph has settled. No route
      // change = no remount = no flash. If the user refreshes, they
      // land on the real /collection/[id] which renders the same UI.
      setTimeout(() => {
        window.history.replaceState({}, '', `/collection/${plan.id}`);
      }, 1100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'create_failed');
      setCreating(false);
    }
  }, [user, launchDate, season, untitledLabel]);

  const onLaunchDateChange = useCallback((iso: string) => {
    if (!iso) return;
    if (new Date(iso).getTime() <= Date.now()) return;
    setLaunchDate(iso);
  }, []);

  // ─── ONE outer <LayoutGroup> wrapping BOTH views. Framer Motion only
  // matches `layoutId` between elements in the same group, so we render
  // pick-date and overview as siblings (one always conditional) inside
  // the same group node. That's what makes the bands physically morph
  // into the four block cards instead of remounting fresh. ──────────────
  return (
    <LayoutGroup>
      {view === 'overview' && created ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <WorkspaceShell
            collectionId={created.plan.id}
            collectionName={created.plan.name}
            season={season}
            milestones={created.timeline.milestones}
            launchDate={launchDate}
            skuCount={0}
          >
            <CollectionOverview
              plan={created.plan}
              timeline={created.timeline}
              skuCount={0}
            />
          </WorkspaceShell>
        </motion.div>
      ) : (
      <div className="min-h-screen bg-shade flex flex-col">
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

        <main className="flex-1 flex items-center justify-center px-4 md:px-10 lg:px-14 pb-12">
          <div className="w-full max-w-[1100px] mx-auto">
            <motion.header
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

            <div className="mb-10">
              <TimelinePreview
                launchDate={launchDate}
                language={language}
                asCards={false}
              />
            </div>

            <AnimatePresence>
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
                    disabled={creating}
                  />
                </label>

                <button
                  onClick={handleStart}
                  disabled={creating}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-9 py-4 text-[14px] font-semibold bg-carbon text-crema hover:bg-carbon/90 transition-all hover:scale-[1.02] active:scale-[0.99] shadow-[0_4px_14px_rgba(0,0,0,0.08)] disabled:opacity-60"
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
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        <AuthModal
          isOpen={showAuth}
          defaultMode="signup"
          onClose={() => setShowAuth(false)}
          onSuccess={() => setShowAuth(false)}
        />
      </div>
      )}
    </LayoutGroup>
  );
}

export default function NewCollectionPage() {
  return (
    <SubscriptionGate>
      <NewCollectionFlow />
    </SubscriptionGate>
  );
}
