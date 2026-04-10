'use client';

import { useState, useMemo } from 'react';
import {
  Rocket,
  ChevronLeft,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Filter,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calendar,
  GripVertical,
  X,
} from 'lucide-react';
import { useDrops, type Drop } from '@/hooks/useDrops';
import { useCommercialActions, type CommercialAction } from '@/hooks/useCommercialActions';
import { useSkus, type SKU } from '@/hooks/useSkus';
import { useStories, type Story } from '@/hooks/useStories';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';

/* ── Constants ── */

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ACTION_COLORS: Record<string, string> = {
  SALE: 'bg-red-500', COLLAB: 'bg-purple-500', CAMPAIGN: 'bg-blue-500',
  SEEDING: 'bg-green-500', EVENT: 'bg-orange-500', OTHER: 'bg-gray-500',
};

const CATEGORY_COLORS: Record<string, string> = {
  VISIBILIDAD: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  POSICIONAMIENTO: 'bg-blue-100 text-blue-800 border-blue-300',
  VENTAS: 'bg-green-100 text-green-800 border-green-300',
  NOTORIEDAD: 'bg-purple-100 text-purple-800 border-purple-300',
};

type AiPill = 'libre' | 'asistido' | 'propuesta';

const AI_PILL_IDS: AiPill[] = ['libre', 'asistido', 'propuesta'];
const AI_PILL_LABEL_KEYS: Record<AiPill, 'pillManual' | 'pillAssisted' | 'pillAiProposal'> = {
  libre: 'pillManual', asistido: 'pillAssisted', propuesta: 'pillAiProposal',
};

/* ── Props ── */

interface GoToMarketCardProps {
  collectionPlanId: string;
}

/* ── Component ── */

export function GoToMarketCard({ collectionPlanId }: GoToMarketCardProps) {
  const t = useTranslation();
  const { language } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [activePill, setActivePill] = useState<AiPill>('libre');
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string>('ALL');

  // Data hooks
  const { drops, addDrop, updateDrop, deleteDrop, loading: dropsLoading } = useDrops(collectionPlanId);
  const { actions, addAction, deleteAction, loading: actionsLoading } = useCommercialActions(collectionPlanId);
  const { skus, updateSku, refetch: refetchSkus } = useSkus(collectionPlanId);
  const { stories, loading: storiesLoading } = useStories(collectionPlanId);

  // AI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [showAddDrop, setShowAddDrop] = useState(false);
  const [showAddAction, setShowAddAction] = useState(false);
  const [newDrop, setNewDrop] = useState({ name: '', launch_date: '', weeks_active: 8 });
  const [newAction, setNewAction] = useState({ name: '', action_type: 'CAMPAIGN' as CommercialAction['action_type'], start_date: '', category: '' });

  // Assisted mode state
  const [assistedDropCount, setAssistedDropCount] = useState(3);
  const [assistedDates, setAssistedDates] = useState('');

  // Propuesta mode state
  const [propuestaLaunchDate, setPropuestaLaunchDate] = useState('');
  const [propuestaDropCount, setPropuestaDropCount] = useState(3);
  const [propuestaChannels, setPropuestaChannels] = useState('DTC,WHOLESALE');

  /* ── Derived data ── */

  const filteredSkus = useMemo(() => {
    let result = skus;
    if (channelFilter !== 'ALL') {
      result = result.filter(sku => sku.channel === channelFilter || sku.channel === 'BOTH');
    }
    if (activeStoryId) {
      result = result.filter(sku => (sku as SKU & { story_id?: string }).story_id === activeStoryId);
    }
    return result;
  }, [skus, channelFilter, activeStoryId]);

  const skusByDrop = useMemo(() => {
    const grouped: Record<number, SKU[]> = {};
    filteredSkus.forEach(sku => {
      const dropNum = sku.drop_number || 1;
      if (!grouped[dropNum]) grouped[dropNum] = [];
      grouped[dropNum].push(sku);
    });
    return grouped;
  }, [filteredSkus]);

  const totalPlannedSales = skus.reduce((sum, sku) => sum + (sku.expected_sales || 0), 0);

  // Timeline calculation
  const timelineData = useMemo(() => {
    if (drops.length === 0) return { months: [] as { date: Date; label: string; year: number }[], startDate: new Date(), endDate: new Date() };
    const sortedDrops = [...drops].sort((a, b) => new Date(a.launch_date).getTime() - new Date(b.launch_date).getTime());
    const startDate = new Date(sortedDrops[0].launch_date);
    startDate.setDate(1);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 6);
    const months: { date: Date; label: string; year: number }[] = [];
    const current = new Date(startDate);
    while (current < endDate) {
      months.push({ date: new Date(current), label: MONTH_NAMES[current.getMonth()], year: current.getFullYear() });
      current.setMonth(current.getMonth() + 1);
    }
    return { months, startDate, endDate };
  }, [drops]);

  const plannedSalesByMonth = useMemo(() => {
    if (drops.length === 0 || timelineData.months.length === 0) return [];
    return timelineData.months.map(month => {
      let monthlySales = 0;
      const monthStart = month.date;
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      drops.forEach(drop => {
        const dropStart = new Date(drop.launch_date);
        const dropEnd = new Date(dropStart);
        dropEnd.setDate(dropEnd.getDate() + (drop.weeks_active || 8) * 7);
        if (dropStart < monthEnd && dropEnd > monthStart) {
          const dropSkus = skus.filter(s => s.drop_number === drop.drop_number);
          const dropTotalSales = dropSkus.reduce((sum, s) => sum + (s.expected_sales || 0), 0);
          const weeklyRate = dropTotalSales / (drop.weeks_active || 8);
          const overlapStart = new Date(Math.max(dropStart.getTime(), monthStart.getTime()));
          const overlapEnd = new Date(Math.min(dropEnd.getTime(), monthEnd.getTime()));
          const overlapWeeks = Math.max(0, (overlapEnd.getTime() - overlapStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
          monthlySales += weeklyRate * overlapWeeks;
        }
      });
      return { month: month.label, year: month.year, sales: Math.round(monthlySales) };
    });
  }, [drops, skus, timelineData]);

  const getTimelinePosition = (dateStr: string) => {
    if (!timelineData.startDate || !timelineData.endDate) return 0;
    const date = new Date(dateStr);
    const totalRange = timelineData.endDate.getTime() - timelineData.startDate.getTime();
    const position = date.getTime() - timelineData.startDate.getTime();
    return Math.max(0, Math.min(100, (position / totalRange) * 100));
  };

  /* ── Handlers ── */

  const handleAddDrop = async () => {
    if (!newDrop.name || !newDrop.launch_date) return;
    const nextDropNumber = drops.length > 0 ? Math.max(...drops.map(d => d.drop_number)) + 1 : 1;
    await addDrop({
      collection_plan_id: collectionPlanId, drop_number: nextDropNumber, name: newDrop.name,
      launch_date: newDrop.launch_date, weeks_active: newDrop.weeks_active,
      channels: ['DTC', 'WHOLESALE'], position: drops.length,
    });
    setNewDrop({ name: '', launch_date: '', weeks_active: 8 });
    setShowAddDrop(false);
  };

  const handleAddAction = async () => {
    if (!newAction.name || !newAction.start_date) return;
    await addAction({
      collection_plan_id: collectionPlanId, name: newAction.name, action_type: newAction.action_type,
      start_date: newAction.start_date, category: newAction.category,
      channels: ['DTC', 'WHOLESALE'], position: actions.length,
    });
    setNewAction({ name: '', action_type: 'CAMPAIGN', start_date: '', category: '' });
    setShowAddAction(false);
  };

  const handleMoveSku = async (skuId: string, newDropNumber: number) => {
    await updateSku(skuId, { drop_number: newDropNumber });
    refetchSkus();
  };

  const handleGeneratePrediction = async () => {
    setIsGenerating(true);
    try {
      const calculatedSalesTarget = skus.reduce((sum, sku) => sum + (sku.expected_sales || 0), 0);
      const response = await fetch('/api/ai/market-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPlanId, drops, commercialActions: actions, skus,
          totalSalesTarget: calculatedSalesTarget, season: 'SS',
          productCategory: 'Fashion', location: 'Europe', language,
        }),
      });
      if (!response.ok) throw new Error('Failed to generate prediction');
      const data = await response.json();
      setPrediction(data);
    } catch (error) {
      console.error('Error generating prediction:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAiGenerate = async (mode: 'asistido' | 'propuesta') => {
    setIsGenerating(true);
    try {
      const storiesContext = stories.map(s => ({
        name: s.name, narrative: s.narrative, mood: s.mood,
        hero_sku_id: s.hero_sku_id,
        sku_ids: skus.filter(sk => (sk as SKU & { story_id?: string }).story_id === s.id).map(sk => sk.id),
      }));

      const body: Record<string, any> = {
        collectionPlanId,
        mode,
        stories: storiesContext,
        skus: skus.map(s => ({ id: s.id, name: s.name, family: s.family, pvp: s.pvp, drop_number: s.drop_number, expected_sales: s.expected_sales, type: s.type })),
        totalSalesTarget: totalPlannedSales,
        language,
      };

      if (mode === 'asistido') {
        body.desiredDrops = assistedDropCount;
        body.specificDates = assistedDates;
      } else {
        body.launchDate = propuestaLaunchDate;
        body.desiredDrops = propuestaDropCount;
        body.channels = propuestaChannels;
      }

      const response = await fetch('/api/ai/gtm/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Failed to generate GTM plan');
      const data = await response.json();

      // Apply generated drops
      if (data.drops?.length > 0) {
        for (const genDrop of data.drops) {
          await addDrop({
            collection_plan_id: collectionPlanId,
            drop_number: genDrop.drop_number || drops.length + 1,
            name: genDrop.name,
            launch_date: genDrop.launch_date,
            weeks_active: genDrop.weeks_active || 8,
            story_name: genDrop.story_alignment || undefined,
            channels: genDrop.channels || ['DTC', 'WHOLESALE'],
            position: drops.length + (genDrop.drop_number || 1) - 1,
          });
        }
      }

      // Apply generated commercial actions
      if (data.commercial_actions?.length > 0) {
        for (const genAction of data.commercial_actions) {
          await addAction({
            collection_plan_id: collectionPlanId,
            name: genAction.name,
            action_type: genAction.type || 'CAMPAIGN',
            start_date: genAction.date,
            category: genAction.category?.toUpperCase() || '',
            channels: ['DTC', 'WHOLESALE'],
            position: actions.length,
          });
        }
      }

      // Move SKUs to assigned drops if provided
      if (data.drops?.length > 0) {
        for (const genDrop of data.drops) {
          if (genDrop.sku_ids?.length > 0) {
            for (const skuId of genDrop.sku_ids) {
              await updateSku(skuId, { drop_number: genDrop.drop_number || 1 });
            }
          }
        }
        refetchSkus();
      }

    } catch (error) {
      console.error('Error generating GTM plan:', error);
    } finally {
      setIsGenerating(false);
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
            <Rocket className="h-5 w-5 text-carbon/40 group-hover:text-carbon/70 transition-colors" />
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25 mb-1">
              {t.marketingPage.gtmLabel}
            </p>
            <h3 className="text-xl md:text-2xl font-light text-carbon tracking-tight leading-[1.15]">
              {t.marketingPage.gtmTitle}
            </h3>
          </div>
        </div>
        <p className="text-sm font-light text-carbon/45 leading-relaxed flex-1">
          {t.marketingPage.gtmDesc}
        </p>

        <div className="mt-6 pt-6 border-t border-carbon/[0.06]">
          {dropsLoading ? (
            <p className="text-xs text-carbon/30">{t.marketingPage.loading}</p>
          ) : drops.length === 0 && actions.length === 0 ? (
            <p className="text-xs text-carbon/20 tracking-wide">{t.marketingPage.noTasksYet}</p>
          ) : (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-light text-carbon">{drops.length}</span>
                <span className="text-xs text-carbon/40">{t.marketingPage.drops}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-light text-carbon">{actions.length}</span>
                <span className="text-xs text-carbon/40">{t.marketingPage.commercialActions}</span>
              </div>
              {totalPlannedSales > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-light text-carbon/60">€{totalPlannedSales.toLocaleString()}</span>
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
            <Rocket className="h-5 w-5 text-carbon/40" />
            <div>
              <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25">
                {t.marketingPage.gtmLabel}
              </p>
              <h2 className="text-lg font-light text-carbon tracking-tight">{t.marketingPage.gtmTitle}</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {totalPlannedSales > 0 && (
              <div className="text-right">
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30">{t.marketingPage.totalSalesTarget}</p>
                <p className="text-xl font-light text-carbon tracking-tight">€{totalPlannedSales.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

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

        {/* ── Assisted / Propuesta config panels ── */}
        {activePill === 'asistido' && (
          <div className="bg-white border border-carbon/[0.06] p-6 space-y-4">
            <div>
              <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40 mb-1">{t.marketingPage.assistedMode}</p>
              <p className="text-sm font-light text-carbon/50">{t.marketingPage.assistedModeDesc}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">{t.marketingPage.numberOfDrops}</Label>
                <Input type="number" min={1} max={12} value={assistedDropCount} onChange={e => setAssistedDropCount(Number(e.target.value))} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">{t.marketingPage.keyDates}</Label>
                <Input value={assistedDates} onChange={e => setAssistedDates(e.target.value)} placeholder={t.marketingPage.datePlaceholderGtm} className="h-9" />
              </div>
              <div className="flex items-end">
                <Button onClick={() => handleAiGenerate('asistido')} disabled={isGenerating} className="bg-carbon hover:bg-carbon/90 rounded-sm text-[11px] font-medium tracking-[0.08em] uppercase">
                  {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t.marketingPage.generating}</> : <><Sparkles className="h-4 w-4 mr-2" />{t.marketingPage.generatePlan}</>}
                </Button>
              </div>
            </div>
          </div>
        )}

        {activePill === 'propuesta' && (
          <div className="bg-white border border-carbon/[0.06] p-6 space-y-4">
            <div>
              <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40 mb-1">{t.marketingPage.pillAiProposal}</p>
              <p className="text-sm font-light text-carbon/50">{t.marketingPage.propuestaDesc}</p>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">{t.marketingPage.launchDateLabel}</Label>
                <Input type="date" value={propuestaLaunchDate} onChange={e => setPropuestaLaunchDate(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">{t.marketingPage.numberOfDrops}</Label>
                <Input type="number" min={1} max={12} value={propuestaDropCount} onChange={e => setPropuestaDropCount(Number(e.target.value))} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">{t.marketingPage.channels}</Label>
                <Input value={propuestaChannels} onChange={e => setPropuestaChannels(e.target.value)} placeholder={t.marketingPage.channelsPlaceholderGtm} className="h-9" />
              </div>
              <div className="flex items-end">
                <Button onClick={() => handleAiGenerate('propuesta')} disabled={isGenerating || !propuestaLaunchDate} className="bg-carbon hover:bg-carbon/90 rounded-sm text-[11px] font-medium tracking-[0.08em] uppercase">
                  {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t.marketingPage.generating}</> : <><Sparkles className="h-4 w-4 mr-2" />{t.marketingPage.generateFullPlan}</>}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Story Filter + Channel Filter ── */}
        <div className="flex items-center gap-6 flex-wrap">
          {/* Story filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-carbon/30" />
            <span className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">{t.marketingPage.story}:</span>
            <button
              onClick={() => setActiveStoryId(null)}
              className={`px-3 py-1.5 text-xs border transition-colors ${!activeStoryId ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'}`}
            >
              {t.marketingPage.all}
            </button>
            {stories.map(story => (
              <button
                key={story.id}
                onClick={() => setActiveStoryId(story.id)}
                className={`px-3 py-1.5 text-xs border transition-colors ${activeStoryId === story.id ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'}`}
              >
                {story.name}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-carbon/10" />

          {/* Channel filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">{t.marketingPage.channel}:</span>
            {['ALL', 'DTC', 'WHOLESALE'].map(ch => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={`px-3 py-1.5 text-xs border transition-colors ${channelFilter === ch ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'}`}
              >
                {ch === 'ALL' ? t.marketingPage.all : ch}
              </button>
            ))}
          </div>
        </div>

        {/* ── Visual Timeline ── */}
        {drops.length > 0 && (
          <div className="bg-white border border-carbon/[0.06] p-6">
            <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-1">{t.marketingPage.launchTimeline}</p>
            <p className="text-sm font-light text-carbon/40 mb-4">{t.marketingPage.dropsAndActions}</p>
            <div className="relative">
              {/* Month labels */}
              <div className="flex border-b border-carbon/[0.06] mb-4">
                {timelineData.months.map((month, i) => (
                  <div key={i} className="flex-1 text-center pb-2">
                    <span className="text-sm font-medium text-carbon/60">{month.label}</span>
                    <span className="text-xs text-carbon/30 ml-1">{month.year}</span>
                  </div>
                ))}
              </div>

              {/* Timeline track */}
              <div className="relative h-24 bg-gradient-to-r from-carbon/[0.02] to-carbon/[0.04] border border-carbon/[0.06]">
                <div className="absolute inset-0 flex">
                  {timelineData.months.map((_, i) => (
                    <div key={i} className="flex-1 border-r border-carbon/[0.06] last:border-r-0" />
                  ))}
                </div>

                {/* Drop circles */}
                <div className="absolute top-4 left-0 right-0 h-8">
                  {drops.map((drop, i) => {
                    const position = getTimelinePosition(drop.launch_date);
                    const dropSkus = skusByDrop[drop.drop_number] || [];
                    const dropSales = dropSkus.reduce((sum, s) => sum + (s.expected_sales || 0), 0);
                    const colors = ['bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500'];
                    return (
                      <div key={drop.id} className="absolute transform -translate-x-1/2 group cursor-pointer" style={{ left: `${position}%` }}>
                        <div className={`w-10 h-10 rounded-full ${colors[i % colors.length]} text-white flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white`}>
                          D{drop.drop_number}
                        </div>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                          <div className="bg-carbon text-white text-xs px-3 py-2 whitespace-nowrap shadow-xl">
                            <p className="font-semibold">{drop.name}</p>
                            <p>{new Date(drop.launch_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</p>
                            <p className="text-green-400">€{Math.round(dropSales).toLocaleString()}</p>
                          </div>
                        </div>
                        <div
                          className={`absolute top-1/2 left-5 h-2 ${colors[i % colors.length]} opacity-30 rounded-r`}
                          style={{ width: `${(drop.weeks_active || 8) * 2}px` }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Action dots */}
                <div className="absolute bottom-3 left-0 right-0 h-6">
                  {actions.map(action => {
                    const position = getTimelinePosition(action.start_date);
                    return (
                      <div key={action.id} className="absolute transform -translate-x-1/2 group cursor-pointer" style={{ left: `${position}%` }}>
                        <div className={`w-4 h-4 rounded-full ${ACTION_COLORS[action.action_type]} border-2 border-white shadow`} />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                          <div className="bg-carbon text-white text-xs px-2 py-1 whitespace-nowrap">
                            <p className="font-medium">{action.name}</p>
                            <p className="text-carbon/60">{action.action_type}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 mt-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">D</div>
                  <span className="text-carbon/40">{t.marketingPage.drops}</span>
                </div>
                <div className="flex items-center gap-4">
                  {Object.entries(ACTION_COLORS).slice(0, 4).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-1">
                      <div className={`w-3 h-3 rounded-full ${color}`} />
                      <span className="text-carbon/40 capitalize">{type.toLowerCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Drops Section ── */}
        <div className="bg-white border border-carbon/[0.06] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-1">{t.marketingPage.drops}</p>
              <p className="text-sm font-light text-carbon/40">{t.marketingPage.dragProducts}</p>
            </div>
            <Button size="sm" onClick={() => setShowAddDrop(true)} className="rounded-sm text-[11px] font-medium tracking-[0.08em] uppercase">
              <Plus className="h-4 w-4 mr-1" />{t.marketingPage.addDrop}
            </Button>
          </div>

          {showAddDrop && (
            <div className="mb-4 p-4 border border-carbon/[0.06] bg-carbon/[0.02] grid grid-cols-4 gap-4">
              <div><Label className="text-xs">{t.marketingPage.dropName}</Label><Input value={newDrop.name} onChange={e => setNewDrop({ ...newDrop, name: e.target.value })} placeholder={t.marketingPage.dropNamePlaceholder} className="h-9" /></div>
              <div><Label className="text-xs">{t.marketingPage.launchDate}</Label><Input type="date" value={newDrop.launch_date} onChange={e => setNewDrop({ ...newDrop, launch_date: e.target.value })} className="h-9" /></div>
              <div><Label className="text-xs">{t.marketingPage.weeksActive}</Label><Input type="number" value={newDrop.weeks_active} onChange={e => setNewDrop({ ...newDrop, weeks_active: Number(e.target.value) })} className="h-9" min={1} max={52} /></div>
              <div className="flex items-end gap-2">
                <Button size="sm" onClick={handleAddDrop} className="rounded-sm">{t.common.add}</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddDrop(false)} className="rounded-sm">{t.common.cancel}</Button>
              </div>
            </div>
          )}

          <div className="flex gap-4 overflow-x-auto pb-4">
            {drops.map(drop => (
              <div key={drop.id} className="flex-shrink-0 w-64 border border-carbon/[0.06] bg-white">
                <div className="p-3 border-b border-carbon/[0.06] bg-carbon/[0.02]">
                  <div className="flex items-center justify-between mb-1">
                    <Input value={drop.name} onChange={e => updateDrop(drop.id, { name: e.target.value })} className="h-7 text-sm font-medium bg-transparent border-none p-0 focus-visible:ring-0" />
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deleteDrop(drop.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-carbon/40">
                    <Calendar className="h-3 w-3" />
                    <Input type="date" value={drop.launch_date} onChange={e => updateDrop(drop.id, { launch_date: e.target.value })} className="h-6 text-xs bg-transparent border-none p-0 w-auto focus-visible:ring-0" />
                  </div>
                  {drop.story_name && (
                    <p className="text-[10px] text-carbon/30 mt-1 italic">{drop.story_name}</p>
                  )}
                </div>
                <div className="p-2 min-h-[120px] max-h-[300px] overflow-y-auto">
                  {(skusByDrop[drop.drop_number] || []).map(sku => (
                    <div key={sku.id} className="flex items-center gap-2 p-2 mb-1 bg-carbon/[0.02] text-xs hover:bg-carbon/[0.04]">
                      <GripVertical className="h-3 w-3 text-carbon/20" />
                      {sku.reference_image_url ? (
                        <img src={sku.reference_image_url} alt={sku.name} className="w-8 h-8 object-cover" />
                      ) : (
                        <div className="w-8 h-8 bg-carbon/[0.06] flex items-center justify-center text-[8px] text-carbon/30">IMG</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{sku.name}</p>
                        <p className="text-carbon/40">€{sku.pvp}</p>
                      </div>
                      <Select value={String(sku.drop_number)} onValueChange={v => handleMoveSku(sku.id, Number(v))}>
                        <SelectTrigger className="h-6 w-16 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{drops.map(d => (<SelectItem key={d.id} value={String(d.drop_number)}>D{d.drop_number}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  ))}
                  {(!skusByDrop[drop.drop_number] || skusByDrop[drop.drop_number].length === 0) && (
                    <p className="text-xs text-carbon/30 text-center py-4">{t.marketingPage.noProducts}</p>
                  )}
                </div>
                <div className="p-2 border-t border-carbon/[0.06] bg-carbon/[0.02] text-xs">
                  <div className="flex justify-between"><span className="text-carbon/40">{t.marketingPage.skus}</span><span className="font-medium">{(skusByDrop[drop.drop_number] || []).length}</span></div>
                  <div className="flex justify-between"><span className="text-carbon/40">{t.marketingPage.sales}</span><span className="font-medium text-green-600">€{Math.round((skusByDrop[drop.drop_number] || []).reduce((s, sku) => s + (sku.expected_sales || 0), 0)).toLocaleString()}</span></div>
                </div>
              </div>
            ))}
            {drops.length === 0 && (
              <div className="w-full py-12 text-center text-carbon/30">
                <Calendar className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-light">{t.marketingPage.noDropsYet}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Commercial Actions ── */}
        <div className="bg-white border border-carbon/[0.06] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-1">{t.marketingPage.commercialActions}</p>
              <p className="text-sm font-light text-carbon/40">{t.marketingPage.commercialActionsDesc}</p>
            </div>
            <Button size="sm" onClick={() => setShowAddAction(true)} className="rounded-sm text-[11px] font-medium tracking-[0.08em] uppercase">
              <Plus className="h-4 w-4 mr-1" />{t.marketingPage.addAction}
            </Button>
          </div>

          {showAddAction && (
            <div className="mb-4 p-4 border border-carbon/[0.06] bg-carbon/[0.02] grid grid-cols-5 gap-4">
              <div><Label className="text-xs">{t.marketingPage.name}</Label><Input value={newAction.name} onChange={e => setNewAction({ ...newAction, name: e.target.value })} placeholder={t.marketingPage.actionNamePlaceholder} className="h-9" /></div>
              <div>
                <Label className="text-xs">{t.marketingPage.type}</Label>
                <Select value={newAction.action_type} onValueChange={v => setNewAction({ ...newAction, action_type: v as any })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SALE">{t.marketingPage.actionTypeSale}</SelectItem>
                    <SelectItem value="COLLAB">{t.marketingPage.actionTypeCollab}</SelectItem>
                    <SelectItem value="CAMPAIGN">{t.marketingPage.actionTypeCampaign}</SelectItem>
                    <SelectItem value="SEEDING">{t.marketingPage.actionTypeSeeding}</SelectItem>
                    <SelectItem value="EVENT">{t.marketingPage.actionTypeEvent}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">{t.marketingPage.date}</Label><Input type="date" value={newAction.start_date} onChange={e => setNewAction({ ...newAction, start_date: e.target.value })} className="h-9" /></div>
              <div>
                <Label className="text-xs">{t.marketingPage.category}</Label>
                <Select value={newAction.category} onValueChange={v => setNewAction({ ...newAction, category: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder={t.marketingPage.selectPlaceholder} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VISIBILIDAD">{t.marketingPage.actionCategoryVisibility}</SelectItem>
                    <SelectItem value="POSICIONAMIENTO">{t.marketingPage.actionCategoryPositioning}</SelectItem>
                    <SelectItem value="VENTAS">{t.marketingPage.actionCategorySales}</SelectItem>
                    <SelectItem value="NOTORIEDAD">{t.marketingPage.actionCategoryAwareness}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button size="sm" onClick={handleAddAction} className="rounded-sm">{t.common.add}</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddAction(false)} className="rounded-sm">{t.common.cancel}</Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {actions.map(action => (
              <div key={action.id} className={`inline-flex items-center gap-2 px-3 py-2 border ${CATEGORY_COLORS[action.category || ''] || 'bg-carbon/[0.02] border-carbon/[0.08]'}`}>
                <div className={`w-2 h-2 rounded-full ${ACTION_COLORS[action.action_type]}`} />
                <div>
                  <p className="text-xs font-medium">{action.name}</p>
                  <p className="text-[10px] text-carbon/40">{new Date(action.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</p>
                </div>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => deleteAction(action.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {actions.length === 0 && <p className="text-sm text-carbon/30 font-light">{t.marketingPage.noActionsYet}</p>}
          </div>
        </div>

        {/* ── AI Market Validation ── */}
        <div className="bg-white border border-carbon/[0.06] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-1">{t.marketingPage.aiMarketValidation}</p>
              <p className="text-sm font-light text-carbon/40">{t.marketingPage.compareWithMarket}</p>
            </div>
            <Button onClick={handleGeneratePrediction} disabled={isGenerating || drops.length === 0} className="rounded-sm text-[11px] font-medium tracking-[0.08em] uppercase">
              {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t.marketingPage.analyzing}</> : <><Sparkles className="h-4 w-4 mr-2" />{t.marketingPage.validateWithAi}</>}
            </Button>
          </div>

          {prediction ? (
            <div className="space-y-6">
              {/* Sales chart */}
              {prediction.weeklyPredictions?.length > 0 && (
                <div className="p-4 bg-carbon/[0.02] border border-carbon/[0.06]">
                  <h4 className="text-sm font-medium text-carbon mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {t.marketingPage.salesForecast}
                  </h4>
                  <div className="relative h-64">
                    {(() => {
                      const predictionsByMonth: Record<string, number> = {};
                      prediction.weeklyPredictions.forEach((wp: any) => {
                        const [year, weekStr] = wp.week.split('-W');
                        const weekNum = parseInt(weekStr);
                        const monthIndex = Math.min(11, Math.floor((weekNum - 1) / 4.33));
                        const monthKey = `${MONTH_NAMES[monthIndex]} ${year}`;
                        predictionsByMonth[monthKey] = (predictionsByMonth[monthKey] || 0) + (wp.predictedSales || 0);
                      });
                      const chartData = plannedSalesByMonth.map(p => ({
                        label: p.month, planned: p.sales,
                        predicted: predictionsByMonth[`${p.month} ${p.year}`] || 0,
                      }));
                      const maxValue = Math.max(...chartData.map(d => Math.max(d.planned, d.predicted)), 1);

                      return (
                        <>
                          <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-carbon/40">
                            <span>€{Math.round(maxValue / 1000)}k</span>
                            <span>€{Math.round(maxValue / 2000)}k</span>
                            <span>€0</span>
                          </div>
                          <div className="ml-16 h-full relative">
                            <svg className="absolute inset-0 w-full h-[calc(100%-2rem)]" viewBox="0 0 100 100" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="gtm-blue" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              <polygon fill="url(#gtm-blue)" opacity="0.15"
                                points={`0,100 ${chartData.map((d, i) => `${(i / (chartData.length - 1)) * 100},${100 - (d.planned / maxValue) * 100}`).join(' ')} 100,100`}
                              />
                              <polyline fill="none" stroke="#f97316" strokeWidth="0.8" strokeDasharray="2,1"
                                points={chartData.map((d, i) => `${(i / (chartData.length - 1)) * 100},${100 - (d.predicted / maxValue) * 100}`).join(' ')}
                              />
                              <polyline fill="none" stroke="#3b82f6" strokeWidth="0.8"
                                points={chartData.map((d, i) => `${(i / (chartData.length - 1)) * 100},${100 - (d.planned / maxValue) * 100}`).join(' ')}
                              />
                            </svg>
                            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-carbon/40 h-8 items-end">
                              {chartData.map((d, i) => (<span key={i}>{d.label}</span>))}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t border-carbon/[0.06]">
                    <div className="flex items-center gap-2"><div className="w-8 h-1 bg-blue-500 rounded" /><span className="text-xs text-carbon/50">{t.marketingPage.yourPlan}</span></div>
                    <div className="flex items-center gap-2"><div className="w-8 h-1 bg-orange-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #f97316 0, #f97316 8px, transparent 8px, transparent 12px)' }} /><span className="text-xs text-carbon/50">{t.marketingPage.aiMarketPrediction}</span></div>
                  </div>
                </div>
              )}

              {/* Insights */}
              {prediction.insights && (
                <div className="p-4 bg-blue-50 border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">{t.marketingPage.insights}</h4>
                  <p className="text-sm text-blue-800 font-light">{prediction.insights}</p>
                </div>
              )}

              {/* Gaps */}
              {prediction.gaps?.length > 0 && (
                <div className="p-4 bg-orange-50 border border-orange-200">
                  <h4 className="text-sm font-medium text-orange-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />{t.marketingPage.gapsDetected}
                  </h4>
                  <ul className="text-sm text-orange-800 space-y-1">
                    {prediction.gaps.map((gap: string, i: number) => (
                      <li key={i} className="flex items-start gap-2"><span className="text-orange-500 mt-0.5">•</span><span>{gap}</span></li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {prediction.recommendations?.length > 0 && (
                <div className="p-4 bg-green-50 border border-green-200">
                  <h4 className="text-sm font-medium text-green-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />{t.marketingPage.recommendations}
                  </h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    {prediction.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span><span>{rec}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-carbon/30">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm font-light">{t.marketingPage.clickValidate}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
