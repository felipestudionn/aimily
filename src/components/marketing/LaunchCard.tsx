'use client';

import { useState, useMemo } from 'react';
import {
  Zap,
  ChevronLeft,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Filter,
  X,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Calendar,
  Edit3,
} from 'lucide-react';
import { useLaunchTasks, type LaunchTask } from '@/hooks/useLaunchTasks';
import { useDrops } from '@/hooks/useDrops';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';

/* ── Constants ── */

const CATEGORIES = [
  { id: 'pre-launch', label: 'Pre-Launch', color: '#3B82F6' },
  { id: 'launch-day', label: 'Launch Day', color: '#10B981' },
  { id: 'post-launch', label: 'Post-Launch', color: '#8B5CF6' },
];

const STATUSES = [
  { id: 'pending', label: 'Pending', color: '#94A3B8' },
  { id: 'in_progress', label: 'In Progress', color: '#F59E0B' },
  { id: 'completed', label: 'Completed', color: '#10B981' },
  { id: 'blocked', label: 'Blocked', color: '#EF4444' },
];

const PRIORITIES = [
  { id: 'critical', label: 'Critical', color: '#EF4444' },
  { id: 'high', label: 'High', color: '#F59E0B' },
  { id: 'medium', label: 'Medium', color: '#3B82F6' },
  { id: 'low', label: 'Low', color: '#94A3B8' },
];

type AiPill = 'libre' | 'asistido' | 'propuesta';

const AI_PILL_IDS: AiPill[] = ['libre', 'asistido', 'propuesta'];
const AI_PILL_LABEL_KEYS: Record<AiPill, 'pillManual' | 'pillAssisted' | 'pillAiProposal'> = {
  libre: 'pillManual', asistido: 'pillAssisted', propuesta: 'pillAiProposal',
};

/* ── Props ── */

interface LaunchCardProps {
  collectionPlanId: string;
}

/* ── Component ── */

export function LaunchCard({ collectionPlanId }: LaunchCardProps) {
  const t = useTranslation();
  const { language } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  // C6 — Post-launch retrospective
  const [retroLoading, setRetroLoading] = useState(false);
  const [retro, setRetro] = useState<{
    overall_assessment?: string;
    wins?: string[];
    areas_for_improvement?: string[];
    recommendations_next_season?: string[];
    story_performance?: Array<{ story_name: string; assessment: string; recommendation: string }>;
  } | null>(null);
  const [retroError, setRetroError] = useState<string | null>(null);
  const [activePill, setActivePill] = useState<AiPill>('libre');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Data hooks
  const { tasks, addTask, updateTask, deleteTask, loading } = useLaunchTasks(collectionPlanId);
  const { drops } = useDrops(collectionPlanId);

  // AI state
  const [isGenerating, setIsGenerating] = useState(false);

  // Form state
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({
    title: '', category: 'pre-launch', due_date: '', assigned_to: '', priority: 'medium', notes: '',
  });

  // Assisted mode state
  const [assistedLaunchDate, setAssistedLaunchDate] = useState('');
  const [assistedChannels, setAssistedChannels] = useState('Instagram, TikTok, Email');
  const [assistedDirection, setAssistedDirection] = useState('');

  // Propuesta mode state
  const [propuestaLaunchDate, setPropuestaLaunchDate] = useState('');
  const [propuestaChannels, setPropuestaChannels] = useState('Instagram, TikTok, Email, Website');

  /* ── Derived data ── */

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (categoryFilter !== 'ALL') result = result.filter(t => t.category === categoryFilter);
    if (statusFilter !== 'ALL') result = result.filter(t => t.status === statusFilter);
    if (priorityFilter !== 'ALL') result = result.filter(t => t.priority === priorityFilter);
    return result;
  }, [tasks, categoryFilter, statusFilter, priorityFilter]);

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const completedPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const tasksByCategory = useMemo(() => {
    const grouped: Record<string, LaunchTask[]> = {};
    CATEGORIES.forEach(cat => { grouped[cat.id] = []; });
    filteredTasks.forEach(t => {
      if (!grouped[t.category]) grouped[t.category] = [];
      grouped[t.category].push(t);
    });
    return grouped;
  }, [filteredTasks]);

  const categoryProgress = useMemo(() => {
    return CATEGORIES.map(cat => {
      const catTasks = tasks.filter(t => t.category === cat.id);
      const done = catTasks.filter(t => t.status === 'completed').length;
      return { ...cat, total: catTasks.length, done, pct: catTasks.length > 0 ? Math.round((done / catTasks.length) * 100) : 0 };
    });
  }, [tasks]);

  // Days to launch (from the first drop's launch_date or first task due_date)
  const daysToLaunch = useMemo(() => {
    const firstDrop = drops.sort((a, b) => (a.launch_date || '').localeCompare(b.launch_date || ''))[0];
    const launchDate = firstDrop?.launch_date;
    if (!launchDate) return null;
    const diff = Math.ceil((new Date(launchDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [drops]);

  /* ── Handlers ── */

  const handleAddTask = async () => {
    if (!newTask.title) return;
    await addTask({
      collection_plan_id: collectionPlanId,
      title: newTask.title,
      category: newTask.category,
      due_date: newTask.due_date || null,
      assigned_to: newTask.assigned_to || null,
      status: 'pending',
      priority: newTask.priority,
      notes: newTask.notes || null,
      depends_on: [],
    });
    setNewTask({ title: '', category: 'pre-launch', due_date: '', assigned_to: '', priority: 'medium', notes: '' });
    setShowAddTask(false);
  };

  const handleToggleStatus = async (task: LaunchTask) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    await updateTask(task.id, { status: nextStatus });
  };

  const handleAiGenerate = async (mode: 'asistido' | 'propuesta') => {
    setIsGenerating(true);
    try {
      const body: Record<string, any> = {
        collectionPlanId,
        mode,
        launchDate: mode === 'asistido' ? assistedLaunchDate : propuestaLaunchDate,
        channels: mode === 'asistido' ? assistedChannels : propuestaChannels,
        dropsCount: drops.length,
        skuCount: 0,
        storiesCount: 0,
        language,
      };

      if (mode === 'asistido') {
        body.userDirection = assistedDirection;
        body.existingTasks = tasks.map(t => ({ title: t.title, category: t.category }));
      }

      const response = await fetch('/api/ai/launch/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Failed to generate launch plan');
      const data = await response.json();

      // Apply generated tasks
      if (data.categories?.length > 0) {
        for (const cat of data.categories) {
          const categoryMap: Record<string, string> = {
            'pre-launch': 'pre-launch',
            'Pre-Launch': 'pre-launch',
            'launch-day': 'launch-day',
            'Launch Day': 'launch-day',
            'launch_day': 'launch-day',
            'post-launch': 'post-launch',
            'Post-Launch': 'post-launch',
            'post_launch': 'post-launch',
          };
          const catId = categoryMap[cat.name] || 'pre-launch';

          for (const item of cat.items || []) {
            const priorityMap: Record<string, string> = {
              critical: 'critical', important: 'high', nice_to_have: 'low',
            };
            const launchDate = mode === 'asistido' ? assistedLaunchDate : propuestaLaunchDate;
            let dueDate: string | null = null;
            if (launchDate && item.deadline_days_before_launch != null) {
              const d = new Date(launchDate);
              d.setDate(d.getDate() - (item.deadline_days_before_launch || 0));
              dueDate = d.toISOString().split('T')[0];
            }

            await addTask({
              collection_plan_id: collectionPlanId,
              title: item.task,
              category: catId,
              due_date: dueDate,
              assigned_to: null,
              status: 'pending',
              priority: priorityMap[item.priority] || 'medium',
              notes: item.depends_on || null,
              depends_on: [],
            });
          }
        }
      }
    } catch (error) {
      console.error('Error generating launch plan:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // C6 — Generate post-launch retrospective on demand.
  const handleGenerateRetro = async () => {
    setRetroLoading(true);
    setRetroError(null);
    try {
      const response = await fetch('/api/ai/post-launch/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPlanId,
          language,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate retrospective');
      }
      const data = await response.json();
      setRetro(data.result || null);
    } catch (err) {
      console.error('Retrospective generation error:', err);
      setRetroError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRetroLoading(false);
    }
  };

  // C6 — Is this collection past launch? (>= 1 day after first drop)
  const isPastLaunch = (() => {
    const firstDrop = drops
      .map((d) => d.launch_date)
      .filter(Boolean)
      .sort((a, b) => (a || '').localeCompare(b || ''))[0];
    if (!firstDrop) return false;
    return new Date(firstDrop) <= new Date();
  })();

  const getCategoryColor = (catId: string) =>
    CATEGORIES.find(c => c.id === catId)?.color || '#94A3B8';

  const getCategoryLabel = (catId: string) =>
    CATEGORIES.find(c => c.id === catId)?.label || catId;

  const getPriorityColor = (pId: string) =>
    PRIORITIES.find(p => p.id === pId)?.color || '#94A3B8';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'blocked': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Circle className="h-4 w-4 text-carbon/20" />;
    }
  };

  /* ── Card (collapsed) ── */
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="group relative bg-white p-10 lg:p-12 border border-carbon/[0.06] flex flex-col min-h-[340px] hover:shadow-lg transition-all duration-300 text-left w-full"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-carbon/[0.04] flex items-center justify-center flex-shrink-0">
            <Zap className="h-5 w-5 text-carbon/40 group-hover:text-carbon/70 transition-colors" />
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25 mb-1">
              {t.marketingPage.launchLabel}
            </p>
            <h3 className="text-xl md:text-2xl font-light text-carbon tracking-tight leading-[1.15]">
              {t.marketingPage.launchTitle}
            </h3>
          </div>
        </div>
        <p className="text-sm font-light text-carbon/45 leading-relaxed flex-1">
          {t.marketingPage.launchDesc}
        </p>

        <div className="mt-6 pt-6 border-t border-carbon/[0.06]">
          {loading ? (
            <p className="text-xs text-carbon/30">{t.marketingPage.loading}</p>
          ) : tasks.length === 0 ? (
            <p className="text-xs text-carbon/20 tracking-wide">{t.marketingPage.noTasksYet}</p>
          ) : (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-light text-carbon">{tasks.length}</span>
                <span className="text-xs text-carbon/40">{t.marketingPage.tasks}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-light text-carbon/60">{completedPct}%</span>
                <span className="text-xs text-carbon/40">{t.marketingPage.done}</span>
              </div>
              {daysToLaunch !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-light text-carbon">
                    {daysToLaunch > 0 ? daysToLaunch : 0}
                  </span>
                  <span className="text-xs text-carbon/40">{t.marketingPage.daysToLaunch}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 bg-carbon text-crema py-3 px-4 text-[11px] font-medium uppercase tracking-[0.15em] group-hover:bg-carbon/90 transition-colors">
          {t.marketingPage.open}
        </div>
      </button>
    );
  }

  /* ── Expanded (full-screen overlay) ── */
  return (
    <div className="fixed inset-0 z-50 bg-crema overflow-auto">
      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-crema/95 backdrop-blur border-b border-carbon/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center gap-1 text-xs font-medium tracking-[0.1em] uppercase text-carbon/50 hover:text-carbon transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              {t.marketingPage.back}
            </button>
            <div className="h-6 w-px bg-carbon/10" />
            <Zap className="h-5 w-5 text-carbon/40" />
            <div>
              <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25">
                {t.marketingPage.launchLabel}
              </p>
              <h2 className="text-lg font-light text-carbon tracking-tight">{t.marketingPage.launchTitle}</h2>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {daysToLaunch !== null && (
              <div className="text-right">
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30">{t.marketingPage.countdown}</p>
                <p className="text-xl font-light text-carbon tracking-tight">
                  {daysToLaunch > 0 ? `${daysToLaunch} ${t.marketingPage.days}` : daysToLaunch === 0 ? t.marketingPage.todayLabel : `${Math.abs(daysToLaunch)}${t.marketingPage.dAgo}`}
                </p>
              </div>
            )}
            <div className="text-right">
              <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30">{t.marketingPage.progress}</p>
              <p className="text-xl font-light text-carbon tracking-tight">{completedPct}%</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30">{t.marketingPage.tasks}</p>
              <p className="text-xl font-light text-carbon tracking-tight">{completedCount}/{tasks.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* C6 — Post-launch retrospective block (only shown after launch) */}
        {isPastLaunch && (
          <div className="bg-white border border-carbon/[0.06] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/40 mb-1">
                  {t.marketingPage.retroHeading}
                </p>
                <p className="text-sm font-light text-carbon/50">
                  {t.marketingPage.retroDesc}
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateRetro}
                disabled={retroLoading}
                className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-40"
              >
                {retroLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {retro ? t.marketingPage.retroRegenerate : t.marketingPage.retroGenerate}
              </button>
            </div>

            {retroError && (
              <p className="text-xs text-red-500/80">{retroError}</p>
            )}

            {retro && (
              <div className="space-y-4 text-sm font-light text-carbon/70">
                {retro.overall_assessment && (
                  <p className="italic">{retro.overall_assessment}</p>
                )}
                {retro.wins && retro.wins.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/40 mb-2">
                      {t.marketingPage.retroWins}
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      {retro.wins.map((w, i) => (
                        <li key={`win-${i}`}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {retro.areas_for_improvement && retro.areas_for_improvement.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/40 mb-2">
                      {t.marketingPage.retroAreas}
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      {retro.areas_for_improvement.map((a, i) => (
                        <li key={`area-${i}`}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {retro.recommendations_next_season && retro.recommendations_next_season.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/40 mb-2">
                      {t.marketingPage.retroRecommendations}
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      {retro.recommendations_next_season.map((r, i) => (
                        <li key={`rec-${i}`}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── AI Pills ── */}
        <div className="flex items-center gap-3">
          {AI_PILL_IDS.map(pillId => (
            <button
              key={pillId}
              onClick={() => setActivePill(pillId)}
              className={`px-4 py-2.5 text-xs font-medium tracking-[0.08em] uppercase border transition-all ${
                activePill === pillId
                  ? 'bg-carbon text-crema border-carbon'
                  : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {pillId !== 'libre' && <Sparkles className="h-3 w-3" />}
                {t.marketingPage[AI_PILL_LABEL_KEYS[pillId]]}
              </span>
            </button>
          ))}
        </div>

        {/* ── Assisted config panel ── */}
        {activePill === 'asistido' && (
          <div className="bg-white border border-carbon/[0.06] p-6 space-y-4">
            <div>
              <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40 mb-1">{t.marketingPage.assistedMode}</p>
              <p className="text-sm font-light text-carbon/50">{t.marketingPage.assistedModeDesc}</p>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">{t.marketingPage.launchDate}</Label>
                <Input type="date" value={assistedLaunchDate} onChange={e => setAssistedLaunchDate(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">{t.marketingPage.channels}</Label>
                <Input value={assistedChannels} onChange={e => setAssistedChannels(e.target.value)} placeholder={t.marketingPage.channelsPlaceholderLaunch} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">{t.marketingPage.directionOptional}</Label>
                <Input value={assistedDirection} onChange={e => setAssistedDirection(e.target.value)} placeholder={t.marketingPage.directionPlaceholderLaunch} className="h-9" />
              </div>
              <div className="flex items-end">
                <Button onClick={() => handleAiGenerate('asistido')} disabled={isGenerating} className="bg-carbon hover:bg-carbon/90 rounded-sm text-[11px] font-medium tracking-[0.08em] uppercase">
                  {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t.marketingPage.generating}</> : <><Sparkles className="h-4 w-4 mr-2" />{t.marketingPage.generate}</>}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Propuesta config panel ── */}
        {activePill === 'propuesta' && (
          <div className="bg-white border border-carbon/[0.06] p-6 space-y-4">
            <div>
              <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40 mb-1">{t.marketingPage.pillAiProposal}</p>
              <p className="text-sm font-light text-carbon/50">{t.marketingPage.propuestaDesc}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">{t.marketingPage.launchDate}</Label>
                <Input type="date" value={propuestaLaunchDate} onChange={e => setPropuestaLaunchDate(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">{t.marketingPage.channels}</Label>
                <Input value={propuestaChannels} onChange={e => setPropuestaChannels(e.target.value)} placeholder={t.marketingPage.channelsPlaceholderPropuesta} className="h-9" />
              </div>
              <div className="flex items-end">
                <Button onClick={() => handleAiGenerate('propuesta')} disabled={isGenerating} className="bg-carbon hover:bg-carbon/90 rounded-sm text-[11px] font-medium tracking-[0.08em] uppercase">
                  {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t.marketingPage.generating}</> : <><Sparkles className="h-4 w-4 mr-2" />{t.marketingPage.fullPlan}</>}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-carbon/30" />
            <span className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">{t.marketingPage.categoryLabel}:</span>
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1.5 text-xs border transition-colors ${categoryFilter === 'ALL' ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'}`}
            >
              {t.marketingPage.all}
            </button>
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(c.id)}
                className={`px-3 py-1.5 text-xs border transition-colors ${categoryFilter === c.id ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-carbon/10" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">{t.marketingPage.status}:</span>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs border transition-colors ${statusFilter === 'ALL' ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'}`}
            >
              {t.marketingPage.all}
            </button>
            {STATUSES.map(s => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`px-3 py-1.5 text-xs border transition-colors ${statusFilter === s.id ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'}`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-carbon/10" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">{t.marketingPage.priority}:</span>
            <button
              onClick={() => setPriorityFilter('ALL')}
              className={`px-3 py-1.5 text-xs border transition-colors ${priorityFilter === 'ALL' ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'}`}
            >
              {t.marketingPage.all}
            </button>
            {PRIORITIES.map(p => (
              <button
                key={p.id}
                onClick={() => setPriorityFilter(p.id)}
                className={`px-3 py-1.5 text-xs border transition-colors ${priorityFilter === p.id ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Progress by Category ── */}
        {tasks.length > 0 && (
          <div className="grid grid-cols-3 gap-5">
            {categoryProgress.map(cat => (
              <div key={cat.id} className="bg-white border border-carbon/[0.06] p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">{cat.label}</p>
                  <span className="text-xs text-carbon/30">{cat.done}/{cat.total}</span>
                </div>
                <div className="h-2 bg-carbon/[0.04] w-full mb-2">
                  <div
                    className="h-full transition-all duration-300"
                    style={{ width: `${cat.pct}%`, backgroundColor: cat.color }}
                  />
                </div>
                <p className="text-right text-xs text-carbon/30">{cat.pct}%</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Tasks by Category ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30">
              {t.marketingPage.tasks} ({filteredTasks.length})
            </p>
            <Button
              onClick={() => setShowAddTask(true)}
              className="bg-carbon hover:bg-carbon/90 rounded-sm text-[11px] font-medium tracking-[0.08em] uppercase h-9"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {t.marketingPage.addTask}
            </Button>
          </div>

          {/* Add Task Form */}
          {showAddTask && (
            <div className="bg-white border border-carbon/[0.06] p-6 mb-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">{t.marketingPage.newTask}</p>
                <button onClick={() => setShowAddTask(false)} className="text-carbon/30 hover:text-carbon">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                  <Label className="text-xs">{t.marketingPage.title}</Label>
                  <Input value={newTask.title} onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))} placeholder={t.marketingPage.taskDescription} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">{t.marketingPage.categoryLabel}</Label>
                  <Select value={newTask.category} onValueChange={v => setNewTask(prev => ({ ...prev, category: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t.marketingPage.priority}</Label>
                  <Select value={newTask.priority} onValueChange={v => setNewTask(prev => ({ ...prev, priority: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs">{t.marketingPage.dueDate}</Label>
                  <Input type="date" value={newTask.due_date} onChange={e => setNewTask(prev => ({ ...prev, due_date: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">{t.marketingPage.assignedTo}</Label>
                  <Input value={newTask.assigned_to} onChange={e => setNewTask(prev => ({ ...prev, assigned_to: e.target.value }))} placeholder={t.marketingPage.namePlaceholder} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">{t.marketingPage.notes}</Label>
                  <Input value={newTask.notes} onChange={e => setNewTask(prev => ({ ...prev, notes: e.target.value }))} placeholder={t.marketingPage.optionalNotes} className="h-9" />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddTask} disabled={!newTask.title} className="bg-carbon hover:bg-carbon/90 rounded-sm text-[11px] font-medium tracking-[0.08em] uppercase">
                    {t.common.create}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Tasks grouped by category */}
          {filteredTasks.length === 0 && !loading && (
            <div className="bg-white border border-carbon/[0.06] p-12 text-center">
              <Zap className="h-8 w-8 text-carbon/15 mx-auto mb-3" />
              <p className="text-sm font-light text-carbon/30">{t.marketingPage.noLaunchTasksYet}</p>
            </div>
          )}

          <div className="space-y-6">
            {CATEGORIES.map(cat => {
              const catTasks = tasksByCategory[cat.id] || [];
              if (catTasks.length === 0 && categoryFilter !== 'ALL' && categoryFilter !== cat.id) return null;
              if (catTasks.length === 0 && categoryFilter === 'ALL' && filteredTasks.length === 0) return null;
              if (catTasks.length === 0) return null;

              return (
                <div key={cat.id}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">{cat.label}</p>
                    <span className="text-xs text-carbon/20">({catTasks.length})</span>
                  </div>

                  <div className="space-y-2">
                    {catTasks.map(task => {
                      const isEditing = editingId === task.id;

                      return (
                        <div key={task.id} className="bg-white border border-carbon/[0.06] p-4 flex items-center gap-4">
                          {/* Check toggle */}
                          <button
                            onClick={() => handleToggleStatus(task)}
                            className="flex-shrink-0 hover:scale-110 transition-transform"
                          >
                            {getStatusIcon(task.status)}
                          </button>

                          {/* Task info */}
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <Input
                                value={task.title}
                                onChange={e => updateTask(task.id, { title: e.target.value })}
                                className="h-7 text-sm font-medium"
                                onBlur={() => setEditingId(null)}
                                autoFocus
                              />
                            ) : (
                              <p className={`text-sm font-medium truncate ${task.status === 'completed' ? 'text-carbon/30 line-through' : 'text-carbon'}`}>
                                {task.title}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-1">
                              {task.due_date && (
                                <span className="text-xs text-carbon/40 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {task.due_date}
                                </span>
                              )}
                              {task.assigned_to && (
                                <span className="text-xs text-carbon/40">{task.assigned_to}</span>
                              )}
                              {task.notes && (
                                <span className="text-xs text-carbon/30 truncate max-w-[200px]">{task.notes}</span>
                              )}
                            </div>
                          </div>

                          {/* Priority badge */}
                          <span
                            className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white rounded-sm flex-shrink-0"
                            style={{ backgroundColor: getPriorityColor(task.priority) }}
                          >
                            {task.priority}
                          </span>

                          {/* Status select */}
                          <Select
                            value={task.status}
                            onValueChange={v => updateTask(task.id, { status: v })}
                          >
                            <SelectTrigger className="h-7 w-28 text-xs border-0 p-0 justify-center flex-shrink-0">
                              <span
                                className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white rounded-sm"
                                style={{ backgroundColor: STATUSES.find(s => s.id === task.status)?.color || '#94A3B8' }}
                              >
                                {STATUSES.find(s => s.id === task.status)?.label || task.status}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Actions */}
                          <button
                            onClick={() => setEditingId(task.id)}
                            className="text-carbon/20 hover:text-carbon/60 transition-colors flex-shrink-0"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="text-carbon/20 hover:text-red-500 transition-colors flex-shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
