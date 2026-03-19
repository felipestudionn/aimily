'use client';

import React, { useState } from 'react';
import { Palette, Ruler, ShieldCheck, Package, Check, AlertCircle, Camera, X } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { SKU } from '@/hooks/useSkus';
import { useSkuLifecycle } from './SkuLifecycleContext';
import { ImageUploadArea, MetricCell, SizeRunEditor } from './shared';

interface ProductionPhaseProps {
  sku: SKU;
  onUpdate: (updates: Partial<SKU>) => Promise<void>;
  onImageUpload: (file: File, field: string) => void;
  uploading: string | null;
}

type ValidationStatus = 'pending' | 'approved' | 'issues';

export function ProductionPhase({ sku, onUpdate, onImageUpload, uploading }: ProductionPhaseProps) {
  const t = useTranslation();
  const { colorways } = useSkuLifecycle();
  const skuColorways = colorways.filter(c => c.sku_id === sku.id);

  // Simple validation state stored in designData or as local state
  // For now, derive from existing data
  const [colorStatus, setColorStatus] = useState<ValidationStatus>('pending');
  const [fitStatus, setFitStatus] = useState<ValidationStatus>('pending');
  const [colorNotes, setColorNotes] = useState('');
  const [fitNotes, setFitNotes] = useState('');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [confirmedSteps, setConfirmedSteps] = useState<Set<string>>(new Set());

  const bothApproved = colorStatus === 'approved' && fitStatus === 'approved';

  const confirmStep = (stepId: string) => {
    setConfirmedSteps(prev => { const n = new Set(prev); n.add(stepId); return n; });
    setExpandedStep(null);
  };

  const steps = [
    { id: 'color', icon: Palette, name: t.skuPhases?.colorValidation || 'Color Validation', desc: t.skuPhases?.colorValidationDesc || 'Compare production colors with approved colorways' },
    { id: 'fit', icon: Ruler, name: t.skuPhases?.fitValidation || 'Fit Validation', desc: t.skuPhases?.fitValidationDesc || 'Verify measurements and fit match specifications' },
    { id: 'sample', icon: Package, name: t.skuPhases?.productionSample || 'Production Sample', desc: t.skuPhases?.prodSampleDesc || 'Final sample photo, size run, and financial recap' },
    { id: 'signoff', icon: ShieldCheck, name: t.skuPhases?.finalSignOff || 'Final Sign-off', desc: t.skuPhases?.signOffDesc || 'Approve this SKU for production' },
  ];

  return (
    <div className="space-y-3">
      {steps.map((step) => {
        const isExpanded = expandedStep === step.id;
        const isConfirmed = confirmedSteps.has(step.id);
        const Icon = step.icon;

        if (isExpanded) {
          return (
            <div key={step.id} className="bg-white border border-carbon/[0.06] overflow-hidden" style={{ animation: 'fadeIn 0.2s ease-out' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-carbon/[0.06]">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-carbon/40" />
                  <div>
                    <h3 className="text-lg font-light text-carbon tracking-tight">{step.name}</h3>
                    <p className="text-[11px] text-carbon/40 mt-0.5">{step.desc}</p>
                  </div>
                </div>
                <button onClick={() => setExpandedStep(null)} className="w-8 h-8 flex items-center justify-center text-carbon/30 hover:text-carbon/60">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-5">
                {step.id === 'color' && (
                  <ColorValidationContent
                    colorways={skuColorways}
                    status={colorStatus}
                    onStatusChange={setColorStatus}
                    notes={colorNotes}
                    onNotesChange={setColorNotes}
                    t={t}
                  />
                )}
                {step.id === 'fit' && (
                  <FitValidationContent
                    sku={sku}
                    status={fitStatus}
                    onStatusChange={setFitStatus}
                    notes={fitNotes}
                    onNotesChange={setFitNotes}
                    t={t}
                  />
                )}
                {step.id === 'sample' && (
                  <ProductionSampleContent sku={sku} onUpdate={onUpdate} onImageUpload={onImageUpload} uploading={uploading} t={t} />
                )}
                {step.id === 'signoff' && (
                  <SignOffContent sku={sku} colorStatus={colorStatus} fitStatus={fitStatus} bothApproved={bothApproved} t={t} />
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-carbon/[0.06] flex items-center justify-between">
                <button onClick={() => setExpandedStep(null)} className="text-[11px] font-medium tracking-[0.08em] uppercase text-carbon/40 hover:text-carbon transition-colors">
                  {t.skuPhases?.backToGrid || 'Back'}
                </button>
                <button onClick={() => confirmStep(step.id)} className="flex items-center gap-2 px-6 py-2.5 bg-carbon text-crema text-[10px] font-medium tracking-[0.15em] uppercase hover:bg-carbon/90 transition-colors">
                  <Check className="h-3.5 w-3.5" /> {t.skuPhases?.validateContinue || 'Validate & Continue'}
                </button>
              </div>
            </div>
          );
        }

        // Collapsed card
        return (
          <button key={step.id} onClick={() => setExpandedStep(step.id)}
            className={`w-full text-left bg-white border p-5 flex items-center gap-4 transition-all hover:border-carbon/15 ${isConfirmed ? 'border-carbon/[0.12]' : 'border-carbon/[0.06]'}`}>
            <div className={`w-10 h-10 flex items-center justify-center shrink-0 ${isConfirmed ? 'bg-carbon text-crema' : 'bg-carbon/[0.04] text-carbon/30'}`}>
              {isConfirmed ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-light text-carbon tracking-tight">{step.name}</h3>
              <p className="text-[11px] text-carbon/35 mt-0.5 truncate">{step.desc}</p>
            </div>
            {isConfirmed && <span className="text-[9px] font-medium tracking-[0.1em] uppercase text-carbon/25">{t.skuPhases?.confirmed || 'Confirmed'}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ── Color Validation ── */
function ColorValidationContent({ colorways, status, onStatusChange, notes, onNotesChange, t }: {
  colorways: { id: string; name: string; hex_primary: string }[];
  status: ValidationStatus; onStatusChange: (s: ValidationStatus) => void;
  notes: string; onNotesChange: (n: string) => void;
  t: ReturnType<typeof useTranslation>;
}) {
  return (
    <div className="space-y-5">
      {/* Approved colorways reference */}
      {colorways.length > 0 && (
        <div>
          <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-2">{t.skuPhases?.approvedColorways || 'Approved Colorways'}</p>
          <div className="flex flex-wrap gap-3">
            {colorways.map(cw => (
              <div key={cw.id} className="flex items-center gap-2 px-3 py-2 bg-carbon/[0.02] border border-carbon/[0.06]">
                <div className="w-6 h-6 border border-carbon/[0.06]" style={{ backgroundColor: cw.hex_primary }} />
                <span className="text-[11px] text-carbon/60">{cw.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      <div>
        <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-2">{t.skuPhases?.colorMatchStatus || 'Color Match'}</p>
        <div className="flex items-center bg-carbon/[0.04] rounded-full p-0.5 w-fit">
          {(['pending', 'issues', 'approved'] as const).map(s => (
            <button key={s} onClick={() => onStatusChange(s)}
              className={`px-5 py-2 text-[10px] font-medium tracking-[0.1em] uppercase transition-all rounded-full ${
                status === s
                  ? s === 'approved' ? 'bg-[#2d6a4f] text-white shadow-sm' : s === 'issues' ? 'bg-[#c77000] text-white shadow-sm' : 'bg-carbon text-crema shadow-sm'
                  : 'text-carbon/35 hover:text-carbon/50'
              }`}>
              {s === 'pending' ? (t.skuPhases?.pendingReview || 'Pending') : s === 'issues' ? (t.skuPhases?.issues || 'Issues') : (t.skuPhases?.approved || 'Approved')}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <textarea value={notes} onChange={(e) => onNotesChange(e.target.value)}
        placeholder={t.skuPhases?.colorValidationNotes || 'Color accuracy notes, deviations observed...'}
        className="w-full h-20 p-3 bg-carbon/[0.02] border border-carbon/[0.06] text-sm font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.15] transition-colors" />
    </div>
  );
}

/* ── Fit Validation ── */
function FitValidationContent({ sku, status, onStatusChange, notes, onNotesChange, t }: {
  sku: SKU; status: ValidationStatus; onStatusChange: (s: ValidationStatus) => void;
  notes: string; onNotesChange: (n: string) => void;
  t: ReturnType<typeof useTranslation>;
}) {
  return (
    <div className="space-y-5">
      {/* Status */}
      <div>
        <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-2">{t.skuPhases?.fitMatchStatus || 'Fit & Measurements'}</p>
        <div className="flex items-center bg-carbon/[0.04] rounded-full p-0.5 w-fit">
          {(['pending', 'issues', 'approved'] as const).map(s => (
            <button key={s} onClick={() => onStatusChange(s)}
              className={`px-5 py-2 text-[10px] font-medium tracking-[0.1em] uppercase transition-all rounded-full ${
                status === s
                  ? s === 'approved' ? 'bg-[#2d6a4f] text-white shadow-sm' : s === 'issues' ? 'bg-[#c77000] text-white shadow-sm' : 'bg-carbon text-crema shadow-sm'
                  : 'text-carbon/35 hover:text-carbon/50'
              }`}>
              {s === 'pending' ? (t.skuPhases?.pendingReview || 'Pending') : s === 'issues' ? (t.skuPhases?.issues || 'Issues') : (t.skuPhases?.approved || 'Approved')}
            </button>
          ))}
        </div>
      </div>

      {/* Size run reference */}
      <div>
        <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-2">{t.skuPhases?.sizeRunReference || 'Size Run'}</p>
        <div className="bg-carbon/[0.02] border border-carbon/[0.06] p-4">
          <SizeRunEditor category={sku.category} sizeRun={sku.size_run || {}} buyUnits={sku.buy_units}
            onUpdate={(sr) => {}} />
        </div>
      </div>

      {/* Notes */}
      <textarea value={notes} onChange={(e) => onNotesChange(e.target.value)}
        placeholder={t.skuPhases?.fitValidationNotes || 'Fit notes, measurement deviations, corrections needed...'}
        className="w-full h-20 p-3 bg-carbon/[0.02] border border-carbon/[0.06] text-sm font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.15] transition-colors" />
    </div>
  );
}

/* ── Production Sample ── */
function ProductionSampleContent({ sku, onUpdate, onImageUpload, uploading, t }: {
  sku: SKU; onUpdate: (u: Partial<SKU>) => Promise<void>;
  onImageUpload: (file: File, field: string) => void; uploading: string | null;
  t: ReturnType<typeof useTranslation>;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="space-y-3">
        <p className="text-[9px] text-carbon/30 uppercase tracking-wider">{t.skuPhases?.finalSample || 'Final Sample'}</p>
        <ImageUploadArea
          imageUrl={sku.production_sample_url}
          uploading={uploading === 'production_sample_url'}
          placeholder={t.skuPhases?.uploadProductionSample || 'Upload production sample'}
          onUpload={(file) => onImageUpload(file, 'production_sample_url')}
          onRemove={() => onUpdate({ production_sample_url: undefined })}
          aspectClass="aspect-[4/3]"
        />
        {/* Visual evolution: reference → sketch → proto → production */}
        {(sku.reference_image_url || sku.sketch_url) && (
          <div>
            <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-2">{t.skuPhases?.evolution || 'Evolution'}</p>
            <div className="flex gap-1">
              {sku.reference_image_url && (
                <div className="flex-1 border border-carbon/[0.06] overflow-hidden aspect-square">
                  <img src={sku.reference_image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {sku.sketch_url && (
                <div className="flex-1 border border-carbon/[0.06] overflow-hidden aspect-square">
                  <img src={sku.sketch_url} alt="" className="w-full h-full object-contain bg-white" />
                </div>
              )}
              {sku.proto_iterations?.length > 0 && sku.proto_iterations[sku.proto_iterations.length - 1]?.images?.[0] && (
                <div className="flex-1 border border-carbon/[0.06] overflow-hidden aspect-square">
                  <img src={sku.proto_iterations[sku.proto_iterations.length - 1].images[0]} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {sku.production_sample_url && (
                <div className="flex-1 border border-carbon/[0.06] overflow-hidden aspect-square">
                  <img src={sku.production_sample_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="flex gap-1 mt-1">
              {sku.reference_image_url && <span className="flex-1 text-[7px] text-carbon/20 text-center uppercase">Ref</span>}
              {sku.sketch_url && <span className="flex-1 text-[7px] text-carbon/20 text-center uppercase">Sketch</span>}
              {sku.proto_iterations?.length > 0 && sku.proto_iterations[sku.proto_iterations.length - 1]?.images?.[0] && <span className="flex-1 text-[7px] text-carbon/20 text-center uppercase">Proto</span>}
              {sku.production_sample_url && <span className="flex-1 text-[7px] text-carbon/20 text-center uppercase">Final</span>}
            </div>
          </div>
        )}
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-2">{t.skuPhases?.sizeRunFinal || 'Final Size Run'}</p>
          <div className="bg-white border border-carbon/[0.06] p-4">
            <SizeRunEditor category={sku.category} sizeRun={sku.size_run || {}} buyUnits={sku.buy_units}
              onUpdate={(sr) => onUpdate({ size_run: sr } as Partial<SKU>)} />
          </div>
        </div>
        <div className="bg-white border border-carbon/[0.06] p-4">
          <p className="text-[9px] text-carbon/30 uppercase tracking-wider mb-2">{t.skuPhases?.financialRecap || 'Financial Recap'}</p>
          <div className="grid grid-cols-3 gap-3">
            <MetricCell label="PVP" value={`€${sku.pvp}`} />
            <MetricCell label="COGS" value={`€${sku.cost}`} editable onChange={(v) => {
              const val = Number(v.replace(/[^0-9.]/g, ''));
              if (!isNaN(val)) onUpdate({ cost: val, margin: sku.pvp > 0 ? Math.round(((sku.pvp - val) / sku.pvp) * 10000) / 100 : 0 });
            }} />
            <MetricCell label={t.skuPhases?.margin || 'Margin'} value={`${Math.round(sku.margin)}%`} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Final Sign-off ── */
function SignOffContent({ sku, colorStatus, fitStatus, bothApproved, t }: {
  sku: SKU; colorStatus: ValidationStatus; fitStatus: ValidationStatus;
  bothApproved: boolean; t: ReturnType<typeof useTranslation>;
}) {
  return (
    <div className="space-y-5">
      {/* Checklist */}
      <div className="space-y-2">
        {[
          { label: t.skuPhases?.colorValidation || 'Color Validation', ok: colorStatus === 'approved' },
          { label: t.skuPhases?.fitValidation || 'Fit Validation', ok: fitStatus === 'approved' },
          { label: t.skuPhases?.productionSample || 'Production Sample', ok: !!sku.production_sample_url },
        ].map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {item.ok ? <Check className="h-3.5 w-3.5 text-[#2d6a4f]" /> : <AlertCircle className="h-3.5 w-3.5 text-carbon/20" />}
            <span className={`text-[11px] ${item.ok ? 'text-carbon' : 'text-carbon/30'}`}>{item.label}</span>
          </div>
        ))}
      </div>

      {bothApproved && sku.production_sample_url ? (
        <div className="p-5 bg-[#2d6a4f]/5 border border-[#2d6a4f]/10 flex items-center gap-3">
          <Check className="h-6 w-6 text-[#2d6a4f]" />
          <div>
            <p className="text-sm font-light text-carbon">{t.skuPhases?.readyForProduction || 'Ready for production'}</p>
            <p className="text-[10px] text-carbon/35 mt-0.5">{t.skuPhases?.signOffComplete || 'All validations passed. This SKU can be included in a production order.'}</p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-carbon/[0.02] border border-carbon/[0.06]">
          <p className="text-[11px] text-carbon/35">{t.skuPhases?.signOffPending || 'Complete all validations above to approve this SKU for production.'}</p>
        </div>
      )}
    </div>
  );
}
