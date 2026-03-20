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

  const stepLabel = (key: string): string => (t.skuPhases as Record<string, string>)?.[key] || key;

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
              <div className="flex items-center justify-between px-5 py-3 border-b border-carbon/[0.04]">
                <div className="flex items-center gap-2.5">
                  <Icon className="h-3.5 w-3.5 text-carbon/30" />
                  <div>
                    <h3 className="text-sm font-light text-carbon tracking-tight">{step.name}</h3>
                    <p className="text-[10px] text-carbon/30 mt-0">{step.desc}</p>
                  </div>
                </div>
                <button onClick={() => setExpandedStep(null)} className="w-6 h-6 flex items-center justify-center text-carbon/20 hover:text-carbon/50">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="px-5 py-4">
                {step.id === 'color' && (
                  <ColorValidationContent colorways={skuColorways} status={colorStatus} onStatusChange={setColorStatus} notes={colorNotes} onNotesChange={setColorNotes} t={t} />
                )}
                {step.id === 'fit' && (
                  <FitValidationContent sku={sku} status={fitStatus} onStatusChange={setFitStatus} notes={fitNotes} onNotesChange={setFitNotes} t={t} />
                )}
                {step.id === 'sample' && (
                  <ProductionSampleContent sku={sku} onUpdate={onUpdate} onImageUpload={onImageUpload} uploading={uploading} t={t} />
                )}
                {step.id === 'signoff' && (
                  <SignOffContent sku={sku} colorStatus={colorStatus} fitStatus={fitStatus} bothApproved={bothApproved} t={t} />
                )}
              </div>

              <div className="px-5 py-3 border-t border-carbon/[0.04] flex items-center justify-between">
                <button onClick={() => setExpandedStep(null)} className="text-[10px] font-medium tracking-[0.06em] uppercase text-carbon/30 hover:text-carbon/50 transition-colors">
                  {t.skuPhases?.backToGrid || 'Back'}
                </button>
                <button onClick={() => confirmStep(step.id)} className="flex items-center gap-1.5 px-4 py-2 border border-carbon/[0.08] text-carbon/50 text-[10px] font-medium tracking-[0.08em] uppercase hover:bg-carbon hover:text-crema transition-colors">
                  <Check className="h-3 w-3" /> {stepLabel('validateContinue') || 'Validate & Continue'}
                </button>
              </div>
            </div>
          );
        }

        return (
          <button key={step.id} onClick={() => setExpandedStep(step.id)}
            className={`w-full text-left bg-white border p-4 flex items-center gap-3 transition-all hover:border-carbon/[0.12] ${isConfirmed ? 'border-carbon/[0.1]' : 'border-carbon/[0.04]'}`}>
            <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${isConfirmed ? 'bg-carbon text-crema' : 'bg-carbon/[0.03] text-carbon/25'}`}>
              {isConfirmed ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[12px] font-light text-carbon tracking-tight">{step.name}</h3>
              <p className="text-[10px] text-carbon/30 mt-0 truncate">{step.desc}</p>
            </div>
            {isConfirmed && <span className="text-[8px] font-medium tracking-[0.08em] uppercase text-carbon/20">{stepLabel('confirmed') || 'Confirmed'}</span>}
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
    <div className="space-y-4">
      {colorways.length > 0 && (
        <div>
          <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-2">{t.skuPhases?.approvedColorways || 'Approved Colorways'}</p>
          <div className="flex flex-wrap gap-2">
            {colorways.map(cw => (
              <div key={cw.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-carbon/[0.02] border border-carbon/[0.04]">
                <div className="w-5 h-5 border border-carbon/[0.06]" style={{ backgroundColor: cw.hex_primary }} />
                <span className="text-[10px] text-carbon/50">{cw.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-2">{t.skuPhases?.colorMatchStatus || 'Color Match'}</p>
        <div className="flex items-center gap-0.5">
          {(['pending', 'issues', 'approved'] as const).map(s => (
            <button key={s} onClick={() => onStatusChange(s)}
              className={`px-3 py-1.5 text-[9px] font-medium tracking-[0.06em] uppercase transition-colors ${
                status === s
                  ? s === 'approved' ? 'text-[#2d6a4f] bg-[#2d6a4f]/8' : s === 'issues' ? 'text-[#c77000] bg-[#c77000]/8' : 'text-carbon bg-carbon/[0.06]'
                  : 'text-carbon/25 hover:text-carbon/40'
              }`}>
              {s === 'pending' ? (t.skuPhases?.pendingReview || 'Pending') : s === 'issues' ? (t.skuPhases?.issues || 'Issues') : (t.skuPhases?.approved || 'Approved')}
            </button>
          ))}
        </div>
      </div>

      <textarea value={notes} onChange={(e) => onNotesChange(e.target.value)}
        placeholder={t.skuPhases?.colorValidationNotes || 'Color accuracy notes, deviations observed...'}
        className="w-full h-16 p-2.5 bg-carbon/[0.02] border border-carbon/[0.04] text-[12px] font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.1] transition-colors" />
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
    <div className="space-y-4">
      <div>
        <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-2">{t.skuPhases?.fitMatchStatus || 'Fit & Measurements'}</p>
        <div className="flex items-center gap-0.5">
          {(['pending', 'issues', 'approved'] as const).map(s => (
            <button key={s} onClick={() => onStatusChange(s)}
              className={`px-3 py-1.5 text-[9px] font-medium tracking-[0.06em] uppercase transition-colors ${
                status === s
                  ? s === 'approved' ? 'text-[#2d6a4f] bg-[#2d6a4f]/8' : s === 'issues' ? 'text-[#c77000] bg-[#c77000]/8' : 'text-carbon bg-carbon/[0.06]'
                  : 'text-carbon/25 hover:text-carbon/40'
              }`}>
              {s === 'pending' ? (t.skuPhases?.pendingReview || 'Pending') : s === 'issues' ? (t.skuPhases?.issues || 'Issues') : (t.skuPhases?.approved || 'Approved')}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-2">{t.skuPhases?.sizeRunReference || 'Size Run'}</p>
        <div className="bg-carbon/[0.02] border border-carbon/[0.04] p-3">
          <SizeRunEditor category={sku.category} sizeRun={sku.size_run || {}} buyUnits={sku.buy_units}
            onUpdate={(sr) => {}} />
        </div>
      </div>

      <textarea value={notes} onChange={(e) => onNotesChange(e.target.value)}
        placeholder={t.skuPhases?.fitValidationNotes || 'Fit notes, measurement deviations, corrections needed...'}
        className="w-full h-16 p-2.5 bg-carbon/[0.02] border border-carbon/[0.04] text-[12px] font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.1] transition-colors" />
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <p className="text-[8px] text-carbon/25 uppercase tracking-wider">{t.skuPhases?.finalSample || 'Final Sample'}</p>
        <ImageUploadArea
          imageUrl={sku.production_sample_url}
          uploading={uploading === 'production_sample_url'}
          placeholder={t.skuPhases?.uploadProductionSample || 'Upload production sample'}
          onUpload={(file) => onImageUpload(file, 'production_sample_url')}
          onRemove={() => onUpdate({ production_sample_url: undefined })}
          aspectClass="aspect-[4/3]"
        />
        {(sku.reference_image_url || sku.sketch_url) && (
          <div>
            <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-1.5">{t.skuPhases?.evolution || 'Evolution'}</p>
            <div className="flex gap-0.5">
              {sku.reference_image_url && (
                <div className="flex-1 border border-carbon/[0.04] overflow-hidden aspect-square bg-white">
                  <img src={sku.reference_image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {sku.sketch_url && (
                <div className="flex-1 border border-carbon/[0.04] overflow-hidden aspect-square bg-white">
                  <img src={sku.sketch_url} alt="" className="w-full h-full object-contain" />
                </div>
              )}
              {sku.proto_iterations?.length > 0 && sku.proto_iterations[sku.proto_iterations.length - 1]?.images?.[0] && (
                <div className="flex-1 border border-carbon/[0.04] overflow-hidden aspect-square">
                  <img src={sku.proto_iterations[sku.proto_iterations.length - 1].images[0]} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {sku.production_sample_url && (
                <div className="flex-1 border border-carbon/[0.04] overflow-hidden aspect-square">
                  <img src={sku.production_sample_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="flex gap-0.5 mt-0.5">
              {sku.reference_image_url && <span className="flex-1 text-[6px] text-carbon/15 text-center uppercase">Ref</span>}
              {sku.sketch_url && <span className="flex-1 text-[6px] text-carbon/15 text-center uppercase">Sketch</span>}
              {sku.proto_iterations?.length > 0 && sku.proto_iterations[sku.proto_iterations.length - 1]?.images?.[0] && <span className="flex-1 text-[6px] text-carbon/15 text-center uppercase">Proto</span>}
              {sku.production_sample_url && <span className="flex-1 text-[6px] text-carbon/15 text-center uppercase">Final</span>}
            </div>
          </div>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-1.5">{t.skuPhases?.sizeRunFinal || 'Final Size Run'}</p>
          <div className="bg-white border border-carbon/[0.04] p-3">
            <SizeRunEditor category={sku.category} sizeRun={sku.size_run || {}} buyUnits={sku.buy_units}
              onUpdate={(sr) => onUpdate({ size_run: sr } as Partial<SKU>)} />
          </div>
        </div>
        <div className="bg-white border border-carbon/[0.04] p-3">
          <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-1.5">{t.skuPhases?.financialRecap || 'Financial Recap'}</p>
          <div className="grid grid-cols-3 gap-2">
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
    <div className="space-y-4">
      <div className="space-y-1.5">
        {[
          { label: t.skuPhases?.colorValidation || 'Color Validation', ok: colorStatus === 'approved' },
          { label: t.skuPhases?.fitValidation || 'Fit Validation', ok: fitStatus === 'approved' },
          { label: t.skuPhases?.productionSample || 'Production Sample', ok: !!sku.production_sample_url },
        ].map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            {item.ok ? <Check className="h-3 w-3 text-[#2d6a4f]" /> : <AlertCircle className="h-3 w-3 text-carbon/15" />}
            <span className={`text-[10px] ${item.ok ? 'text-carbon' : 'text-carbon/25'}`}>{item.label}</span>
          </div>
        ))}
      </div>

      {bothApproved && sku.production_sample_url ? (
        <div className="p-4 bg-[#2d6a4f]/5 border border-[#2d6a4f]/8 flex items-center gap-3">
          <Check className="h-5 w-5 text-[#2d6a4f]" />
          <div>
            <p className="text-[12px] font-light text-carbon">{t.skuPhases?.readyForProduction || 'Ready for production'}</p>
            <p className="text-[9px] text-carbon/30 mt-0.5">{t.skuPhases?.signOffComplete || 'All validations passed. This SKU can be included in a production order.'}</p>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-carbon/[0.02] border border-carbon/[0.04]">
          <p className="text-[10px] text-carbon/30">{t.skuPhases?.signOffPending || 'Complete all validations above to approve this SKU for production.'}</p>
        </div>
      )}
    </div>
  );
}
