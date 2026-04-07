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

      {/* ── Visual product context — always visible ── */}
      <div className="border border-carbon/[0.06] bg-white overflow-hidden">
        <div className="grid grid-cols-3 gap-px bg-carbon/[0.04]">
          {/* Colored sketch */}
          <div className="bg-white p-2">
            {sku.render_url ? (
              <img src={sku.render_url} alt="Colored sketch" className="w-full h-32 object-contain" />
            ) : sku.sketch_url ? (
              <img src={sku.sketch_url} alt="Sketch" className="w-full h-32 object-contain" />
            ) : (
              <div className="h-32 flex items-center justify-center text-[9px] text-carbon/15">No sketch</div>
            )}
            <p className="text-[7px] text-carbon/20 uppercase tracking-wider text-center mt-1">Sketch</p>
          </div>
          {/* 3D render */}
          <div className="bg-white p-2">
            {(sku.render_urls as Record<string, string>)?.['3d'] ? (
              <img src={(sku.render_urls as Record<string, string>)['3d']} alt="3D render" className="w-full h-32 object-contain" />
            ) : (
              <div className="h-32 flex items-center justify-center text-[9px] text-carbon/15">No render</div>
            )}
            <p className="text-[7px] text-carbon/20 uppercase tracking-wider text-center mt-1">3D Render</p>
          </div>
          {/* Real Sample */}
          <div className="bg-white p-2">
            {sku.production_sample_url ? (
              <img src={sku.production_sample_url} alt="Real sample" className="w-full h-32 object-contain" />
            ) : (
              <div className="h-32 flex flex-col items-center justify-center gap-1">
                <label className="cursor-pointer flex flex-col items-center gap-1 hover:opacity-70 transition-opacity">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageUpload(f, 'production_sample_url'); }} />
                  <Package className="h-5 w-5 text-carbon/10" />
                  <span className="text-[8px] text-carbon/20">Upload sample</span>
                </label>
              </div>
            )}
            <p className="text-[7px] text-carbon/20 uppercase tracking-wider text-center mt-1">Real Sample</p>
          </div>
        </div>
      </div>

      {/* ── Step breadcrumbs — same pattern as SketchPhase ── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((step, idx) => {
          const confirmed = isStepConfirmed(step.id);
          const active = idx === activeStep;
          return (
            <React.Fragment key={step.id}>
              {idx > 0 && <ChevronRight className="h-3 w-3 text-carbon/10 shrink-0" />}
              <button
                onClick={() => setActiveStep(idx)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-medium tracking-[0.08em] uppercase transition-colors ${
                  active
                    ? 'bg-carbon text-crema'
                    : confirmed
                      ? 'bg-carbon/[0.06] text-carbon/50'
                      : 'text-carbon/25 hover:text-carbon/40'
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

          {/* Step 2: Production Sample */}
          {activeStep === 2 && (
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-semibold tracking-[0.1em] uppercase text-carbon/30 mb-2">
                  {stepLabel('productionSample') || 'Production Sample'}
                </p>
                <p className="text-[11px] font-light text-carbon/40 mb-4">
                  {stepLabel('prodSampleDesc') || 'Upload the final production sample photo and verify financial recap.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="text-[8px] text-carbon/25 uppercase tracking-wider">{stepLabel('finalSample') || 'Final Sample Photo'}</p>
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
                  <p className="text-[8px] text-carbon/25 uppercase tracking-wider">{stepLabel('financialRecap') || 'Financial Recap'}</p>
                  <div className="bg-white border border-carbon/[0.04] p-3">
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
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
                      <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-1.5">{stepLabel('evolution') || 'Evolution'}</p>
                      <div className="flex gap-0.5">
                        {sku.sketch_url && (
                          <div className="flex-1 border border-carbon/[0.04] overflow-hidden aspect-square bg-white">
                            <img src={sku.sketch_url} alt="" className="w-full h-full object-contain" />
                          </div>
                        )}
                        {sku.render_url && (
                          <div className="flex-1 border border-carbon/[0.04] overflow-hidden aspect-square bg-white">
                            <img src={sku.render_url} alt="" className="w-full h-full object-contain" />
                          </div>
                        )}
                        {(sku.render_urls as Record<string, string>)?.['3d'] && (
                          <div className="flex-1 border border-carbon/[0.04] overflow-hidden aspect-square bg-white">
                            <img src={(sku.render_urls as Record<string, string>)['3d']} alt="" className="w-full h-full object-contain" />
                          </div>
                        )}
                        {sku.production_sample_url && (
                          <div className="flex-1 border border-carbon/[0.04] overflow-hidden aspect-square">
                            <img src={sku.production_sample_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-0.5 mt-0.5">
                        {sku.sketch_url && <span className="flex-1 text-[6px] text-carbon/15 text-center uppercase">Sketch</span>}
                        {sku.render_url && <span className="flex-1 text-[6px] text-carbon/15 text-center uppercase">Color</span>}
                        {(sku.render_urls as Record<string, string>)?.['3d'] && <span className="flex-1 text-[6px] text-carbon/15 text-center uppercase">3D</span>}
                        {sku.production_sample_url && <span className="flex-1 text-[6px] text-carbon/15 text-center uppercase">Final</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Final Sign-off */}
          {activeStep === 3 && (
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-semibold tracking-[0.1em] uppercase text-carbon/30 mb-2">
                  {stepLabel('finalSignOff') || 'Final Sign-off'}
                </p>
                <p className="text-[11px] font-light text-carbon/40 mb-4">
                  {stepLabel('signOffDesc') || 'Review all validations and approve this SKU for production.'}
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { label: stepLabel('colorValidation') || 'Color Validation', ok: colorStatus === 'approved' },
                  { label: stepLabel('fitValidation') || 'Fit Validation', ok: fitStatus === 'approved' },
                  { label: stepLabel('sizeRunFinal') || 'Size Run', ok: Object.keys(sku.size_run || {}).length > 0 },
                  { label: stepLabel('productionSample') || 'Production Sample', ok: !!sku.production_sample_url },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-1.5 px-3 bg-carbon/[0.01] border border-carbon/[0.03]">
                    {item.ok ? <Check className="h-3.5 w-3.5 text-[#2d6a4f]" /> : <AlertCircle className="h-3.5 w-3.5 text-carbon/15" />}
                    <span className={`text-[11px] ${item.ok ? 'text-carbon' : 'text-carbon/25'}`}>{item.label}</span>
                    {item.ok && <span className="ml-auto text-[8px] font-medium tracking-[0.08em] uppercase text-[#2d6a4f]/60">Approved</span>}
                  </div>
                ))}
              </div>

              {bothApproved && sku.production_sample_url ? (
                <div className="p-4 bg-[#2d6a4f]/5 border border-[#2d6a4f]/8 flex items-center gap-3">
                  <Check className="h-5 w-5 text-[#2d6a4f]" />
                  <div>
                    <p className="text-[12px] font-light text-carbon">{stepLabel('readyForProduction') || 'Ready for production'}</p>
                    <p className="text-[9px] text-carbon/30 mt-0.5">{stepLabel('signOffComplete') || 'All validations passed. This SKU can be included in a production order.'}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-carbon/[0.02] border border-carbon/[0.04]">
                  <p className="text-[10px] text-carbon/30">{stepLabel('signOffPending') || 'Complete all validations above to approve this SKU for production.'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer — Validate & Continue ── */}
        <div className="px-5 py-3 border-t border-carbon/[0.04] flex items-center justify-between">
          {activeStep > 0 ? (
            <button onClick={() => setActiveStep(activeStep - 1)} className="text-[10px] font-medium tracking-[0.06em] uppercase text-carbon/30 hover:text-carbon/50 transition-colors">
              {stepLabel('back') || 'Back'}
            </button>
          ) : <div />}
          {activeStep < STEPS.length - 1 ? (
            <button onClick={() => confirmStep(STEPS[activeStep].id)} className="flex items-center gap-1.5 px-4 py-2 border border-carbon/[0.08] text-carbon/50 text-[10px] font-medium tracking-[0.08em] uppercase hover:bg-carbon hover:text-crema transition-colors">
              <Check className="h-3 w-3" /> {stepLabel('validateContinue') || 'Validate & Continue'}
            </button>
          ) : bothApproved && sku.production_sample_url ? (
            <button
              onClick={async () => {
                await onUpdate({ production_approved: true, design_phase: 'completed' as SKU['design_phase'] });
                toast(stepLabel('productionApproved') || 'Production approved!', 'success');
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#2d6a4f] text-white text-[10px] font-medium tracking-[0.08em] uppercase hover:bg-[#245a42] transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> {stepLabel('approveProduction') || 'Approve for Production'}
            </button>
          ) : (
            <button disabled className="flex items-center gap-1.5 px-4 py-2 border border-carbon/[0.04] text-carbon/20 text-[10px] font-medium tracking-[0.08em] uppercase cursor-not-allowed">
              <ShieldCheck className="h-3 w-3" /> {stepLabel('approveProduction') || 'Approve for Production'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
