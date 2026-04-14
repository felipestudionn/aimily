'use client';

import { useEffect, useMemo } from 'react';
import { EditorialText } from './EditorialText';
import type { ColorEntry } from './ColorPaletteField';

interface Props {
  brandName: string;
  onBrandNameChange: (v: string) => void;
  palette: ColorEntry[];
  onPaletteChange: (next: ColorEntry[]) => void;
  typographyFont: string;
  onTypographyFontChange: (v: string) => void;
  tone: string;
  onToneChange: (v: string) => void;
  style: string;
  onStyleChange: (v: string) => void;
  tagline?: string;
  onTaglineChange?: (v: string) => void;
  moodboardImages?: string[];
}

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

function PlaceholderTile({ label, className = '' }: { label: string; className?: string }) {
  return (
    <div className={`relative rounded-[12px] overflow-hidden bg-gradient-to-br from-carbon/[0.04] to-carbon/[0.12] flex items-center justify-center ${className}`}>
      <span className="text-[9px] tracking-[0.2em] uppercase text-carbon/25 font-semibold">
        {label}
      </span>
    </div>
  );
}

function SectionLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-[8px] tracking-[0.22em] uppercase font-semibold text-carbon/35 ${className}`}>
      {children}
    </span>
  );
}

export function BrandBoardCanvas({
  brandName,
  onBrandNameChange,
  palette,
  onPaletteChange,
  typographyFont,
  onTypographyFontChange,
  tone,
  onToneChange,
  style,
  onStyleChange,
  tagline = '',
  onTaglineChange,
  moodboardImages = [],
}: Props) {
  const activeFont = useMemo(() => typographyFont.trim().split(/[,\n]/)[0].trim(), [typographyFont]);
  const fontStack = activeFont ? `"${activeFont}", ui-serif, Georgia, serif` : 'ui-serif, Georgia, serif';

  useEffect(() => {
    loadGoogleFont(activeFont);
  }, [activeFont]);

  const p0 = palette[0];
  const p1 = palette[1];
  const p2 = palette[2];

  const heroBg = p0?.hex || '#2B2B2B';
  const logoBg = p1?.hex || '#EBE4DB';
  const submarkBg = p2?.hex || '#B1A497';

  const img0 = moodboardImages[0];
  const img1 = moodboardImages[1];
  const img2 = moodboardImages[2];
  const img3 = moodboardImages[3];

  return (
    <div className="mx-auto w-full max-w-[1080px] bg-white rounded-[20px] p-3 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
      <div className="grid grid-cols-12 gap-2" style={{ gridAutoRows: '36px' }}>

        {/* ═══ HERO ═══ full, rows 1-8 (~290px) */}
        <div
          className="col-span-12 row-span-8 relative rounded-[14px] overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: heroBg }}
        >
          {img0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img0} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
          <div className="relative z-10 flex flex-col items-center gap-2 px-6 text-center">
            <input
              value={brandName}
              onChange={(e) => onBrandNameChange(e.target.value)}
              placeholder="Brand"
              className="bg-transparent border-0 outline-none text-white text-[64px] md:text-[84px] font-semibold tracking-[-0.045em] leading-[0.9] placeholder:text-white/30 text-center drop-shadow-[0_2px_14px_rgba(0,0,0,0.3)] w-full"
              style={{ fontFamily: fontStack }}
            />
            {(tagline || onTaglineChange) && (
              <input
                value={tagline}
                onChange={(e) => onTaglineChange?.(e.target.value)}
                placeholder="Tagline"
                className="bg-transparent border-0 outline-none text-white/90 text-[10px] tracking-[0.4em] uppercase font-medium text-center placeholder:text-white/30 w-full max-w-[380px] drop-shadow-[0_1px_4px_rgba(0,0,0,0.2)]"
              />
            )}
          </div>
        </div>

        {/* ═══ ROW 2: Logo 7 + Submark 5 (asymmetric) · 4 rows (~140px) ═══ */}
        <div
          className="col-span-7 row-span-4 relative rounded-[12px] overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: logoBg }}
        >
          <SectionLabel className="absolute top-3 left-4">Logo</SectionLabel>
          <span
            className="text-[48px] font-semibold tracking-[-0.04em] text-carbon leading-[0.9]"
            style={{ fontFamily: fontStack }}
          >
            {brandName || 'Brand'}
          </span>
        </div>
        <div
          className="col-span-5 row-span-4 relative rounded-[12px] overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: submarkBg }}
        >
          <SectionLabel className="absolute top-3 left-4 text-white/70">Icon</SectionLabel>
          <div className="w-20 h-20 rounded-full border-[3px] border-white/90 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white/90" />
          </div>
        </div>

        {/* ═══ ROW 3: Palette 5 + Font 4 + Mockup 3 (3 cols asymmetric) · 4 rows (~140px) ═══ */}
        <div className="col-span-5 row-span-4 relative rounded-[12px] bg-carbon/[0.02] border border-carbon/[0.06] p-4 flex flex-col">
          <SectionLabel>Colour Palette</SectionLabel>
          <div className="flex-1 flex items-center justify-around gap-1 pt-2">
            {palette.slice(0, 5).map((c, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <label className="relative cursor-pointer">
                  <div
                    className="w-11 h-11 rounded-full border border-black/[0.04] shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-transform hover:scale-105"
                    style={{ backgroundColor: c.hex }}
                  />
                  <input
                    type="color"
                    value={c.hex}
                    onChange={(e) => {
                      const next = [...palette];
                      next[i] = { ...next[i], hex: e.target.value.toUpperCase() };
                      onPaletteChange(next);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </label>
                <span className="text-[8px] tracking-[0.02em] font-mono text-carbon/50">
                  #{c.hex?.replace('#', '').toUpperCase() || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-4 row-span-4 relative rounded-[12px] bg-carbon/[0.02] border border-carbon/[0.06] p-4 flex flex-col">
          <div className="flex items-center justify-between">
            <SectionLabel>Font</SectionLabel>
            <input
              value={typographyFont}
              onChange={(e) => onTypographyFontChange(e.target.value)}
              placeholder="Font name…"
              className="px-2 py-0.5 text-[9px] text-carbon bg-white rounded-full border border-carbon/[0.08] outline-none placeholder:text-carbon/30 w-28 focus:border-carbon/30"
            />
          </div>
          <div className="flex-1 flex items-center justify-around gap-3" style={{ fontFamily: fontStack }}>
            <div className="flex flex-col items-center">
              <span className="text-[56px] leading-[0.9] tracking-[-0.04em] font-medium text-carbon select-none">Aa</span>
              <span
                className="text-[9px] tracking-[0.05em] text-carbon/50 mt-1"
                style={{ fontFamily: 'var(--font-sans, system-ui)' }}
              >
                {activeFont || 'Display'}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[56px] leading-[0.9] tracking-[-0.02em] font-normal text-carbon/75 select-none">Aa</span>
              <span
                className="text-[9px] tracking-[0.05em] text-carbon/50 mt-1"
                style={{ fontFamily: 'var(--font-sans, system-ui)' }}
              >
                Body
              </span>
            </div>
          </div>
        </div>

        <PlaceholderTile label="Tag" className="col-span-3 row-span-4" />

        {/* ═══ ROW 4: Voice&Tone 8 + Mockup 4 (asymmetric) · 5 rows (~170px) ═══ */}
        <div className="col-span-8 row-span-5 relative rounded-[12px] bg-carbon/[0.02] border border-carbon/[0.06] p-4 flex flex-col gap-2">
          <SectionLabel>Voice &amp; Tone</SectionLabel>
          <div className="flex-1 overflow-hidden">
            <EditorialText value={tone} onChange={onToneChange} placeholder="Brand voice & tone — click to edit…" size="md" />
          </div>
        </div>

        <PlaceholderTile label="Application · Laptop" className="col-span-4 row-span-5" />

        {/* ═══ ROW 5: Typography specimen 8 + Mockup 4 (asymmetric) · 6 rows (~200px) ═══ */}
        <div className="col-span-8 row-span-6 relative rounded-[12px] bg-carbon/[0.02] border border-carbon/[0.06] p-4 flex flex-col gap-2 overflow-hidden">
          <SectionLabel>Typography Specimen</SectionLabel>
          <div className="flex-1 flex gap-6 items-center" style={{ fontFamily: fontStack }}>
            <span className="text-[120px] leading-[0.85] tracking-[-0.045em] font-medium text-carbon select-none shrink-0">Aa</span>
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <p className="text-[14px] text-carbon/75 tracking-[0.02em] leading-tight truncate">
                ABCDEFGHIJKLMNOPQRSTUVWXYZ
              </p>
              <p className="text-[14px] text-carbon/75 tracking-[0.02em] leading-tight truncate">
                abcdefghijklmnopqrstuvwxyz
              </p>
              <p className="text-[14px] text-carbon/55 tracking-[0.02em] leading-tight truncate">
                0123456789 &amp; ! ? @ # — …
              </p>
              <p className="text-[17px] leading-[1.3] text-carbon/80 italic tracking-[-0.01em] pt-2 border-t border-carbon/[0.06] mt-1">
                The quick brown fox jumps over the lazy dog.
              </p>
            </div>
          </div>
        </div>

        <PlaceholderTile label="Application · Packaging" className="col-span-4 row-span-6" />

        {/* ═══ ROW 6: Visual Identity FULL · 7 rows (~235px) ═══ */}
        <div className="col-span-12 row-span-7 relative rounded-[12px] bg-carbon/[0.02] border border-carbon/[0.06] p-4 flex flex-col gap-2 overflow-hidden">
          <SectionLabel>Visual Identity</SectionLabel>
          <div className="grid grid-cols-[1fr_320px] gap-4 flex-1 overflow-hidden">
            <div className="overflow-hidden">
              <EditorialText
                value={style}
                onChange={onStyleChange}
                placeholder="How does this brand look? Photography, treatment, spacing…"
                size="md"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[img0, img1, img2, img3].map((url, i) => (
                <div key={i} className="rounded-[8px] bg-carbon/[0.04] overflow-hidden relative">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[8px] tracking-[0.2em] uppercase text-carbon/25 font-semibold">Mood</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ ROW 7: Applications 4 col asymmetric · 5 rows (~170px) ═══ */}
        <PlaceholderTile label="Posters" className="col-span-3 row-span-5" />
        <PlaceholderTile label="Tee" className="col-span-5 row-span-5" />
        <PlaceholderTile label="Boxes" className="col-span-4 row-span-5" />
      </div>
    </div>
  );
}
