'use client';

import React, { useState, useCallback } from 'react';
import {
  Factory, Camera, ArrowLeftRight, Check, X, Plus, Loader2,
  Sparkles, Globe, MapPin,
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
  { id: 'sourcing', icon: Factory, nameKey: 'sourcingStep', descKey: 'sourcingStepDesc' },
  { id: 'tracking', icon: Camera, nameKey: 'protoTrackingStep', descKey: 'protoTrackingStepDesc' },
];

type InputMode = 'free' | 'ai';

export function PrototypingPhase({ sku, onUpdate, onImageUpload, uploading }: PrototypingPhaseProps) {
  const t = useTranslation();
  const { language } = useLanguage();
  const iterations = sku.proto_iterations || [];

  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [confirmedSteps, setConfirmedSteps] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (iterations.length > 0) s.add('tracking');
    return s;
  });
  const [modes, setModes] = useState<Record<string, InputMode>>({ sourcing: 'free', tracking: 'free' });
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);

  const confirmStep = (stepId: string) => {
    setConfirmedSteps(prev => { const n = new Set(prev); n.add(stepId); return n; });
    setExpandedStep(null);
  };

  const stepLabel = (key: string): string => (t.skuPhases as Record<string, string>)?.[key] || key;

  return (
    <div className="space-y-3">
      {/* Design reference — compact */}
      <div className="flex items-center gap-3 p-3 bg-white border border-carbon/[0.04]">
        {(sku.sketch_url || sku.reference_image_url) && (
          <div className="w-12 h-12 border border-carbon/[0.06] overflow-hidden shrink-0 bg-white">
            <img src={sku.sketch_url || sku.reference_image_url || ''} alt="" className="w-full h-full object-contain" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[12px] font-light text-carbon truncate">{sku.name}</p>
          <p className="text-[9px] text-carbon/30">{sku.family} · €{sku.pvp} PVP · €{sku.cost} COGS · {sku.buy_units} units</p>
        </div>
      </div>

      {/* Steps */}
      {STEPS.map((step) => {
        const isExpanded = expandedStep === step.id;
        const isConfirmed = confirmedSteps.has(step.id);
        const Icon = step.icon;
        const mode = modes[step.id] || 'free';

        if (isExpanded) {
          return (
            <div key={step.id} className="bg-white border border-carbon/[0.06] overflow-hidden" style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-carbon/[0.04]">
                <div className="flex items-center gap-2.5">
                  <Icon className="h-3.5 w-3.5 text-carbon/30" />
                  <div>
                    <h3 className="text-sm font-light text-carbon tracking-tight">{stepLabel(step.nameKey)}</h3>
                    <p className="text-[10px] text-carbon/30 mt-0">{stepLabel(step.descKey)}</p>
                  </div>
                </div>
                <button onClick={() => setExpandedStep(null)} className="w-6 h-6 flex items-center justify-center text-carbon/20 hover:text-carbon/50">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Mode selector */}
              {step.id === 'sourcing' && (
                <div className="px-5 pt-3">
                  <SegmentedPill
                    options={[
                      { id: 'free' as InputMode, label: stepLabel('modeFree') || 'Manual' },
                      { id: 'ai' as InputMode, label: stepLabel('aiProposal') || 'AI' },
                    ]}
                    value={mode}
                    onChange={(m) => setModes(prev => ({ ...prev, [step.id]: m }))}
                  />
                </div>
              )}

              <div className="px-5 py-4">
                {step.id === 'sourcing' && (
                  <SourcingStepContent sku={sku} mode={mode} onUpdate={onUpdate} language={language} t={t} />
                )}
                {step.id === 'tracking' && (
                  <ProtoTrackingContent sku={sku} iterations={iterations} onUpdate={onUpdate} t={t} />
                )}
              </div>

              <div className="px-5 py-3 border-t border-carbon/[0.04] flex items-center justify-between">
                <button onClick={() => setExpandedStep(null)} className="text-[10px] font-medium tracking-[0.06em] uppercase text-carbon/30 hover:text-carbon/50 transition-colors">
                  {stepLabel('backToGrid') || 'Back'}
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
              <h3 className="text-[12px] font-light text-carbon tracking-tight">{stepLabel(step.nameKey)}</h3>
              <p className="text-[10px] text-carbon/30 mt-0 truncate">{stepLabel(step.descKey)}</p>
            </div>
            {isConfirmed && <span className="text-[8px] font-medium tracking-[0.08em] uppercase text-carbon/20">{stepLabel('confirmed') || 'Confirmed'}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ═══ SOURCING ═══ */
function SourcingStepContent({ sku, mode, onUpdate, language, t }: {
  sku: SKU; mode: InputMode; onUpdate: (u: Partial<SKU>) => Promise<void>;
  language: string; t: ReturnType<typeof useTranslation>;
}) {
  const [generating, setGenerating] = useState(false);
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
        <div className="space-y-3">
          <p className="text-[11px] font-light text-carbon/40">{t.skuPhases?.sourcingFreeDesc || 'Add your factory and production origin details.'}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-1">{t.skuPhases?.factoryName || 'Factory / Supplier'}</p>
              <input className="w-full text-[12px] font-light text-carbon bg-transparent border-b border-carbon/[0.06] focus:border-carbon/[0.12] focus:outline-none pb-1" placeholder="e.g. Calzaturificio Molteni" />
            </div>
            <div>
              <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-1">{t.skuPhases?.factoryOrigin || 'Origin / Country'}</p>
              <input className="w-full text-[12px] font-light text-carbon bg-transparent border-b border-carbon/[0.06] focus:border-carbon/[0.12] focus:outline-none pb-1" placeholder="e.g. Montebelluna, Italy" />
            </div>
          </div>
          <div>
            <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-1">{t.skuPhases?.factoryContact || 'Contact'}</p>
            <input className="w-full text-[12px] font-light text-carbon bg-transparent border-b border-carbon/[0.06] focus:border-carbon/[0.12] focus:outline-none pb-1" placeholder="name@factory.com" />
          </div>
          <div>
            <p className="text-[8px] text-carbon/25 uppercase tracking-wider mb-1">{t.skuPhases?.sourcingNotes || 'Notes'}</p>
            <textarea className="w-full h-14 p-3 bg-carbon/[0.02] border border-carbon/[0.04] text-[12px] font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.12]"
              placeholder={t.skuPhases?.sourcingNotesPlaceholder || 'MOQ discussed, lead times, payment terms...'} />
          </div>
        </div>
      )}

      {mode === 'ai' && (
        <div className="space-y-4">
          <p className="text-[11px] font-light text-carbon/40">{t.skuPhases?.sourcingAiDesc || 'Aimily will analyze your product specs, materials, and price point to recommend the best sourcing strategy.'}</p>

          {!aiResult && (
            <button onClick={generateSourcing} disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 border border-carbon/[0.08] text-carbon/50 text-[10px] font-medium tracking-[0.1em] uppercase hover:bg-carbon hover:text-crema transition-colors disabled:opacity-30">
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {t.skuPhases?.proposeSourcing || 'Propose Sourcing Strategy'}
            </button>
          )}

          {aiResult && (
            <div className="space-y-4">
              {aiResult.factoryType && (
                <div className="border border-carbon/[0.04] bg-white p-4 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Factory className="h-3 w-3 text-carbon/25" />
                    <p className="text-[9px] font-semibold tracking-[0.1em] uppercase text-carbon/30">{t.skuPhases?.recommendedFactory || 'Recommended Factory Type'}</p>
                  </div>
                  <p className="text-[12px] font-light text-carbon">{aiResult.factoryType.recommended}</p>
                  <p className="text-[10px] text-carbon/40 leading-relaxed">{aiResult.factoryType.description}</p>
                  <div className="flex flex-wrap gap-1">{aiResult.factoryType.capabilities.map((cap, i) => <span key={i} className="px-1.5 py-0.5 text-[8px] bg-carbon/[0.03] text-carbon/40">{cap}</span>)}</div>
                </div>
              )}

              {aiResult.regions && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3 w-3 text-carbon/25" />
                    <p className="text-[9px] font-semibold tracking-[0.1em] uppercase text-carbon/30">{t.skuPhases?.recommendedRegions || 'Recommended Regions'}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {aiResult.regions.map((region, i) => {
                      const isSelected = selectedRegion === i;
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setSelectedRegion(i);
                            onUpdate({ sourcing_region: region.name, sourcing_moq: region.moq, sourcing_lead_time: region.leadTime, sourcing_cogs: region.cogsRange } as Partial<SKU>);
                          }}
                          className={`border bg-white p-3 space-y-1.5 text-left transition-all ${
                            isSelected ? 'border-carbon shadow-sm' : 'border-carbon/[0.04] hover:border-carbon/[0.12]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-[12px] font-light text-carbon flex items-center gap-1"><MapPin className="h-2.5 w-2.5 text-carbon/25" /> {region.name}</p>
                            {isSelected && <Check className="h-3.5 w-3.5 text-carbon" />}
                          </div>
                          <p className="text-[10px] text-carbon/40 leading-relaxed">{region.fit}</p>
                          <div className="grid grid-cols-3 gap-2 pt-1">
                            <div><p className="text-[7px] text-carbon/20 uppercase">MOQ</p><p className="text-[9px] text-carbon/45">{region.moq}</p></div>
                            <div><p className="text-[7px] text-carbon/20 uppercase">Lead time</p><p className="text-[9px] text-carbon/45">{region.leadTime}</p></div>
                            <div><p className="text-[7px] text-carbon/20 uppercase">COGS</p><p className="text-[9px] text-carbon/45">{region.cogsRange}</p></div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {aiResult.tradeShows && (
                <div className="space-y-2">
                  <p className="text-[9px] font-semibold tracking-[0.1em] uppercase text-carbon/30">{t.skuPhases?.tradeShows || 'Trade Shows'}</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {aiResult.tradeShows.map((show, i) => (
                      <div key={i} className="shrink-0 w-40 sm:w-52 border border-carbon/[0.04] bg-white p-2.5 sm:p-3 space-y-1">
                        <p className="text-[12px] font-light text-carbon">{show.name}</p>
                        <p className="text-[9px] text-carbon/30">{show.location} · {show.dates}</p>
                        <p className="text-[10px] text-carbon/40 leading-relaxed">{show.focus}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiResult.tips && (
                <div className="p-3 bg-carbon/[0.02] border border-carbon/[0.04] space-y-1.5">
                  <p className="text-[9px] font-semibold tracking-[0.1em] uppercase text-carbon/30">{t.skuPhases?.sourcingTips || 'Sourcing Tips'}</p>
                  <ul className="space-y-1">
                    {aiResult.tips.map((tip, i) => (
                      <li key={i} className="text-[10px] text-carbon/40 leading-relaxed pl-3 relative before:content-['·'] before:absolute before:left-0 before:text-carbon/20">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button onClick={generateSourcing} disabled={generating}
                className="text-[9px] text-carbon/30 hover:text-carbon/50 tracking-[0.08em] uppercase">
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
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-3">
        <div className="text-center">
          <p className="text-xl font-light text-carbon">{iterations.length}</p>
          <p className="text-[8px] text-carbon/25 uppercase tracking-wider">{t.skuPhases?.iterations || 'iterations'}</p>
        </div>
        {iterations.some(it => it.status === 'approved') && (
          <div className="flex items-center gap-1 px-2.5 py-1 bg-[#2d6a4f]/8 text-[#2d6a4f]">
            <Check className="h-3 w-3" />
            <span className="text-[9px] font-medium uppercase tracking-wider">{t.skuPhases?.protoReady || 'Ready'}</span>
          </div>
        )}
      </div>

      {/* Iterations */}
      {iterations.map((iter, idx) => (
        <div key={iter.id} className="border border-carbon/[0.04] bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-carbon/[0.03]">
            <span className="text-[9px] font-medium tracking-[0.08em] uppercase text-carbon/35">Proto {idx + 1} · {iter.created_at}</span>
            <div className="flex items-center gap-0.5">
              {(['pending', 'issues', 'approved', 'rejected'] as const).map((s) => (
                <button key={s} onClick={() => updateStatus(iter.id, s)}
                  className={`px-2.5 py-1 text-[8px] font-medium tracking-[0.06em] uppercase transition-colors ${
                    iter.status === s
                      ? s === 'approved' ? 'text-[#2d6a4f] bg-[#2d6a4f]/8' : s === 'issues' ? 'text-[#c77000] bg-[#c77000]/8' : s === 'rejected' ? 'text-[#A0463C] bg-[#A0463C]/8' : 'text-carbon bg-carbon/[0.06]'
                      : 'text-carbon/20 hover:text-carbon/35'
                  }`}>
                  {s === 'pending' ? (t.skuPhases?.waiting || 'Waiting') : s === 'issues' ? (t.skuPhases?.issues || 'Issues') : s === 'approved' ? (t.skuPhases?.approved || 'OK') : (t.skuPhases?.rejected || 'Rejected')}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <p className="text-[8px] text-carbon/25 uppercase tracking-wider">{t.skuPhases?.protoPhotos || 'Photos'}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {iter.images.map((img, imgIdx) => (
                    <div key={imgIdx} className="relative w-16 h-16 border border-carbon/[0.06] overflow-hidden group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(iter.id, imgIdx)}
                        className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-carbon/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-2 w-2" />
                      </button>
                    </div>
                  ))}
                  <label className="w-16 h-16 border border-dashed border-carbon/[0.08] flex flex-col items-center justify-center cursor-pointer hover:border-carbon/15 transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addImage(iter.id, f); }} />
                    <Camera className="h-3 w-3 text-carbon/12" />
                    <span className="text-[6px] text-carbon/15 mt-0.5">{t.skuPhases?.addPhoto || 'Add'}</span>
                  </label>
                </div>
              </div>
              {(sku.sketch_url || sku.reference_image_url) && iter.images.length > 0 && (
                <div className="hidden sm:block w-32 shrink-0 space-y-1">
                  <p className="text-[8px] text-carbon/25 uppercase tracking-wider flex items-center gap-1"><ArrowLeftRight className="h-2.5 w-2.5" /> {t.skuPhases?.comparison || 'Compare'}</p>
                  <div className="grid grid-cols-2 gap-0.5">
                    <div className="border border-carbon/[0.04] overflow-hidden aspect-square bg-white">
                      <img src={sku.sketch_url || sku.reference_image_url || ''} alt="" className="w-full h-full object-contain" />
                    </div>
                    <div className="border border-carbon/[0.04] overflow-hidden aspect-square">
                      <img src={iter.images[iter.images.length - 1]} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="flex justify-between text-[6px] text-carbon/15 uppercase tracking-wider">
                    <span>{t.skuPhases?.design || 'Design'}</span><span>Proto</span>
                  </div>
                </div>
              )}
            </div>
            <textarea defaultValue={iter.notes} onBlur={(e) => { if (e.target.value !== iter.notes) updateNotes(iter.id, e.target.value); }}
              placeholder={t.skuPhases?.protoNotes || 'Review notes, corrections needed...'}
              className="w-full h-12 p-2.5 mt-2.5 bg-carbon/[0.02] border border-carbon/[0.04] text-[11px] font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.1] transition-colors" />
          </div>
        </div>
      ))}

      {/* Add new */}
      <div className="border border-dashed border-carbon/[0.08] bg-white p-4 space-y-2.5">
        <p className="text-[9px] font-semibold tracking-[0.1em] uppercase text-carbon/30">
          {iterations.length === 0 ? (t.skuPhases?.firstProto || 'Register first prototype') : (t.skuPhases?.requestNewProto || 'New iteration')}
        </p>
        <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
          placeholder={t.skuPhases?.protoRequestNotes || 'Notes for this iteration...'}
          className="w-full h-12 p-2.5 border border-carbon/[0.04] text-[12px] font-light text-carbon resize-none focus:outline-none focus:border-carbon/[0.1]" />
        <button onClick={addIteration}
          className="flex items-center gap-1.5 px-4 py-2 border border-carbon/[0.08] text-carbon/50 text-[10px] font-medium tracking-[0.08em] uppercase hover:bg-carbon hover:text-crema transition-colors">
          <Plus className="h-2.5 w-2.5" /> {iterations.length === 0 ? (t.skuPhases?.registerProto || 'Register Proto') : (t.skuPhases?.newIteration || 'New Iteration')}
        </button>
      </div>
    </div>
  );
}
