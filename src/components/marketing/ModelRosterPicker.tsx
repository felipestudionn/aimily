'use client';

import { useState } from 'react';
import { useAimilyModels } from '@/hooks/useAimilyModels';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface ModelRosterPickerProps {
  selectedModelId: string | null;
  onSelect: (modelId: string | null) => void;
}

type FamilySlug = 'sophisticated' | 'strong';

export function ModelRosterPicker({ selectedModelId, onSelect }: ModelRosterPickerProps) {
  const t = useTranslation();
  const [familyTab, setFamilyTab] = useState<FamilySlug>('sophisticated');
  const [genderTab, setGenderTab] = useState<'female' | 'male'>('female');
  const { models, loading } = useAimilyModels(genderTab, familyTab);

  const familyLabel = (slug: FamilySlug) => {
    if (slug === 'sophisticated') return t.marketingPage.modelFamilySophisticated || 'Sophisticated';
    return t.marketingPage.modelFamilyStrong || 'Strong';
  };

  return (
    <div>
      {/* Family + Gender tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mr-2">
            {t.marketingPage.selectModel || 'Select Model'}
          </p>
          {(['female', 'male'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGenderTab(g)}
              className={`px-3 py-1 text-[10px] font-medium uppercase tracking-[0.1em] border transition-colors ${
                genderTab === g
                  ? 'bg-carbon text-white border-carbon'
                  : 'bg-white text-carbon/50 border-carbon/[0.06] hover:text-carbon/80'
              }`}
            >
              {g === 'female' ? (t.marketingPage.modelFemale || 'Women') : (t.marketingPage.modelMale || 'Men')}
            </button>
          ))}
        </div>

        {/* Mood family selector — Sophisticated vs Strong */}
        <div className="inline-flex items-center bg-carbon/[0.04] rounded-full p-0.5">
          {(['sophisticated', 'strong'] as FamilySlug[]).map((slug) => (
            <button
              key={slug}
              onClick={() => setFamilyTab(slug)}
              className={`px-3.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] rounded-full transition-colors ${
                familyTab === slug
                  ? 'bg-white text-carbon shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                  : 'text-carbon/50 hover:text-carbon/80'
              }`}
            >
              {familyLabel(slug)}
            </button>
          ))}
        </div>
      </div>

      {/* Model grid */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-carbon/30" />
        </div>
      ) : (
        <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => onSelect(selectedModelId === model.id ? null : model.id)}
              className={`relative group transition-all ${
                selectedModelId === model.id
                  ? 'ring-2 ring-carbon ring-offset-1'
                  : 'hover:ring-1 hover:ring-carbon/20'
              }`}
            >
              <div className="aspect-square overflow-hidden bg-carbon/[0.03]">
                <img
                  src={model.headshot_url}
                  alt={model.name}
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              </div>
              <p className={`text-[8px] font-medium tracking-[0.08em] uppercase text-center py-0.5 ${
                selectedModelId === model.id ? 'text-carbon' : 'text-carbon/40'
              }`}>
                {model.name}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
