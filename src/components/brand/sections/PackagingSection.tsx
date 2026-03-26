'use client';

import { useState } from 'react';
import { Package } from 'lucide-react';
import type { BrandProfile } from '@/types/brand';
import { useTranslation } from '@/i18n';

interface Props {
  notes: string | null;
  onUpdate: (updates: Partial<BrandProfile>) => void;
}

export function PackagingSection({ notes, onUpdate }: Props) {
  const t = useTranslation();
  const [text, setText] = useState(notes || '');

  return (
    <div className="bg-white border border-carbon/[0.06] p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-carbon/40" />
        <h2 className="font-light text-carbon tracking-tight">{t.brandPage.packagingTitle}</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-carbon/40 mb-1.5">{t.brandPage.packagingNotesLabel}</label>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              onUpdate({ packaging_notes: e.target.value });
            }}
            rows={5}
            placeholder={t.brandPage.packagingPlaceholder}
            className="w-full px-4 py-3 border border-carbon/[0.08] text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/20"
          />
        </div>
      </div>

      <div className="rounded-xl border-2 border-dashed border-carbon/[0.1] p-6 text-center">
        <Package className="h-8 w-8 mx-auto text-carbon/20 mb-2" />
        <p className="text-sm text-carbon/40">{t.brandPage.packagingUploadsComing}</p>
        <p className="text-xs text-carbon/30 mt-1">{t.brandPage.uploadMockups}</p>
      </div>
    </div>
  );
}
