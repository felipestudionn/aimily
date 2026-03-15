'use client';

import { useState } from 'react';
import { Footprints, Plus, Trash2, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { SKU } from '@/hooks/useSkus';

interface FormSpecLocal {
  lastType: string;
  lastCode: string;
  factoryLink: string;
  notes: string;
}

interface Props {
  skus: SKU[];
  formSpecs: Record<string, FormSpecLocal>;
  onUpdate: (specs: Record<string, FormSpecLocal>) => void;
}

const STANDARD_SIZES: Record<string, string[]> = {
  CALZADO: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
  ROPA: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  ACCESORIOS: ['ONE SIZE'],
};

function SkuFormCard({
  sku,
  spec,
  onChange,
}: {
  sku: SKU;
  spec: FormSpecLocal;
  onChange: (s: FormSpecLocal) => void;
}) {
  const t = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const sizes = STANDARD_SIZES[sku.category] || STANDARD_SIZES.ROPA;

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
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            spec.lastType
              ? 'bg-amber-50 text-amber-600'
              : 'bg-gray-50 text-gray-400'
          }`}
        >
          {spec.lastType || t.designSections.noFormDefined}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-50">
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                {t.designSections.lastFormType}
              </label>
              <input
                type="text"
                value={spec.lastType}
                onChange={(e) => onChange({ ...spec, lastType: e.target.value })}
                placeholder={t.designSections.lastFormTypePlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                {t.designSections.lastFormCode}
              </label>
              <input
                type="text"
                value={spec.lastCode}
                onChange={(e) => onChange({ ...spec, lastCode: e.target.value })}
                placeholder={t.designSections.lastFormCodePlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              {t.designSections.factoryFormCatalogLink}
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={spec.factoryLink}
                onChange={(e) =>
                  onChange({ ...spec, factoryLink: e.target.value })
                }
                placeholder="https://..."
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
              />
              {spec.factoryLink && (
                <a
                  href={spec.factoryLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-amber-600 hover:border-amber-200"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Size table */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">
              {t.designSections.standardSizes} ({sku.category})
            </label>
            <div className="flex flex-wrap gap-1.5">
              {sizes.map((size) => (
                <span
                  key={size}
                  className="px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-md text-xs text-gray-600 font-mono"
                >
                  {size}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              {t.designSections.notes}
            </label>
            <textarea
              value={spec.notes}
              onChange={(e) => onChange({ ...spec, notes: e.target.value })}
              placeholder={t.designSections.notesPlaceholder}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function LastFormSection({ skus, formSpecs, onUpdate }: Props) {
  const t = useTranslation();
  const getSpec = (skuId: string): FormSpecLocal =>
    formSpecs[skuId] || { lastType: '', lastCode: '', factoryLink: '', notes: '' };

  const handleChange = (skuId: string, spec: FormSpecLocal) => {
    onUpdate({ ...formSpecs, [skuId]: spec });
  };

  if (skus.length === 0) {
    return (
      <div className="bg-white border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Footprints className="h-4 w-4 text-texto/60" />
          <h2 className="font-semibold text-gray-900">{t.designSections.lastFormDefinition}</h2>
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
          <Footprints className="h-4 w-4 text-texto/60" />
          <h2 className="font-semibold text-gray-900">{t.designSections.lastFormDefinition}</h2>
        </div>
        <span className="text-xs text-gray-400">{skus.length} {t.designSections.skus}</span>
      </div>

      <div className="space-y-2">
        {skus.map((sku) => (
          <SkuFormCard
            key={sku.id}
            sku={sku}
            spec={getSpec(sku.id)}
            onChange={(s) => handleChange(sku.id, s)}
          />
        ))}
      </div>
    </div>
  );
}
