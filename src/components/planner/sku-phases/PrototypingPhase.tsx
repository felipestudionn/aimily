'use client';

import React, { useState, useCallback } from 'react';
import {
  Factory, Camera, ArrowLeftRight, Check, X, Plus, Loader2,
  Sparkles, Globe, MapPin, ChevronRight,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SKU, ProtoIteration } from '@/hooks/useSkus';
import { ImageUploadArea } from './shared';
import { SegmentedPill } from '@/components/ui/segmented-pill';

interface PrototypingPhaseProps {
  sku: SKU;
  onUpdate: (updates: Partial<SKU>) => Promise<void>;
  onImageUpload: (file: File, field: string) => void;
  uploading: string | null;
}

const STEPS = [
  { id: 'sourcing', label: 'Sourcing', icon: Factory },
  { id: 'tracking', label: 'Proto Tracking', icon: Camera },
];

type InputMode = 'free' | 'ai';

export function PrototypingPhase({ sku, onUpdate, onImageUpload, uploading }: PrototypingPhaseProps) {
  const t = useTranslation();
  const { language } = useLanguage();
  const iterations = sku.proto_iterations || [];

  const [activeStep, setActiveStep] = useState(() => {
    // Start at tracking if sourcing is filled
    if (sku.sourcing_data?.factory || sku.sourcing_data?.origin) return 1;
    return 0;
  });
  const [modes, setModes] = useState<Record<string, InputMode>>({ sourcing: 'free', tracking: 'free' });

  const confirmedSteps = new Set<string>();
  if (sku.sourcing_data?.factory || sku.sourcing_data?.origin) confirmedSteps.add('sourcing');
  if (iterations.length > 0) confirmedSteps.add('tracking');

  const mode = modes[STEPS[activeStep]?.id] || 'free';
  const stepLabel = (key: string): string => (t.skuPhases as Record<string, string>)?.[key] || key;

  return (
    <div className="space-y-4">
      {/* ── Step pills ── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((step, idx) => {
          const confirmed = confirmedSteps.has(step.id);
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

          {/* Step 0: Sourcing */}
          {activeStep === 0 && (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-carbon/50 mb-2">
                  {stepLabel('sourcingStep') || 'Sourcing'}
                </p>
                <p className="text-[12px] text-carbon/50 mb-4">
                  {stepLabel('sourcingStepDesc') || 'Define your factory, production origin, and sourcing strategy.'}
                </p>
              </div>

              {/* Mode selector */}
              <SegmentedPill
                options={[
                  { id: 'free' as InputMode, label: stepLabel('modeFree') || 'Manual' },
                  { id: 'ai' as InputMode, label: stepLabel('aiProposal') || 'AI' },
                ]}
                value={mode}
                onChange={(m) => setModes(prev => ({ ...prev, sourcing: m }))}
              />

              <SourcingStepContent sku={sku} mode={mode} onUpdate={onUpdate} language={language} t={t} />
            </div>
          )}

          {/* Step 1: Proto Tracking */}
          {activeStep === 1 && (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-carbon/50 mb-2">
                  {stepLabel('protoTrackingStep') || 'Proto Tracking'}
                </p>
                <p className="text-[12px] text-carbon/50 mb-4">
                  {stepLabel('protoTrackingStepDesc') || 'Track prototype iterations, upload photos, and review against your design.'}
                </p>
              </div>

              <ProtoTrackingContent sku={sku} iterations={iterations} onUpdate={onUpdate} t={t} />
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
          {activeStep < STEPS.length - 1 ? (
            <button onClick={() => setActiveStep(activeStep + 1)} className="flex items-center gap-1.5 px-4 py-2 border border-carbon/[0.12] text-carbon/60 text-[11px] font-medium tracking-[0.06em] uppercase hover:bg-carbon hover:text-crema transition-colors rounded-full">
              {stepLabel('continue') || 'Continue'}: {STEPS[activeStep + 1].label}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ═══ SOURCING ═══ */
function SourcingStepContent({ sku, mode, onUpdate, language, t }: {
  sku: SKU; mode: InputMode; onUpdate: (u: Partial<SKU>) => Promise<void>;
  language: string; t: ReturnType<typeof useTranslation>;
}) {
  const [generating, setGenerating] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [aiResult, setAiResult] = useState<{
    factoryType?: { recommended: string; description: string; capabilities: string[] };
    regions?: { name: string; fit: string; moq: string; leadTime: string; cogsRange: string }[];
    tradeShows?: { name: string; location: string; dates: string; focus: string }[];
    tips?: string[];
  } | null>(null);

  const generateSourcing = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/design-generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'sourcing-suggest',
          input: { productType: sku.category, family: sku.family, materials: sku.notes || '', targetCogs: `€${sku.cost}`, targetPvp: `€${sku.pvp}`, units: String(sku.buy_units), qualityLevel: sku.type === 'IMAGEN' ? 'premium' : sku.type === 'ENTRY' ? 'accessible' : 'mid-to-premium' },
          language,
        }),
      });
      if (res.ok) { const data = await res.json(); setAiResult(data.result); }
    } finally { setGenerating(false); }
  }, [sku, language]);

  const stepLabel = (key: string): string => (t.skuPhases as Record<string, string>)?.[key] || key;

  return (
    <div className="space-y-4">
      {mode === 'free' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-carbon/50 uppercase tracking-wide font-medium mb-1.5">{t.skuPhases?.factoryName || 'Factory / Supplier'}</p>
              <input defaultValue={sku.sourcing_data?.factory || ''}
                onBlur={(e) => onUpdate({ sourcing_data: { ...sku.sourcing_data, factory: e.target.value } } as Partial<SKU>)}
                className="w-full text-[13px] text-carbon bg-transparent border-b border-carbon/[0.08] focus:border-carbon/[0.2] focus:outline-none pb-1.5" placeholder="e.g. Calzaturificio Molteni" />
            </div>
            <div>
              <p className="text-[10px] text-carbon/50 uppercase tracking-wide font-medium mb-1.5">{t.skuPhases?.factoryOrigin || 'Origin / Country'}</p>
              <input defaultValue={sku.sourcing_data?.origin || ''}
                onBlur={(e) => onUpdate({ sourcing_data: { ...sku.sourcing_data, origin: e.target.value } } as Partial<SKU>)}
                className="w-full text-[13px] text-carbon bg-transparent border-b border-carbon/[0.08] focus:border-carbon/[0.2] focus:outline-none pb-1.5" placeholder="e.g. Montebelluna, Italy" />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-carbon/50 uppercase tracking-wide font-medium mb-1.5">{t.skuPhases?.factoryContact || 'Contact'}</p>
            <input defaultValue={sku.sourcing_data?.contact || ''}
              onBlur={(e) => onUpdate({ sourcing_data: { ...sku.sourcing_data, contact: e.target.value } } as Partial<SKU>)}
              className="w-full text-[13px] text-carbon bg-transparent border-b border-carbon/[0.08] focus:border-carbon/[0.2] focus:outline-none pb-1.5" placeholder="name@factory.com" />
          </div>
          <div>
            <p className="text-[10px] text-carbon/50 uppercase tracking-wide font-medium mb-1.5">{t.skuPhases?.sourcingNotes || 'Notes'}</p>
            <textarea defaultValue={sku.sourcing_data?.notes || ''}
              onBlur={(e) => onUpdate({ sourcing_data: { ...sku.sourcing_data, notes: e.target.value } } as Partial<SKU>)}
              className="w-full h-16 p-3 bg-carbon/[0.02] border border-carbon/[0.06] text-[13px] text-carbon resize-none focus:outline-none focus:border-carbon/[0.15]"
              placeholder={t.skuPhases?.sourcingNotesPlaceholder || 'MOQ discussed, lead times, payment terms...'} />
          </div>
        </div>
      )}

      {mode === 'ai' && (
        <div className="space-y-4">
          <p className="text-[12px] text-carbon/50">{t.skuPhases?.sourcingAiDesc || 'Aimily will analyze your product specs, materials, and price point to recommend the best sourcing strategy.'}</p>

          {!aiResult && (
            <button onClick={generateSourcing} disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 border border-carbon/[0.12] text-carbon/60 text-[11px] font-medium tracking-[0.06em] uppercase hover:bg-carbon hover:text-crema transition-colors rounded-full disabled:opacity-30">
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {t.skuPhases?.proposeSourcing || 'Propose Sourcing Strategy'}
            </button>
          )}

          {aiResult && (
            <div className="space-y-4">
              {aiResult.factoryType && (
                <div className="border border-carbon/[0.06] bg-white p-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Factory className="h-3.5 w-3.5 text-carbon/40" />
                    <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-carbon/50">{t.skuPhases?.recommendedFactory || 'Recommended Factory Type'}</p>
                  </div>
                  <p className="text-[13px] text-carbon">{aiResult.factoryType.recommended}</p>
                  <p className="text-[12px] text-carbon/50 leading-relaxed">{aiResult.factoryType.description}</p>
                  <div className="flex flex-wrap gap-1.5">{aiResult.factoryType.capabilities.map((cap, i) => <span key={i} className="px-2 py-0.5 text-[10px] bg-carbon/[0.04] text-carbon/50 rounded-full">{cap}</span>)}</div>
                </div>
              )}

              {aiResult.regions && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-carbon/40" />
                    <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-carbon/50">{t.skuPhases?.recommendedRegions || 'Recommended Regions'}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {aiResult.regions.map((region, i) => {
                      const isSelected = selectedRegion === i;
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setSelectedRegion(i);
                            onUpdate({ sourcing_data: { ...sku.sourcing_data, origin: region.name, notes: `${sku.sourcing_data?.notes || ''}${sku.sourcing_data?.notes ? '\n' : ''}MOQ: ${region.moq} · Lead: ${region.leadTime} · COGS: ${region.cogsRange}` } } as Partial<SKU>);
                          }}
                          className={`border bg-white p-3 space-y-2 text-left transition-all ${
                            isSelected ? 'border-carbon shadow-sm' : 'border-carbon/[0.06] hover:border-carbon/[0.15]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-[13px] text-carbon flex items-center gap-1"><MapPin className="h-3 w-3 text-carbon/40" /> {region.name}</p>
                            {isSelected && <Check className="h-3.5 w-3.5 text-carbon" />}
                          </div>
                          <p className="text-[11px] text-carbon/50 leading-relaxed">{region.fit}</p>
                          <div className="grid grid-cols-3 gap-2 pt-1">
                            <div><p className="text-[9px] text-carbon/40 uppercase font-medium">MOQ</p><p className="text-[11px] text-carbon/60">{region.moq}</p></div>
                            <div><p className="text-[9px] text-carbon/40 uppercase font-medium">Lead time</p><p className="text-[11px] text-carbon/60">{region.leadTime}</p></div>
                            <div><p className="text-[9px] text-carbon/40 uppercase font-medium">COGS</p><p className="text-[11px] text-carbon/60">{region.cogsRange}</p></div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {aiResult.tradeShows && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-carbon/50">{t.skuPhases?.tradeShows || 'Trade Shows'}</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {aiResult.tradeShows.map((show, i) => (
                      <div key={i} className="shrink-0 w-44 sm:w-56 border border-carbon/[0.06] bg-white p-3 space-y-1">
                        <p className="text-[13px] text-carbon">{show.name}</p>
                        <p className="text-[10px] text-carbon/45">{show.location} · {show.dates}</p>
                        <p className="text-[11px] text-carbon/50 leading-relaxed">{show.focus}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiResult.tips && (
                <div className="p-3 bg-carbon/[0.02] border border-carbon/[0.06] space-y-2">
                  <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-carbon/50">{t.skuPhases?.sourcingTips || 'Sourcing Tips'}</p>
                  <ul className="space-y-1">
                    {aiResult.tips.map((tip, i) => (
                      <li key={i} className="text-[11px] text-carbon/50 leading-relaxed pl-3 relative before:content-['·'] before:absolute before:left-0 before:text-carbon/30">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button onClick={generateSourcing} disabled={generating}
                className="text-[10px] text-carbon/40 hover:text-carbon/60 tracking-[0.06em] uppercase">
                {generating ? <Loader2 className="h-2.5 w-2.5 animate-spin inline mr-1" /> : null}
                {t.skuPhases?.regenerate || 'Regenerate'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══ PROTO TRACKING ═══ */
function ProtoTrackingContent({ sku, iterations, onUpdate, t }: {
  sku: SKU; iterations: ProtoIteration[];
  onUpdate: (u: Partial<SKU>) => Promise<void>;
  t: ReturnType<typeof useTranslation>;
}) {
  const [newNotes, setNewNotes] = useState('');

  const addIteration = async () => {
    const newIter: ProtoIteration = {
      id: crypto.randomUUID(), images: [], notes: newNotes, status: 'pending',
      created_at: new Date().toISOString().split('T')[0],
    };
    await onUpdate({ proto_iterations: [...iterations, newIter] });
    setNewNotes('');
  };

  const updateStatus = async (iterId: string, status: ProtoIteration['status']) => {
    await onUpdate({ proto_iterations: iterations.map(it => it.id === iterId ? { ...it, status } : it) });
  };

  const updateNotes = async (iterId: string, notes: string) => {
    await onUpdate({ proto_iterations: iterations.map(it => it.id === iterId ? { ...it, notes } : it) });
  };

  const addImage = async (iterId: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      await onUpdate({ proto_iterations: iterations.map(it =>
        it.id === iterId ? { ...it, images: [...it.images, base64] } : it
      ) });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = async (iterId: string, imgIdx: number) => {
    await onUpdate({ proto_iterations: iterations.map(it =>
      it.id === iterId ? { ...it, images: it.images.filter((_, i) => i !== imgIdx) } : it
    ) });
  };

  const stepLabel = (key: string): string => (t.skuPhases as Record<string, string>)?.[key] || key;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-2xl font-light text-carbon">{iterations.length}</p>
          <p className="text-[10px] text-carbon/40 uppercase tracking-wide font-medium">{t.skuPhases?.iterations || 'iterations'}</p>
        </div>
        {iterations.some(it => it.status === 'approved') && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2d6a4f]/8 text-[#2d6a4f] rounded-full">
            <Check className="h-3 w-3" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">{t.skuPhases?.protoReady || 'Ready'}</span>
          </div>
        )}
      </div>

      {/* Iterations */}
      {iterations.map((iter, idx) => (
        <div key={iter.id} className="border border-carbon/[0.06] bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-carbon/[0.04]">
            <span className="text-[11px] font-medium tracking-[0.06em] uppercase text-carbon/50">Proto {idx + 1} · {iter.created_at}</span>
            <div className="flex items-center gap-0.5">
              {(['pending', 'issues', 'approved', 'rejected'] as const).map((s) => (
                <button key={s} onClick={() => updateStatus(iter.id, s)}
                  className={`px-3 py-1 text-[10px] font-medium tracking-[0.04em] uppercase transition-colors rounded-full ${
                    iter.status === s
                      ? s === 'approved' ? 'text-[#2d6a4f] bg-[#2d6a4f]/10' : s === 'issues' ? 'text-[#c77000] bg-[#c77000]/10' : s === 'rejected' ? 'text-[#A0463C] bg-[#A0463C]/10' : 'text-carbon bg-carbon/[0.08]'
                      : 'text-carbon/25 hover:text-carbon/45'
                  }`}>
                  {s === 'pending' ? (t.skuPhases?.waiting || 'Waiting') : s === 'issues' ? (t.skuPhases?.issues || 'Issues') : s === 'approved' ? (t.skuPhases?.approved || 'OK') : (t.skuPhases?.rejected || 'Rejected')}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <p className="text-[10px] text-carbon/50 uppercase tracking-wide font-medium">{t.skuPhases?.protoPhotos || 'Photos'}</p>
                <div className="flex gap-2 flex-wrap">
                  {iter.images.map((img, imgIdx) => (
                    <div key={imgIdx} className="relative w-20 h-20 border border-carbon/[0.06] overflow-hidden group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(iter.id, imgIdx)}
                        className="absolute top-1 right-1 w-4 h-4 bg-carbon/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                        <X className="h-2 w-2" />
                      </button>
                    </div>
                  ))}
                  <label className="w-20 h-20 border border-dashed border-carbon/[0.1] flex flex-col items-center justify-center cursor-pointer hover:border-carbon/20 transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addImage(iter.id, f); }} />
                    <Camera className="h-4 w-4 text-carbon/20" />
                    <span className="text-[9px] text-carbon/30 mt-1">{t.skuPhases?.addPhoto || 'Add'}</span>
                  </label>
                </div>
              </div>
              {(sku.sketch_url || sku.reference_image_url) && iter.images.length > 0 && (
                <div className="hidden sm:block w-36 shrink-0 space-y-1.5">
                  <p className="text-[10px] text-carbon/50 uppercase tracking-wide font-medium flex items-center gap-1"><ArrowLeftRight className="h-3 w-3" /> {t.skuPhases?.comparison || 'Compare'}</p>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="border border-carbon/[0.06] overflow-hidden aspect-square bg-white">
                      <img src={sku.sketch_url || sku.reference_image_url || ''} alt="" className="w-full h-full object-contain" />
                    </div>
                    <div className="border border-carbon/[0.06] overflow-hidden aspect-square">
                      <img src={iter.images[iter.images.length - 1]} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="flex justify-between text-[9px] text-carbon/35 uppercase tracking-wider">
                    <span>{t.skuPhases?.design || 'Design'}</span><span>Proto</span>
                  </div>
                </div>
              )}
            </div>
            <textarea defaultValue={iter.notes} onBlur={(e) => { if (e.target.value !== iter.notes) updateNotes(iter.id, e.target.value); }}
              placeholder={t.skuPhases?.protoNotes || 'Review notes, corrections needed...'}
              className="w-full h-14 p-3 mt-3 bg-carbon/[0.02] border border-carbon/[0.06] text-[12px] text-carbon resize-none focus:outline-none focus:border-carbon/[0.15] transition-colors" />
          </div>
        </div>
      ))}

      {/* Add new iteration */}
      <div className="border border-dashed border-carbon/[0.1] bg-white p-4 space-y-3">
        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-carbon/50">
          {iterations.length === 0 ? (t.skuPhases?.firstProto || 'Register first prototype') : (t.skuPhases?.requestNewProto || 'New iteration')}
        </p>
        <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
          placeholder={t.skuPhases?.protoRequestNotes || 'Notes for this iteration...'}
          className="w-full h-14 p-3 border border-carbon/[0.06] text-[13px] text-carbon resize-none focus:outline-none focus:border-carbon/[0.15]" />
        <button onClick={addIteration}
          className="flex items-center gap-1.5 px-4 py-2 border border-carbon/[0.12] text-carbon/60 text-[11px] font-medium tracking-[0.06em] uppercase hover:bg-carbon hover:text-crema transition-colors rounded-full">
          <Plus className="h-3 w-3" /> {iterations.length === 0 ? (t.skuPhases?.registerProto || 'Register Proto') : (t.skuPhases?.newIteration || 'New Iteration')}
        </button>
      </div>
    </div>
  );
}
