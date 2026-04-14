'use client';

import { useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';

interface Props {
  fontName: string;
  onFontNameChange: (value: string) => void;
  fontPlaceholder?: string;
  pangram?: string;
}

const POPULAR_FONTS = [
  'Inter',
  'Playfair Display',
  'DM Serif Display',
  'Manrope',
  'Fraunces',
  'Space Grotesk',
];

function loadGoogleFont(name: string) {
  if (typeof document === 'undefined') return;
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) return;
  const family = trimmed.replace(/\s+/g, '+');
  const id = `gf-${family.toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${family}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap`;
  document.head.appendChild(link);
}

export function TypographySpecimen({
  fontName,
  onFontNameChange,
  fontPlaceholder,
  pangram = 'The quick brown fox jumps over the lazy dog.',
}: Props) {
  const activeFont = useMemo(() => fontName.trim().split(/[,\n]/)[0].trim(), [fontName]);

  useEffect(() => {
    loadGoogleFont(activeFont);
    POPULAR_FONTS.forEach(loadGoogleFont);
  }, [activeFont]);

  const fontStack = activeFont
    ? `"${activeFont}", ui-serif, Georgia, serif`
    : 'ui-serif, Georgia, serif';

  return (
    <div className="flex flex-col gap-3">
      <Input
        value={fontName}
        onChange={(e) => onFontNameChange(e.target.value)}
        placeholder={fontPlaceholder}
        className="h-auto px-3 py-2 text-[13px] text-carbon bg-carbon/[0.03] rounded-[10px] border-carbon/[0.06] focus-visible:border-carbon/20 focus-visible:ring-0 placeholder:text-carbon/30"
      />
      <div className="flex flex-wrap gap-1">
        {POPULAR_FONTS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFontNameChange(f)}
            className={`px-2.5 py-0.5 rounded-full text-[10px] border transition-colors ${
              activeFont === f
                ? 'bg-carbon text-white border-carbon'
                : 'bg-transparent text-carbon/50 border-carbon/[0.08] hover:border-carbon/25 hover:text-carbon/80'
            }`}
            style={{ fontFamily: `"${f}", ui-serif, Georgia, serif` }}
          >
            {f}
          </button>
        ))}
      </div>

      <div
        className="relative rounded-[12px] bg-carbon/[0.02] border border-carbon/[0.05] p-4 flex flex-col gap-2.5 overflow-hidden"
        style={{ fontFamily: fontStack }}
      >
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-[72px] leading-[0.85] tracking-[-0.04em] text-carbon font-medium select-none">
            Aa
          </div>
          <div className="text-[9px] tracking-[0.12em] uppercase text-carbon/30 font-medium" style={{ fontFamily: 'var(--font-sans, system-ui)' }}>
            {activeFont || 'Specimen'}
          </div>
        </div>
        <p className="text-[13px] text-carbon/70 tracking-[0.02em] leading-tight">
          ABCDEFGHIJKLMNOPQRSTUVWXYZ
        </p>
        <p className="text-[13px] text-carbon/70 tracking-[0.02em] leading-tight">
          abcdefghijklmnopqrstuvwxyz · 0123456789
        </p>
        <p className="text-[14px] leading-[1.25] text-carbon/70 italic tracking-[-0.01em] pt-1 border-t border-carbon/[0.05]">
          {pangram}
        </p>
      </div>

    </div>
  );
}
