'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { Sparkles, Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { EditorialText } from './EditorialText';

interface Props {
  images: string[];
  onImagesChange: (next: string[]) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  notesPlaceholder?: string;
  generateLabel?: string;
  uploadLabel?: string;
  onGenerate?: () => Promise<string[] | null>;
  externalGenerating?: boolean;
}

const SLOT_COUNT = 4;

export function VisualIdentityField({
  images,
  onImagesChange,
  notes,
  onNotesChange,
  notesPlaceholder,
  generateLabel = 'Generate',
  uploadLabel = 'Upload',
  onGenerate,
  externalGenerating = false,
}: Props) {
  const [internalGenerating, setInternalGenerating] = useState(false);
  const generating = internalGenerating || externalGenerating;
  const uploadRefs = useRef<(HTMLInputElement | null)[]>([]);

  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => images[i] || '');

  const setSlot = (index: number, value: string) => {
    const next = [...images];
    while (next.length <= index) next.push('');
    next[index] = value;
    onImagesChange(next);
  };

  const clearSlot = (index: number) => {
    const next = [...images];
    next[index] = '';
    onImagesChange(next);
  };

  const handleUpload = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setSlot(index, reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!onGenerate || generating) return;
    setInternalGenerating(true);
    try {
      const urls = await onGenerate();
      if (urls && urls.length > 0) onImagesChange(urls.slice(0, SLOT_COUNT));
    } finally {
      setInternalGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <EditorialText value={notes} onChange={onNotesChange} placeholder={notesPlaceholder} size="lg" />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-center gap-3">
          {slots.map((url, i) => (
            <div
              key={i}
              className="group/slot relative w-32 h-44 rounded-[12px] bg-carbon/[0.03] border border-carbon/[0.06] overflow-hidden shrink-0"
            >
              {url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Reference ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => clearSlot(i)}
                    className="absolute top-1.5 right-1.5 rounded-full h-6 w-6 bg-black/50 backdrop-blur text-white opacity-0 group-hover/slot:opacity-100 transition-opacity flex items-center justify-center hover:bg-black/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => uploadRefs.current[i]?.click()}
                  className="w-full h-full flex items-center justify-center text-carbon/20 hover:text-carbon/50 transition-colors"
                >
                  {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                </button>
              )}
              <input
                ref={(el) => {
                  uploadRefs.current[i] = el;
                }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUpload(i, e)}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2">
          {onGenerate && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold bg-carbon text-white hover:bg-carbon/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {generateLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const firstEmpty = slots.findIndex((u) => !u);
              uploadRefs.current[firstEmpty >= 0 ? firstEmpty : 0]?.click();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-medium text-carbon/40 hover:text-carbon/70"
          >
            <Upload className="h-3 w-3" />
            {uploadLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
