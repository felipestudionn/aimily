'use client';

import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { BrandProfile } from '@/types/brand';

interface Props {
  story: string | null;
  onUpdate: (updates: Partial<BrandProfile>) => void;
}

export function BrandStory({ story, onUpdate }: Props) {
  const [text, setText] = useState(story || '');

  return (
    <div className="bg-white border border-gray-100 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-teal-500" />
        <h2 className="font-semibold text-gray-900">Brand Story</h2>
      </div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onUpdate({ brand_story: e.target.value });
        }}
        rows={6}
        placeholder="Write your brand's origin story, mission, and vision. What inspired the brand? What problem does it solve? What makes it unique?"
        className="w-full px-4 py-3 border border-gray-200 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
      />
      <p className="text-xs text-gray-400">
        {text.length > 0 ? `${text.split(/\s+/).filter(Boolean).length} words` : 'Start writing…'}
      </p>
    </div>
  );
}
