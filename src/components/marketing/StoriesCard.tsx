'use client';

import { useState, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  ChevronLeft,
  GripVertical,
  Sparkles,
  Loader2,
  Check,
  X,
  Edit3,
  Star,
} from 'lucide-react';
import { useStories, type Story } from '@/hooks/useStories';
import { useSkus, type SKU } from '@/hooks/useSkus';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';

/* ── Types ── */

type TabMode = 'libre' | 'asistido' | 'propuesta';

interface AiStoryContentDirection {
  setting?: string;
  lighting?: string;
  styling?: string;
  model_attitude?: string;
  camera_approach?: string;
}

interface AiStoryPriorityScore {
  total?: number;
  customer_impact?: number;
  commercial_fit?: number;
  visual_differentiation?: number;
  rationale?: string;
}

interface AiStoryDraft {
  name: string;
  narrative: string;
  mood: string[];
  tone: string;
  color_palette: string[];
  sku_ids: string[];
  hero_sku_id: string;
  /**
   * The new prompt (B3) returns this as a structured object with 5 fields.
   * Legacy prompts returned a single string. We accept both and persist both
   * shapes via content_direction (string summary) + content_direction_structured.
   */
  content_direction: string | AiStoryContentDirection;
  priority_score?: AiStoryPriorityScore;
  editorial_hook?: string;
}

interface AiResult {
  stories: AiStoryDraft[];
  rationale?: string;
}

/* ── Props ── */

interface StoriesCardProps {
  collectionPlanId: string;
}

/* ── Component ── */

export function StoriesCard({ collectionPlanId }: StoriesCardProps) {
  const t = useTranslation();
  const { language } = useLanguage();
  const {
    stories,
    loading,
    addStory,
    updateStory,
    deleteStory,
    bulkSaveStories,
    assignSku,
  } = useStories(collectionPlanId);
  const { skus, refetch: refetchSkus } = useSkus(collectionPlanId);

  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabMode>('libre');
  const [editingId, setEditingId] = useState<string | null>(null);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDrafts, setAiDrafts] = useState<AiResult | null>(null);
  const [userDirection, setUserDirection] = useState('');
  // B3 — optional consumer voice signals to ground stories in real customer language
  const [consumerSignalsText, setConsumerSignalsText] = useState('');

  // Drag state
  const [dragSkuId, setDragSkuId] = useState<string | null>(null);

  // Inline edit state — MUST live above the early return so hook order is
  // identical between the collapsed and expanded renders. Previously declared
  // after the early return, which triggered React #310 the first time the
  // user clicked "OPEN" (collapsed render registered N hooks, expanded render
  // registered N+1 → mismatch → crash). Fix: hoist to top.
  const [editForm, setEditForm] = useState<Partial<Story>>({});
  // AI error state — also hoisted for the same reason.
  const [aiError, setAiError] = useState<string | null>(null);

  /* ── Card (collapsed) view ── */
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="group relative bg-white p-10 lg:p-12 border border-carbon/[0.06] flex flex-col min-h-[340px] hover:shadow-lg transition-all duration-300 text-left w-full"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-carbon/[0.04] flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-5 w-5 text-carbon/40 group-hover:text-carbon/70 transition-colors" />
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25 mb-1">
              {t.marketingPage.storiesLabel}
            </p>
            <h3 className="text-xl md:text-2xl font-light text-carbon tracking-tight leading-[1.15]">
              {t.marketingPage.storiesTitle}
            </h3>
          </div>
        </div>
        <p className="text-sm font-light text-carbon/45 leading-relaxed flex-1">
          {t.marketingPage.storiesDesc}
        </p>

        {/* Story count / preview */}
        <div className="mt-6 pt-6 border-t border-carbon/[0.06]">
          {loading ? (
            <p className="text-xs text-carbon/30">{t.marketingPage.loading}</p>
          ) : stories.length === 0 ? (
            <p className="text-xs text-carbon/20 tracking-wide">{t.marketingPage.noStoriesYet}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {stories.map((s) => (
                <span
                  key={s.id}
                  className="text-[11px] tracking-[0.05em] uppercase bg-carbon/[0.04] text-carbon/50 px-3 py-1"
                >
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 bg-carbon text-white py-3 px-4 text-[11px] font-medium uppercase tracking-[-0.01em] group-hover:bg-carbon/90 transition-colors">
          {t.marketingPage.open}
        </div>
      </button>
    );
  }

  /* ── Helpers ── */

  const unassignedSkus = skus.filter(
    (sk) => !stories.some((st) => st.id === (sk as SKU & { story_id?: string }).story_id)
  );

  // For display: get SKUs per story by checking story_id
  const skusForStory = (storyId: string) =>
    skus.filter((sk) => (sk as SKU & { story_id?: string }).story_id === storyId);

  /* ── AI handlers ── */

  const generateStories = async (mode: 'generate' | 'assist') => {
    setAiLoading(true);
    setAiDrafts(null);
    setAiError(null);
    try {
      const consumerSignals = consumerSignalsText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const res = await fetch('/api/ai/stories/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPlanId,
          mode,
          userDirection: mode === 'assist' ? userDirection : undefined,
          consumerSignals: consumerSignals.length > 0 ? consumerSignals : undefined,
          language,
        }),
      });
      if (!res.ok) {
        // Surface the real backend error instead of a generic message so
        // the user (and future debugging) can see what actually failed.
        let backendMessage = `HTTP ${res.status}`;
        try {
          const errBody = (await res.json()) as { error?: string };
          if (errBody?.error) backendMessage = errBody.error;
        } catch {
          // body was not JSON — fall back to the status
        }
        throw new Error(backendMessage);
      }
      const data = (await res.json()) as AiResult;
      setAiDrafts(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('AI generation error:', err);
      setAiError(message);
    } finally {
      setAiLoading(false);
    }
  };

  const confirmAiDrafts = async () => {
    if (!aiDrafts) return;

    const consumerSignalsArr = consumerSignalsText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const newStories = aiDrafts.stories.map((d, i) => {
      // Back-compat: content_direction can be either a plain string (legacy)
      // or a structured object (B3). Normalize both into a string summary
      // AND a structured payload so legacy readers and new readers both work.
      const structured: AiStoryContentDirection =
        typeof d.content_direction === 'object' && d.content_direction !== null
          ? d.content_direction
          : {};
      const structuredSummary = [
        structured.setting,
        structured.lighting,
        structured.styling,
        structured.model_attitude,
        structured.camera_approach,
      ]
        .filter(Boolean)
        .join(' · ');
      const contentDirectionText =
        typeof d.content_direction === 'string'
          ? d.content_direction
          : structuredSummary;

      return {
        collection_plan_id: collectionPlanId,
        name: d.name,
        narrative: d.narrative,
        mood: d.mood,
        tone: d.tone,
        color_palette: d.color_palette,
        hero_sku_id: null as string | null,
        content_direction: contentDirectionText,
        // B3 enrichment fields
        content_direction_structured: structured,
        priority_score_total: d.priority_score?.total ?? null,
        priority_score_breakdown: d.priority_score ?? null,
        editorial_hook: d.editorial_hook ?? null,
        consumer_signals: consumerSignalsArr,
        sort_order: i,
      };
    });

    const skuAssignments: Record<string, string[]> = {};
    for (const d of aiDrafts.stories) {
      if (d.sku_ids?.length) skuAssignments[d.name] = d.sku_ids;
    }
    setAiError(null);
    try {
      await bulkSaveStories(newStories, skuAssignments);
      setAiDrafts(null);
      refetchSkus();
    } catch (err) {
      // Hook contract: write operations throw structured errors from the
      // backend. Surface the real message instead of silently failing.
      setAiError(err instanceof Error ? err.message : 'Failed to save stories');
    }
  };

  /* ── Drag & Drop ── */

  const handleDrop = async (storyId: string) => {
    if (!dragSkuId) return;
    setAiError(null);
    try {
      await assignSku(dragSkuId, storyId);
      setDragSkuId(null);
      refetchSkus();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to assign SKU');
    }
  };

  const handleUnassign = async (skuId: string) => {
    setAiError(null);
    try {
      await assignSku(skuId, null);
      refetchSkus();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to unassign SKU');
    }
  };

  /* ── Add blank story ── */

  const handleAddStory = async () => {
    setAiError(null);
    try {
      await addStory({
        collection_plan_id: collectionPlanId,
        name: `Story ${stories.length + 1}`,
        narrative: null,
        mood: null,
        tone: null,
        color_palette: null,
        hero_sku_id: null,
        content_direction: null,
        sort_order: stories.length,
      });
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to add story');
    }
  };

  /* ── Inline edit ── */
  // editForm state declared above (hoisted above early return to avoid React #310).

  const startEdit = (story: Story) => {
    setEditingId(story.id);
    setEditForm({
      name: story.name,
      narrative: story.narrative,
      mood: story.mood,
      tone: story.tone,
      color_palette: story.color_palette,
      content_direction: story.content_direction,
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setAiError(null);
    try {
      await updateStory(editingId, editForm);
      setEditingId(null);
      setEditForm({});
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to save edits');
    }
  };

  /* ── TABS ── */

  const TABS: { id: TabMode; labelKey: 'tabManual' | 'tabAssisted' | 'tabAiProposal' }[] = [
    { id: 'libre', labelKey: 'tabManual' },
    { id: 'asistido', labelKey: 'tabAssisted' },
    { id: 'propuesta', labelKey: 'tabAiProposal' },
  ];

  /* ── Expanded view ── */

  return (
    <div className="fixed inset-0 z-50 bg-crema overflow-auto">
      {/* Header bar */}
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
              {t.marketingPage.storiesLabel}
            </p>
            <h2 className="text-lg font-light text-carbon tracking-tight">
              {t.marketingPage.storiesTitle}
            </h2>
          </div>
          <div className="w-32" />
        </div>

        {/* Mode tabs */}
        <div className="max-w-6xl mx-auto px-6 pb-3 flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setAiDrafts(null);
              }}
              className={`px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] border transition-colors ${
                activeTab === tab.id
                  ? 'bg-carbon text-white border-carbon'
                  : 'bg-white text-carbon/50 border-carbon/[0.06] hover:text-carbon/80'
              }`}
            >
              {t.marketingPage[tab.labelKey]}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* ─── TAB: LIBRE ─── */}
        {activeTab === 'libre' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-light text-carbon/50">
                {t.marketingPage.createStoriesManually}
              </p>
              <button
                onClick={handleAddStory}
                className="flex items-center gap-2 bg-carbon text-white px-4 py-2 text-[11px] font-medium uppercase tracking-[0.12em] hover:bg-carbon/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> {t.marketingPage.addStory}
              </button>
            </div>

            {stories.length === 0 && !loading && (
              <div className="text-center py-20 text-carbon/30 text-sm font-light">
                {t.marketingPage.noStoriesEmpty}
              </div>
            )}

            {/* Story cards */}
            {stories.map((story) => (
              <StoryRow
                key={story.id}
                story={story}
                skus={skusForStory(story.id)}
                editing={editingId === story.id}
                editForm={editForm}
                onStartEdit={() => startEdit(story)}
                onCancelEdit={() => {
                  setEditingId(null);
                  setEditForm({});
                }}
                onSaveEdit={saveEdit}
                onEditChange={setEditForm}
                onDelete={async () => {
                  setAiError(null);
                  try {
                    await deleteStory(story.id);
                  } catch (err) {
                    setAiError(err instanceof Error ? err.message : 'Failed to delete story');
                  }
                }}
                onDrop={() => handleDrop(story.id)}
                onUnassignSku={handleUnassign}
                dragActive={!!dragSkuId}
              />
            ))}

            {/* Unassigned SKUs pool */}
            {skus.length > 0 && (
              <div className="mt-10">
                <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30 mb-3">
                  {t.marketingPage.unassignedSkus} ({unassignedSkus.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {unassignedSkus.map((sku) => (
                    <div
                      key={sku.id}
                      draggable
                      onDragStart={() => setDragSkuId(sku.id)}
                      onDragEnd={() => setDragSkuId(null)}
                      className="flex items-center gap-1.5 bg-white border border-carbon/[0.06] px-3 py-1.5 text-xs font-light text-carbon/70 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
                    >
                      <GripVertical className="h-3 w-3 text-carbon/20" />
                      {sku.name}
                      <span className="text-[10px] text-carbon/30 ml-1">{sku.family}</span>
                    </div>
                  ))}
                  {unassignedSkus.length === 0 && (
                    <p className="text-xs text-carbon/20">{t.marketingPage.allSkusAssigned}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: ASISTIDO ─── */}
        {activeTab === 'asistido' && (
          <div className="space-y-6">
            <p className="text-sm font-light text-carbon/50">
              {t.marketingPage.assistedDesc}
            </p>
            <textarea
              value={userDirection}
              onChange={(e) => setUserDirection(e.target.value)}
              placeholder={t.marketingPage.assistedPlaceholder}
              className="w-full h-32 bg-white border border-carbon/[0.06] px-4 py-3 text-sm font-light text-carbon placeholder:text-carbon/25 focus:outline-none focus:border-carbon/20 resize-none"
            />
            <button
              onClick={() => generateStories('assist')}
              disabled={aiLoading || !userDirection.trim()}
              className="flex items-center gap-2 bg-carbon text-white px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] hover:bg-carbon/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {aiLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {t.marketingPage.generateWithDirection}
            </button>

            {aiError && (
              <div className="border border-red-500/20 bg-red-500/[0.04] px-4 py-3 flex items-start justify-between gap-3">
                <div className="text-sm font-light text-red-700 break-words">
                  {aiError}
                </div>
                <button
                  onClick={() => setAiError(null)}
                  className="text-red-500/60 hover:text-red-700 text-xs uppercase tracking-wider flex-shrink-0"
                >
                  ×
                </button>
              </div>
            )}

            {/* AI drafts preview (editable) */}
            {aiDrafts && (
              <AiDraftsPreview
                drafts={aiDrafts}
                skus={skus}
                onUpdate={setAiDrafts}
                onConfirm={confirmAiDrafts}
                onDiscard={() => setAiDrafts(null)}
              />
            )}
          </div>
        )}

        {/* ─── TAB: PROPUESTA IA ─── */}
        {activeTab === 'propuesta' && (
          <div className="space-y-6">
            <p className="text-sm font-light text-carbon/50">
              {t.marketingPage.proposalDesc}
            </p>

            {/* B3 — optional consumer voice signals */}
            <div className="space-y-2">
              <label className="text-[10px] font-medium tracking-[-0.01em] uppercase text-carbon/30">
                {t.marketingPage.consumerSignalsLabel}
              </label>
              <textarea
                value={consumerSignalsText}
                onChange={(e) => setConsumerSignalsText(e.target.value)}
                placeholder={t.marketingPage.consumerSignalsPlaceholder}
                className="w-full h-24 bg-white border border-carbon/[0.06] px-4 py-3 text-sm font-light text-carbon placeholder:text-carbon/25 focus:outline-none focus:border-carbon/20 resize-none"
              />
              <p className="text-[10px] font-light text-carbon/40">
                {t.marketingPage.consumerSignalsHelp}
              </p>
            </div>

            <button
              onClick={() => generateStories('generate')}
              disabled={aiLoading}
              className="flex items-center gap-2 bg-carbon text-white px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] hover:bg-carbon/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {aiLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {t.marketingPage.generateAiProposal}
            </button>

            {aiError && (
              <div className="border border-red-500/20 bg-red-500/[0.04] px-4 py-3 flex items-start justify-between gap-3">
                <div className="text-sm font-light text-red-700 break-words">
                  {aiError}
                </div>
                <button
                  onClick={() => setAiError(null)}
                  className="text-red-500/60 hover:text-red-700 text-xs uppercase tracking-wider flex-shrink-0"
                >
                  ×
                </button>
              </div>
            )}

            {aiDrafts && (
              <AiDraftsPreview
                drafts={aiDrafts}
                skus={skus}
                onUpdate={setAiDrafts}
                onConfirm={confirmAiDrafts}
                onDiscard={() => setAiDrafts(null)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════ */

/* ── Story Row (manual mode) ── */

function StoryRow({
  story,
  skus,
  editing,
  editForm,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditChange,
  onDelete,
  onDrop,
  onUnassignSku,
  dragActive,
}: {
  story: Story;
  skus: SKU[];
  editing: boolean;
  editForm: Partial<Story>;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditChange: (form: Partial<Story>) => void;
  onDelete: () => void;
  onDrop: () => void;
  onUnassignSku: (skuId: string) => void;
  dragActive: boolean;
}) {
  const t = useTranslation();
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onDrop();
      }}
      className={`bg-white border p-6 transition-all ${
        dragOver
          ? 'border-carbon/40 shadow-md'
          : dragActive
          ? 'border-dashed border-carbon/20'
          : 'border-carbon/[0.06]'
      }`}
    >
      {editing ? (
        /* Edit mode */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <input
              value={editForm.name ?? ''}
              onChange={(e) => onEditChange({ ...editForm, name: e.target.value })}
              className="text-xl font-light text-carbon tracking-tight bg-transparent border-b border-carbon/10 focus:border-carbon/30 outline-none w-full mr-4"
              placeholder={t.marketingPage.storyNamePlaceholder}
            />
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={onSaveEdit} className="p-1.5 text-carbon/60 hover:text-carbon">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={onCancelEdit} className="p-1.5 text-carbon/30 hover:text-carbon/60">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <textarea
            value={editForm.narrative ?? ''}
            onChange={(e) => onEditChange({ ...editForm, narrative: e.target.value })}
            className="w-full h-20 text-sm font-light text-carbon/70 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none focus:border-carbon/20 resize-none"
            placeholder={t.marketingPage.narrativePlaceholder}
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              value={(editForm.mood ?? []).join(', ')}
              onChange={(e) =>
                onEditChange({
                  ...editForm,
                  mood: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
              className="text-xs font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none focus:border-carbon/20"
              placeholder={t.marketingPage.moodPlaceholder}
            />
            <input
              value={editForm.tone ?? ''}
              onChange={(e) => onEditChange({ ...editForm, tone: e.target.value })}
              className="text-xs font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none focus:border-carbon/20"
              placeholder={t.marketingPage.tonePlaceholder}
            />
          </div>
          <input
            value={editForm.content_direction ?? ''}
            onChange={(e) => onEditChange({ ...editForm, content_direction: e.target.value })}
            className="w-full text-xs font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none focus:border-carbon/20"
            placeholder={t.marketingPage.contentDirectionPlaceholder}
          />
        </div>
      ) : (
        /* View mode */
        <div>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="text-lg font-light text-carbon tracking-tight">{story.name}</h4>
              {story.narrative && (
                <p className="text-sm font-light text-carbon/50 mt-1 leading-relaxed max-w-3xl">
                  {story.narrative}
                </p>
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0 ml-4">
              <button
                onClick={onStartEdit}
                className="p-1.5 text-carbon/25 hover:text-carbon/60 transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 text-carbon/25 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Mood / Tone / Direction chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {story.mood?.map((m) => (
              <span key={m} className="text-[10px] tracking-[0.05em] uppercase bg-carbon/[0.04] text-carbon/40 px-2 py-0.5">
                {m}
              </span>
            ))}
            {story.tone && (
              <span className="text-[10px] tracking-[0.05em] italic text-carbon/30">
                {story.tone}
              </span>
            )}
          </div>

          {/* Assigned SKUs */}
          <div className="flex flex-wrap gap-1.5">
            {skus.map((sku) => (
              <div
                key={sku.id}
                className="flex items-center gap-1 bg-carbon/[0.03] border border-carbon/[0.06] px-2 py-1 text-[11px] font-light text-carbon/60 group/sku"
              >
                {(sku as SKU & { story_id?: string }).story_id === story.hero_sku_id && (
                  <Star className="h-3 w-3 text-carbon/30" />
                )}
                {sku.name}
                <button
                  onClick={() => onUnassignSku(sku.id)}
                  className="ml-1 opacity-0 group-hover/sku:opacity-100 text-carbon/30 hover:text-red-400 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {skus.length === 0 && (
              <p className="text-[11px] text-carbon/20 italic">
                {t.marketingPage.dragSkusHere}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── AI Drafts Preview (editable before confirming) ── */

function AiDraftsPreview({
  drafts,
  skus,
  onUpdate,
  onConfirm,
  onDiscard,
}: {
  drafts: AiResult;
  skus: SKU[];
  onUpdate: (d: AiResult) => void;
  onConfirm: () => void;
  onDiscard: () => void;
}) {
  const t = useTranslation();

  const updateDraft = (index: number, field: keyof AiStoryDraft, value: unknown) => {
    const updated = { ...drafts };
    updated.stories = [...updated.stories];
    updated.stories[index] = { ...updated.stories[index], [field]: value };
    onUpdate(updated);
  };

  const skuName = useCallback(
    (id: string) => skus.find((s) => s.id === id)?.name ?? id.slice(0, 8),
    [skus]
  );

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-[-0.01em] uppercase text-carbon/40">
          {t.marketingPage.aiProposalReview}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onDiscard}
            className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] border border-carbon/[0.06] text-carbon/50 hover:text-carbon/80 transition-colors"
          >
            {t.marketingPage.discard}
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] bg-carbon text-white hover:bg-carbon/90 transition-colors"
          >
            <Check className="h-3.5 w-3.5" /> {t.marketingPage.confirmAndSave}
          </button>
        </div>
      </div>

      {drafts.rationale && (
        <div className="bg-carbon/[0.02] border border-carbon/[0.06] p-4">
          <p className="text-[10px] font-medium tracking-[-0.01em] uppercase text-carbon/30 mb-1">
            {t.marketingPage.aiRationale}
          </p>
          <p className="text-sm font-light text-carbon/60 leading-relaxed">
            {drafts.rationale}
          </p>
        </div>
      )}

      {drafts.stories.map((draft, i) => (
        <div key={i} className="bg-white border border-carbon/[0.06] p-6 space-y-3">
          <input
            value={draft.name}
            onChange={(e) => updateDraft(i, 'name', e.target.value)}
            className="text-lg font-light text-carbon tracking-tight bg-transparent border-b border-carbon/10 focus:border-carbon/30 outline-none w-full"
          />
          <textarea
            value={draft.narrative}
            onChange={(e) => updateDraft(i, 'narrative', e.target.value)}
            className="w-full h-16 text-sm font-light text-carbon/60 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none focus:border-carbon/20 resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={draft.mood.join(', ')}
              onChange={(e) =>
                updateDraft(
                  i,
                  'mood',
                  e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                )
              }
              className="text-xs font-light text-carbon/50 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none"
              placeholder={t.marketingPage.moodSeparated}
            />
            <input
              value={draft.tone}
              onChange={(e) => updateDraft(i, 'tone', e.target.value)}
              className="text-xs font-light text-carbon/50 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none"
              placeholder={t.marketingPage.tonePlaceholder}
            />
          </div>
          <input
            value={
              typeof draft.content_direction === 'string'
                ? draft.content_direction
                : [
                    draft.content_direction?.setting,
                    draft.content_direction?.lighting,
                    draft.content_direction?.styling,
                    draft.content_direction?.model_attitude,
                    draft.content_direction?.camera_approach,
                  ]
                    .filter(Boolean)
                    .join(' · ')
            }
            onChange={(e) => updateDraft(i, 'content_direction', e.target.value)}
            className="w-full text-xs font-light text-carbon/50 bg-transparent border border-carbon/[0.06] px-3 py-2 focus:outline-none"
            placeholder={t.marketingPage.contentDirection}
          />
          {/* SKU assignments */}
          <div>
            <p className="text-[10px] font-medium tracking-[-0.01em] uppercase text-carbon/25 mb-1.5">
              {t.marketingPage.assignedSkus} ({draft.sku_ids.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {draft.sku_ids.map((id) => (
                <span
                  key={id}
                  className="text-[10px] bg-carbon/[0.04] text-carbon/50 px-2 py-0.5"
                >
                  {skuName(id)}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
