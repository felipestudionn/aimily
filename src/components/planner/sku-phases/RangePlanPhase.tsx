'use client';

import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { SKU } from '@/hooks/useSkus';
import { ImageUploadArea, MetricCell } from './shared';

interface RangePlanPhaseProps {
  sku: SKU;
  onUpdate: (updates: Partial<SKU>) => Promise<void>;
  onImageUpload: (file: File, field: 'reference_image_url') => void;
  uploading: string | null;
  onDelete?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  CALZADO: 'Footwear', ROPA: 'Apparel', ACCESORIOS: 'Accessories',
};

export function RangePlanPhase({ sku, onUpdate, onImageUpload, uploading, onDelete }: RangePlanPhaseProps) {
  const t = useTranslation();
  const [notes, setNotes] = useState(sku.notes || '');
  const categoryLabel = CATEGORY_LABELS[sku.category] || sku.category;

  const handleFinancialChange = async (field: string, raw: string) => {
    const val = Number(raw.replace(/[^0-9.]/g, ''));
    if (isNaN(val)) return;
    const updates: Partial<SKU> = { [field]: val };
    const pvp = field === 'pvp' ? val : sku.pvp;
    const cost = field === 'cost' ? val : sku.cost;
    const units = field === 'buy_units' ? val : sku.buy_units;
    const discount = field === 'discount' ? val : sku.discount;
    const salePct = field === 'sale_percentage' ? val : sku.sale_percentage;
    updates.final_price = Math.round(pvp * (1 - discount / 100) * 100) / 100;
    updates.margin = pvp > 0 ? Math.round(((pvp - cost) / pvp) * 10000) / 100 : 0;
    updates.expected_sales = Math.round((units * salePct / 100) * (pvp * (1 - discount / 100)));
    await onUpdate(updates);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6">
        {/* Left: Product Details + Financials */}
        <div className="space-y-5">
          {/* Product Details — all concept fields */}
          <div>
            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35 mb-3">
              Product Details
            </p>
            <div className="bg-white border border-carbon/[0.06] p-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1">Name</p>
                  <p className="text-sm font-light text-carbon">{sku.name}</p>
                </div>
                <div>
                  <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1">Family</p>
                  <p className="text-sm font-light text-carbon">{sku.family}</p>
                </div>
                <div>
                  <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1">Category</p>
                  <p className="text-sm font-light text-carbon">{categoryLabel}</p>
                </div>
                <div>
                  <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1">{t.skuPhases?.channel || 'Channel'}</p>
                  <p className="text-sm font-light text-carbon">{sku.channel}</p>
                </div>
                <div>
                  <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1">{t.skuPhases?.origin || 'Origin'}</p>
                  <p className="text-sm font-light text-carbon">{sku.origin || '—'}</p>
                </div>
                <div>
                  <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1">{t.skuPhases?.role || 'Role'}</p>
                  <p className="text-sm font-light text-carbon">
                    {sku.sku_role === 'BESTSELLER_REINVENTION' ? 'Bestseller' : sku.sku_role === 'CARRYOVER' ? 'Carry-over' : sku.sku_role || 'New'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1">Segmentation</p>
                  <p className="text-sm font-light text-carbon">{sku.type === 'IMAGEN' ? 'Image' : sku.type === 'REVENUE' ? 'Revenue' : 'Entry'}</p>
                </div>
                <div>
                  <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1">Drop</p>
                  <p className="text-sm font-light text-carbon">Drop {sku.drop_number}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div>
            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35 mb-3">
              {t.skuPhases?.financials || 'Financial Details'}
            </p>
            <div className="bg-white border border-carbon/[0.06] p-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCell label="PVP" value={`€${sku.pvp}`} editable onChange={(v) => handleFinancialChange('pvp', v)} />
                <MetricCell label="COGS" value={`€${sku.cost}`} editable onChange={(v) => handleFinancialChange('cost', v)} />
                <MetricCell label={t.skuPhases?.units || 'Units'} value={String(sku.buy_units)} editable onChange={(v) => handleFinancialChange('buy_units', v)} />
                <MetricCell label={t.skuPhases?.margin || 'Margin'} value={`${Math.round(sku.margin)}%`} />
              </div>
              <div className="border-t border-carbon/[0.05] pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCell label={t.skuPhases?.discount || 'Discount'} value={`${sku.discount}%`} editable onChange={(v) => handleFinancialChange('discount', v)} secondary />
                <MetricCell label={t.skuPhases?.finalPrice || 'Final Price'} value={`€${sku.final_price}`} secondary />
                <MetricCell label="ST %" value={`${sku.sale_percentage}%`} editable onChange={(v) => handleFinancialChange('sale_percentage', v)} secondary />
                <MetricCell label={t.skuPhases?.expectedSales || 'Expected'} value={`€${Math.round(sku.expected_sales).toLocaleString()}`} secondary />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Reference Image */}
        <div className="space-y-3">
          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35">
            {t.skuPhases?.referenceImage || 'Reference Image'}
          </p>
          <ImageUploadArea
            imageUrl={sku.reference_image_url}
            uploading={uploading === 'reference_image_url'}
            placeholder={t.skuPhases?.uploadReference || 'Upload reference image'}
            onUpload={(file) => onImageUpload(file, 'reference_image_url')}
            onRemove={() => onUpdate({ reference_image_url: undefined })}
            aspectClass="aspect-[3/4]"
          />
          <p className="text-[9px] text-carbon/20 leading-relaxed">
            A reference image helps the AI generate a more accurate sketch in the next step.
          </p>
        </div>
      </div>

      {/* Notes & Concept */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35">
          {t.skuPhases?.notes || 'Notes & Concept'}
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => { if (notes !== (sku.notes || '')) onUpdate({ notes }); }}
          placeholder={t.skuPhases?.notesPlaceholder || 'Concept description, fabric ideas, inspiration references...'}
          className="w-full h-24 p-4 bg-white border border-carbon/[0.06] text-sm font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.15] transition-colors"
        />
      </div>

      {/* Delete SKU — at the bottom, discreet */}
      {onDelete && (
        <div className="pt-4 border-t border-carbon/[0.04]">
          <button onClick={onDelete}
            className="flex items-center gap-1.5 text-[9px] font-medium tracking-[0.08em] uppercase text-carbon/15 hover:text-[#A0463C]/60 transition-colors">
            <Trash2 className="h-3 w-3" /> Delete this SKU
          </button>
        </div>
      )}
    </div>
  );
}
