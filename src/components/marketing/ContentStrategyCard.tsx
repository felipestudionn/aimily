'use client';

import { useState } from 'react';
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

const PLATFORMS: { id: SocialPlatform; label: string }[] = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'facebook', label: 'Facebook' },
];

const EMAIL_TYPES: { id: EmailTemplateType; label: string }[] = [
  { id: 'launch', label: 'Launch' },
  { id: 'welcome', label: 'Welcome' },
  { id: 'cart_abandonment', label: 'Cart Abandonment' },
  { id: 'post_purchase', label: 'Post Purchase' },
];

/* ── Component ── */

export function ContentStrategyCard({ collectionPlanId }: ContentStrategyCardProps) {
  const t = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentStrategyTab>('pillars-voice');

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
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);

  // Edit state for pillars
  const [editingPillarId, setEditingPillarId] = useState<string | null>(null);
  const [editPillarForm, setEditPillarForm] = useState<Partial<ContentPillar>>({});

  // Edit state for voice
  const [editingVoice, setEditingVoice] = useState(false);
  const [voiceForm, setVoiceForm] = useState<Partial<BrandVoiceConfig>>({});

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
    });
    if (!result) return;

    await addCopy({
      collection_plan_id: collectionPlanId,
      sku_id: sku.id,
      copy_type: 'product_description',
      title: result.headline || sku.name,
      content: JSON.stringify(result),
      metadata: result,
      status: 'draft',
      story_id: selectedStoryId,
      model_used: 'claude-sonnet-4',
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

    const items = result.templates.map((t: { type: string; caption: string; hashtags: string[]; cta: string; best_paired_with: string }) => ({
      collection_plan_id: collectionPlanId,
      story_id: selectedStoryId,
      platform: selectedPlatform,
      type: t.type || 'product_feature',
      caption: t.caption || null,
      hashtags: t.hashtags || null,
      cta: t.cta || null,
      best_paired_with: t.best_paired_with || null,
    }));
    await bulkSaveSocial(items);
  };

  /* ── Tab: Email Templates AI handler ── */

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
                  Voice: {voiceConfig.personality?.slice(0, 30)}
                </span>
              )}
              {socialTemplates.length > 0 && (
                <span className="text-[11px] text-carbon/30">{socialTemplates.length} social</span>
              )}
              {emailTemplates.length > 0 && (
                <span className="text-[11px] text-carbon/30">{emailTemplates.length} email</span>
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
                Define your content pillars and brand voice. Use AI to generate both at once, or configure manually.
              </p>
              <textarea
                value={userDirection}
                onChange={e => setUserDirection(e.target.value)}
                placeholder="E.g. We want a sophisticated but approachable tone. Focus on sustainability, craftsmanship, and modern elegance..."
                className="w-full h-24 bg-white border border-carbon/[0.06] px-4 py-3 text-sm font-light text-carbon placeholder:text-carbon/25 focus:outline-none focus:border-carbon/20 resize-none"
              />
              <button
                onClick={handleGeneratePillarsVoice}
                disabled={aiLoading}
                className="flex items-center gap-2 bg-carbon text-crema px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] hover:bg-carbon/90 transition-colors disabled:opacity-40"
              >
                {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate Pillars & Voice
              </button>
            </div>

            {/* Content Pillars */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">
                  Content Pillars ({pillars.length})
                </p>
                <button
                  onClick={() => addPillar({ collection_plan_id: collectionPlanId, name: `Pillar ${pillars.length + 1}`, description: null, examples: null, stories_alignment: null })}
                  className="flex items-center gap-1.5 text-[11px] text-carbon/50 hover:text-carbon transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
              {pillarsLoading && <p className="text-xs text-carbon/30">Loading...</p>}
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
                            placeholder="Pillar name"
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
                          placeholder="Description..."
                        />
                        <input
                          value={(editPillarForm.examples ?? []).join(', ')}
                          onChange={e => setEditPillarForm({ ...editPillarForm, examples: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                          className="w-full text-xs font-light text-carbon/50 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none"
                          placeholder="Examples (comma separated)"
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
                            <p className="text-[10px] text-carbon/25 mt-2 italic">Stories: {pillar.stories_alignment.join(', ')}</p>
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
                <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">Brand Voice</p>
                {!editingVoice && (
                  <button
                    onClick={() => { setEditingVoice(true); setVoiceForm(voiceConfig || {}); }}
                    className="flex items-center gap-1.5 text-[11px] text-carbon/50 hover:text-carbon transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
              </div>
              {voiceLoading && <p className="text-xs text-carbon/30">Loading...</p>}

              {editingVoice ? (
                <div className="bg-white border border-carbon/[0.06] p-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input value={voiceForm.personality ?? ''} onChange={e => setVoiceForm({ ...voiceForm, personality: e.target.value })} className="text-sm font-light text-carbon bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none" placeholder="Personality (e.g. Bold, refined, playful)" />
                    <input value={voiceForm.tone ?? ''} onChange={e => setVoiceForm({ ...voiceForm, tone: e.target.value })} className="text-sm font-light text-carbon bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none" placeholder="Tone" />
                  </div>
                  <input value={(voiceForm.do_rules ?? []).join(', ')} onChange={e => setVoiceForm({ ...voiceForm, do_rules: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="w-full text-xs font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none" placeholder="Do rules (comma separated)" />
                  <input value={(voiceForm.dont_rules ?? []).join(', ')} onChange={e => setVoiceForm({ ...voiceForm, dont_rules: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="w-full text-xs font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none" placeholder="Don't rules (comma separated)" />
                  <input value={(voiceForm.vocabulary ?? []).join(', ')} onChange={e => setVoiceForm({ ...voiceForm, vocabulary: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="w-full text-xs font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none" placeholder="Vocabulary / key phrases (comma separated)" />
                  <textarea value={voiceForm.example_caption ?? ''} onChange={e => setVoiceForm({ ...voiceForm, example_caption: e.target.value })} className="w-full h-16 text-xs font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none resize-none" placeholder="Example caption..." />
                  <div className="flex gap-2">
                    <button onClick={() => { saveVoiceConfig(voiceForm); setEditingVoice(false); }} className="flex items-center gap-2 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] bg-carbon text-crema hover:bg-carbon/90"><Check className="h-3.5 w-3.5" /> Save</button>
                    <button onClick={() => setEditingVoice(false)} className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] border border-carbon/[0.06] text-carbon/50 hover:text-carbon/80">Cancel</button>
                  </div>
                </div>
              ) : voiceConfig ? (
                <div className="bg-white border border-carbon/[0.06] p-5 space-y-3">
                  {voiceConfig.personality && <div><p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/25 mb-1">Personality</p><p className="text-sm font-light text-carbon/70">{voiceConfig.personality}</p></div>}
                  {voiceConfig.tone && <div><p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/25 mb-1">Tone</p><p className="text-sm font-light text-carbon/70">{voiceConfig.tone}</p></div>}
                  {voiceConfig.do_rules?.length ? <div><p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/25 mb-1">Do</p><div className="flex flex-wrap gap-1.5">{voiceConfig.do_rules.map((r, i) => <span key={i} className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5">{r}</span>)}</div></div> : null}
                  {voiceConfig.dont_rules?.length ? <div><p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/25 mb-1">Don&apos;t</p><div className="flex flex-wrap gap-1.5">{voiceConfig.dont_rules.map((r, i) => <span key={i} className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5">{r}</span>)}</div></div> : null}
                  {voiceConfig.vocabulary?.length ? <div><p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/25 mb-1">Vocabulary</p><div className="flex flex-wrap gap-1.5">{voiceConfig.vocabulary.map((v, i) => <span key={i} className="text-[10px] bg-carbon/[0.04] text-carbon/50 px-2 py-0.5">{v}</span>)}</div></div> : null}
                  {voiceConfig.example_caption && <div><p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/25 mb-1">Example Caption</p><p className="text-sm font-light text-carbon/50 italic">&ldquo;{voiceConfig.example_caption}&rdquo;</p></div>}
                </div>
              ) : (
                <p className="text-xs text-carbon/20 italic">No brand voice configured. Use AI or edit manually.</p>
              )}
            </div>
          </div>
        )}

        {/* ═══════ TAB: PRODUCT COPY ═══════ */}
        {activeTab === 'product-copy' && (
          <div className="space-y-6">
            <p className="text-sm font-light text-carbon/50">
              Generate compelling product descriptions per SKU, contextualized by story.
            </p>

            {/* Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-2">Story (optional)</p>
                <select value={selectedStoryId || ''} onChange={e => setSelectedStoryId(e.target.value || null)} className="w-full bg-white border border-carbon/[0.06] px-3 py-2 text-sm font-light text-carbon focus:outline-none">
                  <option value="">All stories</option>
                  {stories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-2">SKU</p>
                <select value={selectedSkuId || ''} onChange={e => setSelectedSkuId(e.target.value || null)} className="w-full bg-white border border-carbon/[0.06] px-3 py-2 text-sm font-light text-carbon focus:outline-none">
                  <option value="">Select a SKU...</option>
                  {skus.map(s => <option key={s.id} value={s.id}>{s.name} — {s.family}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateProductCopy}
              disabled={aiLoading || !selectedSkuId}
              className="flex items-center gap-2 bg-carbon text-crema px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] hover:bg-carbon/90 transition-colors disabled:opacity-40"
            >
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate Copy
            </button>

            {/* Existing copies */}
            {copiesLoading && <p className="text-xs text-carbon/30">Loading...</p>}
            <div className="space-y-3">
              {productCopies
                .filter(c => c.copy_type === 'product_description')
                .map(copy => (
                  <ProductCopyRow key={copy.id} copy={copy} skus={skus} onDelete={() => deleteProductCopy(copy.id)} />
                ))}
              {productCopies.filter(c => c.copy_type === 'product_description').length === 0 && !copiesLoading && (
                <p className="text-xs text-carbon/20 italic text-center py-8">No product copy yet. Select a SKU and generate.</p>
              )}
            </div>
          </div>
        )}

        {/* ═══════ TAB: SOCIAL TEMPLATES ═══════ */}
        {activeTab === 'social' && (
          <div className="space-y-6">
            <p className="text-sm font-light text-carbon/50">
              Generate social media templates by story and platform.
            </p>

            {/* Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-2">Story</p>
                <select value={selectedStoryId || ''} onChange={e => setSelectedStoryId(e.target.value || null)} className="w-full bg-white border border-carbon/[0.06] px-3 py-2 text-sm font-light text-carbon focus:outline-none">
                  <option value="">General (no story)</option>
                  {stories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-2">Platform</p>
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
              Generate 5 Templates
            </button>

            {/* Templates list */}
            {socialLoading && <p className="text-xs text-carbon/30">Loading...</p>}
            <div className="space-y-3">
              {socialTemplates
                .filter(t => !selectedStoryId || t.story_id === selectedStoryId)
                .filter(t => t.platform === selectedPlatform)
                .map(tpl => (
                  <SocialTemplateRow key={tpl.id} template={tpl} stories={stories} onDelete={() => deleteSocial(tpl.id)} />
                ))}
              {socialTemplates.filter(t => t.platform === selectedPlatform).length === 0 && !socialLoading && (
                <p className="text-xs text-carbon/20 italic text-center py-8">No {selectedPlatform} templates yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ═══════ TAB: EMAIL TEMPLATES ═══════ */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <p className="text-sm font-light text-carbon/50">
              Generate email templates for different touchpoints in the customer journey.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-2">Story (optional)</p>
                <select value={selectedStoryId || ''} onChange={e => setSelectedStoryId(e.target.value || null)} className="w-full bg-white border border-carbon/[0.06] px-3 py-2 text-sm font-light text-carbon focus:outline-none">
                  <option value="">General</option>
                  {stories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-2">Email Type</p>
                <div className="flex gap-1 flex-wrap">
                  {EMAIL_TYPES.map(et => (
                    <button
                      key={et.id}
                      onClick={() => setSelectedEmailType(et.id)}
                      className={`px-3 py-2 text-[11px] font-medium uppercase tracking-[0.06em] border transition-colors ${
                        selectedEmailType === et.id ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.06] hover:text-carbon/80'
                      }`}
                    >
                      {et.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateEmail}
              disabled={aiLoading}
              className="flex items-center gap-2 bg-carbon text-crema px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] hover:bg-carbon/90 transition-colors disabled:opacity-40"
            >
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate Email
            </button>

            {emailLoading && <p className="text-xs text-carbon/30">Loading...</p>}
            <div className="space-y-3">
              {emailTemplates
                .filter(t => t.email_type === selectedEmailType)
                .map(tpl => (
                  <EmailTemplateRow key={tpl.id} template={tpl} stories={stories} onDelete={() => deleteEmail(tpl.id)} onUpdate={updateEmailTemplate} />
                ))}
              {emailTemplates.filter(t => t.email_type === selectedEmailType).length === 0 && !emailLoading && (
                <p className="text-xs text-carbon/20 italic text-center py-8">No {selectedEmailType.replace('_', ' ')} templates yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ═══════ TAB: SEO ═══════ */}
        {activeTab === 'seo' && (
          <div className="space-y-6">
            <p className="text-sm font-light text-carbon/50">
              Generate SEO metadata per SKU — meta titles, descriptions, alt text, keywords.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-2">Story (optional)</p>
                <select value={selectedStoryId || ''} onChange={e => setSelectedStoryId(e.target.value || null)} className="w-full bg-white border border-carbon/[0.06] px-3 py-2 text-sm font-light text-carbon focus:outline-none">
                  <option value="">All stories</option>
                  {stories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-2">SKU</p>
                <select value={selectedSkuId || ''} onChange={e => setSelectedSkuId(e.target.value || null)} className="w-full bg-white border border-carbon/[0.06] px-3 py-2 text-sm font-light text-carbon focus:outline-none">
                  <option value="">Select a SKU...</option>
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
              Generate SEO
            </button>

            {copiesLoading && <p className="text-xs text-carbon/30">Loading...</p>}
            <div className="space-y-3">
              {productCopies
                .filter(c => c.copy_type === 'seo_meta')
                .map(copy => (
                  <SeoRow key={copy.id} copy={copy} skus={skus} onDelete={() => deleteProductCopy(copy.id)} />
                ))}
              {productCopies.filter(c => c.copy_type === 'seo_meta').length === 0 && !copiesLoading && (
                <p className="text-xs text-carbon/20 italic text-center py-8">No SEO metadata yet. Select a SKU and generate.</p>
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
  const sku = skus.find(s => s.id === copy.sku_id);
  const meta = copy.metadata as { description?: string; features?: string[]; care?: string } | null;
  return (
    <div className="bg-white border border-carbon/[0.06] p-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-base font-light text-carbon tracking-tight">{copy.title}</h4>
          <p className="text-[10px] text-carbon/25">{sku?.name || 'Unknown SKU'} — {copy.model_used}</p>
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
      {template.cta && <p className="text-[10px] text-carbon/30">CTA: {template.cta}</p>}
      {template.best_paired_with && <p className="text-[10px] text-carbon/25 italic">Best with: {template.best_paired_with}</p>}
    </div>
  );
}

function EmailTemplateRow({ template, stories, onDelete, onUpdate }: { template: EmailTemplateContent; stories: Story[]; onDelete: () => void; onUpdate: (id: string, updates: Partial<EmailTemplateContent>) => Promise<EmailTemplateContent | null> }) {
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
          <input value={form.subject_line ?? ''} onChange={e => setForm({ ...form, subject_line: e.target.value })} className="w-full text-sm font-light text-carbon bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none" placeholder="Subject line" />
          <input value={form.preview_text ?? ''} onChange={e => setForm({ ...form, preview_text: e.target.value })} className="w-full text-xs font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none" placeholder="Preview text" />
          <input value={form.heading ?? ''} onChange={e => setForm({ ...form, heading: e.target.value })} className="w-full text-sm font-light text-carbon bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none" placeholder="Heading" />
          <textarea value={form.body ?? ''} onChange={e => setForm({ ...form, body: e.target.value })} className="w-full h-24 text-xs font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none resize-none" placeholder="Body" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.cta_text ?? ''} onChange={e => setForm({ ...form, cta_text: e.target.value })} className="text-xs font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none" placeholder="CTA text" />
            <input value={form.cta_url ?? ''} onChange={e => setForm({ ...form, cta_url: e.target.value })} className="text-xs font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none" placeholder="CTA URL" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => { onUpdate(template.id, form); setEditing(false); }} className="flex items-center gap-2 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] bg-carbon text-crema"><Check className="h-3.5 w-3.5" /> Save</button>
            <button onClick={() => setEditing(false)} className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] border border-carbon/[0.06] text-carbon/50">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {template.subject_line && <div><p className="text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/25">Subject</p><p className="text-sm font-light text-carbon/70">{template.subject_line}</p></div>}
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
  const sku = skus.find(s => s.id === copy.sku_id);
  const meta = copy.metadata as { meta_title?: string; meta_description?: string; alt_text?: string; keywords?: string[]; og_title?: string; og_description?: string } | null;
  return (
    <div className="bg-white border border-carbon/[0.06] p-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-base font-light text-carbon tracking-tight">{meta?.meta_title || copy.title}</h4>
          <p className="text-[10px] text-carbon/25">{sku?.name || 'Unknown SKU'}</p>
        </div>
        <button onClick={onDelete} className="p-1.5 text-carbon/25 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      {meta?.meta_description && <p className="text-sm font-light text-carbon/60 mb-2">{meta.meta_description}</p>}
      {meta?.alt_text && <p className="text-xs font-light text-carbon/40 italic mb-2">Alt: {meta.alt_text}</p>}
      {meta?.keywords?.length ? (
        <div className="flex flex-wrap gap-1">
          {meta.keywords.map((k, i) => <span key={i} className="text-[10px] bg-carbon/[0.04] text-carbon/40 px-2 py-0.5">{k}</span>)}
        </div>
      ) : null}
      {meta?.og_title && <p className="text-[10px] text-carbon/25 mt-2">OG: {meta.og_title}</p>}
    </div>
  );
}
