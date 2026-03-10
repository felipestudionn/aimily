'use client';

import { useState } from 'react';
import { Plus, X, Star, StarOff } from 'lucide-react';
import type { NamingOption, BrandProfile } from '@/types/brand';

interface Props {
  namingOptions: NamingOption[] | null;
  brandName: string | null;
  tagline: string | null;
  onUpdate: (updates: Partial<BrandProfile>) => void;
}

export function BrandNaming({ namingOptions, brandName, tagline, onUpdate }: Props) {
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
    <div className="bg-white border border-gray-100 p-6 space-y-5">
      <h2 className="font-semibold text-gray-900">Brand Naming & Strategy</h2>

      {/* Brand Name */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Brand Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              onUpdate({ brand_name: e.target.value });
            }}
            placeholder="Your brand name"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Tagline</label>
          <input
            type="text"
            value={tag}
            onChange={(e) => {
              setTag(e.target.value);
              onUpdate({ tagline: e.target.value });
            }}
            placeholder="A short brand tagline"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
          />
        </div>
      </div>

      {/* Naming brainstorm */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Name Options</label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addOption()}
            placeholder="Add a name idea…"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
          />
          <button
            onClick={addOption}
            className="px-3 py-2 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors"
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
                    ? 'bg-teal-50 border-teal-300 text-teal-700'
                    : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                <button onClick={() => selectAsName(opt)} title="Select as brand name">
                  {name === opt.name ? (
                    <Star className="h-3.5 w-3.5 text-teal-500 fill-teal-500" />
                  ) : (
                    <StarOff className="h-3.5 w-3.5 text-gray-300" />
                  )}
                </button>
                <span>{opt.name}</span>
                <button onClick={() => removeOption(i)} className="text-gray-300 hover:text-red-400">
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
