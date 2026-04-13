'use client';

import { useState } from 'react';
import { Palette, Plus, Trash2 } from 'lucide-react';
import type { BrandProfile, BrandColor } from '@/types/brand';
import { useTranslation } from '@/i18n';

interface Props {
  primaryColors: BrandColor[] | null;
  secondaryColors: BrandColor[] | null;
  onUpdate: (updates: Partial<BrandProfile>) => void;
}

function ColorRow({
  color,
  onChange,
  onRemove,
  colorNamePlaceholder,
}: {
  color: BrandColor;
  onChange: (c: BrandColor) => void;
  onRemove: () => void;
  colorNamePlaceholder: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={color.hex || '#000000'}
        onChange={(e) => onChange({ ...color, hex: e.target.value })}
        className="w-10 h-10 rounded-[12px] border border-carbon/[0.08] cursor-pointer p-0.5"
      />
      <input
        type="text"
        value={color.hex}
        onChange={(e) => onChange({ ...color, hex: e.target.value })}
        placeholder="#000000"
        className="w-24 px-2 py-1.5 rounded-[12px] border border-carbon/[0.08] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/20"
      />
      <input
        type="text"
        value={color.name}
        onChange={(e) => onChange({ ...color, name: e.target.value })}
        placeholder={colorNamePlaceholder}
        className="flex-1 px-3 py-1.5 rounded-[12px] border border-carbon/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/20"
      />
      <input
        type="text"
        value={color.pantone || ''}
        onChange={(e) => onChange({ ...color, pantone: e.target.value })}
        placeholder="Pantone"
        className="w-28 px-3 py-1.5 rounded-[12px] border border-carbon/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/20"
      />
      <button onClick={onRemove} className="p-1.5 text-carbon/20 hover:text-red-400">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ColorGroup({
  label,
  colors,
  onChange,
  addLabel,
  noColorsDefined,
  colorNamePlaceholder,
}: {
  label: string;
  colors: BrandColor[];
  onChange: (colors: BrandColor[]) => void;
  addLabel: string;
  noColorsDefined: string;
  colorNamePlaceholder: string;
}) {
  const add = () => onChange([...colors, { hex: '#4ECDC4', name: '', pantone: '' }]);
  const update = (idx: number, c: BrandColor) =>
    onChange(colors.map((old, i) => (i === idx ? c : old)));
  const remove = (idx: number) => onChange(colors.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-carbon/40">{label}</label>
        <button
          onClick={add}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-carbon/[0.03] text-carbon/40 text-xs hover:bg-carbon/[0.06]"
        >
          <Plus className="h-3 w-3" /> {addLabel}
        </button>
      </div>
      {colors.length === 0 && (
        <p className="text-xs text-carbon/20 text-center py-2">{noColorsDefined}</p>
      )}
      {/* Color swatches preview */}
      {colors.length > 0 && (
        <div className="flex gap-2 mb-2">
          {colors.map((c, i) => (
            <div
              key={i}
              className="w-12 h-12 border border-carbon/[0.06] shadow-sm"
              style={{ backgroundColor: c.hex }}
              title={`${c.name || c.hex}${c.pantone ? ` (${c.pantone})` : ''}`}
            />
          ))}
        </div>
      )}
      <div className="space-y-2">
        {colors.map((c, i) => (
          <ColorRow key={i} color={c} onChange={(u) => update(i, u)} onRemove={() => remove(i)} colorNamePlaceholder={colorNamePlaceholder} />
        ))}
      </div>
    </div>
  );
}

export function ColorPalette({ primaryColors, secondaryColors, onUpdate }: Props) {
  const t = useTranslation();
  const [primary, setPrimary] = useState<BrandColor[]>(primaryColors || []);
  const [secondary, setSecondary] = useState<BrandColor[]>(secondaryColors || []);

  return (
    <div className="bg-white border border-carbon/[0.06] rounded-[20px] p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-carbon/40" />
        <h2 className="font-light text-carbon tracking-tight">{t.brandPage.colorPaletteTitle}</h2>
      </div>

      <ColorGroup
        label={t.brandPage.primaryColors}
        colors={primary}
        onChange={(c) => {
          setPrimary(c);
          onUpdate({ primary_colors: c });
        }}
        addLabel={t.common.add}
        noColorsDefined={t.brandPage.noColorsDefined}
        colorNamePlaceholder={t.brandPage.colorNamePlaceholder}
      />

      <div className="border-t border-carbon/[0.06]" />

      <ColorGroup
        label={t.brandPage.secondaryColors}
        colors={secondary}
        onChange={(c) => {
          setSecondary(c);
          onUpdate({ secondary_colors: c });
        }}
        addLabel={t.common.add}
        noColorsDefined={t.brandPage.noColorsDefined}
        colorNamePlaceholder={t.brandPage.colorNamePlaceholder}
      />
    </div>
  );
}
