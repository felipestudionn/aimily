'use client';

import React, { useState } from 'react';
import { Palette, Ruler, ShieldCheck, Package, AlertCircle, Check, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { SKU } from '@/hooks/useSkus';
import type { SampleReview } from '@/types/prototyping';
import { useSkuLifecycle } from './SkuLifecycleContext';
import { PhaseAccordion } from './PhaseAccordion';
import { ImageUploadArea, MetricCell, SizeRunEditor, StarRating } from './shared';

interface ProductionPhaseProps {
  sku: SKU;
  onUpdate: (updates: Partial<SKU>) => Promise<void>;
  onImageUpload: (file: File, field: 'production_sample_url') => void;
  uploading: string | null;
}

/* ── Measurement defaults ── */
const DEFAULT_MEASUREMENTS = [
  { point: 'Length (outsole)', tolerance: '±2mm' },
  { point: 'Width (ball)', tolerance: '±1.5mm' },
  { point: 'Heel height', tolerance: '±1mm' },
  { point: 'Shaft height', tolerance: '±3mm' },
  { point: 'Opening circumference', tolerance: '±3mm' },
];

export function ProductionPhase({ sku, onUpdate, onImageUpload, uploading }: ProductionPhaseProps) {
  const t = useTranslation();
  const { reviews, addReview, updateReview, deleteReview, colorways, orders, collectionPlanId } = useSkuLifecycle();

  const colorReviews = reviews.filter(r => r.sku_id === sku.id && r.review_type === 'color_sample');
  const fittingReviews = reviews.filter(r => r.sku_id === sku.id && r.review_type === 'fitting_sample');
  const skuColorways = colorways.filter(c => c.sku_id === sku.id);

  const latestColor = colorReviews[colorReviews.length - 1];
  const latestFitting = fittingReviews[fittingReviews.length - 1];
  const colorApproved = latestColor?.status === 'approved';
  const fittingApproved = latestFitting?.status === 'approved';
  const bothApproved = colorApproved && fittingApproved;

  // Find production orders that include this SKU
  const skuOrders = orders.filter(o =>
    o.line_items?.some(li => li.sku_id === sku.id)
  );

  return (
    <div className="space-y-4">
      {/* ── Color Sample Review ── */}
      <PhaseAccordion
        title={t.skuPhases?.colorSampleReview || 'Color Sample Review'}
        icon={Palette}
        badge={colorApproved ? 'Approved' : colorReviews.length > 0 ? 'In Review' : undefined}
        defaultOpen
      >
        {/* Colorway strip */}
        {skuColorways.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {skuColorways.map(cw => (
              <div key={cw.id} className="flex items-center gap-1.5 px-2 py-1 bg-carbon/[0.03] border border-carbon/[0.06]">
                <div className="w-4 h-4" style={{ backgroundColor: cw.hex_primary }} />
                <span className="text-[10px] text-carbon/50">{cw.name}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {colorReviews.map(review => (
            <ReviewCard key={review.id} review={review} onUpdate={updateReview} onDelete={deleteReview}
              noteFields={['color_notes', 'material_notes']} t={t} />
          ))}
          <button
            onClick={() => addReview({
              collection_plan_id: collectionPlanId, sku_id: sku.id, review_type: 'color_sample',
              status: 'pending', overall_rating: null, color_notes: null, material_notes: null,
              fit_notes: null, construction_notes: null, measurements_ok: null,
              photos: [], issues: [], rectification_notes: null, reviewed_by: null, reviewed_at: null,
            })}
            className="flex items-center gap-2 px-3 py-2 border border-dashed border-carbon/[0.1] text-carbon/40 text-[10px] font-medium tracking-[0.1em] uppercase hover:border-carbon/20 transition-colors w-full justify-center"
          >
            <Plus className="h-3 w-3" /> {t.skuPhases?.addColorReview || 'Add Color Review'}
          </button>
        </div>
      </PhaseAccordion>

      {/* ── Fitting Review with Measurements ── */}
      <PhaseAccordion
        title={t.skuPhases?.fittingReview || 'Fitting Review'}
        icon={Ruler}
        badge={fittingApproved ? 'Approved' : fittingReviews.length > 0 ? 'In Review' : undefined}
      >
        <div className="space-y-3">
          {fittingReviews.map(review => (
            <FittingReviewCard key={review.id} review={review} onUpdate={updateReview} onDelete={deleteReview} t={t} />
          ))}
          <button
            onClick={() => addReview({
              collection_plan_id: collectionPlanId, sku_id: sku.id, review_type: 'fitting_sample',
              status: 'pending', overall_rating: null, fit_notes: null, construction_notes: null,
              color_notes: null, material_notes: null,
              measurements_ok: null, photos: [], issues: [], rectification_notes: null,
              reviewed_by: null, reviewed_at: null,
            })}
            className="flex items-center gap-2 px-3 py-2 border border-dashed border-carbon/[0.1] text-carbon/40 text-[10px] font-medium tracking-[0.1em] uppercase hover:border-carbon/20 transition-colors w-full justify-center"
          >
            <Plus className="h-3 w-3" /> {t.skuPhases?.addFittingReview || 'Add Fitting Review'}
          </button>
        </div>
      </PhaseAccordion>

      {/* ── Approval Gate ── */}
      <PhaseAccordion title={t.skuPhases?.finalApproval || 'Final Approval'} icon={ShieldCheck}>
        {bothApproved ? (
          <div className="flex items-center gap-3 p-4 bg-[#2d6a4f]/5 border border-[#2d6a4f]/10">
            <Check className="h-5 w-5 text-[#2d6a4f]" />
            <div>
              <p className="text-[11px] font-medium text-carbon">{t.skuPhases?.readyForProduction || 'Ready for production'}</p>
              <p className="text-[10px] text-carbon/35 mt-0.5">{t.skuPhases?.bothApproved || 'Color and fitting samples both approved.'}</p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-carbon/[0.02] border border-carbon/[0.06] space-y-2">
            <div className="flex items-center gap-2">
              {colorApproved ? <Check className="h-3 w-3 text-[#2d6a4f]" /> : <AlertCircle className="h-3 w-3 text-carbon/25" />}
              <span className={`text-[11px] ${colorApproved ? 'text-[#2d6a4f]' : 'text-carbon/35'}`}>
                {t.skuPhases?.colorSampleStatus || 'Color sample'}: {colorApproved ? 'Approved' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {fittingApproved ? <Check className="h-3 w-3 text-[#2d6a4f]" /> : <AlertCircle className="h-3 w-3 text-carbon/25" />}
              <span className={`text-[11px] ${fittingApproved ? 'text-[#2d6a4f]' : 'text-carbon/35'}`}>
                {t.skuPhases?.fittingSampleStatus || 'Fitting sample'}: {fittingApproved ? 'Approved' : 'Pending'}
              </span>
            </div>
          </div>
        )}
      </PhaseAccordion>

      {/* ── Production Sample + Size Run ── */}
      <PhaseAccordion title={t.skuPhases?.productionSample || 'Production Sample & Size Run'} icon={Package} defaultOpen>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-2">{t.skuPhases?.productionSample || 'Sample'}</p>
            <ImageUploadArea
              imageUrl={sku.production_sample_url}
              uploading={uploading === 'production_sample_url'}
              placeholder={t.skuPhases?.uploadProductionSample || 'Upload production sample'}
              onUpload={(file) => onImageUpload(file, 'production_sample_url')}
              onRemove={() => onUpdate({ production_sample_url: undefined })}
              aspectClass="aspect-[4/3]"
            />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-2">{t.skuPhases?.sizeRunFinal || 'Size Run'}</p>
              <div className="bg-white border border-carbon/[0.06] p-4">
                <SizeRunEditor
                  category={sku.category}
                  sizeRun={sku.size_run || {}}
                  buyUnits={sku.buy_units}
                  onUpdate={(sr) => onUpdate({ size_run: sr } as Partial<SKU>)}
                />
              </div>
            </div>
            <div className="bg-white border border-carbon/[0.06] p-4">
              <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-2">{t.skuPhases?.financialRecap || 'Financial Recap'}</p>
              <div className="grid grid-cols-3 gap-3">
                <MetricCell label="PVP" value={`€${sku.pvp}`} />
                <MetricCell label="COGS" value={`€${sku.cost}`} />
                <MetricCell label={t.skuPhases?.margin || 'Margin'} value={`${Math.round(sku.margin)}%`} />
              </div>
            </div>
          </div>
        </div>
      </PhaseAccordion>

      {/* ── Production Orders ── */}
      {skuOrders.length > 0 && (
        <PhaseAccordion title={t.skuPhases?.productionOrders || 'Production Orders'} icon={Package} badge={`${skuOrders.length}`}>
          <div className="space-y-2">
            {skuOrders.map(order => (
              <div key={order.id} className="p-3 bg-carbon/[0.02] border border-carbon/[0.04] flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-carbon">{order.order_number || order.factory_name || 'Order'}</p>
                  <p className="text-[10px] text-carbon/35">{order.status} · {order.estimated_delivery || 'No ETA'}</p>
                </div>
                <span className="text-[10px] text-carbon/25">
                  {order.line_items?.find(li => li.sku_id === sku.id)?.units || 0} units
                </span>
              </div>
            ))}
          </div>
        </PhaseAccordion>
      )}
    </div>
  );
}

/* ── Generic Review Card (for color sample) ── */
function ReviewCard({ review, onUpdate, onDelete, noteFields, t }: {
  review: SampleReview;
  onUpdate: (id: string, u: Partial<SampleReview>) => Promise<SampleReview | null>;
  onDelete: (id: string) => Promise<boolean>;
  noteFields: ('color_notes' | 'material_notes' | 'fit_notes' | 'construction_notes')[];
  t: ReturnType<typeof useTranslation>;
}) {
  const fieldLabels: Record<string, string> = {
    color_notes: t.skuPhases?.colorNotes || 'Color Notes',
    material_notes: t.skuPhases?.materialNotes || 'Material Notes',
    fit_notes: t.skuPhases?.fitNotes || 'Fit Notes',
    construction_notes: t.skuPhases?.constructionNotes || 'Construction',
  };

  return (
    <div className="border border-carbon/[0.06] bg-white p-4 space-y-3">
      <div className="flex items-center gap-3">
        <select value={review.status} onChange={(e) => onUpdate(review.id, { status: e.target.value as SampleReview['status'] })}
          className="text-[10px] font-medium tracking-[0.06em] uppercase bg-transparent border border-carbon/[0.08] px-2 py-1 text-carbon/60 focus:outline-none">
          <option value="pending">Pending</option>
          <option value="issues_found">Issues</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <StarRating value={review.overall_rating} onChange={(v) => onUpdate(review.id, { overall_rating: v })} />
        <button onClick={() => onDelete(review.id)} className="ml-auto text-carbon/20 hover:text-[#A0463C]/60"><Trash2 className="h-3 w-3" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {noteFields.map(field => (
          <div key={field}>
            <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1">{fieldLabels[field]}</p>
            <textarea value={(review[field] as string) || ''} onChange={(e) => onUpdate(review.id, { [field]: e.target.value })}
              className="w-full h-14 p-2 text-[12px] font-light text-carbon bg-carbon/[0.02] border border-carbon/[0.06] resize-none focus:outline-none focus:border-carbon/[0.15]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Fitting Review with Measurement Table ── */
function FittingReviewCard({ review, onUpdate, onDelete, t }: {
  review: SampleReview;
  onUpdate: (id: string, u: Partial<SampleReview>) => Promise<SampleReview | null>;
  onDelete: (id: string) => Promise<boolean>;
  t: ReturnType<typeof useTranslation>;
}) {
  // Parse measurements from review or use defaults
  const measurements = (review as unknown as { measurements?: { point: string; spec: string; actual: string; tolerance: string; pass: boolean | null }[] }).measurements || DEFAULT_MEASUREMENTS.map(m => ({ ...m, spec: '', actual: '', pass: null as boolean | null }));

  const updateMeasurement = (idx: number, updates: Record<string, unknown>) => {
    const updated = measurements.map((m, i) => i === idx ? { ...m, ...updates } : m);
    const allChecked = updated.every(m => m.pass !== null);
    const allPass = allChecked && updated.every(m => m.pass === true);
    onUpdate(review.id, { measurements: updated, measurements_ok: allChecked ? allPass : null } as unknown as Partial<SampleReview>);
  };

  return (
    <div className="border border-carbon/[0.06] bg-white p-4 space-y-3">
      <div className="flex items-center gap-3">
        <select value={review.status} onChange={(e) => onUpdate(review.id, { status: e.target.value as SampleReview['status'] })}
          className="text-[10px] font-medium tracking-[0.06em] uppercase bg-transparent border border-carbon/[0.08] px-2 py-1 text-carbon/60 focus:outline-none">
          <option value="pending">Pending</option>
          <option value="issues_found">Issues</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <StarRating value={review.overall_rating} onChange={(v) => onUpdate(review.id, { overall_rating: v })} />
        <button onClick={() => onDelete(review.id)} className="ml-auto text-carbon/20 hover:text-[#A0463C]/60"><Trash2 className="h-3 w-3" /></button>
      </div>

      {/* Measurement table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-carbon/[0.06]">
              <th className="text-left text-[9px] text-carbon/30 uppercase tracking-wider py-2 pr-3">{t.skuPhases?.measurementPoint || 'Point'}</th>
              <th className="text-left text-[9px] text-carbon/30 uppercase tracking-wider py-2 px-2">Spec</th>
              <th className="text-left text-[9px] text-carbon/30 uppercase tracking-wider py-2 px-2">Actual</th>
              <th className="text-left text-[9px] text-carbon/30 uppercase tracking-wider py-2 px-2">{t.skuPhases?.tolerance || 'Tol.'}</th>
              <th className="text-center text-[9px] text-carbon/30 uppercase tracking-wider py-2 pl-2">{t.skuPhases?.pass || 'Pass'}</th>
            </tr>
          </thead>
          <tbody>
            {measurements.map((m, idx) => (
              <tr key={idx} className="border-b border-carbon/[0.03]">
                <td className="py-2 pr-3 text-carbon/60 font-light">{m.point}</td>
                <td className="py-2 px-2">
                  <input value={m.spec || ''} onChange={(e) => updateMeasurement(idx, { spec: e.target.value })}
                    className="w-16 text-[11px] text-carbon bg-transparent border-b border-carbon/[0.08] focus:border-carbon/[0.15] focus:outline-none" />
                </td>
                <td className="py-2 px-2">
                  <input value={m.actual || ''} onChange={(e) => updateMeasurement(idx, { actual: e.target.value })}
                    className="w-16 text-[11px] text-carbon bg-transparent border-b border-carbon/[0.08] focus:border-carbon/[0.15] focus:outline-none" />
                </td>
                <td className="py-2 px-2 text-carbon/30">{m.tolerance}</td>
                <td className="py-2 pl-2 text-center">
                  <button
                    onClick={() => {
                      const next = m.pass === null ? true : m.pass === true ? false : null;
                      updateMeasurement(idx, { pass: next });
                    }}
                    className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold ${
                      m.pass === true ? 'bg-[#2d6a4f]/10 text-[#2d6a4f]' :
                      m.pass === false ? 'bg-[#A0463C]/10 text-[#A0463C]' :
                      'bg-carbon/[0.04] text-carbon/20'
                    }`}
                  >
                    {m.pass === true ? '✓' : m.pass === false ? '✗' : '·'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div>
          <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1">{t.skuPhases?.fitNotes || 'Fit Notes'}</p>
          <textarea value={review.fit_notes || ''} onChange={(e) => onUpdate(review.id, { fit_notes: e.target.value })}
            className="w-full h-14 p-2 text-[12px] font-light text-carbon bg-carbon/[0.02] border border-carbon/[0.06] resize-none focus:outline-none focus:border-carbon/[0.15]" />
        </div>
        <div>
          <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-1">{t.skuPhases?.constructionNotes || 'Construction'}</p>
          <textarea value={review.construction_notes || ''} onChange={(e) => onUpdate(review.id, { construction_notes: e.target.value })}
            className="w-full h-14 p-2 text-[12px] font-light text-carbon bg-carbon/[0.02] border border-carbon/[0.06] resize-none focus:outline-none focus:border-carbon/[0.15]" />
        </div>
      </div>
    </div>
  );
}
