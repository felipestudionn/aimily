'use client';

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  ChevronLeft,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Filter,
  X,
  DollarSign,
  BarChart3,
  Edit3,
} from 'lucide-react';
import { usePaidCampaigns, type PaidCampaign } from '@/hooks/usePaidCampaigns';
import { useDrops } from '@/hooks/useDrops';
import type { AdSet, PaidPlatform, CampaignStatus, AdObjective } from '@/types/marketing';
import {
  AD_OBJECTIVE_IDS,
  PAID_PLATFORM_IDS,
  PAID_PLATFORM_COLOR,
  CAMPAIGN_STATUS_IDS,
  CAMPAIGN_STATUS_COLOR,
} from '@/types/marketing';
import {
  getAdObjectiveLabel,
  getPaidPlatformLabel,
  getCampaignStatusLabel,
} from '@/lib/marketing-labels';
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

type AiPill = 'libre' | 'asistido' | 'propuesta';

const AI_PILL_IDS: AiPill[] = ['libre', 'asistido', 'propuesta'];
const AI_PILL_LABEL_KEYS: Record<AiPill, 'pillManual' | 'pillAssisted' | 'pillAiProposal'> = {
  libre: 'pillManual', asistido: 'pillAssisted', propuesta: 'pillAiProposal',
};

/* ── Props ── */

interface PaidGrowthCardProps {
  collectionPlanId: string;
}

/* ── Component ── */

export function PaidGrowthCard({ collectionPlanId }: PaidGrowthCardProps) {
  const t = useTranslation();
  const { language } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [activePill, setActivePill] = useState<AiPill>('libre');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [dropFilter, setDropFilter] = useState('ALL');

  // Data hooks
  const { campaigns, addCampaign, updateCampaign, deleteCampaign, loading } = usePaidCampaigns(collectionPlanId);
  const { drops } = useDrops(collectionPlanId);

  // AI state
  const [isGenerating, setIsGenerating] = useState(false);

  // Form state
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAdSets, setEditingAdSets] = useState<string | null>(null);
  const [newCampaign, setNewCampaign] = useState({
    name: '', platform: 'meta', objective: 'conversions', budget: 0, currency: 'EUR',
    start_date: '', end_date: '', drop_name: '', notes: '',
  });

  // Assisted mode state
  const [assistedBudget, setAssistedBudget] = useState(5000);
  const [assistedObjective, setAssistedObjective] = useState('conversions');
  const [assistedDirection, setAssistedDirection] = useState('');

  // Propuesta mode state
  const [propuestaBudget, setPropuestaBudget] = useState(10000);
  const [propuestaRoas, setPropuestaRoas] = useState(4);
  const [propuestaPlatforms, setPropuestaPlatforms] = useState('Meta, Google, TikTok');

  /* ── Derived data ── */

  const filteredCampaigns = useMemo(() => {
    let result = campaigns;
    if (platformFilter !== 'ALL') result = result.filter(c => c.platform === platformFilter);
    if (dropFilter !== 'ALL') result = result.filter(c => c.drop_name === dropFilter);
    return result;
  }, [campaigns, platformFilter, dropFilter]);

  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalAdSets = campaigns.reduce((sum, c) => sum + ((c.ad_sets as AdSet[]) || []).length, 0);

  const budgetByPlatform = useMemo(() => {
    const grouped: Record<string, number> = {};
    campaigns.forEach(c => {
      grouped[c.platform] = (grouped[c.platform] || 0) + (c.budget || 0);
    });
    return Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  }, [campaigns]);

  const unassignedLabel = t.marketingPage.unassigned;
  const budgetByDrop = useMemo(() => {
    const grouped: Record<string, number> = {};
    campaigns.forEach(c => {
      const key = c.drop_name || unassignedLabel;
      grouped[key] = (grouped[key] || 0) + (c.budget || 0);
    });
    return Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  }, [campaigns, unassignedLabel]);

  /* ── Handlers ── */

  const handleAddCampaign = async () => {
    if (!newCampaign.name || !newCampaign.platform) return;
    await addCampaign({
      collection_plan_id: collectionPlanId,
      name: newCampaign.name,
      platform: newCampaign.platform,
      objective: newCampaign.objective,
      budget: newCampaign.budget,
      currency: newCampaign.currency,
      start_date: newCampaign.start_date || null,
      end_date: newCampaign.end_date || null,
      drop_name: newCampaign.drop_name || null,
      ad_sets: [],
      notes: newCampaign.notes || null,
      status: 'draft',
    });
    setNewCampaign({ name: '', platform: 'meta', objective: 'conversions', budget: 0, currency: 'EUR', start_date: '', end_date: '', drop_name: '', notes: '' });
    setShowAddCampaign(false);
  };

  const handleAddAdSet = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;
    const adSets = (campaign.ad_sets as AdSet[]) || [];
    const newAdSet: AdSet = {
      id: crypto.randomUUID(),
      name: `${t.marketingPage.adSetDefaultName} ${adSets.length + 1}`,
      audience: '',
      budget_pct: Math.round(100 / (adSets.length + 1)),
      creatives: [],
    };
    await updateCampaign(campaignId, { ad_sets: [...adSets, newAdSet] as any });
  };

  const handleUpdateAdSet = async (campaignId: string, adSetId: string, updates: Partial<AdSet>) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;
    const adSets = ((campaign.ad_sets as AdSet[]) || []).map(as =>
      as.id === adSetId ? { ...as, ...updates } : as
    );
    await updateCampaign(campaignId, { ad_sets: adSets as any });
  };

  const handleDeleteAdSet = async (campaignId: string, adSetId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;
    const adSets = ((campaign.ad_sets as AdSet[]) || []).filter(as => as.id !== adSetId);
    await updateCampaign(campaignId, { ad_sets: adSets as any });
  };

  const handleAiGenerate = async (mode: 'asistido' | 'propuesta') => {
    setIsGenerating(true);
    try {
      const dropsContext = drops.map(d => ({
        name: d.name, launch_date: d.launch_date,
        story_alignment: d.story_name || '', expected_sales_weight: 0,
      }));

      const body: Record<string, any> = {
        mode,
        drops: dropsContext,
        totalBudget: mode === 'asistido' ? assistedBudget : propuestaBudget,
        totalSalesTarget: 0,
        targetRoas: mode === 'propuesta' ? propuestaRoas : 4,
        activePlatforms: mode === 'propuesta' ? propuestaPlatforms : 'Meta, Google',
        language,
      };

      if (mode === 'asistido') {
        body.userDirection = assistedDirection || `Focus on ${assistedObjective} with a budget of €${assistedBudget}`;
      }

      const response = await fetch('/api/ai/paid/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Failed to generate paid plan');
      const data = await response.json();

      // Apply generated campaigns
      if (data.campaigns?.length > 0) {
        for (const gen of data.campaigns) {
          const adSets: AdSet[] = (gen.ad_sets || []).map((as: any, i: number) => ({
            id: crypto.randomUUID(),
            name: as.name || `Ad Set ${i + 1}`,
            audience: as.audience || '',
            budget_pct: as.budget_pct || Math.round(100 / (gen.ad_sets?.length || 1)),
            creatives: as.creative_direction ? [as.creative_direction] : [],
          }));
          await addCampaign({
            collection_plan_id: collectionPlanId,
            name: gen.name,
            platform: gen.platform || 'meta',
            objective: gen.objective || 'conversions',
            budget: gen.budget || 0,
            currency: 'EUR',
            start_date: gen.start_date || null,
            end_date: gen.end_date || null,
            drop_name: gen.associated_drop || null,
            ad_sets: adSets as any,
            notes: null,
            status: 'planned',
          });
        }
      }
    } catch (error) {
      console.error('Error generating paid plan:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const isPaidPlatform = (id: string): id is PaidPlatform =>
    (PAID_PLATFORM_IDS as readonly string[]).includes(id);

  const platformColorFor = (platformId: string): string =>
    isPaidPlatform(platformId) ? PAID_PLATFORM_COLOR[platformId] : '#94A3B8';

  const platformLabelFor = (platformId: string): string =>
    isPaidPlatform(platformId) ? getPaidPlatformLabel(t, platformId) : platformId;

  const isCampaignStatus = (id: string): id is CampaignStatus =>
    (CAMPAIGN_STATUS_IDS as readonly string[]).includes(id);

  const statusColorFor = (statusId: string): string =>
    isCampaignStatus(statusId) ? CAMPAIGN_STATUS_COLOR[statusId] : '#94A3B8';

  const statusLabelFor = (statusId: string): string =>
    isCampaignStatus(statusId) ? getCampaignStatusLabel(t, statusId) : statusId;

  const isAdObjective = (id: string): id is AdObjective =>
    (AD_OBJECTIVE_IDS as readonly string[]).includes(id);

  const adObjectiveLabelFor = (id: string): string =>
    isAdObjective(id) ? getAdObjectiveLabel(t, id) : id;

  /* ── Card (collapsed) ── */
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="group relative bg-white p-10 lg:p-12 border border-carbon/[0.06] flex flex-col min-h-[340px] hover:shadow-lg transition-all duration-300 text-left w-full"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-carbon/[0.04] flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-carbon/40 group-hover:text-carbon/70 transition-colors" />
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25 mb-1">
              {t.marketingPage.paidLabel}
            </p>
            <h3 className="text-xl md:text-2xl font-light text-carbon tracking-tight leading-[1.15]">
              {t.marketingPage.paidTitle}
            </h3>
          </div>
        </div>
        <p className="text-sm font-light text-carbon/45 leading-relaxed flex-1">
          {t.marketingPage.paidDesc}
        </p>

        <div className="mt-6 pt-6 border-t border-carbon/[0.06]">
          {loading ? (
            <p className="text-xs text-carbon/30">{t.marketingPage.loading}</p>
          ) : campaigns.length === 0 ? (
            <p className="text-xs text-carbon/20 tracking-wide">{t.marketingPage.noCampaignsYet}</p>
          ) : (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-light text-carbon">{campaigns.length}</span>
                <span className="text-xs text-carbon/40">{t.marketingPage.campaigns}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-light text-carbon/60">
                  €{totalBudget.toLocaleString()}
                </span>
                <span className="text-xs text-carbon/40">{t.marketingPage.budget}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-light text-carbon">{totalAdSets}</span>
                <span className="text-xs text-carbon/40">{t.marketingPage.adSets}</span>
              </div>
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
            <TrendingUp className="h-5 w-5 text-carbon/40" />
            <div>
              <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25">
                {t.marketingPage.paidLabel}
              </p>
              <h2 className="text-lg font-light text-carbon tracking-tight">{t.marketingPage.paidTitle}</h2>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {totalBudget > 0 && (
              <div className="text-right">
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30">{t.marketingPage.totalBudget}</p>
                <p className="text-xl font-light text-carbon tracking-tight">€{totalBudget.toLocaleString()}</p>
              </div>
            )}
            <div className="text-right">
              <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30">{t.marketingPage.campaigns}</p>
              <p className="text-xl font-light text-carbon tracking-tight">{campaigns.length}</p>
            </div>
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

        {/* ── Assisted config panel ── */}
        {activePill === 'asistido' && (
          <div className="bg-white border border-carbon/[0.06] p-6 space-y-4">
            <div>
              <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40 mb-1">{t.marketingPage.assistedMode}</p>
              <p className="text-sm font-light text-carbon/50">{t.marketingPage.assistedModeDesc}</p>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">{t.marketingPage.budgetLabel} (€)</Label>
                <Input type="number" min={0} value={assistedBudget} onChange={e => setAssistedBudget(Number(e.target.value))} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">{t.marketingPage.primaryObjective}</Label>
                <Select value={assistedObjective} onValueChange={setAssistedObjective}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AD_OBJECTIVE_IDS.map(id => (
                      <SelectItem key={id} value={id}>{getAdObjectiveLabel(t, id)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t.marketingPage.directionOptional}</Label>
                <Input value={assistedDirection} onChange={e => setAssistedDirection(e.target.value)} placeholder={t.marketingPage.directionPlaceholderPaid} className="h-9" />
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
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">{t.marketingPage.totalBudgetLabel} (€)</Label>
                <Input type="number" min={0} value={propuestaBudget} onChange={e => setPropuestaBudget(Number(e.target.value))} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">{t.marketingPage.targetRoas}</Label>
                <Input type="number" min={1} step={0.5} value={propuestaRoas} onChange={e => setPropuestaRoas(Number(e.target.value))} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">{t.marketingPage.platforms}</Label>
                <Input value={propuestaPlatforms} onChange={e => setPropuestaPlatforms(e.target.value)} placeholder={t.marketingPage.platformsPlaceholderPaid} className="h-9" />
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
            <span className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">{t.marketingPage.platform}:</span>
            <button
              onClick={() => setPlatformFilter('ALL')}
              className={`px-3 py-1.5 text-xs border transition-colors ${platformFilter === 'ALL' ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'}`}
            >
              {t.marketingPage.all}
            </button>
            {PAID_PLATFORM_IDS.map(id => (
              <button
                key={id}
                onClick={() => setPlatformFilter(id)}
                className={`px-3 py-1.5 text-xs border transition-colors ${platformFilter === id ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'}`}
              >
                {getPaidPlatformLabel(t, id)}
              </button>
            ))}
          </div>

          {drops.length > 0 && (
            <>
              <div className="h-5 w-px bg-carbon/10" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">{t.marketingPage.drop}:</span>
                <button
                  onClick={() => setDropFilter('ALL')}
                  className={`px-3 py-1.5 text-xs border transition-colors ${dropFilter === 'ALL' ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'}`}
                >
                  {t.marketingPage.all}
                </button>
                {drops.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDropFilter(d.name)}
                    className={`px-3 py-1.5 text-xs border transition-colors ${dropFilter === d.name ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'}`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Budget Overview ── */}
        {campaigns.length > 0 && (
          <div className="grid grid-cols-2 gap-5">
            {/* By Platform */}
            <div className="bg-white border border-carbon/[0.06] p-6">
              <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-1">{t.marketingPage.budgetByPlatform}</p>
              <div className="space-y-3 mt-4">
                {budgetByPlatform.map(([platform, amount]) => {
                  const pct = totalBudget > 0 ? (amount / totalBudget) * 100 : 0;
                  return (
                    <div key={platform}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-carbon/60">{platformLabelFor(platform)}</span>
                        <span className="text-xs text-carbon/40">€{amount.toLocaleString()} ({Math.round(pct)}%)</span>
                      </div>
                      <div className="h-2 bg-carbon/[0.04] w-full">
                        <div
                          className="h-full transition-all duration-300"
                          style={{ width: `${pct}%`, backgroundColor: platformColorFor(platform) }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* By Drop */}
            <div className="bg-white border border-carbon/[0.06] p-6">
              <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-1">{t.marketingPage.budgetByDrop}</p>
              <div className="space-y-3 mt-4">
                {budgetByDrop.map(([drop, amount]) => {
                  const pct = totalBudget > 0 ? (amount / totalBudget) * 100 : 0;
                  return (
                    <div key={drop}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-carbon/60">{drop}</span>
                        <span className="text-xs text-carbon/40">€{amount.toLocaleString()} ({Math.round(pct)}%)</span>
                      </div>
                      <div className="h-2 bg-carbon/[0.04] w-full">
                        <div
                          className="h-full bg-carbon/40 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Campaigns List ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30">
              {t.marketingPage.campaigns} ({filteredCampaigns.length})
            </p>
            <Button
              onClick={() => setShowAddCampaign(true)}
              className="bg-carbon hover:bg-carbon/90 rounded-sm text-[11px] font-medium tracking-[0.08em] uppercase h-9"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {t.marketingPage.addCampaign}
            </Button>
          </div>

          {/* Add Campaign Form */}
          {showAddCampaign && (
            <div className="bg-white border border-carbon/[0.06] p-6 mb-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">{t.marketingPage.newCampaign}</p>
                <button onClick={() => setShowAddCampaign(false)} className="text-carbon/30 hover:text-carbon">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs">{t.marketingPage.name}</Label>
                  <Input value={newCampaign.name} onChange={e => setNewCampaign(prev => ({ ...prev, name: e.target.value }))} placeholder={t.marketingPage.campaignName} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">{t.marketingPage.platform}</Label>
                  <Select value={newCampaign.platform} onValueChange={v => setNewCampaign(prev => ({ ...prev, platform: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAID_PLATFORM_IDS.map(id => (
                        <SelectItem key={id} value={id}>{getPaidPlatformLabel(t, id)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t.marketingPage.objective}</Label>
                  <Select value={newCampaign.objective} onValueChange={v => setNewCampaign(prev => ({ ...prev, objective: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AD_OBJECTIVE_IDS.map(id => (
                        <SelectItem key={id} value={id}>{getAdObjectiveLabel(t, id)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t.marketingPage.budgetLabel} (€)</Label>
                  <Input type="number" min={0} value={newCampaign.budget} onChange={e => setNewCampaign(prev => ({ ...prev, budget: Number(e.target.value) }))} className="h-9" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs">{t.marketingPage.startDate}</Label>
                  <Input type="date" value={newCampaign.start_date} onChange={e => setNewCampaign(prev => ({ ...prev, start_date: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">{t.marketingPage.endDate}</Label>
                  <Input type="date" value={newCampaign.end_date} onChange={e => setNewCampaign(prev => ({ ...prev, end_date: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">{t.marketingPage.drop}</Label>
                  <Select value={newCampaign.drop_name || '_none'} onValueChange={v => setNewCampaign(prev => ({ ...prev, drop_name: v === '_none' ? '' : v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder={t.marketingPage.none} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">{t.marketingPage.none}</SelectItem>
                      {drops.map(d => (
                        <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddCampaign} disabled={!newCampaign.name} className="bg-carbon hover:bg-carbon/90 rounded-sm text-[11px] font-medium tracking-[0.08em] uppercase">
                    {t.common.create}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Campaign Cards */}
          <div className="space-y-3">
            {filteredCampaigns.length === 0 && !loading && (
              <div className="bg-white border border-carbon/[0.06] p-12 text-center">
                <DollarSign className="h-8 w-8 text-carbon/15 mx-auto mb-3" />
                <p className="text-sm font-light text-carbon/30">{t.marketingPage.noCampaignsEmptyPaid}</p>
              </div>
            )}

            {filteredCampaigns.map(campaign => {
              const adSets = (campaign.ad_sets as AdSet[]) || [];
              const isEditing = editingId === campaign.id;
              const isEditingAdSets = editingAdSets === campaign.id;

              return (
                <div key={campaign.id} className="bg-white border border-carbon/[0.06] p-6">
                  {/* Campaign header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: platformColorFor(campaign.platform) }}
                      />
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <Input
                            value={campaign.name}
                            onChange={e => updateCampaign(campaign.id, { name: e.target.value })}
                            className="h-7 text-sm font-medium"
                            onBlur={() => setEditingId(null)}
                            autoFocus
                          />
                        ) : (
                          <p className="text-sm font-medium text-carbon truncate">{campaign.name}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-carbon/40">{platformLabelFor(campaign.platform)}</span>
                          <span className="text-xs text-carbon/30">|</span>
                          <span className="text-xs text-carbon/40">{adObjectiveLabelFor(campaign.objective)}</span>
                          {campaign.drop_name && (
                            <>
                              <span className="text-xs text-carbon/30">|</span>
                              <span className="text-xs text-carbon/40">{campaign.drop_name}</span>
                            </>
                          )}
                          {campaign.start_date && (
                            <>
                              <span className="text-xs text-carbon/30">|</span>
                              <span className="text-xs text-carbon/40">
                                {campaign.start_date}{campaign.end_date ? ` → ${campaign.end_date}` : ''}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Budget */}
                      <div className="text-right">
                        <p className="text-lg font-light text-carbon tracking-tight">€{(campaign.budget || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-carbon/30">{adSets.length} {adSets.length === 1 ? t.marketingPage.adSetSingular : t.marketingPage.adSetPlural}</p>
                      </div>

                      {/* Status badge */}
                      <Select
                        value={campaign.status}
                        onValueChange={v => updateCampaign(campaign.id, { status: v })}
                      >
                        <SelectTrigger className="h-7 w-24 text-xs border-0 p-0 justify-center">
                          <span
                            className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white rounded-sm"
                            style={{ backgroundColor: statusColorFor(campaign.status) }}
                          >
                            {statusLabelFor(campaign.status)}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {CAMPAIGN_STATUS_IDS.map(id => (
                            <SelectItem key={id} value={id}>{getCampaignStatusLabel(t, id)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Actions */}
                      <button
                        onClick={() => setEditingId(campaign.id)}
                        className="text-carbon/20 hover:text-carbon/60 transition-colors"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteCampaign(campaign.id)}
                        className="text-carbon/20 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Ad Sets section */}
                  <div className="mt-4 pt-4 border-t border-carbon/[0.04]">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={() => setEditingAdSets(isEditingAdSets ? null : campaign.id)}
                        className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/30 hover:text-carbon/50 transition-colors flex items-center gap-1"
                      >
                        <BarChart3 className="h-3 w-3" />
                        {t.marketingPage.adSetsLabel} ({adSets.length})
                      </button>
                      <button
                        onClick={() => handleAddAdSet(campaign.id)}
                        className="text-xs text-carbon/30 hover:text-carbon/60 transition-colors flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        {t.common.add}
                      </button>
                    </div>

                    {adSets.length > 0 && (
                      <div className="space-y-2">
                        {adSets.map(adSet => (
                          <div key={adSet.id} className="flex items-center gap-3 bg-carbon/[0.02] p-3">
                            {isEditingAdSets ? (
                              <>
                                <Input
                                  value={adSet.name}
                                  onChange={e => handleUpdateAdSet(campaign.id, adSet.id, { name: e.target.value })}
                                  className="h-7 text-xs flex-1"
                                  placeholder={t.marketingPage.adSetNamePlaceholder}
                                />
                                <Input
                                  value={adSet.audience}
                                  onChange={e => handleUpdateAdSet(campaign.id, adSet.id, { audience: e.target.value })}
                                  className="h-7 text-xs flex-[2]"
                                  placeholder={t.marketingPage.audiencePlaceholder}
                                />
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={adSet.budget_pct}
                                  onChange={e => handleUpdateAdSet(campaign.id, adSet.id, { budget_pct: Number(e.target.value) })}
                                  className="h-7 text-xs w-16"
                                />
                                <span className="text-xs text-carbon/30">%</span>
                                <button
                                  onClick={() => handleDeleteAdSet(campaign.id, adSet.id)}
                                  className="text-carbon/20 hover:text-red-500"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="text-xs font-medium text-carbon/60 flex-1">{adSet.name}</span>
                                <span className="text-xs text-carbon/40 flex-[2] truncate">{adSet.audience || t.marketingPage.noAudienceDefined}</span>
                                <span className="text-xs text-carbon/30 w-16 text-right">{adSet.budget_pct}%</span>
                                <span className="text-xs text-carbon/20 w-20 text-right">
                                  €{Math.round((campaign.budget || 0) * adSet.budget_pct / 100).toLocaleString()}
                                </span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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
