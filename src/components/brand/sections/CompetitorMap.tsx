'use client';

import { useState } from 'react';
import { Swords, Plus, Trash2 } from 'lucide-react';
import type { BrandProfile, Competitor } from '@/types/brand';
import { useTranslation } from '@/i18n';

interface Props {
  competitors: Competitor[] | null;
  onUpdate: (updates: Partial<BrandProfile>) => void;
}

export function CompetitorMap({ competitors, onUpdate }: Props) {
  const t = useTranslation();
  const [list, setList] = useState<Competitor[]>(competitors || []);

  const add = () => {
    const updated = [...list, { name: '', positioning: '', priceRange: '' }];
    setList(updated);
    onUpdate({ competitors: updated });
  };

  const remove = (idx: number) => {
    const updated = list.filter((_, i) => i !== idx);
    setList(updated);
    onUpdate({ competitors: updated });
  };

  const updateItem = (idx: number, partial: Partial<Competitor>) => {
    const updated = list.map((c, i) => (i === idx ? { ...c, ...partial } : c));
    setList(updated);
    onUpdate({ competitors: updated });
  };

  return (
    <div className="bg-white border border-carbon/[0.06] rounded-[20px] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-carbon/40" />
          <h2 className="font-light text-carbon tracking-tight">{t.brandPage.competitorTitle}</h2>
        </div>
        <button
          onClick={add}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-carbon/[0.04] text-carbon/60 text-xs font-medium hover:bg-carbon/[0.06] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> {t.common.add}
        </button>
      </div>

      {list.length === 0 && (
        <p className="text-sm text-carbon/30 text-center py-4">
          {t.brandPage.noCompetitors}
        </p>
      )}

      <div className="space-y-3">
        {list.map((c, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_140px_32px] gap-3 items-start">
            <input
              type="text"
              value={c.name}
              onChange={(e) => updateItem(i, { name: e.target.value })}
              placeholder={t.brandPage.competitorName}
              className="px-3 py-2 rounded-[12px] border border-carbon/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/20"
            />
            <input
              type="text"
              value={c.positioning}
              onChange={(e) => updateItem(i, { positioning: e.target.value })}
              placeholder={t.brandPage.positioning}
              className="px-3 py-2 rounded-[12px] border border-carbon/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/20"
            />
            <input
              type="text"
              value={c.priceRange}
              onChange={(e) => updateItem(i, { priceRange: e.target.value })}
              placeholder={t.brandPage.priceRange}
              className="px-3 py-2 rounded-[12px] border border-carbon/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/20"
            />
            <button
              onClick={() => remove(i)}
              className="p-2 rounded-lg text-carbon/20 hover:text-red-400 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
