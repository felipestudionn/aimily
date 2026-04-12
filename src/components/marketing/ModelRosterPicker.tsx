'use client';

import { useState } from 'react';
import { useAimilyModels, type AimilyModel } from '@/hooks/useAimilyModels';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface ModelRosterPickerProps {
  selectedModelId: string | null;
  onSelect: (modelId: string | null) => void;
}

export function ModelRosterPicker({ selectedModelId, onSelect }: ModelRosterPickerProps) {
  const t = useTranslation();
  const [genderTab, setGenderTab] = useState<'female' | 'male'>('female');
  const { models, loading } = useAimilyModels(genderTab);

  return (
    <div>
      {/* Gender tabs */}
      <div className="flex items-center gap-2 mb-3">
        <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mr-2">
          {t.marketingPage.selectModel || 'Select Model'}
        </p>
        {(['female', 'male'] as const).map((g) => (
          <button
            key={g}
            onClick={() => setGenderTab(g)}
            className={`px-3 py-1 text-[10px] font-medium uppercase tracking-[0.1em] border transition-colors ${
              genderTab === g
                ? 'bg-carbon text-crema border-carbon'
                : 'bg-white text-carbon/50 border-carbon/[0.06] hover:text-carbon/80'
            }`}
          >
            {g === 'female' ? (t.marketingPage.modelFemale || 'Women') : (t.marketingPage.modelMale || 'Men')}
          </button>
        ))}
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
