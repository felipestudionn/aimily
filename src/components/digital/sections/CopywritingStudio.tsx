'use client';

import { useState, useMemo } from 'react';
import {
  Sparkles,
  FileText,
  Search as SearchIcon,
  Globe,
  Mail,
  MessageCircle,
  BookOpen,
  Loader2,
  Check,
  X,
  Copy,
  RefreshCw,
  ChevronDown,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { SKU } from '@/hooks/useSkus';
import type { ProductCopy, CopyType, CopywritingSubTab, CopyStatus } from '@/types/digital';
import type { BrandProfile } from '@/types/brand';

const SUB_TABS: { id: CopywritingSubTab; label: string; labelEs: string; icon: React.ElementType; copyType: CopyType }[] = [
  { id: 'product_descriptions', label: 'Product Descriptions', labelEs: 'Descripciones de Producto', icon: FileText, copyType: 'product_description' },
  { id: 'brand_story', label: 'Brand Story', labelEs: 'Historia de Marca', icon: BookOpen, copyType: 'brand_story' },
  { id: 'seo', label: 'SEO', labelEs: 'SEO', icon: SearchIcon, copyType: 'seo_meta' },
  { id: 'emails', label: 'Email Templates', labelEs: 'Plantillas Email', icon: Mail, copyType: 'email_template' },
  { id: 'social', label: 'Social Captions', labelEs: 'Captions Social', icon: MessageCircle, copyType: 'social_caption' },
];

interface CopywritingStudioProps {
  collectionId: string;
  skus: SKU[];
  copies: ProductCopy[];
  brandProfile: BrandProfile | null;
  onAddCopy: (copy: Omit<ProductCopy, 'id' | 'created_at' | 'updated_at'>) => Promise<ProductCopy | null>;
  onUpdateCopy: (id: string, updates: Partial<ProductCopy>) => Promise<ProductCopy | null>;
  onDeleteCopy: (id: string) => Promise<boolean>;
  loading: boolean;
}

export function CopywritingStudio({
  collectionId,
  skus,
  copies,
  brandProfile,
  onAddCopy,
  onUpdateCopy,
  onDeleteCopy,
  loading,
}: CopywritingStudioProps) {
  const [activeSubTab, setActiveSubTab] = useState<CopywritingSubTab>('product_descriptions');
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [extraInstructions, setExtraInstructions] = useState('');
  // Email/social specific
  const [emailType, setEmailType] = useState<'welcome' | 'launch' | 'cart_abandonment' | 'post_purchase'>('launch');
  const [platform, setPlatform] = useState<'instagram' | 'tiktok' | 'pinterest' | 'facebook'>('instagram');

  const currentCopyType = SUB_TABS.find((t) => t.id === activeSubTab)!.copyType;

  const filteredCopies = useMemo(() => {
    let result = copies.filter((c) => c.copy_type === currentCopyType);
    if (selectedSkuId && (currentCopyType === 'product_description' || currentCopyType === 'seo_meta' || currentCopyType === 'social_caption')) {
      result = result.filter((c) => c.sku_id === selectedSkuId);
    }
    return result;
  }, [copies, currentCopyType, selectedSkuId]);

  const selectedSku = skus.find((s) => s.id === selectedSkuId);

  function buildBrandContext() {
    if (!brandProfile) return {};
    return {
      brand_name: brandProfile.brand_name || undefined,
      tagline: brandProfile.tagline || undefined,
      brand_story: brandProfile.brand_story || undefined,
      brand_voice: brandProfile.brand_voice || undefined,
      target_audience: brandProfile.target_audience || undefined,
    };
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const body: Record<string, unknown> = {
        mode: currentCopyType,
        brandContext: buildBrandContext(),
        extraInstructions: extraInstructions.trim() || undefined,
      };

      if (selectedSku) {
        body.skuContext = {
          name: selectedSku.name,
          category: selectedSku.category,
          family: selectedSku.family,
          pvp: selectedSku.pvp,
          notes: selectedSku.notes || undefined,
        };
      }
      if (currentCopyType === 'email_template') body.emailType = emailType;
      if (currentCopyType === 'social_caption') body.platform = platform;

      const res = await fetch('/api/ai/copy/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }

      const { result, model } = await res.json();

      // Build content string from structured result
      let content = '';
      let title = '';
      const metadata: Record<string, unknown> = {};

      if (typeof result === 'object' && result !== null && !('raw' in result)) {
        const r = result as Record<string, unknown>;
        if (currentCopyType === 'product_description') {
          title = (r.headline as string) || selectedSku?.name || 'Product Description';
          content = [r.description, ...(Array.isArray(r.features) ? (r.features as string[]).map((f) => `• ${f}`) : []), r.care ? `\nCare: ${r.care}` : ''].filter(Boolean).join('\n');
        } else if (currentCopyType === 'brand_story') {
          title = 'Brand Story';
          content = [r.narrative, Array.isArray(r.values) ? `\nValues: ${(r.values as string[]).join(', ')}` : '', r.vision ? `\nVision: ${r.vision}` : ''].filter(Boolean).join('\n');
        } else if (currentCopyType === 'seo_meta') {
          title = (r.meta_title as string) || selectedSku?.name || 'SEO Meta';
          content = (r.meta_description as string) || '';
          metadata.seo_title = r.meta_title;
          metadata.alt_text = r.alt_text;
          metadata.keywords = r.keywords;
        } else if (currentCopyType === 'email_template') {
          title = (r.subject_line as string) || `${emailType} Email`;
          content = [r.heading, r.body, r.cta_text ? `\nCTA: ${r.cta_text}` : ''].filter(Boolean).join('\n');
          metadata.subject_line = r.subject_line;
          metadata.preview_text = r.preview_text;
          metadata.email_type = emailType;
        } else if (currentCopyType === 'social_caption') {
          title = `${platform} Caption`;
          content = (r.caption as string) || '';
          metadata.hashtags = r.hashtags;
          metadata.cta = r.cta;
          metadata.platform = platform;
        }
      } else {
        title = currentCopyType.replace('_', ' ');
        content = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      }

      await onAddCopy({
        collection_plan_id: collectionId,
        sku_id: selectedSkuId,
        copy_type: currentCopyType,
        title,
        content,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        status: 'draft',
        model_used: model,
      });
    } catch (err) {
      console.error('Generation error:', err);
      alert(err instanceof Error ? err.message : 'Failed to generate copy');
    } finally {
      setGenerating(false);
    }
  }

  async function handleBulkGenerate() {
    if (skus.length === 0) return;
    setGenerating(true);
    try {
      for (const sku of skus) {
        const existing = copies.find((c) => c.copy_type === currentCopyType && c.sku_id === sku.id);
        if (existing) continue;

        const body = {
          mode: currentCopyType,
          brandContext: buildBrandContext(),
          skuContext: { name: sku.name, category: sku.category, family: sku.family, pvp: sku.pvp, notes: sku.notes },
          extraInstructions: extraInstructions.trim() || undefined,
          platform: currentCopyType === 'social_caption' ? platform : undefined,
        };

        const res = await fetch('/api/ai/copy/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) continue;
        const { result, model } = await res.json();

        let content = '';
        let title = sku.name;
        const metadata: Record<string, unknown> = {};

        if (typeof result === 'object' && result !== null && !('raw' in result)) {
          const r = result as Record<string, unknown>;
          if (currentCopyType === 'product_description') {
            title = (r.headline as string) || sku.name;
            content = [r.description, ...(Array.isArray(r.features) ? (r.features as string[]).map((f) => `• ${f}`) : []), r.care ? `\nCare: ${r.care}` : ''].filter(Boolean).join('\n');
          } else if (currentCopyType === 'seo_meta') {
            title = (r.meta_title as string) || sku.name;
            content = (r.meta_description as string) || '';
            metadata.seo_title = r.meta_title;
            metadata.alt_text = r.alt_text;
            metadata.keywords = r.keywords;
          } else if (currentCopyType === 'social_caption') {
            title = `${platform} — ${sku.name}`;
            content = (r.caption as string) || '';
            metadata.hashtags = r.hashtags;
            metadata.platform = platform;
          }
        } else {
          content = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        }

        await onAddCopy({
          collection_plan_id: collectionId,
          sku_id: sku.id,
          copy_type: currentCopyType,
          title,
          content,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
          status: 'draft',
          model_used: model,
        });
      }
    } finally {
      setGenerating(false);
    }
  }

  function startEdit(copy: ProductCopy) {
    setEditingId(copy.id);
    setEditContent(copy.content);
  }

  async function saveEdit(id: string) {
    await onUpdateCopy(id, { content: editContent });
    setEditingId(null);
    setEditContent('');
  }

  const needsSkuSelector = ['product_descriptions', 'seo', 'social'].includes(activeSubTab);
  const canBulkGenerate = needsSkuSelector && ['product_descriptions', 'seo', 'social'].includes(activeSubTab);

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 overflow-x-auto">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const count = copies.filter((c) => c.copy_type === tab.copyType).length;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveSubTab(tab.id); setSelectedSkuId(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeSubTab === tab.id
                  ? 'bg-white shadow-sm text-purple-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full text-xs">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Brand context warning */}
      {!brandProfile?.brand_name && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          Set up your brand profile in the Brand module for better AI-generated copy.
        </div>
      )}

      {/* SKU selector (for per-product copy types) */}
      {needsSkuSelector && (
        <div className="flex items-center gap-3">
          <select
            value={selectedSkuId || ''}
            onChange={(e) => setSelectedSkuId(e.target.value || null)}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All products</option>
            {skus.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
            ))}
          </select>
        </div>
      )}

      {/* Email type / Platform selector */}
      {activeSubTab === 'emails' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Template:</span>
          {(['welcome', 'launch', 'cart_abandonment', 'post_purchase'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setEmailType(t)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                emailType === t ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}
      {activeSubTab === 'social' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Platform:</span>
          {(['instagram', 'tiktok', 'pinterest', 'facebook'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium capitalize transition-colors ${
                platform === p ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Extra instructions */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Extra instructions for AI (optional)..."
          value={extraInstructions}
          onChange={(e) => setExtraInstructions(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Generate buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleGenerate}
          disabled={generating || (needsSkuSelector && !selectedSkuId && activeSubTab !== 'social')}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-medium hover:from-purple-700 hover:to-violet-700 disabled:opacity-50 transition-all shadow-sm"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate{activeSubTab === 'brand_story' ? ' Story' : activeSubTab === 'emails' ? ' Email' : ''}
        </button>
        {canBulkGenerate && (
          <button
            onClick={handleBulkGenerate}
            disabled={generating || skus.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-purple-200 text-purple-700 text-sm font-medium hover:bg-purple-50 disabled:opacity-50 transition-all"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Bulk Generate All SKUs
          </button>
        )}
      </div>

      {/* Copy list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      ) : filteredCopies.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No copy generated yet. Click &quot;Generate&quot; to start.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCopies.map((copy) => {
            const sku = skus.find((s) => s.id === copy.sku_id);
            const isEditing = editingId === copy.id;

            return (
              <div key={copy.id} className="bg-white border border-gray-200 p-4 space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-900">{copy.title}</h4>
                    {sku && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{sku.name}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      copy.status === 'approved' ? 'bg-green-50 text-green-700' :
                      copy.status === 'rejected' ? 'bg-red-50 text-red-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {copy.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {copy.model_used && (
                      <span className="text-xs text-gray-400 mr-2">{copy.model_used}</span>
                    )}
                    <button
                      onClick={() => navigator.clipboard.writeText(copy.content)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                      title="Copy to clipboard"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    {copy.status !== 'approved' && (
                      <button
                        onClick={() => onUpdateCopy(copy.id, { status: 'approved' })}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                        title="Approve"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteCopy(copy.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[120px] resize-y"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveEdit(copy.id)}
                        className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    className="text-sm text-gray-700 whitespace-pre-wrap cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                    onClick={() => startEdit(copy)}
                  >
                    {copy.content}
                  </p>
                )}

                {/* Metadata pills */}
                {copy.metadata && (() => {
                  const md = copy.metadata as Record<string, unknown>;
                  return (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {typeof md.seo_title === 'string' && (
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">Title: {md.seo_title}</span>
                      )}
                      {typeof md.alt_text === 'string' && (
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">Alt: {md.alt_text.slice(0, 40)}...</span>
                      )}
                      {Array.isArray(md.hashtags) && (
                        <span className="text-xs px-2 py-0.5 bg-pink-50 text-pink-600 rounded-full">
                          {(md.hashtags as string[]).length} hashtags
                        </span>
                      )}
                      {typeof md.subject_line === 'string' && (
                        <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full">Subject: {md.subject_line}</span>
                      )}
                      {typeof md.platform === 'string' && (
                        <span className="text-xs px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full capitalize">{md.platform}</span>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
