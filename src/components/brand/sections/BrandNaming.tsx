'use client';

import { useState } from 'react';
import { Plus, X, Star, StarOff } from 'lucide-react';
import type { NamingOption, BrandProfile } from '@/types/brand';
import { useTranslation } from '@/i18n';

interface Props {
  namingOptions: NamingOption[] | null;
  brandName: string | null;
  tagline: string | null;
  onUpdate: (updates: Partial<BrandProfile>) => void;
}

export function BrandNaming({ namingOptions, brandName, tagline, onUpdate }: Props) {
  const t = useTranslation();
  const [options, setOptions] = useState<NamingOption[]>(namingOptions || []);
  const [newName, setNewName] = useState('');
  const [name, setName] = useState(brandName || '');
  const [tag, setTag] = useState(tagline || '');

  const addOption = () => {
    if (!newName.trim()) return;
    const updated = [...options, { name: newName.trim(), available: true, notes: '' }];
    setOptions(updated);
    setNewName('');
    onUpdate({ naming_options: updated });
  };

  const removeOption = (idx: number) => {
    const updated = options.filter((_, i) => i !== idx);
    setOptions(updated);
    onUpdate({ naming_options: updated });
  };

  const selectAsName = (opt: NamingOption) => {
    setName(opt.name);
    onUpdate({ brand_name: opt.name });
  };

  return (
    <div className="bg-white border border-carbon/[0.06] p-6 space-y-5">
      <h2 className="font-light text-carbon tracking-tight">{t.brandPage.namingTitle}</h2>

      {/* Brand Name */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-carbon/40 mb-1.5">{t.brandPage.brandNameLabel}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              onUpdate({ brand_name: e.target.value });
            }}
            placeholder={t.brandPage.brandNamePlaceholder}
            className="w-full px-3 py-2 rounded-lg border border-carbon/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-carbon/40 mb-1.5">{t.brandPage.taglineLabel}</label>
          <input
            type="text"
            value={tag}
            onChange={(e) => {
              setTag(e.target.value);
              onUpdate({ tagline: e.target.value });
            }}
            placeholder={t.brandPage.taglinePlaceholder}
            className="w-full px-3 py-2 rounded-lg border border-carbon/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/20"
          />
        </div>
      </div>

      {/* Naming brainstorm */}
      <div>
        <label className="block text-xs font-medium text-carbon/40 mb-2">{t.brandPage.nameOptions}</label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addOption()}
            placeholder={t.brandPage.addNameIdea}
            className="flex-1 px-3 py-2 rounded-lg border border-carbon/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/20"
          />
          <button
            onClick={addOption}
            className="px-3 py-2 rounded-lg bg-carbon/[0.04] text-carbon/60 hover:bg-carbon/[0.06] transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {options.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {options.map((opt, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm ${
                  name === opt.name
                    ? 'bg-carbon/[0.04] border-carbon/[0.12] text-carbon/70'
                    : 'bg-carbon/[0.03] border-carbon/[0.08] text-carbon/70'
                }`}
              >
                <button onClick={() => selectAsName(opt)} title={t.brandPage.selectAsBrandName}>
                  {name === opt.name ? (
                    <Star className="h-3.5 w-3.5 text-carbon/40 fill-carbon/40" />
                  ) : (
                    <StarOff className="h-3.5 w-3.5 text-carbon/20" />
                  )}
                </button>
                <span>{opt.name}</span>
                <button onClick={() => removeOption(i)} className="text-carbon/20 hover:text-red-400">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
