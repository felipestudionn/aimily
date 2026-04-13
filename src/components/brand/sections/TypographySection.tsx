'use client';

import { useState } from 'react';
import { Type } from 'lucide-react';
import type { BrandProfile, BrandTypography } from '@/types/brand';
import { useTranslation } from '@/i18n';

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
  const tr = useTranslation();
  const [t, setT] = useState<BrandTypography>(typography || EMPTY);

  const update = (partial: Partial<BrandTypography>) => {
    const updated = { ...t, ...partial };
    setT(updated);
    onUpdate({ typography: updated });
  };

  return (
    <div className="bg-white border border-carbon/[0.06] rounded-[20px] p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Type className="h-4 w-4 text-carbon/40" />
        <h2 className="font-light text-carbon tracking-tight">{tr.brandPage.typographyTitle}</h2>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Primary Font */}
        <div className="space-y-3">
          <label className="block text-xs font-medium text-carbon/40">{tr.brandPage.primaryFont}</label>
          <input
            type="text"
            value={t.primary.family}
            onChange={(e) => update({ primary: { ...t.primary, family: e.target.value } })}
            placeholder={tr.brandPage.fontFamily}
            className="w-full px-3 py-2 rounded-[12px] border border-carbon/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/20"
          />
          <select
            value={t.primary.weight}
            onChange={(e) => update({ primary: { ...t.primary, weight: e.target.value } })}
            className="w-full px-3 py-2 rounded-[12px] border border-carbon/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/20"
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
            <div className="p-4 bg-carbon/[0.03]">
              <p className="text-2xl font-bold text-carbon">Aa Bb Cc</p>
              <p className="text-sm text-carbon/40 mt-1">{t.primary.family} · {t.primary.weight}</p>
            </div>
          )}
        </div>

        {/* Secondary Font */}
        <div className="space-y-3">
          <label className="block text-xs font-medium text-carbon/40">{tr.brandPage.secondaryFont}</label>
          <input
            type="text"
            value={t.secondary.family}
            onChange={(e) => update({ secondary: { ...t.secondary, family: e.target.value } })}
            placeholder={tr.brandPage.fontFamily}
            className="w-full px-3 py-2 rounded-[12px] border border-carbon/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/20"
          />
          <select
            value={t.secondary.weight}
            onChange={(e) => update({ secondary: { ...t.secondary, weight: e.target.value } })}
            className="w-full px-3 py-2 rounded-[12px] border border-carbon/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/20"
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
            <div className="p-4 bg-carbon/[0.03]">
              <p className="text-2xl text-carbon">Aa Bb Cc</p>
              <p className="text-sm text-carbon/40 mt-1">{t.secondary.family} · {t.secondary.weight}</p>
            </div>
          )}
        </div>
      </div>

      {/* Font suggestions */}
      <div>
        <label className="block text-xs font-medium text-carbon/30 mb-2">{tr.brandPage.popularChoices}</label>
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
              className="px-2.5 py-1 rounded-md bg-carbon/[0.03] text-xs text-carbon/60 hover:bg-carbon/[0.04] hover:text-carbon/60 transition-colors"
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
