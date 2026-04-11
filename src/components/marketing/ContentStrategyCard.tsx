'use client';

import { useState, useMemo } from 'react';
import {
  PenTool,
  ChevronLeft,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Sparkles,
  Loader2,
  Copy,
  Hash,
  Mail,
  Search,
  Megaphone,
} from 'lucide-react';
import { useStories, type Story } from '@/hooks/useStories';
import { useContentPillars } from '@/hooks/useContentPillars';
import { useBrandVoiceConfig } from '@/hooks/useBrandVoiceConfig';
import { useSocialTemplates } from '@/hooks/useSocialTemplates';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useProductCopy } from '@/hooks/useProductCopy';
import { useBrandProfile } from '@/hooks/useBrandProfile';
import { useSkus, type SKU } from '@/hooks/useSkus';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import type {
  ContentPillar,
  BrandVoiceConfig,
  SocialTemplate,
  EmailTemplateContent,
  ProductCopy,
  ContentStrategyTab,
  SocialPlatform,
  EmailTemplateType,
} from '@/types/digital';

/* ── Props ── */

interface ContentStrategyCardProps {
  collectionPlanId: string;
}

/* ── Tab config ── */

const TAB_KEYS: { id: ContentStrategyTab; labelKey: 'pillarsAndVoice' | 'productCopy' | 'socialTemplates' | 'emailTemplates' | 'seo'; Icon: typeof PenTool }[] = [
  { id: 'pillars-voice', labelKey: 'pillarsAndVoice', Icon: Megaphone },
  { id: 'product-copy', labelKey: 'productCopy', Icon: Copy },
  { id: 'social', labelKey: 'socialTemplates', Icon: Hash },
  { id: 'email', labelKey: 'emailTemplates', Icon: Mail },
  { id: 'seo', labelKey: 'seo', Icon: Search },
];

// Platform names are product nouns and are not translated.
const PLATFORMS: { id: SocialPlatform; label: string }[] = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'facebook', label: 'Facebook' },
];

// Email type labels come from i18n at render time.
const EMAIL_TYPE_IDS: EmailTemplateType[] = ['launch', 'welcome', 'cart_abandonment', 'post_purchase'];

/* ── Component ── */

export function ContentStrategyCard({ collectionPlanId }: ContentStrategyCardProps) {
  const t = useTranslation();
  const { language } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentStrategyTab>('pillars-voice');

  const emailTypeLabel = (id: EmailTemplateType): string => {
    switch (id) {
      case 'launch': return t.marketingPage.emailTypeLaunch;
      case 'welcome': return t.marketingPage.emailTypeWelcome;
      case 'cart_abandonment': return t.marketingPage.emailTypeCartAbandonment;
      case 'post_purchase': return t.marketingPage.emailTypePostPurchase;
    }
  };

  // Data hooks
  const { stories } = useStories(collectionPlanId);
  const { pillars, loading: pillarsLoading, addPillar, bulkSavePillars, updatePillar, deletePillar } = useContentPillars(collectionPlanId);
  const { config: voiceConfig, loading: voiceLoading, saveConfig: saveVoiceConfig } = useBrandVoiceConfig(collectionPlanId);
  const { templates: socialTemplates, loading: socialLoading, bulkSaveTemplates: bulkSaveSocial, deleteTemplate: deleteSocial } = useSocialTemplates(collectionPlanId);
  const { templates: emailTemplates, loading: emailLoading, bulkSaveTemplates: bulkSaveEmail, deleteTemplate: deleteEmail, updateTemplate: updateEmailTemplate } = useEmailTemplates(collectionPlanId);
  const { copies: productCopies, loading: copiesLoading, addCopy, deleteCopy: deleteProductCopy } = useProductCopy(collectionPlanId);
  const { profile: brandProfile } = useBrandProfile(collectionPlanId);
  const { skus } = useSkus(collectionPlanId);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [userDirection, setUserDirection] = useState('');

  // Sub-selections
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('instagram');
  const [selectedEmailType, setSelectedEmailType] = useState<EmailTemplateType>('launch');
  // B1 — Email mode toggle (single email vs. full sequence)
  const [emailMode, setEmailMode] = useState<'single' | 'sequence'>('single');
  const [selectedSequenceType, setSelectedSequenceType] =
    useState<'welcome' | 'launch' | 'post_purchase' | 're_engagement'>('welcome');
  // B2 — Product copy context variant
  const [selectedCopyContext, setSelectedCopyContext] = useState<
    'pdp' | 'ad_hook' | 'landing_hero' | 'email_mention' | 'sms_tease' | 'push_notification'
  >('pdp');
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);

  // Edit state for pillars
  const [editingPillarId, setEditingPillarId] = useState<string | null>(null);
  const [editPillarForm, setEditPillarForm] = useState<Partial<ContentPillar>>({});

  // Edit state for voice
  const [editingVoice, setEditingVoice] = useState(false);
  const [voiceForm, setVoiceForm] = useState<Partial<BrandVoiceConfig>>({});

  /* ── Derived: email templates split into sequences + singles ── */
  // B1.1 (2026-04-11) — bulk-inserted sequences used to render as flat
  // individual rows, which destroyed the editorial shape of a drip
  // campaign. The fix: partition by sequence_id and render sequences
  // as grouped cards with a shared header (name, type, trigger,
  // metrics) + ordered member rows. Singles keep their existing flat
  // EmailTemplateRow treatment.
  const groupedEmails = useMemo(() => {
    const seqMap = new Map<string, EmailTemplateContent[]>();
    const singles: EmailTemplateContent[] = [];
    for (const tpl of emailTemplates) {
      if (tpl.email_type !== selectedEmailType) continue;
      if (tpl.sequence_id) {
        const arr = seqMap.get(tpl.sequence_id) ?? [];
        arr.push(tpl);
        seqMap.set(tpl.sequence_id, arr);
      } else {
        singles.push(tpl);
      }
    }
    // Sort each sequence by position (fall back to created_at index if null)
    const sequences: Array<{ id: string; emails: EmailTemplateContent[] }> = [];
    seqMap.forEach((arr, id) => {
      arr.sort(
        (a, b) =>
          (a.sequence_position ?? Number.MAX_SAFE_INTEGER) -
          (b.sequence_position ?? Number.MAX_SAFE_INTEGER)
      );
      sequences.push({ id, emails: arr });
    });
    return { sequences, singles };
  }, [emailTemplates, selectedEmailType]);

  /* ── Helpers ── */

  const brandContext = {
    brand_name: brandProfile?.brand_name || undefined,
    tagline: brandProfile?.tagline || undefined,
    brand_story: brandProfile?.brand_story || undefined,
    brand_voice: brandProfile?.brand_voice || undefined,
    target_audience: brandProfile?.target_audience || undefined,
  };

  const voiceSummary = voiceConfig
    ? `${voiceConfig.personality || ''} — Tone: ${voiceConfig.tone || ''}`
    : brandProfile?.brand_voice?.personality || '';

  const pillarsSummary = pillars.map(p => p.name).join(', ');

  const storyForId = (id: string | null) => stories.find(s => s.id === id);
  const skuForId = (id: string | null) => skus.find(s => s.id === id);

  const storyToContext = (s: Story) => ({
    name: s.name,
    narrative: s.narrative || undefined,
    mood: s.mood || undefined,
    tone: s.tone || undefined,
    color_palette: s.color_palette || undefined,
  });

  const skuToContext = (sku: SKU) => ({
    name: sku.name,
    category: sku.category || '',
    family: sku.family || '',
    pvp: sku.pvp || 0,
    notes: sku.notes || undefined,
    colorways: (sku as SKU & { colorways?: string[] }).colorways || undefined,
  });

  /* ── AI generation ── */

  const generateAI = async (mode: string, extra?: Record<string, unknown>) => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/content-strategy/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          collectionPlanId,
          brandContext,
          stories: stories.map(storyToContext),
          brandVoiceSummary: voiceSummary,
          contentPillars: pillarsSummary,
          userDirection: userDirection || undefined,
          language,
          ...extra,
        }),
      });
      if (!res.ok) throw new Error('AI generation failed');
      const data = await res.json();
      return data.result;
    } catch (err) {
      console.error('AI generation error:', err);
      return null;
    } finally {
      setAiLoading(false);
    }
  };

  /* ── Tab: Pillars & Voice AI handler ── */

  const handleGeneratePillarsVoice = async () => {
    const result = await generateAI('pillars_voice');
    if (!result) return;

    // Save pillars
    if (result.content_pillars?.length) {
      const items = result.content_pillars.map((p: { name: string; description?: string; examples?: string[]; stories_alignment?: string[] }) => ({
        collection_plan_id: collectionPlanId,
        name: p.name,
        description: p.description || null,
        examples: p.examples || null,
        stories_alignment: p.stories_alignment || null,
      }));
      await bulkSavePillars(items);
    }

    // Save voice config
    if (result.brand_voice) {
      await saveVoiceConfig({
        personality: result.brand_voice.personality || null,
        tone: result.brand_voice.tone || null,
        do_rules: result.brand_voice.do_rules || result.brand_voice.do || null,
        dont_rules: result.brand_voice.dont_rules || result.brand_voice.dont || null,
        vocabulary: result.brand_voice.vocabulary || null,
        example_caption: result.brand_voice.example_caption || null,
      });
    }
  };

  /* ── Tab: Product Copy AI handler ── */

  const handleGenerateProductCopy = async () => {
    const sku = skuForId(selectedSkuId);
    if (!sku) return;
    const story = storyForId(selectedStoryId);

    const result = await generateAI('product_copy', {
      skuContext: skuToContext(sku),
      storyContext: story ? storyToContext(story) : undefined,
      copyContext: selectedCopyContext,
    });
    if (!result) return;

    // B2 — title comes from whichever field the context shape provides first.
    const inferredTitle =
      (result.headline as string | undefined) ||
      (result.hook as string | undefined) ||
      (result.title as string | undefined) ||
      (result.message as string | undefined) ||
      (result.one_line as string | undefined) ||
      sku.name;

    await addCopy({
      collection_plan_id: collectionPlanId,
      sku_id: sku.id,
      copy_type:
        selectedCopyContext === 'pdp' ? 'product_description' : `copy_${selectedCopyContext}`,
      title: inferredTitle,
      content: JSON.stringify(result),
      metadata: { ...result, copy_context: selectedCopyContext },
      status: 'draft',
      story_id: selectedStoryId,
      model_used: 'claude-haiku-4.5',
    });
  };

  /* ── Tab: Social Templates AI handler ── */

  const handleGenerateSocial = async () => {
    const story = storyForId(selectedStoryId);
    const result = await generateAI('social_templates', {
      storyContext: story ? storyToContext(story) : { name: 'Collection' },
      platform: selectedPlatform,
    });
    if (!result?.templates) return;

    type SocialTpl = {
      type?: string;
      caption?: string;
      hashtags?: string[];
      cta?: string;
      best_paired_with?: string;
      hook_type?: 'curiosity' | 'story' | 'value' | 'contrarian';
    };
    const validTypes = [
      'product_feature',
      'lifestyle',
      'behind_the_scenes',
      'styling_tip',
      'story_narrative',
    ] as const;
    type ValidType = (typeof validTypes)[number];
    const items = (result.templates as SocialTpl[]).map((tpl) => {
      const normalizedType: ValidType = validTypes.includes(tpl.type as ValidType)
        ? (tpl.type as ValidType)
        : 'product_feature';
      return {
        collection_plan_id: collectionPlanId,
        story_id: selectedStoryId,
        platform: selectedPlatform,
        type: normalizedType,
        caption: tpl.caption || null,
        hashtags: tpl.hashtags || null,
        cta: tpl.cta || null,
        best_paired_with: tpl.best_paired_with || null,
        hook_type: tpl.hook_type ?? null,
      };
    });
    await bulkSaveSocial(items);
  };

  /* ── Tab: Email Templates AI handler ── */

  const handleGenerateSequence = async () => {
    const story = storyForId(selectedStoryId);
    const heroSku = story?.hero_sku_id
      ? skus.find((s) => s.id === story.hero_sku_id)
      : undefined;

    const result = await generateAI('email_sequence', {
      storyContext: story ? storyToContext(story) : undefined,
      sequenceType: selectedSequenceType,
      heroSkuName: heroSku?.name,
      heroSkuPvp: heroSku?.pvp,
    });
    if (!result?.sequence) return;

    type SeqEmail = {
      position?: number;
      name?: string;
      one_job?: string;
      send_delay_from_previous_hours?: number;
      send_time_preference?: string;
      subject_line?: string;
      preview_text?: string;
      hook_type?: 'curiosity' | 'story' | 'value' | 'contrarian';
      heading?: string;
      body?: string;
      cta_text?: string;
      cta_url_placeholder?: string;
    };
    const seq = result.sequence as {
      name?: string;
      type?: 'welcome' | 'launch' | 'post_purchase' | 're_engagement';
      trigger?: string;
      exit_conditions?: string[];
      total_emails?: number;
      emails?: SeqEmail[];
      success_metrics?: {
        target_open_rate?: number;
        target_ctr?: number;
        target_conversion_rate?: number;
      };
    };

    if (!seq.emails?.length) return;

    // Generate a client-side sequence_id so every row in the bulk insert
    // shares the same grouping key. crypto.randomUUID is safe in the browser.
    const sequenceId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `seq-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const items = seq.emails.map((em) => ({
      collection_plan_id: collectionPlanId,
      story_id: selectedStoryId,
      email_type: (seq.type || selectedSequenceType) as EmailTemplateType,
      subject_line: em.subject_line || null,
      preview_text: em.preview_text || null,
      heading: em.heading || null,
      body: em.body || null,
      cta_text: em.cta_text || null,
      cta_url: em.cta_url_placeholder || null,
      status: 'draft',
      sequence_id: sequenceId,
      sequence_name: seq.name || null,
      sequence_type: seq.type || selectedSequenceType,
      sequence_position: em.position ?? null,
      sequence_total: seq.total_emails ?? seq.emails?.length ?? null,
      trigger: seq.trigger || null,
      send_delay_hours: em.send_delay_from_previous_hours ?? null,
      send_time_preference: em.send_time_preference || null,
      exit_conditions: seq.exit_conditions || null,
      one_job: em.one_job || null,
      hook_type: em.hook_type || null,
      success_metrics: seq.success_metrics || null,
    }));
    await bulkSaveEmail(items);
  };

  const handleGenerateEmail = async () => {
    const story = storyForId(selectedStoryId);
    const result = await generateAI('email_template', {
      storyContext: story ? storyToContext(story) : undefined,
      emailType: selectedEmailType,
    });
    if (!result) return;

    await bulkSaveEmail([{
      collection_plan_id: collectionPlanId,
      story_id: selectedStoryId,
      email_type: selectedEmailType,
      subject_line: result.subject_line || null,
      preview_text: result.preview_text || null,
      heading: result.heading || null,
      body: result.body || null,
      cta_text: result.cta_text || null,
      cta_url: result.cta_url_placeholder || null,
      status: 'draft',
    }]);
  };

  /* ── Tab: SEO AI handler ── */

  const handleGenerateSeo = async () => {
    const sku = skuForId(selectedSkuId);
    if (!sku) return;
    const story = storyForId(selectedStoryId);

    const result = await generateAI('seo', {
      skuContext: skuToContext(sku),
      storyContext: story ? storyToContext(story) : undefined,
    });
    if (!result) return;

    await addCopy({
      collection_plan_id: collectionPlanId,
      sku_id: sku.id,
      copy_type: 'seo_meta',
      title: result.meta_title || sku.name,
      content: JSON.stringify(result),
      metadata: result,
      status: 'draft',
      story_id: selectedStoryId,
      model_used: 'gemini-flash',
    });
  };

  /* ── Collapsed card ── */

  if (!expanded) {
    const totalItems = pillars.length + socialTemplates.length + emailTemplates.length;
    return (
      <button
        onClick={() => setExpanded(true)}
        className="group relative bg-white p-10 lg:p-12 border border-carbon/[0.06] flex flex-col min-h-[340px] hover:shadow-lg transition-all duration-300 text-left w-full"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-carbon/[0.04] flex items-center justify-center flex-shrink-0">
            <PenTool className="h-5 w-5 text-carbon/40 group-hover:text-carbon/70 transition-colors" />
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25 mb-1">
              {t.marketingPage.contentStrategyLabel}
            </p>
            <h3 className="text-xl md:text-2xl font-light text-carbon tracking-tight leading-[1.15]">
              {t.marketingPage.contentStrategyTitle}
            </h3>
          </div>
        </div>
        <p className="text-sm font-light text-carbon/45 leading-relaxed flex-1">
          {t.marketingPage.contentStrategyDesc}
        </p>

        <div className="mt-6 pt-6 border-t border-carbon/[0.06]">
          {pillarsLoading ? (
            <p className="text-xs text-carbon/30">{t.marketingPage.loading}</p>
          ) : totalItems === 0 ? (
            <p className="text-xs text-carbon/20 tracking-wide">{t.marketingPage.noContentYet}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {pillars.map(p => (
                <span key={p.id} className="text-[11px] tracking-[0.05em] uppercase bg-carbon/[0.04] text-carbon/50 px-3 py-1">
                  {p.name}
                </span>
              ))}
              {voiceConfig && (
                <span className="text-[11px] tracking-[0.05em] italic text-carbon/30">
                  {t.marketingPage.voiceInlineLabel}: {voiceConfig.personality?.slice(0, 30)}
                </span>
              )}
              {socialTemplates.length > 0 && (
                <span className="text-[11px] text-carbon/30">{socialTemplates.length} {t.marketingPage.socialInline}</span>
              )}
              {emailTemplates.length > 0 && (
                <span className="text-[11px] text-carbon/30">{emailTemplates.length} {t.marketingPage.emailInline}</span>
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

  /* ── Expanded full-screen view ── */

  return (
    <div className="fixed inset-0 z-50 bg-crema overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-crema/95 backdrop-blur border-b border-carbon/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setExpanded(false)}
            className="flex items-center gap-2 text-sm font-light text-carbon/60 hover:text-carbon transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {t.marketingPage.backToCreation}
          </button>
          <div className="text-center">
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25">
              {t.marketingPage.contentStrategyLabel}
            </p>
            <h2 className="text-lg font-light text-carbon tracking-tight">{t.marketingPage.contentStrategyTitle}</h2>
          </div>
          <div className="w-32" />
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-6 pb-3 flex gap-1 overflow-x-auto">
          {TAB_KEYS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] border transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-carbon text-crema border-carbon'
                  : 'bg-white text-carbon/50 border-carbon/[0.06] hover:text-carbon/80'
              }`}
            >
              <tab.Icon className="h-3.5 w-3.5" />
              {t.marketingPage[tab.labelKey]}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ═══════ TAB: PILLARS & VOICE ═══════ */}
        {activeTab === 'pillars-voice' && (
          <div className="space-y-8">
            {/* AI Direction */}
            <div className="space-y-4">
              <p className="text-sm font-light text-carbon/50">
                {t.marketingPage.pillarsVoiceDesc}
              </p>
              <textarea
                value={userDirection}
                onChange={e => setUserDirection(e.target.value)}
                placeholder={t.marketingPage.strategyDirectionPlaceholder}
                className="w-full h-24 bg-white border border-carbon/[0.06] px-4 py-3 text-sm font-light text-carbon placeholder:text-carbon/25 focus:outline-none focus:border-carbon/20 resize-none"
              />
              <button
                onClick={handleGeneratePillarsVoice}
                disabled={aiLoading}
                className="flex items-center gap-2 bg-carbon text-crema px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] hover:bg-carbon/90 transition-colors disabled:opacity-40"
              >
                {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {t.marketingPage.generatePillarsVoiceBtn}
              </button>
            </div>

            {/* Content Pillars */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">
                  {t.marketingPage.contentPillarsHeading} ({pillars.length})
                </p>
                <button
                  onClick={() => addPillar({ collection_plan_id: collectionPlanId, name: `${t.marketingPage.pillarDefaultName} ${pillars.length + 1}`, description: null, examples: null, stories_alignment: null })}
                  className="flex items-center gap-1.5 text-[11px] text-carbon/50 hover:text-carbon transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> {t.common.add}
                </button>
              </div>
              {pillarsLoading && <p className="text-xs text-carbon/30">{t.common.loading}</p>}
              <div className="space-y-3">
                {pillars.map(pillar => (
                  <div key={pillar.id} className="bg-white border border-carbon/[0.06] p-5">
                    {editingPillarId === pillar.id ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <input
                            value={editPillarForm.name ?? ''}
                            onChange={e => setEditPillarForm({ ...editPillarForm, name: e.target.value })}
                            className="text-base font-light text-carbon tracking-tight bg-transparent border-b border-carbon/10 focus:border-carbon/30 outline-none w-full mr-4"
                            placeholder={t.marketingPage.pillarNamePlaceholder}
                          />
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => { updatePillar(pillar.id, editPillarForm); setEditingPillarId(null); }} className="p-1.5 text-carbon/60 hover:text-carbon"><Check className="h-4 w-4" /></button>
                            <button onClick={() => setEditingPillarId(null)} className="p-1.5 text-carbon/30 hover:text-carbon/60"><X className="h-4 w-4" /></button>
                          </div>
                        </div>
                        <textarea
                          value={editPillarForm.description ?? ''}
                          onChange={e => setEditPillarForm({ ...editPillarForm, description: e.target.value })}
                          className="w-full h-16 text-sm font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none resize-none"
                          placeholder={t.marketingPage.descriptionPlaceholder}
                        />
                        <input
                          value={(editPillarForm.examples ?? []).join(', ')}
                          onChange={e => setEditPillarForm({ ...editPillarForm, examples: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                          className="w-full text-xs font-light text-carbon/50 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none"
                          placeholder={t.marketingPage.examplesPlaceholder}
                        />
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-base font-light text-carbon tracking-tight">{pillar.name}</h4>
                          {pillar.description && <p className="text-sm font-light text-carbon/50 mt-1">{pillar.description}</p>}
                          {pillar.examples?.length ? (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {pillar.examples.map((ex, i) => (
                                <span key={i} className="text-[10px] bg-carbon/[0.04] text-carbon/40 px-2 py-0.5">{ex}</span>
                              ))}
                            </div>
                          ) : null}
                          {pillar.stories_alignment?.length ? (
                            <p className="text-[10px] text-carbon/25 mt-2 italic">{t.marketingPage.storiesAlignmentHeading}: {pillar.stories_alignment.join(', ')}</p>
                          ) : null}
                        </div>
                        <div className="flex gap-1 flex-shrink-0 ml-4">
                          <button onClick={() => { setEditingPillarId(pillar.id); setEditPillarForm({ name: pillar.name, description: pillar.description, examples: pillar.examples, stories_alignment: pillar.stories_alignment }); }} className="p-1.5 text-carbon/25 hover:text-carbon/60"><Edit3 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => deletePillar(pillar.id)} className="p-1.5 text-carbon/25 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Brand Voice Config */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">{t.marketingPage.brandVoiceHeading}</p>
                {!editingVoice && (
                  <button
                    onClick={() => { setEditingVoice(true); setVoiceForm(voiceConfig || {}); }}
                    className="flex items-center gap-1.5 text-[11px] text-carbon/50 hover:text-carbon transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> {t.common.edit}
                  </button>
                )}
              </div>
              {voiceLoading && <p className="text-xs text-carbon/30">{t.common.loading}</p>}

              {editingVoice ? (
                <div className="bg-white border border-carbon/[0.06] p-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input value={voiceForm.personality ?? ''} onChange={e => setVoiceForm({ ...voiceForm, personality: e.target.value })} className="text-sm font-light text-carbon bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none" placeholder={t.marketingPage.personalityPlaceholder} />
                    <input value={voiceForm.tone ?? ''} onChange={e => setVoiceForm({ ...voiceForm, tone: e.target.value })} className="text-sm font-light text-carbon bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none" placeholder={t.marketingPage.tonePlaceholderField} />
                  </div>
                  <input value={(voiceForm.do_rules ?? []).join(', ')} onChange={e => setVoiceForm({ ...voiceForm, do_rules: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="w-full text-xs font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none" placeholder={t.marketingPage.doRulesPlaceholder} />
                  <input value={(voiceForm.dont_rules ?? []).join(', ')} onChange={e => setVoiceForm({ ...voiceForm, dont_rules: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="w-full text-xs font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none" placeholder={t.marketingPage.dontRulesPlaceholder} />
                  <input value={(voiceForm.vocabulary ?? []).join(', ')} onChange={e => setVoiceForm({ ...voiceForm, vocabulary: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="w-full text-xs font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none" placeholder={t.marketingPage.vocabularyPlaceholder} />
                  <textarea value={voiceForm.example_caption ?? ''} onChange={e => setVoiceForm({ ...voiceForm, example_caption: e.target.value })} className="w-full h-16 text-xs font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none resize-none" placeholder={t.marketingPage.exampleCaptionPlaceholder} />
                  <div className="flex gap-2">
                    <button onClick={() => { saveVoiceConfig(voiceForm); setEditingVoice(false); }} className="flex items-center gap-2 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] bg-carbon text-crema hover:bg-carbon/90"><Check className="h-3.5 w-3.5" /> {t.common.save}</button>
                    <button onClick={() => setEditingVoice(false)} className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] border border-carbon/[0.06] text-carbon/50 hover:text-carbon/80">{t.common.cancel}</button>
                  </div>
                </div>
              ) : voiceConfig ? (
                <div className="bg-white border border-carbon/[0.06] p-5 space-y-3">
                  {voiceConfig.personality && <div><p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/25 mb-1">{t.marketingPage.personalityHeading}</p><p className="text-sm font-light text-carbon/70">{voiceConfig.personality}</p></div>}
                  {voiceConfig.tone && <div><p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/25 mb-1">{t.marketingPage.toneHeading}</p><p className="text-sm font-light text-carbon/70">{voiceConfig.tone}</p></div>}
                  {voiceConfig.do_rules?.length ? <div><p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/25 mb-1">{t.marketingPage.doHeading}</p><div className="flex flex-wrap gap-1.5">{voiceConfig.do_rules.map((r, i) => <span key={i} className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5">{r}</span>)}</div></div> : null}
                  {voiceConfig.dont_rules?.length ? <div><p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/25 mb-1">{t.marketingPage.dontHeading}</p><div className="flex flex-wrap gap-1.5">{voiceConfig.dont_rules.map((r, i) => <span key={i} className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5">{r}</span>)}</div></div> : null}
                  {voiceConfig.vocabulary?.length ? <div><p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/25 mb-1">{t.marketingPage.vocabularyHeading}</p><div className="flex flex-wrap gap-1.5">{voiceConfig.vocabulary.map((v, i) => <span key={i} className="text-[10px] bg-carbon/[0.04] text-carbon/50 px-2 py-0.5">{v}</span>)}</div></div> : null}
                  {voiceConfig.example_caption && <div><p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/25 mb-1">{t.marketingPage.exampleCaptionHeading}</p><p className="text-sm font-light text-carbon/50 italic">&ldquo;{voiceConfig.example_caption}&rdquo;</p></div>}
                </div>
              ) : (
                <p className="text-xs text-carbon/20 italic">{t.marketingPage.noBrandVoiceConfigured}</p>
              )}
            </div>
          </div>
        )}

        {/* ═══════ TAB: PRODUCT COPY ═══════ */}
        {activeTab === 'product-copy' && (
          <div className="space-y-6">
            <p className="text-sm font-light text-carbon/50">
              {t.marketingPage.productCopyDesc}
            </p>

            {/* Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-2">{t.marketingPage.storyOptionalHeading}</p>
                <select value={selectedStoryId || ''} onChange={e => setSelectedStoryId(e.target.value || null)} className="w-full bg-white border border-carbon/[0.06] px-3 py-2 text-sm font-light text-carbon focus:outline-none">
                  <option value="">{t.marketingPage.allStoriesOption}</option>
                  {stories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-2">{t.marketingPage.skuHeading}</p>
                <select value={selectedSkuId || ''} onChange={e => setSelectedSkuId(e.target.value || null)} className="w-full bg-white border border-carbon/[0.06] px-3 py-2 text-sm font-light text-carbon focus:outline-none">
                  <option value="">{t.marketingPage.selectSkuPlaceholder}</option>
                  {skus.map(s => <option key={s.id} value={s.id}>{s.name} — {s.family}</option>)}
                </select>
              </div>
            </div>

            {/* B2 — copy context selector */}
            <div>
              <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-2">
                {t.marketingPage.copyContextHeading}
              </p>
              <div className="flex gap-1 flex-wrap">
                {(
                  ['pdp', 'ad_hook', 'landing_hero', 'email_mention', 'sms_tease', 'push_notification'] as const
                ).map((ctx) => (
                  <button
                    key={ctx}
                    onClick={() => setSelectedCopyContext(ctx)}
                    className={`px-3 py-2 text-[11px] font-medium uppercase tracking-[0.06em] border transition-colors ${
                      selectedCopyContext === ctx
                        ? 'bg-carbon text-crema border-carbon'
                        : 'bg-white text-carbon/50 border-carbon/[0.06] hover:text-carbon/80'
                    }`}
                  >
                    {t.marketingPage[`copyContext_${ctx}` as keyof typeof t.marketingPage] as string}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateProductCopy}
              disabled={aiLoading || !selectedSkuId}
              className="flex items-center gap-2 bg-carbon text-crema px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] hover:bg-carbon/90 transition-colors disabled:opacity-40"
            >
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {t.marketingPage.generateCopyBtn}
            </button>

            {/* Existing copies */}
            {copiesLoading && <p className="text-xs text-carbon/30">{t.common.loading}</p>}
            <div className="space-y-3">
              {productCopies
                .filter(c => c.copy_type === 'product_description')
                .map(copy => (
                  <ProductCopyRow key={copy.id} copy={copy} skus={skus} onDelete={() => deleteProductCopy(copy.id)} />
                ))}
              {productCopies.filter(c => c.copy_type === 'product_description').length === 0 && !copiesLoading && (
                <p className="text-xs text-carbon/20 italic text-center py-8">{t.marketingPage.noProductCopyYet}</p>
              )}
            </div>
          </div>
        )}

        {/* ═══════ TAB: SOCIAL TEMPLATES ═══════ */}
        {activeTab === 'social' && (
          <div className="space-y-6">
            <p className="text-sm font-light text-carbon/50">
              {t.marketingPage.socialTemplatesDesc}
            </p>

            {/* Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-2">{t.marketingPage.story}</p>
                <select value={selectedStoryId || ''} onChange={e => setSelectedStoryId(e.target.value || null)} className="w-full bg-white border border-carbon/[0.06] px-3 py-2 text-sm font-light text-carbon focus:outline-none">
                  <option value="">{t.marketingPage.generalNoStoryOption}</option>
                  {stories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-2">{t.marketingPage.platform}</p>
                <div className="flex gap-1">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlatform(p.id)}
                      className={`px-3 py-2 text-[11px] font-medium uppercase tracking-[0.06em] border transition-colors ${
                        selectedPlatform === p.id ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.06] hover:text-carbon/80'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateSocial}
              disabled={aiLoading}
              className="flex items-center gap-2 bg-carbon text-crema px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] hover:bg-carbon/90 transition-colors disabled:opacity-40"
            >
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {t.marketingPage.generateSocialTemplatesBtn}
            </button>

            {/* Templates list */}
            {socialLoading && <p className="text-xs text-carbon/30">{t.common.loading}</p>}
            <div className="space-y-3">
              {socialTemplates
                .filter(tpl => !selectedStoryId || tpl.story_id === selectedStoryId)
                .filter(tpl => tpl.platform === selectedPlatform)
                .map(tpl => (
                  <SocialTemplateRow key={tpl.id} template={tpl} stories={stories} onDelete={() => deleteSocial(tpl.id)} />
                ))}
              {socialTemplates.filter(tpl => tpl.platform === selectedPlatform).length === 0 && !socialLoading && (
                <p className="text-xs text-carbon/20 italic text-center py-8">{t.marketingPage.noPlatformTemplatesYet.replace('{platform}', selectedPlatform)}</p>
              )}
            </div>
          </div>
        )}

        {/* ═══════ TAB: EMAIL TEMPLATES ═══════ */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <p className="text-sm font-light text-carbon/50">
              {t.marketingPage.emailTemplatesDesc}
            </p>

            {/* B1 — Single vs. Sequence toggle */}
            <div>
              <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-2">
                {t.marketingPage.emailModeHeading}
              </p>
              <div className="inline-flex border border-carbon/[0.06] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setEmailMode('single')}
                  className={`text-xs font-light px-4 py-2 transition-colors ${
                    emailMode === 'single'
                      ? 'bg-carbon text-crema'
                      : 'bg-white text-carbon/60 hover:text-carbon'
                  }`}
                >
                  {t.marketingPage.emailModeSingle}
                </button>
                <button
                  type="button"
                  onClick={() => setEmailMode('sequence')}
                  className={`text-xs font-light px-4 py-2 border-l border-carbon/[0.06] transition-colors ${
                    emailMode === 'sequence'
                      ? 'bg-carbon text-crema'
                      : 'bg-white text-carbon/60 hover:text-carbon'
                  }`}
                >
                  {t.marketingPage.emailModeSequence}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-2">{t.marketingPage.storyOptionalHeading}</p>
                <select value={selectedStoryId || ''} onChange={e => setSelectedStoryId(e.target.value || null)} className="w-full bg-white border border-carbon/[0.06] px-3 py-2 text-sm font-light text-carbon focus:outline-none">
                  <option value="">{t.marketingPage.generalOption}</option>
                  {stories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-2">
                  {emailMode === 'single'
                    ? t.marketingPage.emailTypeHeading
                    : t.marketingPage.sequenceTypeHeading}
                </p>
                {emailMode === 'single' ? (
                  <div className="flex gap-1 flex-wrap">
                    {EMAIL_TYPE_IDS.map(id => (
                      <button
                        key={id}
                        onClick={() => setSelectedEmailType(id)}
                        className={`px-3 py-2 text-[11px] font-medium uppercase tracking-[0.06em] border transition-colors ${
                          selectedEmailType === id ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.06] hover:text-carbon/80'
                        }`}
                      >
                        {emailTypeLabel(id)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-1 flex-wrap">
                    {(['welcome', 'launch', 'post_purchase', 're_engagement'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setSelectedSequenceType(st)}
                        className={`px-3 py-2 text-[11px] font-medium uppercase tracking-[0.06em] border transition-colors ${
                          selectedSequenceType === st
                            ? 'bg-carbon text-crema border-carbon'
                            : 'bg-white text-carbon/50 border-carbon/[0.06] hover:text-carbon/80'
                        }`}
                      >
                        {t.marketingPage[`sequenceType_${st}` as keyof typeof t.marketingPage] as string}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={emailMode === 'single' ? handleGenerateEmail : handleGenerateSequence}
              disabled={aiLoading}
              className="flex items-center gap-2 bg-carbon text-crema px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] hover:bg-carbon/90 transition-colors disabled:opacity-40"
            >
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {emailMode === 'single'
                ? t.marketingPage.generateEmailBtn
                : t.marketingPage.generateSequenceBtn}
            </button>

            {emailLoading && <p className="text-xs text-carbon/30">{t.common.loading}</p>}

            {/* Empty state — only when there's neither a sequence nor a single email for the selected type */}
            {!emailLoading && groupedEmails.sequences.length === 0 && groupedEmails.singles.length === 0 && (
              <p className="text-xs text-carbon/20 italic text-center py-8">{t.marketingPage.noEmailTemplatesYet.replace('{type}', emailTypeLabel(selectedEmailType))}</p>
            )}

            {/* Sequences block (visually dominant) */}
            {groupedEmails.sequences.length > 0 && (
              <div className="space-y-4">
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30">
                  {t.marketingPage.emailSequencesHeading}
                </p>
                {groupedEmails.sequences.map(({ id, emails }) => (
                  <EmailSequenceGroup
                    key={id}
                    emails={emails}
                    stories={stories}
                    onDelete={deleteEmail}
                    onUpdate={updateEmailTemplate}
                  />
                ))}
              </div>
            )}

            {/* Singles block */}
            {groupedEmails.singles.length > 0 && (
              <div className={`space-y-3 ${groupedEmails.sequences.length > 0 ? 'mt-6' : ''}`}>
                {groupedEmails.sequences.length > 0 && (
                  <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30">
                    {t.marketingPage.emailSinglesHeading}
                  </p>
                )}
                {groupedEmails.singles.map(tpl => (
                  <EmailTemplateRow key={tpl.id} template={tpl} stories={stories} onDelete={() => deleteEmail(tpl.id)} onUpdate={updateEmailTemplate} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════ TAB: SEO ═══════ */}
        {activeTab === 'seo' && (
          <div className="space-y-6">
            <p className="text-sm font-light text-carbon/50">
              {t.marketingPage.seoDesc}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-2">{t.marketingPage.storyOptionalHeading}</p>
                <select value={selectedStoryId || ''} onChange={e => setSelectedStoryId(e.target.value || null)} className="w-full bg-white border border-carbon/[0.06] px-3 py-2 text-sm font-light text-carbon focus:outline-none">
                  <option value="">{t.marketingPage.allStoriesOption}</option>
                  {stories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-2">{t.marketingPage.skuHeading}</p>
                <select value={selectedSkuId || ''} onChange={e => setSelectedSkuId(e.target.value || null)} className="w-full bg-white border border-carbon/[0.06] px-3 py-2 text-sm font-light text-carbon focus:outline-none">
                  <option value="">{t.marketingPage.selectSkuPlaceholder}</option>
                  {skus.map(s => <option key={s.id} value={s.id}>{s.name} — {s.family}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateSeo}
              disabled={aiLoading || !selectedSkuId}
              className="flex items-center gap-2 bg-carbon text-crema px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] hover:bg-carbon/90 transition-colors disabled:opacity-40"
            >
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {t.marketingPage.generateSeoBtn}
            </button>

            {copiesLoading && <p className="text-xs text-carbon/30">{t.common.loading}</p>}
            <div className="space-y-3">
              {productCopies
                .filter(c => c.copy_type === 'seo_meta')
                .map(copy => (
                  <SeoRow key={copy.id} copy={copy} skus={skus} onDelete={() => deleteProductCopy(copy.id)} />
                ))}
              {productCopies.filter(c => c.copy_type === 'seo_meta').length === 0 && !copiesLoading && (
                <p className="text-xs text-carbon/20 italic text-center py-8">{t.marketingPage.noSeoYet}</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════ */

function ProductCopyRow({ copy, skus, onDelete }: { copy: ProductCopy; skus: SKU[]; onDelete: () => void }) {
  const t = useTranslation();
  const sku = skus.find(s => s.id === copy.sku_id);
  const meta = copy.metadata as { description?: string; features?: string[]; care?: string } | null;
  return (
    <div className="bg-white border border-carbon/[0.06] p-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-base font-light text-carbon tracking-tight">{copy.title}</h4>
          <p className="text-[10px] text-carbon/25">{sku?.name || t.marketingPage.unknownSku} — {copy.model_used}</p>
        </div>
        <button onClick={onDelete} className="p-1.5 text-carbon/25 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      {meta?.description && <p className="text-sm font-light text-carbon/60 leading-relaxed mb-2">{meta.description}</p>}
      {meta?.features?.length ? (
        <ul className="list-disc list-inside text-xs font-light text-carbon/50 space-y-0.5 mb-2">
          {meta.features.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      ) : null}
      {meta?.care && <p className="text-[10px] text-carbon/30 italic">{meta.care}</p>}
    </div>
  );
}

function SocialTemplateRow({ template, stories, onDelete }: { template: SocialTemplate; stories: Story[]; onDelete: () => void }) {
  const t = useTranslation();
  const story = stories.find(s => s.id === template.story_id);
  return (
    <div className="bg-white border border-carbon/[0.06] p-5">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium tracking-[0.1em] uppercase bg-carbon/[0.04] text-carbon/40 px-2 py-0.5">{template.type.replace('_', ' ')}</span>
          <span className="text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/25">{template.platform}</span>
          {story && <span className="text-[10px] italic text-carbon/25">{story.name}</span>}
        </div>
        <button onClick={onDelete} className="p-1.5 text-carbon/25 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      {template.caption && <p className="text-sm font-light text-carbon/60 leading-relaxed mb-2 whitespace-pre-wrap">{template.caption}</p>}
      {template.hashtags?.length ? (
        <div className="flex flex-wrap gap-1 mb-2">
          {template.hashtags.map((h, i) => <span key={i} className="text-[10px] text-blue-500">#{h.replace('#', '')}</span>)}
        </div>
      ) : null}
      {template.cta && <p className="text-[10px] text-carbon/30">{t.marketingPage.ctaInlineLabel}: {template.cta}</p>}
      {template.best_paired_with && <p className="text-[10px] text-carbon/25 italic">{t.marketingPage.bestWithLabel}: {template.best_paired_with}</p>}
    </div>
  );
}

/**
 * EmailSequenceGroup — renders a drip campaign as a single clustered card:
 * a sequence header (name, type, trigger, target metrics) plus the member
 * emails in `sequence_position` order, each with its delay context.
 *
 * Previously sequences rendered as flat individual rows — which lost the
 * narrative of "3 emails 24h apart" and turned bulk AI inserts into a soup
 * of rows. This component restores the editorial shape.
 *
 * The inner EmailTemplateRow is reused unchanged for each member — editing,
 * deleting, and updating still work per-row. The group is presentation only.
 */
function EmailSequenceGroup({
  emails,
  stories,
  onDelete,
  onUpdate,
}: {
  emails: EmailTemplateContent[];
  stories: Story[];
  onDelete: (id: string) => Promise<boolean>;
  onUpdate: (id: string, updates: Partial<EmailTemplateContent>) => Promise<EmailTemplateContent | null>;
}) {
  const t = useTranslation();
  // Group metadata lives on every member row (denormalized at bulk-insert
  // time), so we can safely pick it off the first email. Fall back cleanly
  // if anything is missing.
  const first = emails[0];
  const name = first?.sequence_name || '—';
  const type = first?.sequence_type as 'welcome' | 'launch' | 'post_purchase' | 're_engagement' | null | undefined;
  const total = first?.sequence_total ?? emails.length;
  const trigger = first?.trigger || null;
  const metrics = first?.success_metrics || null;

  const typeLabel = type
    ? (t.marketingPage[`sequenceType_${type}` as keyof typeof t.marketingPage] as string)
    : null;

  return (
    <div className="bg-carbon/[0.015] border border-carbon/[0.06]">
      {/* Sequence header */}
      <div className="px-5 py-4 border-b border-carbon/[0.06] flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[9px] font-medium tracking-[0.12em] uppercase bg-carbon text-crema px-2 py-0.5">
              {t.marketingPage.emailSequenceBadge}
            </span>
            {typeLabel && (
              <span className="text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/40">
                {typeLabel}
              </span>
            )}
          </div>
          <h5 className="text-base font-light text-carbon tracking-tight truncate">{name}</h5>
          {trigger && (
            <p className="text-[11px] font-light text-carbon/45 mt-1">
              <span className="text-carbon/30 uppercase tracking-[0.08em] text-[10px]">{t.marketingPage.emailSequenceTriggerLabel}:</span>{' '}
              {trigger}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-xl font-light text-carbon leading-none">
            {emails.length}
            {total !== emails.length && <span className="text-carbon/25 text-sm">/{total}</span>}
          </p>
          {metrics &&
            (metrics.target_open_rate !== undefined ||
              metrics.target_ctr !== undefined ||
              metrics.target_conversion_rate !== undefined) && (
              <div className="mt-2 flex flex-col gap-0.5 text-[10px] font-light text-carbon/40 items-end">
                {metrics.target_open_rate !== undefined && (
                  <span>
                    {t.marketingPage.emailSequenceMetricOpen}{' '}
                    {(metrics.target_open_rate * 100).toFixed(0)}%
                  </span>
                )}
                {metrics.target_ctr !== undefined && (
                  <span>
                    {t.marketingPage.emailSequenceMetricCtr}{' '}
                    {(metrics.target_ctr * 100).toFixed(0)}%
                  </span>
                )}
                {metrics.target_conversion_rate !== undefined && (
                  <span>
                    {t.marketingPage.emailSequenceMetricConv}{' '}
                    {(metrics.target_conversion_rate * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            )}
        </div>
      </div>

      {/* Member emails in position order */}
      <div className="divide-y divide-carbon/[0.06]">
        {emails.map((tpl, idx) => {
          const pos = tpl.sequence_position ?? idx + 1;
          const delay = tpl.send_delay_hours ?? 0;
          const delayLabel =
            idx === 0 || delay === 0
              ? t.marketingPage.emailSequenceDelayImmediate
              : t.marketingPage.emailSequenceDelayLabel.replace('{hours}', String(delay));

          return (
            <div key={tpl.id} className="px-5 py-4">
              <p className="text-[10px] font-light text-carbon/40 mb-2 tracking-[0.08em] uppercase">
                {t.marketingPage.emailSequenceOf
                  .replace('{position}', String(pos))
                  .replace('{total}', String(total))}
                {' · '}
                {delayLabel}
              </p>
              <EmailTemplateRow
                template={tpl}
                stories={stories}
                onDelete={() => {
                  void onDelete(tpl.id);
                }}
                onUpdate={onUpdate}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmailTemplateRow({ template, stories, onDelete, onUpdate }: { template: EmailTemplateContent; stories: Story[]; onDelete: () => void; onUpdate: (id: string, updates: Partial<EmailTemplateContent>) => Promise<EmailTemplateContent | null> }) {
  const t = useTranslation();
  const story = stories.find(s => s.id === template.story_id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(template);

  return (
    <div className="bg-white border border-carbon/[0.06] p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium tracking-[0.1em] uppercase bg-carbon/[0.04] text-carbon/40 px-2 py-0.5">{template.email_type.replace('_', ' ')}</span>
          {story && <span className="text-[10px] italic text-carbon/25">{story.name}</span>}
          {template.status && <span className={`text-[10px] px-2 py-0.5 ${template.status === 'draft' ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>{template.status}</span>}
        </div>
        <div className="flex gap-1">
          <button onClick={() => { setEditing(!editing); setForm(template); }} className="p-1.5 text-carbon/25 hover:text-carbon/60"><Edit3 className="h-3.5 w-3.5" /></button>
          <button onClick={onDelete} className="p-1.5 text-carbon/25 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <input value={form.subject_line ?? ''} onChange={e => setForm({ ...form, subject_line: e.target.value })} className="w-full text-sm font-light text-carbon bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none" placeholder={t.marketingPage.subjectLinePlaceholder} />
          <input value={form.preview_text ?? ''} onChange={e => setForm({ ...form, preview_text: e.target.value })} className="w-full text-xs font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none" placeholder={t.marketingPage.previewTextPlaceholder} />
          <input value={form.heading ?? ''} onChange={e => setForm({ ...form, heading: e.target.value })} className="w-full text-sm font-light text-carbon bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none" placeholder={t.marketingPage.headingPlaceholder} />
          <textarea value={form.body ?? ''} onChange={e => setForm({ ...form, body: e.target.value })} className="w-full h-24 text-xs font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none resize-none" placeholder={t.marketingPage.bodyPlaceholder} />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.cta_text ?? ''} onChange={e => setForm({ ...form, cta_text: e.target.value })} className="text-xs font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none" placeholder={t.marketingPage.ctaTextPlaceholder} />
            <input value={form.cta_url ?? ''} onChange={e => setForm({ ...form, cta_url: e.target.value })} className="text-xs font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none" placeholder={t.marketingPage.ctaUrlPlaceholder} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => { onUpdate(template.id, form); setEditing(false); }} className="flex items-center gap-2 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] bg-carbon text-crema"><Check className="h-3.5 w-3.5" /> {t.common.save}</button>
            <button onClick={() => setEditing(false)} className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] border border-carbon/[0.06] text-carbon/50">{t.common.cancel}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {template.subject_line && <div><p className="text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/25">{t.marketingPage.subjectHeading}</p><p className="text-sm font-light text-carbon/70">{template.subject_line}</p></div>}
          {template.preview_text && <p className="text-xs font-light text-carbon/40 italic">{template.preview_text}</p>}
          {template.heading && <p className="text-base font-light text-carbon tracking-tight">{template.heading}</p>}
          {template.body && <p className="text-sm font-light text-carbon/60 leading-relaxed whitespace-pre-wrap">{template.body}</p>}
          {template.cta_text && (
            <div className="inline-block bg-carbon/[0.06] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-carbon/60">
              {template.cta_text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SeoRow({ copy, skus, onDelete }: { copy: ProductCopy; skus: SKU[]; onDelete: () => void }) {
  const t = useTranslation();
  const sku = skus.find(s => s.id === copy.sku_id);
  const meta = copy.metadata as { meta_title?: string; meta_description?: string; alt_text?: string; keywords?: string[]; og_title?: string; og_description?: string } | null;
  return (
    <div className="bg-white border border-carbon/[0.06] p-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-base font-light text-carbon tracking-tight">{meta?.meta_title || copy.title}</h4>
          <p className="text-[10px] text-carbon/25">{sku?.name || t.marketingPage.unknownSku}</p>
        </div>
        <button onClick={onDelete} className="p-1.5 text-carbon/25 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      {meta?.meta_description && <p className="text-sm font-light text-carbon/60 mb-2">{meta.meta_description}</p>}
      {meta?.alt_text && <p className="text-xs font-light text-carbon/40 italic mb-2">{t.marketingPage.altInlineLabel}: {meta.alt_text}</p>}
      {meta?.keywords?.length ? (
        <div className="flex flex-wrap gap-1">
          {meta.keywords.map((k, i) => <span key={i} className="text-[10px] bg-carbon/[0.04] text-carbon/40 px-2 py-0.5">{k}</span>)}
        </div>
      ) : null}
      {meta?.og_title && <p className="text-[10px] text-carbon/25 mt-2">{t.marketingPage.ogInlineLabel}: {meta.og_title}</p>}
    </div>
  );
}
