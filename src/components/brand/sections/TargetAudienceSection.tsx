'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import type { BrandProfile, TargetAudience } from '@/types/brand';
import { useTranslation } from '@/i18n';

interface Props {
  audience: TargetAudience | null;
  onUpdate: (updates: Partial<BrandProfile>) => void;
}

const EMPTY: TargetAudience = { demographics: '', psychographics: '', lifestyle: '' };

export function TargetAudienceSection({ audience, onUpdate }: Props) {
  const t = useTranslation();
  const [a, setA] = useState<TargetAudience>(audience || EMPTY);

  const update = (partial: Partial<TargetAudience>) => {
    const updated = { ...a, ...partial };
    setA(updated);
    onUpdate({ target_audience: updated });
  };

  return (
    <div className="bg-white border border-gray-100 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-teal-500" />
        <h2 className="font-semibold text-gray-900">{t.brandPage.audienceTitle}</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.brandPage.demographicsLabel}</label>
          <textarea
            value={a.demographics}
            onChange={(e) => update({ demographics: e.target.value })}
            rows={2}
            placeholder={t.brandPage.demographicsPlaceholder}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.brandPage.psychographicsLabel}</label>
          <textarea
            value={a.psychographics}
            onChange={(e) => update({ psychographics: e.target.value })}
            rows={2}
            placeholder={t.brandPage.psychographicsPlaceholder}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.brandPage.lifestyleLabel}</label>
          <textarea
            value={a.lifestyle}
            onChange={(e) => update({ lifestyle: e.target.value })}
            rows={2}
            placeholder={t.brandPage.lifestylePlaceholder}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
          />
        </div>
      </div>
    </div>
  );
}
