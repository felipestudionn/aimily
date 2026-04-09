'use client';

import React, { useState, useCallback } from 'react';
import {
  Palette, Ruler, Package, ShieldCheck, Check, AlertCircle,
  ChevronRight, Loader2, Sparkles,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SKU } from '@/hooks/useSkus';
import { useSkuLifecycle } from './SkuLifecycleContext';
import { ImageUploadArea, MetricCell, SizeRunEditor } from './shared';
import { useToast } from '@/components/ui/toast';

interface ProductionPhaseProps {
  sku: SKU;
  onUpdate: (updates: Partial<SKU>) => Promise<void>;
  onImageUpload: (file: File, field: string) => void;
  uploading: string | null;
}

const STEPS = [
  { id: 'color', label: 'Real Sample Validation', icon: Palette },
  { id: 'fit', label: 'Fit & Size Run', icon: Ruler },
  { id: 'sample', label: 'Production Sample', icon: Package },
  { id: 'signoff', label: 'Final Sign-off', icon: ShieldCheck },
];

type ValidationStatus = 'pending' | 'approved' | 'issues';

export function ProductionPhase({ sku, onUpdate, onImageUpload, uploading }: ProductionPhaseProps) {
  const t = useTranslation();
  const { language } = useLanguage();
  const { toast } = useToast();
  const { colorways } = useSkuLifecycle();
  const skuColorways = colorways.filter(c => c.sku_id === sku.id);

  // Persisted production data
  const pd = sku.production_data || {};
  const colorStatus = pd.color_status || 'pending';
  const fitStatus = pd.fit_status || 'pending';
  const colorNotes = pd.color_notes || '';
  const fitNotes = pd.fit_notes || '';
  const confirmedStepIds = new Set(pd.confirmed_steps || []);

  // Step navigation — same pattern as SketchPhase
  const [activeStep, setActiveStep] = useState(() => {
    if (confirmedStepIds.has('color') && confirmedStepIds.has('fit') && confirmedStepIds.has('sample')) return 3;
    if (confirmedStepIds.has('color') && confirmedStepIds.has('fit')) return 2;
    if (confirmedStepIds.has('color')) return 1;
    return 0;
  });

  const stepLabel = (key: string): string => (t.skuPhases as Record<string, string>)?.[key] || key;

  // Persist helpers
  const updatePD = useCallback(async (patch: Record<string, unknown>) => {
    await onUpdate({ production_data: { ...pd, ...patch } } as Partial<SKU>);
  }, [pd, onUpdate]);

  const confirmStep = useCallback(async (stepId: string) => {
    const steps = [...(pd.confirmed_steps || [])];
    if (!steps.includes(stepId)) steps.push(stepId);
    await updatePD({ confirmed_steps: steps });
    const nextIdx = STEPS.findIndex(s => s.id === stepId) + 1;
    if (nextIdx < STEPS.length) setActiveStep(nextIdx);
  }, [pd, updatePD]);

  const isStepConfirmed = (id: string) => confirmedStepIds.has(id);
  const bothApproved = colorStatus === 'approved' && fitStatus === 'approved';

  return (
    <div className="space-y-4">

      {/* ── Step breadcrumbs (EvolutionStrip handles the visual context now) ── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((step, idx) => {
          const confirmed = isStepConfirmed(step.id);
          const active = idx === activeStep;
          return (
            <React.Fragment key={step.id}>
              {idx > 0 && <ChevronRight className="h-3 w-3 text-carbon/10 shrink-0" />}
              <button
                onClick={() => setActiveStep(idx)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium tracking-[0.06em] uppercase transition-colors ${
                  active
                    ? 'bg-carbon text-crema'
                    : confirmed
                      ? 'bg-carbon/[0.06] text-carbon/60'
                      : 'text-carbon/30 hover:text-carbon/50'
                }`}
              >
                {confirmed && !active ? <Check className="h-2.5 w-2.5" /> : null}
                {step.label}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Step content ── */}
      <div className="border border-carbon/[0.06] bg-white overflow-hidden">
        <div className="px-5 py-4">

          {/* Step 0: Color Validation */}
          {activeStep === 0 && (
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-semibold tracking-[0.1em] uppercase text-carbon/30 mb-2">
                  {stepLabel('colorValidation') || 'Real Sample Validation'}
                </p>
                <p className="text-[11px] font-light text-carbon/40 mb-4">
                  {stepLabel('colorValidationDesc') || 'Compare the real production sample with your approved design. Do colors and materials match?'}
                </p>
              </div>

              {/* Colorway swatches for reference */}
              {skuColorways.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {skuColorways.map(cw => (
                    <div key={cw.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-carbon/[0.02] border border-carbon/[0.04]">
                      <div className="w-5 h-5 border border-carbon/[0.06]" style={{ backgroundColor: cw.hex_primary }} />
                      <span className="text-[10px] text-carbon/50">{cw.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-2">{stepLabel('colorMatchStatus') || 'Color Match'}</p>
                <div className="flex items-center gap-0.5">
                  {(['pending', 'issues', 'approved'] as const).map(s => (
                    <button key={s} onClick={() => updatePD({ color_status: s })}
                      className={`px-3 py-1.5 text-[9px] font-medium tracking-[0.06em] uppercase transition-colors ${
                        colorStatus === s
                          ? s === 'approved' ? 'text-[#2d6a4f] bg-[#2d6a4f]/8' : s === 'issues' ? 'text-[#c77000] bg-[#c77000]/8' : 'text-carbon bg-carbon/[0.06]'
                          : 'text-carbon/25 hover:text-carbon/40'
                      }`}>
                      {s === 'pending' ? 'Pending' : s === 'issues' ? 'Issues' : 'Approved'}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                defaultValue={colorNotes}
                onBlur={(e) => { if (e.target.value !== colorNotes) updatePD({ color_notes: e.target.value }); }}
                placeholder={stepLabel('colorValidationNotes') || 'Color accuracy notes, deviations observed...'}
                className="w-full h-16 p-2.5 bg-carbon/[0.02] border border-carbon/[0.04] text-[12px] font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.1] transition-colors"
              />
            </div>
          )}

          {/* Step 1: Fit & Size Run */}
          {activeStep === 1 && (
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-semibold tracking-[0.1em] uppercase text-carbon/30 mb-2">
                  {stepLabel('fitValidation') || 'Fit & Size Run'}
                </p>
                <p className="text-[11px] font-light text-carbon/40 mb-4">
                  {stepLabel('fitValidationDesc') || 'Verify measurements match specifications, then define your size run distribution.'}
                </p>
              </div>

              <div>
                <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-2">{stepLabel('fitMatchStatus') || 'Fit & Measurements'}</p>
                <div className="flex items-center gap-0.5">
                  {(['pending', 'issues', 'approved'] as const).map(s => (
                    <button key={s} onClick={() => updatePD({ fit_status: s })}
                      className={`px-3 py-1.5 text-[9px] font-medium tracking-[0.06em] uppercase transition-colors ${
                        fitStatus === s
                          ? s === 'approved' ? 'text-[#2d6a4f] bg-[#2d6a4f]/8' : s === 'issues' ? 'text-[#c77000] bg-[#c77000]/8' : 'text-carbon bg-carbon/[0.06]'
                          : 'text-carbon/25 hover:text-carbon/40'
                      }`}>
                      {s === 'pending' ? 'Pending' : s === 'issues' ? 'Issues' : 'Approved'}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                defaultValue={fitNotes}
                onBlur={(e) => { if (e.target.value !== fitNotes) updatePD({ fit_notes: e.target.value }); }}
                placeholder={stepLabel('fitValidationNotes') || 'Fit notes, measurement deviations, corrections needed...'}
                className="w-full h-16 p-2.5 bg-carbon/[0.02] border border-carbon/[0.04] text-[12px] font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.1] transition-colors"
              />

              <div>
                <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-2">{stepLabel('sizeRunFinal') || 'Size Run Distribution'}</p>
                <div className="bg-carbon/[0.02] border border-carbon/[0.04] p-3">
                  <SizeRunEditor
                    category={sku.category}
                    sizeRun={sku.size_run || {}}
                    buyUnits={sku.buy_units}
                    onUpdate={(sr) => onUpdate({ size_run: sr } as Partial<SKU>)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Production Sample + Factory Order Details */}
          {activeStep === 2 && (
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-carbon/50 mb-2">
                  {stepLabel('productionSample') || 'Production Sample & Order Details'}
                </p>
                <p className="text-[12px] text-carbon/50 mb-4">
                  {stepLabel('prodSampleDesc') || 'Upload the final sample, verify financials, and fill in factory order details.'}
                </p>
              </div>

              {/* Sample + Financial */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="text-[10px] text-carbon/50 uppercase tracking-wide font-medium">{stepLabel('finalSample') || 'Final Sample Photo'}</p>
                  <ImageUploadArea
                    imageUrl={sku.production_sample_url}
                    uploading={uploading === 'production_sample_url'}
                    placeholder={stepLabel('uploadProductionSample') || 'Upload production sample'}
                    onUpload={(file) => onImageUpload(file, 'production_sample_url')}
                    onRemove={() => onUpdate({ production_sample_url: undefined })}
                    aspectClass="aspect-[4/3]"
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] text-carbon/50 uppercase tracking-wide font-medium">{stepLabel('financialRecap') || 'Financial Recap'}</p>
                  <div className="bg-white border border-carbon/[0.06] p-3">
                    <div className="grid grid-cols-3 gap-2">
                      <MetricCell label="PVP" value={`€${sku.pvp}`} />
                      <MetricCell label="COGS" value={`€${sku.cost}`} editable onChange={(v) => {
                        const val = Number(v.replace(/[^0-9.]/g, ''));
                        if (!isNaN(val)) onUpdate({ cost: val, margin: sku.pvp > 0 ? Math.round(((sku.pvp - val) / sku.pvp) * 10000) / 100 : 0 });
                      }} />
                      <MetricCell label={stepLabel('margin') || 'Margin'} value={`${Math.round(sku.margin)}%`} />
                    </div>
                  </div>

                  {/* Evolution timeline */}
                  {(sku.sketch_url || sku.render_url) && (
                    <div>
                      <p className="text-[10px] text-carbon/50 uppercase tracking-wide font-medium mb-1.5">{stepLabel('evolution') || 'Evolution'}</p>
                      <div className="flex gap-1">
                        {sku.sketch_url && (
                          <div className="flex-1 border border-carbon/[0.06] overflow-hidden aspect-square bg-white">
                            <img src={sku.sketch_url} alt="" className="w-full h-full object-contain" />
                          </div>
                        )}
                        {sku.render_url && (
                          <div className="flex-1 border border-carbon/[0.06] overflow-hidden aspect-square bg-white">
                            <img src={sku.render_url} alt="" className="w-full h-full object-contain" />
                          </div>
                        )}
                        {(sku.render_urls as Record<string, string>)?.['3d'] && (
                          <div className="flex-1 border border-carbon/[0.06] overflow-hidden aspect-square bg-white">
                            <img src={(sku.render_urls as Record<string, string>)['3d']} alt="" className="w-full h-full object-contain" />
                          </div>
                        )}
                        {sku.production_sample_url && (
                          <div className="flex-1 border border-carbon/[0.06] overflow-hidden aspect-square">
                            <img src={sku.production_sample_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 mt-1">
                        {sku.sketch_url && <span className="flex-1 text-[8px] text-carbon/35 text-center uppercase">Sketch</span>}
                        {sku.render_url && <span className="flex-1 text-[8px] text-carbon/35 text-center uppercase">Color</span>}
                        {(sku.render_urls as Record<string, string>)?.['3d'] && <span className="flex-1 text-[8px] text-carbon/35 text-center uppercase">3D</span>}
                        {sku.production_sample_url && <span className="flex-1 text-[8px] text-carbon/35 text-center uppercase">Final</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Factory Order Details */}
              <div className="border-t border-carbon/[0.06] pt-5">
                <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-carbon/50 mb-4">{stepLabel('factoryOrderDetails') || 'Factory Order Details'}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-carbon/50 uppercase tracking-wide font-medium mb-1.5">{stepLabel('factoryName') || 'Factory'}</p>
                    <input defaultValue={pd.factory_name || sku.sourcing_data?.factory || ''}
                      onBlur={(e) => updatePD({ factory_name: e.target.value })}
                      className="w-full text-[13px] text-carbon bg-transparent border-b border-carbon/[0.08] focus:border-carbon/[0.2] focus:outline-none pb-1.5"
                      placeholder="e.g. Calzaturificio Molteni" />
                  </div>
                  <div>
                    <p className="text-[10px] text-carbon/50 uppercase tracking-wide font-medium mb-1.5">{stepLabel('factoryOriginLabel') || 'Origin'}</p>
                    <input defaultValue={pd.factory_origin || sku.sourcing_data?.origin || ''}
                      onBlur={(e) => updatePD({ factory_origin: e.target.value })}
                      className="w-full text-[13px] text-carbon bg-transparent border-b border-carbon/[0.08] focus:border-carbon/[0.2] focus:outline-none pb-1.5"
                      placeholder="e.g. Montebelluna, Italy" />
                  </div>
                  <div>
                    <p className="text-[10px] text-carbon/50 uppercase tracking-wide font-medium mb-1.5">{stepLabel('factoryContactLabel') || 'Contact'}</p>
                    <input defaultValue={pd.factory_contact || sku.sourcing_data?.contact || ''}
                      onBlur={(e) => updatePD({ factory_contact: e.target.value })}
                      className="w-full text-[13px] text-carbon bg-transparent border-b border-carbon/[0.08] focus:border-carbon/[0.2] focus:outline-none pb-1.5"
                      placeholder="name@factory.com" />
                  </div>
                  <div>
                    <p className="text-[10px] text-carbon/50 uppercase tracking-wide font-medium mb-1.5">{stepLabel('targetDelivery') || 'Target Delivery Date'}</p>
                    <input type="date" defaultValue={pd.target_delivery_date || ''}
                      onBlur={(e) => updatePD({ target_delivery_date: e.target.value })}
                      className="w-full text-[13px] text-carbon bg-transparent border-b border-carbon/[0.08] focus:border-carbon/[0.2] focus:outline-none pb-1.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-carbon/50 uppercase tracking-wide font-medium mb-1.5">{stepLabel('orderQuantity') || 'Order Quantity'}</p>
                    <input type="number" defaultValue={pd.order_quantity || sku.buy_units}
                      onBlur={(e) => updatePD({ order_quantity: Number(e.target.value) || sku.buy_units })}
                      className="w-full text-[13px] text-carbon bg-transparent border-b border-carbon/[0.08] focus:border-carbon/[0.2] focus:outline-none pb-1.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-carbon/50 uppercase tracking-wide font-medium mb-1.5">{stepLabel('unitCostFinal') || 'Unit Cost (Final)'}</p>
                    <input type="number" step="0.01" defaultValue={pd.unit_cost_final || sku.cost}
                      onBlur={(e) => updatePD({ unit_cost_final: Number(e.target.value) || sku.cost })}
                      className="w-full text-[13px] text-carbon bg-transparent border-b border-carbon/[0.08] focus:border-carbon/[0.2] focus:outline-none pb-1.5"
                      placeholder={`€${sku.cost}`} />
                  </div>
                  <div>
                    <p className="text-[10px] text-carbon/50 uppercase tracking-wide font-medium mb-1.5">{stepLabel('paymentTerms') || 'Payment Terms'}</p>
                    <input defaultValue={pd.payment_terms || ''}
                      onBlur={(e) => updatePD({ payment_terms: e.target.value })}
                      className="w-full text-[13px] text-carbon bg-transparent border-b border-carbon/[0.08] focus:border-carbon/[0.2] focus:outline-none pb-1.5"
                      placeholder="e.g. 30% deposit, 70% on delivery" />
                  </div>
                  <div>
                    <p className="text-[10px] text-carbon/50 uppercase tracking-wide font-medium mb-1.5">{stepLabel('shippingMethod') || 'Shipping'}</p>
                    <input defaultValue={pd.shipping_method || ''}
                      onBlur={(e) => updatePD({ shipping_method: e.target.value })}
                      className="w-full text-[13px] text-carbon bg-transparent border-b border-carbon/[0.08] focus:border-carbon/[0.2] focus:outline-none pb-1.5"
                      placeholder="e.g. FOB Shanghai, DDP Barcelona" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-[10px] text-carbon/50 uppercase tracking-wide font-medium mb-1.5">{stepLabel('specialInstructions') || 'Special Instructions'}</p>
                  <textarea defaultValue={pd.special_instructions || ''}
                    onBlur={(e) => updatePD({ special_instructions: e.target.value })}
                    className="w-full h-16 p-3 bg-carbon/[0.02] border border-carbon/[0.06] text-[13px] text-carbon resize-none focus:outline-none focus:border-carbon/[0.15]"
                    placeholder={stepLabel('specialInstructionsPlaceholder') || 'Packaging, labeling, quality requirements...'} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Final Sign-off + PO Generation */}
          {activeStep === 3 && (
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-carbon/50 mb-2">
                  {stepLabel('finalSignOff') || 'Final Sign-off'}
                </p>
                <p className="text-[12px] text-carbon/50 mb-4">
                  {stepLabel('signOffDesc') || 'Review all validations, verify order details, and approve for production.'}
                </p>
              </div>

              {/* Validation checklist */}
              <div className="space-y-2">
                {[
                  { label: stepLabel('colorValidation') || 'Color Validation', ok: colorStatus === 'approved' },
                  { label: stepLabel('fitValidation') || 'Fit Validation', ok: fitStatus === 'approved' },
                  { label: stepLabel('sizeRunFinal') || 'Size Run', ok: Object.keys(sku.size_run || {}).length > 0 },
                  { label: stepLabel('productionSample') || 'Production Sample', ok: !!sku.production_sample_url },
                  { label: stepLabel('factoryDetails') || 'Factory Details', ok: !!(pd.factory_name || sku.sourcing_data?.factory) },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 py-2 px-3 bg-carbon/[0.01] border border-carbon/[0.04]">
                    {item.ok ? <Check className="h-4 w-4 text-[#2d6a4f]" /> : <AlertCircle className="h-4 w-4 text-carbon/20" />}
                    <span className={`text-[12px] ${item.ok ? 'text-carbon' : 'text-carbon/35'}`}>{item.label}</span>
                    {item.ok && <span className="ml-auto text-[10px] font-medium tracking-[0.06em] uppercase text-[#2d6a4f]/70">Approved</span>}
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              {(pd.factory_name || sku.sourcing_data?.factory) && (
                <div className="border border-carbon/[0.06] bg-carbon/[0.01] p-4 space-y-3">
                  <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-carbon/50">{stepLabel('orderSummary') || 'Order Summary'}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <p className="text-[10px] text-carbon/40 uppercase tracking-wide font-medium">Factory</p>
                      <p className="text-[13px] text-carbon mt-0.5">{pd.factory_name || sku.sourcing_data?.factory || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-carbon/40 uppercase tracking-wide font-medium">Quantity</p>
                      <p className="text-[13px] text-carbon mt-0.5">{(pd.order_quantity || sku.buy_units).toLocaleString()} units</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-carbon/40 uppercase tracking-wide font-medium">Unit Cost</p>
                      <p className="text-[13px] text-carbon mt-0.5">€{pd.unit_cost_final || sku.cost}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-carbon/40 uppercase tracking-wide font-medium">Total</p>
                      <p className="text-[13px] font-medium text-carbon mt-0.5">€{((pd.order_quantity || sku.buy_units) * (pd.unit_cost_final || sku.cost)).toLocaleString()}</p>
                    </div>
                  </div>
                  {(pd.payment_terms || pd.shipping_method || pd.target_delivery_date) && (
                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-carbon/[0.04]">
                      {pd.target_delivery_date && <div><p className="text-[10px] text-carbon/40 uppercase tracking-wide font-medium">Delivery</p><p className="text-[12px] text-carbon mt-0.5">{pd.target_delivery_date}</p></div>}
                      {pd.payment_terms && <div><p className="text-[10px] text-carbon/40 uppercase tracking-wide font-medium">Payment</p><p className="text-[12px] text-carbon mt-0.5">{pd.payment_terms}</p></div>}
                      {pd.shipping_method && <div><p className="text-[10px] text-carbon/40 uppercase tracking-wide font-medium">Shipping</p><p className="text-[12px] text-carbon mt-0.5">{pd.shipping_method}</p></div>}
                    </div>
                  )}
                  {pd.po_number && (
                    <div className="pt-2 border-t border-carbon/[0.04]">
                      <p className="text-[10px] text-carbon/40 uppercase tracking-wide font-medium">PO Number</p>
                      <p className="text-[14px] font-medium text-carbon mt-0.5 font-mono">{pd.po_number}</p>
                    </div>
                  )}
                </div>
              )}

              {bothApproved && sku.production_sample_url ? (
                <div className="p-4 bg-[#2d6a4f]/5 border border-[#2d6a4f]/10 flex items-center gap-3">
                  <Check className="h-5 w-5 text-[#2d6a4f]" />
                  <div>
                    <p className="text-[13px] text-carbon">{stepLabel('readyForProduction') || 'Ready for production'}</p>
                    <p className="text-[11px] text-carbon/40 mt-0.5">{stepLabel('signOffComplete') || 'All validations passed. Generate a Purchase Order or approve directly.'}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-carbon/[0.02] border border-carbon/[0.06]">
                  <p className="text-[11px] text-carbon/40">{stepLabel('signOffPending') || 'Complete all validations above to approve this SKU for production.'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t border-carbon/[0.04] flex items-center justify-between">
          {activeStep > 0 ? (
            <button onClick={() => setActiveStep(activeStep - 1)} className="text-[11px] font-medium tracking-[0.06em] uppercase text-carbon/40 hover:text-carbon/60 transition-colors">
              {stepLabel('back') || 'Back'}
            </button>
          ) : <div />}
          <div className="flex items-center gap-2">
            {activeStep < STEPS.length - 1 ? (
              <button onClick={() => confirmStep(STEPS[activeStep].id)} className="flex items-center gap-1.5 px-4 py-2 border border-carbon/[0.12] text-carbon/60 text-[11px] font-medium tracking-[0.06em] uppercase hover:bg-carbon hover:text-crema transition-colors rounded-full">
                <Check className="h-3 w-3" /> {stepLabel('validateContinue') || 'Validate & Continue'}
              </button>
            ) : (
              <>
                {/* Generate PO button */}
                {bothApproved && sku.production_sample_url && !pd.po_number && (
                  <button
                    onClick={async () => {
                      const poNum = `PO-${sku.family?.slice(0, 3).toUpperCase() || 'SKU'}-${sku.name?.slice(0, 4).toUpperCase() || '0000'}-${Date.now().toString(36).toUpperCase()}`;
                      await updatePD({ po_number: poNum, po_generated_at: new Date().toISOString() });
                      toast(`PO ${poNum} generated`, 'success');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 border border-carbon/[0.12] text-carbon/60 text-[11px] font-medium tracking-[0.06em] uppercase hover:bg-carbon hover:text-crema transition-colors rounded-full"
                  >
                    <Package className="h-3 w-3" /> {stepLabel('generatePO') || 'Generate PO'}
                  </button>
                )}
                {/* Download PO */}
                {pd.po_number && (
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/purchase-order?skuId=${sku.id}`);
                        if (!res.ok) { toast('Export failed', 'error'); return; }
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${pd.po_number}.xlsx`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } catch { toast('Export failed', 'error'); }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 border border-carbon/[0.12] text-carbon/60 text-[11px] font-medium tracking-[0.06em] uppercase hover:bg-carbon hover:text-crema transition-colors rounded-full"
                  >
                    <Package className="h-3 w-3" /> {stepLabel('downloadPO') || 'Download PO'}
                  </button>
                )}
                {/* Approve for Production */}
                {bothApproved && sku.production_sample_url ? (
                  <button
                    onClick={async () => {
                      if (!pd.po_number) {
                        const poNum = `PO-${sku.family?.slice(0, 3).toUpperCase() || 'SKU'}-${sku.name?.slice(0, 4).toUpperCase() || '0000'}-${Date.now().toString(36).toUpperCase()}`;
                        await updatePD({ po_number: poNum, po_generated_at: new Date().toISOString() });
                      }
                      await onUpdate({ production_approved: true, design_phase: 'completed' as SKU['design_phase'] });
                      toast(stepLabel('productionApproved') || 'Production approved!', 'success');
                    }}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-[#2d6a4f] text-white text-[11px] font-medium tracking-[0.06em] uppercase hover:bg-[#245a42] transition-colors rounded-full"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> {stepLabel('approveProduction') || 'Approve for Production'}
                  </button>
                ) : (
                  <button disabled className="flex items-center gap-1.5 px-4 py-2 border border-carbon/[0.06] text-carbon/25 text-[11px] font-medium tracking-[0.06em] uppercase cursor-not-allowed rounded-full">
                    <ShieldCheck className="h-3 w-3" /> {stepLabel('approveProduction') || 'Approve for Production'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
