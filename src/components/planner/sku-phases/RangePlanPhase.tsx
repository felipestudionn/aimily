'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/i18n';
import type { SKU } from '@/hooks/useSkus';
import { ImageUploadArea, MetricCell } from './shared';

interface RangePlanPhaseProps {
  sku: SKU;
  onUpdate: (updates: Partial<SKU>) => Promise<void>;
  onImageUpload: (file: File, field: 'reference_image_url') => void;
  uploading: string | null;
  /** 'concept' = financials+notes, 'reference' = image upload, undefined = show all (legacy) */
  mode?: 'concept' | 'reference';
  /** Navigate to next evolution step */
  onContinue?: () => void;
}

export function RangePlanPhase({ sku, onUpdate, onImageUpload, uploading, mode, onContinue }: RangePlanPhaseProps) {
  const t = useTranslation();
  const [notes, setNotes] = useState(sku.notes || '');

  // Editable financial fields
  const handleFinancialChange = async (field: string, raw: string) => {
    const val = Number(raw.replace(/[^0-9.]/g, ''));
    if (isNaN(val)) return;

    const updates: Partial<SKU> = { [field]: val };

    // Recalculate derived fields
    const pvp = field === 'pvp' ? val : sku.pvp;
    const cost = field === 'cost' ? val : sku.cost;
    const units = field === 'buy_units' ? val : sku.buy_units;
    const discount = field === 'discount' ? val : sku.discount;
    const salePct = field === 'sale_percentage' ? val : sku.sale_percentage;

    const finalPrice = pvp * (1 - discount / 100);
    const margin = pvp > 0 ? ((pvp - cost) / pvp) * 100 : 0;
    const expectedSales = (units * salePct / 100) * finalPrice;

    updates.final_price = Math.round(finalPrice * 100) / 100;
    updates.margin = Math.round(margin * 100) / 100;
    updates.expected_sales = Math.round(expectedSales);

    await onUpdate(updates);
  };

  const showConcept = !mode || mode === 'concept';
  const showReference = !mode || mode === 'reference';

  return (
    <div className="space-y-6">
      {/* ── Reference Image workspace ── */}
      {showReference && (
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35">
              {t.skuPhases?.referenceImage || 'Reference Image'}
            </p>
            <p className="text-[11px] font-light text-carbon/40 mt-1">
              {'Upload an inspiration or mood image for this product. This will guide the AI sketch generation in the next step.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload area */}
            <div>
              <ImageUploadArea
                imageUrl={sku.reference_image_url}
                uploading={uploading === 'reference_image_url'}
                placeholder={t.skuPhases?.uploadReference || 'Upload reference image'}
                onUpload={(file) => onImageUpload(file, 'reference_image_url')}
                onRemove={() => onUpdate({ reference_image_url: undefined })}
                aspectClass="aspect-[4/3]"
              />
            </div>

            {/* Context card — product summary */}
            <div className="space-y-3">
              <div className="bg-white border border-carbon/[0.06] p-4 space-y-3">
                <p className="text-[8px] text-carbon/20 uppercase tracking-wider">{'Product Summary'}</p>
                <div className="space-y-1.5">
                  <p className="text-[13px] font-light text-carbon">{sku.name}</p>
                  <p className="text-[10px] text-carbon/30">{sku.family} · {sku.category}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-carbon/[0.04]">
                  <div>
                    <p className="text-[8px] text-carbon/20 uppercase">PVP</p>
                    <p className="text-[12px] font-light text-carbon">€{sku.pvp}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-carbon/20 uppercase">COGS</p>
                    <p className="text-[12px] font-light text-carbon">€{sku.cost}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-carbon/20 uppercase">Units</p>
                    <p className="text-[12px] font-light text-carbon">{sku.buy_units}</p>
                  </div>
                </div>
                {sku.notes && (
                  <div className="pt-2 border-t border-carbon/[0.04]">
                    <p className="text-[8px] text-carbon/20 uppercase tracking-wider mb-1">Concept Notes</p>
                    <p className="text-[10px] text-carbon/35 leading-relaxed">{sku.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CTA → next step */}
          {onContinue && (
            <div className="pt-4 flex justify-end">
              <button onClick={onContinue}
                className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-medium tracking-[0.12em] uppercase transition-colors ${
                  sku.reference_image_url
                    ? 'bg-carbon text-crema hover:bg-carbon/90'
                    : 'border border-carbon/[0.08] text-carbon/40 hover:bg-carbon hover:text-crema'
                }`}>
                {sku.reference_image_url ? 'Continue to Sketch' : 'Skip to Sketch'} <span className={sku.reference_image_url ? 'text-crema/50' : 'text-carbon/20'}>→</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Concept workspace: identity + financials + attributes + notes ── */}
      {showConcept && (
        <>
          {/* SKU Identity header */}
          <div className="bg-white border border-carbon/[0.06] p-5 space-y-1">
            <h2 className="text-lg font-light text-carbon tracking-tight">{sku.name}</h2>
            <p className="text-[11px] text-carbon/30">{sku.family} · Drop {sku.drop_number} · {sku.category} · {sku.type === 'IMAGEN' ? 'Image' : sku.type === 'REVENUE' ? 'Revenue' : 'Entry'}</p>
          </div>

          {/* Financial Summary — EDITABLE */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35">
              {t.skuPhases?.financials || 'Financial Details'}
            </p>
            <div className="bg-white border border-carbon/[0.06] p-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <MetricCell label="PVP" value={`€${sku.pvp}`} editable onChange={(v) => handleFinancialChange('pvp', v)} />
                <MetricCell label="COGS" value={`€${sku.cost}`} editable onChange={(v) => handleFinancialChange('cost', v)} />
                <MetricCell label={t.skuPhases?.units || 'Units'} value={String(sku.buy_units)} editable onChange={(v) => handleFinancialChange('buy_units', v)} />
                <MetricCell label={t.skuPhases?.margin || 'Margin'} value={`${Math.round(sku.margin)}%`} />
              </div>
              <div className="border-t border-carbon/[0.05] pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <MetricCell label={t.skuPhases?.discount || 'Discount'} value={`${sku.discount}%`} editable onChange={(v) => handleFinancialChange('discount', v)} secondary />
                <MetricCell label={t.skuPhases?.finalPrice || 'Final Price'} value={`€${sku.final_price}`} secondary />
                <MetricCell label={t.skuPhases?.sellThrough || 'Sell-through'} value={`${sku.sale_percentage}%`} editable onChange={(v) => handleFinancialChange('sale_percentage', v)} secondary />
                <MetricCell label={t.skuPhases?.expectedSales || 'Expected'} value={`€${Math.round(sku.expected_sales).toLocaleString()}`} secondary />
              </div>
            </div>
          </div>

          {/* Attributes */}
          <div className="bg-white border border-carbon/[0.06] p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
                  {sku.sku_role === 'BESTSELLER_REINVENTION' ? 'Bestseller' :
                   sku.sku_role === 'CARRYOVER' ? 'Carry-over' :
                   sku.sku_role || 'New'}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/35">
              {t.skuPhases?.notes || 'Notes & Concept'}
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                if (notes !== (sku.notes || '')) onUpdate({ notes });
              }}
              placeholder={t.skuPhases?.notesPlaceholder || 'Concept description, fabric ideas, inspiration references...'}
              className="w-full h-24 p-4 bg-white border border-carbon/[0.06] text-sm font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.15] transition-colors"
            />
          </div>

          {/* CTA → next step */}
          {onContinue && (
            <div className="pt-4 flex justify-end">
              <button onClick={onContinue}
                className="flex items-center gap-2 px-5 py-2.5 bg-carbon text-crema text-[10px] font-medium tracking-[0.12em] uppercase hover:bg-carbon/90 transition-colors">
                Continue to Reference <span className="text-crema/50">→</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
