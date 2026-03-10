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
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      // Fetch collections and timelines in parallel
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

      // Filter timelines to only user's collections
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

  // Merge collections with timeline data
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

  // Aggregate stats
  const stats = useMemo(() => {
    const totalOverdue = enrichedCollections.reduce((sum, c) => sum + c.overdue, 0);
    const totalUpcoming = enrichedCollections.reduce((sum, c) => sum + c.upcoming, 0);
    const avgProgress = enrichedCollections.length > 0
      ? Math.round(enrichedCollections.reduce((sum, c) => sum + c.progress, 0) / enrichedCollections.length)
      : 0;
    const nextLaunch = enrichedCollections
      .filter((c) => c.daysUntilLaunch !== undefined && c.daysUntilLaunch > 0)
      .sort((a, b) => (a.daysUntilLaunch || Infinity) - (b.daysUntilLaunch || Infinity))[0];
    return { totalOverdue, totalUpcoming, avgProgress, nextLaunch };
  }, [enrichedCollections]);

  // Upcoming deadlines across all collections
  const upcomingDeadlines = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDays = new Date(today);
    sevenDays.setDate(sevenDays.getDate() + 7);

    const deadlines: { milestone: string; milestoneEs: string; collection: string; collectionId: string; endDate: Date; phase: string; isOverdue: boolean }[] = [];

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
            milestoneEs: m.nameEs,
            collection: c.name,
            collectionId: c.id,
            endDate,
            phase: m.phase,
            isOverdue,
          });
        }
      }
    }

    // Sort: overdue first, then by end date
    deadlines.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.endDate.getTime() - b.endDate.getTime();
    });

    return deadlines.slice(0, 8);
  }, [enrichedCollections]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#fff6dc] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff6dc]">
      <Navbar />

      <main className="pt-32 pb-16 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Collections</h1>
              <p className="text-gray-600 mt-1">Manage your collection plans</p>
            </div>
            <Link href="/creative-space">
              <Button className="bg-gray-900 hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                New Collection
              </Button>
            </Link>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-20">
              <FolderOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">No collections yet</h2>
              <p className="text-gray-500 mb-6">Start by creating your first collection plan</p>
              <Link href="/creative-space">
                <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Collection
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Aggregate Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                  <FolderOpen className="h-5 w-5 mx-auto text-orange-500 mb-1" />
                  <p className="text-2xl font-bold text-gray-900">{collections.length}</p>
                  <p className="text-xs text-gray-500">Collections</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto text-green-500 mb-1" />
                  <p className="text-2xl font-bold text-green-600">{stats.avgProgress}%</p>
                  <p className="text-xs text-gray-500">Avg Progress</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                  <AlertTriangle className="h-5 w-5 mx-auto text-red-500 mb-1" />
                  <p className="text-2xl font-bold text-red-600">{stats.totalOverdue}</p>
                  <p className="text-xs text-gray-500">Overdue</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                  <Rocket className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.nextLaunch ? `${stats.nextLaunch.daysUntilLaunch}d` : '--'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats.nextLaunch ? `Next Launch` : 'No Launch'}
                  </p>
                </div>
              </div>

              {/* Upcoming Deadlines */}
              {upcomingDeadlines.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <h3 className="font-semibold text-gray-900 text-sm">Upcoming Deadlines</h3>
                    <span className="text-xs text-gray-400">Proximos vencimientos</span>
                  </div>
                  <div className="space-y-2">
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
                          className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          {d.isOverdue ? (
                            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                          )}
                          <span className="text-sm text-gray-900 flex-1 truncate">{d.milestone}</span>
                          <span className="text-xs text-gray-400 truncate max-w-[120px]">{d.collection}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            d.isOverdue
                              ? 'bg-red-50 text-red-600'
                              : daysLeft === 0
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-blue-50 text-blue-600'
                          }`}>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrichedCollections.map((collection) => (
                  <div
                    key={collection.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                          <FolderOpen className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex items-center gap-1">
                          {collection.overdue > 0 && (
                            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-50 text-red-600 font-medium">
                              <AlertTriangle className="h-3 w-3" />
                              {collection.overdue}
                            </span>
                          )}
                          <button
                            onClick={() => handleDelete(collection.id)}
                            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete collection"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{collection.name}</h3>

                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(collection.updated_at).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                        {collection.setup_data?.totalSalesTarget && (
                          <div className="flex items-center gap-1">
                            <Euro className="h-4 w-4" />
                            <span>
                              {collection.setup_data.totalSalesTarget.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {collection.timeline && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span className="font-medium">{collection.progress}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                collection.progress === 100
                                  ? 'bg-green-500'
                                  : collection.overdue > 0
                                  ? 'bg-gradient-to-r from-orange-400 to-red-400'
                                  : 'bg-gradient-to-r from-orange-400 to-amber-500'
                              }`}
                              style={{ width: `${collection.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Status badges row */}
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        {collection.setup_data?.productCategory && (
                          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {collection.setup_data.productCategory}
                          </span>
                        )}
                        {collection.daysUntilLaunch !== undefined && collection.daysUntilLaunch > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                            <Rocket className="h-3 w-3" />
                            {collection.daysUntilLaunch}d to launch
                          </span>
                        )}
                        {collection.daysUntilLaunch !== undefined && collection.daysUntilLaunch <= 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 text-xs rounded-full">
                            <CheckCircle2 className="h-3 w-3" />
                            Launched
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/collection/${collection.id}`}
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors"
                      >
                        Continue Working
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
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
