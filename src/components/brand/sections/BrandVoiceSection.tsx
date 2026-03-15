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
    <div className="bg-white border border-gray-100 p-6 space-y-5">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-teal-500" />
        <h2 className="font-semibold text-gray-900">{t.brandPage.voiceTitle}</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.brandPage.toneLabel}</label>
          <input
            type="text"
            value={v.tone}
            onChange={(e) => update({ tone: e.target.value })}
            placeholder={t.brandPage.tonePlaceholder}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.brandPage.personalityLabel}</label>
          <input
            type="text"
            value={v.personality}
            onChange={(e) => update({ personality: e.target.value })}
            placeholder={t.brandPage.personalityPlaceholder}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
          />
        </div>
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">{t.brandPage.brandKeywords}</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
            placeholder={t.brandPage.addKeyword}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
          />
          <button onClick={addKeyword} className="px-3 py-2 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {v.keywords.map((kw, i) => (
            <span key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs">
              {kw}
              <button onClick={() => update({ keywords: v.keywords.filter((_, j) => j !== i) })}>
                <X className="h-3 w-3 text-teal-400 hover:text-red-400" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Don'ts */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">{t.brandPage.donts}</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newDoNot}
            onChange={(e) => setNewDoNot(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addDoNot()}
            placeholder={t.brandPage.dontsPlaceholder}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
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
