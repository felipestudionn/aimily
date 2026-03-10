'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
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
    if (!confirm('Are you sure you want to delete this collection?')) return;

    try {
      const { error } = await supabase
        .from('collection_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
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
    <div className="min-h-screen bg-crema">
      <Navbar />

      <main className="pt-28 pb-16 px-4 md:px-6">
        <div className="max-w-5xl mx-auto">

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
                    Your first collection awaits
                  </h2>
                  <p className="text-gris/60 text-sm leading-relaxed max-w-xs mb-10">
                    Plan your timeline, design your products, and launch with confidence.
                  </p>
                  <Link
                    href="/new-collection"
                    className="inline-flex items-center gap-2 px-10 py-4 bg-crema text-carbon text-sm font-medium tracking-[0.15em] uppercase hover:bg-crema/90 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Create Collection
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">

              {/* Hub Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-light text-texto tracking-tight">
                  Collections
                </h1>
                <Link
                  href="/new-collection"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-carbon text-crema text-sm font-medium tracking-wide uppercase hover:bg-carbon/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  New Collection
                </Link>
              </div>

              {/* Aggregate Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gris/30">
                <div className="bg-crema p-5 text-center">
                  <p className="text-2xl font-light text-texto">{collections.length}</p>
                  <p className="text-xs text-texto/50 uppercase tracking-widest mt-1">Collections</p>
                </div>
                <div className="bg-crema p-5 text-center">
                  <p className="text-2xl font-light text-texto">{stats.avgProgress}%</p>
                  <p className="text-xs text-texto/50 uppercase tracking-widest mt-1">Avg Progress</p>
                </div>
                <div className="bg-crema p-5 text-center">
                  <p className={`text-2xl font-light ${stats.totalOverdue > 0 ? 'text-error' : 'text-texto'}`}>
                    {stats.totalOverdue}
                  </p>
                  <p className="text-xs text-texto/50 uppercase tracking-widest mt-1">Overdue</p>
                </div>
                <div className="bg-crema p-5 text-center">
                  <p className="text-2xl font-light text-texto">
                    {stats.nextLaunch ? `${stats.nextLaunch.daysUntilLaunch}d` : '--'}
                  </p>
                  <p className="text-xs text-texto/50 uppercase tracking-widest mt-1">Next Launch</p>
                </div>
              </div>

              {/* Upcoming Deadlines */}
              {upcomingDeadlines.length > 0 && (
                <div className="border border-gris/40 bg-white p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-4 w-4 text-texto/40" />
                    <h3 className="text-xs font-medium text-texto uppercase tracking-widest">Upcoming Deadlines</h3>
                  </div>
                  <div className="divide-y divide-gris/30">
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
                          className="flex items-center gap-3 py-3 hover:bg-crema/50 transition-colors -mx-1 px-1"
                        >
                          {d.isOverdue ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-error flex-shrink-0" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-texto/30 flex-shrink-0" />
                          )}
                          <span className="text-sm text-texto flex-1 truncate">{d.milestone}</span>
                          <span className="text-xs text-texto/40 truncate max-w-[120px]">{d.collection}</span>
                          <span className={`text-xs font-medium ${d.isOverdue ? 'text-error' : 'text-texto/50'}`}>
                            {d.isOverdue
                              ? `${daysOverdue}d overdue`
                              : daysLeft === 0
                              ? 'Today'
                              : `${daysLeft}d left`}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Collections Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gris/30">
                {enrichedCollections.map((collection) => (
                  <div key={collection.id} className="bg-white p-6 flex flex-col">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium text-texto truncate">
                          {collection.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-texto/40">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(collection.updated_at).toLocaleDateString('es-ES')}
                          </span>
                          {collection.setup_data?.totalSalesTarget && (
                            <span className="flex items-center gap-1">
                              <Euro className="h-3 w-3" />
                              {collection.setup_data.totalSalesTarget.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(collection.id)}
                        className="p-1.5 text-gris hover:text-error transition-colors"
                        title="Delete collection"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Progress */}
                    {collection.timeline && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-texto/40 mb-1.5">
                          <span>Progress</span>
                          <span className="font-medium text-texto">{collection.progress}%</span>
                        </div>
                        <div className="h-1 bg-gris/30 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              collection.progress === 100 ? 'bg-carbon' : 'bg-carbon/60'
                            }`}
                            style={{ width: `${collection.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Status badges */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {collection.setup_data?.productCategory && (
                        <span className="text-xs text-texto/50 border border-gris/40 px-2 py-0.5">
                          {collection.setup_data.productCategory}
                        </span>
                      )}
                      {collection.overdue > 0 && (
                        <span className="flex items-center gap-1 text-xs text-error border border-error/20 px-2 py-0.5">
                          <AlertTriangle className="h-3 w-3" />
                          {collection.overdue} overdue
                        </span>
                      )}
                      {collection.daysUntilLaunch !== undefined && collection.daysUntilLaunch > 0 && (
                        <span className="flex items-center gap-1 text-xs text-texto/50 border border-gris/40 px-2 py-0.5">
                          <Rocket className="h-3 w-3" />
                          {collection.daysUntilLaunch}d to launch
                        </span>
                      )}
                      {collection.daysUntilLaunch !== undefined && collection.daysUntilLaunch <= 0 && (
                        <span className="flex items-center gap-1 text-xs text-texto/50 border border-gris/40 px-2 py-0.5">
                          <CheckCircle2 className="h-3 w-3" />
                          Launched
                        </span>
                      )}
                    </div>

                    {/* CTA */}
                    <Link
                      href={`/collection/${collection.id}`}
                      className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 bg-carbon text-crema text-xs font-medium tracking-wide uppercase hover:bg-carbon/90 transition-colors"
                    >
                      Continue
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
