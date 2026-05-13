'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useToast } from '@/components/ui/toast';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { track, Events } from '@/lib/posthog';
import SubscriptionGate from '@/components/billing/SubscriptionGate';
import { DeleteCollectionModal } from '@/components/collections/DeleteCollectionModal';
import {
  Plus,
  ArrowRight,
  Trash2,
  AlertTriangle,
  Check,
} from 'lucide-react';

interface CollectionPlan {
  id: string;
  name: string;
  season?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Derived snapshot for a collection — replaces the stale setup_data
 * jsonb cache the page used to read directly from collection_plans rows.
 * Fetched server-side by `page.tsx` and passed in as initial state.
 */
export interface DerivedSnapshot {
  totalSalesTarget?: number;
  productCategory?: string;
  expectedSkus?: number;
}

export interface TimelineData {
  collection_plan_id: string;
  launch_date: string;
  milestones: {
    id: string;
    phase: string;
    name: string;
    nameEs: string;
    status: string;
    startWeeksBefore: number;
    durationWeeks: number;
  }[];
}

interface CollectionWithProgress extends CollectionPlan {
  timeline?: TimelineData;
  progress: number;
  overdue: number;
  upcoming: number;
  daysUntilLaunch?: number;
  skuCount: number;
  derived: DerivedSnapshot;
}

export interface MyCollectionsClientProps {
  initialCollections: CollectionPlan[];
  initialTimelines: TimelineData[];
  /** plan_id → SKU count */
  initialSkuCounts: Record<string, number>;
  /** plan_id → derived snapshot */
  initialDerived: Record<string, DerivedSnapshot>;
}

export default function MyCollectionsClient({
  initialCollections,
  initialTimelines,
  initialSkuCounts,
  initialDerived,
}: MyCollectionsClientProps) {
  // Auth + onboarding gating happens server-side in page.tsx (the user
  // gets redirected before this component ever mounts). We trust the
  // SSR'd state here — no client-side auth flash, no spinner, no
  // "loading=true → ready" repaint.
  const { user } = useAuth();
  const t = useTranslation();
  const { language } = useLanguage();
  const { toast } = useToast();
  const { refresh: refreshSubscription } = useSubscription();
  const [collections, setCollections] = useState<CollectionPlan[]>(initialCollections);
  const [timelines] = useState<TimelineData[]>(initialTimelines);
  const [skuCounts] = useState<Map<string, number>>(() => new Map(Object.entries(initialSkuCounts)));
  const [derivedMap] = useState<Map<string, DerivedSnapshot>>(() => new Map(Object.entries(initialDerived)));
  const [deleteTarget, setDeleteTarget] = useState<CollectionWithProgress | null>(null);
  const [undoToast, setUndoToast] = useState<{
    collection: CollectionPlan;
    name: string;
    timeoutId: number;
  } | null>(null);

  // Stripe return handler — show feedback and refresh subscription state.
  // Read window.location.search directly instead of useSearchParams() to
  // avoid the suspense-boundary requirement on prerender. This effect
  // only runs client-side post-mount, so window is always defined.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billing = params.get('billing');
    const credits = params.get('credits');
    const signup = params.get('signup');
    if (!billing && !credits && !signup) return;

    if (signup === '1') {
      track(Events.SIGNUP_COMPLETED);
    }

    if (billing === 'success') {
      toast(t.account.subscriptionActivated, 'success', 5000);
      track(Events.SUBSCRIPTION_ACTIVATED);
      refreshSubscription();
    } else if (credits === 'success') {
      toast(t.account.creditsAdded, 'success', 5000);
      refreshSubscription();
    } else if (billing === 'canceled' || credits === 'canceled') {
      toast(t.account.checkoutCanceled, 'info', 4000);
    }

    // Strip the query param without adding to history
    const url = new URL(window.location.href);
    url.searchParams.delete('billing');
    url.searchParams.delete('credits');
    url.searchParams.delete('signup');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const performDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    // Capture the row + name before we lose them on optimistic remove.
    const rowSnapshot = collections.find((c) => c.id === target.id);
    if (!rowSnapshot) return;

    try {
      const res = await fetch(`/api/collections/${target.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to delete');
      }

      // Optimistic remove from the visible list.
      setCollections((prev) => prev.filter((c) => c.id !== target.id));

      // Cancel any previous toast (e.g. user deletes two in a row).
      if (undoToast?.timeoutId) {
        window.clearTimeout(undoToast.timeoutId);
      }

      // Set up the new undo toast with a 10-second auto-dismiss.
      const timeoutId = window.setTimeout(() => {
        setUndoToast(null);
      }, 10_000);
      setUndoToast({ collection: rowSnapshot, name: target.name, timeoutId });
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast(t.collections.toastDeleteFailed || 'Could not delete', 'error', 4000);
    }
  };

  const handleUndoDelete = async () => {
    if (!undoToast) return;
    const { collection, timeoutId } = undoToast;
    window.clearTimeout(timeoutId);
    setUndoToast(null);

    try {
      const res = await fetch(`/api/collections/${collection.id}/restore`, { method: 'POST' });
      if (!res.ok) {
        throw new Error('Restore failed');
      }
      // Re-insert the collection at the top of the list (its updated_at
      // was just touched on restore, so it would be top-most anyway).
      setCollections((prev) => [collection, ...prev]);
      toast(t.collections.toastRestored || 'Restored', 'success', 2500);
    } catch (error) {
      console.error('Error restoring collection:', error);
      toast(t.collections.toastRestoreFailed || 'Could not restore', 'error', 4000);
    }
  };

  const enrichedCollections: CollectionWithProgress[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return collections.map((c) => {
      const tl = timelines.find((t) => t.collection_plan_id === c.id);
      const skuCount = skuCounts.get(c.id) || 0;
      const derived = derivedMap.get(c.id) || {};
      if (!tl) return { ...c, progress: 0, overdue: 0, upcoming: 0, skuCount, derived };

      const total = tl.milestones.length;
      const completed = tl.milestones.filter((m) => m.status === 'completed').length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

      const launchDate = new Date(tl.launch_date);
      const daysUntilLaunch = Math.ceil((launchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const threeDays = new Date(today);
      threeDays.setDate(threeDays.getDate() + 3);

      let overdue = 0;
      let upcoming = 0;
      for (const m of tl.milestones) {
        if (m.status === 'completed') continue;
        const startDate = new Date(tl.launch_date);
        startDate.setDate(startDate.getDate() - m.startWeeksBefore * 7);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + m.durationWeeks * 7);

        if (endDate < today) overdue++;
        else if (endDate <= threeDays) upcoming++;
      }

      return { ...c, timeline: tl, progress, overdue, upcoming, daysUntilLaunch, skuCount, derived };
    });
  }, [collections, timelines, skuCounts, derivedMap]);

  const stats = useMemo(() => {
    const totalOverdue = enrichedCollections.reduce((sum, c) => sum + c.overdue, 0);
    const totalUpcoming = enrichedCollections.reduce((sum, c) => sum + c.upcoming, 0);
    const avgProgress = enrichedCollections.length > 0
      ? Math.round(enrichedCollections.reduce((sum, c) => sum + c.progress, 0) / enrichedCollections.length)
      : 0;
    const nextLaunch = enrichedCollections
      .filter((c) => c.daysUntilLaunch !== undefined && c.daysUntilLaunch > 0)
      .sort((a, b) => (a.daysUntilLaunch || Infinity) - (b.daysUntilLaunch || Infinity))[0];
    const totalRevenue = enrichedCollections.reduce(
      (sum, c) => sum + (c.derived.totalSalesTarget || 0),
      0,
    );
    return { totalOverdue, totalUpcoming, avgProgress, nextLaunch, totalRevenue };
  }, [enrichedCollections]);


  const c = t.collections as Record<string, string>;
  const firstName = user
    ? ((user.user_metadata?.full_name as string | undefined)?.split(' ')[0]
        || user.email?.split('@')[0]
        || '')
    : '';

  const subtitle = (() => {
    const parts: string[] = [];
    parts.push(
      collections.length === 1
        ? (c.subtitleOneCollection || '1 collection in flight')
        : (c.subtitleCollections || '{n} collections in flight').replace('{n}', String(collections.length)),
    );
    if (stats.nextLaunch?.daysUntilLaunch) {
      parts.push((c.subtitleNextDrop || 'next drop in {n}d').replace('{n}', String(stats.nextLaunch.daysUntilLaunch)));
    }
    if (stats.totalOverdue > 0) {
      parts.push((c.subtitleOverdue || '{n} milestones overdue').replace('{n}', String(stats.totalOverdue)));
    }
    return parts.join(' · ');
  })();

  return (
    <SubscriptionGate>
      <div className="min-h-screen bg-shade">
        <Navbar />

        <main className="pt-24 pb-20 px-6 md:px-10 lg:px-14">
          <div className="max-w-[1440px] mx-auto">
            {collections.length === 0 ? (
              <EmptyState t={c} />
            ) : (
              <div className="space-y-8">
                {/* ── Slim header — left aligned, personal ── */}
                <div className="flex items-end justify-between flex-wrap gap-4 pt-2">
                  <div>
                    <h1 className="text-[28px] md:text-[34px] font-medium text-carbon tracking-[-0.03em] leading-[1.1]">
                      {firstName
                        ? `${c.hi || 'Hi'}, ${firstName}`
                        : (c.collections || 'Collections')}
                    </h1>
                    <p className="text-[13px] text-carbon/45 tracking-[-0.01em] mt-1.5">
                      {subtitle}
                    </p>
                  </div>
                  <Link
                    href="/new-collection"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-carbon text-white text-[12px] font-semibold tracking-[-0.01em] hover:bg-carbon/90 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                    {c.newCollection || 'New collection'}
                  </Link>
                </div>

                {/* ── Collection cards grid ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {enrichedCollections.map((col, idx) => (
                    <CollectionCard
                      key={col.id}
                      idx={idx}
                      collection={col}
                      onDelete={() => setDeleteTarget(col)}
                      language={language}
                      t={c}
                    />
                  ))}
                  <NewCollectionTile t={c} />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <DeleteCollectionModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={performDelete}
        collectionName={deleteTarget?.name || ''}
        skuCount={deleteTarget?.skuCount}
        milestoneCount={deleteTarget?.timeline?.milestones.length}
      />

      {/* Undo toast — bottom-centered, single-line. Auto-dismisses at 10s. */}
      {undoToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] animate-fade-in"
        >
          <div className="flex items-center gap-4 bg-carbon text-crema rounded-full pl-5 pr-2 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
            <span className="text-[13px] tracking-[-0.01em]">
              <span className="font-medium">{t.collections.toastDeletedTitle}</span>
              <span className="text-crema/55"> · </span>
              <span className="text-crema/65">{t.collections.toastDeletedDesc}</span>
            </span>
            <button
              type="button"
              onClick={handleUndoDelete}
              className="px-4 py-1.5 rounded-full bg-crema/[0.10] hover:bg-crema/[0.18] text-[12px] font-semibold tracking-[-0.01em] transition-colors"
            >
              {t.collections.toastUndoButton}
            </button>
          </div>
        </div>
      )}
    </SubscriptionGate>
  );
}

/* ═══════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════ */

function CollectionCard({ collection, idx, onDelete, language, t }: {
  collection: CollectionWithProgress;
  idx: number;
  onDelete: () => void;
  language: string;
  t: Record<string, string>;
}) {
  const n = String(idx + 1).padStart(2, '0');
  const category = collection.derived.productCategory;
  const season = collection.season;
  const skuCount = collection.skuCount;
  const progress = collection.progress;
  const isComplete = progress === 100;
  const isStarted = progress > 0;

  // Metadata parts shown above the title inside the cover. Order: season →
  // category → SKU count. Keeps the cover card feeling like a book cover.
  const metaParts: string[] = [];
  if (season) metaParts.push(season);
  if (category) metaParts.push(category);

  return (
    <Link
      href={`/collection/${collection.id}`}
      className="group relative bg-white rounded-[20px] overflow-hidden flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
    >
      {/* Typographic cover — the name IS the cover until we have real imagery */}
      <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-carbon/[0.025] via-shade/80 to-carbon/[0.015]">
        {/* Ghost number */}
        <span className="absolute top-4 left-5 text-[32px] font-bold text-carbon/[0.09] leading-none tracking-[-0.04em]">
          {n}.
        </span>

        {/* Top meta line */}
        {metaParts.length > 0 && (
          <p className="absolute top-5 right-5 text-[10px] tracking-[0.18em] uppercase font-semibold text-carbon/40 text-right max-w-[55%]">
            {metaParts.join(' · ')}
          </p>
        )}

        {/* Overdue chip */}
        {collection.overdue > 0 && (
          <span className="absolute bottom-5 right-5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#A0463C] text-white text-[10px] font-bold tracking-[0.1em] uppercase">
            <AlertTriangle className="h-3 w-3" strokeWidth={2.5} />
            {collection.overdue} {t.overdue || 'overdue'}
          </span>
        )}

        {/* Centered collection name — matches CollectionOverview typography */}
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <h2 className="text-center text-carbon font-medium tracking-[-0.03em] leading-[1.1] text-[clamp(24px,2.6vw,34px)]">
            {collection.name}
          </h2>
        </div>

        {/* Hover delete */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
          className="absolute bottom-4 left-4 p-2 rounded-full bg-transparent text-carbon/0 group-hover:bg-white/80 group-hover:text-carbon/45 hover:!text-[#A0463C] transition-all"
          title={t.deleteCollection || 'Delete collection'}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex flex-col">
        {/* Metadata line */}
        <div className="flex items-center gap-2.5 text-[11px] text-carbon/50 mb-3 flex-wrap">
          {skuCount > 0 && (
            <span className="tabular-nums font-semibold text-carbon/70">{skuCount} SKUs</span>
          )}
          {collection.derived.totalSalesTarget && collection.derived.totalSalesTarget > 0 && (
            <>
              {skuCount > 0 && <span className="text-carbon/20">·</span>}
              <span className="tabular-nums">
                €{(collection.derived.totalSalesTarget / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })}K
              </span>
            </>
          )}
          {collection.daysUntilLaunch !== undefined && collection.daysUntilLaunch > 0 && (
            <>
              <span className="text-carbon/20">·</span>
              <span className="tabular-nums">
                {collection.daysUntilLaunch}{t.dToLaunch || 'd to launch'}
              </span>
            </>
          )}
          <span className="text-carbon/20">·</span>
          <span className="tabular-nums text-carbon/35">
            {new Date(collection.updated_at).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}
          </span>
        </div>

        {/* CTA + progress */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 h-[6px] rounded-full bg-carbon/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-carbon/30 transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-4 rounded-full text-[11px] font-semibold tracking-[-0.01em] transition-all shrink-0 ${
            isComplete
              ? 'border border-carbon/[0.15] text-carbon group-hover:bg-carbon/[0.04]'
              : 'bg-carbon text-white group-hover:bg-carbon/90'
          }`}>
            {isComplete
              ? (t.completed || 'Completed')
              : isStarted
                ? (t.continueCollection || 'Continue')
                : (t.openCollection || 'Open')}
            {!isComplete && <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />}
            {isComplete && <Check className="h-3 w-3" />}
          </div>
        </div>
      </div>
    </Link>
  );
}

function NewCollectionTile({ t }: { t: Record<string, string> }) {
  return (
    <Link
      href="/new-collection"
      className="group relative bg-white rounded-[20px] border border-dashed border-carbon/[0.15] flex flex-col items-center justify-center p-8 transition-all duration-300 hover:border-carbon/40 hover:bg-white/60 hover:scale-[1.02]"
    >
      <div className="w-14 h-14 rounded-full bg-carbon/[0.04] flex items-center justify-center mb-5 group-hover:bg-carbon group-hover:text-white transition-colors">
        <Plus className="h-5 w-5 text-carbon/60 group-hover:text-white transition-colors" strokeWidth={2} />
      </div>
      <p className="text-[18px] font-semibold text-carbon tracking-[-0.03em] mb-2">
        {t.newCollection || 'New collection'}
      </p>
      <p className="text-[12px] text-carbon/50 text-center max-w-[220px] leading-relaxed">
        {t.newCollectionHint || 'Start from scratch or let aimily draft one from your brief.'}
      </p>
    </Link>
  );
}

function EmptyState({ t }: { t: Record<string, string> }) {
  return (
    <div className="flex items-center justify-center min-h-[70vh] pt-6">
      <div className="w-full max-w-2xl mx-auto text-center">
        <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-3">
          {t.yourWorkspace || 'Your workspace'}
        </p>
        <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15] mb-4">
          {t.firstCollectionAwaits || 'Your first collection awaits'}
        </h1>
        <p className="text-[14px] text-carbon/50 max-w-[480px] mx-auto leading-relaxed mb-10">
          {t.firstCollectionDesc || 'Plan your timeline, design your products, and launch with confidence.'}
        </p>

        <Link
          href="/new-collection"
          className="inline-flex items-center justify-center gap-2 rounded-full px-9 py-4 text-[14px] font-semibold bg-carbon text-crema hover:bg-carbon/90 transition-all hover:scale-[1.02] active:scale-[0.99] shadow-[0_4px_14px_rgba(0,0,0,0.08)]"
        >
          {t.createFirstCollection || t.start || 'Create your first collection'}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

