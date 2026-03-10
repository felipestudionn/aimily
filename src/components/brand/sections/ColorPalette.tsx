'use client';

import { useState } from 'react';
import { Palette, Plus, Trash2 } from 'lucide-react';
import type { BrandProfile, BrandColor } from '@/types/brand';

interface Props {
  primaryColors: BrandColor[] | null;
  secondaryColors: BrandColor[] | null;
  onUpdate: (updates: Partial<BrandProfile>) => void;
}

function ColorRow({
  color,
  onChange,
  onRemove,
}: {
  color: BrandColor;
  onChange: (c: BrandColor) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={color.hex || '#000000'}
        onChange={(e) => onChange({ ...color, hex: e.target.value })}
        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
      />
      <input
        type="text"
        value={color.hex}
        onChange={(e) => onChange({ ...color, hex: e.target.value })}
        placeholder="#000000"
        className="w-24 px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
      />
      <input
        type="text"
        value={color.name}
        onChange={(e) => onChange({ ...color, name: e.target.value })}
        placeholder="Color name"
        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
      />
      <input
        type="text"
        value={color.pantone || ''}
        onChange={(e) => onChange({ ...color, pantone: e.target.value })}
        placeholder="Pantone"
        className="w-28 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
      />
      <button onClick={onRemove} className="p-1.5 text-gray-300 hover:text-red-400">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ColorGroup({
  label,
  colors,
  onChange,
}: {
  label: string;
  colors: BrandColor[];
  onChange: (colors: BrandColor[]) => void;
}) {
  const add = () => onChange([...colors, { hex: '#4ECDC4', name: '', pantone: '' }]);
  const update = (idx: number, c: BrandColor) =>
    onChange(colors.map((old, i) => (i === idx ? c : old)));
  const remove = (idx: number) => onChange(colors.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-500">{label}</label>
        <button
          onClick={add}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 text-gray-500 text-xs hover:bg-gray-100"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      {colors.length === 0 && (
        <p className="text-xs text-gray-300 text-center py-2">No colors defined</p>
      )}
      {/* Color swatches preview */}
      {colors.length > 0 && (
        <div className="flex gap-2 mb-2">
          {colors.map((c, i) => (
            <div
              key={i}
              className="w-12 h-12 border border-gray-100 shadow-sm"
              style={{ backgroundColor: c.hex }}
              title={`${c.name || c.hex}${c.pantone ? ` (${c.pantone})` : ''}`}
            />
          ))}
        </div>
      )}
      <div className="space-y-2">
        {colors.map((c, i) => (
          <ColorRow key={i} color={c} onChange={(u) => update(i, u)} onRemove={() => remove(i)} />
        ))}
      </div>
    </div>
  );
}

export function ColorPalette({ primaryColors, secondaryColors, onUpdate }: Props) {
  const [primary, setPrimary] = useState<BrandColor[]>(primaryColors || []);
  const [secondary, setSecondary] = useState<BrandColor[]>(secondaryColors || []);

  return (
    <div className="bg-white border border-gray-100 p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-teal-500" />
        <h2 className="font-semibold text-gray-900">Color Palette</h2>
      </div>

      <ColorGroup
        label="Primary Colors"
        colors={primary}
        onChange={(c) => {
          setPrimary(c);
          onUpdate({ primary_colors: c });
        }}
      />

      <div className="border-t border-gray-100" />

      <ColorGroup
        label="Secondary / Accent Colors"
        colors={secondary}
        onChange={(c) => {
          setSecondary(c);
          onUpdate({ secondary_colors: c });
        }}
      />
    </div>
  );
}
