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
  Plus,
  Loader2,
  ArrowRight,
  Trash2,
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
  const [showNewModal, setShowNewModal] = useState(false);

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
    return collections.map((c) => {
      const tl = timelines.find((t) => t.collection_plan_id === c.id);
      if (!tl) return { ...c, progress: 0 };
      const total = tl.milestones.length;
      const completed = tl.milestones.filter((m) => m.status === 'completed').length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { ...c, timeline: tl, progress };
    });
  }, [collections, timelines]);

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
            /* ── Empty state — editorial choice ── */
            <div className="flex items-center justify-center min-h-[70vh]">
              <div className="w-full max-w-2xl mx-auto text-center">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-light text-carbon tracking-tight leading-[1.05] mb-4">
                  {t.collections.firstCollectionAwaits}
                </h1>
                <p className="text-sm text-carbon/35 max-w-md mx-auto leading-relaxed mb-14">
                  {t.collections.firstCollectionDesc}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
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
                    <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.1em] uppercase text-carbon/30 group-hover:text-carbon transition-colors">
                      {t.overview?.start || 'Start'} <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </Link>
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
                    <p className="text-xs text-crema/30 leading-relaxed mb-6">
                      {(t as Record<string, Record<string, string>>).briefToCollection?.modeDesc || 'Describe your idea and Aimily builds a complete collection proposal for you to refine.'}
                    </p>
                    <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.1em] uppercase text-crema/40 group-hover:text-crema/80 transition-colors">
                      {t.overview?.start || 'Start'} <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* ── Title — big, editorial, like a magazine cover ── */}
              <div className="mb-12 sm:mb-16">
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-light text-carbon tracking-tight leading-[1.05]">
                  <span className="italic">{t.collections.collections}</span>
                </h1>
              </div>

              {/* ── Divider — editorial line ── */}
              <div className="border-t border-carbon/[0.08] mb-10" />

              {/* ── Section header + CTA ── */}
              <div className="flex items-end justify-between mb-8">
                <p className="text-[11px] font-medium tracking-[0.25em] uppercase text-carbon/25">
                  {enrichedCollections.length} {t.collections.collections}
                </p>
                <button
                  onClick={() => setShowNewModal(true)}
                  className="inline-flex items-center gap-2.5 px-6 py-3 border border-carbon/[0.12] text-carbon text-[11px] font-medium tracking-[0.15em] uppercase hover:bg-carbon hover:text-crema transition-all duration-300"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t.collections.newCollection}
                </button>
              </div>

              {/* ── Collection cards — editorial grid ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-carbon/[0.06]">
                {enrichedCollections.map((collection) => (
                  <Link
                    key={collection.id}
                    href={`/collection/${collection.id}`}
                    className="group bg-crema p-8 sm:p-10 flex flex-col transition-all duration-300 hover:bg-white"
                  >
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <h3 className="text-2xl sm:text-3xl font-light text-carbon tracking-tight leading-[1.15] mb-2">
                          {collection.name}
                        </h3>
                        <p className="text-[11px] font-medium text-carbon/25 uppercase tracking-[0.15em]">
                          {collection.season || new Date(collection.created_at).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' })}
                          {collection.setup_data?.totalSalesTarget ? ` · €${collection.setup_data.totalSalesTarget.toLocaleString()}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(collection.id); }}
                        className="p-1.5 text-carbon/0 group-hover:text-carbon/15 hover:!text-error transition-colors flex-shrink-0 mt-1"
                        title={t.collections.deleteCollection}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Progress — minimal */}
                    <div className="mt-auto">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-medium text-carbon/20 uppercase tracking-[0.15em]">{t.common.progress}</span>
                        <span className="text-lg font-light text-carbon tracking-tight">{collection.progress}%</span>
                      </div>
                      <div className="h-[2px] bg-carbon/[0.06]">
                        <div className="h-full bg-carbon transition-all duration-700" style={{ width: `${collection.progress}%` }} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── "New Collection" modal ── */}
      {showNewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ animation: 'fadeIn 0.3s ease-out forwards' }}>
          <div className="absolute inset-0 bg-carbon/90 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
          <div className="relative z-10 w-full max-w-2xl mx-6" style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            <button
              onClick={() => setShowNewModal(false)}
              className="absolute -top-12 right-0 text-crema/30 hover:text-crema/60 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-light text-crema tracking-tight leading-[1.15]">
                {(t.collections as Record<string, string>).howToStart || 'How do you want to start?'}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
