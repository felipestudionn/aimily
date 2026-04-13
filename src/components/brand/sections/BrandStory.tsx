'use client';

import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { BrandProfile } from '@/types/brand';
import { useTranslation } from '@/i18n';

interface Props {
  story: string | null;
  onUpdate: (updates: Partial<BrandProfile>) => void;
}

export function BrandStory({ story, onUpdate }: Props) {
  const t = useTranslation();
  const [text, setText] = useState(story || '');

  return (
    <div className="bg-white border border-carbon/[0.06] rounded-[20px] p-6 space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-carbon/40" />
        <h2 className="font-light text-carbon tracking-tight">{t.brandPage.storyTitle}</h2>
      </div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onUpdate({ brand_story: e.target.value });
        }}
        rows={6}
        placeholder={t.brandPage.storyPlaceholder}
        className="w-full px-4 py-3 border border-carbon/[0.08] text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/20"
      />
      <p className="text-xs text-carbon/30">
        {text.length > 0 ? `${text.split(/\s+/).filter(Boolean).length} ${t.brandPage.words}` : t.brandPage.startWriting}
      </p>
    </div>
  );
}
