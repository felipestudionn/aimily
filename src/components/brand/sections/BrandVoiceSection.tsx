'use client';

import { useState } from 'react';
import { MessageSquare, Plus, X } from 'lucide-react';
import type { BrandProfile, BrandVoice } from '@/types/brand';
import { useTranslation } from '@/i18n';

interface Props {
  voice: BrandVoice | null;
  onUpdate: (updates: Partial<BrandProfile>) => void;
}

const EMPTY_VOICE: BrandVoice = {
  tone: '',
  keywords: [],
  personality: '',
  doNot: [],
};

export function BrandVoiceSection({ voice, onUpdate }: Props) {
  const t = useTranslation();
  const [v, setV] = useState<BrandVoice>(voice || EMPTY_VOICE);
  const [newKeyword, setNewKeyword] = useState('');
  const [newDoNot, setNewDoNot] = useState('');

  const update = (partial: Partial<BrandVoice>) => {
    const updated = { ...v, ...partial };
    setV(updated);
    onUpdate({ brand_voice: updated });
  };

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    update({ keywords: [...v.keywords, newKeyword.trim()] });
    setNewKeyword('');
  };

  const addDoNot = () => {
    if (!newDoNot.trim()) return;
    update({ doNot: [...v.doNot, newDoNot.trim()] });
    setNewDoNot('');
  };

  return (
    <div className="bg-white border border-carbon/[0.06] rounded-[20px] p-6 space-y-5">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-carbon/40" />
        <h2 className="font-light text-carbon tracking-tight">{t.brandPage.voiceTitle}</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-carbon/40 mb-1.5">{t.brandPage.toneLabel}</label>
          <input
            type="text"
            value={v.tone}
            onChange={(e) => update({ tone: e.target.value })}
            placeholder={t.brandPage.tonePlaceholder}
            className="w-full px-3 py-2 rounded-[12px] border border-carbon/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-carbon/40 mb-1.5">{t.brandPage.personalityLabel}</label>
          <input
            type="text"
            value={v.personality}
            onChange={(e) => update({ personality: e.target.value })}
            placeholder={t.brandPage.personalityPlaceholder}
            className="w-full px-3 py-2 rounded-[12px] border border-carbon/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/20"
          />
        </div>
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-xs font-medium text-carbon/40 mb-2">{t.brandPage.brandKeywords}</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
            placeholder={t.brandPage.addKeyword}
            className="flex-1 px-3 py-2 rounded-[12px] border border-carbon/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/20"
          />
          <button onClick={addKeyword} className="px-3 py-2 rounded-lg bg-carbon/[0.04] text-carbon/60 hover:bg-carbon/[0.06]">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {v.keywords.map((kw, i) => (
            <span key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-carbon/[0.04] text-carbon/60 text-xs">
              {kw}
              <button onClick={() => update({ keywords: v.keywords.filter((_, j) => j !== i) })}>
                <X className="h-3 w-3 text-carbon/30 hover:text-red-400" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Don'ts */}
      <div>
        <label className="block text-xs font-medium text-carbon/40 mb-2">{t.brandPage.donts}</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newDoNot}
            onChange={(e) => setNewDoNot(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addDoNot()}
            placeholder={t.brandPage.dontsPlaceholder}
            className="flex-1 px-3 py-2 rounded-[12px] border border-carbon/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/20"
          />
          <button onClick={addDoNot} className="px-3 py-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {v.doNot.map((d, i) => (
            <span key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs">
              {d}
              <button onClick={() => update({ doNot: v.doNot.filter((_, j) => j !== i) })}>
                <X className="h-3 w-3 text-red-300 hover:text-red-500" />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
