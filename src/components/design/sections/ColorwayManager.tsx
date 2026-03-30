'use client';

import { useState } from 'react';
import {
  Palette,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { SKU } from '@/hooks/useSkus';
import type { SkuColorway, ColorwayStatus } from '@/types/design';

interface Props {
  skus: SKU[];
  colorways: SkuColorway[];
  onAdd: (colorway: Omit<SkuColorway, 'id' | 'created_at'>) => Promise<SkuColorway | null>;
  onUpdate: (id: string, updates: Partial<SkuColorway>) => Promise<SkuColorway | null>;
  onDelete: (id: string) => Promise<boolean>;
}

const STATUS_OPTIONS: { value: ColorwayStatus; labelKey: 'statusProposed' | 'statusSampled' | 'statusApproved' | 'statusProduction'; color: string }[] = [
  { value: 'proposed', labelKey: 'statusProposed', color: 'bg-gray-100 text-gray-600' },
  { value: 'sampled', labelKey: 'statusSampled', color: 'bg-blue-50 text-blue-600' },
  { value: 'approved', labelKey: 'statusApproved', color: 'bg-green-50 text-green-600' },
  { value: 'production', labelKey: 'statusProduction', color: 'bg-purple-50 text-purple-600' },
];

function ColorwayCard({
  colorway,
  onUpdate,
  onDelete,
}: {
  colorway: SkuColorway;
  onUpdate: (updates: Partial<SkuColorway>) => void;
  onDelete: () => void;
}) {
  const t = useTranslation();
  const statusCfg = STATUS_OPTIONS.find((s) => s.value === colorway.status) || STATUS_OPTIONS[0];

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors group">
      <GripVertical className="h-3.5 w-3.5 text-gray-200 flex-shrink-0" />

      {/* Color swatches */}
      <div className="flex gap-1 flex-shrink-0">
        <div
          className="w-8 h-8 rounded-lg border border-gray-100 shadow-sm"
          style={{ backgroundColor: colorway.hex_primary }}
          title={`Primary: ${colorway.hex_primary}`}
        />
        {colorway.hex_secondary && (
          <div
            className="w-8 h-8 rounded-lg border border-gray-100 shadow-sm"
            style={{ backgroundColor: colorway.hex_secondary }}
            title={`Secondary: ${colorway.hex_secondary}`}
          />
        )}
        {colorway.hex_accent && (
          <div
            className="w-8 h-8 rounded-lg border border-gray-100 shadow-sm"
            style={{ backgroundColor: colorway.hex_accent }}
            title={`Accent: ${colorway.hex_accent}`}
          />
        )}
      </div>

      {/* Name */}
      <input
        type="text"
        value={colorway.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        className="flex-1 text-sm bg-transparent border-none focus:outline-none font-medium"
      />

      {/* Pantone */}
      <input
        type="text"
        value={colorway.pantone_primary || ''}
        onChange={(e) => onUpdate({ pantone_primary: e.target.value })}
        placeholder={t.designSections.pantone}
        className="w-24 text-xs bg-transparent border-none focus:outline-none text-gray-400 text-right"
      />

      {/* Status */}
      <select
        value={colorway.status}
        onChange={(e) => onUpdate({ status: e.target.value as ColorwayStatus })}
        className={`text-xs px-2 py-1 rounded-full border-none ${statusCfg.color} cursor-pointer focus:outline-none`}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {t.designSections[s.labelKey]}
          </option>
        ))}
      </select>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="p-1 text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SkuColorwayGroup({
  sku,
  colorways,
  onAdd,
  onUpdate,
  onDelete,
}: {
  sku: SKU;
  colorways: SkuColorway[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<SkuColorway>) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslation();
  const [expanded, setExpanded] = useState(colorways.length > 0);

  return (
    <div className="border border-gray-100 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
        <div
          className="w-8 h-8 rounded-lg bg-cover bg-center border border-gray-100"
          style={{
            backgroundImage: sku.reference_image_url
              ? `url(${sku.reference_image_url})`
              : undefined,
            backgroundColor: sku.reference_image_url ? undefined : '#f3f4f6',
          }}
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{sku.name}</p>
          <p className="text-xs text-gray-400">
            {sku.category} &middot; {sku.family}
          </p>
        </div>
        {/* Color swatch strip */}
        {colorways.length > 0 && (
          <div className="flex -space-x-1">
            {colorways.slice(0, 6).map((cw) => (
              <div
                key={cw.id}
                className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: cw.hex_primary }}
                title={cw.name}
              />
            ))}
            {colorways.length > 6 && (
              <div className="w-5 h-5 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center">
                <span className="text-[8px] text-gray-500 font-medium">
                  +{colorways.length - 6}
                </span>
              </div>
            )}
          </div>
        )}
        <span className="text-xs text-gray-400 ml-2">
          {colorways.length} {colorways.length !== 1 ? t.designSections.colorways : t.designSections.colorway}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 space-y-2 pt-3">
          {colorways.map((cw) => (
            <ColorwayCard
              key={cw.id}
              colorway={cw}
              onUpdate={(updates) => onUpdate(cw.id, updates)}
              onDelete={() => onDelete(cw.id)}
            />
          ))}

          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-500 text-xs hover:bg-gray-100 transition-colors"
          >
            <Plus className="h-3 w-3" /> {t.designSections.addColorway}
          </button>
        </div>
      )}
    </div>
  );
}

export function ColorwayManager({ skus, colorways, onAdd, onUpdate, onDelete }: Props) {
  const t = useTranslation();
  const getSkuColorways = (skuId: string) =>
    colorways.filter((c) => c.sku_id === skuId);

  const handleAdd = async (skuId: string) => {
    const position = getSkuColorways(skuId).length;
    await onAdd({
      sku_id: skuId,
      name: t.designSections.newColorway,
      hex_primary: '#4ECDC4',
      hex_secondary: null,
      hex_accent: null,
      pantone_primary: null,
      pantone_secondary: null,
      material_swatch_url: null,
      status: 'proposed',
      position,
      zones: [],
    });
  };

  const handleUpdate = (id: string, updates: Partial<SkuColorway>) => {
    onUpdate(id, updates);
  };

  const handleDelete = (id: string) => {
    onDelete(id);
  };

  const totalColorways = colorways.length;
  const approvedColorways = colorways.filter((c) => c.status === 'approved').length;

  if (skus.length === 0) {
    return (
      <div className="bg-white border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-4 w-4 text-texto/60" />
          <h2 className="font-semibold text-gray-900">{t.designSections.colorwayManager}</h2>
        </div>
        <p className="text-sm text-gray-400 text-center py-6">
          {t.designSections.noSkusFound}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-texto/60" />
          <h2 className="font-semibold text-gray-900">{t.designSections.colorwayManager}</h2>
        </div>
        {totalColorways > 0 && (
          <span className="text-xs text-gray-400">
            {approvedColorways}/{totalColorways} {t.designSections.approved}
          </span>
        )}
      </div>

      {/* Bulk overview strip */}
      {totalColorways > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50">
          {colorways.map((cw) => (
            <div key={cw.id} className="flex items-center gap-1.5">
              <div
                className="w-4 h-4 rounded-full border border-gray-200"
                style={{ backgroundColor: cw.hex_primary }}
              />
              <span className="text-xs text-gray-500">{cw.name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {skus.map((sku) => (
          <SkuColorwayGroup
            key={sku.id}
            sku={sku}
            colorways={getSkuColorways(sku.id)}
            onAdd={() => handleAdd(sku.id)}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
