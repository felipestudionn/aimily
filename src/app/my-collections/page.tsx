'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { createClient } from '@/lib/supabase/client';
import SubscriptionGate from '@/components/billing/SubscriptionGate';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import {
  FolderOpen,
  Plus,
  Calendar,
  Euro,
  Loader2,
  ArrowRight,
  Trash2,
  AlertTriangle,
  Clock,
  Rocket,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Zap,
  LayoutGrid,
  X,
} from 'lucide-react';

interface CollectionPlan {
  id: string;
  name: string;
  season?: string;
  created_at: string;
  updated_at: string;
  setup_data: {
    totalSalesTarget?: number;
    productCategory?: string;
  };
}

interface TimelineData {
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
}

export default function MyCollectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslation();
  const { language } = useLanguage();
  const [collections, setCollections] = useState<CollectionPlan[]>([]);
  const [timelines, setTimelines] = useState<TimelineData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [collectionsRes, timelinesRes] = await Promise.all([
        supabase
          .from('collection_plans')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('collection_timelines')
          .select('collection_plan_id, launch_date, milestones'),
      ]);

      if (collectionsRes.error) throw collectionsRes.error;
      setCollections(collectionsRes.data || []);

      const planIds = new Set((collectionsRes.data || []).map((p: CollectionPlan) => p.id));
      const userTimelines = (timelinesRes.data || []).filter((t: TimelineData) => planIds.has(t.collection_plan_id));
      setTimelines(userTimelines);
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.collections.deleteConfirm)) return;

    try {
      const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to delete');
      }
      setCollections(collections.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  };

  const enrichedCollections: CollectionWithProgress[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return collections.map((c) => {
      const tl = timelines.find((t) => t.collection_plan_id === c.id);
      if (!tl) return { ...c, progress: 0, overdue: 0, upcoming: 0 };

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

      return { ...c, timeline: tl, progress, overdue, upcoming, daysUntilLaunch };
    });
  }, [collections, timelines]);

  const stats = useMemo(() => {
    const totalOverdue = enrichedCollections.reduce((sum, c) => sum + c.overdue, 0);
    const avgProgress = enrichedCollections.length > 0
      ? Math.round(enrichedCollections.reduce((sum, c) => sum + c.progress, 0) / enrichedCollections.length)
      : 0;
    const nextLaunch = enrichedCollections
      .filter((c) => c.daysUntilLaunch !== undefined && c.daysUntilLaunch > 0)
      .sort((a, b) => (a.daysUntilLaunch || Infinity) - (b.daysUntilLaunch || Infinity))[0];
    return { totalOverdue, avgProgress, nextLaunch };
  }, [enrichedCollections]);

  const upcomingDeadlines = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDays = new Date(today);
    sevenDays.setDate(sevenDays.getDate() + 7);

    const deadlines: { milestone: string; collection: string; collectionId: string; endDate: Date; isOverdue: boolean }[] = [];

    for (const c of enrichedCollections) {
      if (!c.timeline) continue;
      for (const m of c.timeline.milestones) {
        if (m.status === 'completed') continue;
        const startDate = new Date(c.timeline.launch_date);
        startDate.setDate(startDate.getDate() - m.startWeeksBefore * 7);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + m.durationWeeks * 7);
        const isOverdue = endDate < today;

        if (isOverdue || endDate <= sevenDays) {
          deadlines.push({
            milestone: m.name,
            collection: c.name,
            collectionId: c.id,
            endDate,
            isOverdue,
          });
        }
      }
    }

    deadlines.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.endDate.getTime() - b.endDate.getTime();
    });

    return deadlines.slice(0, 6);
  }, [enrichedCollections]);

  /* ── "New Collection" modal state ── */
  const [showNewModal, setShowNewModal] = useState(false);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-crema flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-carbon/40" />
      </div>
    );
  }

  return (
    <SubscriptionGate>
    <div className="min-h-screen bg-crema">
      <Navbar />
      <OnboardingModal />

      <main className="pt-24 pb-16 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-carbon/40" />
            </div>
          ) : collections.length === 0 ? (
            /* ── Empty state — full-screen choice ── */
            <div className="flex items-center justify-center min-h-[70vh]">
              <div className="w-full max-w-2xl mx-auto text-center">
                <p className="text-[11px] font-medium tracking-[0.3em] uppercase text-carbon/25 mb-4">
                  {t.collections.yourWorkspace}
                </p>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-carbon tracking-tight leading-[1.08] mb-4">
                  {t.collections.firstCollectionAwaits}
                </h1>
                <p className="text-sm text-carbon/40 max-w-md mx-auto leading-relaxed mb-12">
                  {t.collections.firstCollectionDesc}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
                  {/* Option A: Step-by-step (primary) */}
                  <Link
                    href="/new-collection"
                    className="group bg-white border border-carbon/[0.06] text-left p-8 hover:shadow-md transition-all duration-300"
                  >
                    <div className="w-10 h-10 bg-carbon flex items-center justify-center mb-6">
                      <LayoutGrid className="h-4 w-4 text-crema" />
                    </div>
                    <h3 className="text-lg font-light text-carbon tracking-tight mb-2">
                      {(t.collections as Record<string, string>).buildStepByStep || 'Build step by step'}
                    </h3>
                    <p className="text-xs text-carbon/35 leading-relaxed mb-6">
                      {(t.collections as Record<string, string>).buildStepByStepDesc || 'Create your collection from scratch with Aimily guiding you through each phase.'}
                    </p>
                    <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.1em] uppercase text-carbon/40 group-hover:text-carbon/70 transition-colors">
                      {t.overview?.start || 'Start'} <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </Link>

                  {/* Option B: Brief mode */}
                  <Link
                    href="/brief-to-collection"
                    className="group bg-carbon text-left p-8 hover:bg-carbon/90 transition-all duration-300"
                  >
                    <div className="w-10 h-10 border border-crema/15 flex items-center justify-center mb-6">
                      <Zap className="h-4 w-4 text-crema/50" />
                    </div>
                    <h3 className="text-lg font-light text-crema tracking-tight mb-2">
                      {(t as Record<string, Record<string, string>>).briefToCollection?.tellYourIdea || 'Tell me your vision'}
                    </h3>
                    <p className="text-xs text-crema/35 leading-relaxed mb-6">
                      {(t as Record<string, Record<string, string>>).briefToCollection?.modeDesc || 'Describe your idea and Aimily builds a complete collection proposal for you to refine.'}
                    </p>
                    <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.1em] uppercase text-crema/50 group-hover:text-crema/80 transition-colors">
                      {t.overview?.start || 'Start'} <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">

              {/* ── Hero section — editorial fashion ── */}
              <div className="relative bg-carbon -mx-6 md:-mx-10 px-6 md:px-10 py-12 sm:py-16 overflow-hidden">
                {/* Subtle grid texture */}
                <div
                  className="absolute inset-0 opacity-[0.015]"
                  style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
                  }}
                />
                <div className="relative max-w-7xl mx-auto">
                  <div className="mb-12">
                    <p className="text-[11px] font-medium tracking-[0.3em] uppercase text-crema/20 mb-4">
                      {t.collections.yourWorkspace}
                    </p>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-light text-crema tracking-tight leading-[1.08]">
                      <span className="italic">{t.collections.collections}</span>
                    </h1>
                  </div>

                  {/* Stats row — editorial spacing */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12">
                    <div>
                      <p className="text-4xl sm:text-5xl font-light text-crema tracking-tight">{collections.length}</p>
                      <p className="text-[11px] font-medium text-crema/20 uppercase tracking-[0.2em] mt-2">{t.collections.collections}</p>
                    </div>
                    <div>
                      <p className="text-4xl sm:text-5xl font-light text-crema tracking-tight">{stats.avgProgress}%</p>
                      <p className="text-[11px] font-medium text-crema/20 uppercase tracking-[0.2em] mt-2">{t.collections.avgProgress}</p>
                    </div>
                    <div>
                      <p className={`text-4xl sm:text-5xl font-light tracking-tight ${stats.totalOverdue > 0 ? 'text-error' : 'text-crema'}`}>
                        {stats.totalOverdue}
                      </p>
                      <p className="text-[11px] font-medium text-crema/20 uppercase tracking-[0.2em] mt-2">{t.common.overdue}</p>
                    </div>
                    <div>
                      <p className="text-4xl sm:text-5xl font-light text-crema tracking-tight">
                        {stats.nextLaunch ? `${stats.nextLaunch.daysUntilLaunch}d` : '--'}
                      </p>
                      <p className="text-[11px] font-medium text-crema/20 uppercase tracking-[0.2em] mt-2">{t.collections.nextLaunch}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Collections section ── */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-carbon/30">
                    {t.collections.collections} · {enrichedCollections.length}
                  </p>
                  <button
                    onClick={() => setShowNewModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-carbon text-crema text-[11px] font-medium tracking-[0.15em] uppercase hover:bg-carbon/90 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t.collections.newCollection}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {enrichedCollections.map((collection) => (
                    <Link
                      key={collection.id}
                      href={`/collection/${collection.id}`}
                      className="group relative bg-white border border-carbon/[0.06] shadow-sm hover:shadow-md hover:-translate-y-0.5 p-6 flex flex-col transition-all duration-300 overflow-hidden"
                    >
                      {/* Top accent line */}
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-carbon/[0.06]">
                        <div className="h-full bg-carbon transition-all duration-500" style={{ width: `${collection.progress}%` }} />
                      </div>

                      {/* Header row */}
                      <div className="flex items-start justify-between mb-1 mt-1">
                        <h3 className="text-xl font-light text-carbon tracking-tight truncate flex-1 min-w-0 pr-3">
                          {collection.name}
                        </h3>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(collection.id); }}
                          className="p-1.5 text-carbon/0 group-hover:text-carbon/20 hover:!text-error transition-colors flex-shrink-0"
                          title={t.collections.deleteCollection}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3 mb-5 text-xs font-medium text-carbon/30">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(collection.updated_at).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}
                        </span>
                        {collection.setup_data?.totalSalesTarget && (
                          <span className="flex items-center gap-1">
                            <Euro className="h-3 w-3" />
                            {collection.setup_data.totalSalesTarget.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Progress */}
                      {collection.timeline && (
                        <div className="mb-5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-carbon/30 tracking-wide">{t.common.progress}</span>
                            <span className="font-light text-carbon text-base tracking-tight">{collection.progress}%</span>
                          </div>
                        </div>
                      )}

                      {/* Status badges */}
                      <div className="flex items-center gap-2 flex-wrap mt-auto">
                        {collection.setup_data?.productCategory && (
                          <span className="text-xs font-medium text-carbon/35 border border-carbon/[0.08] px-2.5 py-1 rounded-full">
                            {collection.setup_data.productCategory}
                          </span>
                        )}
                        {collection.overdue > 0 && (
                          <span className="flex items-center gap-1 text-xs font-medium text-error border border-error/20 px-2.5 py-1 rounded-full">
                            <AlertTriangle className="h-3 w-3" />
                            {collection.overdue} {t.common.overdue}
                          </span>
                        )}
                        {collection.daysUntilLaunch !== undefined && collection.daysUntilLaunch > 0 && (
                          <span className="flex items-center gap-1 text-xs font-medium text-carbon/35 border border-carbon/[0.08] px-2.5 py-1 rounded-full">
                            <Rocket className="h-3 w-3" />
                            {collection.daysUntilLaunch}{t.collections.dToLaunch}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── "New Collection" modal — choose your workflow ── */}
      {showNewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ animation: 'fadeIn 0.3s ease-out forwards' }}>
          <div className="absolute inset-0 bg-carbon/90 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
          <div className="relative z-10 w-full max-w-2xl mx-6" style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            {/* Close */}
            <button
              onClick={() => setShowNewModal(false)}
              className="absolute -top-12 right-0 text-crema/30 hover:text-crema/60 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-8">
              <p className="text-[11px] font-medium tracking-[0.3em] uppercase text-crema/25 mb-3">
                {t.collections.newCollection}
              </p>
              <h2 className="text-2xl sm:text-3xl font-light text-crema tracking-tight leading-[1.15]">
                {(t.collections as Record<string, string>).howToStart || 'How do you want to start?'}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: Step by step — User leads (primary) */}
              <Link
                href="/new-collection"
                onClick={() => setShowNewModal(false)}
                className="group bg-crema text-left p-8 hover:bg-white transition-all duration-300"
              >
                <div className="w-10 h-10 bg-carbon flex items-center justify-center mb-6">
                  <LayoutGrid className="h-4 w-4 text-crema" />
                </div>
                <h3 className="text-lg font-light text-carbon tracking-tight mb-2">
                  {(t.collections as Record<string, string>).buildStepByStep || 'Build step by step'}
                </h3>
                <p className="text-xs text-carbon/40 leading-relaxed mb-6">
                  {(t.collections as Record<string, string>).buildStepByStepDesc || 'Create your collection from scratch with Aimily guiding you through each phase.'}
                </p>
                <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.1em] uppercase text-carbon/40 group-hover:text-carbon transition-colors">
                  {t.overview?.start || 'Start'} <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>

              {/* Option B: Brief mode — Aimily leads */}
              <Link
                href="/brief-to-collection"
                onClick={() => setShowNewModal(false)}
                className="group border border-crema/[0.08] text-left p-8 hover:border-crema/20 hover:bg-crema/[0.03] transition-all duration-300"
              >
                <div className="w-10 h-10 border border-crema/15 flex items-center justify-center mb-6">
                  <Zap className="h-4 w-4 text-crema/50" />
                </div>
                <h3 className="text-lg font-light text-crema tracking-tight mb-2">
                  {(t as Record<string, Record<string, string>>).briefToCollection?.tellYourIdea || 'Tell me your vision'}
                </h3>
                <p className="text-xs text-crema/30 leading-relaxed mb-6">
                  {(t as Record<string, Record<string, string>>).briefToCollection?.modeDesc || 'Describe your idea and Aimily builds a complete collection proposal for you to refine.'}
                </p>
                <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.1em] uppercase text-crema/30 group-hover:text-crema/70 transition-colors">
                  {t.overview?.start || 'Start'} <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
    </SubscriptionGate>
  );
}
