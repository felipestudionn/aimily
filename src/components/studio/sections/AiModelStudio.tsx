'use client';

import { useState } from 'react';
import {
  Users,
  Plus,
  Loader2,
  Trash2,
  Sparkles,
  X,
} from 'lucide-react';
import type { BrandModel, ModelGender } from '@/types/studio';

const GENDER_OPTIONS: { id: ModelGender; label: string }[] = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'non-binary', label: 'Non-Binary' },
];

const STYLE_VIBES = [
  'Editorial', 'Streetwear', 'Classic', 'Minimalist', 'Avant-Garde',
  'Sporty', 'Bohemian', 'Luxury', 'Casual', 'Urban',
];

interface AiModelStudioProps {
  collectionId: string;
  models: BrandModel[];
  onAddModel: (model: Partial<BrandModel>) => Promise<BrandModel | null>;
  onUpdateModel: (id: string, updates: Partial<BrandModel>) => Promise<BrandModel | null>;
  onDeleteModel: (id: string) => Promise<boolean>;
}

export function AiModelStudio({
  collectionId,
  models,
  onAddModel,
  onUpdateModel,
  onDeleteModel,
}: AiModelStudioProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    gender: 'female' as ModelGender,
    age_range: '20-30',
    ethnicity: '',
    body_type: '',
    hair_description: '',
    style_vibe: 'Editorial',
    reference_image_url: '',
  });

  const handleCreate = async () => {
    if (!form.name) return;
    setCreating(true);
    try {
      await onAddModel(form);
      setForm({
        name: '',
        gender: 'female',
        age_range: '20-30',
        ethnicity: '',
        body_type: '',
        hair_description: '',
        style_vibe: 'Editorial',
        reference_image_url: '',
      });
      setShowCreateForm(false);
    } finally {
      setCreating(false);
    }
  };

  const handleGeneratePreview = async (model: BrandModel) => {
    if (!model.reference_image_url) return;
    setGenerating(model.id);
    try {
      const res = await fetch('/api/ai/fal/model-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference_image_url: model.reference_image_url,
          gender: model.gender,
          age_range: model.age_range,
          ethnicity: model.ethnicity,
          body_type: model.body_type,
          style_vibe: model.style_vibe,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const result = await res.json();
      const previews = (result.images || []).map((img: { url: string }) => ({
        url: img.url,
        pose: 'generated',
      }));

      await onUpdateModel(model.id, {
        preview_images: [...(model.preview_images || []), ...previews],
      });
    } catch (err) {
      console.error('Preview generation failed:', err);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Brand AI Models</h3>
          <p className="text-sm text-gray-500">Create persistent virtual models for visual consistency</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Model
        </button>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="bg-white rounded-xl border border-purple-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900">Create New AI Model</h4>
            <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Model Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Main Female Model"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
              <div className="flex gap-2">
                {GENDER_OPTIONS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setForm({ ...form, gender: g.id })}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      form.gender === g.id
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-gray-50 text-gray-600 border border-transparent hover:bg-gray-100'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Age Range</label>
              <input
                value={form.age_range}
                onChange={(e) => setForm({ ...form, age_range: e.target.value })}
                placeholder="e.g., 20-30"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ethnicity</label>
              <input
                value={form.ethnicity}
                onChange={(e) => setForm({ ...form, ethnicity: e.target.value })}
                placeholder="e.g., Latin, Asian, European..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Body Type</label>
              <input
                value={form.body_type}
                onChange={(e) => setForm({ ...form, body_type: e.target.value })}
                placeholder="e.g., Athletic, Slim, Curvy..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hair</label>
              <input
                value={form.hair_description}
                onChange={(e) => setForm({ ...form, hair_description: e.target.value })}
                placeholder="e.g., Long dark wavy hair"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Style Vibe</label>
              <div className="flex flex-wrap gap-1.5">
                {STYLE_VIBES.map((v) => (
                  <button
                    key={v}
                    onClick={() => setForm({ ...form, style_vibe: v })}
                    className={`px-2 py-1 rounded text-xs transition-all ${
                      form.style_vibe === v
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reference Image URL</label>
              <input
                value={form.reference_image_url}
                onChange={(e) => setForm({ ...form, reference_image_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!form.name || creating}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Model
            </button>
          </div>
        </div>
      )}

      {/* Models Grid */}
      {models.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">No AI models yet</p>
          <p className="text-xs text-gray-400 mt-1">Create your first brand model for consistent visuals</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {models.map((model) => (
            <div key={model.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden group">
              {/* Preview */}
              {model.preview_images && model.preview_images.length > 0 ? (
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={model.preview_images[0].url}
                    alt={model.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : model.reference_image_url ? (
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={model.reference_image_url}
                    alt={model.name}
                    className="w-full h-full object-cover opacity-60"
                  />
                </div>
              ) : (
                <div className="aspect-[3/4] bg-gray-50 flex items-center justify-center">
                  <Users className="h-8 w-8 text-gray-300" />
                </div>
              )}

              {/* Info */}
              <div className="p-4">
                <h4 className="font-semibold text-sm text-gray-900">{model.name}</h4>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {model.gender && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                      {model.gender}
                    </span>
                  )}
                  {model.age_range && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                      {model.age_range}
                    </span>
                  )}
                  {model.style_vibe && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                      {model.style_vibe}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleGeneratePreview(model)}
                    disabled={generating === model.id || !model.reference_image_url}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors disabled:opacity-50"
                  >
                    {generating === model.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Generate Preview
                  </button>
                  <button
                    onClick={() => onDeleteModel(model.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
