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

      <main className="pt-20 pb-16 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-carbon/40" />
            </div>
          ) : collections.length === 0 ? (
            /* Empty state — editorial dark card */
            <div className="flex items-center justify-center min-h-[70vh]">
              <div className="relative bg-carbon w-full max-w-lg mx-auto overflow-hidden border border-gris/20">
                {/* Subtle grid texture */}
                <div
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                  }}
                />
                <div className="relative z-10 flex flex-col items-center text-center px-10 py-16">
                  <div className="w-14 h-14 border border-gris/30 flex items-center justify-center mb-8">
                    <Sparkles className="h-6 w-6 text-gris/60" />
                  </div>
                  <h2 className="text-2xl font-light text-crema tracking-tight mb-3">
                    {t.collections.firstCollectionAwaits}
                  </h2>
                  <p className="text-gris/60 text-sm leading-relaxed max-w-xs mb-10">
                    {t.collections.firstCollectionDesc}
                  </p>
                  <Link
                    href="/new-collection"
                    className="inline-flex items-center gap-2 px-10 py-4 bg-crema text-carbon text-sm font-medium tracking-[0.15em] uppercase hover:bg-crema/90 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    {t.collections.createCollection}
                  </Link>
                  <Link
                    href="/brief-to-collection"
                    className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.1em] uppercase text-crema/40 hover:text-crema/70 transition-colors mt-4"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {(t as Record<string, Record<string, string>>).briefToCollection?.tellYourIdea || 'Or tell me your idea'}
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-10">

              {/* ── Hero section — carbon accent (Creative Synthesis pattern) ── */}
              <div className="bg-carbon -mx-6 md:-mx-10 px-6 md:px-10 py-10 sm:py-12">
                <div className="max-w-7xl mx-auto">
                  {/* Header row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-10">
                    <div>
                      <p className="text-[11px] font-medium tracking-[0.25em] uppercase text-crema/25 mb-3">
                        {t.collections.yourWorkspace}
                      </p>
                      <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-crema tracking-tight leading-[1.15]">
                        <span className="italic">{t.collections.collections}</span>
                      </h1>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        href="/brief-to-collection"
                        className="inline-flex items-center gap-2 px-5 py-3 border border-crema/[0.1] text-crema/50 text-[11px] font-medium tracking-[0.1em] uppercase hover:border-crema/25 hover:text-crema/70 transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {(t as Record<string, Record<string, string>>).briefToCollection?.tellYourIdea || 'Tell me your idea'}
                      </Link>
                      <Link
                        href="/new-collection"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-crema text-carbon text-[11px] font-medium tracking-[0.15em] uppercase hover:bg-crema/90 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        {t.collections.newCollection}
                      </Link>
                    </div>
                  </div>

                  {/* Stats row — integrated in hero */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
                    <div>
                      <p className="text-3xl sm:text-4xl font-light text-crema tracking-tight">{collections.length}</p>
                      <p className="text-[11px] font-medium text-crema/25 uppercase tracking-[0.2em] mt-1.5">{t.collections.collections}</p>
                    </div>
                    <div>
                      <p className="text-3xl sm:text-4xl font-light text-crema tracking-tight">{stats.avgProgress}%</p>
                      <p className="text-[11px] font-medium text-crema/25 uppercase tracking-[0.2em] mt-1.5">{t.collections.avgProgress}</p>
                    </div>
                    <div>
                      <p className={`text-3xl sm:text-4xl font-light tracking-tight ${stats.totalOverdue > 0 ? 'text-error' : 'text-crema'}`}>
                        {stats.totalOverdue}
                      </p>
                      <p className="text-[11px] font-medium text-crema/25 uppercase tracking-[0.2em] mt-1.5">{t.common.overdue}</p>
                    </div>
                    <div>
                      <p className="text-3xl sm:text-4xl font-light text-crema tracking-tight">
                        {stats.nextLaunch ? `${stats.nextLaunch.daysUntilLaunch}d` : '--'}
                      </p>
                      <p className="text-[11px] font-medium text-crema/25 uppercase tracking-[0.2em] mt-1.5">{t.collections.nextLaunch}</p>
                    </div>
                  </div>

                  {/* Upcoming deadlines — integrated in hero */}
                  {upcomingDeadlines.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-crema/[0.06]">
                      <div className="flex items-center gap-2 mb-4">
                        <Clock className="h-3.5 w-3.5 text-crema/25" />
                        <h3 className="text-[11px] font-medium text-crema/25 uppercase tracking-[0.2em]">{t.collections.upcomingDeadlines}</h3>
                      </div>
                      <div className="space-y-0 divide-y divide-crema/[0.06]">
                        {upcomingDeadlines.map((d, i) => {
                          const now = new Date();
                          now.setHours(0, 0, 0, 0);
                          const daysOverdue = d.isOverdue
                            ? Math.ceil((now.getTime() - d.endDate.getTime()) / (1000 * 60 * 60 * 24))
                            : 0;
                          const daysLeft = !d.isOverdue
                            ? Math.ceil((d.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                            : 0;
                          return (
                            <Link
                              key={i}
                              href={`/collection/${d.collectionId}`}
                              className="flex items-center gap-3 py-3 hover:bg-crema/[0.03] transition-colors -mx-2 px-2"
                            >
                              {d.isOverdue ? (
                                <AlertTriangle className="h-3.5 w-3.5 text-error flex-shrink-0" />
                              ) : (
                                <Clock className="h-3.5 w-3.5 text-crema/20 flex-shrink-0" />
                              )}
                              <span className="text-sm text-crema/70 flex-1 truncate">{d.milestone}</span>
                              <span className="text-xs text-crema/30 truncate max-w-[140px]">{d.collection}</span>
                              <span className={`text-xs font-medium ${d.isOverdue ? 'text-error' : 'text-crema/40'}`}>
                                {d.isOverdue
                                  ? `${daysOverdue}${t.collections.dOverdue}`
                                  : daysLeft === 0
                                  ? t.common.today
                                  : `${daysLeft}${t.collections.dLeft}`}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Collections Grid — compact cards with shadow ── */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-carbon/30">
                    {t.collections.collections} · {enrichedCollections.length}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {enrichedCollections.map((collection) => (
                    <Link
                      key={collection.id}
                      href={`/collection/${collection.id}`}
                      className="group bg-white border border-carbon/[0.06] shadow-sm hover:shadow-md p-6 flex flex-col transition-all duration-300"
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="text-lg font-light text-carbon tracking-tight truncate flex-1 min-w-0 pr-3 group-hover:text-carbon/80 transition-colors">
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
                          <div className="h-[2px] bg-carbon/[0.06] overflow-hidden">
                            <div
                              className="h-full bg-carbon transition-all duration-500"
                              style={{ width: `${collection.progress}%` }}
                            />
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
                        {collection.daysUntilLaunch !== undefined && collection.daysUntilLaunch <= 0 && (
                          <span className="flex items-center gap-1 text-xs font-medium text-carbon/35 border border-carbon/[0.08] px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="h-3 w-3" />
                            {t.common.launched}
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
    </div>
    </SubscriptionGate>
  );
}
