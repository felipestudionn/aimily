'use client';

import { useState } from 'react';
import { Type } from 'lucide-react';
import type { BrandProfile, BrandTypography } from '@/types/brand';

interface Props {
  typography: BrandTypography | null;
  onUpdate: (updates: Partial<BrandProfile>) => void;
}

const EMPTY: BrandTypography = {
  primary: { family: '', weight: '400' },
  secondary: { family: '', weight: '400' },
};

const POPULAR_FONTS = [
  'Inter', 'Poppins', 'Montserrat', 'Playfair Display', 'DM Sans',
  'Space Grotesk', 'Lora', 'Raleway', 'Oswald', 'Roboto',
  'Bebas Neue', 'Archivo', 'Outfit', 'Sora', 'Clash Display',
];

export function TypographySection({ typography, onUpdate }: Props) {
  const [t, setT] = useState<BrandTypography>(typography || EMPTY);

  const update = (partial: Partial<BrandTypography>) => {
    const updated = { ...t, ...partial };
    setT(updated);
    onUpdate({ typography: updated });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Type className="h-4 w-4 text-teal-500" />
        <h2 className="font-semibold text-gray-900">Typography</h2>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Primary Font */}
        <div className="space-y-3">
          <label className="block text-xs font-medium text-gray-500">Primary Font (Headings)</label>
          <input
            type="text"
            value={t.primary.family}
            onChange={(e) => update({ primary: { ...t.primary, family: e.target.value } })}
            placeholder="Font family"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
          />
          <select
            value={t.primary.weight}
            onChange={(e) => update({ primary: { ...t.primary, weight: e.target.value } })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
          >
            <option value="300">Light (300)</option>
            <option value="400">Regular (400)</option>
            <option value="500">Medium (500)</option>
            <option value="600">Semi-Bold (600)</option>
            <option value="700">Bold (700)</option>
            <option value="800">Extra-Bold (800)</option>
            <option value="900">Black (900)</option>
          </select>
          {t.primary.family && (
            <div className="p-4 rounded-xl bg-gray-50">
              <p className="text-2xl font-bold text-gray-900">Aa Bb Cc</p>
              <p className="text-sm text-gray-500 mt-1">{t.primary.family} · {t.primary.weight}</p>
            </div>
          )}
        </div>

        {/* Secondary Font */}
        <div className="space-y-3">
          <label className="block text-xs font-medium text-gray-500">Secondary Font (Body)</label>
          <input
            type="text"
            value={t.secondary.family}
            onChange={(e) => update({ secondary: { ...t.secondary, family: e.target.value } })}
            placeholder="Font family"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
          />
          <select
            value={t.secondary.weight}
            onChange={(e) => update({ secondary: { ...t.secondary, weight: e.target.value } })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
          >
            <option value="300">Light (300)</option>
            <option value="400">Regular (400)</option>
            <option value="500">Medium (500)</option>
            <option value="600">Semi-Bold (600)</option>
            <option value="700">Bold (700)</option>
            <option value="800">Extra-Bold (800)</option>
            <option value="900">Black (900)</option>
          </select>
          {t.secondary.family && (
            <div className="p-4 rounded-xl bg-gray-50">
              <p className="text-2xl text-gray-900">Aa Bb Cc</p>
              <p className="text-sm text-gray-500 mt-1">{t.secondary.family} · {t.secondary.weight}</p>
            </div>
          )}
        </div>
      </div>

      {/* Font suggestions */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2">Popular choices</label>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_FONTS.map((f) => (
            <button
              key={f}
              onClick={() => {
                if (!t.primary.family) {
                  update({ primary: { ...t.primary, family: f } });
                } else if (!t.secondary.family) {
                  update({ secondary: { ...t.secondary, family: f } });
                }
              }}
              className="px-2.5 py-1 rounded-md bg-gray-50 text-xs text-gray-600 hover:bg-teal-50 hover:text-teal-600 transition-colors"
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
