'use client';

import { useState } from 'react';
import { Package } from 'lucide-react';
import type { BrandProfile } from '@/types/brand';

interface Props {
  notes: string | null;
  onUpdate: (updates: Partial<BrandProfile>) => void;
}

export function PackagingSection({ notes, onUpdate }: Props) {
  const [text, setText] = useState(notes || '');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-teal-500" />
        <h2 className="font-semibold text-gray-900">Packaging Design</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Packaging Notes & Requirements</label>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              onUpdate({ packaging_notes: e.target.value });
            }}
            rows={5}
            placeholder="Describe packaging requirements: box type, materials, printing method, sustainability, inserts, tissue paper, stickers, labels, hangtags, dust bags, etc."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
          />
        </div>
      </div>

      <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center">
        <Package className="h-8 w-8 mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">Packaging design uploads coming with the asset system</p>
        <p className="text-xs text-gray-400 mt-1">Upload mockups, prototypes, and supplier specs</p>
      </div>
    </div>
  );
}
